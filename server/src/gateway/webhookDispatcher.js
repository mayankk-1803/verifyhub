const { Queue } = require('bullmq');
const logger = require('../config/logger');
const redis = require('redis');
const prisma = require('../lib/prisma');
require('dotenv').config();

let webhookQueue = null;

async function initQueue() {
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
    
    logger.info(`Redis check passed. Initializing BullMQ Webhook Queue.`);
    webhookQueue = new Queue('webhook-queue', {
      connection: {
        url: redisUrl
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    });

    webhookQueue.on('error', (err) => {
      logger.error('BullMQ Webhook Queue Connection Error: %O', err);
    });
  } catch (error) {
    logger.debug('Redis is not available for BullMQ Queue. WebhookDispatcher will fall back to direct in-memory delivery.');
    webhookQueue = null;
  }
}

initQueue();

class WebhookDispatcher {
  /**
   * Dispatch a webhook event.
   * Pushes the webhook job into the background queue, or handles delivery in-memory if offline.
   * @param {string} event - The event code (e.g. 'verification.success', 'wallet.low')
   * @param {object} payload - The details of the request
   * @param {number} userId - The user ID associated
   * @param {number} organizationId - The organization ID associated
   */
  static async dispatch(event, payload, userId, organizationId) {
    if (!webhookQueue) {
      logger.debug(`Webhook queue is offline. Dispatching event "${event}" directly in-memory...`);
      try {
        const crypto = require('crypto');
        
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
          if (webhook.events && Array.isArray(webhook.events) && !webhook.events.includes(event)) {
            continue;
          }

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
            const response = await fetch(webhook.url, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                event,
                payload,
                timestamp: new Date()
              }),
              signal: AbortSignal.timeout(5000)
            });

            statusCode = response.status;
            responseBody = await response.text();

            if (response.ok) {
              success = true;
              logger.info(`Direct webhook successfully delivered to ${webhook.url} (Status: ${statusCode})`);
            }
          } catch (error) {
            logger.error(`Direct webhook delivery to ${webhook.url} failed: ${error.message}`);
            responseBody = error.message;
            statusCode = 500;
          }

          await prisma.webhookDelivery.create({
            data: {
              webhookId: webhook.id,
              eventType: event,
              payload,
              statusCode,
              responseBody: responseBody.substring(0, 1000),
              success,
              attemptNumber: 1
            }
          });
        }
      } catch (err) {
        logger.error(`Error in direct webhook delivery processing: ${err.message}`);
      }
      return;
    }

    try {
      await webhookQueue.add('send-webhook', {
        event,
        payload,
        userId,
        organizationId,
        timestamp: new Date()
      });
      logger.info(`Enqueued webhook job for event: ${event}`);
    } catch (error) {
      logger.error(`Failed to enqueue webhook job for event "${event}": %O`, error);
    }
  }
}

module.exports = WebhookDispatcher;
