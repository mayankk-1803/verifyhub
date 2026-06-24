const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticateJWT } = require('../middleware/auth');
const requireKycApproved = require('../middleware/requireKycApproved');

router.use(authenticateJWT);
router.use(requireKycApproved);

router.get('/', serviceController.getServices);
router.post('/:id/activate', serviceController.activateService);

module.exports = router;
