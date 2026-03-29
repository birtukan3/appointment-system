import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<Partial<User>> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    
    const existing = await this.repo.findOne({ 
      where: { email: normalizedEmail } 
    });
    
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    const userData: Partial<User> = {
      name: dto.name,
      email: normalizedEmail,
      password: hashedPassword,
      role: dto.role || 'user',
      isActive: dto.isActive ?? true,
    };

    if (dto.phone) userData.phone = dto.phone;
    if (dto.company) userData.company = dto.company;
    if (dto.department) userData.department = dto.department;
    if (dto.specialization) userData.specialization = dto.specialization;
    if (dto.experience) userData.experience = dto.experience;

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
    return users.map(({ password, ...rest }) => rest);
  }

  async getStaff(): Promise<Partial<User>[]> {
    const staff = await this.repo.find({
      where: { role: 'staff', isActive: true },
      order: { name: 'ASC' },
    });
    return staff.map(({ password, ...rest }) => rest);
  }

  async findByProviderName(providerName: string): Promise<Partial<User> | null> {
    const user = await this.repo.findOne({
      where: { name: providerName, role: 'staff', isActive: true },
    });
    if (!user) return null;
    const { password, ...result } = user;
    return result;
  }

  async searchStaff(query: string, limit: number = 10): Promise<Partial<User>[]> {
    if (!query || !query.trim()) return [];
    
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const staff = await this.repo
      .createQueryBuilder('user')
      .where('user.role = :role', { role: 'staff' })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(user.name) LIKE LOWER(:search)', { search: searchTerm })
            .orWhere('LOWER(user.email) LIKE LOWER(:search)', { search: searchTerm })
            .orWhere('LOWER(COALESCE(user.department, \'\')) LIKE LOWER(:search)', { search: searchTerm })
            .orWhere('LOWER(COALESCE(user.specialization, \'\')) LIKE LOWER(:search)', { search: searchTerm });
        }),
      )
      .orderBy('user.name', 'ASC')
      .limit(limit)
      .getMany();

    return staff.map(({ password, ...rest }) => rest);
  }

  async getStaffById(id: number): Promise<Partial<User>> {
    const staff = await this.repo.findOne({
      where: { id, role: 'staff', isActive: true },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }
    const { password, ...result } = staff;
    return result;
  }

  async update(id: number, dto: UpdateUserDto): Promise<Partial<User>> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.company !== undefined) user.company = dto.company;
    if (dto.department !== undefined) user.department = dto.department;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.specialization !== undefined) user.specialization = dto.specialization;
    if (dto.experience !== undefined) user.experience = dto.experience;

    const updated = await this.repo.save(user);
    const { password, ...result } = updated;
    return result;
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully' };
  }
}