import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  @Get()
  async getServices() {
    return [
      { id: 1, name: 'Code Review & Best Practices', minDuration: 30, maxDuration: 90 },
      { id: 2, name: 'Architecture Design', minDuration: 60, maxDuration: 180 },
      { id: 3, name: 'DevOps & CI/CD Setup', minDuration: 45, maxDuration: 120 },
      { id: 4, name: 'Debugging & Troubleshooting', minDuration: 30, maxDuration: 60 },
      { id: 5, name: 'Tech Interview Prep', minDuration: 45, maxDuration: 90 },
      { id: 6, name: 'Database Optimization', minDuration: 30, maxDuration: 60 },
    ];
  }
}