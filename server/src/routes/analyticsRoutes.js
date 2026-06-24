const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const { authenticateJWT } = require('../middleware/auth');
const requireKycApproved = require('../middleware/requireKycApproved');

router.use(authenticateJWT);
router.use(requireKycApproved);

router.get('/dashboard', AnalyticsController.getUsageStats);
router.get('/system-overview', AnalyticsController.getSystemUsageStatsAdmin);

module.exports = router;
