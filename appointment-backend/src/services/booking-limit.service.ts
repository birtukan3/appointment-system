import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, MoreThanOrEqual, Between, LessThan } from 'typeorm';
import { User } from '../users/user.entity';
import { UserLimitOverride } from '../users/user-limit-override.entity';
import { Appointment, BookingStatus } from '../appointments/appointment.entity';
import { SystemSettings } from '../settings/settings.entity';
import { AuditLog, AuditActionType, AuditStatus } from '../audit/audit.entity';

@Injectable()
export class BookingLimitService {
  private readonly logger = new Logger(BookingLimitService.name);
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserLimitOverride)
    private limitOverrideRepo: Repository<UserLimitOverride>,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    @InjectRepository(SystemSettings)
    private settingsRepo: Repository<SystemSettings>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async getGlobalSettings(): Promise<SystemSettings> {
    const cached = this.cache.get('global_settings');
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    let settings = await this.settingsRepo.findOne({ where: {} });
    if (!settings) {
      settings = this.settingsRepo.create({
        dailyLimit: 3,
        weeklyLimit: 10,
        monthlyLimit: 30,
        activeLimit: 3,
        cooldownMinutes: 5,
        autoArchiveDays: 30,
        maxBookingsPerDay: 3,
        maintenanceMode: false,
        notificationsEnabled: true,
      });
      settings = await this.settingsRepo.save(settings);
    }

    this.cache.set('global_settings', { data: settings, timestamp: Date.now() });
    return settings;
  }

  async getUserLimits(userId: number): Promise<{
    daily: number;
    weekly: number;
    monthly: number;
    active: number;
    isVIP: boolean;
    unlimited: boolean;
    isBlocked: boolean;
    spamScore: number;
  }> {
    const cacheKey = `user_limits_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const globalSettings = await this.getGlobalSettings();
    
    // Get custom limits from user object (since customLimits is a JSON field on User)
    const customLimits = (user as any).customLimits || {};
    
    const spamScore = Math.min((user as any).failedLoginAttempts || 0, 20);
    const isBlocked = (user as any).isDeactivated === true || (user as any).isBlocked === true;

    let limits;
    if (customLimits?.unlimited) {
      limits = {
        daily: Infinity,
        weekly: Infinity,
        monthly: Infinity,
        active: Infinity,
        isVIP: customLimits?.isVIP || false,
        unlimited: true,
        isBlocked,
        spamScore,
      };
    } else {
      limits = {
        daily: customLimits?.dailyLimit ?? globalSettings.dailyLimit,
        weekly: customLimits?.weeklyLimit ?? globalSettings.weeklyLimit,
        monthly: customLimits?.monthlyLimit ?? globalSettings.monthlyLimit,
        active: customLimits?.activeLimit ?? globalSettings.activeLimit,
        isVIP: customLimits?.isVIP || false,
        unlimited: false,
        isBlocked,
        spamScore,
      };
    }

    this.cache.set(cacheKey, { data: limits, timestamp: Date.now() });
    return limits;
  }

  async getUserBookingCounts(userId: number, userEmail: string): Promise<{
    daily: number;
    weekly: number;
    monthly: number;
    active: number;
    recent: number;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const globalSettings = await this.getGlobalSettings();
    const cooldownDate = new Date(now.getTime() - globalSettings.cooldownMinutes * 60 * 1000);

    const excludedStatuses = ['cancelled', 'rejected', 'expired', 'archived'];
    const activeStatuses = ['pending', 'approved', 'checked_in'];

    const [dailyCount, weeklyCount, monthlyCount, activeCount, recentCount] = await Promise.all([
      this.appointmentRepo.count({
        where: {
          userEmail,
          datetime: MoreThanOrEqual(today),
          status: Not(In(excludedStatuses)),
        },
      }),
      this.appointmentRepo.count({
        where: {
          userEmail,
          datetime: MoreThanOrEqual(weekStart),
          status: Not(In(excludedStatuses)),
        },
      }),
      this.appointmentRepo.count({
        where: {
          userEmail,
          datetime: MoreThanOrEqual(monthStart),
          status: Not(In(excludedStatuses)),
        },
      }),
      this.appointmentRepo.count({
        where: {
          userEmail,
          status: In(activeStatuses),
          datetime: MoreThanOrEqual(now),
        },
      }),
      this.appointmentRepo.count({
        where: {
          userEmail,
          createdAt: MoreThanOrEqual(cooldownDate),
        },
      }),
    ]);

    return {
      daily: dailyCount,
      weekly: weeklyCount,
      monthly: monthlyCount,
      active: activeCount,
      recent: recentCount,
    };
  }

  async validateBookingLimit(
    userId: number,
    userEmail: string,
    appointmentDateTime?: Date,
  ): Promise<{
    valid: boolean;
    errors: string[];
    limits: any;
    counts: any;
    remaining: any;
  }> {
    const [limits, counts, globalSettings] = await Promise.all([
      this.getUserLimits(userId),
      this.getUserBookingCounts(userId, userEmail),
      this.getGlobalSettings(),
    ]);

    const errors: string[] = [];

    if (limits.isBlocked) {
      errors.push('Your account has been blocked. Please contact support.');
      return { valid: false, errors, limits, counts, remaining: { daily: 0, weekly: 0, monthly: 0, active: 0 } };
    }

    if (limits.spamScore >= 15) {
      errors.push('Suspicious activity detected. Please try again later.');
      return { valid: false, errors, limits, counts, remaining: { daily: 0, weekly: 0, monthly: 0, active: 0 } };
    }

    if (limits.unlimited) {
      return {
        valid: true,
        errors: [],
        limits,
        counts,
        remaining: {
          daily: Infinity,
          weekly: Infinity,
          monthly: Infinity,
          active: Infinity,
        },
      };
    }

    if (counts.daily >= limits.daily) {
      errors.push(`You have reached your daily booking limit of ${limits.daily} appointments`);
    }
    if (counts.weekly >= limits.weekly) {
      errors.push(`You have reached your weekly booking limit of ${limits.weekly} appointments`);
    }
    if (counts.monthly >= limits.monthly) {
      errors.push(`You have reached your monthly booking limit of ${limits.monthly} appointments`);
    }
    if (counts.active >= limits.active) {
      errors.push(`You have ${counts.active} active appointments. Maximum ${limits.active} allowed`);
    }
    if (counts.recent > 0 && globalSettings.cooldownMinutes > 0) {
      errors.push(`Please wait ${globalSettings.cooldownMinutes} minutes between bookings`);
    }

    if (appointmentDateTime) {
      const startOfHour = new Date(appointmentDateTime);
      startOfHour.setMinutes(0, 0, 0);
      const endOfHour = new Date(appointmentDateTime);
      endOfHour.setMinutes(59, 59, 999);

      const duplicate = await this.appointmentRepo.findOne({
        where: {
          userEmail,
          datetime: Between(startOfHour, endOfHour),
          status: Not(In(['cancelled', 'rejected', 'expired', 'archived'])),
        },
      });

      if (duplicate) {
        errors.push('You already have a booking within this time slot');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      limits,
      counts,
      remaining: {
        daily: Math.max(0, limits.daily - counts.daily),
        weekly: Math.max(0, limits.weekly - counts.weekly),
        monthly: Math.max(0, limits.monthly - counts.monthly),
        active: Math.max(0, limits.active - counts.active),
      },
    };
  }

  async updateUserLimits(userId: number, updates: Partial<UserLimitOverride>, adminId: number) {
    let existing = await this.limitOverrideRepo.findOne({ where: { userId } });

    let result;
    if (existing) {
      result = await this.limitOverrideRepo.save({
        ...existing,
        ...updates,
        updatedAt: new Date(),
      });
    } else {
      result = await this.limitOverrideRepo.save(
        this.limitOverrideRepo.create({
          userId,
          ...updates,
        }),
      );
    }

    // ✅ Fixed: Removed duplicate cache delete
    this.cache.delete(`user_limits_${userId}`);

    const audit = this.auditRepo.create({
      userId: adminId,
      actionType: AuditActionType.ADMIN_ACTION,
      description: `Updated booking limits for user ${userId}`,
      actionDetails: { updates },
      status: AuditStatus.SUCCESS,
      entityType: 'USER',
      entityId: String(userId),
    });
    await this.auditRepo.save(audit);

    return result;
  }

  async removeUserLimitOverride(userId: number, adminId: number) {
    const existing = await this.limitOverrideRepo.findOne({ where: { userId } });
    
    if (existing) {
      await this.limitOverrideRepo.remove(existing);
      this.cache.delete(`user_limits_${userId}`);
      
      const audit = this.auditRepo.create({
        userId: adminId,
        actionType: AuditActionType.ADMIN_ACTION,
        description: `Removed booking limit override for user ${userId}`,
        status: AuditStatus.SUCCESS,
        entityType: 'USER',
        entityId: String(userId),
      });
      await this.auditRepo.save(audit);
    }
    
    return { success: true };
  }

  async blockUser(userId: number, reason: string, adminId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Update user properties
    (user as any).isDeactivated = true;
    (user as any).deactivatedAt = new Date();
    (user as any).deactivationReason = reason;
    (user as any).isBlocked = true;
    
    await this.userRepo.save(user);
    this.cache.delete(`user_limits_${userId}`);
    
    const audit = this.auditRepo.create({
      userId: adminId,
      actionType: AuditActionType.ADMIN_ACTION,
      description: `Blocked user ${userId}: ${reason}`,
      status: AuditStatus.SUCCESS,
      entityType: 'USER',
      entityId: String(userId),
      actionDetails: { reason },
    });
    await this.auditRepo.save(audit);
    
    return { success: true };
  }

  async unblockUser(userId: number, adminId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    (user as any).isDeactivated = false;
    (user as any).deactivatedAt = null;
    (user as any).deactivationReason = null;
    (user as any).isBlocked = false;
    (user as any).failedLoginAttempts = 0;
    (user as any).lockUntil = null;
    
    await this.userRepo.save(user);
    this.cache.delete(`user_limits_${userId}`);
    
    const audit = this.auditRepo.create({
      userId: adminId,
      actionType: AuditActionType.ADMIN_ACTION,
      description: `Unblocked user ${userId}`,
      status: AuditStatus.SUCCESS,
      entityType: 'USER',
      entityId: String(userId),
    });
    await this.auditRepo.save(audit);
    
    return { success: true };
  }

  async resetSpamCounter(userId: number, adminId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    (user as any).failedLoginAttempts = 0;
    (user as any).lastFailedLoginAt = null;
    (user as any).lockUntil = null;
    
    await this.userRepo.save(user);
    this.cache.delete(`user_limits_${userId}`);
    
    const audit = this.auditRepo.create({
      userId: adminId,
      actionType: AuditActionType.ADMIN_ACTION,
      description: `Reset spam counter for user ${userId}`,
      status: AuditStatus.SUCCESS,
      entityType: 'USER',
      entityId: String(userId),
    });
    await this.auditRepo.save(audit);
    
    return { success: true };
  }

  async updateGlobalSettings(settings: Partial<SystemSettings>, adminId: number) {
    let existing = await this.settingsRepo.findOne({ where: {} });

    let result;
    if (existing) {
      result = await this.settingsRepo.save({
        ...existing,
        ...settings,
        updatedBy: String(adminId),
        updatedAt: new Date(),
      });
    } else {
      result = await this.settingsRepo.save(
        this.settingsRepo.create({
          ...settings,
          updatedBy: String(adminId),
        }),
      );
    }

    this.cache.delete('global_settings');

    const audit = this.auditRepo.create({
      userId: adminId,
      actionType: AuditActionType.UPDATE_SETTINGS,
      description: 'Updated global system settings',
      actionDetails: { settings },
      status: AuditStatus.SUCCESS,
    });
    await this.auditRepo.save(audit);

    return result;
  }

  clearCache() {
    this.cache.clear();
    this.logger.log('Cache cleared');
  }
}