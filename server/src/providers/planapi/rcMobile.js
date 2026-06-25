module.exports.verify = async (provider, body) => provider.execute('RC_TO_MOBILE', { VehicleNo: (body.vehicle_no || body.vehicle || body.rc_no || '').toUpperCase().trim() });
