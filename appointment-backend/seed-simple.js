// seed-simple.js - No TypeScript, pure JavaScript
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function seed() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if admin exists
    const checkResult = await client.query('SELECT id FROM users WHERE email = $1', ['admin@example.com']);
    
    if (checkResult.rows.length > 0) {
      console.log('⚠️ Users already exist. Skipping seed...');
      await client.end();
      return;
    }

    const salt = await bcrypt.genSalt(10);

    // Create Admin
    const adminPassword = await bcrypt.hash('Admin@2026!', salt);
    await client.query(`
      INSERT INTO users (name, email, password, role, "isActive", "isDeactivated", "failedLoginAttempts", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, true, false, 0, NOW(), NOW())
    `, ['Admin User', 'admin@example.com', adminPassword, 'admin']);
    console.log('✅ Admin created: admin@example.com / Admin@2026!');

    // Create User
    const userPassword = await bcrypt.hash('User@2026!', salt);
    await client.query(`
      INSERT INTO users (name, email, password, role, company, phone, "isActive", "isDeactivated", "failedLoginAttempts", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, true, false, 0, NOW(), NOW())
    `, ['John Smith', 'user@example.com', userPassword, 'user', 'Tech Corp', '+251911234567']);
    console.log('✅ User created: user@example.com / User@2026!');

    // Create Staff
    const staffPassword = await bcrypt.hash('Staff@2026!', salt);
    await client.query(`
      INSERT INTO users (name, email, password, role, department, specialization, experience, phone, bio, "isActive", "isDeactivated", "failedLoginAttempts", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, false, 0, NOW(), NOW())
    `, ['Dr. Sarah Johnson', 'staff@example.com', staffPassword, 'staff', 'Cardiology', 'Cardiologist', 12, '+251912345678', 'Board-certified cardiologist']);
    console.log('✅ Staff created: staff@example.com / Staff@2026!');

    // Create VIP User
    const vipPassword = await bcrypt.hash('VIP@2026!', salt);
    await client.query(`
      INSERT INTO users (name, email, password, role, company, phone, "isActive", "isDeactivated", "failedLoginAttempts", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, true, false, 0, NOW(), NOW())
    `, ['VIP Customer', 'vip@example.com', vipPassword, 'user', 'Premium Corp', '+251916789012']);
    console.log('✅ VIP created: vip@example.com / VIP@2026!');

    // Verify users
    const result = await client.query('SELECT id, name, email, role FROM users');
    console.log('\n📊 Users in database:');
    console.table(result.rows);

    await client.end();
    console.log('\n✅ Seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    await client.end();
  }
}

seed();