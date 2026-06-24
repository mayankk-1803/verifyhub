const logger = require('../config/logger');

async function verify(providerInstance, body) {
  const gst = (body.gst || body.gstin || '').toUpperCase().trim();
  if (!gst) {
    throw new Error('Parameter "gst" is required for GST Verification.');
  }
  const apiKey = body.api_key || 'apikey';
  const startTime = Date.now();
  try {
    const url = `https://server.webtechly.co.in/GstVerify.php?api_key=${encodeURIComponent(apiKey)}&gst=${encodeURIComponent(gst)}`;
    logger.info(`GST Adapter calling WebTechly provider URL: ${url}`);
    const response = await fetch(url);
    const latency = Date.now() - startTime;
    if (!response.ok) {
      throw new Error(`Provider returned HTTP status ${response.status}`);
    }
    const data = await response.json();
    return { success: true, latency, data };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error(`GST Adapter error: ${error.message}`);
    return {
      success: false,
      latency,
      error: { code: 'PROVIDER_ERROR', message: error.message }
    };
  }
}

module.exports = { verify };
