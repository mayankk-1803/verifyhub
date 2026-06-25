module.exports.verify = async (provider, body) => provider.execute('UPI_VERIFY', { UPIID: (body.upi_id || body.vpa || body.upi || '').trim() });
