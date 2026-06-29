import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, Ip, ParseIntPipe, Logger, BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  private readonly logger = new Logger(AppointmentsController.name);

  constructor(private readonly appointmentsService: AppointmentsService) {}
// Add this after the other endpoints

@Get(':id/activities')
async getActivities(
  @Param('id', ParseIntPipe) id: number,
  @Request() req: any
): Promise<{ success: boolean; data: any[] }> {
  try {
    const userId = req.user?.userId || req.user?.id;
    // Verify the appointment belongs to this user
    const appointment = await this.appointmentsService.findOne(id);
    
    if (appointment.userId !== userId && req.user?.role !== 'admin') {
      return { success: false, data: [] };
    }
    
    // Return mock activities or fetch from audit logs
    // For now, return empty array
    return { success: true, data: [] };
  } catch (error) {
    this.logger.error(`Failed to get activities for appointment ${id}: ${error.message}`);
    return { success: false, data: [] };
  }
}
  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() body: any, @Ip() ip: string) {
    try {
      const userId = req.user.userId || req.user.id;
      const user = req.user as any;

      // ✅ ENSURE ALL REQUIRED FIELDS WITH FALLBACKS
      const enrichedData = {
        ...body,
        userId: userId,
        userEmail: body.userEmail || body.clientEmail || user?.email || 'user@example.com',
        userName: body.userName || body.clientName || user?.name || user?.fullName || 'User',
        serviceName: body.serviceName || 'Consultation',
        providerName: body.providerName || body.expertName || 'Staff',
        duration: body.duration || 60,
        priority: body.priority || 'normal',
        notes: body.notes || '',
      };

      this.logger.log(`📝 Creating appointment for user: ${userId}, name: ${enrichedData.userName}`);

      const data = await this.appointmentsService.create(enrichedData, userId);
      return { success: true, data };
    } catch (error) {
      this.logger.error(`❌ Error creating appointment: ${error.message}`);
      throw new BadRequestException({
        success: false,
        message: error.message || 'Failed to create appointment',
      });
    }
  }

  @Get()
  async findAll(@Query() query: any) {
    return this.appointmentsService.findAll(query);
  }

  @Get('my')
  async findMy(@Request() req: AuthenticatedRequest, @Query() query: any) {
    const appointments = await this.appointmentsService.findByUserId(req.user.userId || req.user.id);
    return { success: true, data: appointments };
  }

  @Get('upcoming')
  async findUpcoming(@Request() req: AuthenticatedRequest) {
    const appointments = await this.appointmentsService.findByUserId(req.user.userId || req.user.id);
    const upcoming = appointments.filter(a => new Date(a.datetime) > new Date() && a.status === 'approved');
    return { success: true, data: upcoming };
  }

  @Get('stats')
  async getStats() {
    return this.appointmentsService.getStats();
  }

  @Get('user-stats')
  async getUserStats(@Request() req: AuthenticatedRequest) {
    const stats = await this.appointmentsService.getUserBookingStats(req.user.userId || req.user.id);
    return { success: true, data: stats };
  }

  @Get('my-limits')
  async getMyLimits(@Request() req: AuthenticatedRequest) {
    const limits = await this.appointmentsService.getUserBookingLimits(
      req.user.userId || req.user.id, 
      req.user.email
    );
    return { success: true, data: limits };
  }

  @Post('available-slots')
  async getAvailableSlots(@Body() body: any) {
    const slots = await this.appointmentsService.getAvailableSlots(body.staffId, body.date, body.duration);
    return { success: true, data: slots };
  }

  @Post('approve')
  async approveByCode(@Body() body: any) {
    const data = await this.appointmentsService.approveWithCode(body.approvalCode);
    return { success: true, data };
  }

  @Post('archive-expired')
  async archiveExpired() {
    const count = await this.appointmentsService.archiveExpiredAppointments();
    return { success: true, data: { archivedCount: count } };
  }

  @Get('export')
  async export(@Query() filters: any) {
    return this.appointmentsService.export(filters);
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

  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Request() req: AuthenticatedRequest
  ) {
    const data = await this.appointmentsService.updateStatus(id, body.status, body.comment, req.user.userId || req.user.id);
    return { success: true, data };
  }

  @Delete(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    const data = await this.appointmentsService.cancel(id, req.user.email, req.user.role);
    return { success: true, data };
  }

  @Post(':id/feedback')
  async addFeedback(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const data = await this.appointmentsService.addFeedback(id, body.rating, body.comment);
    return { success: true, data };
  }
}