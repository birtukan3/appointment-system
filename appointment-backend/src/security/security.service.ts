import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private loginAttempts = new Map<string, { count: number; lastAttempt: Date; lockedUntil: Date }>();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // ============ RATE LIMITING ============
  
  async checkRateLimit(email: string, ip: string): Promise<{ allowed: boolean; message?: string }> {
    const key = `${email}-${ip}`;
    const record = this.loginAttempts.get(key);
    
    if (record && record.lockedUntil && record.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((record.lockedUntil.getTime() - Date.now()) / 60000);
      const remainingSeconds = Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000);
      
      this.logger.warn(`Rate limit exceeded for ${email} from ${ip}. Locked for ${remainingMinutes} minutes`);
      
      return { 
        allowed: false, 
        message: `Too many failed attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.` 
      };
    }
    
    return { allowed: true };
  }

  async recordFailedAttempt(email: string, ip: string): Promise<void> {
    const key = `${email}-${ip}`;
    let record = this.loginAttempts.get(key);
    
    if (!record) {
      record = { count: 0, lastAttempt: new Date(), lockedUntil: null };
    }
    
    record.count++;
    record.lastAttempt = new Date();
    
    if (record.count >= this.MAX_LOGIN_ATTEMPTS) {
      record.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
      this.logger.warn(`Account locked for ${email} from ${ip} after ${record.count} failed attempts`);
    }
    
    this.loginAttempts.set(key, record);
  }

  async resetRateLimit(email: string, ip: string): Promise<void> {
    const key = `${email}-${ip}`;
    this.loginAttempts.delete(key);
    this.logger.debug(`Rate limit reset for ${email} from ${ip}`);
  }

  getRemainingLockoutTime(email: string, ip: string): number {
    const key = `${email}-${ip}`;
    const record = this.loginAttempts.get(key);
    
    if (record && record.lockedUntil && record.lockedUntil > new Date()) {
      return Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000);
    }
    
    return 0;
  }

  // ============ ACCOUNT LOCKOUT ============
  
  async checkAccountLockout(userId: number): Promise<{ locked: boolean; remainingMinutes?: number; remainingSeconds?: number }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    
    if (!user) {
      return { locked: false };
    }
    
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMs = user.lockUntil.getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      
      return { 
        locked: true, 
        remainingMinutes,
        remainingSeconds 
      };
    }
    
    return { locked: false };
  }

  async incrementFailedAttempts(userId: number): Promise<{ attemptsLeft: number; isLocked: boolean }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    
    if (!user) {
      return { attemptsLeft: this.MAX_LOGIN_ATTEMPTS, isLocked: false };
    }
    
    const currentAttempts = (user.failedLoginAttempts || 0) + 1;
    user.failedLoginAttempts = currentAttempts;
    
    let isLocked = false;
    
    if (currentAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
      isLocked = true;
      this.logger.warn(`User ${userId} account locked after ${currentAttempts} failed attempts`);
    }
    
    user.lastFailedLoginAt = new Date();
    await this.userRepo.save(user);
    
    return {
      attemptsLeft: Math.max(0, this.MAX_LOGIN_ATTEMPTS - currentAttempts),
      isLocked,
    };
  }

  async resetFailedAttempts(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    
    if (user) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      user.lastFailedLoginAt = null;
      user.lastLoginAt = new Date();
      
      await this.userRepo.save(user);
      this.logger.debug(`Failed attempts reset for user ${userId}`);
    }
  }

  async isTwoFactorRequired(userId: number): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    
    if (!user) {
      return false;
    }
    
    return user.twoFactorEnabled === true;
  }

  // ============ TWO-FACTOR AUTHENTICATION ============
  
  async generateTwoFactorSecret(email: string): Promise<{ secret: string; qrCode: string; otpauthUrl: string }> {
    const secret = speakeasy.generateSecret({
      name: `SmartOffice:${email}`,
      length: 20,
      issuer: 'SmartOffice',
    });
    
    let qrCode = '';
    try {
      qrCode = await QRCode.toDataURL(secret.otpauth_url);
    } catch (error) {
      // ✅ FIXED: Safe error message extraction
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`QR code generation failed: ${errorMessage}`);
      qrCode = '';
    }
    
    this.logger.debug(`2FA secret generated for ${email}`);
    
    return {
      secret: secret.base32,
      qrCode: qrCode,
      otpauthUrl: secret.otpauth_url,
    };
  }

  async verifyTwoFactorToken(secret: string, token: string): Promise<boolean> {
    if (!secret || !token) {
      return false;
    }
    
    const isValid = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2,
    });
    
    return isValid;
  }

  async enableTwoFactor(userId: number, secret: string, token: string): Promise<boolean> {
    const isValid = await this.verifyTwoFactorToken(secret, token);
    
    if (isValid) {
      await this.userRepo.update(userId, {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      });
      
      this.logger.log(`2FA enabled for user ${userId}`);
      return true;
    }
    
    this.logger.warn(`Failed to enable 2FA for user ${userId}: invalid token`);
    return false;
  }

  async disableTwoFactor(userId: number, token: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    
    if (!user) {
      return false;
    }
    
    if (!user.twoFactorSecret) {
      return false;
    }
    
    const isValid = await this.verifyTwoFactorToken(user.twoFactorSecret, token);
    
    if (isValid) {
      await this.userRepo.update(userId, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });
      
      this.logger.log(`2FA disabled for user ${userId}`);
      return true;
    }
    
    this.logger.warn(`Failed to disable 2FA for user ${userId}: invalid token`);
    return false;
  }

  async getTwoFactorStatus(userId: number): Promise<{ enabled: boolean; hasSecret: boolean }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    
    if (!user) {
      return { enabled: false, hasSecret: false };
    }
    
    return {
      enabled: user.twoFactorEnabled === true,
      hasSecret: !!user.twoFactorSecret,
    };
  }

  // ============ CAPTCHA VALIDATION ============
  
  validateCaptcha(captchaResponse: string): boolean {
    if (!captchaResponse) {
      return false;
    }
    
    try {
      const parts = captchaResponse.split(',');
      if (parts.length !== 4) {
        return false;
      }
      
      const [num1Str, operator, num2Str, resultStr] = parts;
      const num1 = parseInt(num1Str, 10);
      const num2 = parseInt(num2Str, 10);
      const result = parseInt(resultStr, 10);
      
      if (isNaN(num1) || isNaN(num2) || isNaN(result)) {
        return false;
      }
      
      let expected = 0;
      switch (operator) {
        case '+':
          expected = num1 + num2;
          break;
        case '-':
          expected = num1 - num2;
          break;
        case '*':
          expected = num1 * num2;
          break;
        default:
          return false;
      }
      
      return expected === result;
    } catch (error) {
      // ✅ FIXED: Safe error message extraction
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Captcha validation error: ${errorMessage}`);
      return false;
    }
  }

  generateCaptcha(): { num1: number; num2: number; operator: string; answer: number; text: string } {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let answer = 0;
    switch (operator) {
      case '+':
        answer = num1 + num2;
        break;
      case '-':
        answer = num1 - num2;
        break;
      case '*':
        answer = num1 * num2;
        break;
    }
    
    const text = `${num1} ${operator} ${num2} = ?`;
    
    return { num1, num2, operator, answer, text };
  }

  verifyCaptcha(userAnswer: number, expectedAnswer: number): boolean {
    return userAnswer === expectedAnswer;
  }

  // ============ PASSWORD VALIDATION ============
  
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong' | 'very-strong';
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;
    
    if (!password || password.length === 0) {
      return { isValid: false, errors: ['Password is required'], strength: 'weak', score: 0 };
    }
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else if (password.length >= 12) {
      score += 2;
    } else if (password.length >= 8) {
      score += 1;
    }
    
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      errors.push('Password must contain at least one number');
    }
    
    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      errors.push('Password must contain at least one special character');
    }
    
    const commonPatterns = ['password', '123456', 'qwerty', 'admin', 'letmein', 'welcome'];
    const lowerPassword = password.toLowerCase();
    if (commonPatterns.some(pattern => lowerPassword.includes(pattern))) {
      errors.push('Password contains common patterns that are easy to guess');
      score = Math.max(0, score - 2);
    }
    
    let strength: 'weak' | 'medium' | 'strong' | 'very-strong' = 'weak';
    if (score >= 6) strength = 'very-strong';
    else if (score >= 4) strength = 'strong';
    else if (score >= 2) strength = 'medium';
    else strength = 'weak';
    
    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score: Math.min(score, 7),
    };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ============ SESSION MANAGEMENT ============
  
  generateSessionToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  isValidIp(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  clearAllRateLimits(): void {
    this.loginAttempts.clear();
    this.logger.log('All rate limits cleared');
  }

  getRateLimitStats(): { totalRecords: number; lockedAccounts: number } {
    const now = new Date();
    let lockedAccounts = 0;
    
    for (const record of this.loginAttempts.values()) {
      if (record.lockedUntil && record.lockedUntil > now) {
        lockedAccounts++;
      }
    }
    
    return {
      totalRecords: this.loginAttempts.size,
      lockedAccounts,
    };
  }
}