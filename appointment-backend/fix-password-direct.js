const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function fixPasswords() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const salt = await bcrypt.genSalt(10);

    // Define correct passwords
    const users = [
      { email: 'admin@example.com', password: 'Admin@206!' },
      { email: 'staff@example.com', password: 'Staff@2026!' },
      { email: 'user@example.com', password: 'User@2026!' },
      { email: 'vip@example.com', password: 'VIP123' }
    ];

    for (const user of users) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      // Update the user
      const result = await client.query(
        `UPDATE "user" 
         SET password = $1, status = 'active', "isActive" = true, "emailVerified" = true 
         WHERE email = $2
         RETURNING id, email, name, role`,
        [hashedPassword, user.email]
      );
      
      if (result.rows.length > 0) {
        console.log(`✅ ${user.email} -> ${user.password} (${result.rows[0].role})`);
      } else {
        console.log(`❌ ${user.email} not found`);
      }
    }

    // Verify the update
    const verify = await client.query(
      'SELECT id, email, name, role, status, "isActive" FROM "user" ORDER BY id'
    );
    
    console.log('\n📋 Updated Users:');
    console.table(verify.rows);

    await client.end();
    console.log('\n✅ Passwords fixed successfully!');
    console.log('🔑 Try logging in with: admin@example.com / Admin@206!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixPasswords();