const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function addAppointments() {
  try {
    console.log('\n========================================');
    console.log('Adding Appointments to Database');
    console.log('========================================\n');
    
    // Get user IDs
    const users = await pool.query('SELECT id, email, name FROM users');
    const userMap = {};
    users.rows.forEach(u => { userMap[u.email] = u; });
    
    console.log('Users found:');
    users.rows.forEach(u => console.log(`   - ${u.email} (ID: ${u.id})`));
    
    // Create appointments for user@example.com (John Smith)
    const john = userMap['user@example.com'];
    
    const appointments = [
      {
        serviceName: 'Cardiology Consultation',
        providerName: 'Dr. Sarah Johnson',
        datetime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
        userId: john.id,
        userEmail: john.email,
        userName: john.name,
        status: 'pending',
        priority: 'normal',
        duration: 60,
        notes: 'First time consultation'
      },
      {
        serviceName: 'Neurology Follow-up',
        providerName: 'Dr. Michael Chen',
        datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // next week
        userId: john.id,
        userEmail: john.email,
        userName: john.name,
        status: 'approved',
        priority: 'high',
        duration: 45,
        notes: 'Follow-up appointment'
      },
      {
        serviceName: 'Pediatric Checkup',
        providerName: 'Dr. Emily Rodriguez',
        datetime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        userId: john.id,
        userEmail: john.email,
        userName: john.name,
        status: 'completed',
        priority: 'normal',
        duration: 30,
        notes: 'Regular checkup - completed'
      },
      {
        serviceName: 'Physical Therapy',
        providerName: 'Dr. Sarah Johnson',
        datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        userId: john.id,
        userEmail: john.email,
        userName: john.name,
        status: 'approved',
        priority: 'urgent',
        duration: 60,
        notes: 'Emergency therapy session'
      },
      {
        serviceName: 'Dental Checkup',
        providerName: 'Dr. James Wilson',
        datetime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        userId: john.id,
        userEmail: john.email,
        userName: john.name,
        status: 'pending',
        priority: 'normal',
        duration: 45,
        notes: 'Routine dental exam'
      }
    ];
    
    for (const apt of appointments) {
      await pool.query(
        `INSERT INTO appointments (
          "serviceName", "providerName", datetime, "userId", "userEmail", "userName", 
          status, priority, duration, notes, "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          apt.serviceName, apt.providerName, apt.datetime, apt.userId, 
          apt.userEmail, apt.userName, apt.status, apt.priority, 
          apt.duration, apt.notes
        ]
      );
      console.log(`✓ Created: ${apt.serviceName} (${apt.status})`);
    }
    
    // Add VIP appointments
    const vip = userMap['vip@example.com'];
    if (vip) {
      const vipAppointments = [
        {
          serviceName: 'Executive Health Check',
          providerName: 'Dr. Sarah Johnson',
          datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          userId: vip.id,
          userEmail: vip.email,
          userName: vip.name,
          status: 'approved',
          priority: 'high',
          duration: 90,
          notes: 'VIP comprehensive checkup'
        },
        {
          serviceName: 'Nutrition Consultation',
          providerName: 'Dr. Michael Chen',
          datetime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          userId: vip.id,
          userEmail: vip.email,
          userName: vip.name,
          status: 'pending',
          priority: 'normal',
          duration: 60,
          notes: 'Diet and nutrition planning'
        }
      ];
      
      for (const apt of vipAppointments) {
        await pool.query(
          `INSERT INTO appointments (
            "serviceName", "providerName", datetime, "userId", "userEmail", "userName", 
            status, priority, duration, notes, "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            apt.serviceName, apt.providerName, apt.datetime, apt.userId, 
            apt.userEmail, apt.userName, apt.status, apt.priority, 
            apt.duration, apt.notes
          ]
        );
        console.log(`✓ Created: ${apt.serviceName} (${apt.status}) - VIP user`);
      }
    }
    
    // Verify appointments were added
    const result = await pool.query('SELECT COUNT(*) FROM appointments');
    console.log(`\n✅ Total appointments in database: ${result.rows[0].count}`);
    
    // Show appointments summary
    const statusCount = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM appointments 
      GROUP BY status
    `);
    console.log('\n📊 Appointments by status:');
    statusCount.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });
    
    console.log('\n========================================');
    console.log('✓ APPOINTMENTS ADDED SUCCESSFULLY!');
    console.log('========================================\n');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addAppointments();
