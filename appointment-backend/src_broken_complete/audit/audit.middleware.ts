// src/audit/audit.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';  // ✅ Fixed import
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditActionType, AuditStatus } from './audit.entity';

@Injectable()
export class AuditMiddleware implements NestMiddleware {  // ✅ Now works correctly
  private readonly logger = new Logger(AuditMiddleware.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Skip certain paths to avoid clutter
    const skipPaths = ['/health', '/favicon.ico', '/_next', '/socket.io', '/uploads'];
    if (skipPaths.some(path => req.path?.startsWith(path))) {
      return next();
    }

    let responseSent = false;
    let responseBody: any = null;

    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Override json method
    res.json = (body: any): Response => {
      if (!responseSent) {
        responseSent = true;
        responseBody = body;
        this.logActivity(req, res, responseBody, startTime);
      }
      return originalJson(body);
    };

    // Override send method
    res.send = (body: any): Response => {
      if (!responseSent) {
        responseSent = true;
        responseBody = body;
        this.logActivity(req, res, responseBody, startTime);
      }
      return originalSend(body);
    };

    next();
  }

  private async logActivity(req: Request, res: Response, responseBody: any, startTime: number) {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;

    const actionType = this.determineActionType(req);
    if (!actionType) return;

    const user = (req as any).user;
    const isSuccess = statusCode >= 200 && statusCode < 300;
    const status = isSuccess ? AuditStatus.SUCCESS : AuditStatus.FAILURE;
    
    try {
      const logData = {
        userId: user?.userId || user?.id,
        userEmail: user?.email || req.body?.email,
        userName: user?.name,
        userRole: user?.role,
        actionType: actionType,
        description: this.generateDescription(req, actionType, responseBody),
        status: status,
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'],
        entityType: this.determineEntityType(req),
        entityId: this.extractEntityId(req, responseBody),
        actionDetails: {
          method: req.method,
          path: req.path,
          statusCode,
          responseTime,
          query: req.query,
          body: this.sanitizeBody(req.body),
        },
      };
      
      const audit = this.auditRepo.create(logData);
      await this.auditRepo.save(audit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Audit log error: ${errorMessage}`);
    }
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  private determineActionType(req: Request): string | null {
    const { method, path } = req;
    const user = (req as any).user;

    if (path === '/auth/login' && method === 'POST') {
      return user ? AuditActionType.LOGIN : AuditActionType.LOGIN_FAILED;
    }
    if (path === '/auth/logout' && method === 'POST') {
      return AuditActionType.LOGOUT;
    }
    if (path === '/auth/register' && method === 'POST') {
      return AuditActionType.REGISTER;
    }
    if (path === '/users/change-password' && method === 'POST') {
      return AuditActionType.CHANGE_PASSWORD;
    }
    if (path === '/users/profile' && method === 'PATCH') {
      return AuditActionType.UPDATE_PROFILE;
    }
    if (path === '/appointments' && method === 'POST') {
      return AuditActionType.CREATE_APPOINTMENT;
    }
    if (path === '/appointments/archive' && method === 'POST') {
      return AuditActionType.ARCHIVE_APPOINTMENTS;
    }
    if (path === '/appointments/bulk' && method === 'POST') {
      return AuditActionType.BULK_ACTION;
    }
    if (path === '/appointments/approve-with-code' && method === 'POST') {
      return AuditActionType.APPROVE_WITH_CODE;
    }
    if (path && /^\/appointments\/\d+$/.test(path)) {
      if (method === 'PATCH') {
        if (req.body?.status === 'approved') return AuditActionType.APPROVE_APPOINTMENT;
        if (req.body?.status === 'rejected') return AuditActionType.REJECT_APPOINTMENT;
        return AuditActionType.UPDATE_APPOINTMENT;
      }
      if (method === 'DELETE') {
        return AuditActionType.DELETE_APPOINTMENT;
      }
    }
    if (path === '/users/staff' && method === 'POST') {
      return AuditActionType.CREATE_STAFF;
    }
    if (path && /^\/users\/staff\/\d+$/.test(path) && method === 'DELETE') {
      return AuditActionType.DELETE_STAFF;
    }
    if (path === '/uploads' && method === 'POST') {
      return AuditActionType.UPLOAD_FILE;
    }
    if (path === '/uploads' && method === 'DELETE') {
      return AuditActionType.DELETE_FILE;
    }
    if (path === '/notifications/announcement' && method === 'POST') {
      return AuditActionType.SEND_ANNOUNCEMENT;
    }
    if (path === '/settings' && method === 'POST') {
      return AuditActionType.UPDATE_SETTINGS;
    }
    if (path === '/audit-logs' && method === 'GET') {
      return AuditActionType.VIEW_AUDIT_LOGS;
    }
    if (path === '/audit-logs/export/csv' && method === 'GET') {
      return AuditActionType.EXPORT_DATA;
    }
    if (path === '/feedback' && method === 'POST') {
      return AuditActionType.SUBMIT_FEEDBACK;
    }
    if (path === '/testimonials' && method === 'POST') {
      return AuditActionType.SUBMIT_FEEDBACK;
    }
    if (path === '/testimonials' && method === 'PATCH') {
      if (path.includes('/approve')) return AuditActionType.APPROVE_TESTIMONIAL;
      if (path.includes('/reject')) return AuditActionType.REJECT_TESTIMONIAL;
    }
    if (path === '/google-calendar/connect' && method === 'POST') {
      return AuditActionType.GOOGLE_CALENDAR_CONNECT;
    }
    if (path === '/google-calendar/disconnect' && method === 'DELETE') {
      return AuditActionType.GOOGLE_CALENDAR_DISCONNECT;
    }
    if (path === '/google-calendar/sync' && method === 'POST') {
      return AuditActionType.GOOGLE_CALENDAR_SYNC;
    }
    
    if (user?.role === 'admin') return AuditActionType.ADMIN_ACTION;
    if (user?.role === 'staff') return AuditActionType.STAFF_ACTION;
    
    return AuditActionType.USER_ACTION;
  }

  private generateDescription(req: Request, actionType: string, responseBody: any): string {
    const user = (req as any).user;
    const userName = user?.name || user?.email || 'Anonymous';

    const descriptions: Record<string, string> = {
      [AuditActionType.LOGIN]: `${userName} logged in successfully`,
      [AuditActionType.LOGOUT]: `${userName} logged out`,
      [AuditActionType.LOGIN_FAILED]: `Failed login attempt for email: ${req.body?.email || 'unknown'}`,
      [AuditActionType.REGISTER]: `New user registered: ${req.body?.email || 'unknown'}`,
      [AuditActionType.CREATE_APPOINTMENT]: `${userName} created appointment for ${req.body?.serviceName || 'unknown service'}`,
      [AuditActionType.UPDATE_APPOINTMENT]: `${userName} updated appointment ${this.extractEntityId(req, responseBody)}`,
      [AuditActionType.DELETE_APPOINTMENT]: `${userName} deleted appointment ${this.extractEntityId(req, responseBody)}`,
      [AuditActionType.APPROVE_APPOINTMENT]: `${userName} approved appointment ${this.extractEntityId(req, responseBody) || req.body?.approvalCode}`,
      [AuditActionType.REJECT_APPOINTMENT]: `${userName} rejected appointment ${this.extractEntityId(req, responseBody)}`,
      [AuditActionType.APPROVE_WITH_CODE]: `${userName} approved appointment using code ${req.body?.approvalCode}`,
      [AuditActionType.CREATE_STAFF]: `${userName} added staff member: ${req.body?.name || req.body?.email}`,
      [AuditActionType.DELETE_STAFF]: `${userName} removed staff member`,
      [AuditActionType.UPDATE_STAFF]: `${userName} updated staff member: ${req.body?.name}`,
      [AuditActionType.UPLOAD_FILE]: `${userName} uploaded a file`,
      [AuditActionType.DELETE_FILE]: `${userName} deleted a file`,
      [AuditActionType.SEND_ANNOUNCEMENT]: `${userName} sent announcement to ${req.body?.target || 'all users'}`,
      [AuditActionType.UPDATE_PROFILE]: `${userName} updated their profile`,
      [AuditActionType.CHANGE_PASSWORD]: `${userName} changed their password`,
      [AuditActionType.VIEW_AUDIT_LOGS]: `${userName} viewed audit logs`,
      [AuditActionType.UPDATE_SETTINGS]: `${userName} updated system settings`,
      [AuditActionType.EXPORT_DATA]: `${userName} exported data`,
      [AuditActionType.BULK_ACTION]: `${userName} performed bulk action on appointments`,
      [AuditActionType.ARCHIVE_APPOINTMENTS]: `${userName} archived expired appointments`,
      [AuditActionType.ADMIN_ACTION]: `Admin ${userName} performed action on ${req.path}`,
      [AuditActionType.STAFF_ACTION]: `Staff ${userName} performed action on ${req.path}`,
      [AuditActionType.CREATE_USER]: `New user registered: ${req.body?.email}`,
      [AuditActionType.SUBMIT_FEEDBACK]: `${userName} submitted feedback for appointment`,
      [AuditActionType.APPROVE_TESTIMONIAL]: `${userName} approved a testimonial`,
      [AuditActionType.REJECT_TESTIMONIAL]: `${userName} rejected a testimonial`,
      [AuditActionType.GOOGLE_CALENDAR_CONNECT]: `${userName} connected Google Calendar`,
      [AuditActionType.GOOGLE_CALENDAR_DISCONNECT]: `${userName} disconnected Google Calendar`,
      [AuditActionType.GOOGLE_CALENDAR_SYNC]: `${userName} synced Google Calendar`,
    };

    return descriptions[actionType] || `${userName} performed ${actionType.toLowerCase().replace(/_/g, ' ')}`;
  }

  private determineEntityType(req: Request): string | null {
    const path = req.path;
    if (!path) return null;
    
    if (path.includes('/appointments')) return 'APPOINTMENT';
    if (path.includes('/users') && !path.includes('/staff')) return 'USER';
    if (path.includes('/staff')) return 'STAFF';
    if (path.includes('/uploads')) return 'FILE';
    if (path.includes('/testimonials')) return 'TESTIMONIAL';
    if (path.includes('/feedback')) return 'FEEDBACK';
    if (path.includes('/notifications')) return 'NOTIFICATION';
    if (path.includes('/settings')) return 'SETTINGS';
    if (path.includes('/google-calendar')) return 'GOOGLE_CALENDAR';
    return null;
  }

  private extractEntityId(req: Request, responseBody: any): string | null {
    try {
      if (req.params && typeof req.params === 'object' && req.params.id) {
        return String(req.params.id);
      }
    } catch (e) {}
    
    try {
      const pathMatch = req.path?.match(/\/(\d+)(?:\/|$)/);
      if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
      }
    } catch (e) {}
    
    try {
      if (responseBody) {
        if (responseBody.id) return String(responseBody.id);
        if (responseBody.data && responseBody.data.id) return String(responseBody.data.id);
        if (responseBody.appointment && responseBody.appointment.id) return String(responseBody.appointment.id);
      }
    } catch (e) {}
    
    try {
      if (req.body && req.body.id) {
        return String(req.body.id);
      }
    } catch (e) {}
    
    return null;
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    
    const sensitiveFields = ['password', 'oldPassword', 'newPassword', 'confirmPassword', 'token', 'secret', 'authorization', 'refreshToken'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    try {
      if (sanitized.user && sanitized.user.password) {
        sanitized.user.password = '[REDACTED]';
      }
    } catch (e) {}
    
    return sanitized;
  }
}

