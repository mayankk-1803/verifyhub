const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const crypto = require('crypto');

class WalletController {
  static async getBalance(req, res) {
    try {
      let wallet = await prisma.wallet.findUnique({
        where: { userId: req.user.id }
      });

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

      return res.status(200).json({
        success: true,
        balance: parseFloat(wallet.balance),
        currency: wallet.currency
      });
    } catch (error) {
      logger.error('Get balance error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve wallet balance.' });
    }
  }

  static async listTransactions(req, res) {
    try {
      const transactions = await prisma.walletLedger.findMany({
        where: {
          wallet: {
            userId: req.user.id
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json({ success: true, transactions });
    } catch (error) {
      logger.error('List transactions error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve transactions.' });
    }
  }

  static async initiateRecharge(req, res) {
    try {
      const { amount } = req.body;
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Recharge amount must be greater than zero.' });
      }

      const mockOrderId = `order_${Math.random().toString(36).substring(2, 12)}`;
      
      // Store pending payment
      await prisma.payment.create({
        data: {
          amount: parseFloat(amount),
          razorpayOrderId: mockOrderId,
          status: 'PENDING'
        }
      });

      return res.status(200).json({
        success: true,
        orderId: mockOrderId,
        amount: parseFloat(amount),
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId123'
      });
    } catch (error) {
      logger.error('Initiate recharge error: %O', error);
      return res.status(500).json({ error: 'Failed to initialize payment order.' });
    }
  }

  static async confirmRecharge(req, res) {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ error: 'Order ID, Payment ID, and Signature are required to confirm recharge.' });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret123';
      const body = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ error: 'Invalid payment signature. Security check failed.' });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Find pending payment
        const payment = await tx.payment.findFirst({
          where: { razorpayOrderId: razorpayOrderId, status: 'PENDING' }
        });

        if (!payment) {
          throw new Error('PENDING_PAYMENT_NOT_FOUND');
        }

        // Lock wallet row for update
        const wallets = await tx.$queryRaw`SELECT id, balance FROM wallets WHERE user_id = ${req.user.id} FOR UPDATE`;
        const walletRow = wallets[0];
        if (!walletRow) {
          throw new Error('WALLET_NOT_FOUND');
        }

        const rechargeAmount = parseFloat(payment.amount);
        const balanceBefore = parseFloat(walletRow.balance);
        const balanceAfter = balanceBefore + rechargeAmount;

        // Update wallet balance
        await tx.wallet.update({
          where: { id: walletRow.id },
          data: {
            balance: balanceAfter,
            lastRechargedAt: new Date()
          }
        });

        // Create success transaction ledger entry
        const walletTx = await tx.walletLedger.create({
          data: {
            walletId: walletRow.id,
            type: 'CREDIT',
            amount: rechargeAmount,
            balanceAfter: balanceAfter,
            referenceId: razorpayPaymentId,
            referenceType: 'PAYMENT',
            description: `Wallet recharge via Razorpay`,
            status: 'COMPLETED'
          }
        });

        // Update payment record
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            walletTransactionId: walletTx.id,
            razorpayPaymentId: razorpayPaymentId,
            razorpaySignature: razorpaySignature || 'mock_sig_123',
            status: 'COMPLETED'
          }
        });

        // Generate invoice
        const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await tx.invoice.create({
          data: {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            paymentId: payment.id,
            invoiceNumber,
            amount: rechargeAmount,
            fileUrl: `https://authserver.dizipay.in/invoices/${invoiceNumber}.pdf`,
            billingDetails: {
              billingName: req.user.email,
              rechargedAt: new Date()
            }
          }
        });

        return balanceAfter;
      });

      logger.info(`Wallet recharge confirmed for user ${req.user.id}. Amount: ₹${req.body.amount || ''}. New balance: ₹${result}`);

      return res.status(200).json({
        success: true,
        message: 'Wallet recharge successfully processed.',
        balance: result
      });
    } catch (error) {
      logger.error('Confirm recharge error: %O', error);
      if (error.message === 'PENDING_PAYMENT_NOT_FOUND') {
        return res.status(404).json({ error: 'Pending transaction order not found or already verified.' });
      }
      if (error.message === 'WALLET_NOT_FOUND') {
        return res.status(404).json({ error: 'User wallet not found.' });
      }
      return res.status(500).json({ error: 'Recharge confirmation failed.' });
    }
  }

  static async listInvoices(req, res) {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json({ success: true, invoices });
    } catch (error) {
      logger.error('List invoices error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve invoices.' });
    }
  }
}

module.exports = WalletController;

