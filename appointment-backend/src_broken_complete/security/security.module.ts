import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheService } from './cache.service';
import { RateLimitService } from './rate-limit.service';
import { SecurityService } from './security.service';
import { User } from '../users/user.entity';
import { Appointment } from '../appointments/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Appointment])],
  providers: [CacheService, RateLimitService, SecurityService],
  exports: [CacheService, RateLimitService, SecurityService],
})
export class SecurityModule {}