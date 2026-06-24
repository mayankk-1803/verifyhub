const logger = require('../config/logger');

async function verify(providerInstance, body) {
  const encData = (body.encData || '').trim();
  if (!encData) {
    throw new Error('Parameter "encData" is required for NSDL Decode.');
  }
  const startTime = Date.now();
  try {
    const url = `https://server.webtechly.co.in/nsdl_decode.php?encData=${encodeURIComponent(encData)}`;
    logger.info(`NSDL Decode Adapter calling WebTechly provider URL: ${url}`);
    const response = await fetch(url);
    const latency = Date.now() - startTime;
    if (!response.ok) {
      throw new Error(`Provider returned HTTP status ${response.status}`);
    }
    const data = await response.json();
    return { success: true, latency, data };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error(`NSDL Decode Adapter error: ${error.message}`);
    return {
      success: false,
      latency,
      error: { code: 'PROVIDER_ERROR', message: error.message }
    };
  }
}

module.exports = { verify };
