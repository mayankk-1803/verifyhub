const express = require('express');
const router = express.Router();
const ApiGatewayController = require('../controllers/apiGateway');
const gatewayAuth = require('../middleware/gatewayAuth');
const requireActiveSubscription = require('../middleware/requireActiveSubscription');

// The API Gateway routes are guarded by API Key authentication
router.use(gatewayAuth);

// 1. GST Verification
router.get('/gst/verify', requireActiveSubscription('GST_VERIFY'), ApiGatewayController.verify);
router.get('/GstVerify.php', requireActiveSubscription('GST_VERIFY'), ApiGatewayController.verify);

// 2. PAN to GST Verify
router.get('/pan-to-gst/verify', requireActiveSubscription('PAN_TO_GST'), ApiGatewayController.verify);
router.get('/PanToGst.php', requireActiveSubscription('PAN_TO_GST'), ApiGatewayController.verify);

// 3. Aadhaar Verify v1 (Send OTP)
router.get('/aadhaar/verify', requireActiveSubscription('AADHAAR_DATA'), ApiGatewayController.verify);

// 4. Aadhaar Get Data
router.get('/aadhaar-otp/verify', requireActiveSubscription('AADHAAR_OTP'), ApiGatewayController.verify);
router.get('/fetch-info', requireActiveSubscription('AADHAAR_OTP'), ApiGatewayController.verify);
router.get('/data_fetch', requireActiveSubscription('AADHAAR_OTP'), ApiGatewayController.verify);

// 5. PAN Verify V1
router.get('/pan/verify', requireActiveSubscription('PAN_CARD'), ApiGatewayController.verify);
router.get('/pan-v1', requireActiveSubscription('PAN_CARD'), ApiGatewayController.verify);

// 6. Aadhaar to PAN Lookup
router.get('/aadhaar-pan/verify', requireActiveSubscription('AADHAAR_PAN'), ApiGatewayController.verify);

// 7. PAN Verification
router.get('/pan-verification/verify', requireActiveSubscription('PAN_VERIFICATION'), ApiGatewayController.verify);
router.get('/pan_details', requireActiveSubscription('PAN_VERIFICATION'), ApiGatewayController.verify);

// 8. NSDL Decode
router.get('/pan-decode/verify', requireActiveSubscription('PAN_DECODE'), ApiGatewayController.verify);
router.get('/nsdl_decode.php', requireActiveSubscription('PAN_DECODE'), ApiGatewayController.verify);

// 9. Short PAN
router.get('/pan-short/verify', requireActiveSubscription('PAN_SHORT'), ApiGatewayController.verify);

// 10. PAN Basic
router.get('/pan-basic/verify', requireActiveSubscription('PAN_BASIC'), ApiGatewayController.verify);
router.get('/pan-basic', requireActiveSubscription('PAN_BASIC'), ApiGatewayController.verify);

// 11. Ration Verification
router.get('/ration-verify', requireActiveSubscription('RATION'), ApiGatewayController.verify);
router.get('/ration', requireActiveSubscription('RATION'), ApiGatewayController.verify);

// 12. Voter Verification
router.get('/voter/verify', requireActiveSubscription('VOTER_VERIFY'), ApiGatewayController.verify);

// 13. NSDL PAN Application Track
router.get('/pancard_status', requireActiveSubscription('PAN_TRACK'), ApiGatewayController.verify);

// 14. GST Return Filing Verification
router.get('/gst-return/verify', requireActiveSubscription('GST_RETURN'), ApiGatewayController.verify);

// 15. RC Verification
router.get('/rc-verify/verify', requireActiveSubscription('RC_VERIFY'), ApiGatewayController.verify);

// 16. Voter ID Verification v2
router.get('/voter-id-verify/verify', requireActiveSubscription('VOTER_ID_VERIFY'), ApiGatewayController.verify);

// 17. Passport Verification
router.get('/passport-verify/verify', requireActiveSubscription('PASSPORT_VERIFY'), ApiGatewayController.verify);

// 18. Driving License Verification
router.get('/driving-license-verify/verify', requireActiveSubscription('DRIVING_LICENSE_VERIFY'), ApiGatewayController.verify);

// 19. MCA Company Search
router.get('/mca-company-search/verify', requireActiveSubscription('MCA_COMPANY_SEARCH'), ApiGatewayController.verify);

// 20. Bank Account Verification
router.get('/bank-verify/verify', requireActiveSubscription('BANK_VERIFY'), ApiGatewayController.verify);

// 21. UPI ID Verification
router.get('/upi-verify/verify', requireActiveSubscription('UPI_VERIFY'), ApiGatewayController.verify);

// 22. Vehicle Challan Search
router.get('/vehicle-challan/verify', requireActiveSubscription('VEHICLE_CHALLAN'), ApiGatewayController.verify);

// 23. RC Verification Advanced
router.get('/rc-advanced/verify', requireActiveSubscription('RC_ADVANCED'), ApiGatewayController.verify);

// 24. RC to Mobile Number Search
router.get('/rc-to-mobile/verify', requireActiveSubscription('RC_TO_MOBILE'), ApiGatewayController.verify);

// 25. Mobile Number to RC Search
router.get('/mobile-to-rc/verify', requireActiveSubscription('MOBILE_TO_RC'), ApiGatewayController.verify);

// 26. RC Lite Verification
router.get('/rc-lite/verify', requireActiveSubscription('RC_LITE'), ApiGatewayController.verify);

// 27. Aadhaar to PAN Lookup v2
router.get('/aadhaar-to-pan/verify', requireActiveSubscription('AADHAAR_PAN'), ApiGatewayController.verify);

// 28. Mobile Number to PAN Search
router.get('/mobile-to-pan/verify', requireActiveSubscription('MOBILE_TO_PAN'), ApiGatewayController.verify);

// 29. Ration Card Verify
router.get('/ration-card/verify', requireActiveSubscription('RATION_CARD_VERIFY'), ApiGatewayController.verify);

// 30. Aadhaar Short Status
router.get('/aadhaar-short/verify', requireActiveSubscription('AADHAAR_SHORT_STATUS'), ApiGatewayController.verify);

// 31. GST Company Info
router.get('/gst-company/verify', requireActiveSubscription('GST_COMPANY_INFO'), ApiGatewayController.verify);

module.exports = router;
