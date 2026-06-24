const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const checks = [
  'SUREPASS_API_KEY',
  'SUREPASS_CLIENT_ID',
  'SUREPASS_CLIENT_SECRET',
  'SUREPASS_BASE_URL',
  'WEBTECHLY_API_KEY'
];

const summarize = (key) => {
  const value = process.env[key];
  return {
    key,
    present: Boolean(value && String(value).trim()),
    length: value ? String(value).trim().length : 0
  };
};

const result = checks.map(summarize);
console.log('PROVIDER CREDENTIAL CHECK');
for (const item of result) {
  const status = item.present ? 'present (' + item.length + ' chars)' : 'missing';
  console.log(item.key + ': ' + status);
}

const missingRequired = result.filter(item => !item.present && item.key !== 'SUREPASS_CLIENT_ID' && item.key !== 'SUREPASS_CLIENT_SECRET');
if (missingRequired.length > 0) {
  console.log('PROVIDER TEST STATUS: BLOCKED - required provider env value is missing.');
  process.exitCode = 1;
} else {
  console.log('PROVIDER TEST STATUS: CONFIG PRESENT - live request intentionally skipped unless a provider-specific test payload is supplied.');
}
