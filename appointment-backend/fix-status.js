// fix-status.js
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function fixStatus() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Update all users to active
    const result = await client.query(
      'UPDATE "user" SET status = $1, "isActive" = $2, "emailVerified" = $3 RETURNING id, email, name, status, "isActive"',
      ['active', true, true]
    );
    
    console.log(`✅ ${result.rowCount} users updated to active status!\n`);
    console.log('📋 Updated Users:');
    console.table(result.rows);

    await client.end();
    console.log('\n✅ Fix completed!');
    console.log('🔑 Try logging in with: admin@example.com / Admin123');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixStatus();