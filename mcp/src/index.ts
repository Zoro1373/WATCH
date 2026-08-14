/**
 * WaterGuard AI — Model Context Protocol (MCP) Server
 * 
 * NitroStack TypeScript MCP Server providing read-only tools
 * for querying and explaining WaterGuard environmental telemetry and risk indicators.
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

// Start the application
bootstrap().catch((error) => {
  console.error('❌ Failed to start WaterGuard MCP server:', error);
  process.exit(1);
});
