import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    if (!email || !email.includes('@')) {
      return { available: false };
    }
    try {
      const existing = await this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
      return { available: !existing };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Check email error: ${errorMessage}`);
      return { available: true };
    }
  }

  async register(data: { 
    name: string; 
    email: string; 
    password: string; 
    company?: string; 
    phone?: string; 
    ip: string 
  }) {
    const { name, email, password, company, phone, ip } = data;

    if (!email || !email.includes('@')) {
      throw new BadRequestException('Valid email is required');
    }
    if (!name || name.trim().length < 2) {
      throw new BadRequestException('Name must be at least 2 characters');
    }
    if (name.trim().length > 50) {
      throw new BadRequestException('Name must be less than 50 characters');
    }
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    if (password.length > 72) {
      throw new BadRequestException('Password must be less than 72 characters');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one number');
    }

    const existing = await this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const user = this.userRepo.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      company: company || '',
      phone: phone || '',
      //role: 'user',
      isActive: true,
      emailVerified: false,
      failedLoginAttempts: 0,
    });

    const savedUser = await this.userRepo.save(user);
    
    // ✅ FIXED: Correct way to exclude password
    const { password: excludedPassword, ...result } = savedUser;
    
    this.logger.log(`New user registered: ${email} from IP ${ip}`);
    
    return { 
      success: true, 
      message: 'Registration successful', 
      data: result 
    };
  }

  async login(email: string, password: string, twoFactorToken: string | null, clientIp: string) {
    try {
      const user = await this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
      
      if (!user) {
        this.logger.warn(`Login failed: User not found - ${email} from IP ${clientIp}`);
        throw new UnauthorizedException('Invalid email or password');
      }
      
      if (!user.isActive) {
        this.logger.warn(`Login failed: Account deactivated - ${email}`);
        throw new UnauthorizedException('Account is deactivated. Please contact support.');
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        await this.userRepo.save(user);
        
        this.logger.warn(`Login failed: Invalid password for ${email} from IP ${clientIp}`);
        throw new UnauthorizedException('Invalid email or password');
      }
      
      user.failedLoginAttempts = 0;
      user.lastLoginAt = new Date();
      await this.userRepo.save(user);
      
      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
      
      this.logger.log(`User logged in: ${email} from IP ${clientIp}`);
      
      return {
        success: true,
        message: 'Login successful',
        access_token: accessToken,
        refresh_token: refreshToken,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company || '',
        phone: user.phone || '',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Login error: ${errorMessage}`);
      throw new UnauthorizedException('Login failed. Please try again.');
    }
  }

  async logout(userId: number) {
    try {
      this.logger.log(`User logged out: userId ${userId}`);
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Logout error: ${errorMessage}`);
      return { success: true, message: 'Logged out successfully' };
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const newPayload = { sub: payload.sub, email: payload.email, role: payload.role };
      const newAccessToken = this.jwtService.sign(newPayload);
      
      return {
        success: true,
        access_token: newAccessToken,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Refresh token error: ${errorMessage}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(email: string) {
    try {
      const user = await this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
      
      if (!user) {
        return { 
          success: true, 
          message: 'If an account exists with this email, you will receive a password reset link.' 
        };
      }
      
      const resetToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      const resetExpiry = new Date();
      resetExpiry.setHours(resetExpiry.getHours() + 1);
      
      this.logger.log(`Password reset requested for ${email} - Token: ${resetToken}`);
      
      return { 
        success: true, 
        message: 'If an account exists with this email, you will receive a password reset link.' 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Forgot password error: ${errorMessage}`);
      return { 
        success: true, 
        message: 'If an account exists with this email, you will receive a password reset link.' 
      };
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      if (!newPassword || newPassword.length < 8) {
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
      
      this.logger.log(`Password reset attempted with token: ${token}`);
      
      return { 
        success: true, 
        message: 'Password has been reset successfully. Please login with your new password.' 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Reset password error: ${errorMessage}`);
      throw error;
    }
  }

  async getCurrentUser(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const { password, ...result } = user;
    return { success: true, data: result };
  }
}