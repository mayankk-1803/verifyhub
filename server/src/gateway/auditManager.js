const prisma = require('../lib/prisma');
const logger = require('../config/logger');

class AuditManager {
  /**
   * Initialize a verification request log.
   */
  static async logRequest({ apiKeyId, userId, organizationId, serviceType, cost, payload, ipAddress }) {
    try {
      const request = await prisma.verificationRequest.create({
        data: {
          apiKeyId,
          userId,
          organizationId,
          serviceType: serviceType.toUpperCase(),
          status: 'PENDING',
          cost,
          payload,
          ipAddress
        }
      });
      return request;
    } catch (error) {
      logger.error('Failed to log verification request: %O', error);
      throw error;
    }
  }

  /**
   * Finalize verification log and create response mapping.
   */
  static async logResponse({ requestId, status, providerId, responseData, providerLatencyMs, errorCode, errorMessage }) {
    try {
      // 1. Update verification request status
      const reqExists = await prisma.verificationRequest.findUnique({
        where: { id: requestId }
      });
      
      let request = null;
      if (reqExists) {
        request = await prisma.verificationRequest.update({
          where: { id: requestId },
          data: {
            status: status,
            providerId: providerId || undefined
          }
        });
      }

      // 2. Create verification response log
      const response = await prisma.verificationResponse.create({
        data: {
          verificationRequestId: requestId,
          responseData,
          providerLatencyMs,
          errorCode,
          errorMessage
        }
      });

      return { request, response };
    } catch (error) {
      logger.error('Failed to log verification response: %O', error);
      // We don't throw here to avoid blocking client response if audit log insertion fails
    }
  }

  /**
   * General purpose administrative audit logging.
   */
  static async logAdminAction({ userId, organizationId, action, entityName, entityId, oldValues, newValues, ipAddress }) {
    try {
      const audit = await prisma.auditLog.create({
        data: {
          userId,
          organizationId,
          action,
          entityName,
          entityId,
          oldValues,
          newValues,
          ipAddress
        }
      });
      return audit;
    } catch (error) {
      logger.error('Failed to write admin audit log: %O', error);
    }
  }
}

module.exports = AuditManager;
