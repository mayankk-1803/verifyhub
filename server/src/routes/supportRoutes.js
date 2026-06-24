const express = require('express');
const router = express.Router();
const SupportController = require('../controllers/supportController');
const { authenticateJWT } = require('../middleware/auth');

router.use(authenticateJWT);

router.post('/', SupportController.create);
router.get('/', SupportController.list);

module.exports = router;
