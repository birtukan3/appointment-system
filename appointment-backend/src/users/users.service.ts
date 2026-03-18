import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<Partial<User>> {
    // Normalize email to lowercase
    const normalizedEmail = dto.email.toLowerCase().trim();
    
    // Check if user exists
    const existing = await this.repo.findOne({ 
      where: { email: normalizedEmail } 
    });
    
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    // Create user object
    const userData: Partial<User> = {
      name: dto.name,
      email: normalizedEmail,
      password: hashedPassword,
      role: dto.role || 'user',
    };

    // Add optional fields
    if (dto.company) userData.company = dto.company;
    if (dto.phone) userData.phone = dto.phone;
    if (dto.countryCode) userData.countryCode = dto.countryCode;
    if (dto.department) userData.department = dto.department;

    const user = this.repo.create(userData);
    const savedUser = await this.repo.save(user);
    
    const { password, ...result } = savedUser;
    return result;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.repo.findOne({ where: { email: normalizedEmail } });
  }

  async findById(id: number): Promise<Partial<User>> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...result } = user;
    return result;
  }

  async findAll(): Promise<Partial<User>[]> {
    const users = await this.repo.find();
    return users.map(({ password, ...user }) => user);
  }

  async getStaff(): Promise<Partial<User>[]> {
  const staff = await this.repo.find({ 
    where: { role: 'staff', isActive: true },
    select: ['id', 'name', 'email', 'department'],
    order: { name: 'ASC' }
  });
  return staff;
}

  async update(id: number, dto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    console.log('Before update:', user);
    console.log('Update data:', dto);

    // Simple direct assignment
    if (dto.name) user.name = dto.name;
    if (dto.company) user.company = dto.company;
    if (dto.phone) user.phone = dto.phone;
    if (dto.countryCode) user.countryCode = dto.countryCode;
    if (dto.department) user.department = dto.department;
    
    const updated = await this.repo.save(user);
    console.log('After update:', updated);
    
    const { password, ...result } = updated;
    return result;
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.repo.delete(id);
    return { message: 'User deleted successfully' };
  }
}