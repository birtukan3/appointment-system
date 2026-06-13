const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function checkDatabase() {
  try {
    console.log('\n========================================');
    console.log('Checking Database Content');
    console.log('========================================\n');
    
    // Get all users
    const users = await pool.query('SELECT id, email, name, role FROM users');
    console.log('📊 USERS IN DATABASE:');
    console.table(users.rows);
    
    // Get appointment count
    const appointments = await pool.query('SELECT COUNT(*) FROM appointments');
    console.log(`\n📅 Total Appointments: ${appointments.rows[0].count}`);
    
    // Get appointments by status
    const statusCount = await pool.query('SELECT status, COUNT(*) FROM appointments GROUP BY status');
    if (statusCount.rows.length > 0) {
      console.log('\n📊 Appointments by Status:');
      console.table(statusCount.rows);
    }
    
    console.log('\n========================================\n');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabase();
