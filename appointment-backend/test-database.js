// test-database.js - Complete Database Test
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function testDatabase() {
  console.log('\n========================================');
  console.log('     🗄️  DATABASE TEST');
  console.log('========================================\n');

  try {
    await client.connect();
    console.log('✅ Database connected successfully!\n');

    // 1. List all tables
    console.log('📋 Tables in database:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.table(tables.rows);

    // 2. Check users
    console.log('\n📋 Users:');
    const users = await client.query(`
      SELECT id, email, name, role, status, "isActive" 
      FROM "user" 
      ORDER BY id
    `);
    console.table(users.rows);
    console.log(`Total: ${users.rowCount} users\n`);

    // 3. Check appointments
    console.log('📅 Appointments:');
    const appointments = await client.query(`
      SELECT id, "serviceName", "providerName", datetime, status, priority 
      FROM appointment 
      ORDER BY id
    `);
    console.table(appointments.rows);
    console.log(`Total: ${appointments.rowCount} appointments\n`);

    // 4. Statistics
    console.log('📊 Statistics:');
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM "user") as total_users,
        (SELECT COUNT(*) FROM "user" WHERE role = 'admin') as admins,
        (SELECT COUNT(*) FROM "user" WHERE role = 'staff') as staff,
        (SELECT COUNT(*) FROM "user" WHERE role = 'user') as users,
        (SELECT COUNT(*) FROM appointment) as total_appointments,
        (SELECT COUNT(*) FROM appointment WHERE status = 'pending') as pending,
        (SELECT COUNT(*) FROM appointment WHERE status = 'approved') as approved,
        (SELECT COUNT(*) FROM appointment WHERE status = 'completed') as completed
    `);
    console.table(stats.rows);

    console.log('\n========================================');
    console.log('✅ Database test completed successfully!');
    console.log('========================================\n');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

testDatabase();