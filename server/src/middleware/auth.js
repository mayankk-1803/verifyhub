const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dizipay_jwt_secret';

const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token missing or invalid.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired.', expired: true });
      }
      return res.status(401).json({ error: 'Invalid access token.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: decoded.id,
        deletedAt: null
      },
      include: {
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: `User account status is ${user.status}.` });
    }

    // Keep capitalized Role for backward compatibility
    user.Role = user.role;

    // Attach user information to request
    req.user = user;
    req.role = user.role ? user.role.name : null;

    next();
  } catch (error) {
    logger.error('Error in authenticateJWT middleware: %O', error);
    return res.status(500).json({ error: 'Authentication internal failure.' });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.role) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!rolesArray.includes(req.role)) {
      return res.status(403).json({ error: 'Unauthorized access. Insufficient privileges.' });
    }

    next();
  };
};

const extractUserLight = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findFirst({
          where: { id: decoded.id, deletedAt: null },
          include: { role: true }
        });
        if (user) {
          req.user = user;
          req.role = user.role ? user.role.name : null;
        }
      } catch (err) {
        // Decryption fails or token expired, skip setting req.user
      }
    }
  } catch (error) {
    // Ignore errors
  }
  next();
};

module.exports = {
  authenticateJWT,
  requireRole,
  extractUserLight
};
