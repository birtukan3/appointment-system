// check-columns.js
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function checkColumns() {
  try {
    await client.connect();
    
    // Check user table columns
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 User Table Columns:');
    console.log('========================================');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
    });
    
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkColumns();