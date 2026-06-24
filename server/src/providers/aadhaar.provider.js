async function verify(providerInstance, body) {
  if (!body.aadhaar && !body.aadhaar_no && !body.aadhaarNumber) {
    throw new Error('Parameter "aadhaar" is required.');
  }
  const latency = Math.floor(Math.random() * 200) + 150;
  return {
    success: true,
    latency,
    data: {
      client_id: 'client_id_' + Math.random().toString(36).substring(2, 10),
      status: 'OTP_SENT',
      message: 'One Time Password successfully dispatched to registered mobile ending in 4567.'
    }
  };
}
module.exports = { verify };
