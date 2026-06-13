// src/system/system.controller.ts - COMPLETE WORKING VERSION
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
        port: 3002,
        apiPrefix: '/api',
      },
    };
  }

  @Get('health')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    return {
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}