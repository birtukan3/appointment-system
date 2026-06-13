const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'postgres',
});

async function fixDatabase() {
  console.log('\n🔧 DATABASE FIX SCRIPT');
  console.log('='.repeat(50));
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Drop the database if exists
    console.log('🗑️  Dropping existing database...');
    await client.query('DROP DATABASE IF EXISTS appointment_db;');
    console.log('✅ Database dropped');
    
    // Create fresh database
    console.log('📦 Creating fresh database...');
    await client.query('CREATE DATABASE appointment_db;');
    console.log('✅ Database created');
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ DATABASE FIX COMPLETE!');
    console.log('💡 Now run: npm run start:dev\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await client.end();
  }
}

fixDatabase();