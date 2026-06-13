import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityService } from './activity.service';
import { AuditLog } from '../audit/audit.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User])],
  controllers: [ActivityLogsController],
  providers: [ActivityService],
  exports: [ActivityService, TypeOrmModule],
})
export class ActivityModule {}