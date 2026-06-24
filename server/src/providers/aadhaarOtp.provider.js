const logger = require('../config/logger');

async function verify(providerInstance, body) {
  const apiKey = body.api_key || 'API_KEY_HERE';
  const startTime = Date.now();

  try {
    let url;
    if (body.otp && body.client_id) {
      url = `https://server.webtechly.co.in/fetch-info?api_key=${encodeURIComponent(apiKey)}&otp=${encodeURIComponent(body.otp)}&client_id=${encodeURIComponent(body.client_id)}`;
    } else if (body.application_no && body.aadhaar_no) {
      url = `https://server.webtechly.co.in/data_fetch?api_key=${encodeURIComponent(apiKey)}&application_no=${encodeURIComponent(body.application_no)}&aadhaar_no=${encodeURIComponent(body.aadhaar_no)}`;
    } else {
      throw new Error('Required parameters missing. Either pass "otp" and "client_id", or pass "application_no" and "aadhaar_no".');
    }

    logger.info(`Aadhaar OTP/Data Adapter calling WebTechly provider URL: ${url}`);
    const response = await fetch(url);
    const latency = Date.now() - startTime;
    if (!response.ok) {
      throw new Error(`Provider returned HTTP status ${response.status}`);
    }
    const data = await response.json();
    return { success: true, latency, data };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error(`Aadhaar OTP/Data Adapter error: ${error.message}`);
    return {
      success: false,
      latency,
      error: { code: 'PROVIDER_ERROR', message: error.message }
    };
  }
}

module.exports = { verify };
