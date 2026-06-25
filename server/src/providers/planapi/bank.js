module.exports.verify = async (provider, body) => provider.execute('BANK_VERIFY', { AccountNo: (body.account_no || body.account || '').trim(), IFSC: (body.ifsc || '').toUpperCase().trim() });
