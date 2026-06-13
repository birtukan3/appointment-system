import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './users/user.entity';
import { Appointment, BookingStatus, BookingPriority } from './appointments/appointment.entity';
import { Upload } from './uploads/upload.entity';
import { Testimonial } from './testimonials/testimonial.entity';
import { AuditLog } from './audit/audit.entity';
import { UserLimitOverride } from './users/user-limit-override.entity';
import { SystemSettings } from './settings/settings.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'SmartOffice@2026!',
  database: 'appointment_db',
  entities: [User, Appointment, Upload, Testimonial, AuditLog, UserLimitOverride, SystemSettings],
  synchronize: true,
  logging: false,
});

async function seed() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 STARTING DATABASE SEEDING');
  console.log('='.repeat(60) + '\n');

  try {
    console.log('📡 Connecting to PostgreSQL database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully\n');

    const userRepo = AppDataSource.getRepository(User);
    const aptRepo = AppDataSource.getRepository(Appointment);
    const settingsRepo = AppDataSource.getRepository(SystemSettings);
    const auditRepo = AppDataSource.getRepository(AuditLog);

    console.log('🧹 Clearing audit logs...');
    await auditRepo.clear();
    console.log('✅ Audit logs cleared\n');

    console.log('🔍 Checking existing data...');
    const existingAdmin = await userRepo.findOne({ where: { email: 'admin@example.com' } });
    
    if (existingAdmin) {
      const userCount = await userRepo.count();
      const aptCount = await aptRepo.count();
      console.log(`⚠️ Users already exist. Skipping seed...`);
      console.log(`📊 Current data: ${userCount} users, ${aptCount} appointments`);
      await AppDataSource.destroy();
      return;
    }

    console.log('📝 Creating system settings...\n');
    
    const settings = settingsRepo.create({
      dailyLimit: 3,
      weeklyLimit: 10,
      monthlyLimit: 30,
      activeLimit: 3,
      cooldownMinutes: 5,
      autoArchiveDays: 30,
      maxBookingsPerDay: 3,
      maintenanceMode: false,
      notificationsEnabled: true,
      updatedBy: null,
    });
    await settingsRepo.save(settings);
    console.log('  ✅ System settings created with default limits');

    console.log('📝 Creating demo users...\n');
    const salt = await bcrypt.genSalt(10);

    // Admin
    const admin = userRepo.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: await bcrypt.hash('Admin@2026!', salt),
      role: UserRole.ADMIN,
      isActive: true,
      isDeactivated: false,
      failedLoginAttempts: 0,
    });
    await userRepo.save(admin);
    console.log('  ✅ Admin: admin@example.com / Admin@2026!');

    // Regular User
    const user = userRepo.create({
      name: 'John Smith',
      email: 'user@example.com',
      password: await bcrypt.hash('User@2026!', salt),
      role: UserRole.USER,
      company: 'Tech Corp',
      phone: '+251911234567',
      isActive: true,
      isDeactivated: false,
    });
    await userRepo.save(user);
    console.log('  ✅ User: user@example.com / User@2026!');

    // VIP User
    const vipUser = userRepo.create({
      name: 'VIP Customer',
      email: 'vip@example.com',
      password: await bcrypt.hash('VIP@2026!', salt),
      role: UserRole.USER,
      company: 'Premium Corp',
      phone: '+251916789012',
      isActive: true,
      isDeactivated: false,
    });
    await userRepo.save(vipUser);
    console.log('  ✅ VIP: vip@example.com / VIP@2026!');

    // Staff Users
    const staff1 = userRepo.create({
      name: 'Dr. Sarah Johnson',
      email: 'staff@example.com',
      password: await bcrypt.hash('Staff@2026!', salt),
      role: UserRole.STAFF,
      department: 'Cardiology',
      specialization: 'Cardiologist',
      experience: 12,
      phone: '+251912345678',
      bio: 'Board-certified cardiologist',
      isActive: true,
      isDeactivated: false,
    });
    await userRepo.save(staff1);
    console.log('  ✅ Staff: staff@example.com / Staff@2026!');

    const staff2 = userRepo.create({
      name: 'Dr. Michael Chen',
      email: 'michael.chen@example.com',
      password: await bcrypt.hash('Staff@2026!', salt),
      role: UserRole.STAFF,
      department: 'Neurology',
      specialization: 'Neurologist',
      experience: 8,
      phone: '+251913456789',
      bio: 'Neurology specialist',
      isActive: true,
      isDeactivated: false,
    });
    await userRepo.save(staff2);
    console.log('  ✅ Staff: michael.chen@example.com / Staff@2026!');

    const staff3 = userRepo.create({
      name: 'Dr. Emily Rodriguez',
      email: 'emily.rodriguez@example.com',
      password: await bcrypt.hash('Staff@2026!', salt),
      role: UserRole.STAFF,
      department: 'Pediatrics',
      specialization: 'Pediatrician',
      experience: 15,
      phone: '+251914567890',
      bio: 'Pediatric specialist',
      isActive: true,
      isDeactivated: false,
    });
    await userRepo.save(staff3);
    console.log('  ✅ Staff: emily.rodriguez@example.com / Staff@2026!');

    console.log('\n📅 Creating sample appointments...\n');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 30, 0, 0);
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 5);
    lastWeek.setHours(11, 0, 0, 0);

    // Appointment 1 - Pending
    const appointment1 = aptRepo.create({
      serviceName: 'Cardiology Consultation',
      providerName: staff1.name,
      providerId: staff1.id,
      datetime: tomorrow,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      notes: 'First time consultation',
      status: BookingStatus.PENDING,
      priority: BookingPriority.NORMAL,
      duration: 60,
      isArchived: false,
    });
    await aptRepo.save(appointment1);
    console.log(`  ✅ Appointment #1: Pending`);

    // Appointment 2 - Approved
    const appointment2 = aptRepo.create({
      serviceName: 'Neurology Follow-up',
      providerName: staff2.name,
      providerId: staff2.id,
      datetime: nextWeek,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      notes: 'Follow-up appointment',
      status: BookingStatus.APPROVED,
      priority: BookingPriority.HIGH,
      duration: 45,
      isArchived: false,
    });
    await aptRepo.save(appointment2);
    console.log(`  ✅ Appointment #2: Approved`);

    // Appointment 3 - Completed
    const appointment3 = aptRepo.create({
      serviceName: 'Pediatric Checkup',
      providerName: staff3.name,
      providerId: staff3.id,
      datetime: lastWeek,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      notes: 'Regular checkup',
      status: BookingStatus.COMPLETED,
      priority: BookingPriority.NORMAL,
      duration: 30,
      isArchived: false,
      completedAt: new Date(),
    });
    await aptRepo.save(appointment3);
    console.log(`  ✅ Appointment #3: Completed`);

    // Additional user
    const secondUser = userRepo.create({
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      password: await bcrypt.hash('User@2026!', salt),
      role: UserRole.USER,
      company: 'Design Studio',
      phone: '+251915678901',
      isActive: true,
      isDeactivated: false,
    });
    await userRepo.save(secondUser);
    console.log('\n  ✅ Additional user: jane.doe@example.com / User@2026!');

    // Appointment 4 - For second user
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    dayAfterTomorrow.setHours(15, 0, 0, 0);

    const appointment4 = aptRepo.create({
      serviceName: 'Cardiology Consultation',
      providerName: staff1.name,
      providerId: staff1.id,
      datetime: dayAfterTomorrow,
      userId: secondUser.id,
      userEmail: secondUser.email,
      userName: secondUser.name,
      notes: 'Routine examination',
      status: BookingStatus.APPROVED,
      priority: BookingPriority.NORMAL,
      duration: 60,
      isArchived: false,
    });
    await aptRepo.save(appointment4);
    console.log(`  ✅ Appointment #4: Approved`);

    const finalUserCount = await userRepo.count();
    const finalAptCount = await aptRepo.count();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📊 SUMMARY: ${finalUserCount} users, ${finalAptCount} appointments`);
    console.log('\n🔑 LOGIN CREDENTIALS:');
    console.log('   Admin: admin@example.com / Admin@2026!');
    console.log('   User: user@example.com / User@2026!');
    console.log('   VIP: vip@example.com / VIP@2026!');
    console.log('   Staff: staff@example.com / Staff@2026!');
    console.log('\n⚙️ SYSTEM SETTINGS (default limits):');
    console.log('   Daily Limit: 3 bookings');
    console.log('   Weekly Limit: 10 bookings');
    console.log('   Monthly Limit: 30 bookings');
    console.log('   Active Limit: 3 active bookings');
    console.log('   Cooldown: 5 minutes');
    console.log('   Auto-archive: 30 days');
    console.log('   Maintenance Mode: false');
    console.log('   Notifications: enabled');
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ SEEDING FAILED!');
    console.error('Error:', error instanceof Error ? error.message : error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

seed();