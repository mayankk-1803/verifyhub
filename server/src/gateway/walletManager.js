const prisma = require('../lib/prisma');
const logger = require('../config/logger');

class WalletManager {
  /**
   * Check if a user's wallet has sufficient funds.
   * @param {number} userId - The user ID
   * @param {number} amount - Cost of verification
   * @returns {Promise<object>} Returns wallet object if sufficient, throws error if insufficient
   */
  static async verifyBalance(userId, amount) {
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });
    if (!wallet) {
      throw new Error('Wallet not initialized for this user.');
    }

    if (parseFloat(wallet.balance) < parseFloat(amount)) {
      throw new Error(`Insufficient wallet balance. Required: ₹${parseFloat(amount).toFixed(2)}, Available: ₹${parseFloat(wallet.balance).toFixed(2)}`);
    }

    return wallet;
  }

  /**
   * Deduct funds from user's wallet and create a transaction log.
   * @param {number} userId - The user ID
   * @param {number} amount - Cost of verification
   * @param {object} metadata - Details like serviceType, requestId
   * @returns {Promise<object>} Returns { transaction, wallet }
   */
  static async deduct(userId, amount, metadata) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Locking the wallet row for update to prevent race conditions
        const wallets = await tx.$queryRaw`SELECT id, balance FROM wallets WHERE user_id = ${userId} FOR UPDATE`;
        const walletRow = wallets[0];
        if (!walletRow) {
          throw new Error('Wallet not found during debit operation.');
        }

        const balanceBefore = parseFloat(walletRow.balance);
        const reqAmount = parseFloat(amount);

        if (balanceBefore < reqAmount) {
          throw new Error('Insufficient wallet balance.');
        }

        const balanceAfter = balanceBefore - reqAmount;

        const wallet = await tx.wallet.update({
          where: { id: walletRow.id },
          data: { balance: balanceAfter }
        });

        const transaction = await tx.walletLedger.create({
          data: {
            walletId: walletRow.id,
            type: 'DEBIT',
            amount: reqAmount,
            balanceAfter: balanceAfter,
            referenceId: metadata.referenceId,
            referenceType: 'VERIFICATION',
            description: metadata.description || `Charge for ${metadata.serviceType} Verification`,
            status: 'COMPLETED'
          }
        });

        return { transaction, wallet };
      });

      logger.info(`Deducted ₹${amount} from Wallet ${result.wallet.id}. Balance: ₹${result.wallet.balance}`);
      return result;
    } catch (error) {
      logger.error(`Wallet deduction failed for user ${userId}: %O`, error);
      throw error;
    }
  }

  /**
   * Refund/reverse a previous transaction.
   * @param {number} userId - The user ID
   * @param {number} amount - Cost to reverse
   * @param {object} metadata - Details like serviceType, originalRequestId
   */
  static async refund(userId, amount, metadata) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const wallets = await tx.$queryRaw`SELECT id, balance FROM wallets WHERE user_id = ${userId} FOR UPDATE`;
        const walletRow = wallets[0];
        if (!walletRow) {
          throw new Error('Wallet not found during refund operation.');
        }

        const balanceBefore = parseFloat(walletRow.balance);
        const refAmount = parseFloat(amount);
        const balanceAfter = balanceBefore + refAmount;

        const wallet = await tx.wallet.update({
          where: { id: walletRow.id },
          data: { balance: balanceAfter }
        });

        const transaction = await tx.walletLedger.create({
          data: {
            walletId: walletRow.id,
            type: 'CREDIT',
            amount: refAmount,
            balanceAfter: balanceAfter,
            referenceId: metadata.referenceId,
            referenceType: 'REFUND',
            description: metadata.description || `Refund for failed ${metadata.serviceType} Verification`,
            status: 'COMPLETED'
          }
        });

        return { transaction, wallet };
      });

      logger.info(`Refunded ₹${amount} to Wallet ${result.wallet.id}. Balance: ₹${result.wallet.balance}`);
      return result;
    } catch (error) {
      logger.error(`Wallet refund failed for user ${userId}: %O`, error);
      throw error;
    }
  }
}

module.exports = WalletManager;
