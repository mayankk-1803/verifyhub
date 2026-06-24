const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/walletController');
const { authenticateJWT } = require('../middleware/auth');
const requireKycApproved = require('../middleware/requireKycApproved');

router.use(authenticateJWT);
router.use(requireKycApproved);

const handleLockdown = (req, res) => {
  return res.status(503).json({
    success: false,
    message: "Wallet recharge is temporarily unavailable"
  });
};

router.get('/balance', WalletController.getBalance);
router.get('/transactions', WalletController.listTransactions);
router.post('/recharge', handleLockdown);
router.post('/recharge/confirm', handleLockdown);
router.post('/add-money', handleLockdown);
router.post('/create-order', handleLockdown);
router.post('/confirm', handleLockdown);
router.get('/invoices', WalletController.listInvoices);

module.exports = router;
