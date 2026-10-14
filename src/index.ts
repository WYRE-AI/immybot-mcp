#!/usr/bin/env node

/**
 * ImmyBot MCP Server
 *
 * Windows endpoint management and software deployment automation via MCP
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';
import { startHttpServer } from './http.js';
import { logger } from './utils/logger.js';
import { testConnection } from './utils/client.js';

async function main() {
  const transport = process.env.MCP_TRANSPORT || 'stdio';
  const isGatewayMode = process.env.AUTH_MODE === 'gateway';

  logger.info('Starting ImmyBot MCP server', {
    transport,
    authMode: isGatewayMode ? 'gateway' : 'direct',
    nodeVersion: process.version,
  });

  if (transport === 'http') {
    // HTTP transport for gateway mode. startHttpServer refuses to listen
    // unless CONDUIT_S2S_SECRET is a real secret (or the loopback-only
    // MCP_ALLOW_INSECURE_DEV=1 bypass is set) and passes an explicit host.
    const httpServer = await startHttpServer();

    // Graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully');
      httpServer.close(() => {
        process.exit(0);
      });
    });

  } else {
    // STDIO transport for direct mode
    if (!isGatewayMode) {
      // Test connection in direct mode
      try {
        const connected = await testConnection();
        if (!connected) {
          logger.warn('ImmyBot connection test failed - some tools may not work');
        } else {
          logger.info('ImmyBot connection test successful');
        }
      } catch (error: any) {
        logger.warn('Connection test error', { error: error.message });
      }
    }

    const server = createMcpServer();
    const stdioTransport = new StdioServerTransport();

    logger.info('STDIO server starting');

    await server.connect(stdioTransport);

    // Keep process alive
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully');
      await server.close();
      process.exit(0);
    });
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

// Start server
main().catch((error) => {
  logger.error('Failed to start server', { error: error.message, stack: error.stack });
  process.exit(1);
});