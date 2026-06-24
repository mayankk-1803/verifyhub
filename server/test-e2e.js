const app = require('./src/app');
const prisma = require('./src/lib/prisma');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Mock KycService
const KycService = require('./src/services/kyc.service');
KycService.sendAadhaarOtp = async (aadhaarNumber) => {
  return { status: true, client_id: 'test_client_id_123' };
};
KycService.fetchAadhaarDetails = async (otp, clientId) => {
  return {
    status: true,
    data: {
      fullName: 'Test E2E User',
      dob: '01/01/1995',
      gender: 'M',
      careOf: 'Father Name',
      address: '123 Test Street, Test City',
      profileImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    }
  };
};

const PORT = 5002;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  let server;
  let testCount = 0;
  let passCount = 0;
  const failures = [];

  const assert = (condition, message) => {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`✓ [Pass] ${message}`);
    } else {
      failures.push(message);
      console.error(`✗ [Fail] ${message}`);
    }
  };

  try {
    // 1. Boot Server on test port
    await prisma.$connect();
    server = app.listen(PORT);
    console.log(`Test server booted on ${BASE_URL}`);

    // Generate unique phone and email for testing registration & OTP
    const uniqueId = Math.floor(100000 + Math.random() * 900000);
    const testPhone = '99' + String(uniqueId) + '12';
    const testEmail = `test_${uniqueId}@dizipay.in`;
    const testPassword = 'Password@123';

    // 2. Test Registration
    try {
      const regRes = await axios.post(`${BASE_URL}/api/v1/auth/register`, {
        name: 'Test E2E User',
        email: testEmail,
        phone: testPhone,
        password: testPassword,
        organizationName: 'Test Org'
      });
      assert(regRes.status === 201 && regRes.data.success === true, 'POST /auth/register should create user and return 201');
    } catch (err) {
      assert(false, `POST /auth/register failed: ${err.message}`);
    }

    // 3. Test Email Login
    let authToken = '';
    try {
      const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
        email: testEmail,
        password: testPassword
      });
      authToken = loginRes.data.accessToken;
      assert(loginRes.status === 200 && !!authToken, 'POST /auth/login should authenticate user and return token');
    } catch (err) {
      assert(false, `POST /auth/login failed: ${err.message}`);
    }

    // 4. Test OTP sending rate-limits
    try {
      const otpRes1 = await axios.post(`${BASE_URL}/api/v1/auth/send-otp`, { phone: testPhone });
      assert(otpRes1.status === 200 && otpRes1.data.success === true, 'POST /auth/send-otp should succeed initially');
      
      // Repeated send-otp immediately should fail (rate limited)
      try {
        await axios.post(`${BASE_URL}/api/v1/auth/send-otp`, { phone: testPhone });
        assert(false, 'POST /auth/send-otp should be rate-limited within 60s');
      } catch (err) {
        assert(err.response && err.response.status === 429, 'POST /auth/send-otp rate-limit should return 429');
      }
    } catch (err) {
      assert(false, `POST /auth/send-otp rate-limits check failed: ${err.message}`);
    }

    // 5. Test Wallet Lockdown endpoints
    const rechargePaths = [
      '/wallet/recharge',
      '/wallet/add-money',
      '/wallet/confirm',
      '/api/v1/wallet/recharge',
      '/api/v1/wallet/add-money',
      '/api/v1/wallet/confirm'
    ];
    for (const path of rechargePaths) {
      try {
        await axios.post(`${BASE_URL}${path}`, { amount: 1000 });
        assert(false, `POST ${path} should be blocked in Wallet Lockdown Mode`);
      } catch (err) {
        assert(
          err.response && err.response.status === 503 && err.response.data.success === false,
          `POST ${path} returns 503 Service Unavailable under Lockdown Mode`
        );
      }
    }

    // 5.5 Test KYC Verification Flow (Aadhaar OTP + Details Fetch + Auto-Approval)
    let clientId = '';
    try {
      // Step A: Send Aadhaar OTP
      const sendOtpRes = await axios.post(
        `${BASE_URL}/api/v1/kyc/send-aadhaar-otp`,
        { aadhaarNumber: '123456789012' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      assert(sendOtpRes.status === 200 && sendOtpRes.data.success === true && !!sendOtpRes.data.clientId, 'POST /kyc/send-aadhaar-otp should succeed and return clientId');
      clientId = sendOtpRes.data.clientId;

      // Step B: Fetch Aadhaar details (Verifies OTP & Auto-approves KYC)
      const fetchDetailsRes = await axios.post(
        `${BASE_URL}/api/v1/kyc/fetch-aadhaar-details`,
        { otp: '123456', clientId },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      assert(fetchDetailsRes.status === 200 && fetchDetailsRes.data.success === true && fetchDetailsRes.data.message === 'KYC Approved', 'POST /kyc/fetch-aadhaar-details should verify OTP and approve KYC');

      // Verify duplicate submission prevention: sending Aadhaar OTP again should now return 409 Conflict
      try {
        await axios.post(
          `${BASE_URL}/api/v1/kyc/send-aadhaar-otp`,
          { aadhaarNumber: '123456789012' },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        assert(false, 'POST /kyc/send-aadhaar-otp should return 409 when Aadhaar is already verified');
      } catch (err) {
        assert(err.response && err.response.status === 409, 'POST /kyc/send-aadhaar-otp returns 409 Conflict when Aadhaar is already verified');
      }

      // Verify duplicate submission prevention: fetching Aadhaar details again should now return 409 Conflict
      try {
        await axios.post(
          `${BASE_URL}/api/v1/kyc/fetch-aadhaar-details`,
          { otp: '123456', clientId },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        assert(false, 'POST /kyc/fetch-aadhaar-details should return 409 when Aadhaar is already verified');
      } catch (err) {
        assert(err.response && err.response.status === 409, 'POST /kyc/fetch-aadhaar-details returns 409 Conflict when Aadhaar is already verified');
      }

      // Verify retry endpoint returns 409 Conflict when KYC is approved
      try {
        await axios.post(
          `${BASE_URL}/api/v1/kyc/retry`,
          {},
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        assert(false, 'POST /kyc/retry should return 409 when KYC is approved');
      } catch (err) {
        assert(err.response && err.response.status === 409, 'POST /kyc/retry returns 409 when KYC is approved');
      }
    } catch (err) {
      assert(false, `KYC verification flow test failed: ${err.message}`);
    }

    // 6. Test Service Activation with ₹0 wallet balance
    // Retrieve first service
    const svcRes = await axios.get(`${BASE_URL}/api/v1/services`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const services = svcRes.data.services;
    const panService = services.find(s => s.key === 'PAN_CARD');
    const gstService = services.find(s => s.key === 'GST_VERIFY');

    assert(!!panService, 'PAN_CARD service should be resolved from services catalog');

    try {
      await axios.post(
        `${BASE_URL}/api/v1/services/${panService.id}/activate`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      assert(false, 'Activation should fail on insufficient balance');
    } catch (err) {
      assert(err.response && err.response.status === 402, 'Service activation on zero balance should return 402 Payment Required');
    }

    // 7. Test Admin wallet adjustment & Service activation
    const adminUserRecord = await prisma.user.findFirst({
      where: { email: 'admin@dizipay.in' }
    });
    if (!adminUserRecord) {
      throw new Error("Admin user admin@dizipay.in not found in database! Make sure to seed the database first.");
    }
    const adminToken = jwt.sign(
      { id: adminUserRecord.id, email: adminUserRecord.email, roleId: adminUserRecord.roleId },
      process.env.JWT_SECRET || 'dizipay_jwt_secret',
      { expiresIn: '1h' }
    );
    try {
      // Find the user created earlier to adjust wallet
      const userRecord = await prisma.user.findFirst({
        where: { email: testEmail }
      });

      const adjustRes = await axios.post(
        `${BASE_URL}/api/v1/admin/wallet/adjust`,
        {
          userId: userRecord.id,
          amount: 50.00,
          type: 'CREDIT',
          description: 'Administrative test credit'
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      assert(adjustRes.status === 200 && adjustRes.data.success === true, 'Admin should successfully credit wallet balance');

      // Now activate service
      const activateRes = await axios.post(
        `${BASE_URL}/api/v1/services/${panService.id}/activate`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      assert(activateRes.status === 200 && activateRes.data.success === true, 'Activation succeeds after wallet balance increment');

      // Verify that PAN is activated, but GST remains locked
      const updatedSvcRes = await axios.get(`${BASE_URL}/api/v1/services`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const updatedPAN = updatedSvcRes.data.services.find(s => s.key === 'PAN_CARD');
      const updatedGST = updatedSvcRes.data.services.find(s => s.key === 'GST_VERIFY');
      assert(updatedPAN.isActivated === true && updatedGST.isActivated === false, 'Only activated service is unlocked; all other services remain locked');
    } catch (err) {
      assert(false, `Admin adjust or service unlock validation failed: ${err.message}`);
    }

    // 8. Test Subscription Enforcement Check on Gateway
    // Create an API key for the user
    const apiKeyRaw = `vh_live_test_api_key_${uniqueId}`;
    const apiKeyHash = require('crypto').createHash('sha256').update(apiKeyRaw).digest('hex');
    const userRecord = await prisma.user.findFirst({ where: { email: testEmail } });
    
    await prisma.apiKey.create({
      data: {
        keyHash: apiKeyHash,
        keyMasked: `vh_live_********_${String(uniqueId).slice(-3)}`,
        name: 'Test API Key',
        userId: userRecord.id,
        organizationId: userRecord.organizationId,
        ipWhitelist: ['127.0.0.1'],
        permissions: ['*']
      }
    });

    // Attempt calling PAN (active service)
    try {
      const panVerifyRes = await axios.get(
        `${BASE_URL}/api/v1/pan/verify?pan=ABCDE1234F`,
        { headers: { 'x-api-key': apiKeyRaw } }
      );
      // It passes authorization but will fail downstream or succeed as mockup.
      // The important part is it shouldn't fail with 403 "not activated"
      assert(panVerifyRes.status !== 403, 'Gateway call to activated PAN service should bypass subscription 403 blocks');
    } catch (err) {
      assert(err.response && err.response.status !== 403, 'Gateway call to active service must not throw 403 subscription error');
    }

    // Attempt calling GST (locked service)
    try {
      await axios.get(
        `${BASE_URL}/api/v1/gst/verify?gstin=27AAAAA1111A1Z1`,
        { headers: { 'x-api-key': apiKeyRaw } }
      );
      assert(false, 'Gateway call to locked GST service must fail');
    } catch (err) {
      assert(
        err.response && err.response.status === 403 && err.response.data.message === 'This service is not activated for your account',
        'Gateway call to locked service returns 403 "This service is not activated for your account"'
      );
    }

    // 9. API Key whitelisting validation (net.isIP())
    try {
      const addKeyRes = await axios.post(
        `${BASE_URL}/api/v1/api-keys`,
        {
          name: 'Invalid IP Key',
          permissions: '*',
          ipWhitelist: 'invalid-ip,*'
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      assert(false, 'Key creation with invalid IP should fail');
    } catch (err) {
      assert(err.response && err.response.status === 400, 'API key creation with invalid IP correctly returns 400 Bad Request');
    }

    // 10. Dashboard route whitelisting bypass
    try {
      const dashRes = await axios.get(`${BASE_URL}/api/v1/dashboard`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert(dashRes.status === 200 && dashRes.data.success === true, 'Dashboard API must be accessible without whitelisting');
    } catch (err) {
      assert(false, `Dashboard endpoint access failed: ${err.message}`);
    }

    // 11. Deprecated PAN routes validation (410 Gone)
    const deprecatedRoutes = [
      '/api/v1/kyc/verify-pan',
      '/api/v1/kyc/verify-aadhaar',
      '/api/v1/kyc/pan-match'
    ];
    for (const route of deprecatedRoutes) {
      try {
        await axios.post(`${BASE_URL}${route}`, {}, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        assert(false, `POST ${route} should be deprecated`);
      } catch (err) {
        assert(
          err.response && err.response.status === 410 && err.response.data.success === false && err.response.data.message === 'PAN KYC flow has been deprecated',
          `POST ${route} returns 410 Gone and exactly "PAN KYC flow has been deprecated"`
        );
      }
    }

  } catch (error) {
    console.error('Fatal test runner error:', error);
  } finally {
    if (server) {
      server.close();
      console.log('Test server shut down.');
    }
    await prisma.$disconnect();

    console.log('\n======================================');
    console.log(`TEST RUN COMPLETE: ${passCount}/${testCount} Passed.`);
    console.log('======================================');
    if (failures.length > 0) {
      console.error('\nFailures summary:');
      failures.forEach((f, i) => console.error(`${i + 1}. ${f}`));
      process.exit(1);
    } else {
      console.log('\nAll validation tests passed successfully!');
      process.exit(0);
    }
  }
}

runTests();
