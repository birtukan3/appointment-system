import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Request, 
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './notification.entity';
import { AuditService } from '../audit/audit.service';
import { AuditActionType, AuditStatus } from '../audit/audit.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async getNotifications(
    @Request() req,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('read') read?: string,
    @Query('type') type?: string,
  ) {
    const result = await this.notificationsService.getForUser(req.user.userId, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      read: read ? read === 'true' : undefined,
      type: type ? (type as NotificationType) : undefined,
    });

    return {
      success: true,
      data: result.notifications,
      total: result.total,
      unread: result.unread,
    };
  }

  @Get('unread/count')
  async getUnreadCount(@Request() req) {
    const unread = await this.notificationsService.getUnreadCount(req.user.userId);
    return { success: true, data: { unread } };
  }

  @Get('stats')
  async getStats(@Request() req) {
    const stats = await this.notificationsService.getStats(req.user.userId);
    return { success: true, data: stats };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    await this.notificationsService.markAsRead(parseInt(id, 10), req.user.userId);
    return { success: true, message: 'Notification marked as read' };
  }

  @Post('mark-read')
  async markMultipleAsRead(@Body() body: { notificationIds: number[] }, @Request() req) {
    await this.notificationsService.markMultipleAsRead(body.notificationIds, req.user.userId);
    return { success: true, message: 'Notifications marked as read' };
  }

  @Post('mark-all-read')
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.userId);
    return { success: true, message: 'All notifications marked as read' };
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Request() req) {
    await this.notificationsService.delete(parseInt(id, 10), req.user.userId);
    return { success: true, message: 'Notification deleted' };
  }

  @Post('announcement')
  async sendAnnouncement(@Body() body: { title: string; message: string; target: string }, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can send announcements');
    }
    
    const announcement = await this.notificationsService.createAnnouncement({
      title: body.title,
      message: body.message,
      actionUrl: null,
      metadata: { target: body.target || 'all' },
    });
    
    await this.auditService.log({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      actionType: AuditActionType.SEND_ANNOUNCEMENT,
      description: `Sent announcement: ${body.title}`,
      status: AuditStatus.SUCCESS,
      metadata: { title: body.title, target: body.target },
    });
    
    return { success: true, data: announcement };
  }

  @Get('admin/all')
  async getAllNotifications(@Request() req, @Query('limit') limit?: string, @Query('page') page?: string) {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      throw new ForbiddenException('Admin/Staff access required');
    }

    const limitNum = limit ? parseInt(limit, 10) : 50;
    const pageNum = page ? parseInt(page, 10) : 1;
    const offset = (pageNum - 1) * limitNum;

    const result = await this.notificationsService.getAllNotifications({
      limit: limitNum,
      offset,
    });

    return {
      success: true,
      data: result.notifications,
      total: result.total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(result.total / limitNum),
    };
  }

  @Get('health')
  async health() {
    return { message: 'Notifications API is working', timestamp: new Date().toISOString() };
  }
}