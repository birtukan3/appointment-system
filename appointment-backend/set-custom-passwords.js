const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function setCustomPasswords() {
  try {
    // Define passwords for each user
    const usersToUpdate = [
      { email: 'admin@example.com', password: 'Admin@2026!', name: 'Admin User' },
      { email: 'user@example.com', password: 'User@2026!', name: 'John Smith' },
      { email: 'staff@example.com', password: 'Staff@2026!', name: 'Dr. Sarah Johnson' },
      { email: 'vip@example.com', password: 'User@2026!', name: 'VIP Customer' },
      { email: 'test@example.com', password: 'User@2026!', name: 'Test User' }
    ];
    
    console.log('\n========================================');
    console.log('✅ SETTING CUSTOM PASSWORDS');
    console.log('========================================\n');
    
    for (const user of usersToUpdate) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, user.email]);
      console.log(`✓ ${user.email} -> Password: ${user.password}`);
    }
    
    // Verify all users
    const users = await pool.query('SELECT email FROM users');
    
    console.log('\n========================================');
    console.log('✅ PASSWORDS UPDATED SUCCESSFULLY!');
    console.log('========================================\n');
    console.log('🔑 Login Credentials:');
    console.log('----------------------------------------');
    console.log(`   Admin:  admin@example.com / Admin@2026!`);
    console.log(`   User:   user@example.com / User@2026!`);
    console.log(`   Staff:  staff@example.com / Staff@2026!`);
    console.log(`   VIP:    vip@example.com / User@2026!`);
    console.log(`   Test:   test@example.com / User@2026!`);
    console.log('----------------------------------------\n');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

setCustomPasswords();
