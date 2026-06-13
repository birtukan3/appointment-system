import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByIdWithPassword(id: number): Promise<User | null> {
    return this.userRepo.findOne({ 
      where: { id },
      select: ['id', 'email', 'name', 'password', 'role', 'isActive', 'failedLoginAttempts', 'lockUntil', 'twoFactorEnabled'] as any,
    });
  }

  async getStaff(): Promise<User[]> {
    return this.userRepo.find({ 
      where: { role: UserRole.STAFF, isActive: true, isDeactivated: false },
      select: ['id', 'name', 'email', 'department', 'specialization', 'experience', 'phone', 'bio', 'createdAt', 'avatar'] as any,
      order: { name: 'ASC' },
    });
  }

  async getStaffWithDetails(): Promise<any[]> {
    const staff = await this.getStaff();
    
    return staff.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      department: s.department || 'General',
      specialization: s.specialization || 'General',
      experience: s.experience || 0,
      phone: s.phone || '',
      bio: s.bio || '',
      createdAt: s.createdAt,
      rating: 4.5,
      reviews: Math.floor(30 + Math.random() * 100),
      position: s.specialization || s.department || 'Staff Member',
      availability: Math.floor(70 + Math.random() * 25),
    }));
  }

  async createStaff(staffData: any): Promise<User> {
    const existing = await this.findByEmail(staffData.email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    
    const hashedPassword = await bcrypt.hash(staffData.password, 10);
    
    const staff = this.userRepo.create({
      name: staffData.name,
      email: staffData.email.toLowerCase(),
      password: hashedPassword,
      role: UserRole.STAFF,
      department: staffData.department,
      specialization: staffData.specialization,
      experience: staffData.experience ? parseInt(staffData.experience, 10) : null,
      phone: staffData.phone,
      bio: staffData.bio,
      isActive: true,
      isDeactivated: false,
      emailVerified: true,
    });
    
    const savedStaff = await this.userRepo.save(staff);
    this.logger.log(`Created staff member: ${staffData.email}`);
    
    const { password, ...result } = savedStaff;
    return result as User;
  }

  async updateProfile(userId: number, data: { name?: string; phone?: string; company?: string; department?: string }): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (data.name) user.name = data.name;
    if (data.phone) user.phone = data.phone;
    if (data.company) user.company = data.company;
    if (data.department) user.department = data.department;
    
    const updatedUser = await this.userRepo.save(user);
    this.logger.log(`Updated profile for user ${user.email}`);
    
    const { password, ...result } = updatedUser;
    return result as User;
  }

  async delete(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    await this.userRepo.remove(user);
    this.logger.log(`Deleted user ${user.email}`);
  }

  async findAll(search?: string, page: number = 1, limit: number = 20): Promise<{ data: User[]; total: number; page: number; totalPages: number }> {
    const queryBuilder = this.userRepo.createQueryBuilder('user');
    
    if (search) {
      queryBuilder.where('user.name ILIKE :search OR user.email ILIKE :search', { search: `%${search}%` });
    }
    
    const skip = (page - 1) * limit;
    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();

    // Remove passwords from response
    const sanitizedData = data.map(({ password, ...rest }) => rest as User);

    return {
      data: sanitizedData,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.findByIdWithPassword(userId);
    if (!user) return false;
    
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) return false;
    
    // Validate new password strength
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(newPassword)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new BadRequestException('Password must contain at least one number');
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();
    await this.userRepo.save(user);
    
    this.logger.log(`Password changed for user ${user.email}`);
    return true;
  }

  async deactivateAccount(userId: number, reason?: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    
    user.isActive = false;
    user.isDeactivated = true;
    user.deactivatedAt = new Date();
    user.deactivationReason = reason || 'No reason provided';
    await this.userRepo.save(user);
    
    this.logger.log(`Account deactivated for user ${user.email}`);
  }

  async reactivateAccount(userId: number): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    
    user.isActive = true;
    user.isDeactivated = false;
    user.deactivatedAt = null;
    user.deactivationReason = null;
    await this.userRepo.save(user);
    
    this.logger.log(`Account reactivated for user ${user.email}`);
  }

  async enableTwoFactor(userId: number, secret: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    
    user.twoFactorEnabled = true;
    user.twoFactorSecret = secret;
    await this.userRepo.save(user);
    
    this.logger.log(`2FA enabled for user ${user.email}`);
  }

  async disableTwoFactor(userId: number): Promise<void> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await this.userRepo.save(user);
    
    this.logger.log(`2FA disabled for user ${user.email}`);
  }

  async incrementFailedAttempts(userId: number): Promise<void> {
    const user = await this.findById(userId);
    if (user) {
      user.failedLoginAttempts += 1;
      user.lastFailedLoginAt = new Date();
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        this.logger.warn(`Account locked for user ${user.email} due to ${user.failedLoginAttempts} failed attempts`);
      }
      await this.userRepo.save(user);
    }
  }

  async resetFailedAttempts(userId: number): Promise<void> {
    const user = await this.findById(userId);
    if (user) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      user.lastFailedLoginAt = null;
      user.lastLoginAt = new Date();
      await this.userRepo.save(user);
    }
  }

  async isAccountLocked(userId: number): Promise<{ locked: boolean; remainingMinutes?: number }> {
    const user = await this.findById(userId);
    if (!user) return { locked: false };
    
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return { locked: true, remainingMinutes };
    }
    
    // Clear lock if expired
    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.lockUntil = null;
      user.failedLoginAttempts = 0;
      await this.userRepo.save(user);
    }
    
    return { locked: false };
  }
}
