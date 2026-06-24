const { Worker } = require('bullmq');
const crypto = require('crypto');
const logger = require('../config/logger');
const prisma = require('../lib/prisma');
const redis = require('redis');
require('dotenv').config();

let worker = null;

async function initWorker() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const testClient = redis.createClient({ 
    url: redisUrl,
    socket: {
      reconnectStrategy: false,
      connectTimeout: 2000
    }
  });
  testClient.on('error', () => {});
  try {
    await testClient.connect();
    await testClient.disconnect();
    
    logger.info(`Starting BullMQ Webhook Worker on Redis: ${redisUrl}`);
    worker = new Worker('webhook-queue', async (job) => {
      const { event, payload, userId, organizationId } = job.data;
      logger.info(`Processing webhook job ${job.id} for event: ${event}`);

      // Find all active webhooks for this user or organization (excluding soft-deleted)
      const webhooks = await prisma.webhook.findMany({
        where: {
          activeStatus: true,
          userId,
          deletedAt: null
        }
      });

      if (webhooks.length === 0) {
        logger.info(`No active webhooks registered for User ID: ${userId}`);
        return;
      }

      for (const webhook of webhooks) {
        // Check if webhook is subscribed to this event
        if (webhook.events && Array.isArray(webhook.events) && !webhook.events.includes(event)) {
          logger.info(`Webhook ${webhook.id} is not subscribed to event: ${event}`);
          continue;
        }

        // Compute HMAC-SHA256 signature
        const signature = crypto
          .createHmac('sha256', webhook.secretKey)
          .update(JSON.stringify(payload))
          .digest('hex');

        const headers = {
          'Content-Type': 'application/json',
          'X-Dizipay-Signature': signature,
          'X-Dizipay-Event': event
        };

        let statusCode = null;
        let responseBody = '';
        let success = false;

        try {
          logger.info(`Sending webhook event ${event} to ${webhook.url}`);
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              event,
              payload,
              timestamp: new Date()
            }),
            signal: AbortSignal.timeout(10000) // 10 seconds timeout
          });

          statusCode = response.status;
          responseBody = await response.text();

          if (response.ok) {
            success = true;
            logger.info(`Webhook successfully delivered to ${webhook.url} (Status: ${statusCode})`);
          } else {
            logger.warn(`Webhook endpoint ${webhook.url} returned status: ${statusCode}`);
          }
        } catch (error) {
          logger.error(`Error delivering webhook to ${webhook.url}: ${error.message}`);
          responseBody = error.message;
          statusCode = error.status || 500;
        }

        // Record the Webhook Delivery Log
        await prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            eventType: event,
            payload,
            statusCode,
            responseBody: responseBody.substring(0, 1000), // Limit response body storage size
            success,
            attemptNumber: job.attemptsMade + 1
          }
        });

        // If delivery failed, throw error to trigger BullMQ retry
        if (!success) {
          throw new Error(`Failed to deliver webhook to ${webhook.url}. Triggering queue retry.`);
        }
      }
    }, {
      connection: {
        url: redisUrl
      },
      concurrency: 5
    });

    worker.on('failed', (job, err) => {
      logger.error(`Webhook job ${job ? job.id : 'unknown'} failed permanently or waiting for retry: ${err.message}`);
    });

    worker.on('error', (err) => {
      logger.error(`Webhook worker encounter error: %O`, err);
    });
  } catch (error) {
    logger.debug('Redis is not available for BullMQ Worker. Skipping worker initialization.');
    worker = null;
  }
}

initWorker();

module.exports = worker;
