const axios = require('axios');
const logger = require('../config/logger');

class SmsService {
  static async sendOtp(phone, otp) {
    try {
      const apiKey = process.env.NXTBYTE_API_KEY || '1775873dbab74f10bebf';
      
      // Phase 1 — Temporary logs
      let cleanPhone = phone;
      if (!cleanPhone.startsWith("91")) {
        cleanPhone = `91${cleanPhone}`;
      }

      const message = `Your Dizipay OTP is ${otp}. Valid for 5 minutes. Do not share.`;
      
      // URL format construction
      const url = `https://nxtbyte.in/api/send-text?api_key=${apiKey}&number=${cleanPhone}&msg=${encodeURIComponent(message)}`;
      
      console.log("OTP Request Phone:", phone);
      console.log("Generated OTP:", otp);
      console.log("NXTBYTE API KEY:", process.env.NXTBYTE_API_KEY);
      console.log("NXTBYTE URL:", url);

      // Deliver via GET
      const response = await axios.get(url);

      // Phase 1 — Log provider response
      console.log("NXTBYTE RESPONSE:", response.data);
      
      return response.data;
    } catch (error) {
      const errorResponse = error.response?.data || error.message;
      console.log("NXTBYTE RESPONSE:", errorResponse);
      logger.error(`Failed to send SMS to ${phone} via NxtByte: ${error.message}`);
      throw error;
    }
  }
}

module.exports = SmsService;
