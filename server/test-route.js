const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = 'asdfghjklwertyuiopzxcvbnmasdfghjklwertyuiopzxcvbnm';

function testUser(userId) {
  return new Promise((resolve) => {
    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/wallet/transactions',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ userId, statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', (error) => {
      resolve({ userId, error: error.message });
    });

    req.end();
  });
}

async function run() {
  const userIds = [1, 2, 3, 999];
  for (const uid of userIds) {
    const res = await testUser(uid);
    console.log(`User ID: ${res.userId} -> Status: ${res.statusCode || 'ERROR'}, Body: ${res.body || res.error}`);
  }
}

run();
