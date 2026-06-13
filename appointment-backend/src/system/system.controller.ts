// src/system/system.controller.ts
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('system')
export class SystemController {
  @Get('status')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getStatus() {
    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0',
      server: {
        port: parseInt(process.env.PORT || '3002', 10),
        apiPrefix: '/api',
      },
    };
  }

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
    };
  }

  @Get('info')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getInfo() {
    return {
      name: 'SmartOffice API',
      version: '2.0.0',
      description: 'Appointment Management System',
      author: 'SmartOffice Team',
      license: 'MIT',
      dependencies: Object.keys(require('../../package.json').dependencies || {}).length,
    };
  }

  @Get('ping')
  @Public()
  @HttpCode(HttpStatus.OK)
  async ping() {
    return { pong: true, timestamp: new Date().toISOString() };
  }
}