const prisma = require('../lib/prisma');
const logger = require('../config/logger');

class SupportController {
  static async create(req, res) {
    try {
      const { subject, description, priority, category } = req.body;

      if (!subject || !description) {
        return res.status(400).json({ error: 'Subject and description are required.' });
      }

      const ticket = await prisma.supportTicket.create({
        data: {
          userId: req.user.id,
          subject,
          description,
          priority: priority || 'MEDIUM',
          category: category || 'General',
          status: 'OPEN'
        }
      });

      logger.info(`Support ticket created by user ${req.user.id}: ${subject}`);
      return res.status(201).json({ success: true, ticket });
    } catch (error) {
      logger.error('Create support ticket error: %O', error);
      return res.status(500).json({ error: 'Failed to create support ticket.' });
    }
  }

  static async list(req, res) {
    try {
      const tickets = await prisma.supportTicket.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json({ success: true, tickets });
    } catch (error) {
      logger.error('List support tickets error: %O', error);
      return res.status(500).json({ error: 'Failed to fetch support tickets.' });
    }
  }

  static async adminList(req, res) {
    try {
      const tickets = await prisma.supportTicket.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Map relation to keep capitalized key for backward compatibility
      const formattedTickets = tickets.map(ticket => {
        const t = { ...ticket };
        if (t.user) {
          t.User = t.user;
        }
        return t;
      });

      return res.status(200).json({ success: true, tickets: formattedTickets });
    } catch (error) {
      logger.error('Admin list support tickets error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve system support tickets.' });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status is required.' });
      }

      const ticketExists = await prisma.supportTicket.findUnique({
        where: { id: parseInt(id) }
      });
      if (!ticketExists) {
        return res.status(404).json({ error: 'Support ticket not found.' });
      }

      const ticket = await prisma.supportTicket.update({
        where: { id: parseInt(id) },
        data: { status }
      });

      logger.info(`Support ticket ${id} status updated to ${status}`);
      return res.status(200).json({ success: true, ticket });
    } catch (error) {
      logger.error('Update support ticket status error: %O', error);
      return res.status(500).json({ error: 'Failed to update support ticket status.' });
    }
  }
}

module.exports = SupportController;
