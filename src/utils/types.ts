import type { Tool, CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

/**
 * Result from a tool call
 */
export interface CallToolResult {
  content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }>;
  isError?: boolean;
}

/**
 * Extra data for request handlers
 */
export interface RequestHandlerExtra {
  userId?: string;
  connectionId?: string;
  headers?: Record<string, string>;
}

/**
 * Domain handler interface for organizing tools by functionality
 */
export interface DomainHandler {
  getTools(): Tool[];
  handleCall(
    toolName: string,
    args: Record<string, unknown>,
    extra?: RequestHandlerExtra
  ): Promise<CallToolResult>;
}
