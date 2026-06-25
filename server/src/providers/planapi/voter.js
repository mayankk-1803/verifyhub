module.exports.verify = async (provider, body) => provider.execute('VOTER_ID_VERIFY', { EPICNo: (body.epic || body.voter_id || body.voter || '').toUpperCase().trim() });
