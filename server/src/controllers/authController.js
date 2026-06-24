const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const crypto = require('crypto');
const EmailService = require('../services/email.service');
const SmsService = require('../services/sms.service');
const redis = require('redis');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dizipay_jwt_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dizipay_refresh_secret';

let redisClient;
(async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    redisClient = redis.createClient({ url: redisUrl, socket: { reconnectStrategy: false } });
    redisClient.on('error', () => {});
    await redisClient.connect();
  } catch (err) {
    redisClient = null;
  }
})();

// Fallback memory stores for rate limiting and lockouts if Redis is unavailable
const memoryLastSent = new Map();
const memoryFailedAttempts = new Map();
const memoryLockouts = new Map();

const generateTokens = (user) => {
  const payload = { id: user.id, email: user.email || '', phone: user.phone || '', roleId: user.roleId };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, phone, password, organizationName } = req.body;

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters.' });
      }

      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email address is required.' });
      }

      if (!phone || !/^\d{10}$/.test(phone.trim())) {
        return res.status(400).json({ error: 'Phone number is required and must be exactly 10 digits.' });
      }

      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      }

      // Check unique email
      const existingUser = await prisma.user.findFirst({
        where: { email: email.trim(), deletedAt: null }
      });
      if (existingUser) {
        return res.status(409).json({ error: 'Email address already in use.' });
      }

      // Check unique phone if provided
      const existingPhone = await prisma.user.findFirst({
        where: { phone: phone.trim(), deletedAt: null }
      });
      if (existingPhone) {
        return res.status(409).json({ error: 'Phone number already in use.' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      // Create organization and user in a transaction
      const tenantId = `tenant_${Math.random().toString(36).substring(2, 9)}`;
      
      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: organizationName || `${name}'s Workspace`,
            tenantId,
            status: 'ACTIVE'
          }
        });

        const user = await tx.user.create({
          data: {
            name,
            email,
            phone: phone ? phone.trim() : null,
            password: hashedPassword,
            roleId: 4, // Client User
            organizationId: org.id,
            status: 'ACTIVE',
            verified: true,
            phoneVerified: phone ? true : false,
            kycStatus: 'PENDING_KYC',
            kycLevel: 'PENDING_KYC',
            panVerified: false,
            aadhaarVerified: false
          }
        });

        await tx.wallet.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            balance: 0.0000,
            currency: 'INR'
          }
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'Welcome to Dizipay',
            message: 'Your account has been successfully created. Welcome aboard!'
          }
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            action: 'USER_REGISTERED',
            entityName: 'users',
            entityId: user.id.toString(),
            newValues: { name, email, phone, organization: org.name }
          }
        });

        return { user, org };
      });

      // Send Welcome Email in background
      EmailService.sendWelcomeEmail(result.user.email, name).catch(err => {
        logger.error('Failed to send welcome email: %O', err);
      });

      const { accessToken, refreshToken } = generateTokens(result.user);
      
      await prisma.user.update({
        where: { id: result.user.id },
        data: { refreshToken }
      });

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        accessToken,
        refreshToken,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          roleId: result.user.roleId,
          organizationId: result.user.organizationId,
          kycStatus: result.user.kycStatus,
          kycLevel: result.user.kycLevel,
          panVerified: result.user.panVerified,
          aadhaarVerified: result.user.aadhaarVerified,
          aadhaarName: result.user.aadhaarName || '',
          aadhaarDob: result.user.aadhaarDob || '',
          aadhaarGender: result.user.aadhaarGender || '',
          aadhaarFatherName: result.user.aadhaarFatherName || '',
          aadhaarAddress: result.user.aadhaarAddress || '',
          aadhaarDistrict: result.user.aadhaarDistrict || '',
          aadhaarState: result.user.aadhaarState || '',
          aadhaarPincode: result.user.aadhaarPincode || '',
          aadhaarVillage: result.user.aadhaarVillage || '',
          aadhaarCountry: result.user.aadhaarCountry || '',
          aadhaarPhotoUrl: result.user.aadhaarPhotoUrl || '',
          phoneNumber: result.user.phoneNumber || '',
          kycApprovedAt: result.user.kycApprovedAt || null
        }
      });
    } catch (error) {
      logger.error('Registration failed: %O', error);
      return res.status(500).json({ error: 'Server registration error. Please check inputs.' });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = await prisma.user.findFirst({
        where: { email, deletedAt: null },
        include: { role: true, organization: true }
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ error: `Your account is currently ${user.status}.` });
      }

      const { accessToken, refreshToken } = generateTokens(user);

      // Resolve user login IP address
      const requestIp = req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress);
      let cleanIp = Array.isArray(requestIp) ? requestIp[0] : requestIp;
      if (cleanIp && cleanIp.includes(',')) {
        cleanIp = cleanIp.split(',')[0].trim();
      }
      if (cleanIp && cleanIp.startsWith('::ffff:')) {
        cleanIp = cleanIp.substring(7);
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          refreshToken,
          lastLogin: new Date(),
          lastIp: cleanIp
        }
      });

      // Write login audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'USER_LOGIN_PASSWORD',
          entityName: 'users',
          entityId: user.id.toString(),
          newValues: { loginType: 'PASSWORD', email, ip: cleanIp }
        }
      });

      return res.status(200).json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role ? user.role.name : 'Client User',
          organization: user.organization ? { id: user.organization.id, name: user.organization.name, tenantId: user.organization.tenantId } : null,
          kycStatus: user.kycStatus,
          kycLevel: user.kycLevel,
          panVerified: user.panVerified,
          aadhaarVerified: user.aadhaarVerified,
          aadhaarName: user.aadhaarName || '',
          aadhaarDob: user.aadhaarDob || '',
          aadhaarGender: user.aadhaarGender || '',
          aadhaarFatherName: user.aadhaarFatherName || '',
          aadhaarAddress: user.aadhaarAddress || '',
          aadhaarDistrict: user.aadhaarDistrict || '',
          aadhaarState: user.aadhaarState || '',
          aadhaarPincode: user.aadhaarPincode || '',
          aadhaarVillage: user.aadhaarVillage || '',
          aadhaarCountry: user.aadhaarCountry || '',
          aadhaarPhotoUrl: user.aadhaarPhotoUrl || '',
          phoneNumber: user.phoneNumber || '',
          kycApprovedAt: user.kycApprovedAt || null
        }
      });
    } catch (error) {
      logger.error('Login failed: %O', error);
      return res.status(500).json({ error: 'Internal login error.' });
    }
  }

  static async sendOtp(req, res) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required.' });
      }

      let cleanPhone = phone.trim();
      if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
        cleanPhone = cleanPhone.substring(2);
      }
      if (!/^\d{10}$/.test(cleanPhone)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
      }

      // Check Lockout state
      let isLocked = false;
      let lockoutTTL = 0;
      if (redisClient) {
        const lockVal = await redisClient.get(`lockout:${cleanPhone}`);
        if (lockVal) {
          isLocked = true;
          lockoutTTL = await redisClient.ttl(`lockout:${cleanPhone}`);
        }
      } else {
        const lockExpiry = memoryLockouts.get(cleanPhone);
        if (lockExpiry && lockExpiry > Date.now()) {
          isLocked = true;
          lockoutTTL = Math.round((lockExpiry - Date.now()) / 1000);
        }
      }

      if (isLocked) {
        const minutes = Math.ceil(lockoutTTL / 60);
        return res.status(403).json({ error: `Too many failed attempts. Try again in ${minutes} minute(s).` });
      }

      // Check Rate Limit (1 OTP per 60 seconds)
      let rateLimited = false;
      if (redisClient) {
        const rateVal = await redisClient.get(`otpratelimit:${cleanPhone}`);
        if (rateVal) {
          rateLimited = true;
        }
      } else {
        const lastSentTime = memoryLastSent.get(cleanPhone);
        if (lastSentTime && lastSentTime > Date.now() - 60 * 1000) {
          rateLimited = true;
        }
      }

      if (rateLimited) {
        return res.status(429).json({ error: 'Please wait 60 seconds before requesting another OTP.' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);

      // Phase 3 — Verify insertion into Otp table
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      try {
        await prisma.otp.upsert({
          where: { phone: cleanPhone },
          update: { otpHash: hashedOtp, expiresAt, createdAt: new Date() },
          create: { phone: cleanPhone, otpHash: hashedOtp, expiresAt, createdAt: new Date() }
        });
      } catch (dbErr) {
        logger.error('Failed to insert OTP into database: %O', dbErr);
        return res.status(500).json({ success: false, error: 'Database verification failed. OTP not generated.' });
      }

      // Store in memory rate limits or Redis
      if (redisClient) {
        await redisClient.setEx(`otp:${cleanPhone}`, 300, hashedOtp);
        await redisClient.setEx(`otpratelimit:${cleanPhone}`, 60, '1');
      } else {
        memoryLastSent.set(cleanPhone, Date.now());
      }

      // Deliver OTP via SMS Service
      let smsResult = null;
      let smsError = null;
      try {
        smsResult = await SmsService.sendOtp(cleanPhone, otp);
      } catch (smsErr) {
        logger.error('SMS Service delivery crashed: %O', smsErr);
        smsError = smsErr.message || 'SMS provider delivery exception.';
      }

      // Log precisely as requested in Phase 1
      const apiKey = process.env.NXTBYTE_API_KEY || '1775873dbab74f10bebf';
      const message = `Your Dizipay OTP is ${otp}. Valid for 5 minutes. Do not share.`;
      const url = `https://nxtbyte.in/api/send-text?api_key=${apiKey}&number=91${cleanPhone}&msg=${encodeURIComponent(message)}`;
      console.log("OTP Request Phone:", cleanPhone);
      console.log("Generated OTP:", otp);
      console.log("NXTBYTE API KEY:", process.env.NXTBYTE_API_KEY);
      console.log("NXTBYTE URL:", url);
      console.log("NXTBYTE RESPONSE:", smsResult || smsError);

      if (!process.env.NXTBYTE_API_KEY && process.env.NODE_ENV === 'development') {
        console.log("NXTBYTE API KEY NOT CONFIGURED");
        console.log("Phone:", cleanPhone);
        console.log("OTP:", otp);
        console.log("Generated URL:", url);
        console.log("Provider Response:", smsResult);
        console.log("Provider Error:", smsError);
      }
      const isSmsSuccess = !smsError && smsResult && (
        smsResult.status === 'success' ||
        smsResult.success === true ||
        smsResult.error === false ||
        String(smsResult.message || '').toLowerCase().includes('success') ||
        (smsResult.status && String(smsResult.status).toLowerCase().includes('success'))
      );

      if (!isSmsSuccess) {
        // Phase 2 — DEVELOPMENT OTP MODE
        if (process.env.NODE_ENV === 'development') {
          const debugOtp = "123456";
          try {
            const debugHash = await bcrypt.hash(debugOtp, 10);
            await prisma.otp.upsert({
              where: { phone: cleanPhone },
              update: { otpHash: debugHash, expiresAt, createdAt: new Date() },
              create: { phone: cleanPhone, otpHash: debugHash, expiresAt, createdAt: new Date() }
            });
            if (redisClient) {
              await redisClient.setEx(`otp:${cleanPhone}`, 300, debugHash);
            }
          } catch (dbErr) {
            logger.error('Failed to update debug OTP in DB: %O', dbErr);
          }

          return res.status(200).json({
            success: true,
            providerBlocked: true,
            debugOtp: debugOtp,
            message: "Development OTP Mode Enabled"
          });
        }

                return res.status(400).json({
          success: false,
          message: 'Unable to send verification code. Please try again later.'
        });
      }

      const responseObj = { success: true };
      if (process.env.NODE_ENV === 'development') {
        responseObj.debugOtp = otp;
      }

      return res.status(200).json(responseObj);
    } catch (error) {
      logger.error('Failed to send OTP: %O', error);
      return res.status(500).json({ error: 'Internal failure processing OTP request.' });
    }
  }

  static async verifyOtp(req, res) {
    try {
      const { phone, otp } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({ error: 'Phone number and OTP are required.' });
      }

      const cleanPhone = phone.trim();
      const cleanOtp = otp.trim();

      // Check Lockout state
      let isLocked = false;
      let lockoutTTL = 0;
      if (redisClient) {
        const lockVal = await redisClient.get(`lockout:${cleanPhone}`);
        if (lockVal) {
          isLocked = true;
          lockoutTTL = await redisClient.ttl(`lockout:${cleanPhone}`);
        }
      } else {
        const lockExpiry = memoryLockouts.get(cleanPhone);
        if (lockExpiry && lockExpiry > Date.now()) {
          isLocked = true;
          lockoutTTL = Math.round((lockExpiry - Date.now()) / 1000);
        }
      }

      if (isLocked) {
        const minutes = Math.ceil(lockoutTTL / 60);
        return res.status(403).json({ error: `Too many failed attempts. Try again in ${minutes} minute(s).` });
      }

      // Retrieve stored OTP Hash
      let storedHash = null;
      if (redisClient) {
        storedHash = await redisClient.get(`otp:${cleanPhone}`);
      } else {
        const otpRecord = await prisma.otp.findUnique({
          where: { phone: cleanPhone }
        });
        if (otpRecord && otpRecord.expiresAt > new Date()) {
          storedHash = otpRecord.otpHash;
        }
      }

      if (!storedHash) {
        return res.status(400).json({ error: 'OTP has expired or is invalid.' });
      }

      // Verify OTP
      const isMatch = await bcrypt.compare(cleanOtp, storedHash);
      if (!isMatch) {
        // Increment failed attempts
        let failedCount = 0;
        if (redisClient) {
          failedCount = await redisClient.incr(`failedattempts:${cleanPhone}`);
          if (failedCount === 1) {
            await redisClient.expire(`failedattempts:${cleanPhone}`, 15 * 60);
          }
          if (failedCount >= 5) {
            await redisClient.setEx(`lockout:${cleanPhone}`, 15 * 60, '1');
            await redisClient.del(`failedattempts:${cleanPhone}`);
          }
        } else {
          const currentCount = (memoryFailedAttempts.get(cleanPhone) || 0) + 1;
          memoryFailedAttempts.set(cleanPhone, currentCount);
          failedCount = currentCount;
          if (currentCount >= 5) {
            memoryLockouts.set(cleanPhone, Date.now() + 15 * 60 * 1000);
            memoryFailedAttempts.delete(cleanPhone);
          }
        }

        const remaining = Math.max(0, 5 - failedCount);
        if (remaining === 0) {
          return res.status(403).json({ error: 'Too many failed attempts. Account locked for 15 minutes.' });
        }
        return res.status(400).json({ error: `Invalid OTP. ${remaining} attempt(s) remaining.` });
      }

      // Successful verification: delete OTP record and reset failed count
      await prisma.otp.delete({ where: { phone: cleanPhone } }).catch(() => {});
      if (redisClient) {
        await redisClient.del(`otp:${cleanPhone}`);
        await redisClient.del(`failedattempts:${cleanPhone}`);
      } else {
        memoryFailedAttempts.delete(cleanPhone);
        memoryLockouts.delete(cleanPhone);
      }

      // Find user
      let user = await prisma.user.findFirst({
        where: { phone: cleanPhone, deletedAt: null },
        include: { role: true, organization: true }
      });

      let isNewUser = false;
      if (!user) {
        isNewUser = true;
        // Auto User Creation (Phase 8)
        const placeholderEmail = `${cleanPhone}@dizipay.in`;
        const tenantId = `tenant_${Math.random().toString(36).substring(2, 9)}`;

        // Create organization
        const org = await prisma.organization.create({
          data: {
            name: `${cleanPhone}'s Workspace`,
            tenantId,
            status: 'ACTIVE'
          }
        });

        user = await prisma.user.create({
          data: {
            name: `User ${cleanPhone}`,
            phone: cleanPhone,
            phoneVerified: true,
            email: placeholderEmail,
            roleId: 4, // Client User
            organizationId: org.id,
            status: 'ACTIVE',
            verified: true,
            kycStatus: 'PENDING_KYC',
            kycLevel: 'PENDING_KYC',
            panVerified: false,
            aadhaarVerified: false
          },
          include: { role: true, organization: true }
        });

        // Initialize Wallet with ₹0 balance
        await prisma.wallet.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            balance: 0.0000,
            currency: 'INR'
          }
        });

        // Log register action in audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            action: 'USER_REGISTERED_PHONE',
            entityName: 'users',
            entityId: user.id.toString(),
            newValues: { phone: cleanPhone, organization: org.name }
          }
        });

        // Send Welcome email in background
        EmailService.sendWelcomeEmail(placeholderEmail, cleanPhone).catch(err => {
          logger.error('Failed to send welcome email: %O', err);
        });
      }

      // Update lastLogin, lastIp, lastIp in database
      const requestIp = req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress);
      let cleanIp = Array.isArray(requestIp) ? requestIp[0] : requestIp;
      if (cleanIp && cleanIp.includes(',')) {
        cleanIp = cleanIp.split(',')[0].trim();
      }
      if (cleanIp && cleanIp.startsWith('::ffff:')) {
        cleanIp = cleanIp.substring(7);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          lastIp: cleanIp,
          phoneVerified: true
        }
      });

      // Write Login action to AuditLog
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          action: 'USER_LOGIN_OTP',
          entityName: 'users',
          entityId: user.id.toString(),
          newValues: { loginType: 'OTP', phone: cleanPhone, ip: cleanIp }
        }
      });

      // Generate Tokens
      const { accessToken, refreshToken } = generateTokens(user);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken }
      });

      return res.status(200).json({
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role ? user.role.name : 'Client User',
          organization: user.organization ? { id: user.organization.id, name: user.organization.name, tenantId: user.organization.tenantId } : null,
          kycStatus: user.kycStatus,
          kycLevel: user.kycLevel,
          panVerified: user.panVerified,
          aadhaarVerified: user.aadhaarVerified,
          aadhaarName: user.aadhaarName || '',
          aadhaarDob: user.aadhaarDob || '',
          aadhaarGender: user.aadhaarGender || '',
          aadhaarFatherName: user.aadhaarFatherName || '',
          aadhaarAddress: user.aadhaarAddress || '',
          aadhaarDistrict: user.aadhaarDistrict || '',
          aadhaarState: user.aadhaarState || '',
          aadhaarPincode: user.aadhaarPincode || '',
          aadhaarVillage: user.aadhaarVillage || '',
          aadhaarCountry: user.aadhaarCountry || '',
          aadhaarPhotoUrl: user.aadhaarPhotoUrl || '',
          phoneNumber: user.phoneNumber || '',
          kycApprovedAt: user.kycApprovedAt || null
        }
      });
    } catch (error) {
      logger.error('OTP validation failed: %O', error);
      return res.status(500).json({ error: 'Internal failure verifying OTP.' });
    }
  }

  static async logout(req, res) {
    try {
      const { id } = req.user;
      await prisma.user.update({
        where: { id },
        data: { refreshToken: null }
      });
      return res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (error) {
      logger.error('Logout error: %O', error);
      return res.status(500).json({ error: 'Logout internal failure.' });
    }
  }

  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required.' });
      }

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired refresh token.' });
      }

      const user = await prisma.user.findFirst({
        where: { id: decoded.id, refreshToken, deletedAt: null }
      });

      if (!user) {
        return res.status(401).json({ error: 'Refresh token is active but user mismatch.' });
      }

      const tokens = generateTokens(user);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken }
      });

      return res.status(200).json({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
    } catch (error) {
      logger.error('Refresh token error: %O', error);
      return res.status(500).json({ error: 'Internal token renewal error.' });
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await prisma.user.findFirst({
        where: { email, deletedAt: null }
      });
      if (!user) {
        return res.status(404).json({ error: 'User with this email does not exist.' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour expiration

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetExpires }
      });

      // Send Password Reset email via Resend
      try {
        await EmailService.sendPasswordReset(email, resetToken);
      } catch (err) {
        logger.error('Failed to send password reset email via Resend: %O', err);
      }

      logger.info(`Password reset requested for ${email}. Token: ${resetToken}`);
      return res.status(200).json({
        success: true,
        message: 'Password reset instructions have been logged. Use token for resets.',
        token: resetToken
      });
    } catch (error) {
      logger.error('Forgot password error: %O', error);
      return res.status(500).json({ error: 'Internal failure processing password reset request.' });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required.' });
      }

      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetExpires: { gt: new Date() },
          deletedAt: null
        }
      });

      if (!user) {
        return res.status(400).json({ error: 'Reset token is invalid or has expired.' });
      }

      // Explicitly hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetExpires: null
        }
      });

      return res.status(200).json({ success: true, message: 'Password has been reset successfully.' });
    } catch (error) {
      logger.error('Reset password error: %O', error);
      return res.status(500).json({ error: 'Failed to reset password.' });
    }
  }
}

module.exports = AuthController;
