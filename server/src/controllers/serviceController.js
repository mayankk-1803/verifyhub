const prisma = require('../lib/prisma');
const staticServices = require('../config/services');
const logger = require('../config/logger');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dizipay_jwt_secret';

const getServices = async (req, res) => {
  try {
    const dbServices = await prisma.service.findMany({
      where: { deletedAt: null }
    });

    // Determine user ID if authorization header is provided
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (err) {
        // Ignore invalid tokens for public listings
      }
    }

    const roleName = req.user?.role?.name || req.role || '';
    const roleKey = String(roleName).toUpperCase().replace(/[\s-]+/g, '_');
    const isUserAdmin = req.user?.isAdmin || roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN';

    // Retrieve the user's active subscriptions if authenticated
    let activeSubscriptions = [];
    if (userId) {
      const subs = await prisma.userServiceSubscription.findMany({
        where: {
          userId: userId,
          status: 'ACTIVE'
        }
      });
      activeSubscriptions = subs.map(s => s.serviceId);
    }

    const services = dbServices.map(dbSvc => {
      const staticSvc = staticServices.find(s => s.key === dbSvc.key) || {};
      return {
        id: dbSvc.id,
        key: dbSvc.key,
        name: dbSvc.name,
        category: dbSvc.category,
        method: dbSvc.method,
        endpoint: dbSvc.endpoint,
        description: dbSvc.description,
        successRate: dbSvc.successRate,
        latency: dbSvc.latency,
        price: dbSvc.price,
        activationFee: dbSvc.activationFee,
        inputFields: staticSvc.inputFields || [],
        sampleRequest: staticSvc.sampleRequest || {},
        sampleResponse: staticSvc.sampleResponse || {},
        isActivated: isUserAdmin || activeSubscriptions.includes(dbSvc.id)
      };
    });

    return res.json({
      success: true,
      services
    });
  } catch (error) {
    logger.error('Get services error: %O', error);
    return res.status(500).json({ error: 'Failed to retrieve services.' });
  }
};

const activateService = async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (isNaN(serviceId)) {
      return res.status(400).json({ success: false, error: 'Invalid service ID.' });
    }

    // 1. Load Service
    const service = await prisma.service.findUnique({
      where: { id: serviceId, deletedAt: null }
    });
    if (!service) {
      return res.status(404).json({ success: false, error: 'Service not found.' });
    }

    // 2. Load PricingRule
    const pricingRule = await prisma.pricingRule.findFirst({
      where: {
        serviceType: service.key,
        OR: [
          { userId: userId },
          { roleId: req.user.roleId },
          { userId: null, roleId: null }
        ]
      },
      orderBy: [
        { userId: 'desc' },
        { roleId: 'desc' }
      ]
    });

    if (!pricingRule) {
      return res.status(404).json({ success: false, error: 'Pricing rule not found for this service.' });
    }

    const purchaseAmount = parseFloat(service.activationFee);
    const roleName = req.user?.role?.name || req.role || '';
    const roleKey = String(roleName).toUpperCase().replace(/[\s-]+/g, '_');
    const isUserAdmin = req.user.isAdmin || roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN';

    // 3. Check and Deduct Wallet Balance in Transaction
    const result = await prisma.$transaction(async (tx) => {
      const wallets = await tx.$queryRaw`SELECT id, balance FROM wallets WHERE user_id = ${userId} FOR UPDATE`;
      const wallet = wallets[0];
      if (!wallet) {
        throw new Error('WALLET_NOT_FOUND');
      }

      const balanceBefore = parseFloat(wallet.balance);
      let finalPurchaseAmount = purchaseAmount;
      let isBypassed = false;

      if (isUserAdmin) {
        finalPurchaseAmount = 0;
        isBypassed = true;
      } else if (balanceBefore < purchaseAmount) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Check if already active
      const existingSub = await tx.userServiceSubscription.findUnique({
        where: {
          userId_serviceId: {
            userId,
            serviceId
          }
        }
      });
      if (existingSub && existingSub.status === 'ACTIVE') {
        throw new Error('ALREADY_ACTIVE');
      }

      const balanceAfter = balanceBefore - finalPurchaseAmount;

      // Update wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter }
      });

      // Create WalletLedger DEBIT entry with SERVICE_ACTIVATION
      const ledgerEntry = await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: finalPurchaseAmount,
          balanceAfter,
          referenceId: `act_${service.key.toLowerCase()}_${Date.now()}`,
          referenceType: 'SERVICE_ACTIVATION',
          description: isBypassed 
            ? `Bypassed activation fee for admin (original fee: ₹${purchaseAmount.toFixed(2)})`
            : `One-time activation fee for service: ${service.name}`,
          status: 'COMPLETED'
        }
      });

      // Create Payment transaction
      const payment = await tx.payment.create({
        data: {
          walletTransactionId: ledgerEntry.id,
          amount: finalPurchaseAmount,
          status: 'COMPLETED',
          razorpayOrderId: `act_order_${Date.now()}`,
          razorpayPaymentId: `act_pay_${Date.now()}`,
          razorpaySignature: 'sig_act_ok'
        }
      });

      // Create / Update UserServiceSubscription
      await tx.userServiceSubscription.upsert({
        where: {
          userId_serviceId: {
            userId,
            serviceId
          }
        },
        update: {
          status: 'ACTIVE',
          purchaseAmount: finalPurchaseAmount,
          paymentId: payment.id.toString(),
          activatedAt: new Date()
        },
        create: {
          userId,
          serviceId,
          status: 'ACTIVE',
          purchaseAmount: finalPurchaseAmount,
          paymentId: payment.id.toString(),
          activatedAt: new Date()
        }
      });

      // Create Notification
      await tx.notification.create({
        data: {
          userId,
          title: 'Service Activated',
          message: `The service ${service.name} has been successfully activated for your account.`
        }
      });

      // Create AuditLog
      if (isBypassed) {
        await tx.auditLog.create({
          data: {
            userId,
            organizationId: req.user.organizationId || null,
            action: 'ADMIN_SERVICE_ACTIVATION_BYPASS',
            entityName: 'user_service_subscriptions',
            entityId: serviceId.toString(),
            newValues: { 
              adminId: req.user.id,
              targetUserId: userId,
              action: 'ADMIN_SERVICE_ACTIVATION_BYPASS',
              serviceId, 
              serviceKey: service.key, 
              originalFee: purchaseAmount, 
              bypassed: true,
              ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
              userAgent: req.headers['user-agent'] || '',
              timestamp: new Date().toISOString()
            },
            ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
            userAgent: req.headers['user-agent'] || null
          }
        });
      } else {
        await tx.auditLog.create({
          data: {
            userId,
            organizationId: req.user.organizationId || null,
            action: 'SERVICE_ACTIVATED',
            entityName: 'user_service_subscriptions',
            entityId: serviceId.toString(),
            newValues: { serviceId, serviceKey: service.key, purchaseAmount: finalPurchaseAmount }
          }
        });
      }

      return { balanceAfter };
    });

    return res.status(200).json({
      success: true,
      message: 'Service activated successfully',
      balance: result.balanceAfter
    });
  } catch (error) {
    logger.error('Service activation error: %O', error);
    if (error.message === 'WALLET_NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'User wallet not found.' });
    }
    if (error.message === 'INSUFFICIENT_BALANCE') {
      return res.status(402).json({ success: false, error: 'Insufficient wallet balance.' });
    }
    if (error.message === 'ALREADY_ACTIVE') {
      return res.status(409).json({ success: false, error: 'Service is already active for this account.' });
    }
    return res.status(500).json({ success: false, error: 'Failed to activate service.' });
  }
};

module.exports = {
  getServices,
  activateService
};
