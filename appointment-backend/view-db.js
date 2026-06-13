// D:\Desktop\AppointmentSystem\appointment-backend\view-db.js
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function viewData() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Users table
    console.log('========== USERS ==========');
    const users = await client.query('SELECT id, name, email, role, "isActive", "createdAt" FROM users');
    console.table(users.rows);
    
    // Appointments table
    console.log('\n========== APPOINTMENTS ==========');
    const appointments = await client.query('SELECT id, "serviceName", "providerName", datetime, status FROM appointments LIMIT 10');
    console.table(appointments.rows);
    
    // Count total records
    console.log('\n========== TABLE COUNTS ==========');
    const counts = await client.query(`
      SELECT 'users' as table_name, COUNT(*) as count FROM users
      UNION ALL
      SELECT 'appointments', COUNT(*) FROM appointments
      UNION ALL  
      SELECT 'audit_logs', COUNT(*) FROM audit_logs
      UNION ALL
      SELECT 'notifications', COUNT(*) FROM notifications
    `);
    console.table(counts.rows);
    
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
  }
}

viewData();