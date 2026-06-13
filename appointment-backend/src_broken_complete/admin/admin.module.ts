import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSettingsController } from './admin-settings.controller';
import { UsersService } from '../users/users.service';
import { UsersModule } from '../users/users.module';
import { User } from '../users/user.entity';
import { UserLimitOverride } from '../users/user-limit-override.entity';
import { SystemSettings } from '../settings/settings.entity';
import { AuditLog } from '../audit/audit.entity';
import { Appointment } from '../appointments/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserLimitOverride, SystemSettings, AuditLog, Appointment]),
    UsersModule,
  ],
  controllers: [AdminSettingsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class AdminModule {}