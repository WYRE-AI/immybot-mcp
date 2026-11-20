import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { DomainHandler, CallToolResult } from '../utils/types.js';

/**
 * Status tool. Every domain tool is listed up front, so there is no menu to
 * navigate: Conduit suppresses decision-tree tools (`_navigate` / `_back`)
 * and would leave the domain tools unreachable behind them.
 */

const STATUS_TOOL = 'immybot_status';

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  computers: 'Device and endpoint management',
  software: 'Application and package management',
  deployments: 'Software deployment configuration',
  scripts: 'PowerShell script execution and management',
  tenants: 'Client organization management',
  maintenance_sessions: 'Device maintenance and state reconciliation',
  tasks: 'Background operation monitoring',
};

function getTools(): Tool[] {
  return [
    {
      name: STATUS_TOOL,
      description: 'Show the ImmyBot tool groups. Every tool is listed and callable directly.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];
}

async function handleCall(toolName: string): Promise<CallToolResult> {
  if (toolName !== STATUS_TOOL) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
      isError: true,
    };
  }

  const groups = Object.entries(DOMAIN_DESCRIPTIONS)
    .map(([domain, description]) => `• ${domain} (immybot_${domain}_*) - ${description}`)
    .join('\n');

  return {
    content: [{
      type: 'text',
      text: `ImmyBot tools are all listed up front; call them directly by name.\n\nTool groups:\n${groups}`,
    }],
  };
}

export const statusHandler: DomainHandler = {
  getTools,
  handleCall,
};
