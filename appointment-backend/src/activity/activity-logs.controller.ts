import { Controller, Get, UseGuards, Request, ForbiddenException, Query, Param, DefaultValuePipe, ParseIntPipe, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, LessThan, MoreThan, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditActionType, AuditStatus } from '../audit/audit.entity';
import { User } from '../users/user.entity';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  private readonly logger = new Logger(ActivityLogsController.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  @Get()
  async getActivityLogs(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('actionType') actionType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
  ) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenException('Admin access required');
      }

      const skip = (page - 1) * limit;
      const where: FindOptionsWhere<AuditLog> = {};

      if (search && search.trim()) {
        where.description = ILike(`%${search.trim()}%`);
      }
      
      if (actionType && actionType !== 'all' && actionType !== '') {
        where.actionType = actionType;
      }
      
      if (status && status !== 'all' && status !== '') {
        where.status = status;
      }
      
      if (userId && userId !== 'undefined' && userId !== 'null') {
        const userIdNum = parseInt(userId, 10);
        if (!isNaN(userIdNum)) {
          where.userId = userIdNum;
        }
      }
      
      // Date range filtering
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp = Between(start, end);
      } else if (startDate) {
        where.timestamp = MoreThan(new Date(startDate));
      } else if (endDate) {
        where.timestamp = LessThan(new Date(endDate));
      }

      const [data, total] = await this.auditRepo.findAndCount({
        where,
        order: { timestamp: 'DESC' },
        skip,
        take: Math.min(limit, 100),
      });

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: total || 0,
          totalPages: Math.ceil((total || 0) / limit),
          hasNext: page < Math.ceil((total || 0) / limit),
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Error in getActivityLogs: ${error.message}`);
      return {
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  }

  @Get('user/:userId')
  async getUserActivityLogs(
    @Request() req,
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    try {
      if (req.user.role !== 'admin' && req.user.userId !== userId) {
        throw new ForbiddenException('Access denied');
      }

      const skip = (page - 1) * limit;

      const [data, total] = await this.auditRepo.findAndCount({
        where: { userId },
        order: { timestamp: 'DESC' },
        skip,
        take: Math.min(limit, 100),
      });

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: total || 0,
          totalPages: Math.ceil((total || 0) / limit),
          hasNext: page < Math.ceil((total || 0) / limit),
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Error in getUserActivityLogs: ${error.message}`);
      return {
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      };
    }
  }

  @Get('summary')
  async getActivitySummary(@Request() req) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenException('Admin access required');
      }

      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      // ✅ FIXED: Use try/catch for each query to prevent 500 errors
      let totalLogs = 0;
      let recentLogs = 0;
      let actionTypeStats: any[] = [];
      let statusStats: any[] = [];
      let dailyActivity: any[] = [];

      try {
        totalLogs = await this.auditRepo.count();
      } catch (e) { this.logger.warn('Failed to count total logs'); }

      try {
        recentLogs = await this.auditRepo.count({ where: { timestamp: MoreThan(last7Days) } });
      } catch (e) { this.logger.warn('Failed to count recent logs'); }

      try {
        actionTypeStats = await this.auditRepo
          .createQueryBuilder('log')
          .select('log.actionType', 'actionType')
          .addSelect('COUNT(*)', 'count')
          .groupBy('log.actionType')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany();
      } catch (e) { this.logger.warn('Failed to get action type stats'); }

      try {
        statusStats = await this.auditRepo
          .createQueryBuilder('log')
          .select('log.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('log.status')
          .getRawMany();
      } catch (e) { this.logger.warn('Failed to get status stats'); }

      try {
        dailyActivity = await this.auditRepo
          .createQueryBuilder('log')
          .select("DATE(log.timestamp) as date")
          .addSelect('COUNT(*)', 'count')
          .where('log.timestamp > :date', { date: last30Days })
          .groupBy('DATE(log.timestamp)')
          .orderBy('date', 'DESC')
          .getRawMany();
      } catch (e) { this.logger.warn('Failed to get daily activity'); }

      // ✅ FIXED: Safe access to statusStats
      const successCount = statusStats?.find(s => s.status === AuditStatus.SUCCESS)?.count || 0;
      const failureCount = statusStats?.find(s => s.status === AuditStatus.FAILURE)?.count || 0;
      const totalWithStatus = successCount + failureCount;
      const successRate = totalWithStatus > 0 ? Math.round((successCount / totalWithStatus) * 100) : 0;

      return {
        success: true,
        data: {
          totalLogs: totalLogs || 0,
          recentLogs: recentLogs || 0,
          successRate: successRate || 0,
          actionTypeStats: (actionTypeStats || []).map(item => ({
            name: item.actionType || item.actiontype || 'Unknown',
            value: parseInt(item.count || '0', 10),
          })),
          statusStats: (statusStats || []).map(item => ({
            name: item.status || 'Unknown',
            value: parseInt(item.count || '0', 10),
          })),
          dailyActivity: (dailyActivity || []).map(item => ({
            date: item.date || '',
            count: parseInt(item.count || '0', 10),
          })),
        },
      };
    } catch (error) {
      this.logger.error(`Error in getActivitySummary: ${error.message}`);
      return {
        success: true,
        data: {
          totalLogs: 0,
          recentLogs: 0,
          successRate: 0,
          actionTypeStats: [],
          statusStats: [],
          dailyActivity: [],
        },
      };
    }
  }

  @Get('recent')
  async getRecentActivityLogs(
    @Request() req,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenException('Admin access required');
      }

      const data = await this.auditRepo.find({
        order: { timestamp: 'DESC' },
        take: Math.min(limit, 50),
      });

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      this.logger.error(`Error in getRecentActivityLogs: ${error.message}`);
      return {
        success: true,
        data: [],
      };
    }
  }

  @Get('failed-logins')
  async getFailedLogins(
    @Request() req,
    @Query('hours', new DefaultValuePipe(24), ParseIntPipe) hours: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenException('Admin access required');
      }

      const since = new Date();
      since.setHours(since.getHours() - hours);

      const data = await this.auditRepo.find({
        where: {
          actionType: AuditActionType.LOGIN_FAILED,
          timestamp: MoreThan(since),
        },
        order: { timestamp: 'DESC' },
        take: Math.min(limit, 100),
      });

      const ipGroups: Record<string, { count: number; lastAttempt: Date; emails: string[] }> = {};
      
      (data || []).forEach(log => {
        const ip = log.ipAddress || 'unknown';
        if (!ipGroups[ip]) {
          ipGroups[ip] = { count: 0, lastAttempt: log.timestamp, emails: [] };
        }
        ipGroups[ip].count++;
        if (log.userEmail && !ipGroups[ip].emails.includes(log.userEmail)) {
          ipGroups[ip].emails.push(log.userEmail);
        }
        if (log.timestamp && log.timestamp > ipGroups[ip].lastAttempt) {
          ipGroups[ip].lastAttempt = log.timestamp;
        }
      });

      const suspiciousIps = Object.entries(ipGroups)
        .filter(([_, stats]) => stats.count >= 5)
        .map(([ip, stats]) => ({
          ip,
          count: stats.count,
          lastAttempt: stats.lastAttempt,
          emails: stats.emails,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        success: true,
        data: {
          total: data?.length || 0,
          recent: (data || []).slice(0, 20),
          suspiciousIps: suspiciousIps || [],
        },
      };
    } catch (error) {
      this.logger.error(`Error in getFailedLogins: ${error.message}`);
      return {
        success: true,
        data: {
          total: 0,
          recent: [],
          suspiciousIps: [],
        },
      };
    }
  }

  @Get('export')
  async exportActivityLogs(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('actionType') actionType?: string,
  ) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenException('Admin access required');
      }

      const where: FindOptionsWhere<AuditLog> = {};
      
      if (actionType && actionType !== 'all') {
        where.actionType = actionType;
      }
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.timestamp = Between(start, end);
      } else if (startDate) {
        where.timestamp = MoreThan(new Date(startDate));
      } else if (endDate) {
        where.timestamp = LessThan(new Date(endDate));
      }

      const logs = await this.auditRepo.find({
        where,
        order: { timestamp: 'DESC' },
        take: 10000,
      });

      // Convert to CSV
      const headers = ['ID', 'Timestamp', 'User Email', 'User Name', 'User Role', 'Action Type', 'Description', 'IP Address', 'Status'];
      const csvRows = [headers];
      
      for (const log of logs || []) {
        csvRows.push([
          log.id?.toString() || '',
          log.timestamp?.toISOString() || '',
          log.userEmail || '',
          log.userName || '',
          log.userRole || '',
          log.actionType || '',
          log.description || '',
          log.ipAddress || '',
          log.status || '',
        ]);
      }

      const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      
      return csvContent;
    } catch (error) {
      this.logger.error(`Error in exportActivityLogs: ${error.message}`);
      return '';
    }
  }

  @Get(':id')
  async getActivityLogById(@Request() req, @Param('id') id: string) {
    try {
      if (req.user.role !== 'admin') {
        throw new ForbiddenException('Admin access required');
      }

      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        return {
          success: false,
          message: 'Invalid activity log ID',
        };
      }

      const log = await this.auditRepo.findOne({ where: { id: idNum } });
      
      if (!log) {
        return {
          success: false,
          message: 'Activity log not found',
        };
      }

      return {
        success: true,
        data: log,
      };
    } catch (error) {
      this.logger.error(`Error in getActivityLogById: ${error.message}`);
      return {
        success: false,
        message: 'Error fetching activity log',
      };
    }
  }
}