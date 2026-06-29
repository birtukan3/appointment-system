// quick-test.js - Complete Login Test Tool
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const http = require('http');

// Database Config
const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
};

// API Config
const API_BASE = 'http://localhost:3002';

// Test passwords
const testPasswords = ['Admin@206!', 'Admin123', 'admin123', 'Admin@2026!', 'password'];

async function testLogin(email, password) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ email, password });
    const url = new URL('/api/auth/login', API_BASE);
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    };
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 0, data: { error: e.message } }));
    req.write(data);
    req.end();
  });
}

async function quickTest() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           🔑 QUICK LOGIN TEST TOOL                   ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Step 1: Check Database
  console.log('\n📊 STEP 1: Checking Database...');
  console.log('─────────────────────────────────────────────────────────');
  
  const client = new Client(dbConfig);
  try {
    await client.connect();
    console.log('✅ Database connected\n');

    // Get admin user
    const result = await client.query(
      'SELECT id, email, name, role, status, "isActive" FROM "user" WHERE email = $1',
      ['admin@example.com']
    );

    if (result.rows.length === 0) {
      console.log('❌ Admin user not found! Creating...');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('Admin123', salt);
      await client.query(
        'INSERT INTO "user" (email, password, name, role, status, "isActive", "emailVerified") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['admin@example.com', hash, 'Admin User', 'admin', 'active', true, true]
      );
      console.log('✅ Admin user created with password: Admin123');
    } else {
      const user = result.rows[0];
      console.log(`✅ Admin found: ${user.email} (${user.role})`);
      console.log(`   Status: ${user.status} | Active: ${user.isActive}`);
      
      // Get password hash
      const passResult = await client.query(
        'SELECT password FROM "user" WHERE email = $1',
        ['admin@example.com']
      );
      const hash = passResult.rows[0].password;
      
      // Test which password works
      console.log('\n🔑 Testing passwords against database hash...');
      let foundMatch = false;
      for (const pwd of testPasswords) {
        const match = await bcrypt.compare(pwd, hash);
        if (match) {
          console.log(`   ✅ MATCH FOUND: "${pwd}" is correct!`);
          foundMatch = true;
          break;
        } else {
          console.log(`   ❌ "${pwd}" does not match`);
        }
      }
      
      if (!foundMatch) {
        console.log('\n⚠️  No password match found! Resetting to Admin123...');
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash('Admin123', salt);
        await client.query(
          'UPDATE "user" SET password = $1 WHERE email = $2',
          [newHash, 'admin@example.com']
        );
        console.log('✅ Password reset to: Admin123');
      }
    }

    await client.end();
    console.log('\n─────────────────────────────────────────────────────────');

    // Step 2: Test API Login
    console.log('\n🌐 STEP 2: Testing API Login...');
    console.log('─────────────────────────────────────────────────────────');

    // Try all passwords
    console.log('\n🔑 Trying all possible passwords:\n');
    
    for (const pwd of ['Admin123', 'Admin@206!', 'admin123', 'Staff123', 'User123']) {
      const result = await testLogin('admin@example.com', pwd);
      if (result.status === 200 || result.status === 201) {
        console.log(`   ✅ SUCCESS: "${pwd}" works!`);
        console.log(`      Token: ${result.data.access_token?.substring(0, 30)}...`);
        console.log(`      User: ${result.data.user?.name} (${result.data.user?.role})`);
        break;
      } else if (result.status === 401) {
        console.log(`   ❌ "${pwd}" failed`);
      } else if (result.status === 0) {
        console.log(`   ❌ Server not responding: ${result.data.error}`);
        console.log('\n💡 Make sure backend is running on port 3002');
        break;
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              ✅ TEST COMPLETE!                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin:  admin@example.com / Admin123');
    console.log('   Staff:  staff@example.com / Staff123');
    console.log('   User:   user@example.com / User123');
    console.log('   VIP:    vip@example.com / VIP123');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. PostgreSQL is running on port 5432');
    console.log('   2. Database credentials are correct');
    console.log('   3. Backend is running on port 3002');
  }
}

// Run the test
quickTest();