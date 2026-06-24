const express = require('express');
const router = express.Router();
const ApiKeyController = require('../controllers/apiKeyController');
const { authenticateJWT } = require('../middleware/auth');
const requireKycApproved = require('../middleware/requireKycApproved');

router.use(authenticateJWT);
router.use(requireKycApproved);

router.get('/', ApiKeyController.list);
router.post('/', ApiKeyController.create);
router.post('/:id/regenerate', ApiKeyController.regenerate);
router.delete('/:id', ApiKeyController.revoke);

module.exports = router;
