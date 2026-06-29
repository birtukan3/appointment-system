// check-db.js - Complete Database Viewer (NO ERRORS)
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
});

async function checkDatabase() {
  try {
    await client.connect();
    console.log('\n========================================');
    console.log('     📊 DATABASE DATA VIEWER');
    console.log('========================================\n');

    // ============================================
    // 1. USERS TABLE
    // ============================================
    console.log('📋 USERS:');
    console.log('----------------------------------------');
    const users = await client.query(`
      SELECT 
        id, 
        email, 
        name, 
        role, 
        status,
        "isActive",
        department,
        specialization,
        experience,
        company,
        "createdAt"
      FROM "user" 
      ORDER BY id;
    `);
    
    console.log(`Total: ${users.rows.length} users\n`);
    users.rows.forEach((u) => {
      console.log(`  ${u.id}. ${u.name} (${u.email})`);
      console.log(`     Role: ${u.role} | Status: ${u.status} | Active: ${u.isActive ? '✅' : '❌'}`);
      if (u.department) console.log(`     Department: ${u.department}`);
      if (u.specialization) console.log(`     Specialization: ${u.specialization}`);
      if (u.experience) console.log(`     Experience: ${u.experience} years`);
      if (u.company) console.log(`     Company: ${u.company}`);
      console.log(`     Created: ${u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'}`);
      console.log('');
    });

    // ============================================
    // 2. STAFF MEMBERS
    // ============================================
    console.log('👨‍⚕️ STAFF MEMBERS:');
    console.log('----------------------------------------');
    const staff = await client.query(`
      SELECT id, name, email, department, specialization, experience 
      FROM "user" 
      WHERE role = 'staff'
      ORDER BY name;
    `);
    
    console.log(`Total: ${staff.rows.length} staff members\n`);
    staff.rows.forEach(s => {
      console.log(`  ${s.id}. ${s.name}`);
      console.log(`     Email: ${s.email}`);
      if (s.department) console.log(`     Department: ${s.department}`);
      if (s.specialization) console.log(`     Specialization: ${s.specialization}`);
      if (s.experience) console.log(`     Experience: ${s.experience} years`);
      console.log('');
    });

    // ============================================
    // 3. APPOINTMENTS
    // ============================================
    console.log('📅 APPOINTMENTS:');
    console.log('----------------------------------------');
    const totalApps = await client.query('SELECT COUNT(*) FROM appointment;');
    console.log(`Total: ${totalApps.rows[0].count} appointments\n`);

    const appointments = await client.query(`
      SELECT 
        id,
        "serviceName",
        "providerName",
        datetime,
        status,
        priority,
        "userName",
        "userEmail",
        duration,
        notes,
        "createdAt"
      FROM appointment 
      ORDER BY id DESC;
    `);
    
    appointments.rows.forEach((a) => {
      console.log(`  ${a.id}. ${a.serviceName}`);
      console.log(`     Provider: ${a.providerName}`);
      console.log(`     Client: ${a.userName} (${a.userEmail})`);
      console.log(`     Date: ${a.datetime ? new Date(a.datetime).toLocaleString() : 'N/A'}`);
      console.log(`     Status: ${a.status} | Priority: ${a.priority || 'Normal'}`);
      console.log(`     Duration: ${a.duration || 30} minutes`);
      if (a.notes) console.log(`     Notes: ${a.notes}`);
      console.log(`     Created: ${a.createdAt ? new Date(a.createdAt).toLocaleString() : 'N/A'}`);
      console.log('');
    });

    // ============================================
    // 4. SUMMARY STATISTICS
    // ============================================
    console.log('📊 SUMMARY STATISTICS:');
    console.log('----------------------------------------');
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM "user") as total_users,
        (SELECT COUNT(*) FROM "user" WHERE "isActive" = true) as active_users,
        (SELECT COUNT(*) FROM "user" WHERE role = 'admin') as admins,
        (SELECT COUNT(*) FROM "user" WHERE role = 'staff') as staff,
        (SELECT COUNT(*) FROM "user" WHERE role = 'user') as regular_users,
        (SELECT COUNT(*) FROM appointment) as total_appointments,
        (SELECT COUNT(*) FROM appointment WHERE status = 'pending') as pending,
        (SELECT COUNT(*) FROM appointment WHERE status = 'approved') as approved,
        (SELECT COUNT(*) FROM appointment WHERE status = 'rejected') as rejected,
        (SELECT COUNT(*) FROM appointment WHERE status = 'completed') as completed,
        (SELECT COUNT(*) FROM appointment WHERE status = 'cancelled') as cancelled
    `);
    
    const s = stats.rows[0];
    console.log(`  Total Users: ${s.total_users}`);
    console.log(`  Active Users: ${s.active_users}`);
    console.log(`  Admins: ${s.admins}`);
    console.log(`  Staff: ${s.staff}`);
    console.log(`  Regular Users: ${s.regular_users}`);
    console.log(`  Total Appointments: ${s.total_appointments}`);
    console.log(`  Pending: ${s.pending}`);
    console.log(`  Approved: ${s.approved}`);
    console.log(`  Rejected: ${s.rejected}`);
    console.log(`  Completed: ${s.completed}`);
    console.log(`  Cancelled: ${s.cancelled || 0}`);

    // ============================================
    // 5. DEMO CREDENTIALS
    // ============================================
    console.log('\n🔑 DEMO LOGIN CREDENTIALS:');
    console.log('----------------------------------------');
    console.log('  Admin:  admin@example.com  /  Admin123');
    console.log('  Staff:  staff@example.com  /  Staff123');
    console.log('  User:   user@example.com   /  User123');
    console.log('  VIP:    vip@example.com    /  VIP123');

    console.log('\n========================================');
    console.log('✅ Database check complete!');
    console.log('========================================\n');

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase();