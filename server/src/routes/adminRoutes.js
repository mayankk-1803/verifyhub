const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const SupportController = require('../controllers/supportController');
const { authenticateJWT, requireRole } = require('../middleware/auth');

router.use(authenticateJWT);
router.use(requireRole(['Super Admin', 'Admin']));

router.get('/users', AdminController.listUsers);
router.get('/users/:id', AdminController.getUserDetail);
router.post('/users', AdminController.createUser);
router.delete('/users/:id', AdminController.deleteUser);
router.put('/users/:id/status', AdminController.updateUserStatus);
router.patch('/users/:id/phone', AdminController.updateUserPhone);
router.post('/users/:id/reset-password', AdminController.resetUserPassword);
router.post('/users/:id/reset-otp', AdminController.resetUserOtp);
router.post('/users/:id/services/:serviceId/activate', AdminController.activateUserService);
router.post('/users/:id/services/:serviceId/deactivate', AdminController.deactivateUserService);
router.post('/users/:id/services/:serviceId/extend', AdminController.extendUserService);

router.get('/organizations', AdminController.listOrganizations);
router.get('/requests', AdminController.listVerificationRequests);
router.get('/routing', AdminController.getProvidersAndRoutes);
router.put('/routing/:id', AdminController.updateProviderRoute);
router.put('/pricing/:id', AdminController.updatePricingRule);
router.post('/wallet/adjust', AdminController.adjustWallet);
router.get('/services', AdminController.listServices);
router.put('/services/:id', AdminController.updateService);
router.get('/pricing', AdminController.listPricingRules);
router.get('/audit', AdminController.listAuditLogs);
router.get('/subscriptions', AdminController.listSubscriptions);
router.get('/api-keys', AdminController.listApiKeys);
router.get('/settings', AdminController.listSystemSettings);
router.put('/settings/:key', AdminController.updateSystemSetting);

// Tickets management
router.get('/tickets', SupportController.adminList);
router.put('/tickets/:id/status', SupportController.updateStatus);

// KYC management
router.get('/kyc', AdminController.listKycRequests);
router.get('/kyc/:userId', AdminController.getKycRequestDetail);
router.post('/kyc/:userId/approve', AdminController.approveKyc);
router.post('/kyc/:userId/reject', AdminController.rejectKyc);
router.post('/kyc/:userId/suspend', AdminController.suspendKyc);
router.post('/kyc/:userId/reverify', AdminController.reverifyKyc);

module.exports = router;
