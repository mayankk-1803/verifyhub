const BaseProvider = require('./BaseProvider');

class SignzyProvider extends BaseProvider {
  constructor(credentials) {
    super('Signzy Kyc', 'signzy', credentials);
  }

  async verifyPAN(pan, payload) {
    const latency = await this.simulateLatency();
    const cleanPan = pan.toUpperCase().trim();
    
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      return {
        success: false,
        latency,
        error: { code: 'INVALID_PAN_NUMBER', message: 'Signzy: PAN is invalid.' }
      };
    }

    return {
      success: true,
      latency,
      data: {
        panNumber: cleanPan,
        nameOnCard: 'MAYANK KUMAR SHARMA',
        panStatus: 'Active',
        aadhaarSeedingStatus: 'Linked',
        first_name: 'MAYANK',
        last_name: 'SHARMA',
        dob: '18/03/1998'
      }
    };
  }

  async verifyGST(gstin, payload) {
    const latency = await this.simulateLatency();
    const cleanGst = gstin.toUpperCase().trim();

    if (cleanGst.length !== 15) {
      return {
        success: false,
        latency,
        error: { code: 'GST_VERIFY_FAILED', message: 'Signzy: Length verification failed.' }
      };
    }

    return {
      success: true,
      latency,
      data: {
        gstin: cleanGst,
        tradeName: 'DIZIPAY TECHNOLOGIES PRIVATE LIMITED',
        businessType: 'Private Limited Company',
        status: 'Active',
        filingDetails: [
          { year: '2025-2026', period: 'GSTR-3B', status: 'Filed' },
          { year: '2025-2026', period: 'GSTR-1', status: 'Filed' }
        ]
      }
    };
  }


}

module.exports = SignzyProvider;
