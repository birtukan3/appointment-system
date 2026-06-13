import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus, Ip, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { LoginDto, RegisterDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Get('test')
  async test() {
    return { success: true, message: 'Auth controller is working!', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    return this.authService.checkEmailAvailability(email);
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Ip() ip: string) {
    return this.authService.register(registerDto, ip);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Ip() ip: string) {
    return this.authService.login(loginDto, ip);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }, @Ip() ip: string) {
    return this.authService.forgotPassword(body.email, ip);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password: string }, @Ip() ip: string) {
    return this.authService.resetPassword(body.token, body.password, ip);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    return this.authService.getCurrentUser(req.user.userId);
  }
}