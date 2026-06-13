const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function resetPasswords() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    // Update all users password
    await pool.query('UPDATE users SET password = $1', [hashedPassword]);
    
    // Get all users
    const users = await pool.query('SELECT id, email, name FROM users');
    
    console.log('\n========================================');
    console.log('✅ ALL PASSWORDS RESET SUCCESSFULLY!');
    console.log('========================================\n');
    console.log('New password for ALL users: password123\n');
    console.log('You can now login with any email and password: password123\n');
    console.log('Users in database:');
    console.log('----------------------------------------');
    users.rows.forEach(u => {
      console.log(`   Email: ${u.email}`);
      console.log(`   Password: password123`);
      console.log(`   Name: ${u.name}`);
      console.log('----------------------------------------');
    });
    console.log('\n🔑 Try logging in with:');
    console.log('   Email: user@example.com');
    console.log('   Password: password123\n');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

resetPasswords();
