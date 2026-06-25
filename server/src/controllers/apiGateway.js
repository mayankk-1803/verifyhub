const PricingEngine = require('../gateway/pricingEngine');
const ProviderResolver = require('../gateway/providerResolver');
const WalletManager = require('../gateway/walletManager');
const AuditManager = require('../gateway/auditManager');
const WebhookDispatcher = require('../gateway/webhookDispatcher');
const { getProvider } = require('../providers');
const logger = require('../config/logger');

class ApiGatewayController {
  /**
   * Universal API Gateway execution controller.
   * Handles PAN, GST, AADHAAR, VOTER, RATION, PAN_TRACK, etc.
   */
  static async verify(req, res) {
    // 1. Resolve service type from URL path
    const urlPath = req.originalUrl.split('?')[0];
    let serviceType = 'PAN_CARD';
    
    if (urlPath.includes('/ration-card')) {
      serviceType = 'RATION_CARD_VERIFY';
    } else if (urlPath.includes('/ration')) {
      serviceType = 'RATION';
    } else if (urlPath.includes('/aadhaar-short')) {
      serviceType = 'AADHAAR_SHORT_STATUS';
    } else if (urlPath.includes('/gst-company')) {
      serviceType = 'GST_COMPANY_INFO';
    } else if (urlPath.includes('/pancard_status') || urlPath.includes('/pan-track')) {
      serviceType = 'PAN_TRACK';
    } else if (urlPath.includes('/voter-id-verify')) {
      serviceType = 'VOTER_ID_VERIFY';
    } else if (urlPath.includes('/voter/verify')) {
      serviceType = 'VOTER_VERIFY';
    } else if (urlPath.includes('/gst-return')) {
      serviceType = 'GST_RETURN';
    } else if (urlPath.includes('/GstVerify.php') || urlPath.includes('/gst/verify') || urlPath.includes('/gst-verify')) {
      serviceType = 'GST_VERIFY';
    } else if (urlPath.includes('/PanToGst.php') || urlPath.includes('/pan-to-gst')) {
      serviceType = 'PAN_TO_GST';
    } else if (urlPath.includes('/fetch-info') || urlPath.includes('/data_fetch') || urlPath.includes('/aadhaar-otp')) {
      serviceType = 'AADHAAR_OTP';
    } else if (urlPath.includes('/aadhaar-to-pan')) {
      serviceType = 'AADHAAR_TO_PAN';
    } else if (urlPath.includes('/aadhaar-pan')) {
      serviceType = 'AADHAAR_PAN';
    } else if (urlPath.includes('/aadhaar/verify')) {
      serviceType = 'AADHAAR_DATA';
    } else if (urlPath.includes('/pan-v1') || urlPath.includes('/pan/verify')) {
      serviceType = 'PAN_CARD';
    } else if (urlPath.includes('/pan_details') || urlPath.includes('/pan-verification')) {
      serviceType = 'PAN_VERIFICATION';
    } else if (urlPath.includes('/pan-basic')) {
      serviceType = 'PAN_BASIC';
    } else if (urlPath.includes('/nsdl_decode.php') || urlPath.includes('/pan-decode')) {
      serviceType = 'PAN_DECODE';
    } else if (urlPath.includes('/pan-short')) {
      serviceType = 'PAN_SHORT';
    } else if (urlPath.includes('/rc-verify')) {
      serviceType = 'RC_VERIFY';
    } else if (urlPath.includes('/passport-verify')) {
      serviceType = 'PASSPORT_VERIFY';
    } else if (urlPath.includes('/driving-license-verify')) {
      serviceType = 'DRIVING_LICENSE_VERIFY';
    } else if (urlPath.includes('/mca-company-search')) {
      serviceType = 'MCA_COMPANY_SEARCH';
    } else if (urlPath.includes('/bank-verify')) {
      serviceType = 'BANK_VERIFY';
    } else if (urlPath.includes('/upi-verify')) {
      serviceType = 'UPI_VERIFY';
    } else if (urlPath.includes('/vehicle-challan')) {
      serviceType = 'VEHICLE_CHALLAN';
    } else if (urlPath.includes('/rc-advanced')) {
      serviceType = 'RC_ADVANCED';
    } else if (urlPath.includes('/rc-to-mobile')) {
      serviceType = 'RC_TO_MOBILE';
    } else if (urlPath.includes('/mobile-to-rc')) {
      serviceType = 'MOBILE_TO_RC';
    } else if (urlPath.includes('/rc-lite')) {
      serviceType = 'RC_LITE';
    } else if (urlPath.includes('/mobile-to-pan')) {
      serviceType = 'MOBILE_TO_PAN';
    } else {
      const pathParts = urlPath.split('/');
      const verifyIndex = pathParts.indexOf('verify');
      const serviceString = verifyIndex > 0 ? pathParts[verifyIndex - 1] : (pathParts[3] || 'PAN_CARD');
      serviceType = serviceString.toUpperCase().replace(/-/g, '_');
    }
    
    const combinedPayload = { ...req.query, ...req.body };

    let ipAddress = req.ip || req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress);
    if (ipAddress && ipAddress.includes(',')) {
      ipAddress = ipAddress.split(',')[0].trim();
    }
    if (ipAddress && ipAddress.startsWith('::ffff:')) {
      ipAddress = ipAddress.substring(7);
    }

    const apiKeyId = req.apiKey ? req.apiKey.id : null;
    const userId = req.user.id;
    const organizationId = req.organizationId;

    // Phase 7: Verification execution validation layer
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "User is not logged in or does not exist." });
    }
    if (user.status !== 'ACTIVE' || user.deletedAt !== null) {
      return res.status(403).json({ success: false, message: "User account is suspended or inactive." });
    }

    const prisma = require('../lib/prisma');
    const serviceDef = await prisma.service.findFirst({
      where: { key: serviceType, deletedAt: null }
    });
    if (!serviceDef) {
      return res.status(404).json({ success: false, message: `Requested verification service ${serviceType} does not exist.` });
    }

    const validationError = ApiGatewayController.validateInput(serviceType, combinedPayload);
    if (validationError) {
      return res.status(400).json({
        success: false,
        status: 'FAILED',
        message: validationError,
        error: { code: 'INVALID_INPUT', message: validationError }
      });
    }
    const roleName = user.role?.name || req.role || user.role || '';
    const roleKey = String(roleName).toUpperCase().replace(/[\s-]+/g, '_');
    const isUserAdmin = user.isAdmin || roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN';
    if (!isUserAdmin && user.kycStatus !== 'KYC_APPROVED' && user.kycStatus !== 'APPROVED') {
      return res.status(403).json({ success: false, message: "Complete KYC verification first." });
    }

    // Check active User subscription for this specific service
    const activeSub = await prisma.userServiceSubscription.findUnique({
      where: {
        userId_serviceId: {
          userId: user.id,
          serviceId: serviceDef.id
        }
      }
    });

    if (!isUserAdmin && (!activeSub || activeSub.status !== 'ACTIVE')) {
      return res.status(403).json({
        success: false,
        message: `Active ${serviceDef.name} plan required.`
      });
    }

    // Cost calculation
    let pricingRule = null;
    let deductedAmount = 0;
    try {
      pricingRule = await PricingEngine.calculateCost(serviceType, req.user);
      deductedAmount = parseFloat(pricingRule.sellingPrice);
    } catch (pricingErr) {
      logger.error('Failed to calculate service cost: %O', pricingErr);
      return res.status(500).json({ success: false, message: 'Failed to resolve pricing rule for this service.' });
    }

    // Wallet validity & balance check. Admin sandbox calls bypass wallet validation entirely.
    let isWalletBypassed = isUserAdmin;
    if (!isWalletBypassed) {
      const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
      if (!wallet) {
        return res.status(400).json({ success: false, message: "Wallet is not initialized." });
      }

      if (parseFloat(wallet.balance) < deductedAmount) {
        return res.status(402).json({
          success: false,
          message: `Insufficient wallet balance. Required: INR ${deductedAmount.toFixed(2)}, Available: INR ${parseFloat(wallet.balance).toFixed(2)}`
        });
      }
    }

    let requestLog = null;

    try {
      logger.info(`Incoming verification request for [${serviceType}] from User ID: ${userId}`);

      // 4. Create database transaction and deduct wallet balance
      // Deducts funds, logs transaction status as COMPLETED. If provider fails later, we issue a REVERSAL transaction.
      let deductionResult = null;
      if (!isWalletBypassed) {
        deductionResult = await WalletManager.deduct(userId, deductedAmount, {
          serviceType,
          description: `${serviceType} verification API call charge.`
        });
      }

      // 5. Initialize verification audit log in PENDING status
      requestLog = await AuditManager.logRequest({
        apiKeyId,
        userId,
        organizationId,
        serviceType,
        cost: deductedAmount,
        payload: combinedPayload,
        ipAddress
      });

      // 6. Resolve provider route configuration
      const { primaryProvider, backupProvider } = await ProviderResolver.resolveProviders(serviceType);

      let providerResponse = null;
      let selectedProvider = primaryProvider;
      let executionError = null;

      // 7. Invoke primary provider
      try {
        logger.info(`Executing verification with Primary Provider: ${primaryProvider.name} (${primaryProvider.code})`);
        const providerInstance = getProvider(primaryProvider.code, primaryProvider.credentials);
        providerResponse = await ApiGatewayController.callProviderAdapter(
          providerInstance,
          serviceType,
          combinedPayload
        );

        if (!providerResponse.success) {
          throw new Error(providerResponse.error ? providerResponse.error.message : 'Primary provider returned failure status.');
        }
      } catch (err) {
        logger.warn(`Primary provider ${primaryProvider.code} execution failed: ${err.message}. Checking backup...`);
        executionError = err;

        // 8. Handle Failover: Invoke backup provider if active
        if (backupProvider) {
          try {
            logger.info(`Executing verification with Backup Provider: ${backupProvider.name} (${backupProvider.code})`);
            const backupInstance = getProvider(backupProvider.code, backupProvider.credentials);
            providerResponse = await ApiGatewayController.callProviderAdapter(
              backupInstance,
              serviceType,
              combinedPayload
            );
            selectedProvider = backupProvider;
            
            if (providerResponse.success) {
              executionError = null; // Clear primary error since backup succeeded
              logger.info(`Failover execution successful with backup provider ${backupProvider.code}`);
            } else {
              throw new Error(providerResponse.error ? providerResponse.error.message : 'Backup provider returned failure status.');
            }
          } catch (backupErr) {
            logger.error(`Backup provider ${backupProvider.code} execution also failed: ${backupErr.message}`);
            executionError = new Error(`Both primary and backup verification providers failed: ${backupErr.message}`);
          }
        }
      }

      // 9. If both providers failed, trigger refund/reversal workflow
      if (executionError) {
        logger.error(`Verification operation failed. Reversing wallet debit for user: ${userId}`);
        
        // Update request audit log to FAILED
        await AuditManager.logResponse({
          requestId: requestLog.id,
          status: 'FAILED',
          providerId: selectedProvider ? selectedProvider.id : null,
          responseData: null,
          providerLatencyMs: 0,
          errorCode: 'PROVIDER_COMMUNICATION_ERROR',
          errorMessage: executionError.message
        });

        // Issue credit refund back to client's wallet
        if (!isWalletBypassed) {
          await WalletManager.refund(userId, deductedAmount, {
            serviceType,
            referenceId: requestLog.id,
            description: `Reversal for failed ${serviceType} verification: ${executionError.message}`
          });
        }

        // Notify client webhooks
        WebhookDispatcher.dispatch(
          'verification.failed',
          {
            requestId: requestLog.id,
            serviceType,
            status: 'FAILED',
            error: { code: 'PROVIDER_ERROR', message: executionError.message }
          },
          userId,
          organizationId
        );

        return res.status(502).json({
          success: false,
          requestId: requestLog.id,
          transactionId: requestLog.id,
          service: serviceType,
          latency: 0,
          status: 'FAILED',
          message: 'All verification providers returned errors. Charges have been refunded to your wallet.',
          error: {
            code: 'PROVIDER_FAILURE',
            message: 'All verification providers returned errors. Charges have been refunded to your wallet.',
            details: 'Verification provider is temporarily unavailable. Please try again later.'
          }
        });
      }

      // 10. Success execution pathway: Update logs and return unified response payload
      await AuditManager.logResponse({
        requestId: requestLog.id,
        status: 'SUCCESS',
        providerId: selectedProvider.id,
        responseData: providerResponse.data,
        providerLatencyMs: providerResponse.latency,
        errorCode: null,
        errorMessage: null
      });

      // Dispatch Webhook Success event in background BullMQ queue
      WebhookDispatcher.dispatch(
        'verification.success',
        {
          requestId: requestLog.id,
          serviceType,
          status: 'SUCCESS',
          cost: deductedAmount,
          data: providerResponse.data
        },
        userId,
        organizationId
      );

      // Return response
      return res.status(200).json({
        success: true,
        requestId: requestLog.id,
        transactionId: requestLog.id,
        serviceType,
        service: serviceType,
        latencyMs: providerResponse.latency,
        latency: providerResponse.latency,
        provider: selectedProvider.code,
        status: 'SUCCESS',
        message: providerResponse.data?.message || 'Verification successful.',
        data: providerResponse.data
      });
    } catch (error) {
      logger.error(`Critical error in API Gateway core: ${error.message}`);

      // Handle fail-safes: If wallet deduction went through but execution crashed before provider resolving
      if (requestLog && requestLog.status === 'PENDING') {
        try {
          await AuditManager.logResponse({
            requestId: requestLog.id,
            status: 'FAILED',
            providerId: null,
            responseData: null,
            providerLatencyMs: 0,
            errorCode: 'GATEWAY_CORE_EXCEPTION',
            errorMessage: error.message
          });

          if (!isWalletBypassed) {
            await WalletManager.refund(userId, deductedAmount, {
              serviceType,
              referenceId: requestLog.id,
              description: `Auto-reversal for gateway exception: ${error.message}`
            });
          }
        } catch (reversalErr) {
          logger.error(`CRITICAL: Failed to auto-reverse funds for user: ${userId}. Manual intervention required. %O`, reversalErr);
        }
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'GATEWAY_INTERNAL_ERROR',
          message: 'An internal error occurred in the gateway.'
        }
      });
    }
  }

  static validateInput(serviceType, payload) {
    const type = String(serviceType || '').toUpperCase();
    const value = (...keys) => keys.map(key => payload[key]).find(v => v !== undefined && v !== null && String(v).trim() !== '');
    const clean = (...keys) => String(value(...keys) || '').trim();
    const upper = (...keys) => clean(...keys).toUpperCase();

    const patterns = {
      gstin: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
      pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
      vehicle: /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/,
      mobile: /^[6-9][0-9]{9}$/,
      ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
      upi: /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{2,64}$/,
      passport: /^[A-Z][0-9]{7}$/,
      date: /^\d{4}-\d{2}-\d{2}$/,
      epic: /^[A-Z]{3}[0-9]{7}$/
    };

    if (['GST_VERIFY', 'GST_RETURN'].includes(type)) {
      if (!patterns.gstin.test(upper('gst', 'gstin'))) return 'GSTIN must be a valid 15-character GST number.';
    }
    if (['RC_VERIFY', 'RC_LITE', 'RC_TO_MOBILE', 'VEHICLE_CHALLAN'].includes(type)) {
      if (!patterns.vehicle.test(upper('vehicle_no', 'vehicle', 'rc_no'))) return 'Vehicle number must be a valid Indian registration number.';
    }
    if (type === 'MOBILE_TO_RC') {
      if (!patterns.mobile.test(clean('mobile_no', 'mobile'))) return 'Mobile number must be a valid 10-digit Indian mobile number.';
    }
    if (type === 'BANK_VERIFY') {
      if (!clean('account_no', 'account')) return 'Bank account number is required.';
      if (!patterns.ifsc.test(upper('ifsc'))) return 'IFSC must be a valid IFSC code.';
    }
    if (type === 'UPI_VERIFY') {
      if (!patterns.upi.test(clean('upi_id', 'vpa', 'upi'))) return 'UPI ID must be a valid VPA format.';
    }
    if (type === 'PASSPORT_VERIFY') {
      if (!patterns.passport.test(upper('passport_no', 'passport'))) return 'Passport number must be valid.';
      if (!clean('file_no', 'fileNumber')) return 'Passport file number is required.';
      if (!patterns.date.test(clean('dob', 'date_of_birth'))) return 'Passport DOB must use YYYY-MM-DD format.';
    }
    if (type === 'DRIVING_LICENSE_VERIFY') {
      if (clean('dl_no', 'dl', 'license_no').length < 6) return 'Driving licence number is required.';
      if (!patterns.date.test(clean('dob', 'date_of_birth'))) return 'Driving licence DOB must use YYYY-MM-DD format.';
    }
    if (type === 'VOTER_ID_VERIFY') {
      if (!patterns.epic.test(upper('epic', 'voter_id', 'voter'))) return 'EPIC must match ABC1234567 format.';
    }
    if (type === 'MCA_COMPANY_SEARCH') {
      if (clean('cin', 'company_name', 'company').length < 3) return 'Company name or CIN must be at least 3 characters.';
    }
    if (type === 'PAN_TO_GST' || type === 'AADHAAR_PAN' || type === 'AADHAAR_TO_PAN') {
      const pan = upper('pan', 'pan_no', 'pan_number');
      if (pan && !patterns.pan.test(pan)) return 'PAN must match ABCDE1234F format.';
    }

    return null;
  }
  static async callProviderAdapter(providerInstance, serviceType, body) {
    const type = serviceType.toUpperCase();
    
    if (providerInstance.code === 'planapi') {
      const planApiMapping = {
        GST_VERIFY: 'gst',
        GST_RETURN: 'gstReturn',
        RC_VERIFY: 'rc',
        RC_LITE: 'rcLite',
        RC_TO_MOBILE: 'rcMobile',
        MOBILE_TO_RC: 'mobileRc',
        VEHICLE_CHALLAN: 'challan',
        DRIVING_LICENSE_VERIFY: 'dl',
        PASSPORT_VERIFY: 'passport',
        VOTER_ID_VERIFY: 'voter',
        MCA_COMPANY_SEARCH: 'mca',
        BANK_VERIFY: 'bank',
        UPI_VERIFY: 'upi'
      };
      const planModule = planApiMapping[type];
      if (planModule) {
        try {
          const adapter = require(`../providers/planapi/${planModule}`);
          return await adapter.verify(providerInstance, body);
        } catch (err) {
          logger.error(`Failed to load or execute PLANAPI adapter for ${type}: ${err.message}`);
          throw err;
        }
      }
    }
    // Map serviceType to specific provider adapter files
    const fileMapping = {
      'PAN': 'pan',
      'PAN_CARD': 'pan',
      'PAN_VERIFICATION': 'panVerification',
      'PAN_BASIC': 'panBasic',
      'PAN_SHORT': 'panShort',
      'PAN_DECODE': 'nsdlDecode',
      'PAN_TO_GST': 'panToGst',
      'AADHAAR': 'aadhaar',
      'AADHAAR_DATA': 'aadhaar',
      'AADHAAR_OTP': 'aadhaarOtp',
      'AADHAAR_PAN': 'aadhaarPan',
      'VOTER': 'voter',
      'VOTER_VERIFY': 'voter',
      'RATION': 'ration',
      'RATION_CARD_VERIFY': 'rationCardVerify',
      'AADHAAR_SHORT_STATUS': 'aadhaarShortStatus',
      'GST_COMPANY_INFO': 'gstCompanyInfo',
      'PAN_TRACK': 'panTrack',
      'GST': 'gst',
      'GST_VERIFY': 'gst',
      'GST_RETURN': 'gstReturn',
      'RC_VERIFY': 'rc',
      'VOTER_ID_VERIFY': 'voterId',
      'PASSPORT_VERIFY': 'passport',
      'DRIVING_LICENSE_VERIFY': 'drivingLicense',
      'MCA_COMPANY_SEARCH': 'mca',
      'BANK_VERIFY': 'bank',
      'UPI_VERIFY': 'upi',
      'VEHICLE_CHALLAN': 'challan',
      'RC_ADVANCED': 'rcAdvanced',
      'RC_TO_MOBILE': 'rcMobile',
      'MOBILE_TO_RC': 'mobileRc',
      'RC_LITE': 'rcLite',
      'AADHAAR_TO_PAN': 'aadhaarPan',
      'MOBILE_TO_PAN': 'mobileToPan'
    };

    const fileName = fileMapping[type];
    if (fileName) {
      try {
        const adapter = require(`../providers/${fileName}.provider`);
        return await adapter.verify(providerInstance, body);
      } catch (err) {
        logger.error(`Failed to load or execute adapter for ${type}: ${err.message}`);
        throw err;
      }
    }

    // Generic fallback case for simulated calls
    logger.info(`Executing mock generic verification for service: ${type}`);
    const latency = providerInstance.simulateLatency ? await providerInstance.simulateLatency() : 120;
    return {
      success: true,
      latency,
      data: {
        service: type,
        status: 'VERIFIED',
        verifiedAt: new Date(),
        inputProvided: body,
        message: `Mock verification response for ${type} service.`
      }
    };
  }
}

module.exports = ApiGatewayController;
