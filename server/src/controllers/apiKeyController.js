const crypto = require('crypto');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');

const hashKey = (rawKey) => {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};

const maskKey = (rawKey) => {
  if (!rawKey) return '';
  return rawKey.substring(0, 8) + '********' + rawKey.slice(-4);
};

class ApiKeyController {
  static async list(req, res) {
    try {
      const isAdmin = req.role === 'Super Admin' || req.role === 'Admin';
      const whereClause = isAdmin ? { deletedAt: null } : { userId: req.user.id, deletedAt: null };
      
      const keys = await prisma.apiKey.findMany({
        where: whereClause
      });

      const sanitizedKeys = keys.map(key => ({
        id: key.id,
        name: key.name,
        key: key.keyMasked, // Never expose raw keys or hashes in the list
        rateLimit: key.rateLimit,
        usageLimit: key.usageLimit,
        usageCount: key.usageCount,
        ipWhitelist: key.ipWhitelist,
        permissions: key.permissions,
        status: key.status,
        createdAt: key.createdAt
      }));

      return res.status(200).json({ success: true, keys: sanitizedKeys });
    } catch (error) {
      logger.error('List API Keys error: %O', error);
      return res.status(500).json({ error: 'Failed to retrieve API keys.' });
    }
  }

  static async create(req, res) {
    try {
      let { name, ipWhitelist, permissions, usageLimit, rateLimit } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Key name is required.' });
      }

      const net = require('net');

      // Enforce ipWhitelist is provided, is a non-empty array
      if (!ipWhitelist || !Array.isArray(ipWhitelist) || ipWhitelist.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid IP address(es)' });
      }

      // Filter invalid IPs using net.isIP and reject '*' or '0.0.0.0/0' wildcards
      const invalidIps = ipWhitelist.filter(ip => {
        if (typeof ip !== 'string') return true;
        const trimmed = ip.trim();
        if (trimmed === '' || trimmed === '*' || trimmed === '0.0.0.0/0') return true;
        return !net.isIP(trimmed);
      });

      if (invalidIps.length > 0) {
        return res.status(400).json({ success: false, message: 'Invalid IP address(es)' });
      }

      // Remove duplicates and store clean IPs
      const cleanIps = [...new Set(ipWhitelist.map(ip => ip.trim()))];

      // Generate vh_live_xxxxxxxxxxxxxxxxx
      const randomHex = crypto.randomBytes(12).toString('hex');
      const keyString = `vh_live_${randomHex}`;
      const keyHash = hashKey(keyString);
      const keyMasked = maskKey(keyString);

      const key = await prisma.apiKey.create({
        data: {
          keyHash,
          keyMasked,
          name,
          userId: req.user.id,
          organizationId: req.user.organizationId,
          rateLimit: rateLimit || 60,
          usageLimit: usageLimit || null,
          usageCount: 0,
          ipWhitelist: cleanIps,
          permissions: permissions || ['*'],
          status: 'ACTIVE'
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'API_KEY_CREATED',
          entityName: 'api_keys',
          entityId: key.id.toString(),
          newValues: { name, permissions, ipWhitelist: cleanIps }
        }
      });

      const sanitizedKey = {
        id: key.id,
        name: key.name,
        key: keyString, // Return raw key ONCE on creation
        rateLimit: key.rateLimit,
        usageLimit: key.usageLimit,
        usageCount: key.usageCount,
        ipWhitelist: key.ipWhitelist,
        permissions: key.permissions,
        status: key.status,
        createdAt: key.createdAt
      };

      return res.status(201).json({ success: true, key: sanitizedKey });
    } catch (error) {
      logger.error('Create API Key error: %O', error);
      return res.status(500).json({ error: 'Failed to generate API key.' });
    }
  }

  static async revoke(req, res) {
    try {
      const { id } = req.params;
      const keyId = parseInt(id, 10);
      if (isNaN(keyId)) {
        return res.status(400).json({ error: 'Invalid API key ID.' });
      }

      const isAdmin = req.role === 'Super Admin' || req.role === 'Admin';
      const whereClause = isAdmin ? { id: keyId, deletedAt: null } : { id: keyId, userId: req.user.id, deletedAt: null };

      const key = await prisma.apiKey.findFirst({
        where: whereClause
      });

      if (!key) {
        return res.status(404).json({ error: 'API key not found.' });
      }

      // Soft delete ApiKey
      await prisma.apiKey.update({
        where: { id: key.id },
        data: {
          deletedAt: new Date(),
          status: 'REVOKED'
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'API_KEY_REVOKED',
          entityName: 'api_keys',
          entityId: key.id.toString(),
          oldValues: { name: key.name, status: key.status },
          newValues: { status: 'REVOKED', deletedAt: new Date() }
        }
      });

      return res.status(200).json({ success: true, message: 'API key deleted successfully.' });
    } catch (error) {
      logger.error('Revoke API Key error: %O', error);
      return res.status(500).json({ error: 'Failed to delete API key.' });
    }
  }

  static async regenerate(req, res) {
    try {
      const { id } = req.params;
      const keyId = parseInt(id, 10);
      if (isNaN(keyId)) {
        return res.status(400).json({ error: 'Invalid API key ID.' });
      }

      const key = await prisma.apiKey.findFirst({
        where: { id: keyId, userId: req.user.id, deletedAt: null }
      });

      if (!key) {
        return res.status(404).json({ error: 'API key not found.' });
      }

      const randomHex = crypto.randomBytes(12).toString('hex');
      const newKeyString = `vh_live_${randomHex}`;
      const newKeyHash = hashKey(newKeyString);
      const newKeyMasked = maskKey(newKeyString);
      const oldKeyHash = key.keyHash;

      await prisma.apiKey.update({
        where: { id: key.id },
        data: {
          keyHash: newKeyHash,
          keyMasked: newKeyMasked,
          status: 'ACTIVE'
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'API_KEY_REGENERATED',
          entityName: 'api_keys',
          entityId: key.id.toString(),
          oldValues: { keyHash: oldKeyHash, status: key.status },
          newValues: { keyHash: newKeyHash, status: 'ACTIVE' }
        }
      });

      return res.status(200).json({
        success: true,
        message: 'API key regenerated successfully.',
        key: newKeyString // Return raw key ONCE
      });
    } catch (error) {
      logger.error('Regenerate API Key error: %O', error);
      return res.status(500).json({ error: 'Failed to regenerate API key.' });
    }
  }
}

module.exports = ApiKeyController;
