import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus, Ip, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
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
  async register(
    @Body() body: { name: string; email: string; password: string; company?: string; phone?: string },
    @Ip() ip: string
  ) {
    const result = await this.authService.register({
      name: body.name,
      email: body.email,
      password: body.password,
      company: body.company,
      phone: body.phone,
      ip: ip,
    });
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string; twoFactorToken?: string },
    @Ip() ip: string
  ) {
    return this.authService.login(body.email, body.password, body.twoFactorToken, ip);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('forgot-password')
  @Public()
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @Public()
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    return this.authService.getCurrentUser(req.user.userId);
  }
}