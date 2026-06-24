const express = require('express');
const router = express.Router();
const WebhookController = require('../controllers/webhookController');
const { authenticateJWT } = require('../middleware/auth');
const requireKycApproved = require('../middleware/requireKycApproved');

router.use(authenticateJWT);
router.use(requireKycApproved);

router.get('/', WebhookController.list);
router.post('/', WebhookController.create);
router.delete('/:id', WebhookController.delete);
router.get('/:id/logs', WebhookController.getLogs);

module.exports = router;
