import { createConnection } from 'typeorm';

async function testConnection() {
  try {
    const connection = await createConnection({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '1234',
      database: 'postgres', // Connect to default DB first
    });

    // Check if our database exists
    const result = await connection.query(
      "SELECT 1 FROM pg_database WHERE datname = 'appointment_db'"
    );

    if (result.length === 0) {
      console.log('Database appointment_db does not exist. Creating...');
      await connection.query('CREATE DATABASE appointment_db');
      console.log('Database created successfully!');
    } else {
      console.log('Database appointment_db already exists.');
    }

    await connection.close();
    console.log('✅ Database connection test passed!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();