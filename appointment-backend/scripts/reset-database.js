const { Client } = require('pg');

const config = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'postgres',
};

async function resetDatabase() {
  const client = new Client(config);
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🗄️  DATABASE RESET UTILITY');
    console.log('='.repeat(60) + '\n');
    
    console.log('📡 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected\n');
    
    // Terminate all connections to appointment_db
    console.log('🔌 Terminating existing connections...');
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'appointment_db'
      AND pid <> pg_backend_pid();
    `);
    console.log('✅ Connections terminated\n');
    
    // Drop database if exists
    console.log('🗑️  Dropping database...');
    await client.query(`DROP DATABASE IF EXISTS appointment_db`);
    console.log('✅ Database dropped\n');
    
    // Create fresh database
    console.log('🏗️  Creating fresh database...');
    await client.query(`CREATE DATABASE appointment_db`);
    console.log('✅ Database created\n');
    
    console.log('='.repeat(60));
    console.log('✅ DATABASE RESET COMPLETED!');
    console.log('='.repeat(60));
    console.log('\n📋 Next step: Run "npm run seed" to populate data\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await client.end();
  }
}

resetDatabase();