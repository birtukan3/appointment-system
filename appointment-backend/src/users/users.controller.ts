// backend/src/users/users.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, ForbiddenException, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return { success: true, data: user };
  }

  @Patch('profile')
  async updateProfile(@Request() req, @Body() body: { name?: string; phone?: string; company?: string; department?: string }) {
    const result = await this.usersService.updateProfile(req.user.userId, body);
    return { success: true, message: 'Profile updated successfully', data: result };
  }

  @Get('staff')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async getStaff() {
    const staff = await this.usersService.getStaff();
    return { success: true, data: staff };
  }

  @Get('staff/details')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async getStaffWithDetails() {
    const staff = await this.usersService.getStaffWithDetails();
    return { success: true, data: staff };
  }

  @Get('staff/search')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async searchStaff(@Query('q') query: string, @Query('limit') limit: string = '10') {
    const staff = await this.usersService.getStaff();
    if (!query) {
      return { success: true, data: staff.slice(0, parseInt(limit, 10)) };
    }
    const filtered = staff.filter(s => 
      s.name?.toLowerCase().includes(query.toLowerCase()) ||
      s.department?.toLowerCase().includes(query.toLowerCase()) ||
      s.specialization?.toLowerCase().includes(query.toLowerCase())
    );
    return { success: true, data: filtered.slice(0, parseInt(limit, 10)) };
  }

  @Get('staff/:id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async getStaffById(@Param('id') id: string) {
    const staff = await this.usersService.findById(parseInt(id, 10));
    return { success: true, data: staff };
  }

  @Post('staff')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async createStaff(@Body() body: any) {
    const result = await this.usersService.createStaff(body);
    return { success: true, message: 'Staff created successfully', data: result };
  }

  @Delete('staff/:id')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async deleteStaff(@Param('id') id: string) {
    await this.usersService.delete(parseInt(id, 10));
    return { success: true, message: 'Staff member deleted' };
  }

  @Get()
  @Roles('admin')
  @UseGuards(RolesGuard)
  async findAll(@Query() query: any) {
    const { search, page = 1, limit = 20 } = query;
    const result = await this.usersService.findAll(search, parseInt(page, 10), parseInt(limit, 10));
    return { success: true, ...result };
  }

  @Post('change-password')
  async changePassword(@Request() req, @Body() body: { oldPassword: string; newPassword: string }) {
    const success = await this.usersService.changePassword(req.user.userId, body.oldPassword, body.newPassword);
    if (!success) {
      throw new ForbiddenException('Current password is incorrect');
    }
    return { success: true, message: 'Password changed successfully' };
  }

  @Post('deactivate')
  async deactivateAccount(@Request() req, @Body() body: { reason?: string }) {
    await this.usersService.deactivateAccount(req.user.userId, body.reason);
    return { success: true, message: 'Account deactivated successfully' };
  }

  @Post('reactivate')
  async reactivateAccount(@Request() req) {
    await this.usersService.reactivateAccount(req.user.userId);
    return { success: true, message: 'Account reactivated successfully' };
  }

  @Get('experts')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async getExperts() {
    const staff = await this.usersService.getStaff();
    return staff.map(s => ({
      id: s.id,
      name: s.name,
      position: s.specialization || s.department || 'Tech Expert',
      department: s.department || 'Engineering',
      rating: 4.8,
      techStack: s.specialization || 'JavaScript, React'
    }));
  }

  @Get('security/status')
  async getSecurityStatus(@Request() req) {
    const lockStatus = await this.usersService.isAccountLocked(req.user.userId);
    const user = await this.usersService.findById(req.user.userId);
    return {
      success: true,
      data: {
        twoFactorEnabled: user?.twoFactorEnabled || false,
        isLocked: lockStatus.locked,
        remainingMinutes: lockStatus.remainingMinutes,
        isDeactivated: user?.isDeactivated || false,
      }
    };
  }
}