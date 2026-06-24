const logger = require('../config/logger');

async function verify(providerInstance, body) {
  const panNo = (body.pan_no || body.pan || '').toUpperCase().trim();
  if (!panNo) {
    throw new Error('Parameter "pan_no" is required for PAN Verification.');
  }
  const appNo = body.application_no || '';
  const apiKey = body.api_key || 'upbgroup';
  const startTime = Date.now();
  try {
    const url = `https://server.webtechly.co.in/pan_details?api_key=${encodeURIComponent(apiKey)}&pan_no=${encodeURIComponent(panNo)}&application_no=${encodeURIComponent(appNo)}`;
    logger.info(`PAN Verification Adapter calling WebTechly provider URL: ${url}`);
    const response = await fetch(url);
    const latency = Date.now() - startTime;
    if (!response.ok) {
      throw new Error(`Provider returned HTTP status ${response.status}`);
    }
    const data = await response.json();
    return { success: true, latency, data };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error(`PAN Verification Adapter error: ${error.message}`);
    return {
      success: false,
      latency,
      error: { code: 'PROVIDER_ERROR', message: error.message }
    };
  }
}

module.exports = { verify };
