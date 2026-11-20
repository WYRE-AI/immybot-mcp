import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler } from '../utils/types.js';
import { statusHandler } from './status.js';
import { computersHandler } from './computers.js';
import { softwareHandler } from './software.js';
import { deploymentsHandler } from './deployments.js';
import { scriptsHandler } from './scripts.js';
import { tenantsHandler } from './tenants.js';
import { maintenanceSessionsHandler } from './maintenance_sessions.js';
import { tasksHandler } from './tasks.js';

/**
 * Flat tool registry. Every tool is listed on every `tools/list`, with no
 * per-session navigation state, and calls route by tool name.
 */
const HANDLERS: DomainHandler[] = [
  statusHandler,
  computersHandler,
  softwareHandler,
  deploymentsHandler,
  scriptsHandler,
  tenantsHandler,
  maintenanceSessionsHandler,
  tasksHandler,
];

/** All tools across every domain. */
export function getAllTools(): Tool[] {
  return HANDLERS.flatMap((handler) => handler.getTools());
}

/** The handler that lists `toolName`, or undefined if none does. */
export function getHandlerForTool(toolName: string): DomainHandler | undefined {
  return HANDLERS.find((handler) => handler.getTools().some((tool) => tool.name === toolName));
}

/**
 * Handle a tool call by routing to the handler that lists the tool.
 */
export async function handleToolCall(toolName: string, args: Record<string, unknown>) {
  const handler = getHandlerForTool(toolName);
  if (!handler) {
    return {
      content: [{ type: 'text' as const, text: `Unknown tool: ${toolName}` }],
      isError: true,
    };
  }
  return handler.handleCall(toolName, args);
}
