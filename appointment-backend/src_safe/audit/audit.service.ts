import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, MoreThan, LessThan, FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditActionType, AuditStatus } from './audit.entity';
import { CreateAuditLogDto, GetAuditLogsQueryDto } from './dto/audit.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async log(data: CreateAuditLogDto): Promise<AuditLog | null> {
    try {
      const log = this.auditRepo.create({
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        userName: data.userName || null,
        userRole: data.userRole || null,
        actionType: data.actionType,
        actionDetails: data.metadata || data.actionDetails || null,
        description: data.description,
        status: data.status || AuditStatus.SUCCESS,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
      });
      return await this.auditRepo.save(log);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to log audit: ${errorMessage}`);
      return null;
    }
  }

  async getLogs(query: GetAuditLogsQueryDto): Promise<{
    logs: AuditLog[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLog> = {};

    if (query.userId) where.userId = query.userId;
    if (query.userEmail) where.userEmail = ILike(`%${query.userEmail}%`);
    if (query.userRole) where.userRole = query.userRole;
    if (query.actionType && query.actionType !== 'all') where.actionType = query.actionType;
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;

    if (query.search) {
      where.description = ILike(`%${query.search}%`);
    }

    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      where.timestamp = Between(start, end);
    } else if (query.startDate) {
      where.timestamp = MoreThan(new Date(query.startDate));
    } else if (query.endDate) {
      where.timestamp = LessThan(new Date(query.endDate));
    }

    const [logs, total] = await this.auditRepo.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      skip,
      take: limit,
    });

    return {
      logs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats(startDate?: Date, endDate?: Date): Promise<any> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (startDate && endDate) {
      where.timestamp = Between(startDate, endDate);
    }

    const [total, byActionType, byStatus, dailyActivity, topActiveUsers, failedLoginCount] = await Promise.all([
      this.auditRepo.count({ where }),
      this.auditRepo
        .createQueryBuilder('log')
        .select('log.actionType', 'name')
        .addSelect('COUNT(*)', 'value')
        .where(startDate && endDate ? 'log.timestamp BETWEEN :start AND :end' : '1=1', { start: startDate, end: endDate })
        .groupBy('log.actionType')
        .orderBy('value', 'DESC')
        .limit(10)
        .getRawMany(),
      this.auditRepo
        .createQueryBuilder('log')
        .select('log.status', 'name')
        .addSelect('COUNT(*)', 'value')
        .groupBy('log.status')
        .getRawMany(),
      this.auditRepo
        .createQueryBuilder('log')
        .select("DATE(log.timestamp) as date")
        .addSelect('COUNT(*)', 'count')
        .where('log.timestamp > datetime("now", "-30 days")')
        .groupBy('DATE(log.timestamp)')
        .orderBy('date', 'DESC')
        .getRawMany(),
      this.auditRepo
        .createQueryBuilder('log')
        .select('log.userId', 'userId')
        .addSelect('log.userName', 'name')
        .addSelect('log.userEmail', 'email')
        .addSelect('COUNT(*)', 'activityCount')
        .where('log.userId IS NOT NULL')
        .andWhere(startDate && endDate ? 'log.timestamp BETWEEN :start AND :end' : '1=1', { start: startDate, end: endDate })
        .groupBy('log.userId')
        .addGroupBy('log.userName')
        .addGroupBy('log.userEmail')
        .orderBy('activityCount', 'DESC')
        .limit(10)
        .getRawMany(),
      this.auditRepo.count({
        where: {
          actionType: AuditActionType.LOGIN_FAILED,
          ...(startDate && endDate ? { timestamp: Between(startDate, endDate) } : {}),
        },
      }),
    ]);

    return {
      total,
      byActionType: byActionType.map(item => ({ name: item.name, value: parseInt(item.value, 10) })),
      byStatus: byStatus.map(item => ({ name: item.name, value: parseInt(item.value, 10) })),
      dailyActivity: dailyActivity.map(item => ({ date: item.date, count: parseInt(item.count, 10) })),
      topActiveUsers: topActiveUsers.map(user => ({
        userId: parseInt(user.userId, 10),
        name: user.name,
        email: user.email,
        activityCount: parseInt(user.activityCount, 10),
      })),
      failedLoginCount,
    };
  }

  async getFailedLogins(hours: number = 24, limit: number = 50): Promise<any> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const logs = await this.auditRepo.find({
      where: {
        actionType: AuditActionType.LOGIN_FAILED,
        timestamp: MoreThan(since),
      },
      order: { timestamp: 'DESC' },
      take: Math.min(limit, 100),
    });

    const ipGroups: Record<string, { count: number; lastAttempt: Date; emails: string[] }> = {};

    logs.forEach(log => {
      const ip = log.ipAddress || 'unknown';
      if (!ipGroups[ip]) {
        ipGroups[ip] = { count: 0, lastAttempt: log.timestamp, emails: [] };
      }
      ipGroups[ip].count++;
      if (log.userEmail && !ipGroups[ip].emails.includes(log.userEmail)) {
        ipGroups[ip].emails.push(log.userEmail);
      }
      if (log.timestamp > ipGroups[ip].lastAttempt) {
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
      total: logs.length,
      recent: logs.slice(0, 20),
      suspiciousIps,
    };
  }

  async getUserActivityTimeline(userId: number, days: number = 30): Promise<any> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.auditRepo.find({
      where: {
        userId,
        timestamp: MoreThan(since),
      },
      order: { timestamp: 'DESC' },
    });

    const dailyBreakdown: Record<string, number> = {};
    logs.forEach(log => {
      const date = log.timestamp.toISOString().split('T')[0];
      dailyBreakdown[date] = (dailyBreakdown[date] || 0) + 1;
    });

    const byActionType: Record<string, number> = {};
    logs.forEach(log => {
      if (log.actionType) {
        byActionType[log.actionType] = (byActionType[log.actionType] || 0) + 1;
      }
    });

    return {
      userId,
      days,
      totalActivities: logs.length,
      dailyBreakdown: Object.entries(dailyBreakdown).map(([date, count]) => ({ date, count })),
      byActionType: Object.entries(byActionType).map(([action, count]) => ({ action, count })),
      recentActivities: logs.slice(0, 20),
    };
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const result = await this.auditRepo
      .createQueryBuilder()
      .delete()
      .where('timestamp < :cutoff', { cutoff })
      .execute();

    this.logger.log(`Cleaned up ${result.affected || 0} old audit logs (older than ${daysToKeep} days)`);
    return result.affected || 0;
  }
}