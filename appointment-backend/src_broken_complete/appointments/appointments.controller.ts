import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Patch, Delete, ParseIntPipe, BadRequestException, Ip, Logger } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  private readonly logger = new Logger(AppointmentsController.name);

  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  async create(@Request() req, @Body() body: any, @Ip() ip: string) {
    const data = await this.appointmentsService.create({
      ...body,
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name || req.user.email,
      ip: ip,
    });
    return { success: true, data };
  }

  @Get()
  @Roles('admin', 'staff')
  @UseGuards(RolesGuard)
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
    const upcoming = all.filter(a => new Date(a.datetime) > new Date() && a.status !== 'cancelled' && a.status !== 'rejected');
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
    if (!body.staffId || !body.date) {
      throw new BadRequestException('Staff ID and date are required');
    }
    return this.appointmentsService.getAvailableSlots(body.staffId, body.date, body.duration);
  }

  @Post('approve-with-code')
  async approveWithCode(@Body() body: { approvalCode: string }) {
    if (!body.approvalCode) {
      throw new BadRequestException('Approval code is required');
    }
    const data = await this.appointmentsService.approveWithCode(body.approvalCode);
    return { success: true, data };
  }

  @Post('archive')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async archiveExpired() {
    const count = await this.appointmentsService.archiveExpiredAppointments();
    return { success: true, message: `Archived ${count} expired appointments` };
  }

  @Post('bulk')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async bulkAction(@Body() body: { appointmentIds: number[]; action: string }) {
    if (!body.appointmentIds?.length) {
      throw new BadRequestException('No appointments selected');
    }
    
    let successCount = 0;
    for (const id of body.appointmentIds) {
      try {
        if (body.action === 'approve') {
          await this.appointmentsService.updateStatus(id, 'approved');
        } else if (body.action === 'reject') {
          await this.appointmentsService.updateStatus(id, 'rejected');
        } else if (body.action === 'archive') {
          await this.appointmentsService.archiveAppointment(id);
        } else {
          throw new BadRequestException(`Invalid action: ${body.action}`);
        }
        successCount++;
      } catch (err) {
        // ✅ FIXED: Proper error handling
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.error(`Bulk action failed for appointment ${id}: ${errorMessage}`);
      }
    }
    
    return { success: true, message: `${successCount} of ${body.appointmentIds.length} appointments ${body.action}d` };
  }

  @Post('export')
  @Roles('admin', 'staff')
  @UseGuards(RolesGuard)
  async export(@Body() filters: any) {
    const csv = await this.appointmentsService.export(filters);
    return csv;
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.appointmentsService.findOne(id);
    return { success: true, data };
  }

  @Get(':id/files')
  async getFiles(@Param('id', ParseIntPipe) id: number) {
    const data = await this.appointmentsService.getAppointmentFiles(id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: { status: string; comment?: string },
    @Request() req
  ) {
    const data = await this.appointmentsService.updateStatus(id, body.status, body.comment, req.user.userId);
    return { success: true, data };
  }

  @Delete(':id')
  async cancel(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const data = await this.appointmentsService.cancel(id, req.user.email, req.user.role);
    return { success: true, data };
  }

  @Post(':id/feedback')
  async addFeedback(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: { rating: number; comment: string }
  ) {
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    const data = await this.appointmentsService.addFeedback(id, body.rating, body.comment);
    return { success: true, data };
  }
}