const prisma = require('../lib/prisma');
const crypto = require('crypto');
const logger = require('../config/logger');

class WebhookController {
  static async list(req, res) {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: {
          userId: req.user.id,
          deletedAt: null
        }
      });
      return res.status(200).json({ success: true, webhooks });
    } catch (error) {
      logger.error('List Webhooks error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve webhooks.' });
    }
  }

  static async create(req, res) {
    try {
      const { url, events } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'Webhook URL is required.' });
      }

      // Generate webhook secret key
      const secretKey = `whsec_${crypto.randomBytes(16).toString('hex')}`;

      const webhook = await prisma.webhook.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          url,
          secretKey,
          activeStatus: true,
          events: events || ['verification.success', 'verification.failed']
        }
      });

      logger.info(`Webhook target registered: ${url} (Secret: ${secretKey})`);
      return res.status(201).json({ success: true, webhook });
    } catch (error) {
      logger.error('Create Webhook error: %O', error);
      return res.status(500).json({ error: 'Failed to register webhook.' });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const webhook = await prisma.webhook.findFirst({
        where: {
          id: parseInt(id),
          userId: req.user.id,
          deletedAt: null
        }
      });

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found.' });
      }

      await prisma.webhook.update({
        where: { id: webhook.id },
        data: { deletedAt: new Date() }
      });

      return res.status(200).json({ success: true, message: 'Webhook deleted successfully.' });
    } catch (error) {
      logger.error('Delete Webhook error: %O', error);
      return res.status(500).json({ error: 'Failed to delete webhook.' });
    }
  }

  static async getLogs(req, res) {
    try {
      const { id } = req.params;
      const webhook = await prisma.webhook.findFirst({
        where: {
          id: parseInt(id),
          userId: req.user.id,
          deletedAt: null
        }
      });

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook configuration not found.' });
      }

      const logs = await prisma.webhookDelivery.findMany({
        where: { webhookId: webhook.id },
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      return res.status(200).json({ success: true, logs });
    } catch (error) {
      logger.error('Get Webhook logs error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve webhook logs.' });
    }
  }
}

module.exports = WebhookController;
