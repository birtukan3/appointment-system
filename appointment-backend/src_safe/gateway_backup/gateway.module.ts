// src/gateway_backup/gateway.module.ts - FIXED
import { Module } from '@nestjs/common';
import { AppGateway } from './app.gateway';

@Module({
  providers: [AppGateway],
  exports: [AppGateway],
})
export class GatewayModule {}