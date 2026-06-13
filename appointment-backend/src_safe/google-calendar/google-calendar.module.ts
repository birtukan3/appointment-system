import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleCalendarController } from './google-calendar.controller';
import { User } from '../users/user.entity';
import { Appointment } from '../appointments/appointment.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot(), // ✅ Ensure ConfigModule is properly initialized
    TypeOrmModule.forFeature([User, Appointment]),
    AuditModule,
  ],
  controllers: [GoogleCalendarController],
  providers: [
    GoogleCalendarService,
    // ✅ Add any additional providers if needed
  ],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}