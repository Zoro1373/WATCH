import { Module } from '@nitrostack/core';
import { WaterGuardTools } from './waterguard.tools.js';
import { WaterGuardService } from './waterguard.service.js';

@Module({
  name: 'waterguard',
  description: 'WaterGuard AI Read-Only MCP Telemetry & Risk Module',
  controllers: [WaterGuardTools],
  providers: [WaterGuardService]
})
export class WaterGuardModule {}
