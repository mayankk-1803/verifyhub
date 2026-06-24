const BaseProvider = require('./BaseProvider');

class KarzaProvider extends BaseProvider {
  constructor(credentials) {
    super('Karza Data', 'karza', credentials);
  }

  async verifyPAN(pan, payload) {
    const latency = await this.simulateLatency();
    const cleanPan = pan.toUpperCase().trim();
    
    return {
      success: true,
      latency,
      data: {
        pan: cleanPan,
        name: 'MAYANK KUMAR SHARMA',
        status: 'VALID',
        aadhaarSeedingStatus: 'Y',
        lastUpdated: '2026-06-20'
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
        legalName: 'DIZIPAY TECHNOLOGIES PRIVATE LIMITED',
        status: 'Active',
        jurisdiction: 'State - Telangana'
      }
    };
  }


}

module.exports = KarzaProvider;
