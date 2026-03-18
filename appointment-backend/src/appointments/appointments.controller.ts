import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, ForbiddenException, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import * as ExcelJS from 'exceljs';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  async create(@Body() dto: CreateAppointmentDto, @Request() req) {
    return await this.service.create(dto, req.user.email);
  }

  @Get()
  async findAll(@Request() req) {
    const { role, email, name } = req.user;

    if (role === 'admin') {
      return await this.service.findAll();
    } else if (role === 'staff') {
      return await this.service.findByProvider(name);
    } else {
      return await this.service.findByEmail(email);
    }
  }

  @Get('my')
  async findMy(@Request() req) {
    return await this.service.findByEmail(req.user.email);
  }

  @Get('user/:email')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  async findByUser(@Param('email') email: string) {
    return await this.service.findByEmail(email);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const appointment = await this.service.findOne(+id);

    if (req.user.role === 'user' && appointment.userEmail !== req.user.email) {
      throw new ForbiddenException('You can only view your own appointments');
    }
    if (req.user.role === 'staff' && appointment.providerName !== req.user.name) {
      throw new ForbiddenException('You can only view your own appointments');
    }

    return appointment;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @Request() req
  ) {
    return await this.service.update(+id, dto, req.user.role, req.user.email, req.user.name);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return await this.service.remove(+id, req.user.role, req.user.email, req.user.name);
  }

  // ✅ NEW: Export to Excel endpoint
  @Post('export')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  async exportToExcel(@Body() filters: any, @Res() res: Response) {
    try {
      // Get filtered appointments
      const appointments = await this.service.getAppointmentsForExport(filters);
      
      // Create workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SmartOffice';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Add worksheet
      const worksheet = workbook.addWorksheet('Appointments');
      
      // Define columns
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Service Name', key: 'serviceName', width: 30 },
        { header: 'Staff Name', key: 'providerName', width: 30 },
        { header: 'Customer Email', key: 'userEmail', width: 30 },
        { header: 'Date & Time', key: 'datetime', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Priority', key: 'priority', width: 10 },
        { header: 'Notes', key: 'notes', width: 30 },
        { header: 'Age', key: 'age', width: 10 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Company', key: 'company', width: 25 },
      ];
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Add data
      appointments.forEach(app => {
        worksheet.addRow({
          id: app.id,
          serviceName: app.serviceName,
          providerName: app.providerName,
          userEmail: app.userEmail,
          datetime: app.datetime ? new Date(app.datetime).toLocaleString() : '',
          status: app.status,
          priority: app.priority || 'Normal',
          notes: app.notes || '',
          age: app.age || '',
          gender: app.gender || '',
          company: app.company || '',
        });
      });
      
      // Auto-filter
      worksheet.autoFilter = {
        from: 'A1',
        to: 'K1',
      };
      
      // Add summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 },
      ];
      
      // Calculate statistics
      const total = appointments.length;
      const pending = appointments.filter(a => a.status === 'Pending').length;
      const approved = appointments.filter(a => a.status === 'Approved').length;
      const rejected = appointments.filter(a => a.status === 'Rejected').length;
      
      summarySheet.addRow({ metric: 'Total Appointments', value: total });
      summarySheet.addRow({ metric: 'Pending Appointments', value: pending });
      summarySheet.addRow({ metric: 'Approved Appointments', value: approved });
      summarySheet.addRow({ metric: 'Rejected Appointments', value: rejected });
      summarySheet.addRow({ metric: '', value: '' });
      
      // Priority breakdown
      const normal = appointments.filter(a => a.priority === 'Normal').length;
      const high = appointments.filter(a => a.priority === 'High').length;
      const urgent = appointments.filter(a => a.priority === 'Urgent').length;
      
      summarySheet.addRow({ metric: 'By Priority', value: '' });
      summarySheet.addRow({ metric: '- Normal', value: normal });
      summarySheet.addRow({ metric: '- High', value: high });
      summarySheet.addRow({ metric: '- Urgent', value: urgent });
      
      // Style summary sheet
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(6).font = { bold: true };
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=appointments-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: 'Failed to export appointments' });
    }
  }
}