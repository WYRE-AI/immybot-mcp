import { describe, it, expect } from 'vitest';
import { getAllTools, getHandlerForTool, handleToolCall } from '../domains/index.js';

// Conduit suppresses decision-tree tools and cannot reach anything behind them,
// so the full surface must be listed on a fresh session.
describe('tool surface', () => {
  const names = getAllTools().map((t) => t.name);

  it('lists all 65 domain tools plus immybot_status', () => {
    expect(names).toHaveLength(66);
    expect(names).toContain('immybot_status');
    expect(names).toContain('immybot_computers_list');
    expect(names).toContain('immybot_tasks_get');
  });

  it('has no navigate/back tools', () => {
    expect(names.filter((n) => /_(navigate|back)$/.test(n))).toEqual([]);
  });

  it('has no duplicate names', () => {
    expect(new Set(names).size).toBe(names.length);
  });

  it('routes every listed tool to a handler', () => {
    for (const name of names) {
      expect(getHandlerForTool(name), name).toBeDefined();
    }
  });

  it('returns isError for an unknown tool, including the removed navigate tool', async () => {
    for (const name of ['immybot_navigate', 'immybot_back', 'immybot_nope']) {
      const result = await handleToolCall(name, {});
      expect(result.isError).toBe(true);
    }
  });
});
