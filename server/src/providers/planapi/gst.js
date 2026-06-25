module.exports.verify = async (provider, body) => provider.execute('GST_VERIFY', { GSTIN: (body.gst || body.gstin || '').toUpperCase().trim() });
