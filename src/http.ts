import { createServer as createNodeHttpServer, type Server as HttpServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import type { AddressInfo } from 'node:net';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './server.js';
import { runWithCredentials, type Credentials } from './utils/client.js';
import { logger } from './utils/logger.js';
import { verifyS2sHeader, S2S_HEADER } from './s2s-verify.js';

/**
 * HTTP transport for MCP server.
 * Creates per-request server instances for stateless operation (required for gateway mode).
 *
 * HTTP startup fails closed. An empty CONDUIT_S2S_SECRET refuses to boot unless
 * MCP_ALLOW_INSECURE_DEV=1, and that bypass binds 127.0.0.1 only. A known
 * placeholder secret always refuses to start. When a real secret is set, every
 * /mcp request must carry a valid X-Gateway-S2S header, and MCP_HTTP_HOST is
 * honored (unset binds 0.0.0.0, the previous listen(port) behavior). The secret
 * value is never logged.
 */

/** Public example values. A copied placeholder must not verify as a real secret. */
const KNOWN_PLACEHOLDER_SECRETS = new Set([
  'replace-with-a-real-secret',
  'your-s2s-secret',
  'your-secret',
  'changeme',
  'change-me',
  'placeholder',
  'secret',
  'example',
  'replace-me',
  's2s-secret',
]);

const LOOPBACK_HOST = '127.0.0.1';

const MISSING_S2S_SECRET_ERROR =
  'Refusing to start HTTP transport: CONDUIT_S2S_SECRET is empty. ' +
  'Set CONDUIT_S2S_SECRET to the gateway-provisioned secret (openssl rand -hex 32), ' +
  'or set MCP_ALLOW_INSECURE_DEV=1 for local development only.';

const PLACEHOLDER_S2S_SECRET_ERROR =
  'Refusing to start HTTP transport: CONDUIT_S2S_SECRET is a known placeholder. ' +
  'Generate a secret with `openssl rand -hex 32` and set CONDUIT_S2S_SECRET to that value. ' +
  'MCP_ALLOW_INSECURE_DEV does not apply while a placeholder is set.';

const INSECURE_DEV_WARNING =
  'SECURITY WARNING: CONDUIT_S2S_SECRET is empty and MCP_ALLOW_INSECURE_DEV=1. ' +
  'HTTP /mcp is not enforcing X-Gateway-S2S and is bound to 127.0.0.1 only. ' +
  'Do not use this outside local development.';

const S2S_UNAUTHORIZED = {
  error: 'Missing or invalid X-Gateway-S2S header: this endpoint only accepts requests signed by the gateway.',
};

const GATEWAY_CREDENTIALS_UNAUTHORIZED = {
  error:
    'Unauthorized: missing required gateway credential headers ' +
    'x-immybot-instance-subdomain, x-immybot-tenant-id, x-immybot-client-id, and x-immybot-client-secret',
};

function headerValue(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase().replace(/^\[(.+)\]$/, '$1');
  if (normalized === 'localhost' || normalized === '::1') return true;
  const bare = normalized.startsWith('::ffff:') ? normalized.slice('::ffff:'.length) : normalized;
  const parts = bare.split('.');
  if (parts.length !== 4) return false;
  if (parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return false;
  return parts[0] === '127';
}

/**
 * Secret for X-Gateway-S2S on /mcp. Read at HTTP startup, not module load.
 * Empty is fail-closed: the process exits unless MCP_ALLOW_INSECURE_DEV=1.
 * A known placeholder always exits, including when the dev flag is set.
 * The secret value is never written to logs.
 */
function resolveHttpS2sSecret(): string {
  const secret = (process.env.CONDUIT_S2S_SECRET ?? '').trim();
  if (secret && KNOWN_PLACEHOLDER_SECRETS.has(secret.toLowerCase())) {
    logger.error(PLACEHOLDER_S2S_SECRET_ERROR);
    process.exit(1);
  }
  if (secret) return secret;

  if (process.env.MCP_ALLOW_INSECURE_DEV === '1') {
    // error level so LOG_LEVEL=warn|error cannot hide the bypass.
    logger.error(INSECURE_DEV_WARNING);
    return '';
  }

  logger.error(MISSING_S2S_SECRET_ERROR);
  process.exit(1);
}

/**
 * No secret (the insecure-dev bypass) always binds 127.0.0.1. A non-loopback
 * MCP_HTTP_HOST refuses to start. A configured secret honors MCP_HTTP_HOST,
 * and an unset host stays 0.0.0.0 so container deploys keep the previous
 * listen(port) behavior.
 */
function resolveListenHost(s2sSecret: string): string {
  const configured = (process.env.MCP_HTTP_HOST ?? '').trim();
  if (!s2sSecret) {
    if (configured && !isLoopbackHost(configured)) {
      logger.error(
        'Refusing to start HTTP transport: MCP_ALLOW_INSECURE_DEV=1 without CONDUIT_S2S_SECRET ' +
          `only binds ${LOOPBACK_HOST}. MCP_HTTP_HOST=${configured} is not loopback. ` +
          `Unset MCP_HTTP_HOST or set it to ${LOOPBACK_HOST}.`,
      );
      process.exit(1);
    }
    return LOOPBACK_HOST;
  }
  return configured || '0.0.0.0';
}

/**
 * Extract gateway-injected credentials from headers. Returns null if any
 * required header is missing — does NOT mutate process.env; credentials are
 * bound per-request via AsyncLocalStorage in handleMcpRequest below.
 */
function extractCredentialsFromHeaders(req: IncomingMessage): Credentials | null {
  const instanceSubdomain = headerValue(req.headers['x-immybot-instance-subdomain']);
  const tenantId = headerValue(req.headers['x-immybot-tenant-id']);
  const clientId = headerValue(req.headers['x-immybot-client-id']);
  const clientSecret = headerValue(req.headers['x-immybot-client-secret']);

  logger.debug('Extracted credentials from headers', {
    hasInstanceSubdomain: !!instanceSubdomain,
    hasTenantId: !!tenantId,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
  });

  if (!instanceSubdomain || !tenantId || !clientId || !clientSecret) {
    return null;
  }
  return { instanceSubdomain, tenantId, clientId, clientSecret };
}

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // Create fresh server and transport per request (CRITICAL for gateway mode)
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // STATELESS
      enableJsonResponse: true,
    });

    // Clean up when response finishes
    res.on('close', () => {
      logger.debug('Response closed, cleaning up');
      transport.close();
      server.close();
    });

    // Connect server to transport and handle request
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error('MCP transport error', { error: message, stack });

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: message,
        },
        id: null
      }));
    }
  }
}

async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  logger.debug('MCP request received', {
    method: req.method,
    url: req.url,
    headers: Object.keys(req.headers || {}),
  });

  // Gateway mode: credentials must arrive on every request via the
  // x-immybot-* headers. Reject explicitly if any are missing rather than
  // falling through — falling through would resolve credentials from the
  // process environment, which is not request-scoped (CWE-306).
  if (process.env.AUTH_MODE === 'gateway') {
    const creds = extractCredentialsFromHeaders(req);
    if (!creds) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(GATEWAY_CREDENTIALS_UNAUTHORIZED));
      return;
    }
    await runWithCredentials(creds, () => handleMcp(req, res));
    return;
  }

  await handleMcp(req, res);
}

function createHttpServer(s2sSecret: string): HttpServer {
  const server = createNodeHttpServer(async (req, res) => {
    // CORS headers for browser clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-gateway-s2s, x-immybot-instance-subdomain, x-immybot-tenant-id, x-immybot-client-id, x-immybot-client-secret',
    );

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/mcp') {
      // Conduit service-to-service auth (gateway#377 parity): rejected
      // BEFORE any credential extraction, mirroring every other ported
      // wrapper (e.g. containers/sentinelone-mcp/gateway_wrapper.py).
      // Empty s2sSecret is only reachable when MCP_ALLOW_INSECURE_DEV=1;
      // startup refuses otherwise. A configured secret is always enforced.
      if (s2sSecret && !verifyS2sHeader(headerValue(req.headers[S2S_HEADER]), s2sSecret)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(S2S_UNAUTHORIZED));
        return;
      }
      await handleMcpRequest(req, res);
    } else if (req.method === 'GET' && req.url === '/health') {
      // Health check endpoint. Unauthenticated liveness only — do not read
      // vendor credentials. Gateway mode has none at the process level.
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        service: 'immybot-mcp',
        timestamp: new Date().toISOString(),
      }));
    } else {
      // Not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Not found',
        message: 'POST /mcp for MCP protocol, GET /health for health check',
      }));
    }
  });

  server.on('error', (error) => {
    logger.error('HTTP server error', { error: error.message });
  });

  return server;
}

/**
 * Resolve S2S auth, bind an explicit host, and listen.
 * Refuses to start when CONDUIT_S2S_SECRET is empty or a known placeholder,
 * unless MCP_ALLOW_INSECURE_DEV=1 (loopback only).
 */
export async function startHttpServer(): Promise<HttpServer> {
  const s2sSecret = resolveHttpS2sSecret();
  const host = resolveListenHost(s2sSecret);
  const port = parseInt(process.env.MCP_HTTP_PORT || '8080', 10);
  const httpServer = createHttpServer(s2sSecret);

  return new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, () => {
      const bound = httpServer.address() as AddressInfo | null;
      const boundPort = bound && typeof bound !== 'string' ? bound.port : port;
      logger.info('HTTP server listening', { host, port: boundPort, endpoint: '/mcp' });
      resolve(httpServer);
    });
  });
}
