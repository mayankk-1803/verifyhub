const prisma = require('../lib/prisma');
const KycService = require('../services/kyc.service');
const logger = require('../config/logger');
const KycCache = require('../utils/kycCache');
const fs = require('fs');
const path = require('path');

const toSafeAadhaarDebug = (user) => ({
  id: user?.id,
  kycStatus: user?.kycStatus,
  kycLevel: user?.kycLevel,
  aadhaarVerified: user?.aadhaarVerified,
  aadhaarPhotoUrl: user?.aadhaarPhotoUrl || null,
  aadhaarVerifiedAt: user?.aadhaarVerifiedAt || null
});

const getVal = (obj, keys, defaultVal = '') => {
  if (!obj) return defaultVal;
  
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
      return obj[k];
    }
  }
  
  if (obj.data) {
    for (const k of keys) {
      if (obj.data[k] !== undefined && obj.data[k] !== null && obj.data[k] !== '') {
        return obj.data[k];
      }
    }
  }

  if (obj.details) {
    for (const k of keys) {
      if (obj.details[k] !== undefined && obj.details[k] !== null && obj.details[k] !== '') {
        return obj.details[k];
      }
    }
  }
  
  return defaultVal;
};

function saveBase64Image(base64Str, userId) {
  if (!base64Str || typeof base64Str !== 'string') return '';
  
  let base64Data = base64Str;
  let ext = 'jpg';
  
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    const imageType = matches[1];
    base64Data = matches[2];
    if (imageType.includes('png')) ext = 'png';
    else if (imageType.includes('gif')) ext = 'gif';
  } else {
    if (base64Str.startsWith('http')) {
      return base64Str;
    }
    if (base64Str.startsWith('/uploads/') || base64Str.startsWith('uploads/')) {
      const pathPart = base64Str.startsWith('/') ? base64Str : `/${base64Str}`;
      const baseUrl = process.env.APP_BASE_URL || process.env.APP_URL || 'https://auth.dizipay.in';
      const photoUrl = `${baseUrl}${pathPart}`;
      console.log("AADHAAR PHOTO SAVED:", path.join(process.cwd(), pathPart));
      console.log("AADHAAR PHOTO URL:", photoUrl);
      return photoUrl;
    }
  }

  try {
    const uploadDir = path.join(process.cwd(), 'uploads', 'aadhaar');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `aadhaar-${userId}-${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);
    
    const baseUrl = process.env.APP_BASE_URL || process.env.APP_URL || 'https://auth.dizipay.in';
    const photoUrl = `${baseUrl}/uploads/aadhaar/${filename}`;
    
    console.log("AADHAAR PHOTO SAVED:", filepath);
    console.log("AADHAAR PHOTO URL:", photoUrl);
    
    return photoUrl;
  } catch (err) {
    logger.error('Failed to save base64 photo: %O', err);
    return '';
  }
}


class KycController {
  static saveBase64Image(base64Str, userId) {
    return saveBase64Image(base64Str, userId);
  }

  static async sendAadhaarOtp(req, res) {
    try {
      const { aadhaarNumber } = req.body;

      if (req.user.aadhaarVerified === true) {
        return res.status(409).json({ success: false, message: 'Aadhaar already verified' });
      }

      if (!aadhaarNumber || typeof aadhaarNumber !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid Aadhaar number' });
      }

      const cleanAadhaar = aadhaarNumber.replace(/\s+/g, '');
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        return res.status(400).json({ success: false, message: 'Invalid Aadhaar number' });
      }

      logger.info(`Sending Aadhaar OTP for user ID: ${req.user.id}`);

      // Call WebTechly OTP API
      const result = await KycService.sendAadhaarOtp(cleanAadhaar);

      if (!result || result.status !== true) {
        return res.status(400).json({
          success: false,
          error: result?.message || 'Aadhaar OTP request failed at provider'
        });
      }

      // Extract client_id from response
      const clientId = result.client_id || result.application_no || result.data?.client_id || result.data?.application_no || `app_${Math.random().toString(36).substring(2, 9)}`;

      const maskedAadhaar = `XXXX XXXX ${cleanAadhaar.slice(-4)}`;

      // Update User Model in database (Store only masked Aadhaar and set level)
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          aadhaarNumberMasked: maskedAadhaar,
          kycLevel: 'AADHAAR_OTP_SENT'
        }
      });

      // Save KycVerification entry (applicationNumber stores client_id)
      await prisma.kycVerification.create({
        data: {
          userId: req.user.id,
          aadhaarMasked: maskedAadhaar,
          applicationNumber: String(clientId),
          status: 'AADHAAR_OTP_SENT',
          aadhaarResponse: { success: true, client_id: clientId }
        }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Aadhaar OTP Sent',
          message: `An Aadhaar verification OTP has been sent to your registered mobile number.`
        }
      });

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'AADHAAR_OTP_SEND',
          entityName: 'users',
          entityId: req.user.id.toString(),
          newValues: { 
            maskedAadhaar, 
            clientId: String(clientId),
            userAgent: req.headers['user-agent'] || ''
          },
          ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
          userAgent: req.headers['user-agent'] || null
        }
      });

      // Invalidate cache
      KycCache.invalidate(req.user.id);
      try {
        const ProfileController = require('./profileController');
        await ProfileController.invalidateCache(req.user.id);
      } catch (err) {
        logger.error('Failed to invalidate profile cache: %O', err);
      }

      return res.status(200).json({
        success: true,
        clientId: String(clientId),
        maskedAadhaar
      });
    } catch (error) {
      logger.error('Aadhaar OTP controller error: %O', error);
      return res.status(500).json({ success: false, error: 'Verification provider is temporarily unavailable. Please try again later.' });
    }
  }

  static async fetchAadhaarDetails(req, res) {
    try {
      const { otp, clientId } = req.body;

      if (req.user.aadhaarVerified === true) {
        return res.status(409).json({ success: false, message: 'Aadhaar already verified' });
      }

      if (!otp || !clientId) {
        return res.status(400).json({ success: false, message: 'OTP and Client ID are required' });
      }

      logger.info(`Fetching Aadhaar details for user ID: ${req.user.id}, clientId: ${clientId}`);

      // Call WebTechly Fetch Info API
      const result = await KycService.fetchAadhaarDetails(otp, clientId);

      if (!result || result.status !== true) {
        return res.status(400).json({
          success: false,
          error: result?.message || 'Aadhaar details fetch failed at provider'
        });
      }

      const responseData = result || {};
      
      const name = getVal(responseData, ['name', 'full_name', 'fullName'], req.user.aadhaarName || 'UNKNOWN');
      const dob = getVal(responseData, ['dob', 'dateOfBirth', 'date_of_birth'], req.user.aadhaarDob || '');
      const gender = getVal(responseData, ['gender'], req.user.aadhaarGender || '');
      const fatherName = getVal(responseData, ['father_name', 'fatherName', 'parent_name', 'parentName', 'careOf', 'care_of'], req.user.aadhaarFatherName || '');
      
      const address = getVal(responseData, ['address', 'full_address', 'fullAddress', 'location'], '');
      const district = getVal(responseData, ['district', 'district_name', 'city', 'dist'], req.user.aadhaarDistrict || '');
      const state = getVal(responseData, ['state', 'state_name'], req.user.aadhaarState || '');
      const pincode = getVal(responseData, ['pincode', 'pin', 'zip', 'zipcode'], req.user.aadhaarPincode || '');
      const village = getVal(responseData, ['village', 'locality', 'town', 'subdist'], req.user.aadhaarVillage || '');
      const country = getVal(responseData, ['country', 'nation'], req.user.aadhaarCountry || 'India');
      
      let formattedAddress = req.user.aadhaarAddress;
      if (address || district || state || pincode) {
        formattedAddress = address || `${village ? village + ', ' : ''}${district}, ${state}, ${pincode}, ${country}`;
      } else if (!formattedAddress) {
        formattedAddress = '';
      }

      const photo = getVal(responseData, ['photo_base64', 'photo', 'image', 'profileImage', 'profile_image'], req.user.aadhaarPhoto || '');
      const photoUrl = saveBase64Image(photo, req.user.id);

      // Handle phone updates: save if current user phone is null, never overwrite.
      let updatedPhone = req.user.phone;
      let updatedPhoneNumber = req.user.phoneNumber;
      const responseMobile = getVal(responseData, ['mobile', 'phone', 'registered_mobile'], '');
      if (!updatedPhone && responseMobile) {
        updatedPhone = responseMobile;
        updatedPhoneNumber = responseMobile;
      }

      let finalPhotoUrl = photoUrl;
      
      const isBase64Str = (str) => {
        if (!str || typeof str !== 'string') return false;
        if (str.startsWith('data:')) return true;
        if (!str.startsWith('/') && !str.startsWith('http')) return true;
        if (str.startsWith('/') && !str.startsWith('/uploads/')) return true;
        return false;
      };

      if (isBase64Str(finalPhotoUrl)) {
        console.warn("Unexpected Aadhaar photo URL format (base64 string detected)");
        finalPhotoUrl = '';
      }

      if (finalPhotoUrl?.length > 190) {
        console.warn("Unexpected Aadhaar photo URL length:", finalPhotoUrl.length);
        finalPhotoUrl = '';
      }

      if (finalPhotoUrl && finalPhotoUrl.startsWith("data:image")) {
        throw new Error("Base64 image cannot be stored in aadhaar_photo_url");
      }

      const mappedData = {
        name,
        dob,
        gender,
        fatherName,
        address,
        district,
        state,
        pincode,
        village,
        country,
        photoUrl: finalPhotoUrl
      };
      
      const updatePayload = {
        aadhaarVerified: true,
        aadhaarName: name,
        aadhaarDob: dob,
        aadhaarGender: gender,
        aadhaarFatherName: fatherName,
        aadhaarAddress: formattedAddress,
        aadhaarDistrict: district,
        aadhaarState: state,
        aadhaarPincode: pincode,
        aadhaarVillage: village,
        aadhaarCountry: country,
        aadhaarPhoto: photo,
        aadhaarPhotoUrl: finalPhotoUrl,
        phone: updatedPhone,
        phoneNumber: updatedPhoneNumber,
        kycLevel: 'AADHAAR_VERIFIED',
        kycStatus: 'KYC_APPROVED',
        kycApprovedAt: new Date(),
        aadhaarVerifiedAt: new Date()
      };

      console.log("AADHAAR RAW RESPONSE", { status: result.status, hasData: Boolean(result.data) });
      console.log("AADHAAR MAPPED DATA", mappedData);
      console.log("AADHAAR DB UPDATE", { ...mappedData, kycStatus: updatePayload.kycStatus, kycLevel: updatePayload.kycLevel });

      // Update User Model in database (Set KYC approved)
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: updatePayload
      });

      console.log("AADHAAR PROFILE RESPONSE", toSafeAadhaarDebug(updatedUser));
      console.log("AADHAAR PHOTO URL", finalPhotoUrl);

      // Save KycVerification entry (Sanitized: NO raw OTP, raw Aadhaar or full API response payloads)
      await prisma.kycVerification.create({
        data: {
          userId: req.user.id,
          aadhaarMasked: req.user.aadhaarNumberMasked,
          applicationNumber: String(clientId),
          status: 'KYC_APPROVED',
          aadhaarResponse: { success: true, name, dob, gender, address: formattedAddress }
        }
      });

      // Create notifications
      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Aadhaar Verification Successful',
          message: 'Your Aadhaar card details have been successfully verified.'
        }
      });

      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'KYC Approved',
          message: 'Your KYC verification request has been successfully approved! Full platform features have been unlocked.'
        }
      });

      // Create Audit Logs
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'AADHAAR_VERIFIED',
          entityName: 'users',
          entityId: req.user.id.toString(),
          newValues: { 
            clientId: String(clientId),
            userAgent: req.headers['user-agent'] || ''
          },
          ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
          userAgent: req.headers['user-agent'] || null
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'KYC_APPROVED',
          entityName: 'users',
          entityId: req.user.id.toString(),
          newValues: { 
            kycStatus: 'KYC_APPROVED', 
            kycLevel: 'AADHAAR_VERIFIED',
            userAgent: req.headers['user-agent'] || ''
          },
          ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
          userAgent: req.headers['user-agent'] || null
        }
      });

      // Invalidate cache
      KycCache.invalidate(req.user.id);
      try {
        const ProfileController = require('./profileController');
        await ProfileController.invalidateCache(req.user.id);
      } catch (err) {
        logger.error('Failed to invalidate profile cache: %O', err);
      }

      return res.status(200).json({
        success: true,
        message: 'KYC Approved',
        data: {
          name,
          dob,
          gender,
          address: formattedAddress,
          photoUrl,
          kycApprovedAt: updatedUser.kycApprovedAt
        }
      });
    } catch (error) {
      logger.error('Aadhaar details verification error: %O', error);
      return res.status(500).json({ success: false, error: 'Verification provider is temporarily unavailable. Please try again later.' });
    }
  }

  static async retryKyc(req, res) {
    try {
      if (req.user.kycStatus === 'KYC_APPROVED' || req.user.kycStatus === 'APPROVED') {
        return res.status(409).json({ success: false, message: 'Approved KYC cannot be restarted' });
      }

      if (req.user.kycStatus !== 'KYC_REJECTED' && req.user.kycStatus !== 'REJECTED') {
        return res.status(400).json({ success: false, error: 'Only rejected KYC applications can be retried.' });
      }

      logger.info(`Restarting KYC verification for user ID: ${req.user.id}`);

      // Invalidate cache
      KycCache.invalidate(req.user.id);
      try {
        const ProfileController = require('./profileController');
        await ProfileController.invalidateCache(req.user.id);
      } catch (err) {
        logger.error('Failed to invalidate profile cache: %O', err);
      }

      // Update User Model in database (Reset status but keep historical PAN fields unchanged)
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          aadhaarVerified: false,
          kycLevel: 'PENDING_KYC',
          kycStatus: 'PENDING_KYC',
          kycRemarks: null,
          aadhaarNumberMasked: null,
          aadhaarName: null,
          aadhaarDob: null,
          aadhaarGender: null,
          aadhaarFatherName: null,
          aadhaarAddress: null,
          aadhaarDistrict: null,
          aadhaarState: null,
          aadhaarPincode: null,
          aadhaarVillage: null,
          aadhaarCountry: null,
          aadhaarPhoto: null,
          aadhaarPhotoUrl: null,
          aadhaarVerifiedAt: null,
          kycApprovedAt: null,
          kycRejectedAt: null
        }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'KYC Verification Restarted',
          message: 'Your KYC verification request has been restarted. Please re-submit your Aadhaar details.'
        }
      });

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'KYC_RETRY',
          entityName: 'users',
          entityId: req.user.id.toString(),
          newValues: { 
            kycStatus: 'PENDING_KYC', 
            kycLevel: 'PENDING_KYC',
            userAgent: req.headers['user-agent'] || ''
          },
          ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
          userAgent: req.headers['user-agent'] || null
        }
      });

      return res.status(200).json({
        success: true,
        message: 'KYC verification restarted successfully'
      });
    } catch (error) {
      logger.error('KYC retry controller error: %O', error);
      return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
    }
  }

  static async getKycStatus(req, res) {
    try {
      // Return cached version if valid
      const cachedData = KycCache.get(req.user.id);
      if (cachedData) {
        return res.status(200).json(cachedData);
      }

      const history = await prisma.kycVerification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });

      const formattedHistory = history.map(h => ({
        id: h.id,
        createdAt: h.createdAt,
        status: h.status,
        remarks: h.status === 'KYC_REJECTED' ? (req.user.kycRemarks || 'Verification rejected') : (h.status === 'KYC_APPROVED' ? 'Approved' : 'Verification step updated')
      }));

      const responseData = {
        kycStatus: req.user.kycStatus,
        kycLevel: req.user.kycLevel,
        aadhaarVerified: req.user.aadhaarVerified,
        aadhaarNumberMasked: req.user.aadhaarNumberMasked,
        aadhaarName: req.user.aadhaarName || '',
        aadhaarDob: req.user.aadhaarDob || '',
        aadhaarGender: req.user.aadhaarGender || '',
        aadhaarFatherName: req.user.aadhaarFatherName || '',
        aadhaarAddress: req.user.aadhaarAddress || '',
        aadhaarDistrict: req.user.aadhaarDistrict || '',
        aadhaarState: req.user.aadhaarState || '',
        aadhaarPincode: req.user.aadhaarPincode || '',
        aadhaarVillage: req.user.aadhaarVillage || '',
        aadhaarCountry: req.user.aadhaarCountry || '',
        aadhaarPhoto: req.user.aadhaarPhoto || '',
        aadhaarPhotoUrl: req.user.aadhaarPhotoUrl || '',
        phoneNumber: req.user.phoneNumber || '',
        kycApprovedAt: req.user.kycApprovedAt,
        kycRejectedAt: req.user.kycRejectedAt,
        kycRemarks: req.user.kycRemarks || '',
        history: formattedHistory,
        verificationHistory: formattedHistory
      };

      // Set cache
      KycCache.set(req.user.id, responseData);

      return res.status(200).json(responseData);
    } catch (error) {
      logger.error('Get KYC status controller error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve KYC status.' });
    }
  }
}

module.exports = KycController;
