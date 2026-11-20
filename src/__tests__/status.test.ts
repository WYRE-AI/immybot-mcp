import { describe, it, expect } from 'vitest';
import { statusHandler } from '../domains/status.js';

describe('Status Handler', () => {
  it('exposes only the status tool', () => {
    expect(statusHandler.getTools().map((t) => t.name)).toEqual(['immybot_status']);
  });

  it('lists every tool group and tells callers to call tools directly', async () => {
    const result = await statusHandler.handleCall('immybot_status', {});
    const text = (result.content[0] as { type: 'text'; text: string }).text;

    expect(result.isError).toBeUndefined();
    for (const domain of ['computers', 'software', 'deployments', 'scripts', 'tenants', 'maintenance_sessions', 'tasks']) {
      expect(text).toContain(`immybot_${domain}_*`);
    }
    expect(text).not.toContain('immybot_navigate');
  });

  it('returns isError for an unknown tool name', async () => {
    const result = await statusHandler.handleCall('immybot_teleport', {});

    expect(result.isError).toBe(true);
    expect((result.content[0] as { type: 'text'; text: string }).text).toBe('Unknown tool: immybot_teleport');
  });
});
