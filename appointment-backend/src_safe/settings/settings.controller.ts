import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SystemSettings } from './settings.entity';
import { AuditService } from '../audit/audit.service';
import { AuditActionType, AuditStatus } from '../audit/audit.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    @InjectRepository(SystemSettings)
    private settingsRepo: Repository<SystemSettings>,
    private auditService: AuditService,
  ) {}

  @Get()
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
    
    return settings;
  }

  @Post()
  async updateSettings(@Body() body: any, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can update settings');
    }
    
    let settings = await this.settingsRepo.findOne({ where: {} });
    
    if (!settings) {
      settings = this.settingsRepo.create({});
    }
    
    // Update only provided fields
    if (body.autoArchiveDays !== undefined) {
      settings.autoArchiveDays = body.autoArchiveDays;
    }
    if (body.maxBookingsPerDay !== undefined) {
      settings.maxBookingsPerDay = body.maxBookingsPerDay;
    }
    if (body.notificationsEnabled !== undefined) {
      settings.notificationsEnabled = body.notificationsEnabled;
    }
    if (body.maintenanceMode !== undefined) {
      settings.maintenanceMode = body.maintenanceMode;
    }
    if (body.dailyLimit !== undefined) {
      settings.dailyLimit = body.dailyLimit;
    }
    if (body.weeklyLimit !== undefined) {
      settings.weeklyLimit = body.weeklyLimit;
    }
    if (body.monthlyLimit !== undefined) {
      settings.monthlyLimit = body.monthlyLimit;
    }
    if (body.activeLimit !== undefined) {
      settings.activeLimit = body.activeLimit;
    }
    if (body.cooldownMinutes !== undefined) {
      settings.cooldownMinutes = body.cooldownMinutes;
    }
    
    settings.updatedBy = req.user.userId;
    const updated = await this.settingsRepo.save(settings);
    
    // ✅ FIXED: Use 'metadata' instead of 'actionDetails'
    await this.auditService.log({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      actionType: AuditActionType.UPDATE_SETTINGS,
      description: `Admin updated system settings`,
      status: AuditStatus.SUCCESS,
      metadata: { updates: body },  // ✅ Changed from actionDetails to metadata
    });
    
    return { 
      success: true, 
      message: 'Settings saved successfully',
      data: updated 
    };
  }
}