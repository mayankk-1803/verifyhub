const BaseProvider = require('./BaseProvider');

class DigitapProvider extends BaseProvider {
  constructor(credentials) {
    super('Digitap Verification', 'digitap', credentials);
  }

  async verifyPAN(pan, payload) {
    const latency = await this.simulateLatency();
    const cleanPan = pan.toUpperCase().trim();
    
    return {
      success: true,
      latency,
      data: {
        pan: cleanPan,
        fullName: 'MAYANK KUMAR SHARMA',
        panStatus: 'ACTIVE',
        isLinkedWithAadhaar: true
      }
    };
  }

  async verifyGST(gstin, payload) {
    const latency = await this.simulateLatency();
    const cleanGst = gstin.toUpperCase().trim();

    return {
      success: true,
      latency,
      data: {
        gstin: cleanGst,
        tradeName: 'DIZIPAY TECHNOLOGIES PRIVATE LIMITED',
        gstinStatus: 'ACTIVE'
      }
    };
  }


}

module.exports = DigitapProvider;
