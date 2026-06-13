import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { User } from './users/user.entity';
import { Appointment } from './appointments/appointment.entity';

// Import only working controllers and services for now
import { AuthController } from './auth/auth.controller';
import { HealthController } from './health/health.controller';
import { AppointmentsController } from './appointments/appointments.controller';
import { UsersController } from './users/users.controller';

import { AuthService } from './auth/auth.service';
import { UsersService } from './users/users.service';
import { AppointmentsService } from './appointments/appointments.service';

import { JwtStrategy } from './auth/jwt.strategy';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'SmartOffice@2026!'),
        database: configService.get('DB_DATABASE', 'appointment_db'),
        entities: [User, Appointment],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Appointment]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'your-secret-key-change-this'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, HealthController, AppointmentsController, UsersController],
  providers: [AuthService, UsersService, AppointmentsService, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AppModule {}
