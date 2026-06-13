import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan, Between } from 'typeorm';
import { AuditLog } from '../audit/audit.entity';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async logActivity(data: {
    userId?: number;
    userEmail?: string;
    userName?: string;
    userRole?: string;
    actionType: string;
    description: string;
    status: string;
    entityType?: string;
    entityId?: string | number;
    ipAddress?: string;
    userAgent?: string;
    actionDetails?: Record<string, any>;
  }): Promise<AuditLog | null> {
    try {
      const log = this.auditRepo.create({
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        userName: data.userName || null,
        userRole: data.userRole || null,
        actionType: data.actionType,
        description: data.description,
        status: data.status,
        entityType: data.entityType || null,
        entityId: data.entityId ? String(data.entityId) : null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        actionDetails: data.actionDetails || null,
      });
      
      const savedLog = await this.auditRepo.save(log);
      this.logger.debug(`Activity logged: ${data.actionType} - ${data.description}`);
      return savedLog;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to log activity: ${errorMessage}`);
      return null;
    }
  }

  async getUserActivity(userId: number, days: number = 30): Promise<AuditLog[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    return this.auditRepo.find({
      where: {
        userId,
        timestamp: MoreThan(since),
      },
      order: { timestamp: 'DESC' },
    });
  }

  async getActivityByEntity(entityType: string, entityId: string | number): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { 
        entityType, 
        entityId: String(entityId) 
      },
      order: { timestamp: 'DESC' },
    });
  }

  async getActivityByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: {
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'DESC' },
    });
  }

  async getActionTypeStats(days: number = 30): Promise<Record<string, number>> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const results = await this.auditRepo
      .createQueryBuilder('log')
      .select('log.actionType', 'actionType')
      .addSelect('COUNT(*)', 'count')
      .where('log.timestamp > :since', { since })
      .groupBy('log.actionType')
      .getRawMany();
    
    const stats: Record<string, number> = {};
    results.forEach(result => {
      stats[result.actionType] = parseInt(result.count, 10);
    });
    
    return stats;
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    
    const result = await this.auditRepo
      .createQueryBuilder()
      .delete()
      .where('timestamp < :cutoff', { cutoff })
      .execute();
    
    const deletedCount = result.affected || 0;
    this.logger.log(`Cleaned up ${deletedCount} old activity logs (older than ${daysToKeep} days)`);
    return deletedCount;
  }

  async getDashboardStats(): Promise<{
    totalToday: number;
    totalThisWeek: number;
    totalThisMonth: number;
    topActions: { action: string; count: number }[];
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const [totalToday, totalThisWeek, totalThisMonth, topActions] = await Promise.all([
      this.auditRepo.count({ where: { timestamp: MoreThan(today) } }),
      this.auditRepo.count({ where: { timestamp: MoreThan(weekAgo) } }),
      this.auditRepo.count({ where: { timestamp: MoreThan(monthAgo) } }),
      this.auditRepo
        .createQueryBuilder('log')
        .select('log.actionType', 'action')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.actionType')
        .orderBy('count', 'DESC')
        .limit(5)
        .getRawMany(),
    ]);
    
    return {
      totalToday,
      totalThisWeek,
      totalThisMonth,
      topActions: topActions.map(item => ({
        action: item.action,
        count: parseInt(item.count, 10),
      })),
    };
  }
}