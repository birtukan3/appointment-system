// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { StaffModule } from './staff/staff.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { HealthModule } from './health/health.module';
import { SystemModule } from './system/system.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ActivityModule } from './activity/activity.module';
import { AdminModule } from './admin/admin.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { GatewayModule } from './gateway_backup/gateway.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { SecurityModule } from './security/security.module';
import { SettingsModule } from './settings/settings.module';
import { User } from './users/user.entity';
import { Appointment } from './appointments/appointment.entity';
import { Upload } from './uploads/upload.entity';
import { Notification } from './notifications/notification.entity';
import { SystemSettings } from './settings/settings.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'SmartOffice@2026!'),
        database: configService.get('DB_DATABASE', 'appointment_db'),
        entities: [User, Appointment, Upload, Notification, SystemSettings],
        synchronize: true,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    StaffModule,
    UsersModule,
    AppointmentsModule,
    HealthModule,
    SystemModule,
    AuditModule,
    NotificationsModule,
    UploadsModule,
    FeedbackModule,
    ActivityModule,
    AdminModule,
    TestimonialsModule,
    GatewayModule,
    GoogleCalendarModule,
    SecurityModule,
    SettingsModule,
  ],
})
export class AppModule {}