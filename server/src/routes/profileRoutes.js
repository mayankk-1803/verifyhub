const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const { authenticateJWT } = require('../middleware/auth');

router.get('/', authenticateJWT, ProfileController.getProfile);
router.patch('/', authenticateJWT, ProfileController.updateProfile);

module.exports = router;
