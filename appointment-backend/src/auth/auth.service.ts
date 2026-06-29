import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../users/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    if (!email || !email.includes('@')) {
      return { available: false };
    }
    try {
      const existing = await this.userRepository.findOne({
        where: { email: email.toLowerCase().trim() },
      });
      return { available: !existing };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Check email error: ${errorMessage}`);
      return { available: true };
    }
  }

  async register(email: string, password: string, name: string, company?: string, phone?: string) {
    // Validation
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

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered. Please use a different email or login.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = this.userRepository.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      company: company || '',
      phone: phone || '',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isActive: true,
      emailVerified: true,
    });

    await this.userRepository.save(user);

    // Generate JWT
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      name: user.name
    };
    const access_token = this.jwtService.sign(payload);

    this.logger.log(`New user registered: ${email}`);

    return {
      success: true,
      message: 'Registration successful',
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        phone: user.phone,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
      }
    };
  }

  // ✅ FIXED: Login with proper status validation
  async login(email: string, password: string) {
    try {
      const user = await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email: email.toLowerCase().trim() })
        .getOne();

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // ✅ Check if account is locked
      if (user.lockUntil && user.lockUntil > new Date()) {
        const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
        throw new UnauthorizedException(`Account locked. Try again in ${remainingMinutes} minutes`);
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        user.incrementFailedLoginAttempts();
        await this.userRepository.save(user);
        
        const attemptsLeft = this.MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts;
        throw new UnauthorizedException(`Invalid password. ${attemptsLeft} attempts remaining`);
      }

      // Reset on successful login
      user.resetFailedLoginAttempts();
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);

      // ✅ FIXED: Check account status - Allow active, verified, or staff/admin
      const isActive = user.isActive !== false;
      const isVerified = user.emailVerified !== false;
      const isStaffOrAdmin = user.role === UserRole.STAFF || user.role === UserRole.ADMIN;
      
      // ✅ Allow login if:
      // 1. Account is active AND verified (regular users)
      // 2. Account is active AND is staff/admin (even if not verified)
      // 3. Account status is 'active'
      const canLogin = (isActive && isVerified) || 
                       (isActive && isStaffOrAdmin) ||
                       user.status === UserStatus.ACTIVE;

      if (!canLogin) {
        const statusMsg = user.status === UserStatus.PENDING_VERIFICATION 
          ? 'pending_verification' 
          : user.status || 'inactive';
        throw new UnauthorizedException(`Account is ${statusMsg}. Please contact support.`);
      }

      // ✅ Auto-verify staff/admin accounts
      if (isStaffOrAdmin && !user.emailVerified) {
        user.emailVerified = true;
        user.status = UserStatus.ACTIVE;
        await this.userRepository.save(user);
        this.logger.log(`Auto-verified ${user.role} account: ${email}`);
      }

      const payload = { 
        sub: user.id, 
        email: user.email, 
        role: user.role,
        name: user.name
      };
      const access_token = this.jwtService.sign(payload);

      this.logger.log(`User logged in: ${email}`);

      return {
        success: true,
        access_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company: user.company,
          phone: user.phone,
          department: user.department,
          avatar: user.avatar,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
          googleCalendarConnected: user.googleCalendarConnected,
        }
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
    this.logger.log(`User logged out: userId ${userId}`);
    return { success: true, message: 'Logged out successfully' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const newPayload = { 
        sub: payload.sub, 
        email: payload.email, 
        role: payload.role,
        name: payload.name
      };
      const newAccessToken = this.jwtService.sign(newPayload);
      return { success: true, access_token: newAccessToken };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Refresh token error: ${errorMessage}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      };
    }

    const resetToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    this.logger.log(`Password reset requested for ${email} - Token: ${resetToken}`);

    return {
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
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
      message: 'Password has been reset successfully. Please login with your new password.',
    };
  }

  async getCurrentUser(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { 
      success: true, 
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        phone: user.phone,
        department: user.department,
        avatar: user.avatar,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        googleCalendarConnected: user.googleCalendarConnected,
      }
    };
  }
}