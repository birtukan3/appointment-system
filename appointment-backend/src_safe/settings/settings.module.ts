import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SystemSettings } from './settings.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemSettings]),
    AuditModule,
  ],
  controllers: [SettingsController],
})
export class SettingsModule {}