const prisma = require('../lib/prisma');
const logger = require('../config/logger');

class ProviderResolver {
  /**
   * Resolves the primary and backup providers for a given service.
   * @param {string} serviceType - The verification service code (e.g., 'PAN', 'GST')
   * @returns {Promise<object>} Returns { primaryProvider, backupProvider }
   */
  static async resolveProviders(serviceType) {
    try {
      const type = serviceType.toUpperCase().trim();
      const route = await prisma.providerRoute.findFirst({
        where: { serviceType: type, activeStatus: true }
      });

      if (!route) {
        logger.error(`No active routing rule defined for service type: ${type}`);
        throw new Error(`Routing configuration missing for service "${type}"`);
      }

      // Fetch primary provider
      const primaryProvider = await prisma.provider.findUnique({
        where: { id: route.primaryProviderId }
      });
      if (!primaryProvider) {
        throw new Error(`Primary provider with ID ${route.primaryProviderId} not found.`);
      }

      // Fetch backup provider if configured
      let backupProvider = null;
      if (route.backupProviderId) {
        backupProvider = await prisma.provider.findUnique({
          where: { id: route.backupProviderId }
        });
      }

      logger.info(`Resolved routing for ${type}: Primary = ${primaryProvider.code}, Backup = ${backupProvider ? backupProvider.code : 'None'}`);

      return {
        primaryProvider,
        backupProvider
      };
    } catch (error) {
      logger.error('Error in ProviderResolver.resolveProviders: %O', error);
      throw error;
    }
  }
}

module.exports = ProviderResolver;
