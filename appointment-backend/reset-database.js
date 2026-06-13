const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function createTables() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Drop and recreate users table with correct schema (WARNING: This will delete data)
    console.log('Recreating users table...');
    
    await client.query(`
      DROP TABLE IF EXISTS users CASCADE;
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        department VARCHAR(100),
        company VARCHAR(100),
        phone VARCHAR(20),
        specialization VARCHAR(100),
        experience INTEGER,
        qualifications TEXT,
        bio TEXT,
        availableDays VARCHAR(255),
        workingHours JSONB,
        "isActive" BOOLEAN DEFAULT true,
        "failedLoginAttempts" INTEGER DEFAULT 0,
        "lockUntil" TIMESTAMP,
        "lastFailedLoginAt" TIMESTAMP,
        "lastLogin" TIMESTAMP,
        "twoFactorEnabled" BOOLEAN DEFAULT false,
        "twoFactorSecret" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Users table recreated');
    
    // Recreate appointments table
    await client.query(`
      DROP TABLE IF EXISTS appointments CASCADE;
      CREATE TABLE appointments (
        id SERIAL PRIMARY KEY,
        "bookingCode" VARCHAR(50) UNIQUE NOT NULL,
        "serviceName" VARCHAR(100) NOT NULL,
        "providerName" VARCHAR(100) NOT NULL,
        datetime TIMESTAMP NOT NULL,
        "userId" INTEGER REFERENCES users(id),
        "userEmail" VARCHAR(100) NOT NULL,
        "userName" VARCHAR(100) NOT NULL,
        age INTEGER,
        gender VARCHAR(10),
        company VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'Normal',
        "forSelf" BOOLEAN DEFAULT true,
        "patientName" VARCHAR(100),
        notes TEXT,
        comment TEXT,
        status VARCHAR(20) DEFAULT 'Pending',
        "isArchived" BOOLEAN DEFAULT false,
        "calendarEventId" VARCHAR(255),
        "calendarEventLink" VARCHAR(255),
        "meetLink" VARCHAR(255),
        "calendarSynced" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Appointments table recreated');
    
    // Recreate audit_logs table
    await client.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      CREATE TABLE audit_logs (
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
    
    console.log('Audit_logs table recreated');
    
    // Recreate notifications table
    await client.query(`
      DROP TABLE IF EXISTS notifications CASCADE;
      CREATE TABLE notifications (
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
    
    console.log('Notifications table recreated');
    
    await client.end();
    console.log('All tables created successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
  }
}

createTables();
