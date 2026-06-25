const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const authControllerPath = path.join(repoRoot, 'src', 'controllers', 'authController.js');
const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');

const authController = fs.readFileSync(authControllerPath, 'utf8');
const schema = fs.readFileSync(schemaPath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractMethod(source, signature) {
  const start = source.indexOf(signature);
  assert(start !== -1, `Could not find ${signature}`);

  const braceStart = source.indexOf('{', start);
  assert(braceStart !== -1, `Could not find method body for ${signature}`);

  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(braceStart + 1, index);
    }
  }

  throw new Error(`Could not parse method body for ${signature}`);
}

const registerBody = extractMethod(authController, 'static async register');
const walletCreateMatch = registerBody.match(/tx\.wallet\.create\s*\(\s*{[\s\S]*?data\s*:\s*{([\s\S]*?)\n\s*}\s*\n\s*}\s*\)/);

assert(walletCreateMatch, 'Registration must create a wallet for new users.');
assert(/balance\s*:\s*0(?:\.0+)?/.test(walletCreateMatch[1]), 'Registration wallet balance must be initialized to 0.');
assert(!/walletLedger\.create|wallet_ledger/.test(registerBody), 'Registration must not create wallet ledger entries.');
assert(!/balance\s*:\s*1000|default\(1000/.test(authController), 'Registration/auth code must not contain a 1000 wallet default.');
assert(/balance\s+Decimal\s+@default\(0\.0000\)/.test(schema), 'Wallet schema default balance must remain 0.0000.');
assert(!/@default\(1000/.test(schema), 'Wallet schema must not default balances to 1000.');

console.log('Registration wallet initialization verified: balance 0, no ledger credit, schema default 0.');