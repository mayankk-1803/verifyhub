const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateJWT } = require('../middleware/auth');
const logger = require('../config/logger');

router.use(authenticateJWT);

// GET /api/v1/notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    logger.error('Fetch notifications error: %O', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve notifications.' });
  }
});

// POST /api/v1/notifications/mark-all-read
router.post('/mark-all-read', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all read error: %O', error);
    return res.status(500).json({ success: false, error: 'Failed to mark notifications as read.' });
  }
});

// POST /api/v1/notifications/:id/read
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await prisma.notification.findFirst({
      where: { id: parseInt(id), userId: req.user.id }
    });

    if (!notif) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    await prisma.notification.update({
      where: { id: notif.id },
      data: { isRead: true }
    });
    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Mark read error: %O', error);
    return res.status(500).json({ success: false, error: 'Failed to update notification.' });
  }
});

module.exports = router;
