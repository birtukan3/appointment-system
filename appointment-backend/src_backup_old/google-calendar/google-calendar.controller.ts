import { Controller, Get, Post, Delete, Query, UseGuards, Request, Body } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('google-calendar')
@UseGuards(JwtAuthGuard)
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('auth-url')
  async getAuthUrl(@Request() req): Promise<{ url: string }> {
    const url = await this.googleCalendarService.getAuthUrl(req.user.userId);
    return { url };
  }

  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ): Promise<any> {
    return this.googleCalendarService.handleOAuthCallback(code, state);
  }

  @Post('connect')
  async connectCalendar(@Request() req, @Body() body: { code: string }): Promise<any> {
    return this.googleCalendarService.handleOAuthCallback(body.code, req.user.userId.toString());
  }

  @Delete('disconnect')
  async disconnectCalendar(@Request() req): Promise<any> {
    await this.googleCalendarService.disconnectCalendar(req.user.userId);
    return { success: true, message: 'Google Calendar disconnected successfully' };
  }

  @Get('status')
  async getCalendarStatus(@Request() req): Promise<any> {
    return this.googleCalendarService.getCalendarStatus(req.user.userId);
  }

  @Get('available-slots')
  async getAvailableSlots(
    @Request() req,
    @Query('staffId') staffId: string,
    @Query('date') date: string,
  ): Promise<any> {
    const staffIdNum = parseInt(staffId, 10);
    if (isNaN(staffIdNum)) {
      return [];
    }
    return this.googleCalendarService.getAvailableSlotsFromCalendar(
      req.user.userId,
      staffIdNum,
      new Date(date),
    );
  }

  @Post('sync')
  async syncCalendar(@Request() req): Promise<any> {
    const result = await this.googleCalendarService.syncCalendarEvents(req.user.userId);
    return result;
  }
}