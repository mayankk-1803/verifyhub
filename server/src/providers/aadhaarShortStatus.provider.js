const logger = require('../config/logger');

async function verify(providerInstance, body) {
  const aadharNo = (body.aadhar || body.aadhar_no || body.aadhaarNumber || '').replace(/\s+/g, '');
  if (!aadharNo) {
    throw new Error('Parameter "aadhar" is required for Aadhaar Short Status Verification.');
  }
  const apiKey = process.env.WEBTECHLY_API_KEY || '516a21-fa3547-a22fa5-8acabb-7bce85';
  const startTime = Date.now();
  try {
    const url = `https://server.webtechly.co.in/backend/short.php?api_key=${encodeURIComponent(apiKey)}&aadhar=${encodeURIComponent(aadharNo)}`;
    logger.info(`Aadhaar Short Status Adapter calling WebTechly provider URL: ${url}`);
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
        status: data.status || 'SUCCESS',
        code: data.code || 200,
        pan_no: data.pan_no || data.panNumber || '',
        message: data.message || 'Details fetched successfully.'
      }
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error(`Aadhaar Short Status Adapter error: ${error.message}`);
    return {
      success: false,
      latency,
      error: { code: 'PROVIDER_ERROR', message: error.message }
    };
  }
}

module.exports = { verify };
