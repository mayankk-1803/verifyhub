module.exports.verify = async (provider, body) => provider.execute('MOBILE_TO_RC', { MobileNo: (body.mobile_no || body.mobile || '').trim() });
