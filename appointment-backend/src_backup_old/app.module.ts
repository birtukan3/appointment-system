import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { SystemModule } from './system/system.module';

// Entities
import { User } from './users/user.entity';
import { Appointment } from './appointments/appointment.entity';
import { AuditLog } from './audit/audit.entity';
import { Notification } from './notifications/notification.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: parseInt(configService.get('DB_PORT', '5432'), 10),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'SmartOffice@2026!'),
        database: configService.get('DB_DATABASE', 'appointment_db'),
        entities: [User, Appointment, AuditLog, Notification],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    AppointmentsModule,
    NotificationsModule,
    AuditModule,
    HealthModule,
    SystemModule,
  ],
})
export class AppModule {}
