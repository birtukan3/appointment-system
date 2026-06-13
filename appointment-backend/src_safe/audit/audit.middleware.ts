import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit.entity';

export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    
    const skipPaths = ['/health', '/favicon.ico', '/_next', '/socket.io', '/uploads'];
    if (skipPaths.some(path => req.path?.startsWith(path))) {
      return next();
    }

    let responseBody: any = null;
    let responseSent = false;

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    res.json = (body: any): Response => {
      if (!responseSent) {
        responseSent = true;
        responseBody = body;
        this.logActivity(req, res, responseBody, startTime).catch(err => {
          this.logger.error(Audit log error: );
        });
      }
      return originalJson(body);
    };

    res.send = (body: any): Response => {
      if (!responseSent) {
        responseSent = true;
        responseBody = body;
        this.logActivity(req, res, responseBody, startTime).catch(err => {
          this.logger.error(Audit log error: );
        });
      }
      return originalSend(body);
    };

    next();
  }

  private async logActivity(req: Request, res: Response, responseBody: any, startTime: number): Promise<void> {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const actionType = this.determineActionType(req);
    if (!actionType) return;

    const user = (req as any).user;
    const isSuccess = statusCode >= 200 && statusCode < 300;
    const status = isSuccess ? 'SUCCESS' : 'FAILURE';
    
    try {
      const logData = {
        userId: user?.userId || user?.id || null,
        userEmail: user?.email || req.body?.email || null,
        userName: user?.name || null,
        userRole: user?.role || null,
        actionType: actionType,
        description: this.generateDescription(req, actionType),
        status: status,
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'] || null,
        entityType: this.determineEntityType(req),
        entityId: this.extractEntityId(req, responseBody),
        actionDetails: {
          method: req.method,
          path: req.path,
          statusCode,
          responseTime,
          query: req.query,
        },
      };
      
      const audit = this.auditRepo.create(logData);
      await this.auditRepo.save(audit);
    } catch (error) {
      this.logger.error(Failed to save audit log: The term 'echo.' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again. Cannot find path 'D:\Desktop\AppointmentSystem\appointment-backend\dist' because it does not exist. FileStream was asked to open a device that was not a file. For support for devices like 'com1:' or 'lpt1:', call CreateFile, then use the FileStream constructors that take an OS handle as an IntPtr. A positional parameter cannot be found that accepts argument '/q'.);
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
    if (path === '/auth/login' && method === 'POST') return 'LOGIN';
    if (path === '/appointments' && method === 'POST') return 'CREATE_APPOINTMENT';
    if (path?.match(/\/appointments\/\d+/) && method === 'PATCH') return 'UPDATE_APPOINTMENT';
    return 'USER_ACTION';
  }

  private generateDescription(req: Request, actionType: string): string {
    const user = (req as any).user;
    const userName = user?.name || user?.email || 'Anonymous';
    return ${userName} performed ;
  }

  private determineEntityType(req: Request): string | null {
    if (req.path?.includes('/appointments')) return 'APPOINTMENT';
    if (req.path?.includes('/users')) return 'USER';
    return null;
  }

  private extractEntityId(req: Request, responseBody: any): string | null {
    const match = req.path?.match(/\/(\d+)/);
    if (match) return match[1];
    if (responseBody?.id) return String(responseBody.id);
    return null;
  }
}
