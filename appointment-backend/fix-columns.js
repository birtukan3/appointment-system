const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function addMissingColumns() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check and add missing columns to users table
    const columnsToAdd = [
      { name: 'specialization', type: 'VARCHAR(100)' },
      { name: 'experience', type: 'INTEGER' },
      { name: 'qualifications', type: 'TEXT' },
      { name: 'bio', type: 'TEXT' },
      { name: 'availableDays', type: 'VARCHAR(255)' },
      { name: 'workingHours', type: 'JSONB' },
      { name: 'twoFactorEnabled', type: 'BOOLEAN DEFAULT false' },
      { name: 'twoFactorSecret', type: 'VARCHAR(255)' }
    ];
    
    for (const column of columnsToAdd) {
      try {
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN IF NOT EXISTS "${column.name}" ${column.type}
        `);
        console.log(`Added column: ${column.name}`);
      } catch (err) {
        console.log(`Column ${column.name} may already exist:`, err.message);
      }
    }
    
    console.log('All columns added successfully!');
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
  }
}

addMissingColumns();
