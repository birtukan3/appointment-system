import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment, BookingStatus } from '../appointments/appointment.entity';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
  ) {}

  @Get('user-stats')
  async getUserStats(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId || req.user.id;
    const appointments = await this.appointmentRepo.find({ 
      where: { userId } 
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await this.appointmentRepo.count({
      where: { 
        userId, 
        datetime: Between(today, tomorrow) 
      }
    });

    return {
      total: appointments.length,
      pending: appointments.filter(a => a.status === BookingStatus.PENDING).length,
      approved: appointments.filter(a => a.status === BookingStatus.APPROVED).length,
      completed: appointments.filter(a => a.status === BookingStatus.COMPLETED).length,
      todayCount: todayCount,
    };
  }

  @Get('my-limits')
  async getMyLimits(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId || req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await this.appointmentRepo.count({
      where: { 
        userId, 
        datetime: Between(today, tomorrow) 
      }
    });

    const activeBookings = await this.appointmentRepo.count({
      where: { 
        userId, 
        status: BookingStatus.PENDING 
      }
    });

    const approvedBookings = await this.appointmentRepo.count({
      where: { 
        userId, 
        status: BookingStatus.APPROVED 
      }
    });

    return {
      daily: 3,
      used: todayCount,
      remaining: Math.max(0, 3 - todayCount),
      activeBookings: activeBookings + approvedBookings,
      remainingActive: Math.max(0, 3 - (activeBookings + approvedBookings)),
      weeklyBookings: 0,
      remainingWeekly: 5,
      cooldownRemaining: 0,
      limits: {
        maxActiveBookings: 3,
        maxDailyBookings: 2,
        maxWeeklyBookings: 5,
        bookingCooldownMinutes: 5,
      }
    };
  }

  @Get('my/recent')
  async getRecent(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId || req.user.id;
    const appointments = await this.appointmentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 3,
    });
    return appointments;
  }
}