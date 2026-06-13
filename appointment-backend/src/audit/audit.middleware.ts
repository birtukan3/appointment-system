import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Store original request details
    const startTime = Date.now();
    const originalUrl = req.originalUrl;
    const method = req.method;
    const ip = req.ip;
    const userAgent = req.get('user-agent');

    // Log request on response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // You can save this to database if needed
      console.log(`[AUDIT] ${method} ${originalUrl} - ${statusCode} - ${duration}ms - ${ip}`);
    });

    next();
  }
}
