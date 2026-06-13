// D:\Desktop\AppointmentSystem\appointment-backend\manual-seed.js
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function seed() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const salt = await bcrypt.genSalt(10);
    
    // Admin User
    const adminPassword = await bcrypt.hash('Admin@2026!', salt);
    await client.query(`
      INSERT INTO users (name, email, password, role, "isActive", "emailVerified", "failedLoginAttempts")
      VALUES ($1, $2, $3, $4, true, true, 0)
      ON CONFLICT (email) DO UPDATE SET 
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        role = EXCLUDED.role
    `, ['Admin User', 'admin@example.com', adminPassword, 'admin']);
    console.log('✅ Admin user created: admin@example.com / Admin@2026!');

    // Staff User
    const staffPassword = await bcrypt.hash('Staff@2026!', salt);
    await client.query(`
      INSERT INTO users (name, email, password, role, department, specialization, "isActive", "emailVerified", "failedLoginAttempts")
      VALUES ($1, $2, $3, $4, $5, $6, true, true, 0)
      ON CONFLICT (email) DO UPDATE SET 
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        department = EXCLUDED.department,
        specialization = EXCLUDED.specialization
    `, ['Dr. Sarah Johnson', 'staff@example.com', staffPassword, 'staff', 'Cardiology', 'Cardiologist']);
    console.log('✅ Staff user created: staff@example.com / Staff@2026!');

    // Regular User
    const userPassword = await bcrypt.hash('User@2026!', salt);
    await client.query(`
      INSERT INTO users (name, email, password, role, company, phone, "isActive", "emailVerified", "failedLoginAttempts")
      VALUES ($1, $2, $3, $4, $5, $6, true, true, 0)
      ON CONFLICT (email) DO UPDATE SET 
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        role = EXCLUDED.role
    `, ['John Smith', 'user@example.com', userPassword, 'user', 'Tech Corp', '+251911234567']);
    console.log('✅ Regular user created: user@example.com / User@2026!');

    // VIP User
    const vipPassword = await bcrypt.hash('VIP@2026!', salt);
    await client.query(`
      INSERT INTO users (name, email, password, role, company, phone, "isActive", "emailVerified", "failedLoginAttempts")
      VALUES ($1, $2, $3, $4, $5, $6, true, true, 0)
      ON CONFLICT (email) DO UPDATE SET 
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        role = EXCLUDED.role
    `, ['VIP Customer', 'vip@example.com', vipPassword, 'user', 'Premium Corp', '+251916789012']);
    console.log('✅ VIP user created: vip@example.com / VIP@2026!');

    // Verify users were created
    const result = await client.query('SELECT id, name, email, role FROM users');
    console.log('\n📊 Users in database:');
    console.table(result.rows);

    await client.end();
    console.log('\n✅ Seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    await client.end();
  }
}

seed();