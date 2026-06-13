import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, In } from 'typeorm';
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

  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

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
    
    return { ...limits, ...customLimit };
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
        record.score -= 1; // Good behavior reduces spam score
        break;
    }
    
    record.lastUpdate = new Date();
    this.spamScores.set(userId, record);
    
    // Block user if spam score exceeds threshold
    if (record.score >= 20 && !(await this.getUserLimits(userId)).isBlocked) {
      await this.blockUser(userId, 'Excessive spam activity detected');
      this.logger.warn(`User ${userId} blocked due to spam score ${record.score}`);
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
    const spamRecord = this.spamScores.get(userId);
    if (spamRecord && spamRecord.score >= 15) {
      return {
        allowed: false,
        reason: `Suspicious activity detected. Please wait ${Math.ceil((spamRecord.score - 15) * 5)} minutes before booking again.`,
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
    
    await this.userRepo.update(userId, { isActive: false });
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
    
    await this.userRepo.update(userId, { isActive: true });
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
      cooldownRemaining,
      limits,
    };
  }
}