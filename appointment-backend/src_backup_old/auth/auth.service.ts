import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from '../users/user.entity';
import { RegisterDto, LoginDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    if (!email?.includes('@')) return { available: false };
    try {
      const existing = await this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
      return { available: !existing };
    } catch {
      return { available: true };
    }
  }

  async register(registerDto: RegisterDto, ip: string) {
    const { name, email, password, company, phone } = registerDto;

    // Check existing user
    const existing = await this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = this.userRepo.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      company: company || '',
      phone: phone || '',
      isActive: true,
      emailVerified: false,
      failedLoginAttempts: 0,
    });

    const savedUser = await this.userRepo.save(user);
    
    this.logger.log(`New user registered: ${email} from IP ${ip}`);
    
    const { password: _, ...result } = savedUser;
    return { success: true, message: 'Registration successful', data: result };
  }

  async login(loginDto: LoginDto, ip: string) {
    const { email, password } = loginDto;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.userRepo.findOne({ 
      where: { email: normalizedEmail },
      select: ['id', 'email', 'password', 'name', 'role', 'isActive', 'isBlocked', 'isDeactivated'] as any,
    });
    
    if (!user) {
      this.logger.warn(`Login failed: User not found - ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid email or password');
    }
    
    if (!user.isActive || user.isDeactivated || user.isBlocked) {
      throw new UnauthorizedException('Account is deactivated. Please contact support.');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password for ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid email or password');
    }
    
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;
    await this.userRepo.save(user);
    
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    
    this.logger.log(`User logged in: ${normalizedEmail} from IP ${ip}`);
    
    return {
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company || '',
      phone: user.phone || '',
    };
  }

  async logout(userId: number) {
    this.logger.log(`User logged out: userId ${userId}`);
    return { success: true, message: 'Logged out successfully' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const newAccessToken = this.jwtService.sign({ sub: payload.sub, email: payload.email, role: payload.role });
      return { success: true, access_token: newAccessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(email: string, ip: string) {
    const user = await this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      return { success: true, message: 'If an account exists, you will receive a reset link.' };
    }
    this.logger.log(`Password reset requested for ${email} from IP ${ip}`);
    return { success: true, message: 'If an account exists, you will receive a reset link.' };
  }

  async resetPassword(token: string, newPassword: string, ip: string) {
    this.logger.log(`Password reset attempted with token: ${token}`);
    return { success: true, message: 'Password has been reset successfully.' };
  }

  async getCurrentUser(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const { password, ...result } = user;
    return { success: true, data: result };
  }
}


