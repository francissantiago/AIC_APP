#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { closePool } from './db/pool.js';
import { registerBlueprintTools } from './tools/blueprint.tools.js';
import { registerDatabaseTools } from './tools/database.tools.js';
import { registerGuidelinesTools } from './tools/guidelines.tools.js';
import { registerQualityTools } from './tools/quality.tools.js';

const server = new McpServer({
  name: 'aic-app',
  version: '1.0.0',
});

registerDatabaseTools(server);
registerBlueprintTools(server);
registerGuidelinesTools(server);
registerQualityTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async () => {
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
}

main().catch((error) => {
  console.error('Fatal MCP error:', error);
  process.exit(1);
});
