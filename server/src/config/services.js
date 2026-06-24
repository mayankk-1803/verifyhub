const services = [
  {
    key: 'GST_VERIFY',
    name: 'GST Verification',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/gst/verify',
    description: 'Verify corporate GSTIN tax filings, status, legal name, and registered addresses.',
    successRate: '99.8%',
    latency: '200ms',
    price: '₹1.00',
    inputFields: [
      { name: 'gst', label: 'Corporate GSTIN', placeholder: 'Enter GST Number', required: true, type: 'text' }
    ],
    sampleRequest: { gst: '29AACCF1132H2ZX' },
    sampleResponse: {
      success: true,
      requestId: 'req_gst123',
      serviceType: 'GST_VERIFY',
      latencyMs: 195,
      provider: 'karza',
      data: {
        gstin: '29AACCF1132H2ZX',
        legalName: 'DIZIPAY SOLUTIONS PRIVATE LIMITED',
        registrationDate: '2023-05-12',
        constitutionOfBusiness: 'Private Limited Company',
        gstinStatus: 'ACTIVE',
        address: 'PLOT NO. 45, HIGHTECH CITY, HYDERABAD, TELANGANA, 500081'
      }
    }
  },
  {
    key: 'PAN_CARD',
    name: 'PAN Verification',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/pan/verify',
    description: 'Verify PAN card details against national database and fetch matching holder name.',
    successRate: '99.9%',
    latency: '145ms',
    price: '₹1.00',
    inputFields: [
      { name: 'pan_number', label: 'PAN Card Number', placeholder: 'Enter PAN Number', required: true, type: 'text' }
    ],
    sampleRequest: { pan_number: 'ABCDE1234F' },
    sampleResponse: {
      success: true,
      requestId: 'req_pan123',
      serviceType: 'PAN_CARD',
      latencyMs: 135,
      provider: 'surepass',
      data: {
        pan: 'ABCDE1234F',
        name: 'MAYANK KUMAR SHARMA',
        firstName: 'MAYANK',
        middleName: 'KUMAR',
        lastName: 'SHARMA',
        category: 'INDIVIDUAL',
        gender: 'MALE',
        dateOfBirth: '1998-03-18',
        aadhaarLinked: true,
        status: 'VALID',
        message: 'PAN Card exists and is active.'
      }
    }
  },
  {
    key: 'PAN_BASIC',
    name: 'PAN Basic',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/pan-basic/verify',
    description: 'Check active status and basic validation metrics on PAN database records.',
    successRate: '99.9%',
    latency: '80ms',
    price: '₹0.50',
    inputFields: [
      { name: 'pan', label: 'PAN Card Number', placeholder: 'Enter PAN Number', required: true, type: 'text' }
    ],
    sampleRequest: { pan: 'ABCDE1234F' },
    sampleResponse: {
      success: true,
      requestId: 'req_panbasic123',
      serviceType: 'PAN_BASIC',
      latencyMs: 75,
      provider: 'surepass',
      data: {
        pan: 'ABCDE1234F',
        status: 'VALID',
        verifiedAt: '2023-11-10T12:00:00Z'
      }
    }
  },
  {
    key: 'PAN_VERIFICATION',
    name: 'PAN Verification Advanced',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/pan-verification/verify',
    description: 'Execute standard validation checks on a PAN card for corporate compliance audits.',
    successRate: '99.9%',
    latency: '150ms',
    price: '₹0.60',
    inputFields: [
      { name: 'pan_no', label: 'PAN Card Number', placeholder: 'Enter PAN Number', required: true, type: 'text' },
      { name: 'application_no', label: 'Application Number', placeholder: 'Enter Application Number', required: false, type: 'text' }
    ],
    sampleRequest: { pan_no: 'ABCDE1234F', application_no: 'app_12345' },
    sampleResponse: {
      success: true,
      requestId: 'req_panverify123',
      serviceType: 'PAN_VERIFICATION',
      latencyMs: 140,
      provider: 'surepass',
      data: {
        pan: 'ABCDE1234F',
        status: 'VALID',
        name: 'MAYANK KUMAR SHARMA',
        category: 'INDIVIDUAL',
        verifiedAt: '2023-11-10T12:00:00Z'
      }
    }
  },
  {
    key: 'PAN_DECODE',
    name: 'PAN Decode',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/pan-decode/verify',
    description: 'Decode detailed registries for cardholder category, issuing authority, and profile logs.',
    successRate: '99.9%',
    latency: '120ms',
    price: '₹1.20',
    inputFields: [
      { name: 'encData', label: 'Encoded Data', placeholder: 'Enter Encoded Data', required: true, type: 'text' }
    ],
    sampleRequest: { encData: 'enc_nsdl_data_here' },
    sampleResponse: {
      success: true,
      requestId: 'req_pandecode123',
      serviceType: 'PAN_DECODE',
      latencyMs: 115,
      provider: 'surepass',
      data: {
        pan: 'ABCDE1234F',
        category: 'INDIVIDUAL',
        issuingAuthority: 'UTI/ITD',
        status: 'VALID',
        verifiedAt: '2023-11-10T12:00:00Z'
      }
    }
  },
  {
    key: 'PAN_TRACK',
    name: 'PAN Track',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/pancard_status',
    description: 'Track dispatch, processing status, and SpeedPost AWB details of PAN card applications.',
    successRate: '99.7%',
    latency: '120ms',
    price: '₹1.50',
    inputFields: [
      { name: 'application_no', label: 'Application Number', placeholder: 'Enter Application Number', required: true, type: 'text' }
    ],
    sampleRequest: { application_no: '881023947832' },
    sampleResponse: {
      success: true,
      requestId: 'req_pantrack123',
      serviceType: 'PAN_TRACK',
      latencyMs: 110,
      provider: 'surepass',
      data: {
        status: 'DISPATCHED',
        response_code: 200,
        ack_no: 'ACK881023947832',
        message: 'Your PAN card has been successfully processed and dispatched.'
      }
    }
  },
  {
    key: 'AADHAAR_OTP',
    name: 'Aadhaar Demographics (OTP)',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/aadhaar-otp/verify',
    description: 'Retrieve verified citizen demographics, address, and profile details using Aadhaar OTP verification.',
    successRate: '99.5%',
    latency: '300ms',
    price: '₹3.50',
    inputFields: [
      { name: 'aadhaar_no', label: 'Aadhaar Number', placeholder: 'Enter Aadhaar Number', required: true, type: 'text' },
      { name: 'otp', label: 'One-Time Password (OTP)', placeholder: 'Enter OTP', required: false, type: 'text' }
    ],
    sampleRequest: { aadhaar_no: '123456789012' },
    sampleResponse: {
      success: true,
      requestId: 'req_aadhaarotp123',
      serviceType: 'AADHAAR_OTP',
      latencyMs: 290,
      provider: 'surepass',
      data: {
        fullName: 'MAYANK KUMAR SHARMA',
        gender: 'MALE',
        dateOfBirth: '1998-03-18',
        address: 'H.NO 42, SECTOR 5, JAIPUR, RAJASTHAN - 302015',
        profileImage: 'data:image/jpeg;base64,...',
        verified: true
      }
    }
  },
  {
    key: 'AADHAAR_DATA',
    name: 'Aadhaar Data Verification',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/aadhaar/verify',
    description: 'Initiate Aadhaar card verification details directly with state gateways.',
    successRate: '99.5%',
    latency: '250ms',
    price: '₹6.00',
    inputFields: [
      { name: 'aadhaar_no', label: 'Aadhaar Number', placeholder: 'Enter Aadhaar Number', required: true, type: 'text' }
    ],
    sampleRequest: { aadhaar_no: '123456789012' },
    sampleResponse: {
      success: true,
      requestId: 'req_aadhaar123',
      serviceType: 'AADHAAR_DATA',
      latencyMs: 245,
      provider: 'surepass',
      data: {
        transactionId: 'tx_aadhaar_98765',
        status: 'VERIFIED',
        message: 'Aadhaar successfully verified.'
      }
    }
  },
  {
    key: 'AADHAAR_PAN',
    name: 'Aadhaar to PAN Lookup',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/aadhaar-pan/verify',
    description: 'Verify linked status and cross-match credentials between Aadhaar and PAN documents.',
    successRate: '99.6%',
    latency: '280ms',
    price: '₹2.50',
    inputFields: [
      { name: 'aadhaar', label: 'Aadhaar Number', placeholder: 'Enter Aadhaar Number', required: true, type: 'text' },
      { name: 'pan', label: 'PAN Card Number', placeholder: 'Enter PAN Number', required: true, type: 'text' }
    ],
    sampleRequest: { aadhaar: '123456789012', pan: 'ABCDE1234F' },
    sampleResponse: {
      success: true,
      requestId: 'req_aadhaarpan123',
      serviceType: 'AADHAAR_PAN',
      latencyMs: 275,
      provider: 'surepass',
      data: {
        aadhaar: '123456789012',
        pan: 'ABCDE1234F',
        linked: true,
        nameMatch: true,
        matchScore: 98.5
      }
    }
  },
  {
    key: 'RATION',
    name: 'Ration Verification',
    category: 'government',
    method: 'GET',
    endpoint: '/api/v1/ration-verify',
    description: 'Verify Ration card active status, scheme types, address, and family member details.',
    successRate: '99.3%',
    latency: '210ms',
    price: '₹2.00',
    inputFields: [
      { name: 'ration', label: 'Ration Card Number', placeholder: 'Enter Ration Card Number', required: true, type: 'text' }
    ],
    sampleRequest: { ration: '123456789012' },
    sampleResponse: {
      success: true,
      requestId: 'req_ration123',
      serviceType: 'RATION',
      latencyMs: 205,
      provider: 'signzy',
      data: {
        homeStateCode: '08',
        districtCode: '115',
        rcId: '123456789012',
        homeStateName: 'Rajasthan',
        homeDistName: 'Jaipur',
        fpsId: 'fps_jaipur_42',
        schemeName: 'Antyodaya Anna Yojana (AAY)',
        address: 'H.NO 42, SECTOR 5, JAIPUR, RAJASTHAN - 302015',
        memberDetailsList: [
          { name: 'ASHOK KUMAR SHARMA', relation: 'HEAD', age: 56 },
          { name: 'SAROJ DEVI', relation: 'WIFE', age: 50 },
          { name: 'MAYANK SHARMA', relation: 'SON', age: 28 }
        ]
      }
    }
  },
  {
    key: 'VOTER_VERIFY',
    name: 'Voter Verification',
    category: 'government',
    method: 'GET',
    endpoint: '/api/v1/voter/verify',
    description: 'Validate voter card information directly from the Indian electoral database.',
    successRate: '99.4%',
    latency: '150ms',
    price: '₹5.00',
    inputFields: [
      { name: 'epic', label: 'EPIC (Voter ID Number)', placeholder: 'Enter Voter ID', required: true, type: 'text' }
    ],
    sampleRequest: { epic: 'ABC1234567' },
    sampleResponse: {
      success: true,
      requestId: 'req_voter123',
      serviceType: 'VOTER_VERIFY',
      latencyMs: 145,
      provider: 'signzy',
      data: {
        epicNumber: 'ABC1234567',
        fullName: 'MAYANK KUMAR SHARMA',
        age: 28,
        gender: 'MALE',
        stateName: 'Rajasthan',
        districtValue: 'Jaipur',
        relationName: 'ASHOK KUMAR SHARMA',
        dob: '1998-03-18',
        address: 'H.NO 42, SECTOR 5, JAIPUR, RAJASTHAN - 302015',
        electorType: 'GENERAL'
      }
    }
  },
  {
    key: 'GST_RETURN',
    name: 'GST Return Filing Verification',
    category: 'government',
    method: 'GET',
    endpoint: '/api/v1/gst-return/verify',
    description: 'Track corporate GST filing status, returns schedule logs, and tax payment histories.',
    successRate: '99.2%',
    latency: '220ms',
    price: '₹2.50',
    inputFields: [
      { name: 'gstin', label: 'Corporate GSTIN', placeholder: 'Enter GST Number', required: true, type: 'text' },
      { name: 'financial_year', label: 'Financial Year', placeholder: 'e.g. 2023-24', required: true, type: 'text' }
    ],
    sampleRequest: { gstin: '29AACCF1132H2ZX', financial_year: '2023-24' },
    sampleResponse: {
      success: true,
      requestId: 'req_gstret123',
      serviceType: 'GST_RETURN',
      latencyMs: 210,
      provider: 'karza',
      data: {
        gstin: '29AACCF1132H2ZX',
        financialYear: '2023-24',
        filingStatus: 'COMPLETED',
        returns: [
          { returnType: 'GSTR-1', status: 'Filed', dateOfFiling: '2023-11-10' },
          { returnType: 'GSTR-3B', status: 'Filed', dateOfFiling: '2023-11-20' }
        ]
      }
    }
  },
  {
    key: 'RC_VERIFY',
    name: 'RC Verification',
    category: 'government',
    method: 'GET',
    endpoint: '/api/v1/rc-verify/verify',
    description: 'Verify registration details, owner profile, vehicle details, fitness, and insurance status.',
    successRate: '99.5%',
    latency: '180ms',
    price: '₹5.00',
    inputFields: [
      { name: 'vehicle_no', label: 'Vehicle Number', placeholder: 'Enter Vehicle Number', required: true, type: 'text' }
    ],
    sampleRequest: { vehicle_no: 'DL3CA1234' },
    sampleResponse: {
      success: true,
      requestId: 'req_rcverify123',
      serviceType: 'RC_VERIFY',
      latencyMs: 175,
      provider: 'surepass',
      data: {
        vehicleNo: 'DL3CA1234',
        ownerName: 'MAYANK SHARMA',
        makerModel: 'MARUTI SWIFT',
        registrationDate: '2020-05-15',
        fitnessUpto: '2035-05-14',
        insuranceUpto: '2025-05-14',
        status: 'ACTIVE'
      }
    }
  },
  {
    key: 'VOTER_ID_VERIFY',
    name: 'Voter ID Verification v2',
    category: 'government',
    method: 'GET',
    endpoint: '/api/v1/voter-id-verify/verify',
    description: 'Verify Voter ID details directly from Indian national electoral registries with status records.',
    successRate: '99.4%',
    latency: '140ms',
    price: '₹5.00',
    inputFields: [
      { name: 'epic', label: 'EPIC Number', placeholder: 'Enter Voter ID', required: true, type: 'text' }
    ],
    sampleRequest: { epic: 'ABC1234567' },
    sampleResponse: {
      success: true,
      requestId: 'req_voterid123',
      serviceType: 'VOTER_ID_VERIFY',
      latencyMs: 135,
      provider: 'signzy',
      data: {
        epicNumber: 'ABC1234567',
        fullName: 'MAYANK KUMAR SHARMA',
        gender: 'MALE',
        state: 'Rajasthan',
        status: 'ACTIVE'
      }
    }
  },
  {
    key: 'PASSPORT_VERIFY',
    name: 'Passport Verification',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/passport-verify/verify',
    description: 'Validate Passport files against national database records for user identity mapping.',
    successRate: '99.1%',
    latency: '260ms',
    price: '₹5.00',
    inputFields: [
      { name: 'passport_no', label: 'Passport Number', placeholder: 'Enter Passport Number', required: true, type: 'text' },
      { name: 'file_no', label: 'File Number', placeholder: 'Enter File Number', required: true, type: 'text' },
      { name: 'dob', label: 'Date of Birth', placeholder: 'YYYY-MM-DD', required: true, type: 'text' },
      { name: 'name', label: 'Holder Name', placeholder: 'Enter Name', required: true, type: 'text' }
    ],
    sampleRequest: { passport_no: 'A1234567', file_no: 'JA1234567890', dob: '1998-03-18', name: 'MAYANK SHARMA' },
    sampleResponse: {
      success: true,
      requestId: 'req_pass123',
      serviceType: 'PASSPORT_VERIFY',
      latencyMs: 255,
      provider: 'surepass',
      data: {
        passportNo: 'A1234567',
        fileNo: 'JA1234567890',
        dob: '1998-03-18',
        name: 'MAYANK SHARMA',
        status: 'VALID',
        issueDate: '2018-05-20',
        expiryDate: '2028-05-19'
      }
    }
  },
  {
    key: 'DRIVING_LICENSE_VERIFY',
    name: 'Driving Licence Verification',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/driving-license-verify/verify',
    description: 'Verify driving license details, holder profile status, validity, and vehicle classes classes.',
    successRate: '99.5%',
    latency: '200ms',
    price: '₹4.00',
    inputFields: [
      { name: 'dl_no', label: 'Driving License Number', placeholder: 'Enter License Number', required: true, type: 'text' },
      { name: 'dob', label: 'Date of Birth (YYYY-MM-DD)', placeholder: 'YYYY-MM-DD', required: true, type: 'text' }
    ],
    sampleRequest: { dl_no: 'DL-1220180004567', dob: '1998-03-18' },
    sampleResponse: {
      success: true,
      requestId: 'req_dl123',
      serviceType: 'DRIVING_LICENSE_VERIFY',
      latencyMs: 195,
      provider: 'surepass',
      data: {
        dlNo: 'DL-1220180004567',
        dob: '1998-03-18',
        holderName: 'MAYANK KUMAR SHARMA',
        status: 'ACTIVE',
        vehicleClasses: ['MCWG', 'LMV'],
        issueDate: '2016-04-12',
        expiryDate: '2036-04-11'
      }
    }
  },
  {
    key: 'MCA_COMPANY_SEARCH',
    name: 'MCA Company Search',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/mca-company-search/verify',
    description: 'Verify details of companies registered with the Ministry of Corporate Affairs.',
    successRate: '99.6%',
    latency: '210ms',
    price: '₹3.00',
    inputFields: [
      { name: 'cin', label: 'Company CIN / Name', placeholder: 'Enter CIN', required: true, type: 'text' }
    ],
    sampleRequest: { cin: 'U72900DL2022PTC394857' },
    sampleResponse: {
      success: true,
      requestId: 'req_mca123',
      serviceType: 'MCA_COMPANY_SEARCH',
      latencyMs: 205,
      provider: 'karza',
      data: {
        cin: 'U72900DL2022PTC394857',
        companyName: 'DIZIPAY SOLUTIONS PRIVATE LIMITED',
        incorporationDate: '2022-03-10',
        authorizedCapital: 1000000,
        paidUpCapital: 100000,
        status: 'ACTIVE'
      }
    }
  },
  {
    key: 'BANK_VERIFY',
    name: 'Bank Account Verification',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/bank-verify/verify',
    description: 'Validate bank account number existence and fetch matching beneficiary holder name.',
    successRate: '99.7%',
    latency: '150ms',
    price: '₹5.00',
    inputFields: [
      { name: 'account_no', label: 'Account Number', placeholder: 'Enter Account Number', required: true, type: 'text' },
      { name: 'ifsc', label: 'IFSC Code', placeholder: 'Enter IFSC', required: true, type: 'text' }
    ],
    sampleRequest: { account_no: '919876543210', ifsc: 'PYTM0123456' },
    sampleResponse: {
      success: true,
      requestId: 'req_bank123',
      serviceType: 'BANK_VERIFY',
      latencyMs: 145,
      provider: 'signzy',
      data: {
        accountNo: '919876543210',
        ifsc: 'PYTM0123456',
        beneficiaryName: 'MAYANK SHARMA',
        status: 'VERIFIED',
        bankName: 'PAYMENTS BANK'
      }
    }
  },
  {
    key: 'UPI_VERIFY',
    name: 'UPI ID Verification',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/upi-verify/verify',
    description: 'Verify virtual payment address (VPA) details and validate matching name.',
    successRate: '99.8%',
    latency: '110ms',
    price: '₹3.00',
    inputFields: [
      { name: 'upi_id', label: 'UPI ID (VPA)', placeholder: 'Enter UPI ID', required: true, type: 'text' }
    ],
    sampleRequest: { upi_id: 'mayank@upi' },
    sampleResponse: {
      success: true,
      requestId: 'req_upi123',
      serviceType: 'UPI_VERIFY',
      latencyMs: 105,
      provider: 'surepass',
      data: {
        upiId: 'mayank@upi',
        name: 'MAYANK KUMAR SHARMA',
        status: 'ACTIVE'
      }
    }
  },
  {
    key: 'VEHICLE_CHALLAN',
    name: 'Vehicle Challan Search',
    category: 'government',
    method: 'GET',
    endpoint: '/api/v1/vehicle-challan/verify',
    description: 'Search for active traffic challans, violations, penalties, and status details.',
    successRate: '99.1%',
    latency: '240ms',
    price: '₹5.00',
    inputFields: [
      { name: 'vehicle_no', label: 'Vehicle Number', placeholder: 'Enter Vehicle Number', required: true, type: 'text' }
    ],
    sampleRequest: { vehicle_no: 'DL3CA1234' },
    sampleResponse: {
      success: true,
      requestId: 'req_challan123',
      serviceType: 'VEHICLE_CHALLAN',
      latencyMs: 235,
      provider: 'surepass',
      data: {
        vehicleNo: 'DL3CA1234',
        challans: [
          { challanNo: 'DL12345678', amount: 500, date: '2023-11-01', violation: 'Speed Limit Violation', status: 'PENDING' }
        ]
      }
    }
  },
  {
    key: 'RC_ADVANCED',
    name: 'RC Verification Advanced',
    category: 'government',
    method: 'GET',
    endpoint: '/api/v1/rc-advanced/verify',
    description: 'Advanced details on vehicle registration including chasis, engine, weight, and status logs.',
    successRate: '99.5%',
    latency: '190ms',
    price: '₹5.00',
    inputFields: [
      { name: 'vehicle_no', label: 'Vehicle Number', placeholder: 'Enter Vehicle Number', required: true, type: 'text' }
    ],
    sampleRequest: { vehicle_no: 'DL3CA1234' },
    sampleResponse: {
      success: true,
      requestId: 'req_rcadv123',
      serviceType: 'RC_ADVANCED',
      latencyMs: 185,
      provider: 'surepass',
      data: {
        vehicleNo: 'DL3CA1234',
        ownerName: 'MAYANK SHARMA',
        chasisNo: 'MA3FEXXXXXXXXXX',
        engineNo: 'K12MXXXXXXX',
        bodyType: 'HATCHBACK',
        color: 'GREY',
        weight: 950,
        status: 'ACTIVE'
      }
    }
  },
  {
    key: 'RC_TO_MOBILE',
    name: 'RC to Mobile Number Search',
    category: 'government',
    method: 'GET',
    endpoint: '/api/v1/rc-to-mobile/verify',
    description: 'Retrieve the masked registered mobile number linked to a specific vehicle registration.',
    successRate: '99.3%',
    latency: '220ms',
    price: '₹5.00',
    inputFields: [
      { name: 'vehicle_no', label: 'Vehicle Number', placeholder: 'Enter Vehicle Number', required: true, type: 'text' }
    ],
    sampleRequest: { vehicle_no: 'DL3CA1234' },
    sampleResponse: {
      success: true,
      requestId: 'req_rcmob123',
      serviceType: 'RC_TO_MOBILE',
      latencyMs: 215,
      provider: 'surepass',
      data: {
        vehicleNo: 'DL3CA1234',
        mobileNo: '+91******4567',
        ownerName: 'MAYANK SHARMA'
      }
    }
  },
  {
    key: 'MOBILE_TO_RC',
    name: 'Mobile Number to RC Search',
    category: 'government',
    method: 'GET',
    endpoint: '/api/v1/mobile-to-rc/verify',
    description: 'List all registered vehicle numbers linked to a specific mobile number.',
    successRate: '99.3%',
    latency: '240ms',
    price: '₹13.00',
    inputFields: [
      { name: 'mobile_no', label: 'Mobile Number', placeholder: 'Enter Mobile Number', required: true, type: 'text' }
    ],
    sampleRequest: { mobile_no: '9876543210' },
    sampleResponse: {
      success: true,
      requestId: 'req_mobrc123',
      serviceType: 'MOBILE_TO_RC',
      latencyMs: 235,
      provider: 'surepass',
      data: {
        mobileNo: '9876543210',
        vehicles: ['DL3CA1234', 'RJ14CA5678']
      }
    }
  },
  {
    key: 'RC_LITE',
    name: 'RC Lite Verification',
    category: 'government',
    method: 'GET',
    endpoint: '/api/v1/rc-lite/verify',
    description: 'Check active status and model descriptions on vehicle registration profiles.',
    successRate: '99.6%',
    latency: '100ms',
    price: '₹3.00',
    inputFields: [
      { name: 'vehicle_no', label: 'Vehicle Number', placeholder: 'Enter Vehicle Number', required: true, type: 'text' }
    ],
    sampleRequest: { vehicle_no: 'DL3CA1234' },
    sampleResponse: {
      success: true,
      requestId: 'req_rclite123',
      serviceType: 'RC_LITE',
      latencyMs: 95,
      provider: 'surepass',
      data: {
        vehicleNo: 'DL3CA1234',
        status: 'ACTIVE',
        makerModel: 'MARUTI SWIFT'
      }
    }
  },
  {
    key: 'AADHAAR_TO_PAN',
    name: 'Aadhaar to PAN Lookup v2',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/aadhaar-pan/verify',
    description: 'Verify linked status and cross-match credentials between Aadhaar and PAN documents.',
    successRate: '99.6%',
    latency: '280ms',
    price: '₹10.00',
    inputFields: [
      { name: 'aadhaar', label: 'Aadhaar Number', placeholder: 'Enter Aadhaar Number', required: true, type: 'text' },
      { name: 'pan', label: 'PAN Card Number', placeholder: 'Enter PAN Number', required: true, type: 'text' }
    ],
    sampleRequest: { aadhaar: '123456789012', pan: 'ABCDE1234F' },
    sampleResponse: {
      success: true,
      requestId: 'req_aadhaarpan2_123',
      serviceType: 'AADHAAR_TO_PAN',
      latencyMs: 275,
      provider: 'surepass',
      data: {
        aadhaar: '123456789012',
        pan: 'ABCDE1234F',
        linked: true,
        nameMatch: true,
        matchScore: 98.5
      }
    }
  },
  {
    key: 'MOBILE_TO_PAN',
    name: 'Mobile Number to PAN Search',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/mobile-to-pan/verify',
    description: 'Retrieve the PAN number registered and linked to a specific mobile number.',
    successRate: '99.2%',
    latency: '250ms',
    price: '₹10.00',
    inputFields: [
      { name: 'mobile_no', label: 'Mobile Number', placeholder: 'Enter Mobile Number', required: true, type: 'text' }
    ],
    sampleRequest: { mobile_no: '9876543210' },
    sampleResponse: {
      success: true,
      requestId: 'req_mobpan123',
      serviceType: 'MOBILE_TO_PAN',
      latencyMs: 240,
      provider: 'surepass',
      data: {
        mobileNo: '9876543210',
        pan: 'ABCDE1234F',
        name: 'MAYANK KUMAR SHARMA'
      }
    }
  },
  {
    key: 'RATION_CARD_VERIFY',
    name: 'Ration Card Verify',
    category: 'identity',
    method: 'GET',
    endpoint: '/api/v1/ration-card/verify',
    description: 'Retrieve ration card details and status.',
    successRate: '98.5%',
    latency: '150ms',
    price: '₹5.00',
    inputFields: [
      { name: 'ration', label: 'Ration Number', placeholder: 'Enter Ration Card Number', required: true, type: 'text' }
    ],
    sampleRequest: { ration: '123456789' },
    sampleResponse: {
      success: true,
      requestId: 'req_ration123',
      serviceType: 'RATION_CARD_VERIFY',
      latencyMs: 140,
      provider: 'surepass',
      data: {
        ration_number: '123456789',
        status: 'ACTIVE',
        response: { name: 'M K SHARMA', members: 4 }
      }
    }
  },
  {
    key: 'AADHAAR_SHORT_STATUS',
    name: 'Aadhaar Short Status',
    category: 'kyc',
    method: 'GET',
    endpoint: '/api/v1/aadhaar-short/verify',
    description: 'Get short status of Aadhaar linkage, mapping, and PAN connection.',
    successRate: '99.0%',
    latency: '200ms',
    price: '₹3.00',
    inputFields: [
      { name: 'aadhar', label: 'Aadhaar Number', placeholder: 'Enter Aadhaar Number', required: true, type: 'text' }
    ],
    sampleRequest: { aadhar: '123456789012' },
    sampleResponse: {
      success: true,
      requestId: 'req_ashort123',
      serviceType: 'AADHAAR_SHORT_STATUS',
      latencyMs: 180,
      provider: 'surepass',
      data: {
        status: 'SUCCESS',
        code: 200,
        pan_no: 'ABCDE1234F',
        message: 'Aadhaar is linked with PAN.'
      }
    }
  },
  {
    key: 'GST_COMPANY_INFO',
    name: 'GST Company Info',
    category: 'business',
    method: 'GET',
    endpoint: '/api/v1/gst-company/verify',
    description: 'Fetch complete corporate details, tax payer type, and active status using GSTIN.',
    successRate: '99.5%',
    latency: '300ms',
    price: '₹8.00',
    inputFields: [
      { name: 'gstin', label: 'GSTIN', placeholder: 'Enter GSTIN Number', required: true, type: 'text' }
    ],
    sampleRequest: { gstin: '22AAAAA0000A1Z5' },
    sampleResponse: {
      success: true,
      requestId: 'req_gstinfo123',
      serviceType: 'GST_COMPANY_INFO',
      latencyMs: 290,
      provider: 'surepass',
      data: {
        legal_name: 'DIZIPAY TECHNOLOGIES PRIVATE LIMITED',
        constitution: 'Private Limited Company',
        gstin: '22AAAAA0000A1Z5',
        status: 'ACTIVE',
        tax_payer_type: 'Regular',
        registration_date: '2023-05-12',
        state_jurisdiction: 'TELANGANA',
        central_jurisdiction: 'HYDERABAD'
      }
    }
  }
];

module.exports = services;
