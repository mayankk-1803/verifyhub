const logger = require('../config/logger');

async function verify(providerInstance, body) {
  const rationNo = (body.ration || body.ration_no || body.rationNumber || '').trim();
  if (!rationNo) {
    throw new Error('Parameter "ration" is required for Ration Card Verification.');
  }
  const apiKey = process.env.WEBTECHLY_API_KEY || '516a21-fa3547-a22fa5-8acabb-7bce85';
  const startTime = Date.now();
  try {
    const url = `https://server.webtechly.co.in/backend/ration.php?api_key=${encodeURIComponent(apiKey)}&ration=${encodeURIComponent(rationNo)}`;
    logger.info(`Ration Card Verify Adapter calling WebTechly provider URL: ${url}`);
    const response = await fetch(url);
    const latency = Date.now() - startTime;
    if (!response.ok) {
      throw new Error(`Provider returned HTTP status ${response.status}`);
    }
    const data = await response.json();
    return {
      success: true,
      latency,
      data: {
        ration_number: rationNo,
        status: data.status || 'ACTIVE',
        response: data.response || data
      }
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error(`Ration Card Verify Adapter error: ${error.message}`);
    return {
      success: false,
      latency,
      error: { code: 'PROVIDER_ERROR', message: error.message }
    };
  }
}

module.exports = { verify };
