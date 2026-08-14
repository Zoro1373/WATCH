import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { WaterGuardModule } from './modules/waterguard/waterguard.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module for WaterGuard MCP Server
 * 
 * Uses NitroStack decorator-driven architecture.
 * Configured with HTTP transport on port 3001.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'waterguard-mcp-server',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  },
  transport: {
    type: 'http',
    http: {
      port: 3001,
      host: 'localhost'
    }
  }
})
@Module({
  name: 'app',
  description: 'WaterGuard AI Assistant MCP Server',
  imports: [
    ConfigModule.forRoot(),
    WaterGuardModule
  ],
  providers: [
    SystemHealthCheck
  ]
})
export class AppModule {}
