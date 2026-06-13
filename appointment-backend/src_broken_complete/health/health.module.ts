import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { SystemController } from './system.controller';
import { User } from '../users/user.entity';
import { Appointment } from '../appointments/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Appointment])],
  controllers: [HealthController, SystemController],
})
export class HealthModule {}