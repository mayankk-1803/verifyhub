const app = require('./src/app');
const prisma = require('./src/lib/prisma');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const PORT = 5003;
const BASE_URL = `http://localhost:${PORT}`;

async function run() {
  let server;
  try {
    await prisma.$connect();
    server = app.listen(PORT);
    console.log(`Test server booted on ${BASE_URL}`);

    // Retrieve the admin user from database
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@dizipay.in' },
      include: { role: true }
    });

    if (!adminUser) {
      console.error("No admin user found! Seed the database first.");
      process.exit(1);
    }

    const token = jwt.sign(
      { id: adminUser.id, email: adminUser.email, roleId: adminUser.roleId },
      process.env.JWT_SECRET || 'dizipay_jwt_secret',
      { expiresIn: '1h' }
    );

    console.log("1. Testing Admin verification call with JWT Bearer Token directly (no API Key)...");
    const res1 = await axios.get(`${BASE_URL}/api/v1/pan/verify?pan=ABCDE1234F`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Response status:", res1.status);
    console.log("Response data:", JSON.stringify(res1.data));
    
    if (res1.status === 200 && res1.data.success) {
      console.log("✓ Admin bypass with Bearer Token passed successfully!");
    } else {
      console.error("✗ Admin bypass with Bearer Token failed.");
    }

    console.log("\n2. Testing Admin verification call with x-api-key + Bearer Token...");
    const res2 = await axios.get(`${BASE_URL}/api/v1/pan/verify?pan=ABCDE1234F`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-key': 'admin_sandbox_bypass_key'
      }
    });

    console.log("Response status:", res2.status);
    console.log("Response data:", JSON.stringify(res2.data));

    if (res2.status === 200 && res2.data.success) {
      console.log("✓ Admin bypass with x-api-key + Bearer Token passed successfully!");
    } else {
      console.error("✗ Admin bypass failed.");
    }

  } catch (err) {
    console.error("Test execution failed:", err.response?.data || err.message);
  } finally {
    if (server) {
      server.close();
      console.log("Server stopped.");
    }
    await prisma.$disconnect();
  }
}

run();
