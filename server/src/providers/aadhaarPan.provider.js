async function verify(providerInstance, body) {
  if (!body.aadhaarNumber && !body.aadhaar) {
    throw new Error('Parameter "aadhaar" or "aadhaarNumber" is required.');
  }
  const latency = Math.floor(Math.random() * 400) + 200;
  return {
    success: true,
    latency,
    data: {
      aadhaarNumber: 'XXXXXXXX8940',
      panLinked: true,
      pan: 'ABCDE1234F',
      status: 'LINKED',
      verifiedAt: new Date()
    }
  };
}
module.exports = { verify };
