const prisma = require('../lib/prisma');
const logger = require('./logger');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const staticServices = require('./services');

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function seedDatabase() {
  try {
    logger.info('Prisma Seeding: Syncing Roles...');
    // 1. Seed Roles
    const rolesToCreate = [
      { id: 1, name: 'Super Admin', description: 'System-wide owner with complete permissions' },
      { id: 2, name: 'Admin', description: 'Internal staff manager' },
      { id: 3, name: 'Reseller', description: 'Can resell API credits under their tenant' },
      { id: 4, name: 'Client User', description: 'Standard API consumer client' }
    ];
    for (const r of rolesToCreate) {
      await prisma.role.upsert({
        where: { id: r.id },
        update: { name: r.name, description: r.description },
        create: r
      });
    }
    logger.info('Roles upserted successfully.');

    // 2. Seed Default Organization
    const defaultOrg = await prisma.organization.upsert({
      where: { tenantId: 'verifyhub_default' },
      update: { name: 'Dizipay Default Tenant', status: 'ACTIVE' },
      create: {
        tenantId: 'verifyhub_default',
        name: 'Dizipay Default Tenant',
        status: 'ACTIVE'
      }
    });
    logger.info(`Default Organization upserted (ID: ${defaultOrg.id}).`);

    // 3. Seed Default Users
    // Purge legacy admin safely (delete its associations first to avoid constraint errors)
    const legacyUser = await prisma.user.findUnique({ where: { email: 'admin@verifyhub.com' } });
    if (legacyUser) {
      await prisma.apiKey.deleteMany({ where: { userId: legacyUser.id } });
      await prisma.wallet.deleteMany({ where: { userId: legacyUser.id } });
      await prisma.userServiceSubscription.deleteMany({ where: { userId: legacyUser.id } });
      await prisma.user.delete({ where: { id: legacyUser.id } });
    }

    const adminPasswordHash = await bcrypt.hash('Admin@11200', 12);
    const clientPasswordHash = await bcrypt.hash('Client@123', 12);

    // Super Admin
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@dizipay.in' },
      update: {
        password: adminPasswordHash,
        roleId: 1,
        organizationId: defaultOrg.id,
        status: 'ACTIVE',
        verified: true
      },
      create: {
        email: 'admin@dizipay.in',
        password: adminPasswordHash,
        roleId: 1,
        organizationId: defaultOrg.id,
        status: 'ACTIVE',
        verified: true
      }
    });
    logger.info(`Super Admin user upserted: ${adminUser.email}`);

    // Client User
    const clientUser = await prisma.user.upsert({
      where: { email: 'client@verifyhub.com' },
      update: {
        password: clientPasswordHash,
        roleId: 4,
        organizationId: defaultOrg.id,
        status: 'ACTIVE',
        verified: true
      },
      create: {
        email: 'client@verifyhub.com',
        password: clientPasswordHash,
        roleId: 4,
        organizationId: defaultOrg.id,
        status: 'ACTIVE',
        verified: true
      }
    });
    logger.info(`Client user upserted: ${clientUser.email}`);

    // 4. Set up Client Wallet (default starting balance: ₹0.00)
    const wallet = await prisma.wallet.upsert({
      where: { userId: clientUser.id },
      update: {
        organizationId: defaultOrg.id,
        balance: 0.0000,
        currency: 'INR'
      },
      create: {
        userId: clientUser.id,
        organizationId: defaultOrg.id,
        balance: 0.0000,
        currency: 'INR'
      }
    });
    logger.info(`Client Wallet seeded (ID: ${wallet.id}, Balance: ₹${wallet.balance})`);

    // Set up Admin Wallet (default starting balance: ₹0.00)
    const adminWallet = await prisma.wallet.upsert({
      where: { userId: adminUser.id },
      update: {
        organizationId: defaultOrg.id,
        balance: 0.0000,
        currency: 'INR'
      },
      create: {
        userId: adminUser.id,
        organizationId: defaultOrg.id,
        balance: 0.0000,
        currency: 'INR'
      }
    });
    logger.info(`Admin Wallet seeded (ID: ${adminWallet.id}, Balance: ₹${adminWallet.balance})`);

    // 5. Seed Providers
    const providersToCreate = [
      { id: 1, name: 'Surepass APIs', code: 'surepass', activeStatus: true, apiBaseUrl: 'https://api.surepass.io', credentials: { apiKey: 'mock_surepass_secret_key' } },
      { id: 2, name: 'Signzy Kyc', code: 'signzy', activeStatus: true, apiBaseUrl: 'https://api.signzy.com', credentials: { username: 'mock_user', password: 'mock_password' } },
      { id: 3, name: 'Karza Data', code: 'karza', activeStatus: true, apiBaseUrl: 'https://api.karza.in', credentials: { authHeader: 'mock_karza_token' } },
      { id: 4, name: 'Digitap Verification', code: 'digitap', activeStatus: true, apiBaseUrl: 'https://api.digitap.ai', credentials: { clientId: 'mock_client', clientSecret: 'mock_secret' } }
    ];
    for (const p of providersToCreate) {
      await prisma.provider.upsert({
        where: { code: p.code },
        update: { name: p.name, activeStatus: p.activeStatus, apiBaseUrl: p.activeStatus ? p.apiBaseUrl : null, credentials: p.credentials },
        create: p
      });
    }

    const planApiProvider = await prisma.provider.upsert({
      where: { code: 'planapi' },
      update: {
        name: 'PLANAPI',
        activeStatus: true,
        apiBaseUrl: process.env.PLANAPI_BASE_URL || 'https://planapi.in',
        credentials: {}
      },
      create: {
        name: 'PLANAPI',
        code: 'planapi',
        activeStatus: true,
        apiBaseUrl: process.env.PLANAPI_BASE_URL || 'https://planapi.in',
        credentials: {}
      }
    });
    logger.info('Verification providers seeded.');

    // 6. Clean and Seed Provider Routing via Upsert to avoid foreign key errors
    logger.info('Syncing provider routes...');
    const routesToCreate = [
      { serviceType: 'GST_VERIFY', primaryProviderId: planApiProvider.id, backupProviderId: 3, activeStatus: true },
      { serviceType: 'PAN_CARD', primaryProviderId: 1, backupProviderId: 2, activeStatus: true },
      { serviceType: 'PAN_BASIC', primaryProviderId: 1, backupProviderId: 2, activeStatus: true },
      { serviceType: 'PAN_VERIFICATION', primaryProviderId: 1, backupProviderId: 2, activeStatus: true },
      { serviceType: 'PAN_DECODE', primaryProviderId: 1, backupProviderId: 2, activeStatus: true },
      { serviceType: 'PAN_TRACK', primaryProviderId: 1, backupProviderId: 3, activeStatus: true },
      { serviceType: 'AADHAAR_OTP', primaryProviderId: 1, backupProviderId: 2, activeStatus: true },
      { serviceType: 'AADHAAR_DATA', primaryProviderId: 1, backupProviderId: 4, activeStatus: true },
      { serviceType: 'AADHAAR_PAN', primaryProviderId: 1, backupProviderId: 4, activeStatus: true },
      { serviceType: 'RATION', primaryProviderId: 2, backupProviderId: 4, activeStatus: true },
      { serviceType: 'VOTER_VERIFY', primaryProviderId: 2, backupProviderId: 3, activeStatus: true },
      
      { serviceType: 'GST_RETURN', primaryProviderId: planApiProvider.id, backupProviderId: 3, activeStatus: true },
      { serviceType: 'RC_VERIFY', primaryProviderId: planApiProvider.id, backupProviderId: 2, activeStatus: true },
      { serviceType: 'VOTER_ID_VERIFY', primaryProviderId: planApiProvider.id, backupProviderId: 3, activeStatus: true },
      { serviceType: 'PASSPORT_VERIFY', primaryProviderId: planApiProvider.id, backupProviderId: 4, activeStatus: true },
      { serviceType: 'DRIVING_LICENSE_VERIFY', primaryProviderId: planApiProvider.id, backupProviderId: 2, activeStatus: true },
      { serviceType: 'MCA_COMPANY_SEARCH', primaryProviderId: planApiProvider.id, backupProviderId: 4, activeStatus: true },
      { serviceType: 'BANK_VERIFY', primaryProviderId: planApiProvider.id, backupProviderId: 4, activeStatus: true },
      { serviceType: 'UPI_VERIFY', primaryProviderId: planApiProvider.id, backupProviderId: 2, activeStatus: true },
      { serviceType: 'VEHICLE_CHALLAN', primaryProviderId: planApiProvider.id, backupProviderId: 3, activeStatus: true },
      { serviceType: 'RC_ADVANCED', primaryProviderId: 1, backupProviderId: 2, activeStatus: true },
      { serviceType: 'RC_TO_MOBILE', primaryProviderId: planApiProvider.id, backupProviderId: 3, activeStatus: true },
      { serviceType: 'MOBILE_TO_RC', primaryProviderId: planApiProvider.id, backupProviderId: 4, activeStatus: true },
      { serviceType: 'RC_LITE', primaryProviderId: planApiProvider.id, backupProviderId: 2, activeStatus: true },
      { serviceType: 'AADHAAR_TO_PAN', primaryProviderId: 1, backupProviderId: 4, activeStatus: true },
      { serviceType: 'MOBILE_TO_PAN', primaryProviderId: 1, backupProviderId: 3, activeStatus: true }
    ];

    for (const r of routesToCreate) {
      await prisma.providerRoute.upsert({
        where: { serviceType: r.serviceType },
        update: {
          primaryProviderId: r.primaryProviderId,
          backupProviderId: r.backupProviderId,
          activeStatus: r.activeStatus
        },
        create: r
      });
    }
    logger.info('Routing tables seeded.');

    // 7. Clean and Seed Pricing Rules via Upsert/Check-and-update to avoid foreign key errors
    logger.info('Syncing pricing rules...');
    const pricingRulesToCreate = [
      { serviceType: 'PAN_CARD', providerCost: 0.3000, sellingPrice: 1.0000, margin: 0.7000 },
      { serviceType: 'GST_VERIFY', providerCost: 0.3000, sellingPrice: 1.0000, margin: 0.7000 },
      { serviceType: 'GST_RETURN', providerCost: 0.8000, sellingPrice: 2.5000, margin: 1.7000 },
      { serviceType: 'RC_VERIFY', providerCost: 1.5000, sellingPrice: 5.0000, margin: 3.5000 },
      { serviceType: 'VOTER_VERIFY', providerCost: 1.5000, sellingPrice: 5.0000, margin: 3.5000 },
      { serviceType: 'PASSPORT_VERIFY', providerCost: 1.5000, sellingPrice: 5.0000, margin: 3.5000 },
      { serviceType: 'DRIVING_LICENSE_VERIFY', providerCost: 1.2000, sellingPrice: 4.0000, margin: 2.8000 },
      { serviceType: 'MCA_COMPANY_SEARCH', providerCost: 0.9000, sellingPrice: 3.0000, margin: 2.1000 },
      { serviceType: 'BANK_VERIFY', providerCost: 1.5000, sellingPrice: 5.0000, margin: 3.5000 },
      { serviceType: 'UPI_VERIFY', providerCost: 0.9000, sellingPrice: 3.0000, margin: 2.1000 },
      { serviceType: 'VEHICLE_CHALLAN', providerCost: 1.5000, sellingPrice: 5.0000, margin: 3.5000 },
      { serviceType: 'RC_ADVANCED', providerCost: 1.5000, sellingPrice: 5.0000, margin: 3.5000 },
      { serviceType: 'RC_TO_MOBILE', providerCost: 1.5000, sellingPrice: 5.0000, margin: 3.5000 },
      { serviceType: 'MOBILE_TO_RC', providerCost: 4.0000, sellingPrice: 13.0000, margin: 9.0000 },
      { serviceType: 'RC_LITE', providerCost: 0.9000, sellingPrice: 3.0000, margin: 2.1000 },
      { serviceType: 'AADHAAR_TO_PAN', providerCost: 3.0000, sellingPrice: 10.0000, margin: 7.0000 },
      { serviceType: 'MOBILE_TO_PAN', providerCost: 3.0000, sellingPrice: 10.0000, margin: 7.0000 },
      
      { serviceType: 'PAN_BASIC', providerCost: 0.1500, sellingPrice: 0.5000, margin: 0.3500 },
      { serviceType: 'PAN_VERIFICATION', providerCost: 0.2000, sellingPrice: 0.6000, margin: 0.4000 },
      { serviceType: 'PAN_DECODE', providerCost: 0.3500, sellingPrice: 1.2000, margin: 0.8500 },
      { serviceType: 'PAN_TRACK', providerCost: 0.4500, sellingPrice: 1.5000, margin: 1.0500 },
      { serviceType: 'AADHAAR_OTP', providerCost: 1.0000, sellingPrice: 3.5000, margin: 2.5000 },
      { serviceType: 'AADHAAR_DATA', providerCost: 2.0000, sellingPrice: 6.0000, margin: 4.0000 },
      { serviceType: 'AADHAAR_PAN', providerCost: 0.8000, sellingPrice: 2.5000, margin: 1.7000 },
      { serviceType: 'RATION', providerCost: 0.5000, sellingPrice: 2.0000, margin: 1.5000 },
      { serviceType: 'AADHAAR', providerCost: 2.0000, sellingPrice: 6.0000, margin: 4.0000 }
    ];

    for (const p of pricingRulesToCreate) {
      const existing = await prisma.pricingRule.findFirst({
        where: {
          serviceType: p.serviceType,
          roleId: null,
          userId: null
        }
      });
      if (existing) {
        await prisma.pricingRule.update({
          where: { id: existing.id },
          data: {
            providerCost: p.providerCost,
            sellingPrice: p.sellingPrice,
            margin: p.margin
          }
        });
      } else {
        await prisma.pricingRule.create({ data: p });
      }
    }
    logger.info('Service pricing matrices seeded.');

    // 8. Seed Default API Keys via Upsert (use whitelisted ["127.0.0.1"] as default instead of wildcards)
    const adminKeyRaw = 'vh_live_admin_default_key_123';
    const clientKeyRaw = 'vh_live_client_default_key_456';

    const adminKeyHash = hashKey(adminKeyRaw);
    const clientKeyHash = hashKey(clientKeyRaw);

    await prisma.apiKey.upsert({
      where: { keyHash: adminKeyHash },
      update: {
        keyMasked: 'vh_live_********_123',
        name: 'Default Admin Key',
        userId: adminUser.id,
        organizationId: defaultOrg.id,
        rateLimit: 120,
        usageLimit: null,
        ipWhitelist: ['127.0.0.1'],
        permissions: ['*'],
        status: 'ACTIVE'
      },
      create: {
        keyHash: adminKeyHash,
        keyMasked: 'vh_live_********_123',
        name: 'Default Admin Key',
        userId: adminUser.id,
        organizationId: defaultOrg.id,
        rateLimit: 120,
        usageLimit: null,
        usageCount: 0,
        ipWhitelist: ['127.0.0.1'],
        permissions: ['*'],
        status: 'ACTIVE'
      }
    });

    await prisma.apiKey.upsert({
      where: { keyHash: clientKeyHash },
      update: {
        keyMasked: 'vh_live_********_456',
        name: 'Default Client Key',
        userId: clientUser.id,
        organizationId: defaultOrg.id,
        rateLimit: 60,
        usageLimit: null,
        ipWhitelist: ['127.0.0.1'],
        permissions: ['*'],
        status: 'ACTIVE'
      },
      create: {
        keyHash: clientKeyHash,
        keyMasked: 'vh_live_********_456',
        name: 'Default Client Key',
        userId: clientUser.id,
        organizationId: defaultOrg.id,
        rateLimit: 60,
        usageLimit: null,
        usageCount: 0,
        ipWhitelist: ['127.0.0.1'],
        permissions: ['*'],
        status: 'ACTIVE'
      }
    });
    logger.info('Default API keys seeded.');

    // 9. Sync global settings first to ensure default activation fee is accessible
    logger.info('Syncing default system settings...');
    const defaultSettings = [
      { key: 'platform_name', value: 'Dizipay', description: 'Name of the platform' },
      { key: 'activation_fee_default', value: '49.00', description: 'Default service activation fee (INR)' },
      { key: 'wallet_minimum_balance', value: '0.00', description: 'Minimum wallet balance required to query APIs' },
      { key: 'support_email', value: 'support@dizipay.in', description: 'Support email contact address' },
      { key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode lock for the platform' }
    ];

    for (const ds of defaultSettings) {
      await prisma.systemSetting.upsert({
        where: { key: ds.key },
        update: {}, // do not overwrite customized values if already seeded
        create: ds
      });
    }
    logger.info('System settings synced.');

    // Fetch globalDefaultActivationFee
    let activationFeeVal = 49.00;
    const activationFeeSetting = await prisma.systemSetting.findUnique({
      where: { key: 'activation_fee_default' }
    });
    if (activationFeeSetting) {
      activationFeeVal = parseFloat(activationFeeSetting.value);
    }

    // 10. Seed all 26 Services via Upsert to avoid foreign key errors with subscriptions or request logs
    logger.info('Syncing 26 dynamic services...');
    const servicesData = staticServices.map(s => ({
      key: s.key,
      name: s.name,
      category: s.category,
      method: s.method,
      endpoint: s.endpoint,
      description: s.description,
      successRate: s.successRate,
      latency: s.latency,
      price: s.price
    }));

    for (const s of servicesData) {
      await prisma.service.upsert({
        where: { key: s.key },
        update: {
          name: s.name,
          category: s.category,
          method: s.method,
          endpoint: s.endpoint,
          description: s.description,
          successRate: s.successRate,
          latency: s.latency,
          price: s.price
        },
        create: {
          ...s,
          activationFee: activationFeeVal
        }
      });
    }
    logger.info('Services seeded successfully.');

    // 10. Automatically subscribe standard client user to GST_VERIFY, PAN_CARD via upsert to allow testing initially
    const gstSvc = await prisma.service.findUnique({ where: { key: 'GST_VERIFY' } });
    const panSvc = await prisma.service.findUnique({ where: { key: 'PAN_CARD' } });
    
    if (gstSvc) {
      await prisma.userServiceSubscription.upsert({
        where: {
          userId_serviceId: {
            userId: clientUser.id,
            serviceId: gstSvc.id
          }
        },
        update: { status: 'ACTIVE', purchaseAmount: 1.0000 },
        create: { userId: clientUser.id, serviceId: gstSvc.id, status: 'ACTIVE', purchaseAmount: 1.0000 }
      });
    }
    if (panSvc) {
      await prisma.userServiceSubscription.upsert({
        where: {
          userId_serviceId: {
            userId: clientUser.id,
            serviceId: panSvc.id
          }
        },
        update: { status: 'ACTIVE', purchaseAmount: 1.0000 },
        create: { userId: clientUser.id, serviceId: panSvc.id, status: 'ACTIVE', purchaseAmount: 1.0000 }
      });
    }
    logger.info('Auto-activated default verification subscriptions for client@verifyhub.com.');

    logger.info('Database seeding completed successfully.');
  } catch (error) {
    logger.error('Error during database seeding: %O', error);
    throw error;
  }
}

module.exports = seedDatabase;
