import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  async create(@Request() req, @Body() body: any) {
    const data = await this.appointmentsService.create({
      ...body,
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name || req.user.email,
    });
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: any) {
    return this.appointmentsService.findAll(query);
  }

  @Get('my')
  async findMy(@Request() req, @Query() query: any) {
    const data = await this.appointmentsService.findByUser(req.user.email, query);
    return { success: true, data };
  }

  @Get('my/upcoming')
  async findUpcoming(@Request() req) {
    const all = await this.appointmentsService.findByUser(req.user.email);
    const upcoming = all.filter(a => new Date(a.datetime) > new Date() && a.status !== 'cancelled');
    return { success: true, data: upcoming };
  }

  @Get('stats')
  async getStats() {
    return this.appointmentsService.getStats();
  }

  @Get('user-stats')
  async getUserStats(@Request() req) {
    const stats = await this.appointmentsService.getUserBookingStats(req.user.userId);
    return { success: true, ...stats };
  }

  @Get('my-limits')
  async getMyLimits(@Request() req) {
    const limits = await this.appointmentsService.getUserBookingLimits(req.user.userId, req.user.email);
    return { success: true, data: limits };
  }

  @Post('available-slots')
  async getAvailableSlots(@Body() body: { staffId: number; date: string; duration?: number }) {
    return this.appointmentsService.getAvailableSlots(body.staffId, body.date, body.duration);
  }

  @Post('approve-with-code')
  async approveWithCode(@Body() body: { approvalCode: string }) {
    const data = await this.appointmentsService.approveWithCode(body.approvalCode);
    return { success: true, data };
  }

  @Post('archive')
  async archiveExpired() {
    const count = await this.appointmentsService.archiveExpiredAppointments();
    return { success: true, message: `Archived ${count} expired appointments` };
  }

  @Post('bulk')
  async bulkAction(@Body() body: { appointmentIds: number[]; action: string }) {
    for (const id of body.appointmentIds) {
      if (body.action === 'approve') {
        await this.appointmentsService.updateStatus(id, 'approved');
      } else if (body.action === 'reject') {
        await this.appointmentsService.updateStatus(id, 'rejected');
      } else if (body.action === 'archive') {
        await this.appointmentsService.archiveAppointment(id);
      }
    }
    return { success: true, message: `${body.appointmentIds.length} appointments ${body.action}d` };
  }

  @Post('export')
  async export(@Body() filters: any) {
    const csv = await this.appointmentsService.export(filters);
    return csv;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.appointmentsService.findOne(parseInt(id));
    return { success: true, data };
  }

  @Get(':id/files')
  async getFiles(@Param('id') id: string) {
    const data = await this.appointmentsService.getAppointmentFiles(parseInt(id));
    return { success: true, data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.appointmentsService.updateStatus(parseInt(id), body.status, body.comment);
    return { success: true, data };
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @Request() req) {
    const data = await this.appointmentsService.cancel(parseInt(id), req.user.email, req.user.role);
    return { success: true, data };
  }

  @Post(':id/feedback')
  async addFeedback(@Param('id') id: string, @Body() body: { rating: number; comment: string }) {
    const data = await this.appointmentsService.addFeedback(parseInt(id), body.rating, body.comment);
    return { success: true, data };
  }
}