const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const redis = require('redis');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dizipay_jwt_secret';

// Create Redis Client for high performance API Key caching and Rate Limiting
let redisClient;
(async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = redis.createClient({ url: redisUrl, socket: { reconnectStrategy: false } });
    redisClient.on('error', () => {});
    await redisClient.connect();
  } catch (error) {
    redisClient = null;
  }
})();

const hashKey = (rawKey) => {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};

const isAdminUser = (user) => {
  const roleName = user?.role?.name || user?.Role?.name || user?.role || '';
  const roleKey = String(roleName).toUpperCase().replace(/[\s-]+/g, '_');
  return Boolean(user?.isAdmin || roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN');
};

const gatewayAuth = async (req, res, next) => {
  try {
    const urlPath = req.originalUrl.split('?')[0];

    // Admin sandbox JWT check to bypass all API Key & validation logic
    let tokenString = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      tokenString = req.headers.authorization.split(' ')[1];
    }
    if (tokenString && !tokenString.startsWith('vh_live_')) {
      try {
        const decoded = jwt.verify(tokenString, JWT_SECRET);
        const user = await prisma.user.findFirst({
          where: { id: decoded.id, deletedAt: null },
          include: { role: true }
        });
        if (user) {
          const roleName = user.role?.name || user.Role?.name || '';
          const roleKey = String(roleName).toUpperCase().replace(/[\s-]+/g, '_');
          const isUserAdmin = user.isAdmin || roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN';
          if (isUserAdmin) {
            console.log("ADMIN SANDBOX BYPASS ACTIVE");
            logger.info("ADMIN SANDBOX BYPASS ACTIVE");
            req.user = user;
            req.role = roleName;
            req.apiKey = {
              id: null,
              name: 'Admin Sandbox Bypass Key',
              permissions: ['*'],
              rateLimit: 9999,
              usageLimit: null,
              usageCount: 0,
              ipWhitelist: []
            };
            req.organizationId = user.organizationId;
            return next();
          }
        }
      } catch (jwtErr) {
        // Fall through to API Key flow if JWT verification fails
      }
    }

    // 1. Resolve API Key from Headers (x-api-key or Authorization Bearer vh_live_...) or Query parameter
    let apiKeyString = req.headers['x-api-key'];
    
    if (!apiKeyString && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        apiKeyString = parts[1];
      }
    }

    if (!apiKeyString && req.query.api_key) {
      apiKeyString = req.query.api_key;
    }

    if (!apiKeyString && req.body && req.body.api_key) {
      apiKeyString = req.body.api_key;
    }

    if (!apiKeyString || !apiKeyString.startsWith('vh_live_')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'API key is missing or invalid. Use headers: x-api-key or Authorization Bearer vh_live_...' }
      });
    }

    const keyHash = hashKey(apiKeyString);
    let apiKey = null;

    // 2. Fetch API Key details (Check Redis Cache first, otherwise fallback to DB)
    const cacheKey = `apikey:${keyHash}`;
    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          apiKey = JSON.parse(cached);
        }
      } catch (err) {
        logger.error('Redis cache fetch error: %O', err);
      }
    }

    if (!apiKey) {
      const dbKey = await prisma.apiKey.findFirst({
        where: {
          keyHash,
          status: 'ACTIVE',
          deletedAt: null
        },
        include: {
          user: {
            include: {
              role: true
            }
          }
        }
      });

      if (!dbKey) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_API_KEY', message: 'The provided API key is revoked or does not exist.' }
        });
      }

      // Convert Decimal values etc. to JSON compatible format
      apiKey = JSON.parse(JSON.stringify(dbKey));

      // Write to Redis cache with 5 minute expiration
      if (redisClient) {
        try {
          await redisClient.setEx(cacheKey, 300, JSON.stringify(apiKey));
        } catch (err) {
          logger.error('Redis cache write error: %O', err);
        }
      }
    }

    // Map fields for backward compatibility with downstream code expecting Sequelize objects
    if (apiKey.user) {
      apiKey.User = apiKey.user;
      if (apiKey.user.role) {
        apiKey.user.Role = apiKey.user.role;
      }
    }

    // 3. Verify owner user status
    const user = apiKey.user;
    if (!user || user.status !== 'ACTIVE' || user.deletedAt !== null) {
      return res.status(403).json({
        success: false,
        error: { code: 'USER_SUSPENDED', message: 'The user account owning this API Key is inactive or suspended.' }
      });
    }

    const isUserAdmin = isAdminUser(user);
    if (isUserAdmin) {
      console.log("ADMIN SANDBOX BYPASS ACTIVE");
      logger.info("ADMIN SANDBOX BYPASS ACTIVE");
      req.apiKey = apiKey;
      req.user = user;
      req.role = user.role ? user.role.name : 'Client User';
      req.organizationId = apiKey.organizationId;
      return next();
    }

    if (!isUserAdmin && user.kycStatus !== 'KYC_APPROVED' && user.kycStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: "Complete KYC verification first"
      });
    }

    // 4. IP Whitelisting Check
    const net = require('net');
    const isGatewayOrVerifyRoute = urlPath.startsWith('/api/v1/gateway/') || urlPath.startsWith('/api/v1/verify/') || urlPath === '/api/v1/verify';

    if (isGatewayOrVerifyRoute && !isUserAdmin) {
      let requestIp = req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress);
      if (requestIp && requestIp.includes(',')) {
        requestIp = requestIp.split(',')[0].trim();
      }

      let cleanIp = requestIp;
      if (cleanIp && cleanIp.startsWith('::ffff:')) {
        cleanIp = cleanIp.substring(7);
      }

      let whitelist = apiKey.ipWhitelist;
      if (!whitelist || !Array.isArray(whitelist) || whitelist.length === 0) {
        whitelist = ["127.0.0.1"];
      }

      const validWhitelist = whitelist.filter(ip => {
        if (!ip || ip === '*' || ip === '0.0.0.0/0') return false;
        return net.isIP(ip) !== 0;
      });

      const finalWhitelist = validWhitelist.length > 0 ? validWhitelist : ["127.0.0.1"];

      const isAllowed = finalWhitelist.some(ip => {
        return cleanIp === ip || requestIp === ip;
      });

      if (!isAllowed) {
        logger.warn(`Unauthorized IP address access blocked: ${requestIp} for key ${apiKey.name}`);
        return res.status(403).json({
          success: false,
          message: "IP address not whitelisted"
        });
      }
    }

    // 5. Usage Limits Check
    if (apiKey.usageLimit && apiKey.usageCount >= apiKey.usageLimit) {
      return res.status(403).json({
        success: false,
        error: { code: 'USAGE_LIMIT_EXCEEDED', message: 'API key lifetime usage limit has been reached.' }
      });
    }

    // 6. Resolve Service Type and Check Subscription Lock
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
      const verifyIdx = pathParts.indexOf('verify');
      if (verifyIdx > 0) {
        serviceType = pathParts[verifyIdx - 1].toUpperCase().replace(/-/g, '_');
      } else {
        serviceType = (pathParts[3] || 'PAN_CARD').toUpperCase().replace(/-/g, '_');
      }
    }

    // Load Service definition
    const targetService = await prisma.service.findFirst({
      where: { key: serviceType, deletedAt: null }
    });

    if (!targetService) {
      return res.status(404).json({
        success: false,
        error: { code: 'SERVICE_NOT_FOUND', message: `Requested verification service ${serviceType} does not exist.` }
      });
    }

    // Check active User subscription for this specific service
    const activeSub = await prisma.userServiceSubscription.findUnique({
      where: {
        userId_serviceId: {
          userId: user.id,
          serviceId: targetService.id
        }
      }
    });

    if (!isUserAdmin && (!activeSub || activeSub.status !== 'ACTIVE')) {
      return res.status(403).json({
        success: false,
        message: "This service is not activated for your account"
      });
    }

    // 7. Permissions / Scope Check
    const requiredPermission = `${serviceType.toLowerCase()}:verify`;
    if (apiKey.permissions && Array.isArray(apiKey.permissions)) {
      const hasPermission = apiKey.permissions.includes('*') || apiKey.permissions.includes(requiredPermission);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN_SCOPE', message: `This API key does not have permissions for the scope: ${requiredPermission}` }
        });
      }
    }

    // 8. Redis / Memory Rate Limiting Check (limit per minute)
    const rateLimit = apiKey.rateLimit || 60;
    const rateKey = `ratelimit:${apiKey.id}:${Math.floor(Date.now() / 60000)}`;

    if (redisClient) {
      try {
        const count = await redisClient.incr(rateKey);
        if (count === 1) {
          await redisClient.expire(rateKey, 60);
        }
        if (count > rateLimit) {
          return res.status(429).json({
            success: false,
            error: { code: 'TOO_MANY_REQUESTS', message: `API Key rate limit of ${rateLimit} requests per minute exceeded.` }
          });
        }
      } catch (err) {
        logger.error('Redis rate limiter error: %O', err);
      }
    }

    // Increment DB counter asynchronously
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { usageCount: { increment: 1 } }
    }).catch(err => {
      logger.error('Failed to increment api key usage count: %O', err);
    });

    // Attach user and credential context for downstream routes
    req.apiKey = apiKey;
    req.user = user;
    req.role = user.role ? user.role.name : 'Client User';
    req.organizationId = apiKey.organizationId;

    next();
  } catch (error) {
    logger.error('Gateway Authentication failure: %O', error);
    return res.status(500).json({
      success: false,
      error: { code: 'GATEWAY_ERROR', message: 'An internal error occurred during key validation.' }
    });
  }
};

module.exports = gatewayAuth;
