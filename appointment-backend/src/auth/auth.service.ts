import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name: string, company?: string, phone?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    
    const existing = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = this.userRepository.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user',
      company: company || '',
      phone: phone || '',
      isActive: true,
    });
    
    await this.userRepository.save(user);
    
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    
    user.lastLogin = new Date();
    await this.userRepository.save(user);
    
    const payload = { userId: user.id, email: user.email, role: user.role, name: user.name };
    const token = this.jwtService.sign(payload);
    
    const { password: _, ...userWithoutPassword } = user;
    
    return { token, user: userWithoutPassword };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findOne({ where: { email: normalizedEmail } });

    return {
      success: true,
      message: user
        ? 'Password recovery request received. Please contact an administrator to complete the reset.'
        : 'If an account exists for that email, password recovery guidance will be provided.',
    };
  }
}