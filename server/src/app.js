// Phase 10: UPB / WebTechly API Hardening (Global fetch override)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const originalFetch = global.fetch;
const redactSensitiveValue = (value) => {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string') {
    return value
      .replace(/(api_key=)[^&\s]+/gi, '$1[REDACTED]')
      .replace(/(token=)[^&\s]+/gi, '$1[REDACTED]')
      .replace(/(authorization:\s*bearer\s+)[^\s,}]+/gi, '$1[REDACTED]');
  }
  if (Array.isArray(value)) return value.map(redactSensitiveValue);
  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, entry]) => {
      const keyLower = String(key).toLowerCase();
      acc[key] = keyLower.includes('authorization') || keyLower.includes('api_key') || keyLower.includes('apikey') || keyLower.includes('secret') || keyLower.includes('token')
        ? '[REDACTED]'
        : redactSensitiveValue(entry);
      return acc;
    }, {});
  }
  return value;
};

global.fetch = async (url, options = {}) => {
  const timeoutMs = options.timeout || 15000;
  const retries = options.retries !== undefined ? options.retries : 2;
  const delay = options.retryDelay || 1000;

  let lastError;
  let currentDelay = delay;

  let finalUrl = url;
  if (typeof url === 'string' && url.includes('server.webtechly.co.in')) {
    try {
      const parsedUrl = new URL(url);
      const apiKeyParam = parsedUrl.searchParams.get('api_key');
      if (!apiKeyParam || apiKeyParam === 'apikey' || apiKeyParam === 'apikey_here' || apiKeyParam === 'api_key_here' || apiKeyParam === 'upbgroup' || apiKeyParam === 'API_KEY_HERE' || apiKeyParam === '') {
        parsedUrl.searchParams.set('api_key', process.env.WEBTECHLY_API_KEY || '516a21-fa3547-a22fa5-8acabb-7bce85');
        finalUrl = parsedUrl.toString();
      }
    } catch (err) {
      // ignore
    }
  }

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const finalOptions = {
      ...options,
      signal: controller.signal
    };

    const provider = finalUrl.includes('server.webtechly.co.in') ? 'webtechly' : 'other';
    const endpoint = finalUrl.split('?')[0];
    const headers = redactSensitiveValue(finalOptions.headers || {});
    const payload = redactSensitiveValue(finalOptions.body || finalUrl.split('?')[1] || '');
    console.log("PROVIDER", provider);
    console.log("ENDPOINT", endpoint);
    console.log("HEADERS", headers);
    console.log("PAYLOAD", payload);

    try {
      const response = await originalFetch(finalUrl, finalOptions);
      clearTimeout(timeoutId);

      try {
        const clonedRes = response.clone();
        const text = await clonedRes.text();
        let json = text;
        try { json = JSON.parse(text); } catch (e) {}
        console.log("RESPONSE", json);
      } catch (err) {
        console.log("RESPONSE", "Failed to parse response body");
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      const isTimeoutOrNetwork = error.name === 'AbortError' || error.code === 'ECONNRESET' || error.message?.includes('network') || error.code === 'ETIMEDOUT';
      
      if (isTimeoutOrNetwork && attempt <= retries) {
        const logger = require('./config/logger');
        logger.warn(`Fetch to WebTechly/Provider URL failed (Attempt ${attempt}/${retries + 1}). Retrying in ${currentDelay}ms... Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= 2; // exponential backoff
        continue;
      }
      break;
    }
  }
  
  throw lastError;
};

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');

const logger = require('./config/logger');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const walletRoutes = require('./routes/walletRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const supportRoutes = require('./routes/supportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const kycRoutes = require('./routes/kycRoutes');
const profileRoutes = require('./routes/profileRoutes');

const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Set trust proxy for aaPanel / Nginx deployment
app.set("trust proxy", 1);

// Import extractUserLight middleware
const { extractUserLight } = require('./middleware/auth');

// Request logger middleware (only warnings/errors logged in production to prevent log spam)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`Incoming Request: ${req.method} ${req.url}`);
  }
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      logger.warn(`Response status: ${res.statusCode} for ${req.method} ${req.url}`);
    } else if (process.env.NODE_ENV !== 'production') {
      logger.info(`Response status: ${res.statusCode} for ${req.method} ${req.url}`);
    }
  });
  next();
});

// 1. Security Headers via Helmet
app.use(helmet());

// 2. Cross Origin Resource Sharing (CORS)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://auth.dizipay.in',
  'https://verifyhub.in',
  'https://authserver.dizipay.in'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('The CORS policy for this site does not allow access from the specified origin.'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS error'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Ensure uploads/ and uploads/aadhaar/ directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const aadhaarDir = path.join(uploadsDir, 'aadhaar');
const serverUploadsDir = path.join(__dirname, '..', 'uploads');
console.log("UPLOAD PATH:", path.join(process.cwd(), "uploads"));
console.log("PROCESS CWD:", process.cwd());
console.log("UPLOAD FALLBACK PATH:", serverUploadsDir);
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(aadhaarDir)) {
    fs.mkdirSync(aadhaarDir, { recursive: true });
  }
} catch (e) {
  logger.error('Failed to create upload directories: %O', e);
}

// 3. Request Parsers & Static Files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const setUploadCorsHeaders = (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
};

app.use('/uploads', setUploadCorsHeaders, express.static(uploadsDir));
if (serverUploadsDir !== uploadsDir) {
  app.use('/uploads', setUploadCorsHeaders, express.static(serverUploadsDir));
}

// Light user context extraction for bypass check in rate limiters
app.use(extractUserLight);

// Rate Limiters Configuration
// Rate Limiters Configuration
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    if (req.user) return true;
    return false;
  },
  handler: (req, res) => {
    console.log("RATE LIMIT HIT");
    console.log(`RATE LIMIT HIT: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again after 15 minutes.'
    });
  }
});

const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // 1. Admin and Super Admin bypass dashboard rate limiting
    if (req.user) {
      const roleName = req.user?.role?.name || req.user?.Role?.name || req.role || '';
      const roleKey = String(roleName).toUpperCase().replace(/[\s-]+/g, '_');
      const isAdmin = req.user?.isAdmin || roleKey === 'SUPER_ADMIN' || roleKey === 'ADMIN';
      if (isAdmin) return true;
    }

    // 2. Skip if request has a live API Key (starts with vh_live_)
    let apiKeyString = req.headers['x-api-key'] || req.headers['api-key'] || req.query.api_key;
    if (!apiKeyString && req.body && req.body.api_key) {
      apiKeyString = req.body.api_key;
    }
    if (!apiKeyString && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        apiKeyString = parts[1];
      }
    }
    if (apiKeyString && typeof apiKeyString === 'string' && apiKeyString.startsWith('vh_live_')) {
      return true;
    }

    const url = req.originalUrl || req.url || '';
    const dashboardReadPaths = [
      '/api/v1/dashboard',
      '/api/v1/analytics',
      '/api/v1/wallet',
      '/api/v1/api-keys',
      '/api/v1/keys',
      '/api/v1/notifications',
      '/api/v1/services',
      '/api/v1/support',
      '/api/v1/webhooks',
      '/api/v1/profile',
      '/api/v1/kyc/status'
    ];
    if (req.user && req.method === 'GET' && dashboardReadPaths.some(p => url.startsWith(p))) {
      return true;
    }

    const publicPaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/send-otp',
      '/api/v1/auth/verify-otp',
      '/api/v1/auth/forgot-password'
    ];
    if (publicPaths.some(p => url.includes(p))) return true;
    return false;
  },
  handler: (req, res) => {
    console.log("RATE LIMIT HIT");
    console.log(`RATE LIMIT HIT: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again after 15 minutes.'
    });
  }
});

// Apply rate limiters to matching routes
app.use('/api/v1/auth/login', publicLimiter);
app.use('/api/v1/auth/register', publicLimiter);
app.use('/api/v1/auth/send-otp', publicLimiter);
app.use('/api/v1/auth/verify-otp', publicLimiter);
app.use('/api/v1/auth/forgot-password', publicLimiter);

app.use('/api', authenticatedLimiter);

// 5. Mount OpenAPI / Swagger docs
try {
  // Generate openapi.json dynamically from services config
  require('./config/swaggerGenerator')();

  const swaggerFilePath = path.join(__dirname, '../../docs/openapi.json');
  if (fs.existsSync(swaggerFilePath)) {
    const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, 'utf8'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    logger.info('Swagger API documentation mounted at /docs');
  } else {
    logger.warn(`OpenAPI documentation file not found at: ${swaggerFilePath}`);
  }
} catch (error) {
  logger.error('Failed to parse and mount Swagger documentation: %O', error);
}

// 6. Mount REST API Routes
const { authenticateJWT } = require('./middleware/auth');
const requireKycApproved = require('./middleware/requireKycApproved');
const AnalyticsController = require('./controllers/analyticsController');

// Mounted via serviceRoutes below

app.get('/api/v1/docs', (req, res) => {
  try {
    const swaggerFilePath = path.join(__dirname, '../../docs/openapi.json');
    if (fs.existsSync(swaggerFilePath)) {
      const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, 'utf8'));
      res.status(200).json(swaggerDocument);
    } else {
      res.status(404).json({ error: 'Swagger OpenAPI specification file not found.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve OpenAPI specification.' });
  }
});

app.get('/api/v1/analytics', authenticateJWT, requireKycApproved, AnalyticsController.getUsageStats);
app.get('/api/v1/dashboard', authenticateJWT, requireKycApproved, AnalyticsController.getUsageStats);
app.use('/api/v1/api-keys', apiKeyRoutes);
app.get('/api/v1/wallet', authenticateJWT, requireKycApproved, async (req, res) => {
  const prisma = require('./lib/prisma');
  try {
    let wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId || null,
          balance: 0.0000,
          currency: 'INR'
        }
      });
    }
    res.status(200).json({ success: true, balance: parseFloat(wallet.balance), currency: wallet.currency });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve wallet info' });
  }
});

const lockRecharge = (req, res) => {
  return res.status(503).json({
    success: false,
    message: "Wallet recharge is temporarily unavailable"
  });
};

app.post('/wallet/recharge', lockRecharge);
app.post('/wallet/add-money', lockRecharge);
app.post('/wallet/create-order', lockRecharge);
app.post('/wallet/confirm', lockRecharge);
app.post('/api/v1/wallet/recharge', lockRecharge);
app.post('/api/v1/wallet/add-money', lockRecharge);
app.post('/api/v1/wallet/create-order', lockRecharge);
app.post('/api/v1/wallet/confirm', lockRecharge);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/keys', apiKeyRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Mount the API Gateway verification routes (PAN, GST, Aadhaar, Voter, Ration, etc.)
app.use('/api/v1', verificationRoutes);

// 7. General Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// 8. 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint route not found.' });
});

// 9. Centralized Error Handler Middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled request exception: %O', err);
  
  const status = err.status || err.statusCode || 500;
  
  // Suppress sensitive details. Show only generic safe messages.
  let message = "Something went wrong. Please try again.";
  
  const errStr = String(err.message || '').toLowerCase();
  
  if (errStr.includes('prisma') || errStr.includes('sql') || errStr.includes('database') || errStr.includes('query')) {
    message = "Unable to process request right now. Please try again later.";
  } else if (errStr.includes('econnrefused') || errStr.includes('timeout') || errStr.includes('network') || errStr.includes('connection')) {
    message = "Service temporarily unavailable. Please try again shortly.";
  } else if (errStr.includes('credential') || errStr.includes('api key') || errStr.includes('unauthorized') || errStr.includes('bearer')) {
    message = "Verification provider is temporarily unavailable. Please try again later.";
  } else if (err.status && err.status < 500 && err.message) {
    if (!err.message.includes('Prisma') && !err.message.includes('SQL') && !err.message.includes('/') && !err.message.includes('\\')) {
      message = err.message;
    }
  }

  return res.status(status).json({
    success: false,
    message: message
  });
});

module.exports = app;
