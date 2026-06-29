// test-api.js - Test Backend API
const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:3002/api';

async function fetchAPI(endpoint, options = {}) {
  const url = new URL(endpoint, API_BASE);
  return new Promise((resolve, reject) => {
    const req = http.request(url, { 
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function testAPI() {
  console.log('\n========================================');
  console.log('     🌐 TESTING BACKEND API');
  console.log('========================================\n');

  try {
    // 1. Test Health
    console.log('1. Testing Health Endpoint...');
    const health = await fetchAPI('/health');
    console.log(`   ✅ Health: ${health.status}`);
    console.log(`   Status: ${health.data.status}\n`);

    // 2. Test System Status
    console.log('2. Testing System Status...');
    const status = await fetchAPI('/system/status');
    console.log(`   ✅ System Status: ${status.status}`);
    console.log(`   Version: ${status.data.version}\n`);

    // 3. Test Login
    console.log('3. Testing Login...');
    const login = await fetchAPI('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@example.com', password: 'Admin123' }
    });
    
    if (login.status === 201 || login.status === 200) {
      console.log('   ✅ Login successful!');
      console.log(`   User: ${login.data.user?.name}`);
      console.log(`   Role: ${login.data.user?.role}`);
      console.log(`   Token: ${login.data.access_token?.substring(0, 30)}...\n`);
      
      // Save token for protected endpoints
      const token = login.data.access_token;
      
      // 4. Test Protected Endpoint
      console.log('4. Testing Protected Endpoint (Get Profile)...');
      const profile = await fetchAPI('/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (profile.status === 200) {
        console.log('   ✅ Profile fetched successfully!');
        console.log(`   Name: ${profile.data.data?.name}`);
        console.log(`   Email: ${profile.data.data?.email}`);
      }
      
    } else {
      console.log(`   ❌ Login failed: ${login.status}`);
      console.log(`   Message: ${login.data.message}`);
    }

    console.log('\n========================================');
    console.log('✅ API tests completed!');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('\n💡 Make sure backend is running:');
    console.log('   npm run start:dev');
  }
}

testAPI();