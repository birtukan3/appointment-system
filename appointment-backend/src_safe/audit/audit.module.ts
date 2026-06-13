import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit.entity';
import { AuditLogsController } from './audit-logs.controller';
import { AuditService } from './audit.service';
import { AuditMiddleware } from './audit.middleware';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditLogsController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuditMiddleware)
      .exclude('health', 'favicon.ico', 'uploads/(.*)', 'socket.io', '_next/(.*)')
      .forRoutes('*');
  }
}
