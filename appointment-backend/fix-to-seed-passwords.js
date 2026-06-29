const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function fixToSeedPasswords() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const salt = await bcrypt.genSalt(10);

    // Seed passwords (matching the seed file)
    const users = [
      { email: 'admin@example.com', password: 'Admin123', role: 'admin' },
      { email: 'staff@example.com', password: 'Staff123', role: 'staff' },
      { email: 'user@example.com', password: 'User123', role: 'user' },
      { email: 'vip@example.com', password: 'VIP123', role: 'user' }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      await client.query(
        `UPDATE "user" 
         SET password = $1, status = 'active', "isActive" = true, "emailVerified" = true 
         WHERE email = $2`,
        [hashedPassword, user.email]
      );
      
      console.log(`✅ ${user.email} -> ${user.password} (${user.role})`);
    }

    // Verify
    const result = await client.query(
      'SELECT id, email, name, role, status, "isActive" FROM "user" ORDER BY id'
    );
    
    console.log('\n📋 Updated Users:');
    console.table(result.rows);

    await client.end();
    console.log('\n✅ Passwords fixed to match seed!');
    console.log('🔑 Try logging in with: admin@example.com / Admin123');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixToSeedPasswords();