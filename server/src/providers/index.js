const SurepassProvider = require('./SurepassProvider');
const SignzyProvider = require('./SignzyProvider');
const KarzaProvider = require('./KarzaProvider');
const DigitapProvider = require('./DigitapProvider');
const PlanApiProvider = require('./PlanApiProvider');
const logger = require('../config/logger');

const providersMap = {
  surepass: SurepassProvider,
  signzy: SignzyProvider,
  karza: KarzaProvider,
  digitap: DigitapProvider,
  planapi: PlanApiProvider
};

/**
 * Resolves the class instance of a verification provider based on code.
 * @param {string} code - Provider code (e.g., 'surepass', 'signzy')
 * @param {object} credentials - Credentials override if configured
 * @returns {BaseProvider} Instantiated provider adapter
 */
function getProvider(code, credentials = {}) {
  const ProviderClass = providersMap[code.toLowerCase()];
  if (!ProviderClass) {
    logger.error(`Unknown provider requested: ${code}`);
    throw new Error(`Provider adapter for code "${code}" not found.`);
  }
  return new ProviderClass(credentials);
}

module.exports = {
  getProvider,
  providersMap
};
