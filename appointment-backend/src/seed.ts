import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from './users/user.entity';
import { Appointment, BookingStatus, BookingPriority } from './appointments/appointment.entity';

// ============================================
// DATASOURCE CONFIGURATION
// ============================================

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
  synchronize: true,
  logging: false,
  entities: [User, Appointment],
});

// ============================================
// ENHANCED SEED FUNCTION
// ============================================

async function seed() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║            🚀 ENHANCED DATABASE SEED                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully\n');

    const userRepo = AppDataSource.getRepository(User);
    const aptRepo = AppDataSource.getRepository(Appointment);

    // Check if data already exists
    const existingUsers = await userRepo.count();
    if (existingUsers > 0) {
      const userCount = await userRepo.count();
      const aptCount = await aptRepo.count();
      console.log(`⚠️ Data already exists: ${userCount} users, ${aptCount} appointments`);
      console.log('💡 To re-seed, truncate tables first or delete data manually.');
      console.log('Skipping seed...\n');
      await AppDataSource.destroy();
      return;
    }

    console.log('📝 Creating users...\n');
    console.log('┌─────────────────────────────────────────────────────────┐');
    const salt = await bcrypt.genSalt(10);

    // ============================================
    // 1. CREATE ADMIN USER
    // ============================================
    const admin = userRepo.create({
      email: 'admin@example.com',
      password: await bcrypt.hash('Admin123', salt),
      name: 'Admin User',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await userRepo.save(admin);
    console.log('│ 👑 Admin     │ admin@example.com        │ Admin123   │');

    // ============================================
    // 2. CREATE REGULAR USER (with appointments)
    // ============================================
    const user = userRepo.create({
      email: 'user@example.com',
      password: await bcrypt.hash('User123', salt),
      name: 'John Smith',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await userRepo.save(user);
    console.log('│ 👤 User      │ user@example.com         │ User123    │');

    // ============================================
    // 3. CREATE STAFF USER
    // ============================================
    const staff = userRepo.create({
      email: 'staff@example.com',
      password: await bcrypt.hash('Staff123', salt),
      name: 'Dr. Sarah Johnson',
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      isActive: true,
      emailVerified: true,
      department: 'Cardiology',
      specialization: 'Cardiologist',
      experience: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await userRepo.save(staff);
    console.log('│ 👨‍⚕️ Staff    │ staff@example.com         │ Staff123   │');

    // ============================================
    // 4. CREATE VIP USER
    // ============================================
    const vip = userRepo.create({
      email: 'vip@example.com',
      password: await bcrypt.hash('VIP123', salt),
      name: 'VIP Customer',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isActive: true,
      emailVerified: true,
      company: 'Premium Corp',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await userRepo.save(vip);
    console.log('│ 💎 VIP      │ vip@example.com           │ VIP123     │');

    // ============================================
    // 5. CREATE EXTRA TEST USERS
    // ============================================
    const testUsers = [
      { email: 'test@example.com', name: 'Test User' },
      { email: 'use@gmail.com', name: 'birtukan' },
      { email: 'birtukang1204@gmail.com', name: 'Birtukan getnet' },
      { email: 'joule@example.com', name: 'JOL' },
    ];

    for (const testUser of testUsers) {
      const test = userRepo.create({
        email: testUser.email,
        password: await bcrypt.hash('Test123', salt),
        name: testUser.name,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await userRepo.save(test);
    }
    console.log('│ 👥 Others   │ 4 additional test users   │ Test123   │');
    console.log('└─────────────────────────────────────────────────────────┘\n');

    console.log('📝 Creating appointments...\n');
    console.log('┌─────────────────────────────────────────────────────────┐');

    // ============================================
    // 6. CREATE APPOINTMENTS FOR REGULAR USER (5 appointments)
    // ============================================
    const now = new Date();
    const userAppointments = [
      {
        serviceName: 'Cardiology Consultation',
        providerName: staff.name,
        datetime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        status: BookingStatus.PENDING,
        priority: BookingPriority.NORMAL,
        notes: 'First time consultation with specialist',
        duration: 60,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        serviceName: 'Neurology Follow-up',
        providerName: 'Dr. Michael Chen',
        datetime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        status: BookingStatus.APPROVED,
        priority: BookingPriority.HIGH,
        notes: 'Follow-up appointment for ongoing treatment',
        duration: 45,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        serviceName: 'Pediatric Checkup',
        providerName: 'Dr. Emily Rodriguez',
        datetime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        status: BookingStatus.COMPLETED,
        priority: BookingPriority.NORMAL,
        notes: 'Regular annual checkup - completed',
        duration: 30,
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        serviceName: 'Physical Therapy',
        providerName: staff.name,
        datetime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        status: BookingStatus.APPROVED,
        priority: BookingPriority.URGENT,
        notes: 'Post-surgery physical therapy session',
        duration: 60,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      {
        serviceName: 'Dental Checkup',
        providerName: 'Dr. James Wilson',
        datetime: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        status: BookingStatus.PENDING,
        priority: BookingPriority.NORMAL,
        notes: 'Routine dental cleaning and exam',
        duration: 45,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const aptData of userAppointments) {
      const appointment = aptRepo.create(aptData);
      await aptRepo.save(appointment);
    }
    console.log(`│ ✅ 5 appointments for user@example.com                 │`);

    // ============================================
    // 7. CREATE APPOINTMENTS FOR VIP USER (2 appointments)
    // ============================================
    const vipAppointments = [
      {
        serviceName: 'Executive Health Checkup',
        providerName: staff.name,
        datetime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        userId: vip.id,
        userEmail: vip.email,
        userName: vip.name,
        status: BookingStatus.APPROVED,
        priority: BookingPriority.HIGH,
        notes: 'VIP comprehensive health checkup',
        duration: 90,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        serviceName: 'Nutrition Consultation',
        providerName: 'Dr. Michael Chen',
        datetime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        userId: vip.id,
        userEmail: vip.email,
        userName: vip.name,
        status: BookingStatus.PENDING,
        priority: BookingPriority.NORMAL,
        notes: 'Personalized nutrition and diet planning',
        duration: 60,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const aptData of vipAppointments) {
      const appointment = aptRepo.create(aptData);
      await aptRepo.save(appointment);
    }
    console.log(`│ ✅ 2 appointments for vip@example.com                  │`);

    // ============================================
    // 8. CREATE APPOINTMENT FOR TEST USER
    // ============================================
    const testUser = await userRepo.findOne({ where: { email: 'testuser20260616140634@example.com' } });
    if (testUser) {
      const testAppointment = aptRepo.create({
        serviceName: 'Cardiology Consultation',
        providerName: staff.name,
        datetime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        userId: testUser.id,
        userEmail: testUser.email,
        userName: testUser.name,
        status: BookingStatus.PENDING,
        priority: BookingPriority.NORMAL,
        notes: 'Test appointment from API',
        duration: 60,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      });
      await aptRepo.save(testAppointment);
      console.log(`│ ✅ 1 appointment for test user                       │`);
    }

    console.log('└─────────────────────────────────────────────────────────┘\n');

    // ============================================
    // 9. SUMMARY
    // ============================================
    const finalUsers = await userRepo.count();
    const finalApps = await aptRepo.count();
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ SEED COMPLETED SUCCESSFULLY!              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Summary:`);
    console.log(`   👤 Users: ${finalUsers}`);
    console.log(`   📅 Appointments: ${finalApps}`);
    console.log(`   📋 Staff Members: 1 (Dr. Sarah Johnson)`);
    console.log(`   👑 Admin: 1`);
    console.log(`   👤 Regular Users: ${finalUsers - 2 - 1}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('   ┌─────────────┬──────────────────────────┬────────────┐');
    console.log('   │ Role        │ Email                    │ Password   │');
    console.log('   ├─────────────┼──────────────────────────┼────────────┤');
    console.log('   │ 👑 Admin    │ admin@example.com        │ Admin123   │');
    console.log('   │ 👤 User     │ user@example.com         │ User123    │');
    console.log('   │ 👨‍⚕️ Staff   │ staff@example.com        │ Staff123   │');
    console.log('   │ 💎 VIP      │ vip@example.com          │ VIP123     │');
    console.log('   │ 👥 Test     │ test@example.com         │ Test123    │');
    console.log('   └─────────────┴──────────────────────────┴────────────┘');
    
    console.log('\n📅 Appointments Summary:');
    console.log('   ┌─────────────────────────────────────────────────────┐');
    console.log('   │ User              │ Appointments │ Statuses         │');
    console.log('   ├─────────────────────────────────────────────────────┤');
    console.log(`   │ user@example.com  │ 5            │ 2 Pending, 2 Approved, 1 Completed │`);
    console.log(`   │ vip@example.com   │ 2            │ 1 Pending, 1 Approved            │`);
    console.log(`   │ test user         │ 1            │ 1 Pending                        │`);
    console.log('   └─────────────────────────────────────────────────────┘');
    
    console.log('\n📅 Status Distribution:');
    console.log('   ✅ Approved:  3 appointments');
    console.log('   ⏳ Pending:   4 appointments');
    console.log('   ✅ Completed: 1 appointment');
    console.log('   🚨 Urgent:    1 appointment');
    console.log('   🔥 High:      2 appointments');
    console.log('   📋 Normal:    5 appointments');
    
    console.log('\n🚀 To test the dashboard:');
    console.log('   📧 Login: user@example.com');
    console.log('   🔑 Password: User123');
    console.log('   📊 You will see 5 appointments on your dashboard!\n');
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     🎉 DATABASE IS READY FOR PRODUCTION USE!             ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗');
    console.error('║              ✗ SEED FAILED!                               ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    
    // ✅ SAFE ERROR HANDLING - Check if error is an instance of Error
    if (error instanceof Error) {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error('\n📋 Stack Trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Error:', String(error));
    }
    
    process.exit(1);
  }
}

// Run the seed
seed();