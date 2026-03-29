import { 
  Controller, Get, Post, Body, Param, Delete, UseGuards, Patch, 
  Query, NotFoundException, Request, ForbiddenException 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    createUserDto.role = 'user';
    return this.usersService.create(createUserDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.userId, updateUserDto);
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard)
  async getStaff() {
    return this.usersService.getStaff();
  }

  @Get('staff/search')
  @UseGuards(JwtAuthGuard)
  async searchStaff(@Query('q') query: string, @Query('limit') limit: string = '10') {
    if (!query || !query.trim()) return [];
    const parsedLimit = parseInt(limit, 10);
    return this.usersService.searchStaff(query.trim(), isNaN(parsedLimit) ? 10 : parsedLimit);
  }

  @Get('staff/:id')
  @UseGuards(JwtAuthGuard)
  async getStaffById(@Param('id') id: string) {
    return this.usersService.getStaffById(parseInt(id));
  }

  @Post('staff')
  @UseGuards(JwtAuthGuard)
  async addStaff(@Body() createUserDto: CreateUserDto, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can add staff');
    }
    createUserDto.role = 'staff';
    return this.usersService.create(createUserDto);
  }

  @Patch('staff/:id')
  @UseGuards(JwtAuthGuard)
  async updateStaff(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can update staff');
    }
    return this.usersService.update(parseInt(id), updateUserDto);
  }

  @Delete('staff/:id')
  @UseGuards(JwtAuthGuard)
  async removeStaff(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can remove staff');
    }
    return this.usersService.remove(parseInt(id));
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can view all users');
    }
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can view user details');
    }
    const user = await this.usersService.findById(parseInt(id));
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can update users');
    }
    return this.usersService.update(parseInt(id), updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete users');
    }
    return this.usersService.remove(parseInt(id));
  }
}