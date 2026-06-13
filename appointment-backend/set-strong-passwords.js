const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function setStrongPasswords() {
  try {
    // Use a strong password
    const strongPassword = 'SecurePass@2026!';
    const salt = await bcrypt.genSalt(12); // Higher salt rounds for better security
    const hashedPassword = await bcrypt.hash(strongPassword, salt);
    
    // Update all users password
    await pool.query('UPDATE users SET password = $1', [hashedPassword]);
    
    // Get all users
    const users = await pool.query('SELECT id, email, name FROM users');
    
    console.log('\n========================================');
    console.log('✅ ALL PASSWORDS RESET TO STRONG PASSWORD!');
    console.log('========================================\n');
    console.log('🔐 New strong password for ALL users: SecurePass@2026!\n');
    console.log('Password requirements met:');
    console.log('   ✓ At least 8 characters');
    console.log('   ✓ Contains uppercase letter');
    console.log('   ✓ Contains lowercase letter');
    console.log('   ✓ Contains number');
    console.log('   ✓ Contains special character (@)\n');
    console.log('Users in database:');
    console.log('----------------------------------------');
    users.rows.forEach(u => {
      console.log(`   Email: ${u.email}`);
      console.log(`   Password: SecurePass@2026!`);
      console.log(`   Name: ${u.name}`);
      console.log('----------------------------------------');
    });
    console.log('\n🔑 Try logging in with:');
    console.log('   Email: user@example.com');
    console.log('   Password: SecurePass@2026!\n');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

setStrongPasswords();
