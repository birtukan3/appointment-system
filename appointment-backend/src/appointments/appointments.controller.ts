import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ExportOptionsDto } from './dto/export-options.dto';
import { QueryAppointmentDto } from './dto/query-appointment.dto';
import { Response } from 'express';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  async create(@Body() body: CreateAppointmentDto, @Request() req) {
    return this.service.create({
      ...body,
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name,
      datetime: new Date(body.datetime),
    });
  }

  @Get()
  async findAll(@Request() req, @Query() query: QueryAppointmentDto) {
    if (req.user.role === 'admin') {
      return this.service.findAll(query);
    } else if (req.user.role === 'staff') {
      return this.service.findByProvider(req.user.name, query);
    } else {
      return this.service.findByUser(req.user.email, query);
    }
  }

  @Get('my')
  async findMy(@Request() req, @Query() query: QueryAppointmentDto) {
    return this.service.findByUser(req.user.email, query);
  }

  @Get('stats')
  async getStats(@Request() req) {
    if (req.user.role === 'admin') {
      return this.service.getStats();
    } else if (req.user.role === 'staff') {
      return this.service.getStats(undefined, req.user.name);
    } else {
      return this.service.getStats(req.user.email);
    }
  }

  @Post('export')
  async export(
    @Body() options: ExportOptionsDto,
    @Request() req,
    @Res() res: Response,
  ) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can export appointments');
    }

    const file = await this.service.exportAppointments(options);
    const filename = `appointments-export-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(file);
  }

  @Get('availability')
  async checkAvailability(@Query('providerName') providerName: string, @Query('date') date: string) {
    if (!providerName || !date) return { bookedSlots: [] };
    return this.service.checkAvailability(providerName, date);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(parseInt(id));
  }

  @Patch(':id')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateAppointmentDto,
    @Request() req,
  ) {
    if (!body.status) {
      throw new BadRequestException('Status is required');
    }

    if (!['admin', 'staff'].includes(req.user.role)) {
      throw new ForbiddenException('Only staff or admins can update appointments');
    }

    const appointment = await this.service.findOne(parseInt(id));
    if (req.user.role === 'staff' && appointment.providerName !== req.user.name) {
      throw new ForbiddenException('You can only manage your own appointments');
    }

    return this.service.updateStatus(parseInt(id), body.status, body.comment);
  }

  @Delete(':id')
  async cancel(@Param('id') id: string, @Request() req) {
    return this.service.cancel(parseInt(id), req.user.email, req.user.role);
  }
}