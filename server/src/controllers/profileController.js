const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const { getRedisClient } = require('../lib/redis');

class ProfileController {
  /**
   * Invalidate profile cache for a given user ID
   */
  static async invalidateCache(userId) {
    try {
      const redisClient = await getRedisClient();
      if (redisClient) {
        await redisClient.del(`profile:${userId}`);
        logger.info(`Profile cache invalidated for user ID: ${userId}`);
      }
    } catch (err) {
      logger.error(`Error invalidating profile cache for user ${userId}: %O`, err);
    }
  }

  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const cacheKey = `profile:${userId}`;
      let cachedData = null;

      // 1. Try fetching from Redis cache
      try {
        const redisClient = await getRedisClient();
        if (redisClient) {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            cachedData = JSON.parse(cached);
          }
        }
      } catch (cacheErr) {
        logger.warn('Failed to query Redis profile cache: %O', cacheErr);
      }

      if (cachedData) {
        logger.info(`Profile cache hit for user ID: ${userId}`);
        return res.status(200).json(cachedData);
      }

      // 2. Cache miss: query database
      const user = await prisma.user.findUnique({
        where: { id: userId, deletedAt: null },
        include: {
          role: true,
          organization: true,
          wallet: true
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Fetch audit logs for the user to construct the timeline
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId: userId,
          NOT: {
            action: {
              in: ['PAN_VERIFY', 'PAN_MATCH']
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Construct timeline items
      const timeline = auditLogs.map(log => {
        let description = log.action.replace(/_/g, ' ');
        if (log.action === 'USER_REGISTER' || log.action === 'USER_REGISTERED' || log.action === 'USER_REGISTERED_PHONE') description = 'Account registered';
        else if (log.action === 'USER_LOGIN' || log.action === 'USER_LOGIN_PASSWORD' || log.action === 'USER_LOGIN_OTP') description = 'Logged into system';
        else if (log.action === 'AADHAAR_OTP_SEND') description = 'Aadhaar verification OTP sent';
        else if (log.action === 'AADHAAR_VERIFIED' || log.action === 'AADHAAR_DETAILS_FETCH' || log.action === 'AADHAAR_MATCH' || log.action === 'AADHAAR_VERIFY') description = 'Aadhaar details fetched and verified';
        else if (log.action === 'KYC_APPROVED' || log.action === 'ADMIN_KYC_APPROVED') description = `KYC Approved: ${log.newValues?.remarks || 'Self verified / Admin approved'}`;
        else if (log.action === 'KYC_REJECTED' || log.action === 'ADMIN_KYC_REJECTED') description = `KYC Rejected: ${log.newValues?.remarks || 'Self verified / Admin rejected'}`;
        else if (log.action === 'ADMIN_KYC_SUSPENDED') description = `KYC Suspended: ${log.newValues?.remarks || 'Admin suspended'}`;
        else if (log.action === 'ADMIN_KYC_REVERIFY') description = `KYC Reset/Reverify: ${log.newValues?.remarks || 'Admin requested reverification'}`;
        else if (log.action === 'KYC_RETRY') description = 'KYC retry request submitted';

        return {
          id: log.id,
          action: log.action,
          timestamp: log.createdAt,
          description,
          newValues: log.newValues
        };
      });

      // Map to response structure
      const responseData = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          status: user.status,
          verified: user.verified,
          role: user.role?.name || 'User',
          organization: user.organization?.name || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        aadhaar: {
          aadhaarNumberMasked: user.aadhaarNumberMasked || null,
          aadhaarVerified: user.aadhaarVerified,
          aadhaarName: user.aadhaarName || null,
          aadhaarDob: user.aadhaarDob || null,
          aadhaarGender: user.aadhaarGender || null,
          aadhaarFatherName: user.aadhaarFatherName || null,
          aadhaarAddress: user.aadhaarAddress || null,
          aadhaarDistrict: user.aadhaarDistrict || null,
          aadhaarState: user.aadhaarState || null,
          aadhaarPincode: user.aadhaarPincode || null,
          aadhaarVillage: user.aadhaarVillage || null,
          aadhaarCountry: user.aadhaarCountry || null,
          aadhaarPhotoUrl: user.aadhaarPhotoUrl || null,
          aadhaarVerifiedAt: user.aadhaarVerifiedAt || null,
          phoneNumber: user.phoneNumber || null // Alternate / Aadhaar registered mobile
        },
        pan: {
          panNumber: user.panNumber || null,
          panVerified: user.panVerified,
          panName: user.panName || null,
          dateOfBirth: user.dateOfBirth || null,
          panVerifiedAt: user.panVerifiedAt || null
        },
        wallet: {
          id: user.wallet?.id || null,
          balance: user.wallet?.balance ? parseFloat(user.wallet.balance.toString()) : 0.0,
          currency: user.wallet?.currency || 'INR',
          lastRechargedAt: user.wallet?.lastRechargedAt || null
        },
        kyc: {
          kycStatus: user.kycStatus,
          kycLevel: user.kycLevel,
          kycRemarks: user.kycRemarks || null,
          kycApprovedAt: user.kycApprovedAt || null,
          kycRejectedAt: user.kycRejectedAt || null
        },
        timeline
      };

      // 3. Set short Redis cache (30 seconds)
      try {
        const redisClient = await getRedisClient();
        if (redisClient) {
          await redisClient.setEx(cacheKey, 30, JSON.stringify(responseData));
        }
      } catch (cacheErr) {
        logger.warn('Failed to write to Redis profile cache: %O', cacheErr);
      }

      return res.status(200).json(responseData);
    } catch (error) {
      logger.error('Get unified profile error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve profile details.' });
    }
  }
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const name = String(req.body.name || '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();

      if (!name || name.length < 2) {
        return res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email address.' });
      }

      const existingEmail = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId },
          deletedAt: null
        },
        select: { id: true }
      });

      if (existingEmail) {
        return res.status(409).json({ success: false, message: 'Email address already exists.' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name, email },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          verified: true,
          role: { select: { name: true } },
          organization: { select: { name: true } },
          createdAt: true,
          updatedAt: true
        }
      });

      await ProfileController.invalidateCache(userId);

      await prisma.auditLog.create({
        data: {
          userId,
          organizationId: req.user.organizationId,
          action: 'USER_PROFILE_UPDATED',
          entityName: 'users',
          entityId: String(userId),
          newValues: { name, email }
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          status: updatedUser.status,
          verified: updatedUser.verified,
          role: updatedUser.role?.name || 'User',
          organization: updatedUser.organization?.name || null,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      });
    } catch (error) {
      logger.error('Update profile error: %O', error);
      return res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
  }

}

module.exports = ProfileController;
