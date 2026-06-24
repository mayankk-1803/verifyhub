async function verify(providerInstance, body) {
  if (!body.pan) {
    throw new Error('Parameter "pan" is required for PAN Short Verification.');
  }
  const latency = Math.floor(Math.random() * 120) + 90;
  return {
    success: true,
    latency,
    data: {
      pan: body.pan.toUpperCase().trim(),
      name: 'M K SHARMA',
      status: 'VALID',
      verifiedAt: new Date()
    }
  };
}
module.exports = { verify };
