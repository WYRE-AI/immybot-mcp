import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getAllTools, handleToolCall } from './domains/index.js';
import { setServerRef, clearServerRef } from './utils/server-ref.js';
import { logger } from './utils/logger.js';

/**
 * Create MCP server instance
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'immybot-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Set server reference for elicitation
  setServerRef(server);

  // Tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async (_request, _extra) => {
    try {
      const tools = getAllTools();
      logger.debug('Tools listed', { toolCount: tools.length });

      return { tools };
    } catch (error: any) {
      logger.error('Error listing tools', { error: error.message });
      throw error;
    }
  });

  // Tool call handler
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.setRequestHandler(CallToolRequestSchema, (async (request: any, _extra: any) => {
    try {
      const { name, arguments: args } = request.params;
      logger.debug('Tool called', { toolName: name, args });

      const result = await handleToolCall(name, args || {});
      logger.debug('Tool completed', { toolName: name, hasError: result.isError });

      return result;
    } catch (error: any) {
      logger.error('Error calling tool', { error: error.message, stack: error.stack });

      return {
        content: [{
          type: 'text',
          text: `Tool execution failed: ${error.message}`
        }],
        isError: true,
      };
    }
  }) as any);

  // Cleanup handler
  server.onclose = () => {
    logger.debug('Server closing');
    clearServerRef();
  };

  logger.debug('MCP server created');

  return server;
}
