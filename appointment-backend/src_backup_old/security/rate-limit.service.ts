// src/security/rate-limit.service.ts
import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, In, LessThan } from 'typeorm';
import { Appointment, BookingStatus } from '../appointments/appointment.entity';
import { User } from '../users/user.entity';

export interface UserBookingLimits {
  maxActiveBookings: number;
  maxDailyBookings: number;
  maxWeeklyBookings: number;
  bookingCooldownMinutes: number;
  isBlocked: boolean;
  blockReason?: string;
  spamScore: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private userLimits: Map<number, UserBookingLimits> = new Map();
  private spamScores: Map<number, { score: number; lastUpdate: Date }> = new Map();
  
  // Login rate limiting maps
  private loginAttempts: Map<string, { count: number; lastAttempt: Date; lockedUntil: Date }> = new Map();
  private registrationAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_REGISTRATIONS_PER_HOUR = 3;

  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // ============ LOGIN RATE LIMITING METHODS ============

  /**
   * Check if a login attempt is allowed
   */
  async checkLoginRateLimit(email: string, ip: string): Promise<{ allowed: boolean; remainingAttempts: number; lockRemaining?: number }> {
    const key = `${email.toLowerCase()}:${ip}`;
    const record = this.loginAttempts.get(key);
    
    if (record && record.lockedUntil && record.lockedUntil > new Date()) {
      const lockRemaining = Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000);
      return { allowed: false, remainingAttempts: 0, lockRemaining };
    }
    
    const remainingAttempts = record ? Math.max(0, this.MAX_LOGIN_ATTEMPTS - record.count) : this.MAX_LOGIN_ATTEMPTS;
    return { allowed: true, remainingAttempts };
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedLogin(email: string, ip: string): Promise<void> {
    const key = `${email.toLowerCase()}:${ip}`;
    let record = this.loginAttempts.get(key);
    
    if (!record) {
      record = { count: 0, lastAttempt: new Date(), lockedUntil: null };
    }
    
    record.count++;
    record.lastAttempt = new Date();
    
    if (record.count >= this.MAX_LOGIN_ATTEMPTS) {
      record.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);
      this.logger.warn(`Account locked for ${email} from IP ${ip} after ${record.count} failed attempts`);
    }
    
    this.loginAttempts.set(key, record);
  }

  /**
   * Reset login rate limit after successful login
   */
  async resetLoginRateLimit(email: string, ip: string): Promise<void> {
    const key = `${email.toLowerCase()}:${ip}`;
    this.loginAttempts.delete(key);
    this.logger.debug(`Rate limit reset for ${email} from IP ${ip}`);
  }

  /**
   * Record a registration attempt
   */
  async recordRegistrationAttempt(ip: string): Promise<{ allowed: boolean; remainingAttempts: number }> {
    const key = `register:${ip}`;
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    let record = this.registrationAttempts.get(key);
    if (!record) {
      record = { count: 0, lastAttempt: now };
    }
    
    // Reset if older than 1 hour
    if (record.lastAttempt < hourAgo) {
      record.count = 0;
    }
    
    const remainingAttempts = Math.max(0, this.MAX_REGISTRATIONS_PER_HOUR - record.count);
    
    if (record.count >= this.MAX_REGISTRATIONS_PER_HOUR) {
      this.logger.warn(`Registration rate limit exceeded for IP ${ip}`);
      return { allowed: false, remainingAttempts: 0 };
    }
    
    record.count++;
    record.lastAttempt = now;
    this.registrationAttempts.set(key, record);
    
    return { allowed: true, remainingAttempts };
  }

  /**
   * Get remaining lockout time for a user
   */
  getRemainingLockoutTime(email: string, ip: string): number {
    const key = `${email.toLowerCase()}:${ip}`;
    const record = this.loginAttempts.get(key);
    
    if (record && record.lockedUntil && record.lockedUntil > new Date()) {
      return Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000);
    }
    
    return 0;
  }

  /**
   * Clear all rate limits (for testing/admin)
   */
  clearAllRateLimits(): void {
    this.loginAttempts.clear();
    this.registrationAttempts.clear();
    this.logger.log('All rate limits cleared');
  }

  /**
   * Get rate limit statistics
   */
  getRateLimitStats(): { totalLoginRecords: number; totalRegistrationRecords: number; lockedAccounts: number } {
    const now = new Date();
    let lockedAccounts = 0;
    
    for (const record of this.loginAttempts.values()) {
      if (record.lockedUntil && record.lockedUntil > now) {
        lockedAccounts++;
      }
    }
    
    return {
      totalLoginRecords: this.loginAttempts.size,
      totalRegistrationRecords: this.registrationAttempts.size,
      lockedAccounts,
    };
  }

  // ============ USER BOOKING LIMITS METHODS ============

  /**
   * Get user booking limits
   */
  async getUserLimits(userId: number): Promise<UserBookingLimits> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const role = user?.role || 'user';
    
    const defaultLimits: Record<string, UserBookingLimits> = {
      admin: {
        maxActiveBookings: 100,
        maxDailyBookings: 50,
        maxWeeklyBookings: 200,
        bookingCooldownMinutes: 0,
        isBlocked: false,
        spamScore: 0,
      },
      staff: {
        maxActiveBookings: 20,
        maxDailyBookings: 10,
        maxWeeklyBookings: 30,
        bookingCooldownMinutes: 2,
        isBlocked: false,
        spamScore: 0,
      },
      user: {
        maxActiveBookings: 3,
        maxDailyBookings: 2,
        maxWeeklyBookings: 5,
        bookingCooldownMinutes: 5,
        isBlocked: false,
        spamScore: 0,
      },
    };
    
    const limits = defaultLimits[role] || defaultLimits.user;
    const customLimit = this.userLimits.get(userId);
    const spamRecord = this.spamScores.get(userId);
    
    return { 
      ...limits, 
      ...customLimit,
      spamScore: spamRecord?.score || 0,
    };
  }

  /**
   * Update spam score for a user
   */
  async updateSpamScore(userId: number, action: 'booking' | 'failed_check' | 'rapid_request'): Promise<number> {
    let record = this.spamScores.get(userId);
    if (!record) {
      record = { score: 0, lastUpdate: new Date() };
    }
    
    // Decay score over time (reduce by 1 per hour)
    const hoursSinceUpdate = (Date.now() - record.lastUpdate.getTime()) / (1000 * 60 * 60);
    record.score = Math.max(0, record.score - Math.floor(hoursSinceUpdate));
    
    // Add points based on action
    switch (action) {
      case 'rapid_request':
        record.score += 5;
        break;
      case 'failed_check':
        record.score += 3;
        break;
      case 'booking':
        record.score = Math.max(0, record.score - 1); // Good behavior reduces spam score
        break;
    }
    
    record.lastUpdate = new Date();
    this.spamScores.set(userId, record);
    
    // Block user if spam score exceeds threshold
    if (record.score >= 20) {
      const limits = await this.getUserLimits(userId);
      if (!limits.isBlocked) {
        await this.blockUser(userId, 'Excessive spam activity detected');
        this.logger.warn(`User ${userId} blocked due to spam score ${record.score}`);
      }
    }
    
    return record.score;
  }

  /**
   * Check if user can make a booking (BACKEND ENFORCEMENT)
   */
  async canMakeBooking(userId: number, datetime: Date): Promise<{
    allowed: boolean;
    reason?: string;
    limits?: UserBookingLimits;
  }> {
    const limits = await this.getUserLimits(userId);
    const now = new Date();

    // Check if user is blocked
    if (limits.isBlocked) {
      return {
        allowed: false,
        reason: limits.blockReason || 'Your account has been blocked. Please contact support.',
        limits,
      };
    }

    // Check spam score
    if (limits.spamScore >= 15) {
      return {
        allowed: false,
        reason: `Suspicious activity detected. Please wait ${Math.ceil((limits.spamScore - 15) * 5)} minutes before booking again.`,
        limits,
      };
    }

    // Check active bookings (pending + approved + checked_in)
    const activeBookings = await this.appointmentRepo.count({
      where: {
        userId,
        status: In([BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.CHECKED_IN]),
        datetime: MoreThan(now),
      },
    });

    if (activeBookings >= limits.maxActiveBookings) {
      return {
        allowed: false,
        reason: `You have ${activeBookings} active bookings. Maximum allowed is ${limits.maxActiveBookings}. Please complete or cancel existing bookings.`,
        limits,
      };
    }

    // Check daily bookings
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    const todayBookings = await this.appointmentRepo.count({
      where: {
        userId,
        createdAt: Between(dayStart, dayEnd),
      },
    });

    if (todayBookings >= limits.maxDailyBookings) {
      return {
        allowed: false,
        reason: `You have made ${todayBookings} bookings today. Maximum allowed is ${limits.maxDailyBookings}.`,
        limits,
      };
    }

    // Check weekly bookings
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyBookings = await this.appointmentRepo.count({
      where: {
        userId,
        createdAt: MoreThan(weekStart),
      },
    });

    if (weeklyBookings >= limits.maxWeeklyBookings) {
      return {
        allowed: false,
        reason: `You have made ${weeklyBookings} bookings this week. Maximum allowed is ${limits.maxWeeklyBookings}.`,
        limits,
      };
    }

    // Check cooldown (prevent spam)
    const cooldownDate = new Date(now.getTime() - limits.bookingCooldownMinutes * 60 * 1000);
    const recentBookings = await this.appointmentRepo.count({
      where: {
        userId,
        createdAt: MoreThan(cooldownDate),
      },
    });

    if (recentBookings > 0) {
      await this.updateSpamScore(userId, 'rapid_request');
      return {
        allowed: false,
        reason: `Please wait ${limits.bookingCooldownMinutes} minutes between bookings.`,
        limits,
      };
    }

    return { allowed: true, limits };
  }

  /**
   * Admin: Block a user
   */
  async blockUser(userId: number, reason: string): Promise<void> {
    const limits = await this.getUserLimits(userId);
    limits.isBlocked = true;
    limits.blockReason = reason;
    this.userLimits.set(userId, limits);
    
    await this.userRepo.update(userId, { 
      isActive: false,
      isBlocked: true,
      deactivatedAt: new Date(),
      deactivationReason: reason,
    });
    this.logger.log(`User ${userId} blocked: ${reason}`);
  }

  /**
   * Admin: Unblock a user
   */
  async unblockUser(userId: number): Promise<void> {
    const limits = await this.getUserLimits(userId);
    limits.isBlocked = false;
    limits.blockReason = undefined;
    this.userLimits.set(userId, limits);
    
    await this.userRepo.update(userId, { 
      isActive: true,
      isBlocked: false,
      deactivatedAt: null,
      deactivationReason: null,
      failedLoginAttempts: 0,
      lockUntil: null,
    });
    this.spamScores.delete(userId);
    this.logger.log(`User ${userId} unblocked`);
  }

  /**
   * Admin: Set custom limits for a user
   */
  async setUserLimits(userId: number, limits: Partial<UserBookingLimits>): Promise<void> {
    const currentLimits = await this.getUserLimits(userId);
    const updatedLimits = { ...currentLimits, ...limits };
    this.userLimits.set(userId, updatedLimits);
    this.logger.log(`User ${userId} limits updated: ${JSON.stringify(limits)}`);
  }

  /**
   * Admin: Reset spam counter for a user
   */
  async resetSpamCounter(userId: number): Promise<void> {
    this.spamScores.delete(userId);
    await this.userRepo.update(userId, { 
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockUntil: null,
    });
    this.logger.log(`Spam counter reset for user ${userId}`);
  }

  /**
   * Get user booking stats (for frontend display)
   */
  async getUserBookingStats(userId: number): Promise<{
    activeBookings: number;
    remainingActive: number;
    todayBookings: number;
    remainingToday: number;
    weeklyBookings: number;
    remainingWeekly: number;
    cooldownRemaining: number;
    limits: UserBookingLimits;
  }> {
    const limits = await this.getUserLimits(userId);
    const now = new Date();

    const activeBookings = await this.appointmentRepo.count({
      where: {
        userId,
        status: In([BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.CHECKED_IN]),
        datetime: MoreThan(now),
      },
    });

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    const todayBookings = await this.appointmentRepo.count({
      where: {
        userId,
        createdAt: Between(dayStart, dayEnd),
      },
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyBookings = await this.appointmentRepo.count({
      where: {
        userId,
        createdAt: MoreThan(weekStart),
      },
    });

    const lastBooking = await this.appointmentRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    let cooldownRemaining = 0;
    if (lastBooking && limits.bookingCooldownMinutes > 0) {
      const nextAllowedTime = new Date(lastBooking.createdAt.getTime() + limits.bookingCooldownMinutes * 60 * 1000);
      cooldownRemaining = Math.max(0, Math.ceil((nextAllowedTime.getTime() - Date.now()) / 1000));
    }

    return {
      activeBookings,
      remainingActive: Math.max(0, limits.maxActiveBookings - activeBookings),
      todayBookings,
      remainingToday: Math.max(0, limits.maxDailyBookings - todayBookings),
      weeklyBookings,
      remainingWeekly: Math.max(0, limits.maxWeeklyBookings - weeklyBookings),
      cooldownRemaining,
      limits,
    };
  }
}