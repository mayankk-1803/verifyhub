const axios = require('axios');
require('dotenv').config();

const WEBTECHLY_API_KEY = process.env.WEBTECHLY_API_KEY || '516a21-fa3547-a22fa5-8acabb-7bce85';

// Hardened Axios client with 15s timeout
const kycClient = axios.create({
  timeout: 15000
});

// Retry helper with exponential backoff
const requestWithRetry = async (config, retries = 2, delay = 1000) => {
  let lastError;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const response = await kycClient(config);
      return response.data;
    } catch (error) {
      lastError = error;
      const isTimeoutOrNetwork = error.code === 'ECONNABORTED' || !error.response || error.response.status >= 500;
      
      if (isTimeoutOrNetwork && attempt <= retries) {
        console.warn(`Axios to ${config.url} failed (Attempt ${attempt}/${retries + 1}). Retrying in ${currentDelay}ms... Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= 2;
        continue;
      }
      break;
    }
  }
  throw lastError;
};

class KycService {
  /**
   * Aadhaar OTP Send
   * GET https://server.webtechly.co.in/send-otp
   * Params: no=aadhaar_number
   */
  static async sendAadhaarOtp(aadhaarNumber) {
    try {
      return await requestWithRetry({
        method: 'get',
        url: 'https://server.webtechly.co.in/send-otp',
        params: {
          no: aadhaarNumber
        }
      });
    } catch (error) {
      console.error('WebTechly sendAadhaarOtp error:', error.message);
      throw new Error(error.response?.data?.message || 'Aadhaar OTP Send API failure');
    }
  }

  /**
   * Aadhaar Details Fetch
   * GET https://server.webtechly.co.in/fetch-info
   * Params: api_key, otp, client_id
   */
  static async fetchAadhaarDetails(otp, clientId) {
    try {
      return await requestWithRetry({
        method: 'get',
        url: 'https://server.webtechly.co.in/fetch-info',
        params: {
          api_key: WEBTECHLY_API_KEY,
          otp: otp,
          client_id: clientId
        }
      });
    } catch (error) {
      console.error('WebTechly fetchAadhaarDetails error:', error.message);
      throw new Error(error.response?.data?.message || 'Aadhaar details fetch API failure');
    }
  }
}

module.exports = KycService;
