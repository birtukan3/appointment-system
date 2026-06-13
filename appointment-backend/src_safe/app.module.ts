// src/app.module.ts - FIXED (added connection pool configuration)
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { HealthModule } from './health/health.module';
import { SystemModule } from './system/system.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { ActivityModule } from './activity/activity.module';
import { AdminModule } from './admin/admin.module';
import { FeedbackModule } from './feedback/feedback.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { SecurityModule } from './security/security.module';
import { SettingsModule } from './settings/settings.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { GatewayModule } from './gateway_backup/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'SmartOffice@2026!',
      database: process.env.DB_DATABASE || 'appointment_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Set to false in production
      logging: process.env.NODE_ENV === 'development',
      // Connection pool configuration
      extra: {
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection could not be established
      },
      // Retry logic
      retryAttempts: 10,
      retryDelay: 3000,
    }),
    AuthModule,
    UsersModule,
    AppointmentsModule,
    HealthModule,
    SystemModule,
    AuditModule,
    NotificationsModule,
    UploadsModule,
    ActivityModule,
    AdminModule,
    FeedbackModule,
    GoogleCalendarModule,
    SecurityModule,
    SettingsModule,
    TestimonialsModule,
    GatewayModule,
  ],
})
export class AppModule {}