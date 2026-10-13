/**
 * HTTP transport fail-closed auth (CWE-306).
 *
 * Startup requires a real CONDUIT_S2S_SECRET unless MCP_ALLOW_INSECURE_DEV=1.
 * Known placeholders refuse to start. The dev bypass binds 127.0.0.1 only.
 * /mcp rejects a missing or invalid X-Gateway-S2S header.
 * AUTH_MODE=gateway rejects requests that omit vendor credential headers
 * and must not fall back to IMMYBOT_* in process.env.
 */

import { createHmac } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runSpy = vi.hoisted(() => vi.fn());

vi.mock('../utils/client.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/client.js')>();
  return {
    ...actual,
    runWithCredentials: <T>(creds: Parameters<typeof actual.runWithCredentials>[0], fn: () => T): T => {
      runSpy(creds);
      return actual.runWithCredentials(creds, fn);
    },
  };
});

import { startHttpServer } from '../http.js';

const S2S_SECRET = 's2s-do-not-log-7f3a';
const ENV_SUBDOMAIN = 'env-subdomain-must-not-leak';
const ENV_TENANT = 'env-tenant-must-not-leak';
const ENV_CLIENT_ID = 'env-client-must-not-leak';
const ENV_CLIENT_SECRET = 'env-secret-must-not-leak';

const ENV_KEYS = [
  'CONDUIT_S2S_SECRET',
  'MCP_ALLOW_INSECURE_DEV',
  'MCP_HTTP_PORT',
  'MCP_HTTP_HOST',
  'AUTH_MODE',
  'IMMYBOT_INSTANCE_SUBDOMAIN',
  'IMMYBOT_TENANT_ID',
  'IMMYBOT_CLIENT_ID',
  'IMMYBOT_CLIENT_SECRET',
  'LOG_LEVEL',
  'MCP_TRANSPORT',
] as const;

const savedEnv = new Map<string, string | undefined>();
const servers: Server[] = [];

function mintS2sHeader(secret: string, unixSeconds = Math.floor(Date.now() / 1000)): string {
  const message = `t=${unixSeconds}`;
  const hex = createHmac('sha256', secret).update(message).digest('hex');
  return `${message},v1=${hex}`;
}

function captureStderr(): { text: () => string; restore: () => void } {
  const lines: string[] = [];
  const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    lines.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' '));
  });
  return {
    text: () => lines.join('\n'),
    restore: () => spy.mockRestore(),
  };
}

function exitSpy() {
  return vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`process.exit:${String(code)}`);
  }) as typeof process.exit);
}

interface HttpResult {
  status: number;
  body: string;
}

function sendHttp(options: {
  port: number;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const req = fetch(`http://127.0.0.1:${options.port}${options.path}`, {
      method: options.method,
      headers: options.headers,
      body: options.body,
    });
    req.then(async (res) => {
      resolve({ status: res.status, body: await res.text() });
    }).catch(reject);
  });
}

async function listen(): Promise<{ port: number; address: string; server: Server }> {
  const server = await startHttpServer();
  servers.push(server);
  const bound = server.address() as AddressInfo | null;
  if (!bound || typeof bound === 'string') {
    throw new Error('HTTP server did not bind a TCP port');
  }
  return { port: bound.port, address: bound.address, server };
}

function mcpHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    ...extra,
  };
}

const statusCall = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: { name: 'immybot_status', arguments: {} },
});

const headerCreds = {
  'x-immybot-instance-subdomain': 'header-subdomain',
  'x-immybot-tenant-id': 'header-tenant',
  'x-immybot-client-id': 'header-client-id',
  'x-immybot-client-secret': 'header-client-secret',
};

function assertNoSecrets(text: string): void {
  expect(text).not.toContain(S2S_SECRET);
  expect(text).not.toContain(ENV_SUBDOMAIN);
  expect(text).not.toContain(ENV_TENANT);
  expect(text).not.toContain(ENV_CLIENT_ID);
  expect(text).not.toContain(ENV_CLIENT_SECRET);
  expect(text).not.toContain('header-client-secret');
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    if (!savedEnv.has(key)) savedEnv.set(key, process.env[key]);
  }
  process.env.MCP_HTTP_PORT = '0';
  process.env.MCP_HTTP_HOST = '127.0.0.1';
  process.env.LOG_LEVEL = 'info';
  delete process.env.CONDUIT_S2S_SECRET;
  delete process.env.MCP_ALLOW_INSECURE_DEV;
  delete process.env.AUTH_MODE;
  delete process.env.IMMYBOT_INSTANCE_SUBDOMAIN;
  delete process.env.IMMYBOT_TENANT_ID;
  delete process.env.IMMYBOT_CLIENT_ID;
  delete process.env.IMMYBOT_CLIENT_SECRET;
  runSpy.mockReset();
});

afterEach(async () => {
  vi.restoreAllMocks();
  while (servers.length > 0) {
    const server = servers.pop();
    if (!server) continue;
    await new Promise<void>((resolve, reject) => {
      if (!server.listening) {
        resolve();
        return;
      }
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
  for (const key of ENV_KEYS) {
    const value = savedEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('HTTP startup', () => {
  it('refuses to start when CONDUIT_S2S_SECRET is empty', async () => {
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      await expect(startHttpServer()).rejects.toThrow('process.exit:1');
      expect(exit).toHaveBeenCalledWith(1);
      const text = logs.text();
      expect(text).toContain('Refusing to start HTTP transport');
      expect(text).toContain('CONDUIT_S2S_SECRET is empty');
      expect(text).toContain('MCP_ALLOW_INSECURE_DEV=1');
      assertNoSecrets(text);
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });

  it('refuses to start when CONDUIT_S2S_SECRET is whitespace', async () => {
    process.env.CONDUIT_S2S_SECRET = '   ';
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      await expect(startHttpServer()).rejects.toThrow('process.exit:1');
      expect(logs.text()).toContain('CONDUIT_S2S_SECRET is empty');
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });

  it('still refuses when MCP_ALLOW_INSECURE_DEV is not exactly 1', async () => {
    process.env.MCP_ALLOW_INSECURE_DEV = 'true';
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      await expect(startHttpServer()).rejects.toThrow('process.exit:1');
      expect(logs.text()).toContain('Refusing to start HTTP transport');
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });

  it.each(['changeme', 'replace-with-a-real-secret', '  Your-S2S-Secret  '])(
    'refuses known placeholder secret %j and does not log it',
    async (placeholder) => {
      process.env.CONDUIT_S2S_SECRET = placeholder;
      const logs = captureStderr();
      const exit = exitSpy();
      try {
        await expect(startHttpServer()).rejects.toThrow('process.exit:1');
        expect(exit).toHaveBeenCalledWith(1);
        const text = logs.text();
        expect(text).toContain('known placeholder');
        expect(text).toContain('openssl rand -hex 32');
        expect(text).not.toContain(placeholder.trim());
        expect(text).not.toContain('Your-S2S-Secret');
        assertNoSecrets(text);
      } finally {
        exit.mockRestore();
        logs.restore();
      }
    },
  );

  it('refuses a placeholder even when MCP_ALLOW_INSECURE_DEV=1', async () => {
    process.env.CONDUIT_S2S_SECRET = 'changeme';
    process.env.MCP_ALLOW_INSECURE_DEV = '1';
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      await expect(startHttpServer()).rejects.toThrow('process.exit:1');
      const text = logs.text();
      expect(text).toContain('known placeholder');
      expect(text).not.toContain('SECURITY WARNING');
      expect(text).not.toContain('changeme');
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });

  it('allows startup with a warning when MCP_ALLOW_INSECURE_DEV=1 and binds 127.0.0.1', async () => {
    process.env.MCP_ALLOW_INSECURE_DEV = '1';
    delete process.env.MCP_HTTP_HOST;
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      const server = await listen();
      expect(exit).not.toHaveBeenCalled();
      expect(server.address).toBe('127.0.0.1');
      const text = logs.text();
      expect(text).toContain('SECURITY WARNING');
      expect(text).toContain('CONDUIT_S2S_SECRET');
      expect(text).toContain('MCP_ALLOW_INSECURE_DEV');
      expect(text).toContain('127.0.0.1');
      assertNoSecrets(text);
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });

  it('forces 127.0.0.1 when the dev bypass host is localhost', async () => {
    process.env.MCP_ALLOW_INSECURE_DEV = '1';
    process.env.MCP_HTTP_HOST = 'localhost';
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      const server = await listen();
      expect(exit).not.toHaveBeenCalled();
      expect(server.address).toBe('127.0.0.1');
      expect(logs.text()).toContain('SECURITY WARNING');
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });

  it.each(['0.0.0.0', '10.1.2.3'])(
    'refuses the dev bypass when MCP_HTTP_HOST is %s',
    async (host) => {
      process.env.MCP_ALLOW_INSECURE_DEV = '1';
      process.env.MCP_HTTP_HOST = host;
      const logs = captureStderr();
      const exit = exitSpy();
      try {
        await expect(startHttpServer()).rejects.toThrow('process.exit:1');
        expect(exit).toHaveBeenCalledWith(1);
        const text = logs.text();
        expect(text).toContain('Refusing to start HTTP transport');
        expect(text).toContain('MCP_ALLOW_INSECURE_DEV');
        expect(text).toContain('127.0.0.1');
        expect(text).toContain(`MCP_HTTP_HOST=${host}`);
        expect(text).toContain('not loopback');
        assertNoSecrets(text);
      } finally {
        exit.mockRestore();
        logs.restore();
      }
    },
  );

  it('honors a non-loopback MCP_HTTP_HOST when CONDUIT_S2S_SECRET is set', async () => {
    process.env.CONDUIT_S2S_SECRET = S2S_SECRET;
    process.env.MCP_HTTP_HOST = '0.0.0.0';
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      const server = await listen();
      expect(exit).not.toHaveBeenCalled();
      expect(server.address).toBe('0.0.0.0');
      expect(logs.text()).not.toContain('not loopback');
      assertNoSecrets(logs.text());
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });

  it('binds 0.0.0.0 when a secret is set and MCP_HTTP_HOST is unset', async () => {
    process.env.CONDUIT_S2S_SECRET = S2S_SECRET;
    delete process.env.MCP_HTTP_HOST;
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      const server = await listen();
      expect(exit).not.toHaveBeenCalled();
      expect(server.address).toBe('0.0.0.0');
      assertNoSecrets(logs.text());
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });
});

describe('HTTP /mcp authentication', () => {
  beforeEach(() => {
    process.env.CONDUIT_S2S_SECRET = S2S_SECRET;
    process.env.AUTH_MODE = 'gateway';
    process.env.IMMYBOT_INSTANCE_SUBDOMAIN = ENV_SUBDOMAIN;
    process.env.IMMYBOT_TENANT_ID = ENV_TENANT;
    process.env.IMMYBOT_CLIENT_ID = ENV_CLIENT_ID;
    process.env.IMMYBOT_CLIENT_SECRET = ENV_CLIENT_SECRET;
  });

  it('returns 401 when the S2S header is missing or invalid and does not log the secret', async () => {
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      const server = await listen();
      const missing = await sendHttp({
        port: server.port,
        method: 'POST',
        path: '/mcp',
        headers: mcpHeaders(headerCreds),
        body: statusCall,
      });
      const invalid = await sendHttp({
        port: server.port,
        method: 'POST',
        path: '/mcp',
        headers: mcpHeaders({ ...headerCreds, 'x-gateway-s2s': mintS2sHeader('wrong-secret') }),
        body: statusCall,
      });

      expect(missing.status).toBe(401);
      expect(invalid.status).toBe(401);
      expect(missing.body).toContain('X-Gateway-S2S');
      expect(invalid.body).toContain('X-Gateway-S2S');
      assertNoSecrets(missing.body);
      assertNoSecrets(invalid.body);
      assertNoSecrets(logs.text());
      expect(runSpy).not.toHaveBeenCalled();
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });

  it('returns 401 in gateway mode without credential headers and does not use env credentials', async () => {
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      const server = await listen();
      const response = await sendHttp({
        port: server.port,
        method: 'POST',
        path: '/mcp',
        headers: mcpHeaders({ 'x-gateway-s2s': mintS2sHeader(S2S_SECRET) }),
        body: statusCall,
      });

      expect(response.status).toBe(401);
      expect(response.body).toContain('missing required gateway credential headers');
      expect(response.body).toContain('x-immybot-instance-subdomain');
      expect(response.body).toContain('x-immybot-client-secret');
      assertNoSecrets(response.body);
      assertNoSecrets(logs.text());
      expect(runSpy).not.toHaveBeenCalled();

      const partial = await sendHttp({
        port: server.port,
        method: 'POST',
        path: '/mcp',
        headers: mcpHeaders({
          'x-gateway-s2s': mintS2sHeader(S2S_SECRET),
          'x-immybot-instance-subdomain': 'header-subdomain',
          'x-immybot-tenant-id': 'header-tenant',
          'x-immybot-client-id': 'header-client-id',
        }),
        body: statusCall,
      });
      expect(partial.status).toBe(401);
      expect(runSpy).not.toHaveBeenCalled();
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });

  it('accepts a valid S2S header plus credential headers and uses those credentials', async () => {
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      const server = await listen();
      const response = await sendHttp({
        port: server.port,
        method: 'POST',
        path: '/mcp',
        headers: mcpHeaders({
          'x-gateway-s2s': mintS2sHeader(S2S_SECRET),
          ...headerCreds,
        }),
        body: statusCall,
      });

      expect(response.status).toBe(200);
      assertNoSecrets(response.body);
      const payload = JSON.parse(response.body) as {
        result?: { content?: Array<{ text?: string }> };
      };
      const text = payload.result?.content?.[0]?.text ?? '';
      expect(text).toContain('Main Navigation');
      expect(runSpy).toHaveBeenCalledWith({
        instanceSubdomain: 'header-subdomain',
        tenantId: 'header-tenant',
        clientId: 'header-client-id',
        clientSecret: 'header-client-secret',
      });
      assertNoSecrets(logs.text());
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });

  it('serves /health without authentication and without reading credentials', async () => {
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      const server = await listen();
      const response = await sendHttp({
        port: server.port,
        method: 'GET',
        path: '/health',
      });
      expect(response.status).toBe(200);
      const body = JSON.parse(response.body) as { status?: string };
      expect(body.status).toBe('healthy');
      assertNoSecrets(response.body);
      expect(runSpy).not.toHaveBeenCalled();
      assertNoSecrets(logs.text());
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });

  it('still requires gateway credential headers when the dev bypass skips S2S', async () => {
    delete process.env.CONDUIT_S2S_SECRET;
    process.env.MCP_ALLOW_INSECURE_DEV = '1';
    process.env.MCP_HTTP_HOST = '127.0.0.1';
    const logs = captureStderr();
    const exit = exitSpy();
    try {
      const server = await listen();
      expect(server.address).toBe('127.0.0.1');
      const missing = await sendHttp({
        port: server.port,
        method: 'POST',
        path: '/mcp',
        headers: mcpHeaders(),
        body: statusCall,
      });
      expect(missing.status).toBe(401);
      expect(missing.body).toContain('x-immybot-client-id');
      expect(runSpy).not.toHaveBeenCalled();

      const accepted = await sendHttp({
        port: server.port,
        method: 'POST',
        path: '/mcp',
        headers: mcpHeaders(headerCreds),
        body: statusCall,
      });
      expect(accepted.status).toBe(200);
      expect(runSpy).toHaveBeenCalledTimes(1);
    } finally {
      exit.mockRestore();
      logs.restore();
    }
  });
});
