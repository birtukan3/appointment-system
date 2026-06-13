import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User, UserRole } from '../users/user.entity';  // ✅ Added UserRole
import { UserLimitOverride } from '../users/user-limit-override.entity';
import { SystemSettings } from '../settings/settings.entity';
import { AuditLog, AuditActionType, AuditStatus } from '../audit/audit.entity';
import { Appointment, BookingStatus } from '../appointments/appointment.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminSettingsController {
  constructor(
    private usersService: UsersService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserLimitOverride)
    private limitOverrideRepo: Repository<UserLimitOverride>,
    @InjectRepository(SystemSettings)
    private settingsRepo: Repository<SystemSettings>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
  ) {}

  // ==================== GLOBAL LIMITS ====================

  @Get('limits/global')
  async getGlobalLimits(@Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
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
    
    return { success: true, data: settings };
  }

  @Put('limits/global')
  async updateGlobalLimits(@Body() limits: any, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    let settings = await this.settingsRepo.findOne({ where: {} });
    if (!settings) {
      settings = this.settingsRepo.create({});
    }
    
    Object.assign(settings, limits);
    settings.updatedBy = req.user.userId;
    const updated = await this.settingsRepo.save(settings);
    
    await this.auditRepo.save({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      actionType: AuditActionType.UPDATE_SETTINGS,
      description: `Updated global settings`,
      status: AuditStatus.SUCCESS,
      actionDetails: limits,
    });
    
    return { success: true, message: 'Global limits updated successfully', data: updated };
  }

  // ==================== USER LIMITS ====================

  @Get('limits/user/:userId')
  async getUserLimits(@Param('userId') userId: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    const user = await this.userRepo.findOne({ where: { id: parseInt(userId) } });
    if (!user) {
      return { success: true, data: null };
    }
    
    const override = await this.limitOverrideRepo.findOne({ where: { userId: parseInt(userId) } });
    
    const limits = {
      dailyLimit: override?.dailyLimit ?? 3,
      weeklyLimit: override?.weeklyLimit ?? 10,
      monthlyLimit: override?.monthlyLimit ?? 30,
      activeLimit: override?.activeLimit ?? 3,
      isVIP: override?.isVIP ?? false,
      unlimited: override?.unlimited ?? false,
      isBlocked: user.isDeactivated || user.isBlocked,
      spamScore: user.failedLoginAttempts || 0,
    };
    
    return { success: true, data: limits };
  }

  @Put('limits/user/:userId')
  async setUserLimitOverride(
    @Param('userId') userId: string,
    @Body() overrides: any,
    @Request() req,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    let override = await this.limitOverrideRepo.findOne({ where: { userId: parseInt(userId) } });
    
    if (!override) {
      override = this.limitOverrideRepo.create({ userId: parseInt(userId) });
    }
    
    Object.assign(override, overrides);
    await this.limitOverrideRepo.save(override);
    
    await this.auditRepo.save({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      actionType: AuditActionType.ADMIN_ACTION,
      description: `Updated limits for user ${userId}`,
      status: AuditStatus.SUCCESS,
      actionDetails: overrides,
      entityType: 'USER',
      entityId: userId,
    });
    
    return { success: true, message: 'User limits updated successfully' };
  }

  @Delete('limits/user/:userId')
  async removeUserLimitOverride(@Param('userId') userId: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    const override = await this.limitOverrideRepo.findOne({ where: { userId: parseInt(userId) } });
    if (override) {
      await this.limitOverrideRepo.remove(override);
    }
    
    return { success: true, message: 'User limit override removed successfully' };
  }

  // ==================== USER MANAGEMENT ====================

  @Post('users/:userId/block')
  async blockUser(@Param('userId') userId: string, @Body() body: { reason: string }, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    await this.userRepo.update(parseInt(userId), {
      isDeactivated: true,
      isBlocked: true,
      deactivatedAt: new Date(),
      deactivationReason: body.reason || 'No reason provided',
    });
    
    await this.auditRepo.save({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      actionType: AuditActionType.ADMIN_ACTION,
      description: `Blocked user ${userId}: ${body.reason || 'No reason'}`,
      status: AuditStatus.SUCCESS,
      entityType: 'USER',
      entityId: userId,
    });
    
    return { success: true, message: 'User blocked successfully' };
  }

  @Post('users/:userId/unblock')
  async unblockUser(@Param('userId') userId: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    await this.userRepo.update(parseInt(userId), {
      isDeactivated: false,
      isBlocked: false,
      deactivatedAt: null,
      deactivationReason: null,
      failedLoginAttempts: 0,
      lockUntil: null,
    });
    
    await this.auditRepo.save({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      actionType: AuditActionType.ADMIN_ACTION,
      description: `Unblocked user ${userId}`,
      status: AuditStatus.SUCCESS,
      entityType: 'USER',
      entityId: userId,
    });
    
    return { success: true, message: 'User unblocked successfully' };
  }

  @Post('users/:userId/reset-spam')
  async resetSpamCounter(@Param('userId') userId: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    await this.userRepo.update(parseInt(userId), {
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockUntil: null,
    });
    
    return { success: true, message: 'Spam counter reset successfully' };
  }

  // ==================== USERS WITH LIMITS ====================

  @Get('users/limits')
  async getAllUsersWithLimits(@Request() req, @Query() query: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? Math.min(parseInt(query.limit), 50) : 20;
    const skip = (page - 1) * limit;
    const search = query.search || '';
    
    let queryBuilder = this.userRepo.createQueryBuilder('user');
    
    if (search) {
      queryBuilder = queryBuilder.where(
        'user.name ILIKE :search OR user.email ILIKE :search',
        { search: `%${search}%` }
      );
    }
    
    const [users, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();
    
    const usersWithLimits = await Promise.all(
      users.map(async (user) => {
        const override = await this.limitOverrideRepo.findOne({ where: { userId: user.id } });
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
          phone: user.phone,
          department: user.department,
          isActive: user.isActive,
          isBlocked: user.isBlocked || user.isDeactivated,
          createdAt: user.createdAt,
          limits: {
            daily: override?.dailyLimit ?? 3,
            weekly: override?.weeklyLimit ?? 10,
            monthly: override?.monthlyLimit ?? 30,
            active: override?.activeLimit ?? 3,
            isVIP: override?.isVIP ?? false,
            unlimited: override?.unlimited ?? false,
            isBlocked: user.isDeactivated || user.isBlocked,
            spamScore: user.failedLoginAttempts || 0,
          },
        };
      })
    );
    
    return {
      success: true,
      data: usersWithLimits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1,
      },
    };
  }

  // ==================== SYSTEM STATS ====================

  @Get('stats')
  async getAdminStats(@Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    const [totalUsers, totalStaff, totalAppointments, pendingAppointments, approvedAppointments] = await Promise.all([
      this.userRepo.count(),
      // ✅ FIXED: Using UserRole.STAFF enum
      this.userRepo.count({ where: { role: UserRole.STAFF } }),
      this.appointmentRepo.count(),
      this.appointmentRepo.count({ where: { status: BookingStatus.PENDING } }),
      this.appointmentRepo.count({ where: { status: BookingStatus.APPROVED } }),
    ]);
    
    return {
      success: true,
      data: {
        totalUsers,
        totalStaff,
        totalAppointments,
        pendingAppointments,
        approvedAppointments,
      },
    };
  }

  // ==================== SYSTEM SETTINGS ====================

  @Get('settings')
  async getSettings(@Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
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
    
    return { success: true, data: settings };
  }

  @Put('settings')
  async updateSettings(@Body() settingsData: any, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    let settings = await this.settingsRepo.findOne({ where: {} });
    if (!settings) {
      settings = this.settingsRepo.create({});
    }
    
    Object.assign(settings, settingsData);
    settings.updatedBy = req.user.userId;
    const updated = await this.settingsRepo.save(settings);
    
    return { success: true, message: 'Settings updated successfully', data: updated };
  }
}