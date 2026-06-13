import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('system')
export class SystemController {
  @Get('status')
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
        port: process.env.PORT || 3002,
        apiPrefix: '/api',
      },
    };
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}