const logger = require('../config/logger');

async function verify(providerInstance, body) {
  const epic = (body.epic || '').toUpperCase().trim();
  if (!epic) {
    throw new Error('Parameter "epic" is required for Voter Verification.');
  }
  const apiKey = body.api_key || 'apikey';
  const startTime = Date.now();
  try {
    const url = `https://server.webtechly.co.in/voter/verify?api_key=${encodeURIComponent(apiKey)}&epic=${encodeURIComponent(epic)}`;
    logger.info(`Voter Adapter calling WebTechly provider URL: ${url}`);
    const response = await fetch(url);
    const latency = Date.now() - startTime;
    if (!response.ok) {
      throw new Error(`Provider returned HTTP status ${response.status}`);
    }
    const data = await response.json();
    return { success: true, latency, data };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error(`Voter Adapter error: ${error.message}`);
    return {
      success: false,
      latency,
      error: { code: 'PROVIDER_ERROR', message: error.message }
    };
  }
}

module.exports = { verify };
