import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { User } from './users/user.entity';
import { Appointment } from './appointments/appointment.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'SmartOffice@2026!',
  database: process.env.DB_NAME || 'appointment_db',
  entities: [User, Appointment],
  synchronize: false,
  logging: false,
});

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const userRepo = AppDataSource.getRepository(User);
    const appointmentRepo = AppDataSource.getRepository(Appointment);

    // Check if users already exist
    const existingUsers = await userRepo.count();
    if (existingUsers > 0) {
      console.log('⚠️ Users already exist. Skipping seed...');
      console.log(`📊 Current data: ${existingUsers} users, ${await appointmentRepo.count()} appointments`);
      await AppDataSource.destroy();
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    
    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: await bcrypt.hash('Admin@2026!', salt),
        role: 'admin',
        department: 'Administration',
        isActive: true,
      },
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@example.com',
        password: await bcrypt.hash('Staff@2026!', salt),
        role: 'staff',
        department: 'Cardiology',
        specialization: 'Cardiologist',
        experience: 12,
        isActive: true,
      },
      {
        name: 'Dr. Michael Chen',
        email: 'michael.chen@example.com',
        password: await bcrypt.hash('Staff@2026!', salt),
        role: 'staff',
        department: 'Neurology',
        specialization: 'Neurologist',
        experience: 8,
        isActive: true,
      },
      {
        name: 'John Smith',
        email: 'john.smith@example.com',
        password: await bcrypt.hash('User@2026!', salt),
        role: 'user',
        company: 'Tech Solutions Inc',
        phone: '+251912345678',
        isActive: true,
      },
      {
        name: 'Emily Davis',
        email: 'emily.davis@example.com',
        password: await bcrypt.hash('User@2026!', salt),
        role: 'user',
        company: 'Davis Consulting',
        phone: '+251923456789',
        isActive: true,
      },
    ];

    const createdUsers = [];
    for (const userData of users) {
      const user = userRepo.create(userData);
      await userRepo.save(user);
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.email} (${user.role})`);
    }

    const now = new Date();
    
    const staffSarah = createdUsers.find(u => u.email === 'sarah.johnson@example.com');
    const staffMichael = createdUsers.find(u => u.email === 'michael.chen@example.com');
    const userJohn = createdUsers.find(u => u.email === 'john.smith@example.com');
    const userEmily = createdUsers.find(u => u.email === 'emily.davis@example.com');
    
    const appointments = [
      {
        serviceName: 'Cardiology Consultation',
        providerName: staffSarah?.name || 'Dr. Sarah Johnson',
        datetime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        userId: userJohn?.id,
        userEmail: userJohn?.email,
        userName: userJohn?.name,
        age: 45,
        gender: 'Male',
        priority: 'Normal',
        status: 'Pending',
      },
      {
        serviceName: 'Neurology Appointment',
        providerName: staffMichael?.name || 'Dr. Michael Chen',
        datetime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        userId: userEmily?.id,
        userEmail: userEmily?.email,
        userName: userEmily?.name,
        age: 32,
        gender: 'Female',
        priority: 'High',
        status: 'Approved',
      },
    ];

    for (const app of appointments) {
      if (app.userId) {
        const appointment = appointmentRepo.create(app);
        await appointmentRepo.save(appointment);
        console.log(`✅ Created appointment: ${app.serviceName} for ${app.userName}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ SEEDING COMPLETED SUCCESSFULLY');
    console.log('='.repeat(50));
    console.log('\n🔑 TEST CREDENTIALS:');
    console.log('📌 ADMIN: admin@example.com / Admin@2026!');
    console.log('📌 STAFF: sarah.johnson@example.com / Staff@2026!');
    console.log('📌 STAFF: michael.chen@example.com / Staff@2026!');
    console.log('📌 USER: john.smith@example.com / User@2026!');
    console.log('📌 USER: emily.davis@example.com / User@2026!');
    console.log('='.repeat(50));

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

seed();