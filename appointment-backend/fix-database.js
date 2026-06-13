const { Client } = require('pg');

const config = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'postgres',
};

async function fixDatabase() {
  const client = new Client(config);
  
  console.log('\n' + '='.repeat(60));
  console.log('🔧 DATABASE FIX SCRIPT');
  console.log('='.repeat(60) + '\n');
  
  try {
    console.log('📡 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected\n');
    
    // Check if database exists and drop it
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'appointment_db'"
    );
    
    if (result.rows.length > 0) {
      console.log('🔌 Terminating existing connections...');
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = 'appointment_db'
        AND pid <> pg_backend_pid();
      `);
      
      console.log('🗑️  Dropping database...');
      await client.query('DROP DATABASE IF EXISTS appointment_db');
      console.log('✅ Database dropped\n');
    }
    
    // Create fresh database
    console.log('📦 Creating fresh database...');
    await client.query('CREATE DATABASE appointment_db');
    console.log('✅ Database created\n');
    
    console.log('='.repeat(60));
    console.log('✅ DATABASE FIX COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Next steps:');
    console.log('   1. Run: npm run start:dev');
    console.log('   2. Or run: npm run seed (if you have seed data)');
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure PostgreSQL is running');
    console.error('   2. Check your password in the config');
    console.error('   3. Run as administrator if needed');
  } finally {
    await client.end();
  }
}

fixDatabase();