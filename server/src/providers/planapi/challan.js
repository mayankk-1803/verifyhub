module.exports.verify = async (provider, body) => provider.execute('VEHICLE_CHALLAN', { VehicleNo: (body.vehicle_no || body.vehicle || body.rc_no || '').toUpperCase().trim() });
