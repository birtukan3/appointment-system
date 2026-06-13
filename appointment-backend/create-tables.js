const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function createAuditTable() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check if audit_logs table exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
      )
    `);
    
    if (!checkTable.rows[0].exists) {
      console.log('Creating audit_logs table...');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER,
          "userEmail" VARCHAR(100) NOT NULL,
          action VARCHAR(50) NOT NULL,
          "entityType" VARCHAR(100),
          "entityId" INTEGER,
          "oldValue" TEXT,
          "newValue" TEXT,
          "ipAddress" VARCHAR(50),
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('audit_logs table created');
    } else {
      console.log('audit_logs table already exists');
    }
    
    // Check if notifications table exists
    const checkNotifications = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notifications'
      )
    `);
    
    if (!checkNotifications.rows[0].exists) {
      console.log('Creating notifications table...');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          "userId" INTEGER NOT NULL,
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'info',
          "isRead" BOOLEAN DEFAULT false,
          "relatedId" INTEGER,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('notifications table created');
    }
    
    await client.end();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
  }
}

createAuditTable();
