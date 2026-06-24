const logger = require('../config/logger');

async function verify(providerInstance, body) {
  const pan = (body.pan || body.pan_number || '').toUpperCase().trim();
  if (!pan) {
    throw new Error('Parameter "pan" is required for PAN Basic Verification.');
  }
  const apiKey = body.api_key || 'apikey';
  const startTime = Date.now();
  try {
    const url = `https://server.webtechly.co.in/pan-basic?api_key=${encodeURIComponent(apiKey)}&pan=${encodeURIComponent(pan)}`;
    logger.info(`PAN Basic Adapter calling WebTechly provider URL: ${url}`);
    const response = await fetch(url);
    const latency = Date.now() - startTime;
    if (!response.ok) {
      throw new Error(`Provider returned HTTP status ${response.status}`);
    }
    const data = await response.json();
    return { success: true, latency, data };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error(`PAN Basic Adapter error: ${error.message}`);
    return {
      success: false,
      latency,
      error: { code: 'PROVIDER_ERROR', message: error.message }
    };
  }
}

module.exports = { verify };
