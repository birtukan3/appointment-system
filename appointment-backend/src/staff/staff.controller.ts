// backend/src/staff/staff.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    id: number;
    email: string;
    role: string;
    name: string;
  };
}

@Controller('users/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  private readonly logger = new Logger(StaffController.name);

  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Roles('admin')
  async getAllStaff() {
    const staff = await this.staffService.findAll();
    return {
      success: true,
      data: staff,
      message: 'Staff retrieved successfully',
    };
  }

  @Get('stats')
  @Roles('admin')
  async getStaffStats() {
    return this.staffService.getStats();
  }

  @Get(':id')
  @Roles('admin')
  async getStaffById(@Param('id', ParseIntPipe) id: number) {
    const staff = await this.staffService.findOne(id);
    return {
      success: true,
      data: staff,
    };
  }

  @Post()
  @Roles('admin')
  async createStaff(@Body() body: any, @Request() req: AuthenticatedRequest) {
    const staff = await this.staffService.create(body, req.user.userId || req.user.id);
    return {
      success: true,
      data: staff,
      message: 'Staff member added successfully',
    };
  }

  @Put(':id')
  @Roles('admin')
  async updateStaff(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const staff = await this.staffService.update(id, body);
    return {
      success: true,
      data: staff,
      message: 'Staff member updated successfully',
    };
  }

  @Delete(':id')
  @Roles('admin')
  async removeStaff(@Param('id', ParseIntPipe) id: number, @Request() req: AuthenticatedRequest) {
    await this.staffService.remove(id, req.user.userId || req.user.id);
    return {
      success: true,
      message: 'Staff member removed successfully',
    };
  }

  @Get('appointments')
  @Roles('staff', 'admin')
  async getStaffAppointments(@Request() req: AuthenticatedRequest) {
    const appointments = await this.staffService.getAppointments(req.user.userId || req.user.id);
    return {
      success: true,
      data: appointments,
    };
  }
}