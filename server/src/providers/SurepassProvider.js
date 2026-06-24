const BaseProvider = require('./BaseProvider');

class SurepassProvider extends BaseProvider {
  constructor(credentials) {
    super('Surepass APIs', 'surepass', credentials);
  }

  async verifyPAN(pan, payload) {
    const latency = await this.simulateLatency();
    const cleanPan = pan.toUpperCase().trim();
    
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      return {
        success: false,
        latency,
        error: { code: 'INVALID_PAN_FORMAT', message: 'The provided PAN format is invalid.' }
      };
    }

    return {
      success: true,
      latency,
      data: {
        pan: cleanPan,
        name: 'MAYANK KUMAR SHARMA',
        firstName: 'MAYANK',
        middleName: 'KUMAR',
        lastName: 'SHARMA',
        category: 'INDIVIDUAL',
        gender: 'MALE',
        dateOfBirth: '1998-03-18',
        aadhaarLinked: true,
        status: 'VALID',
        message: 'PAN Card exists and active.'
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
        error: { code: 'INVALID_GST_FORMAT', message: 'GSTIN must be 15 characters long.' }
      };
    }

    return {
      success: true,
      latency,
      data: {
        gstin: cleanGst,
        legalName: 'DIZIPAY TECHNOLOGIES PRIVATE LIMITED',
        tradeName: 'DIZIPAY',
        registrationDate: '2023-05-12',
        constitutionOfBusiness: 'Private Limited Company',
        taxpayerType: 'Regular',
        gstinStatus: 'ACTIVE',
        address: 'PLOT NO. 45, HIGHTECH CITY, HYDERABAD, TELANGANA, 500081',
        stateCode: cleanGst.substring(0, 2),
        natureOfBusiness: ['Software development', 'SaaS platform provisioning']
      }
    };
  }



  async verifyAadhaar(aadhaarNumber, payload) {
    const latency = await this.simulateLatency();
    const cleanUid = aadhaarNumber.replace(/\s+/g, '');
    if (cleanUid.length !== 12 || isNaN(cleanUid)) {
      return {
        success: false,
        latency,
        error: { code: 'INVALID_AADHAAR_FORMAT', message: 'Aadhaar must be exactly 12 numeric digits.' }
      };
    }
    return {
      success: true,
      latency,
      data: {
        transactionId: `tx_aadhaar_${Math.random().toString(36).substring(2, 11)}`,
        message: 'OTP Sent successfully to registered mobile number (******4839).'
      }
    };
  }

  async verifyAadhaarOtp(otp, transactionId, payload) {
    const latency = await this.simulateLatency();
    if (otp !== '123456') {
      return {
        success: false,
        latency,
        error: { code: 'OTP_EXPIRED_OR_INVALID', message: 'The entered OTP is incorrect or expired.' }
      };
    }
    return {
      success: true,
      latency,
      data: {
        aadhaarNumber: 'XXXXXXXX8940',
        fullName: 'MAYANK SHARMA',
        gender: 'MALE',
        dob: '1998-03-18',
        address: {
          careOf: 'S/O ASHOK KUMAR SHARMA',
          house: 'House No. 34',
          street: 'Main Street Sector 2',
          village: 'Jaipur',
          district: 'Jaipur',
          state: 'Rajasthan',
          pincode: '302015'
        },
        image: 'data:image/jpeg;base64,...'
      }
    };
  }
}

module.exports = SurepassProvider;
