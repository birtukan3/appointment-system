const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function checkAppointments() {
  try {
    // Get all appointments with correct column names
    const result = await pool.query('SELECT id, "serviceName", status, "userId" FROM appointments');
    
    console.log('\n========================================');
    console.log('📅 APPOINTMENTS IN DATABASE');
    console.log('========================================\n');
    console.log(`Total appointments: ${result.rows.length}\n`);
    
    if (result.rows.length === 0) {
      console.log('No appointments found. You need to add appointments.\n');
    } else {
      result.rows.forEach(apt => {
        console.log(`   ID: ${apt.id}`);
        console.log(`   Service: ${apt.serviceName}`);
        console.log(`   Status: ${apt.status}`);
        console.log(`   User ID: ${apt.userId}`);
        console.log('   ---');
      });
    }
    
    // Get appointments for user@example.com
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', ['user@example.com']);
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      const userApps = await pool.query('SELECT id, "serviceName", status FROM appointments WHERE "userId" = $1', [userId]);
      console.log(`\n📊 Appointments for user@example.com (ID: ${userId}): ${userApps.rows.length}`);
      userApps.rows.forEach(apt => {
        console.log(`   - ${apt.serviceName} (${apt.status})`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAppointments();
