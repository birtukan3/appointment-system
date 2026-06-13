import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, ForbiddenException, Res, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAuditLogs(@Request() req, @Query() query: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can view audit logs');
    }

    const result = await this.auditService.getLogs({
      actionType: query.actionType,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
      userEmail: query.userEmail,
      userRole: query.userRole,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
    });

    return {
      success: true,
      data: result.logs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('stats')
  async getStats(@Request() req, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can view audit stats');
    }

    const stats = await this.auditService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    return {
      success: true,
      data: stats,
    };
  }

  @Get('failed-logins')
  async getFailedLogins(@Request() req, @Query('hours') hours?: string, @Query('limit') limit?: string) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can view failed logins');
    }

    const hoursNum = hours ? parseInt(hours, 10) : 24;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    
    if (isNaN(hoursNum) || isNaN(limitNum)) {
      throw new BadRequestException('Invalid hours or limit parameter');
    }
    
    const result = await this.auditService.getFailedLogins(hoursNum, limitNum);
    
    return {
      success: true,
      data: result,
    };
  }

  @Get('user/:userId')
  async getUserActivity(@Request() req, @Param('userId') userId: string, @Query('days') days?: string) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can view user activity');
    }

    const userIdNum = parseInt(userId, 10);
    const daysNum = days ? parseInt(days, 10) : 30;
    
    if (isNaN(userIdNum)) {
      throw new BadRequestException('Invalid user ID');
    }
    
    const result = await this.auditService.getUserActivityTimeline(userIdNum, daysNum);
    
    return {
      success: true,
      data: result,
    };
  }

  @Get('export/csv')
  async exportToCsv(@Request() req, @Res() res: Response, @Query() query: any) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can export audit logs');
    }
    
    const result = await this.auditService.getLogs({
      actionType: query.actionType,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
      userEmail: query.userEmail,
      userRole: query.userRole,
      page: 1,
      limit: 10000,
    });

    const logs = result.logs;

    const headers = ['ID', 'Timestamp', 'User Email', 'User Name', 'User Role', 'Action Type', 'Description', 'IP Address', 'Status', 'Entity Type', 'Entity ID'];
    const csvRows = [headers];
    
    for (const log of logs) {
      csvRows.push([
        String(log.id),  // ✅ FIXED: Convert to string
        log.timestamp ? log.timestamp.toISOString() : '',
        log.userEmail || '',
        log.userName || '',
        log.userRole || '',
        log.actionType || '',
        log.description || '',
        log.ipAddress || '',
        log.status || '',
        log.entityType || '',
        log.entityId || '',
      ]);
    }

    const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const csvBuffer = Buffer.from('\uFEFF' + csvContent, 'utf8');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvBuffer);
  }

  @Post('clean')
  async cleanupLogs(@Request() req, @Body() body: { days?: number }) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can cleanup audit logs');
    }

    const daysToKeep = body.days || 90;
    const deletedCount = await this.auditService.cleanupOldLogs(daysToKeep);
    
    return { 
      success: true, 
      message: `Deleted ${deletedCount} old logs older than ${daysToKeep} days`,
      deletedCount,
    };
  }
}