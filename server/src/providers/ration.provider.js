const logger = require('../config/logger');

async function verify(providerInstance, body) {
  const ration = (body.ration || '').trim();
  if (!ration) {
    throw new Error('Parameter "ration" is required for Ration Verification.');
  }
  const apiKey = body.api_key || 'apikey';
  const startTime = Date.now();
  try {
    const url = `https://server.webtechly.co.in/ration?api_key=${encodeURIComponent(apiKey)}&ration=${encodeURIComponent(ration)}`;
    logger.info(`Ration Adapter calling WebTechly provider URL: ${url}`);
    const response = await fetch(url);
    const latency = Date.now() - startTime;
    if (!response.ok) {
      throw new Error(`Provider returned HTTP status ${response.status}`);
    }
    const data = await response.json();
    return { success: true, latency, data };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error(`Ration Adapter error: ${error.message}`);
    return {
      success: false,
      latency,
      error: { code: 'PROVIDER_ERROR', message: error.message }
    };
  }
}

module.exports = { verify };
