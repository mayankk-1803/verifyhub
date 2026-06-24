const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const KycController = require('../controllers/kycController');
const { authenticateJWT } = require('../middleware/auth');

router.use(authenticateJWT);

// Create standard sliding window rate-limiter builder (5 attempts per hour per User/IP)
const createKycLimiter = (keyPrefix) => rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => req.user ? `${keyPrefix}_${req.user.id}` : `${keyPrefix}_${req.ip}`,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many KYC attempts. Please try again later.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

const otpLimiter = createKycLimiter('otp_send');
const detailsLimiter = createKycLimiter('details_fetch');

router.post('/send-aadhaar-otp', otpLimiter, KycController.sendAadhaarOtp);
router.post('/fetch-aadhaar-details', detailsLimiter, KycController.fetchAadhaarDetails);
router.post('/retry', KycController.retryKyc);
router.get('/status', KycController.getKycStatus);

// Deprecated PAN KYC endpoints (return 410 Gone)
const goneHandler = (req, res) => res.status(410).json({ success: false, message: 'PAN KYC flow has been deprecated' });
router.post('/verify-pan', goneHandler);
router.post('/verify-aadhaar', goneHandler);
router.post('/pan-match', goneHandler);

module.exports = router;

