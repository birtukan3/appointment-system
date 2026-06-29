import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SystemSettings } from './settings.entity';
import { AuditService } from '../audit/audit.service';
import { AuditActionType, AuditStatus } from '../audit/audit.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(
    @InjectRepository(SystemSettings)
    private settingsRepo: Repository<SystemSettings>,
    private auditService: AuditService,
  ) {}

  @Get()
  async getSettings(@Request() req) {
    try {
      this.logger.log(`📥 Fetching system settings - User: ${req.user.email}`);

      if (req.user.role !== 'admin' && req.user.role !== 'staff') {
        throw new ForbiddenException('Admin or Staff access required');
      }
      
      let settings = await this.settingsRepo.findOne({ where: {} });
      
      if (!settings) {
        this.logger.log('📝 No settings found, creating default settings');
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
          allowGuestBookings: true,
          requireEmailVerification: true,
          enableGoogleCalendarSync: true,
          enableTwoFactorAuth: false,
          businessStartHour: 9,
          businessEndHour: 18,
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          notificationSettings: {
            bookingConfirmation: true,
            appointmentReminder: true,
            statusUpdate: true,
            adminAlert: true,
            emailNotifications: true,
            smsNotifications: false,
          },
        });
        settings = await this.settingsRepo.save(settings);
        this.logger.log('✅ Default settings created');
      }
      
      return { 
        success: true, 
        data: settings 
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get settings: ${error.message}`);
      throw new BadRequestException('Failed to fetch settings');
    }
  }

  @Post()
  async updateSettings(@Body() body: any, @Request() req) {
    try {
      this.logger.log(`📝 Updating system settings - User: ${req.user.email}`);

      if (req.user.role !== 'admin') {
        throw new ForbiddenException('Only admins can update settings');
      }
      
      let settings = await this.settingsRepo.findOne({ where: {} });
      
      if (!settings) {
        settings = this.settingsRepo.create({});
      }
      
      // ============ LIMITS ============
      if (body.dailyLimit !== undefined && body.dailyLimit >= 1 && body.dailyLimit <= 20) {
        settings.dailyLimit = body.dailyLimit;
      }
      if (body.weeklyLimit !== undefined && body.weeklyLimit >= 1 && body.weeklyLimit <= 100) {
        settings.weeklyLimit = body.weeklyLimit;
      }
      if (body.monthlyLimit !== undefined && body.monthlyLimit >= 1 && body.monthlyLimit <= 500) {
        settings.monthlyLimit = body.monthlyLimit;
      }
      if (body.activeLimit !== undefined && body.activeLimit >= 1 && body.activeLimit <= 10) {
        settings.activeLimit = body.activeLimit;
      }
      if (body.cooldownMinutes !== undefined && body.cooldownMinutes >= 1 && body.cooldownMinutes <= 60) {
        settings.cooldownMinutes = body.cooldownMinutes;
      }
      if (body.autoArchiveDays !== undefined && body.autoArchiveDays >= 7 && body.autoArchiveDays <= 365) {
        settings.autoArchiveDays = body.autoArchiveDays;
      }
      if (body.maxBookingsPerDay !== undefined && body.maxBookingsPerDay >= 1 && body.maxBookingsPerDay <= 20) {
        settings.maxBookingsPerDay = body.maxBookingsPerDay;
      }

      // ============ FEATURES ============
      if (body.maintenanceMode !== undefined) {
        settings.maintenanceMode = body.maintenanceMode;
      }
      if (body.notificationsEnabled !== undefined) {
        settings.notificationsEnabled = body.notificationsEnabled;
      }
      if (body.allowGuestBookings !== undefined) {
        settings.allowGuestBookings = body.allowGuestBookings;
      }
      if (body.requireEmailVerification !== undefined) {
        settings.requireEmailVerification = body.requireEmailVerification;
      }
      if (body.enableGoogleCalendarSync !== undefined) {
        settings.enableGoogleCalendarSync = body.enableGoogleCalendarSync;
      }
      if (body.enableTwoFactorAuth !== undefined) {
        settings.enableTwoFactorAuth = body.enableTwoFactorAuth;
      }

      // ============ BUSINESS HOURS ============
      if (body.businessStartHour !== undefined && body.businessStartHour >= 0 && body.businessStartHour <= 23) {
        settings.businessStartHour = body.businessStartHour;
      }
      if (body.businessEndHour !== undefined && body.businessEndHour >= 0 && body.businessEndHour <= 23) {
        if (body.businessEndHour > settings.businessStartHour) {
          settings.businessEndHour = body.businessEndHour;
        }
      }
      if (body.workingDays !== undefined && Array.isArray(body.workingDays)) {
        settings.workingDays = body.workingDays;
      }

      // ============ NOTIFICATION SETTINGS ============
      if (body.notificationSettings) {
        settings.notificationSettings = {
          ...settings.notificationSettings,
          ...body.notificationSettings,
        };
      }

      // ============ METADATA ============
      if (body.metadata) {
        settings.metadata = { ...settings.metadata, ...body.metadata };
      }
      
      settings.updatedBy = req.user.userId;
      const updated = await this.settingsRepo.save(settings);
      
      this.logger.log(`✅ Settings updated by ${req.user.email}`);

      // ✅ FIXED: Use 'metadata' instead of 'actionDetails'
      await this.auditService.log({
        userId: req.user.userId,
        userEmail: req.user.email,
        userName: req.user.name,
        userRole: req.user.role,
        actionType: AuditActionType.UPDATE_SETTINGS,
        description: `Admin updated system settings`,
        status: AuditStatus.SUCCESS,
        metadata: { updates: body },  // ✅ Using metadata
      });
      
      return { 
        success: true, 
        message: 'Settings saved successfully',
        data: updated 
      };
    } catch (error) {
      this.logger.error(`❌ Failed to update settings: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to update settings');
    }
  }
}