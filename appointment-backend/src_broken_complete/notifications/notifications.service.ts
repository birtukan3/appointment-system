import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan, LessThanOrEqual } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { User } from '../users/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(data: {
    type: NotificationType;
    title: string;
    message: string;
    userId?: number;
    appointmentId?: number;
    actionUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    try {
      // Prevent duplicate notifications within 5 seconds
      const recentDuplicate = await this.notificationRepo.findOne({
        where: {
          userId: data.userId || null,
          type: data.type,
          title: data.title,
          createdAt: MoreThan(new Date(Date.now() - 5000)),
        },
      });

      if (recentDuplicate) {
        this.logger.warn(`Duplicate notification prevented for user ${data.userId}`);
        return recentDuplicate;
      }

      const notification = this.notificationRepo.create({
        type: data.type,
        title: data.title,
        message: data.message,
        userId: data.userId,
        appointmentId: data.appointmentId,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
        read: false,
        isActive: true,
      });

      return await this.notificationRepo.save(notification);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create notification: ${errorMessage}`);
      throw error;
    }
  }

  async createBulk(
    userIds: number[],
    data: {
      type: NotificationType;
      title: string;
      message: string;
      appointmentId?: number;
      actionUrl?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<Notification[]> {
    try {
      const notifications = userIds.map(userId =>
        this.notificationRepo.create({
          type: data.type,
          title: data.title,
          message: data.message,
          userId,
          appointmentId: data.appointmentId,
          actionUrl: data.actionUrl,
          metadata: data.metadata,
          read: false,
          isActive: true,
        }),
      );

      return await this.notificationRepo.save(notifications);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create bulk notifications: ${errorMessage}`);
      throw error;
    }
  }

  async createAnnouncement(data: {
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    try {
      const announcement = this.notificationRepo.create({
        type: NotificationType.ANNOUNCEMENT,
        title: data.title,
        message: data.message,
        userId: null,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
        read: false,
        isActive: true,
      });

      return await this.notificationRepo.save(announcement);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create announcement: ${errorMessage}`);
      throw error;
    }
  }

  async getForUser(
    userId: number,
    filters?: {
      limit?: number;
      offset?: number;
      read?: boolean;
      type?: NotificationType;
    },
  ): Promise<{ notifications: Notification[]; total: number; unread: number }> {
    try {
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;

      const query = this.notificationRepo.createQueryBuilder('notification')
        .where('notification.userId = :userId OR notification.userId IS NULL', { userId })
        .andWhere('notification.isActive = :isActive', { isActive: true })
        .orderBy('notification.createdAt', 'DESC')
        .skip(offset)
        .take(limit);

      if (filters?.read !== undefined) {
        query.andWhere('notification.read = :read', { read: filters.read });
      }

      if (filters?.type) {
        query.andWhere('notification.type = :type', { type: filters.type });
      }

      const [notifications, total] = await query.getManyAndCount();

      const unread = await this.notificationRepo.count({
        where: [
          { userId, read: false, isActive: true },
          { userId: null, read: false, isActive: true },
        ],
      });

      return { notifications, total, unread };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get notifications for user ${userId}: ${errorMessage}`);
      return { notifications: [], total: 0, unread: 0 };
    }
  }

  async getAllNotifications(filters?: {
    limit?: number;
    offset?: number;
  }): Promise<{ notifications: Notification[]; total: number }> {
    try {
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;

      const [notifications, total] = await this.notificationRepo.findAndCount({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      });

      return { notifications, total };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get all notifications: ${errorMessage}`);
      return { notifications: [], total: 0 };
    }
  }

  async markAsRead(notificationId: number, userId: number): Promise<void> {
    try {
      const notification = await this.notificationRepo.findOne({
        where: { id: notificationId, isActive: true },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.userId !== null && notification.userId !== userId) {
        throw new NotFoundException('Notification not found');
      }

      notification.read = true;
      notification.readAt = new Date();
      await this.notificationRepo.save(notification);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to mark notification as read: ${errorMessage}`);
      throw error;
    }
  }

  async markMultipleAsRead(notificationIds: number[], userId: number): Promise<void> {
    try {
      await this.notificationRepo.update(
        {
          id: In(notificationIds),
          userId,
          isActive: true,
        },
        {
          read: true,
          readAt: new Date(),
        },
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to mark multiple notifications as read: ${errorMessage}`);
      throw error;
    }
  }

  async markAllAsRead(userId: number): Promise<void> {
    try {
      await this.notificationRepo.update(
        { userId, read: false, isActive: true },
        {
          read: true,
          readAt: new Date(),
        },
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to mark all notifications as read: ${errorMessage}`);
      throw error;
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    try {
      return await this.notificationRepo.count({
        where: [
          { userId, read: false, isActive: true },
          { userId: null, read: false, isActive: true },
        ],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get unread count: ${errorMessage}`);
      return 0;
    }
  }

  async delete(notificationId: number, userId: number): Promise<void> {
    try {
      const notification = await this.notificationRepo.findOne({
        where: { id: notificationId, isActive: true },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.userId !== null && notification.userId !== userId) {
        throw new NotFoundException('Notification not found');
      }

      // Soft delete - mark as inactive
      notification.isActive = false;
      await this.notificationRepo.save(notification);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete notification: ${errorMessage}`);
      throw error;
    }
  }

  async getStats(userId: number): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
  }> {
    try {
      const total = await this.notificationRepo.count({
        where: [
          { userId, isActive: true },
          { userId: null, isActive: true },
        ],
      });

      const unread = await this.getUnreadCount(userId);

      const byType: Record<string, number> = {};
      for (const type of Object.values(NotificationType)) {
        byType[type] = await this.notificationRepo.count({
          where: [
            { userId, type, isActive: true },
            { userId: null, type, isActive: true },
          ],
        });
      }

      return { total, unread, byType };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get stats: ${errorMessage}`);
      return { total: 0, unread: 0, byType: {} };
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldNotifications(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Hard delete old read notifications
      const result = await this.notificationRepo.delete({
        read: true,
        isActive: false,
        createdAt: LessThanOrEqual(thirtyDaysAgo),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(`Cleaned up ${result.affected} old notifications`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to cleanup old notifications: ${errorMessage}`);
    }
  }
}