const http = require('http');

const testData = JSON.stringify({
  name: "Test User",
  email: "test@example.com",
  password: "Test@123456",
  company: "Test Company",
  phone: "0912345678"
});

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(testData);
req.end();
