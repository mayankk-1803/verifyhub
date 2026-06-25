module.exports.verify = async (provider, body) => provider.execute('MCA_COMPANY_SEARCH', { Company: (body.cin || body.company_name || body.company || '').toUpperCase().trim() });
