const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const KycCache = require('../utils/kycCache');

class AdminController {
  static async listUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const search = req.query.search ? String(req.query.search).trim() : '';
      const sortBy = req.query.sortBy || 'newest';

      const where = {
        deletedAt: null,
      };

      if (search) {
        const searchUpper = search.toUpperCase();
        const orConditions = [
          { name: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
          { role: { name: { contains: search } } }
        ];

        // Safely check for enum status matching
        const matchingStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'].filter(s => s.includes(searchUpper));
        if (matchingStatuses.length > 0) {
          orConditions.push({ status: { in: matchingStatuses } });
        }
        where.OR = orConditions;
      }

      let orderBy = { id: 'desc' };
      if (sortBy === 'newest') {
        orderBy = { createdAt: 'desc' };
      } else if (sortBy === 'oldest') {
        orderBy = { createdAt: 'asc' };
      } else if (sortBy === 'lastLogin') {
        orderBy = { lastLogin: 'desc' };
      } else if (sortBy === 'walletBalance') {
        orderBy = { wallet: { balance: 'desc' } };
      }

      const total = await prisma.user.count({ where });

      const users = await prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          role: true,
          organization: true,
          wallet: {
            include: {
              transactions: {
                take: 10,
                orderBy: { createdAt: 'desc' }
              }
            }
          },
          apiKeys: {
            where: { deletedAt: null }
          },
          subscriptions: {
            include: {
              service: true
            }
          },
          verificationRequests: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          auditLogs: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          notifications: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          supportTickets: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          kycVerifications: true
        },
        orderBy
      });

      const formattedUsers = users.map(u => ({
        ...u,
        Role: u.role,
        Organization: u.organization,
        Wallet: u.wallet
      }));

      return res.status(200).json({
        success: true,
        users: formattedUsers,
        total,
        page,
        limit
      });
    } catch (error) {
      logger.error('Admin list users error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve user listing.' });
    }
  }

  static async createUser(req, res) {
    try {
      const { name, email, phone, password, role } = req.body;

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Name is required and must be at least 2 characters.' });
      }

      if (!email || !email.trim()) {
        return res.status(400).json({ error: 'Email address is required.' });
      }

      const cleanPhone = phone ? phone.trim() : '';
      if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
        return res.status(400).json({ error: 'Phone number is required and must be exactly 10 digits.' });
      }

      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password is required and must be at least 8 characters.' });
      }

      if (!role) {
        return res.status(400).json({ error: 'Role is required.' });
      }

      // Check unique email
      const existingEmail = await prisma.user.findFirst({
        where: { email: email.trim(), deletedAt: null }
      });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email is already in use.' });
      }

      // Check unique phone
      const existingPhone = await prisma.user.findFirst({
        where: { phone: cleanPhone, deletedAt: null }
      });
      if (existingPhone) {
        return res.status(400).json({ error: 'Phone number is already in use.' });
      }

      // Resolve role ID
      let roleId = 4; // default Client User
      if (role) {
        if (typeof role === 'number') {
          roleId = role;
        } else if (typeof role === 'string') {
          const rLower = role.toLowerCase();
          if (rLower.includes('super')) {
            roleId = 1;
          } else if (rLower.includes('admin')) {
            roleId = 2;
          } else if (rLower.includes('reseller')) {
            roleId = 3;
          } else {
            roleId = 4;
          }
        }
      }

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await prisma.$transaction(async (tx) => {
        // Create default organization for the user
        const tenantId = `tenant_${Math.random().toString(36).substring(2, 9)}`;
        const org = await tx.organization.create({
          data: {
            name: `${name || email?.split('@')[0] || phone}'s Workspace`,
            tenantId,
            status: 'ACTIVE'
          }
        });

        // Create User
        const user = await tx.user.create({
          data: {
            name: name || null,
            email: email || null,
            phone: phone || null,
            password: hashedPassword,
            roleId,
            organizationId: org.id,
            status: 'ACTIVE',
            verified: true,
            phoneVerified: phone ? true : false,
            kycStatus: 'PENDING_KYC',
            kycLevel: 'PENDING_KYC',
            panVerified: false,
            aadhaarVerified: false
          }
        });

        // Create Wallet
        await tx.wallet.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            balance: 0.0000,
            currency: 'INR'
          }
        });

        // Create Welcome Notification
        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'Welcome to Dizipay',
            message: 'Your account has been created by the administrator. Welcome to the platform!'
          }
        });

        // Create Audit Log
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            action: 'ADMIN_USER_CREATED',
            entityName: 'users',
            entityId: user.id.toString(),
            newValues: { name, email, phone, roleId }
          }
        });

        return user;
      });

      return res.status(201).json({
        success: true,
        message: 'User created successfully.',
        user: {
          id: result.id,
          name: result.name,
          email: result.email,
          phone: result.phone,
          roleId: result.roleId
        }
      });
    } catch (error) {
      logger.error('Admin create user error: %O', error);
      return res.status(500).json({ error: 'Failed to create user.' });
    }
  }

  static async deleteUser(req, res) {
    let failedDeleteStep = null;
    const runDeleteStep = async (stepName, fn) => {
      failedDeleteStep = stepName;
      console.log(`DELETE STEP ${stepName}`);
      return fn();
    };

    try {
      const { id } = req.params;
      const { confirmation } = req.body;
      const userId = parseInt(id);

      if (confirmation !== 'DELETE USER') {
        return res.status(400).json({ error: 'Please confirm deletion by typing "DELETE USER".' });
      }

      if (userId === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete yourself.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      console.log('DELETE USER START');
      console.log('DELETE USER ID', user.id);

      await prisma.$transaction(async (tx) => {
        await runDeleteStep('webhooks', async () => {
          const webhooks = await tx.webhook.findMany({ where: { userId: user.id }, select: { id: true } });
          const webhookIds = webhooks.map(w => w.id);
          if (webhookIds.length > 0) {
            await tx.webhookDelivery.deleteMany({ where: { webhookId: { in: webhookIds } } });
            await tx.webhook.deleteMany({ where: { id: { in: webhookIds } } });
          }
        });

        await runDeleteStep('verification_responses', async () => {
          const requests = await tx.verificationRequest.findMany({ where: { userId: user.id }, select: { id: true } });
          const requestIds = requests.map(r => r.id);
          if (requestIds.length > 0) {
            await tx.verificationResponse.deleteMany({ where: { verificationRequestId: { in: requestIds } } });
          }
        });

        await runDeleteStep('verification_requests', async () => {
          await tx.verificationRequest.deleteMany({ where: { userId: user.id } });
        });

        await runDeleteStep('api_usage_analytics', async () => {
          await tx.apiUsageAnalytics.deleteMany({ where: { userId: user.id } });
        });

        await runDeleteStep('api_keys', async () => {
          await tx.apiKey.deleteMany({ where: { userId: user.id } });
        });

        await runDeleteStep('subscriptions', async () => {
          await tx.userServiceSubscription.deleteMany({ where: { userId: user.id } });
        });

        await runDeleteStep('notifications', async () => {
          await tx.notification.deleteMany({ where: { userId: user.id } });
        });

        await runDeleteStep('support_tickets', async () => {
          await tx.supportTicket.deleteMany({ where: { userId: user.id } });
        });

        await runDeleteStep('team_members', async () => {
          await tx.teamMember.deleteMany({ where: { userId: user.id } });
        });

        await runDeleteStep('invoices', async () => {
          await tx.invoice.deleteMany({ where: { userId: user.id } });
        });

        await runDeleteStep('payments', async () => {
          const wallet = await tx.wallet.findUnique({ where: { userId: user.id }, select: { id: true } });
          if (!wallet) return;
          const ledgers = await tx.walletLedger.findMany({ where: { walletId: wallet.id }, select: { id: true } });
          const ledgerIds = ledgers.map(l => l.id);
          if (ledgerIds.length > 0) {
            await tx.payment.deleteMany({ where: { walletTransactionId: { in: ledgerIds } } });
          }
        });

        await runDeleteStep('wallets', async () => {
          const wallet = await tx.wallet.findUnique({ where: { userId: user.id }, select: { id: true } });
          if (wallet) {
            await tx.walletLedger.deleteMany({ where: { walletId: wallet.id } });
            await tx.wallet.delete({ where: { id: wallet.id } });
          }
        });

        await runDeleteStep('pricing_rules', async () => {
          await tx.pricingRule.deleteMany({ where: { userId: user.id } });
        });

        await runDeleteStep('kyc', async () => {
          await tx.kycVerification.deleteMany({ where: { userId: user.id } });
        });

        await runDeleteStep('audit_logs', async () => {
          await tx.auditLog.deleteMany({ where: { userId: user.id } });
        });

        await runDeleteStep('organizations', async () => {
          const organizationId = user.organizationId;
          if (!organizationId) return;

          const otherMembers = await tx.user.count({
            where: {
              organizationId,
              id: { not: user.id }
            }
          });

          if (otherMembers === 0) {
            await tx.auditLog.deleteMany({ where: { organizationId } });
            await tx.team.deleteMany({ where: { organizationId } });
          }
        });

        await runDeleteStep('otps', async () => {
          if (user.phone) {
            await tx.otp.deleteMany({ where: { phone: user.phone } });
          }
        });

        await runDeleteStep('user', async () => {
          await tx.user.delete({ where: { id: user.id } });
        });
      });

      console.log('DELETE STEP complete');

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'ADMIN_USER_DELETED',
          entityName: 'users',
          entityId: id,
          newValues: { email: user.email, phone: user.phone }
        }
      });

      return res.status(200).json({ success: true, message: 'User and all related assets deleted successfully.' });
    } catch (error) {
      console.log('FAILED TABLE NAME', failedDeleteStep || 'unknown');
      logger.error('Admin delete user error: %O', error);
      if (error?.code === 'P2003') {
        return res.status(409).json({
          success: false,
          message: 'Unable to delete user. Related records still exist.'
        });
      }
      return res.status(500).json({ success: false, message: 'Unable to delete user. Related records still exist.' });
    }
  }


  static async listOrganizations(req, res) {
    try {
      const organizations = await prisma.organization.findMany({
        where: {
          deletedAt: null
        }
      });
      return res.status(200).json({ success: true, organizations });
    } catch (error) {
      logger.error('Admin list organizations error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve organizations.' });
    }
  }

  static async listVerificationRequests(req, res) {
    try {
      const requests = await prisma.verificationRequest.findMany({
        include: {
          response: true,
          user: {
            select: {
              id: true,
              email: true
            }
          },
          provider: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      const formattedRequests = requests.map(r => ({
        ...r,
        VerificationResponse: r.response,
        User: r.user,
        Provider: r.provider
      }));

      return res.status(200).json({ success: true, requests: formattedRequests });
    } catch (error) {
      logger.error('Admin list verification requests error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve verification audit ledger.' });
    }
  }

  static async getProvidersAndRoutes(req, res) {
    try {
      const providers = await prisma.provider.findMany();
      const routes = await prisma.providerRoute.findMany({
        include: {
          primaryProvider: true,
          backupProvider: true
        }
      });
      
      const routesResolved = routes.map((r) => {
        const primary = providers.find(p => p.id === r.primaryProviderId);
        const backup = providers.find(p => p.id === r.backupProviderId);
        return {
          id: r.id,
          serviceType: r.serviceType,
          primaryProviderId: r.primaryProviderId,
          primaryProviderName: primary ? primary.name : 'Unknown',
          backupProviderId: r.backupProviderId,
          backupProviderName: backup ? backup.name : 'None',
          activeStatus: r.activeStatus
        };
      });

      const pricingRules = await prisma.pricingRule.findMany({
        include: {
          role: true,
          user: {
            select: {
              id: true,
              email: true
            }
          }
        }
      });

      const formattedPricingRules = pricingRules.map(pr => ({
        ...pr,
        Role: pr.role,
        User: pr.user
      }));

      return res.status(200).json({
        success: true,
        providers,
        routes: routesResolved,
        pricingRules: formattedPricingRules
      });
    } catch (error) {
      logger.error('Admin get routes/providers error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve routing configuration.' });
    }
  }

  static async updateProviderRoute(req, res) {
    try {
      const { id } = req.params;
      const { primaryProviderId, backupProviderId, activeStatus } = req.body;

      const route = await prisma.providerRoute.findUnique({
        where: { id: parseInt(id) }
      });
      if (!route) {
        return res.status(404).json({ error: 'Provider route configuration not found.' });
      }

      const oldRoute = { ...route };

      const updatedRoute = await prisma.providerRoute.update({
        where: { id: route.id },
        data: {
          primaryProviderId: primaryProviderId !== undefined ? primaryProviderId : undefined,
          backupProviderId: backupProviderId !== undefined ? (backupProviderId || null) : undefined,
          activeStatus: activeStatus !== undefined ? activeStatus : undefined
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'PROVIDER_ROUTE_UPDATED',
          entityName: 'provider_routes',
          entityId: route.id.toString(),
          oldValues: oldRoute,
          newValues: updatedRoute
        }
      });

      logger.info(`Provider route for ${updatedRoute.serviceType} hot-swapped by Admin ID: ${req.user.id}`);
      return res.status(200).json({ success: true, route: updatedRoute });
    } catch (error) {
      logger.error('Admin update route error: %O', error);
      return res.status(500).json({ error: 'Failed to modify provider route configuration.' });
    }
  }

  static async updatePricingRule(req, res) {
    try {
      const { id } = req.params;
      const { providerCost, sellingPrice } = req.body;

      const rule = await prisma.pricingRule.findUnique({
        where: { id: parseInt(id) }
      });
      if (!rule) {
        return res.status(404).json({ error: 'Pricing rule not found.' });
      }

      const oldRule = { ...rule };

      const provCost = providerCost !== undefined ? parseFloat(providerCost) : parseFloat(rule.providerCost);
      const sellPrice = sellingPrice !== undefined ? parseFloat(sellingPrice) : parseFloat(rule.sellingPrice);
      const margin = sellPrice - provCost;

      const updatedRule = await prisma.pricingRule.update({
        where: { id: rule.id },
        data: {
          providerCost: provCost,
          sellingPrice: sellPrice,
          margin: margin
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'PRICING_RULE_UPDATED',
          entityName: 'pricing_rules',
          entityId: rule.id.toString(),
          oldValues: oldRule,
          newValues: updatedRule
        }
      });

      logger.info(`Pricing rule for ${updatedRule.serviceType} modified by Admin.`);
      return res.status(200).json({ success: true, rule: updatedRule });
    } catch (error) {
      logger.error('Admin update pricing rule error: %O', error);
      return res.status(500).json({ error: 'Failed to adjust pricing rules.' });
    }
  }

  static async adjustWallet(req, res) {
    try {
      const { userId, amount, type, description } = req.body;

      if (!userId || !amount || !type) {
        return res.status(400).json({ error: 'User ID, amount, and type (CREDIT/DEBIT) are required.' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const wallets = await tx.$queryRaw`SELECT id, balance FROM wallets WHERE user_id = ${parseInt(userId)} FOR UPDATE`;
        const walletRow = wallets[0];
        if (!walletRow) {
          throw new Error('WALLET_NOT_FOUND');
        }

        const valAmount = parseFloat(amount);
        const balanceBefore = parseFloat(walletRow.balance);
        let balanceAfter = balanceBefore;

        if (type === 'CREDIT') {
          balanceAfter += valAmount;
        } else if (type === 'DEBIT') {
          if (balanceBefore < valAmount) {
            throw new Error('INSUFFICIENT_BALANCE');
          }
          balanceAfter -= valAmount;
        } else {
          throw new Error('INVALID_TYPE');
        }

        await tx.wallet.update({
          where: { id: walletRow.id },
          data: { balance: balanceAfter }
        });

        await tx.walletLedger.create({
          data: {
            walletId: walletRow.id,
            type: 'ADJUSTMENT',
            amount: valAmount,
            balanceAfter,
            referenceId: `admin_${Math.random().toString(36).substring(2, 9)}`,
            referenceType: 'MANUAL_ADMIN_ADJUSTMENT',
            description: description || `Administrative manual ${type.toLowerCase()} adjustment`,
            status: 'COMPLETED'
          }
        });

        await tx.notification.create({
          data: {
            userId: parseInt(userId),
            title: 'Wallet Balance Adjusted',
            message: `Your wallet balance has been administratively adjusted (${type === 'CREDIT' ? 'Credited' : 'Debited'} ₹${valAmount.toFixed(2)}). New balance: ₹${balanceAfter.toFixed(2)}.`
          }
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            action: 'ADMIN_WALLET_ADJUSTMENT',
            entityName: 'wallets',
            entityId: walletRow.id.toString(),
            newValues: { userId: parseInt(userId), type, amount: valAmount, balanceAfter }
          }
        });

        return balanceAfter;
      });

      logger.info(`Admin manual adjustment completed for wallet. Type: ${type}, Amount: ₹${amount}`);
      return res.status(200).json({
        success: true,
        message: 'Wallet balance adjusted successfully.',
        balance: result
      });
    } catch (error) {
      logger.error('Admin wallet adjust error: %O', error);
      if (error.message === 'WALLET_NOT_FOUND') {
        return res.status(404).json({ error: 'Wallet not found for this user.' });
      }
      if (error.message === 'INSUFFICIENT_BALANCE') {
        return res.status(400).json({ error: 'Insufficient balance to perform administrative debit.' });
      }
      if (error.message === 'INVALID_TYPE') {
        return res.status(400).json({ error: 'Transaction type must be CREDIT or DEBIT.' });
      }
      return res.status(500).json({ error: 'Failed to adjust wallet balance.' });
    }
  }

  static async listAuditLogs(req, res) {
    try {
      const logs = await prisma.auditLog.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      const formattedLogs = logs.map(l => ({
        ...l,
        User: l.user
      }));

      return res.status(200).json({ success: true, logs: formattedLogs });
    } catch (error) {
      logger.error('Admin list audit logs error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve system audit trails.' });
    }
  }

  static async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) }
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const oldStatus = user.status;
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { status }
      });

      // Invalidate target user's KYC status cache & profile cache
      KycCache.invalidate(user.id);
      try {
        const ProfileController = require('./profileController');
        await ProfileController.invalidateCache(user.id);
      } catch (err) {
        logger.error('Failed to invalidate profile cache: %O', err);
      }

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'ADMIN_USER_STATUS_UPDATED',
          entityName: 'users',
          entityId: user.id.toString(),
          oldValues: { status: oldStatus },
          newValues: { status: updatedUser.status }
        }
      });

      return res.status(200).json({ success: true, user: updatedUser });
    } catch (error) {
      logger.error('Admin update user status error: %O', error);
      return res.status(500).json({ error: 'Failed to update user status.' });
    }
  }

  static async updateUserPhone(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const cleanPhone = String(req.body.phone || '').replace(/\D/g, '');

      if (!userId) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
      }

      if (!/^\d{10}$/.test(cleanPhone)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.deletedAt) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const existingPhone = await prisma.user.findFirst({
        where: {
          phone: cleanPhone,
          id: { not: userId },
          deletedAt: null
        }
      });

      if (existingPhone) {
        return res.status(409).json({ success: false, message: 'Phone number already exists' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          phone: cleanPhone,
          phoneNumber: cleanPhone,
          phoneVerified: true
        },
        select: {
          id: true,
          phone: true,
          phoneNumber: true,
          phoneVerified: true
        }
      });

      try {
        const ProfileController = require('./profileController');
        await ProfileController.invalidateCache(userId);
      } catch (err) {
        logger.error('Failed to invalidate profile cache: %O', err);
      }

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'ADMIN_USER_PHONE_UPDATED',
          entityName: 'users',
          entityId: String(userId),
          oldValues: { phone: user.phone },
          newValues: { phone: cleanPhone }
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Phone number updated successfully',
        user: updatedUser
      });
    } catch (error) {
      logger.error('Admin update user phone error: %O', error);
      return res.status(500).json({ success: false, message: 'Unable to update phone number' });
    }
  }

  static async resetUserPassword(req, res) {
    try {
      const { id } = req.params;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Password is required.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) }
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'ADMIN_USER_PASSWORD_RESET',
          entityName: 'users',
          entityId: user.id.toString()
        }
      });

      return res.status(200).json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
      logger.error('Admin reset password error: %O', error);
      return res.status(500).json({ error: 'Failed to reset user password.' });
    }
  }

  static async resetUserOtp(req, res) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) }
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      if (user.phone) {
        await prisma.otp.deleteMany({
          where: { phone: user.phone }
        });
      }

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'ADMIN_USER_OTP_RESET',
          entityName: 'users',
          entityId: user.id.toString()
        }
      });

      return res.status(200).json({ success: true, message: 'OTP limit blocks reset successfully.' });
    } catch (error) {
      logger.error('Admin reset OTP error: %O', error);
      return res.status(500).json({ error: 'Failed to reset user OTP.' });
    }
  }

  static async activateUserService(req, res) {
    try {
      const { id, serviceId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) }
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const service = await prisma.service.findUnique({
        where: { id: parseInt(serviceId) }
      });
      if (!service) {
        return res.status(404).json({ error: 'Service not found.' });
      }

      const subscription = await prisma.userServiceSubscription.upsert({
        where: {
          userId_serviceId: {
            userId: user.id,
            serviceId: service.id
          }
        },
        update: {
          status: 'ACTIVE',
          activatedAt: new Date()
        },
        create: {
          userId: user.id,
          serviceId: service.id,
          status: 'ACTIVE',
          purchaseAmount: 0.0000,
          activatedAt: new Date()
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'ADMIN_USER_SERVICE_ACTIVATED',
          entityName: 'user_service_subscriptions',
          entityId: subscription.id.toString(),
          newValues: { userId: user.id, serviceId: service.id, status: 'ACTIVE' }
        }
      });

      return res.status(200).json({ success: true, subscription });
    } catch (error) {
      logger.error('Admin activate service error: %O', error);
      return res.status(500).json({ error: 'Failed to activate service.' });
    }
  }

  static async deactivateUserService(req, res) {
    try {
      const { id, serviceId } = req.params;

      const subscription = await prisma.userServiceSubscription.findUnique({
        where: {
          userId_serviceId: {
            userId: parseInt(id),
            serviceId: parseInt(serviceId)
          }
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Service subscription not found.' });
      }

      const updatedSub = await prisma.userServiceSubscription.update({
        where: { id: subscription.id },
        data: { status: 'INACTIVE' }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'ADMIN_USER_SERVICE_DEACTIVATED',
          entityName: 'user_service_subscriptions',
          entityId: subscription.id.toString(),
          newValues: { status: 'INACTIVE' }
        }
      });

      return res.status(200).json({ success: true, subscription: updatedSub });
    } catch (error) {
      logger.error('Admin deactivate service error: %O', error);
      return res.status(500).json({ error: 'Failed to deactivate service.' });
    }
  }

  static async extendUserService(req, res) {
    try {
      const { id, serviceId } = req.params;
      const { days } = req.body;

      if (!days || isNaN(parseInt(days))) {
        return res.status(400).json({ error: 'Valid days extension value is required.' });
      }

      const subscription = await prisma.userServiceSubscription.findUnique({
        where: {
          userId_serviceId: {
            userId: parseInt(id),
            serviceId: parseInt(serviceId)
          }
        }
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Service subscription not found.' });
      }

      const currentExpiry = subscription.expiresAt ? new Date(subscription.expiresAt) : new Date();
      const extendedExpiry = new Date(currentExpiry.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

      const updatedSub = await prisma.userServiceSubscription.update({
        where: { id: subscription.id },
        data: { expiresAt: extendedExpiry }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'ADMIN_USER_SERVICE_EXTENDED',
          entityName: 'user_service_subscriptions',
          entityId: subscription.id.toString(),
          oldValues: { expiresAt: subscription.expiresAt },
          newValues: { expiresAt: extendedExpiry }
        }
      });

      return res.status(200).json({ success: true, subscription: updatedSub });
    } catch (error) {
      logger.error('Admin extend subscription error: %O', error);
      return res.status(500).json({ error: 'Failed to extend subscription.' });
    }
  }

  static async listServices(req, res) {
    try {
      const services = await prisma.service.findMany({
        where: { deletedAt: null },
        include: {
          subscriptions: true
        }
      });
      const formattedServices = services.map(svc => {
        const activeSubs = svc.subscriptions.filter(sub => sub.status === 'ACTIVE');
        const totalActivations = activeSubs.length;
        const activationRevenue = activeSubs.reduce((sum, sub) => sum + parseFloat(sub.purchaseAmount || 0), 0);
        
        return {
          id: svc.id,
          key: svc.key,
          name: svc.name,
          category: svc.category,
          method: svc.method,
          endpoint: svc.endpoint,
          description: svc.description,
          successRate: svc.successRate,
          latency: svc.latency,
          price: svc.price,
          activationFee: svc.activationFee,
          totalActivations,
          activationRevenue
        };
      });
      return res.status(200).json({ success: true, services: formattedServices });
    } catch (error) {
      logger.error('Admin list services error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve services.' });
    }
  }

  static async updateService(req, res) {
    try {
      const { id } = req.params;
      const { name, description, price, activationFee } = req.body;
      
      const service = await prisma.service.findUnique({
        where: { id: parseInt(id) }
      });
      if (!service) {
        return res.status(404).json({ error: 'Service not found.' });
      }

      const oldValues = {
        name: service.name,
        description: service.description,
        price: service.price,
        activationFee: service.activationFee
      };

      const updated = await prisma.service.update({
        where: { id: parseInt(id) },
        data: {
          name: name !== undefined ? name : service.name,
          description: description !== undefined ? description : service.description,
          price: price !== undefined ? price : service.price,
          activationFee: activationFee !== undefined ? parseFloat(activationFee) : service.activationFee
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId || null,
          action: 'ACTIVATION_FEE_UPDATED',
          entityName: 'services',
          entityId: id.toString(),
          oldValues,
          newValues: {
            name: updated.name,
            description: updated.description,
            price: updated.price,
            activationFee: updated.activationFee
          }
        }
      });

      return res.status(200).json({ success: true, service: updated });
    } catch (error) {
      logger.error('Admin update service error: %O', error);
      return res.status(500).json({ error: 'Failed to update service.' });
    }
  }

  static async listPricingRules(req, res) {
    try {
      const pricingRules = await prisma.pricingRule.findMany({
        include: {
          role: true,
          user: {
            select: {
              id: true,
              email: true
            }
          }
        }
      });
      const formattedPricingRules = pricingRules.map(pr => ({
        ...pr,
        Role: pr.role,
        User: pr.user
      }));
      return res.status(200).json({ success: true, pricingRules: formattedPricingRules });
    } catch (error) {
      logger.error('Admin list pricing rules error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve pricing rules.' });
    }
  }

  static async listSubscriptions(req, res) {
    try {
      const subscriptions = await prisma.userServiceSubscription.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true
            }
          },
          service: true
        },
        orderBy: { id: 'desc' }
      });
      return res.status(200).json({ success: true, subscriptions });
    } catch (error) {
      logger.error('Admin list subscriptions error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve subscriptions.' });
    }
  }

  static async listApiKeys(req, res) {
    try {
      const keys = await prisma.apiKey.findMany({
        where: { deletedAt: null },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: { id: 'desc' }
      });
      return res.status(200).json({ success: true, apiKeys: keys });
    } catch (error) {
      logger.error('Admin list api keys error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve API keys.' });
    }
  }

  static async listSystemSettings(req, res) {
    const defaultSettings = [
      { key: 'platform_name', value: 'Dizipay', description: 'Platform Name' },
      { key: 'support_email', value: 'support@dizipay.in', description: 'Support Email' },
      { key: 'support_phone', value: '+91 88888 88888', description: 'Support Phone' },
      { key: 'activation_fee_default', value: '49.00', description: 'Default Activation Fee' },
      { key: 'kyc_provider', value: 'webtechly', description: 'KYC Provider' },
      { key: 'maintenance_mode', value: 'false', description: 'Maintenance Mode' },
      { key: 'wallet_minimum_balance', value: '0.00', description: 'Minimum wallet balance required to query APIs' }
    ];

    try {
      let settings = [];
      try {
        settings = await prisma.systemSetting.findMany();
      } catch (dbErr) {
        logger.error('Failed to query system settings from DB: %O', dbErr);
      }

      // If empty or missing some default settings, seed them
      const mergedSettings = [...settings];
      for (const def of defaultSettings) {
        const exists = mergedSettings.some(s => s.key === def.key);
        if (!exists) {
          try {
            const newSetting = await prisma.systemSetting.upsert({
              where: { key: def.key },
              update: {},
              create: {
                key: def.key,
                value: def.value,
                description: def.description
              }
            });
            mergedSettings.push(newSetting);
          } catch (createErr) {
            logger.error(`Failed to seed setting ${def.key}: %O`, createErr);
            mergedSettings.push({ id: Math.floor(Math.random() * 1000) + 100, ...def });
          }
        }
      }

      return res.status(200).json({ success: true, settings: mergedSettings });
    } catch (error) {
      logger.error('Admin list settings error: %O', error);
      return res.status(200).json({ success: true, settings: defaultSettings });
    }
  }

  static async updateSystemSetting(req, res) {
    try {
      const { key } = req.params;
      const { value, description } = req.body;
      const setting = await prisma.systemSetting.upsert({
        where: { key },
        update: { value, description: description || undefined },
        create: { key, value, description: description || null }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'SYSTEM_SETTING_UPDATED',
          entityName: 'system_settings',
          entityId: setting.id.toString(),
          newValues: { key, value }
        }
      });

      return res.status(200).json({ success: true, setting });
    } catch (error) {
      logger.error('Admin update setting error: %O', error);
      return res.status(500).json({ error: 'Failed to update system setting.' });
    }
  }

  static async listKycRequests(req, res) {
    try {
      const { status, search, sortBy } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const where = { deletedAt: null };

      if (status) {
        const sUpper = status.toUpperCase();
        if (sUpper === 'PENDING') {
          where.kycStatus = 'PENDING_KYC';
        } else if (sUpper === 'APPROVED') {
          where.kycStatus = 'KYC_APPROVED';
        } else if (sUpper === 'REJECTED') {
          where.kycStatus = 'KYC_REJECTED';
        } else if (sUpper === 'SUSPENDED') {
          where.OR = [
            { kycStatus: 'KYC_SUSPENDED' },
            { status: 'SUSPENDED' }
          ];
        }
      }

      if (search) {
        const sTrim = search.trim();
        where.OR = [
          { name: { contains: sTrim } },
          { email: { contains: sTrim } },
          { phone: { contains: sTrim } },
          { panNumber: { contains: sTrim } }
        ];
      }

      let orderBy = { createdAt: 'desc' };
      if (sortBy) {
        const sortLower = sortBy.toLowerCase();
        if (sortLower === 'oldest') {
          orderBy = { createdAt: 'asc' };
        } else if (sortLower === 'approved') {
          orderBy = { kycApprovedAt: 'desc' };
        } else if (sortLower === 'rejected') {
          orderBy = { kycRejectedAt: 'desc' };
        } else if (sortLower === 'lastupdated' || sortLower === 'last_updated') {
          orderBy = { updatedAt: 'desc' };
        }
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          kycStatus: true,
          aadhaarVerified: true,
          aadhaarVerifiedAt: true,
          panVerified: true,
          panVerifiedAt: true,
          kycApprovedAt: true,
          kycRejectedAt: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy,
        skip,
        take: limit
      });

      // Calculate Metrics
      const totalRequests = await prisma.user.count({ where: { deletedAt: null } });
      const pendingCount = await prisma.user.count({ where: { kycStatus: 'PENDING_KYC', deletedAt: null } });
      const approvedCount = await prisma.user.count({ where: { kycStatus: 'KYC_APPROVED', deletedAt: null } });
      const rejectedCount = await prisma.user.count({ where: { kycStatus: 'KYC_REJECTED', deletedAt: null } });
      const totalProcessed = approvedCount + rejectedCount;
      const approvalRateVal = totalProcessed > 0 ? parseFloat(((approvedCount / totalProcessed) * 100).toFixed(2)) : 0;

      const metrics = {
        total: totalRequests,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        approvalRate: approvalRateVal
      };

      const totalMatching = await prisma.user.count({ where });

      return res.status(200).json({ 
        success: true, 
        users, 
        metrics,
        pagination: {
          total: totalMatching,
          page,
          limit,
          totalPages: Math.ceil(totalMatching / limit)
        }
      });
    } catch (error) {
      logger.error('Admin list KYC requests error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve KYC requests list.' });
    }
  }

  static async approveKyc(req, res) {
    try {
      const userId = parseInt(req.params.userId || req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
      }
      const { remarks } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.deletedAt) {
        return res.status(400).json({
          success: false,
          message: "Cannot modify deleted user"
        });
      }

      // Invalidate target user's KYC status cache & profile cache
      KycCache.invalidate(user.id);
      const ProfileController = require('./profileController');
      await ProfileController.invalidateCache(user.id);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            kycStatus: 'KYC_APPROVED',
            kycLevel: 'KYC_APPROVED',
            panVerified: true,
            aadhaarVerified: true,
            kycApprovedAt: new Date(),
            kycRemarks: remarks || 'Manually approved by Administrator'
          }
        });

        await tx.kycVerification.create({
          data: {
            userId: user.id,
            status: 'KYC_APPROVED',
            panNumber: user.panNumber || 'MANUAL',
            aadhaarMasked: user.aadhaarNumberMasked || 'MANUAL',
            applicationNumber: 'MANUAL',
            panResponse: { manual: true, adminId: req.user.id },
            aadhaarResponse: { manual: true, adminId: req.user.id }
          }
        });

        // Generate required notifications
        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'KYC Approved',
            message: `Your KYC verification request has been successfully approved! Full platform features have been unlocked.`
          }
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'Admin Approved KYC',
            message: `Your KYC has been manually approved by an administrator. Remarks: ${remarks || 'None'}`
          }
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            action: 'ADMIN_KYC_APPROVED',
            entityName: 'users',
            entityId: user.id.toString(),
            newValues: { 
              adminId: req.user.id,
              targetUserId: user.id, 
              action: 'ADMIN_KYC_APPROVED',
              reason: remarks || 'Manually approved by Administrator',
              ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
              userAgent: req.headers['user-agent'] || '',
              timestamp: new Date().toISOString()
            },
            ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
            userAgent: req.headers['user-agent'] || null
          }
        });
      });

      return res.status(200).json({ success: true, message: 'KYC manually approved.' });
    } catch (error) {
      logger.error('Admin approve KYC error: %O', error);
      return res.status(500).json({ error: 'Failed to manually approve KYC.' });
    }
  }

  static async rejectKyc(req, res) {
    try {
      const userId = parseInt(req.params.userId || req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
      }
      const { remarks } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.deletedAt) {
        return res.status(400).json({
          success: false,
          message: "Cannot modify deleted user"
        });
      }

      // Invalidate target user's KYC status cache & profile cache
      KycCache.invalidate(user.id);
      const ProfileController = require('./profileController');
      await ProfileController.invalidateCache(user.id);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            kycStatus: 'KYC_REJECTED',
            kycLevel: 'KYC_REJECTED',
            kycRejectedAt: new Date(),
            kycRemarks: remarks || 'Manually rejected by Administrator'
          }
        });

        await tx.kycVerification.create({
          data: {
            userId: user.id,
            status: 'KYC_REJECTED',
            panNumber: user.panNumber || 'MANUAL',
            aadhaarMasked: user.aadhaarNumberMasked || 'MANUAL',
            applicationNumber: 'MANUAL',
            panResponse: { manual: true, adminId: req.user.id },
            aadhaarResponse: { manual: true, adminId: req.user.id }
          }
        });

        // Generate required notifications
        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'KYC Rejected',
            message: `Your KYC verification request was rejected. Reason: ${remarks || 'PAN and Aadhaar details do not match.'}`
          }
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'Admin Rejected KYC',
            message: `Your KYC has been manually rejected by an administrator. Remarks: ${remarks || 'None'}`
          }
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            action: 'ADMIN_KYC_REJECTED',
            entityName: 'users',
            entityId: user.id.toString(),
            newValues: { 
              adminId: req.user.id,
              targetUserId: user.id, 
              action: 'ADMIN_KYC_REJECTED',
              reason: remarks || 'Manually rejected by Administrator',
              ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
              userAgent: req.headers['user-agent'] || '',
              timestamp: new Date().toISOString()
            },
            ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
            userAgent: req.headers['user-agent'] || null
          }
        });
      });

      return res.status(200).json({ success: true, message: 'KYC manually rejected.' });
    } catch (error) {
      logger.error('Admin reject KYC error: %O', error);
      return res.status(500).json({ error: 'Failed to manually reject KYC.' });
    }
  }

  static async suspendKyc(req, res) {
    try {
      const userId = parseInt(req.params.userId || req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
      }
      const { remarks } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.deletedAt) {
        return res.status(400).json({
          success: false,
          message: "Cannot modify deleted user"
        });
      }

      // Invalidate target user's KYC status cache & profile cache
      KycCache.invalidate(user.id);
      const ProfileController = require('./profileController');
      await ProfileController.invalidateCache(user.id);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            kycStatus: 'KYC_SUSPENDED',
            status: 'SUSPENDED',
            kycRemarks: remarks || 'Manually suspended by Administrator'
          }
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'KYC Suspended',
            message: `Your KYC verification request was suspended. Reason: ${remarks || 'None'}`
          }
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            action: 'ADMIN_KYC_SUSPENDED',
            entityName: 'users',
            entityId: user.id.toString(),
            newValues: { 
              adminId: req.user.id,
              targetUserId: user.id, 
              action: 'ADMIN_KYC_SUSPENDED',
              reason: remarks || 'Manually suspended by Administrator',
              ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
              userAgent: req.headers['user-agent'] || '',
              timestamp: new Date().toISOString()
            },
            ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
            userAgent: req.headers['user-agent'] || null
          }
        });
      });

      return res.status(200).json({ success: true, message: 'KYC manually suspended.' });
    } catch (error) {
      logger.error('Admin suspend KYC error: %O', error);
      return res.status(500).json({ error: 'Failed to manually suspend KYC.' });
    }
  }

  static async reverifyKyc(req, res) {
    try {
      const userId = parseInt(req.params.userId || req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
      }
      const { remarks } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.deletedAt) {
        return res.status(400).json({
          success: false,
          message: "Cannot modify deleted user"
        });
      }

      // Invalidate target user's KYC status cache & profile cache
      KycCache.invalidate(user.id);
      const ProfileController = require('./profileController');
      await ProfileController.invalidateCache(user.id);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            kycStatus: 'PENDING_KYC',
            kycLevel: 'PENDING_KYC',
            panVerified: false,
            aadhaarVerified: false,
            kycRemarks: remarks || 'Reverification requested by Administrator'
          }
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: 'KYC Reverification Requested',
            message: `An administrator has requested you to reverify your identity. Remarks: ${remarks || 'None provided'}`
          }
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            organizationId: req.user.organizationId,
            action: 'ADMIN_KYC_REVERIFY',
            entityName: 'users',
            entityId: user.id.toString(),
            newValues: { 
              adminId: req.user.id,
              targetUserId: user.id, 
              action: 'ADMIN_KYC_REVERIFY',
              reason: remarks || 'Reverification requested by Administrator',
              ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
              userAgent: req.headers['user-agent'] || '',
              timestamp: new Date().toISOString()
            },
            ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
            userAgent: req.headers['user-agent'] || null
          }
        });
      });

      return res.status(200).json({ success: true, message: 'KYC manually reset for reverification.' });
    } catch (error) {
      logger.error('Admin reverify KYC error: %O', error);
      return res.status(500).json({ error: 'Failed to request reverification.' });
    }
  }

  static async getKycRequestDetail(req, res) {
    try {
      const userId = parseInt(req.params.userId || req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid User ID.' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId, deletedAt: null },
        include: {
          role: true,
          organization: true,
          wallet: true,
          kycVerifications: {
            orderBy: { createdAt: 'desc' }
          },
          auditLogs: {
            where: {
              action: {
                in: [
                  'USER_REGISTER', 'USER_REGISTERED', 'USER_REGISTERED_PHONE',
                  'USER_LOGIN', 'USER_LOGIN_PASSWORD', 'USER_LOGIN_OTP',
                  'AADHAAR_OTP_SEND', 'AADHAAR_VERIFIED', 'AADHAAR_DETAILS_FETCH',
                  'AADHAAR_MATCH', 'AADHAAR_VERIFY', 'KYC_APPROVED', 'ADMIN_KYC_APPROVED',
                  'KYC_REJECTED', 'ADMIN_KYC_REJECTED', 'ADMIN_KYC_SUSPENDED',
                  'ADMIN_KYC_REVERIFY', 'KYC_RETRY', 'KYC_STATUS_UPDATE'
                ]
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
          }
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Map audit logs to timeline
      const timeline = user.auditLogs.map(log => {
        let description = log.action.replace(/_/g, ' ');
        if (log.action === 'USER_REGISTER' || log.action === 'USER_REGISTERED' || log.action === 'USER_REGISTERED_PHONE') description = 'Account registered';
        else if (log.action === 'USER_LOGIN' || log.action === 'USER_LOGIN_PASSWORD' || log.action === 'USER_LOGIN_OTP') description = 'Logged into system';
        else if (log.action === 'AADHAAR_OTP_SEND') description = 'Aadhaar verification OTP sent';
        else if (log.action === 'AADHAAR_VERIFIED' || log.action === 'AADHAAR_DETAILS_FETCH' || log.action === 'AADHAAR_MATCH' || log.action === 'AADHAAR_VERIFY') description = 'Aadhaar details fetched and verified';
        else if (log.action === 'KYC_APPROVED' || log.action === 'ADMIN_KYC_APPROVED') description = `KYC Approved: ${log.newValues?.remarks || 'Self verified / Admin approved'}`;
        else if (log.action === 'KYC_REJECTED' || log.action === 'ADMIN_KYC_REJECTED') description = `KYC Rejected: ${log.newValues?.remarks || 'Self verified / Admin rejected'}`;
        else if (log.action === 'ADMIN_KYC_SUSPENDED') description = `KYC Suspended: ${log.newValues?.remarks || 'Admin suspended'}`;
        else if (log.action === 'ADMIN_KYC_REVERIFY') description = `KYC Reset/Reverify: ${log.newValues?.remarks || 'Admin requested reverification'}`;
        else if (log.action === 'KYC_RETRY') description = 'KYC retry request submitted';

        return {
          id: log.id,
          action: log.action,
          timestamp: log.createdAt,
          description,
          newValues: log.newValues?.remarks || log.newValues?.reason ? { remarks: log.newValues.remarks || log.newValues.reason } : null
        };
      });

      const response = {
        success: true,
        userProfile: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          status: user.status,
          verified: user.verified,
          role: user.role?.name || 'User',
          organization: user.organization?.name || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        aadhaarData: {
          aadhaarNumberMasked: user.aadhaarNumberMasked || null,
          aadhaarVerified: user.aadhaarVerified,
          aadhaarName: user.aadhaarName || null,
          aadhaarDob: user.aadhaarDob || null,
          aadhaarGender: user.aadhaarGender || null,
          aadhaarFatherName: user.aadhaarFatherName || null,
          aadhaarAddress: user.aadhaarAddress || null,
          aadhaarDistrict: user.aadhaarDistrict || null,
          aadhaarState: user.aadhaarState || null,
          aadhaarPincode: user.aadhaarPincode || null,
          aadhaarVillage: user.aadhaarVillage || null,
          aadhaarCountry: user.aadhaarCountry || null,
          aadhaarPhoto: user.aadhaarPhoto || null,
          aadhaarPhotoUrl: user.aadhaarPhotoUrl || null,
          aadhaarVerifiedAt: user.aadhaarVerifiedAt || null
        },
        panData: {
          panNumber: user.panNumber || null,
          panVerified: user.panVerified,
          panName: user.panName || null,
          dateOfBirth: user.dateOfBirth || null,
          panVerifiedAt: user.panVerifiedAt || null
        },
        phoneNumbers: {
          registered: user.phone || null,
          aadhaarAlternate: user.phoneNumber || null
        },
        address: user.aadhaarAddress || null,
        approvalHistory: user.kycVerifications,
        timeline,
        // Backward compatibility top-level fields
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        kycStatus: user.kycStatus,
        kycLevel: user.kycLevel,
        kycApprovedAt: user.kycApprovedAt,
        kycRejectedAt: user.kycRejectedAt,
        createdAt: user.createdAt,
        aadhaarName: user.aadhaarName || null,
        aadhaarNumberMasked: user.aadhaarNumberMasked || null,
        aadhaarFatherName: user.aadhaarFatherName || null,
        aadhaarDob: user.aadhaarDob || null,
        aadhaarGender: user.aadhaarGender || null,
        aadhaarAddress: user.aadhaarAddress || null,
        aadhaarDistrict: user.aadhaarDistrict || null,
        aadhaarState: user.aadhaarState || null,
        aadhaarPincode: user.aadhaarPincode || null,
        aadhaarVillage: user.aadhaarVillage || null,
        aadhaarCountry: user.aadhaarCountry || null,
        aadhaarPhoto: user.aadhaarPhoto || null,
        aadhaarPhotoUrl: user.aadhaarPhotoUrl || null,
        aadhaarVerifiedAt: user.aadhaarVerifiedAt || null,
        phoneNumber: user.phoneNumber || null,
        panNumber: user.panNumber || null,
        panName: user.panName || null,
        panVerifiedAt: user.panVerifiedAt || null
      };

      return res.status(200).json(response);
    } catch (error) {
      logger.error('Admin get KYC request detail error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve KYC request details.' });
    }
  }

  static async getUserDetail(req, res) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid User ID.' });
      }

      // Fetch user profile info, role, and organization in separate quick queries
      const user = await prisma.user.findUnique({
        where: { id, deletedAt: null },
        include: {
          role: true,
          organization: true,
          wallet: true
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Fetch active subscriptions
      const subscriptions = await prisma.userServiceSubscription.findMany({
        where: { userId: id },
        include: { service: true }
      });

      // Fetch active API keys
      const apiKeys = await prisma.apiKey.findMany({
        where: { userId: id, deletedAt: null }
      });

      // Fetch audit logs (limited to latest 100)
      const auditLogs = await prisma.auditLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      // Fetch support tickets
      const supportTickets = await prisma.supportTicket.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      // Fetch KYC verification history
      const kycVerifications = await prisma.kycVerification.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch verification requests (limited to latest 100)
      const verificationRequests = await prisma.verificationRequest.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      // Format response
      const formattedUser = {
        ...user,
        Role: user.role,
        Organization: user.organization,
        Wallet: user.wallet,
        subscriptions,
        apiKeys,
        auditLogs,
        supportTickets,
        kycVerifications,
        verificationRequests
      };

      return res.status(200).json({
        success: true,
        user: formattedUser
      });
    } catch (error) {
      logger.error('Admin getUserDetail error: %O', error);
      return res.status(500).json({ success: false, message: 'Failed to retrieve user details.' });
    }
  }
}

module.exports = AdminController;


