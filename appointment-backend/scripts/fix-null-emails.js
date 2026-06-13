const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function fixNullEmails() {
  console.log('\n🔧 FIXING NULL EMAILS\n');

  try {
    await client.connect();
    
    // Fix NULL emails
    const result = await client.query(`
      UPDATE users 
      SET email = CONCAT('user_', id, '_', EXTRACT(EPOCH FROM NOW()), '@temp.local')
      WHERE email IS NULL OR email = ''
      RETURNING id, name;
    `);
    
    console.log(`✅ Fixed ${result.rowCount} users with NULL emails`);
    
    // Add constraints
    await client.query('ALTER TABLE users ALTER COLUMN email SET NOT NULL');
    await client.query('ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)');
    
    console.log('✅ Email constraints added');
    console.log('\n💡 Database is ready! Run: npm run start:dev\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

fixNullEmails();