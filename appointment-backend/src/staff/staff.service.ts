// backend/src/staff/staff.service.ts
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/user.entity';
import { Appointment } from '../appointments/appointment.entity';
import * as bcrypt from 'bcryptjs';  // ✅ Use bcryptjs

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
  ) {}

  async findAll() {
    this.logger.log('📋 Fetching all staff members');
    
    const staff = await this.userRepo.find({
      where: { 
        role: UserRole.STAFF,
        isActive: true,
      },
      select: [
        'id', 'name', 'email', 'department', 'specialization',
        'experience', 'phone', 'bio',
        'avatar', 'isActive', 'emailVerified', 'createdAt', 'updatedAt'
      ],
      order: { createdAt: 'DESC' },
    });

    this.logger.log(`✅ Found ${staff.length} staff members`);
    return staff;
  }

  async findOne(id: number) {
    const staff = await this.userRepo.findOne({
      where: { id, role: UserRole.STAFF },
      select: [
        'id', 'name', 'email', 'department', 'specialization',
        'experience', 'phone', 'bio',
        'avatar', 'isActive', 'emailVerified', 'createdAt', 'updatedAt'
      ],
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    return staff;
  }

  async create(data: any, adminId: number) {
    this.logger.log(`📝 Creating staff member: ${data.email}`);

    const existing = await this.userRepo.findOne({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);  // ✅ bcryptjs works

    const staff = new User();
    staff.name = data.name;
    staff.email = data.email.toLowerCase().trim();
    staff.password = hashedPassword;
    staff.role = UserRole.STAFF;
    staff.status = UserStatus.ACTIVE;
    staff.isActive = true;
    staff.emailVerified = true;
    staff.department = data.department || null;
    staff.specialization = data.specialization || null;
    staff.experience = data.experience ? parseInt(data.experience, 10) : null;
    staff.phone = data.phone || null;
    staff.bio = data.bio || null;

    const saved = await this.userRepo.save(staff);
    this.logger.log(`✅ Staff created: ${data.email}`);

    const { password, ...result } = saved;
    return result;
  }

  async update(id: number, data: any) {
    const staff = await this.findOne(id);

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);  // ✅ bcryptjs works
    }

    if (data.name) staff.name = data.name;
    if (data.department) staff.department = data.department;
    if (data.specialization) staff.specialization = data.specialization;
    if (data.experience) staff.experience = parseInt(data.experience, 10);
    if (data.phone) staff.phone = data.phone;
    if (data.bio) staff.bio = data.bio;
    if (data.password) staff.password = data.password;

    const updated = await this.userRepo.save(staff);
    this.logger.log(`✅ Staff updated: ${staff.email}`);
    
    const { password, ...result } = updated;
    return result;
  }

  async remove(id: number, adminId: number) {
    const staff = await this.findOne(id);
    
    staff.isActive = false;
    staff.status = UserStatus.INACTIVE;
    await this.userRepo.save(staff);

    this.logger.log(`🗑️ Staff deactivated: ${staff.email} by admin ${adminId}`);
    return { success: true };
  }

  async getStats() {
    const total = await this.userRepo.count({
      where: { role: UserRole.STAFF, isActive: true },
    });

    const departments = await this.userRepo
      .createQueryBuilder('user')
      .select('user.department', 'department')
      .addSelect('COUNT(*)', 'count')
      .where('user.role = :role', { role: UserRole.STAFF })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .groupBy('user.department')
      .getRawMany();

    return {
      total,
      departments,
      active: total,
      inactive: await this.userRepo.count({
        where: { role: UserRole.STAFF, isActive: false },
      }),
    };
  }

  async getAppointments(staffId: number) {
    const staff = await this.findOne(staffId);
    
    return this.appointmentRepo.find({
      where: { 
        providerName: staff.name,
        isArchived: false,
      },
      order: { datetime: 'DESC' },
    });
  }
}