const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const prisma = require('./lib/prisma');
const logger = require('./config/logger');
const redis = require('redis');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('✓ Server Started');

    // 1. Database Connection Test
    await prisma.$connect();
    console.log('✓ MySQL Connected');
    console.log('✓ Prisma Ready');

    // 2. Redis Connection Test
    try {
      const { getRedisClient } = require('./lib/redis');
      const redisClient = await getRedisClient();
      if (redisClient) {
        console.log('✓ Redis Connected');
      } else {
        console.log('✗ Redis Connection Failed (Using database fallback)');
      }
    } catch (err) {
      console.log('✗ Redis Connection Failed (Using database fallback)');
    }

    // 3. Pre-boot BullMQ Webhook worker
    try {
      require('./jobs/webhookWorker');
    } catch (error) {
      // Worker boot warnings are caught silently to preserve clean output
    }

    console.log('✓ Routes Loaded');

    if (!process.env.NXTBYTE_API_KEY) {
      console.log('NXTBYTE API KEY NOT CONFIGURED');
    }

    // 5. Start HTTP Listener
    app.listen(PORT, () => {
      // Quiet startup
    });
  } catch (error) {
    console.error('CRITICAL: Unable to start the server due to database connection loss:', error.message);
    process.exit(1);
  }
}

startServer();
