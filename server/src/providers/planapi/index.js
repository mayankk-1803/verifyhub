const client = require('./client');

module.exports = {
  client,
  gst: require('./gst'),
  gstReturn: require('./gstReturn'),
  rc: require('./rc'),
  rcLite: require('./rcLite'),
  rcMobile: require('./rcMobile'),
  mobileRc: require('./mobileRc'),
  challan: require('./challan'),
  dl: require('./dl'),
  passport: require('./passport'),
  voter: require('./voter'),
  mca: require('./mca'),
  bank: require('./bank'),
  upi: require('./upi')
};
