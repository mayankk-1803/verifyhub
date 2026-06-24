const logger = require('../config/logger');

async function verify(providerInstance, body) {
  const gstin = (body.gstin || body.gst || '').toUpperCase().trim();
  if (!gstin) {
    throw new Error('Parameter "gstin" is required for GST Company Info Verification.');
  }
  const startTime = Date.now();
  try {
    const url = `https://razorpay.com/api/gstin/${encodeURIComponent(gstin)}`;
    logger.info(`GST Company Info Adapter calling Razorpay URL: ${url}`);
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
        legal_name: data.legal_name || data.tradeName || data.name || '',
        constitution: data.constitution || data.constitutionOfBusiness || '',
        gstin: data.gstin || gstin,
        status: data.status || 'ACTIVE',
        tax_payer_type: data.tax_payer_type || data.taxpayerType || '',
        registration_date: data.registration_date || data.registrationDate || '',
        state_jurisdiction: data.state_jurisdiction || data.stateCode || '',
        central_jurisdiction: data.central_jurisdiction || ''
      }
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error(`GST Company Info Adapter error: ${error.message}`);
    return {
      success: false,
      latency,
      error: { code: 'PROVIDER_ERROR', message: error.message }
    };
  }
}

module.exports = { verify };
