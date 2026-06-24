const prisma = require('../lib/prisma');
const logger = require('../config/logger');

class PricingEngine {
  /**
   * Determine the API call cost for a specific user and service type.
   * Resolves in precedence: Custom User Pricing -> Role Pricing -> Global Default Pricing.
   * @param {string} serviceType - The verification service (e.g. 'PAN', 'GST')
   * @param {object} user - The requesting user object containing roleId and id
   * @returns {Promise<object>} Price rules object containing sellingPrice and providerCost
   */
  static async calculateCost(serviceType, user) {
    try {
      const type = serviceType.toUpperCase().trim();
      
      // 1. Check custom user-specific pricing rule
      if (user && user.id) {
        const userRule = await prisma.pricingRule.findFirst({
          where: { serviceType: type, userId: user.id }
        });
        if (userRule) {
          logger.info(`Resolved custom user pricing for ${type} (User ID: ${user.id}): ₹${userRule.sellingPrice}`);
          return userRule;
        }
      }

      // 2. Check role-specific pricing rule
      if (user && user.roleId) {
        const roleRule = await prisma.pricingRule.findFirst({
          where: { serviceType: type, roleId: user.roleId, userId: null }
        });
        if (roleRule) {
          logger.info(`Resolved role pricing for ${type} (Role ID: ${user.roleId}): ₹${roleRule.sellingPrice}`);
          return roleRule;
        }
      }

      // 3. Fallback to global default pricing rule (where userId is null and roleId is null)
      const defaultRule = await prisma.pricingRule.findFirst({
        where: { serviceType: type, userId: null, roleId: null }
      });

      if (!defaultRule) {
        logger.error(`No pricing rule configured for service: ${type}`);
        throw new Error(`Pricing rule not configured for service ${type}`);
      }

      logger.info(`Resolved global default pricing for ${type}: ₹${defaultRule.sellingPrice}`);
      return defaultRule;
    } catch (error) {
      logger.error('Error in PricingEngine.calculateCost: %O', error);
      throw error;
    }
  }
}

module.exports = PricingEngine;
