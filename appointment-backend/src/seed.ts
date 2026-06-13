@'
const { DataSource } = require('typeorm');
const bcrypt = require('bcryptjs');

// Define enums
const UserRole = {
  ADMIN: 'admin',
  STAFF: 'staff',
  USER: 'user',
};

const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification',
};

const BookingStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHECKED_IN: 'checked_in',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  ARCHIVED: 'archived'
};

const BookingPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Define entities directly
class User {
  constructor(id, email, password, name, role, status, isActive, emailVerified, createdAt, updatedAt) {
    this.id = id;
    this.email = email;
    this.password = password;
    this.name = name;
    this.role = role;
    this.status = status;
    this.isActive = isActive;
    this.emailVerified = emailVerified;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

class Appointment {
  constructor(id, serviceName, providerName, datetime, userId, userEmail, userName, status, priority, notes, duration, createdAt, updatedAt) {
    this.id = id;
    this.serviceName = serviceName;
    this.providerName = providerName;
    this.datetime = datetime;
    this.userId = userId;
    this.userEmail = userEmail;
    this.userName = userName;
    this.status = status;
    this.priority = priority;
    this.notes = notes;
    this.duration = duration;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

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

async function seed() {
  console.log('\n========================================');
  console.log('Starting Database Seed');
  console.log('========================================\n');

  try {
    await AppDataSource.initialize();
    console.log('✓ Database connected\n');

    const userRepo = AppDataSource.getRepository(User);
    const aptRepo = AppDataSource.getRepository(Appointment);

    // Check if data exists
    const existingUsers = await userRepo.count();
    if (existingUsers > 0) {
      const userCount = await userRepo.count();
      const aptCount = await aptRepo.count();
      console.log(`⚠ Data already exists: ${userCount} users, ${aptCount} appointments`);
      console.log('Skipping seed...');
      await AppDataSource.destroy();
      return;
    }

    const salt = await bcrypt.genSalt(10);

    // Create Admin
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
    console.log('✓ Admin created: admin@example.com / Admin123');

    // Create Regular User
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
    console.log('✓ User created: user@example.com / User123');

    // Create Staff User
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
    console.log('✓ Staff created: staff@example.com / Staff123');

    // Create VIP User
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
    console.log('✓ VIP created: vip@example.com / VIP123');

    // Create multiple appointments
    const appointments = [
      {
        serviceName: 'Cardiology Consultation',
        providerName: staff.name,
        datetime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        status: BookingStatus.PENDING,
        priority: BookingPriority.NORMAL,
        notes: 'First time consultation',
        duration: 60,
      },
      {
        serviceName: 'Neurology Follow-up',
        providerName: 'Dr. Michael Chen',
        datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // next week
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        status: BookingStatus.APPROVED,
        priority: BookingPriority.HIGH,
        notes: 'Follow-up appointment',
        duration: 45,
      },
      {
        serviceName: 'Pediatric Checkup',
        providerName: 'Dr. Emily Rodriguez',
        datetime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        status: BookingStatus.COMPLETED,
        priority: BookingPriority.NORMAL,
        notes: 'Regular checkup',
        duration: 30,
      },
      {
        serviceName: 'Physical Therapy',
        providerName: staff.name,
        datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        userId: vip.id,
        userEmail: vip.email,
        userName: vip.name,
        status: BookingStatus.APPROVED,
        priority: BookingPriority.URGENT,
        notes: 'Emergency therapy session',
        duration: 60,
      },
      {
        serviceName: 'Dental Checkup',
        providerName: 'Dr. James Wilson',
        datetime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        status: BookingStatus.PENDING,
        priority: BookingPriority.NORMAL,
        notes: 'Routine dental exam',
        duration: 45,
      },
      {
        serviceName: 'Eye Examination',
        providerName: 'Dr. Lisa Brown',
        datetime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
        userId: vip.id,
        userEmail: vip.email,
        userName: vip.name,
        status: BookingStatus.PENDING,
        priority: BookingPriority.NORMAL,
        notes: 'Annual eye exam',
        duration: 30,
      }
    ];

    for (const aptData of appointments) {
      const appointment = aptRepo.create(aptData);
      await aptRepo.save(appointment);
    }
    console.log(`✓ Created ${appointments.length} appointments\n`);

    const finalUsers = await userRepo.count();
    const finalApps = await aptRepo.count();
    
    console.log('========================================');
    console.log('✓ SEED COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log(`\n📊 Summary: ${finalUsers} users, ${finalApps} appointments\n`);
    console.log('🔑 Login Credentials:');
    console.log('   Admin: admin@example.com / Admin123');
    console.log('   User:  user@example.com / User123');
    console.log('   Staff: staff@example.com / Staff123');
    console.log('   VIP:   vip@example.com / VIP123');
    console.log('\n📅 Sample Appointments created with various statuses');
    console.log('   - Pending, Approved, Completed appointments available\n');
    console.log('========================================\n');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('\n✗ SEED FAILED!');
    console.error('Error:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

seed();
'@ | Out-File -FilePath seed.js -Encoding UTF8

Write-Host "✓ Created seed.js" -ForegroundColor Green