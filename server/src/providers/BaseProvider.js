const logger = require('../config/logger');

class BaseProvider {
  constructor(name, code, credentials = {}) {
    this.name = name;
    this.code = code;
    this.credentials = credentials;
  }

  async verifyPAN(pan, payload) {
    throw new Error(`verifyPAN is not implemented for provider ${this.name}`);
  }

  async verifyGST(gstin, payload) {
    throw new Error(`verifyGST is not implemented for provider ${this.name}`);
  }


  async verifyAadhaar(aadhaarNumber, payload) {
    throw new Error(`verifyAadhaar is not implemented for provider ${this.name}`);
  }

  async verifyAadhaarOtp(otp, transactionId, payload) {
    throw new Error(`verifyAadhaarOtp is not implemented for provider ${this.name}`);
  }

  async verifyVoterId(voterId, payload) {
    throw new Error(`verifyVoterId is not implemented for provider ${this.name}`);
  }

  // Simulate network latency (between 100ms and 800ms) for mock testing
  async simulateLatency() {
    const delay = Math.floor(Math.random() * 700) + 100;
    await new Promise(resolve => setTimeout(resolve, delay));
    return delay;
  }
}

module.exports = BaseProvider;
