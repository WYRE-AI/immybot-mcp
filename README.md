# @wyre-ai/immybot-mcp

MCP server for ImmyBot - Windows endpoint management and software deployment automation.

## Features

- 🔐 **OAuth 2.0 Authentication** - Microsoft Entra ID client credentials
- 🏢 **Multi-tenant Support** - Per-instance subdomain configuration  
- 🧭 **Decision Tree Navigation** - Organized tool discovery by domain
- 💻 **Comprehensive Coverage** - Computers, software, deployments, scripts, tenants, maintenance sessions, tasks
- ⚡ **Gateway Ready** - Stateless per-request operation for WYRE MCP Gateway
- 🚀 **Docker Deployment** - Container-ready with health checks
- 📊 **Structured Logging** - Detailed operation tracking

## Quick Start

### Docker (Recommended)

The image listens on `0.0.0.0` inside the container and defaults to `AUTH_MODE=gateway`. Publish the port on loopback and pass a real `CONDUIT_S2S_SECRET`. In gateway mode, ImmyBot credentials arrive on each request as headers; they are not read from the environment.

```bash
docker run -d \
  --name immybot-mcp \
  -p 127.0.0.1:8080:8080 \
  -e CONDUIT_S2S_SECRET \
  -e AUTH_MODE=gateway \
  -e MCP_TRANSPORT=http \
  -e MCP_HTTP_PORT=8080 \
  -e LOG_LEVEL=info \
  ghcr.io/wyre-ai/immybot-mcp:latest
```

Compose refuses to start when `CONDUIT_S2S_SECRET` is unset. The gateway service does not set `IMMYBOT_*` variables or `env_file`, so a project `.env` cannot inject static vendor credentials. It publishes `127.0.0.1:8080:8080`:

```bash
# openssl rand -hex 32 — do not use a placeholder such as changeme
CONDUIT_S2S_SECRET="$(openssl rand -hex 32)" docker compose up
```

### Direct Installation

```bash
npm install @wyre-ai/immybot-mcp
npx @wyre-ai/immybot-mcp
```

## Navigation

The server uses decision-tree navigation to organize tools by domain:

1. **Start** → `immybot_navigate` → Choose domain
2. **Domain tools** → Domain-specific operations  
3. **Return** → `immybot_back` → Main navigation

### Available Domains

- **computers** - Device and endpoint management
- **software** - Application and package management  
- **deployments** - Software deployment configuration
- **scripts** - PowerShell script execution and management
- **tenants** - Client organization management
- **maintenance_sessions** - Device maintenance and state reconciliation
- **tasks** - Background operation monitoring

## Authentication

ImmyBot uses OAuth 2.0 with Microsoft Entra ID:

### Required Configuration

| Field | Description | Example |
|-------|-------------|---------|
| `instanceSubdomain` | ImmyBot instance subdomain | `acmemsp` |
| `tenantId` | Microsoft Entra tenant ID | `12345678-1234-1234-1234-123456789abc` |
| `clientId` | Application (client) ID | `87654321-4321-4321-4321-cba987654321` |
| `clientSecret` | Client secret value | `your-client-secret` |

### Setup Steps

1. **Register Enterprise Application** in Microsoft Entra ID
2. **Grant ImmyBot API permissions** to the application
3. **Create client secret** for the application  
4. **Configure application** in ImmyBot settings

OAuth scope: `api://{client_id}/.default`

## Usage Examples

### 1. Navigate to Computers Domain

```javascript
// Start navigation
await callTool('immybot_navigate', { domain: 'computers' });

// List computers
await callTool('immybot_computers_list', { 
  tenantId: 1,
  isOnline: true 
});

// Get computer details
await callTool('immybot_computers_get', { computerId: 123 });
```

### 2. Software Management

```javascript
// Navigate to software domain
await callTool('immybot_navigate', { domain: 'software' });

// Search for software
await callTool('immybot_software_search', { query: 'Chrome' });

// Install software (stages for maintenance session)
await callTool('immybot_software_install', {
  softwareId: 456,
  computerIds: [123, 124, 125],
  autoUpdate: true
});
```

### 3. Maintenance Sessions

```javascript
// Navigate to maintenance sessions
await callTool('immybot_navigate', { domain: 'maintenance_sessions' });

// Start maintenance session (reconciles deployments)
await callTool('immybot_maintenance_sessions_start', {
  computerId: 123,
  sessionType: 'Manual'
});

// Check session status
await callTool('immybot_maintenance_sessions_get', { sessionId: 789 });
```

## Two-Step Deployment Model

⚠️ **Important**: ImmyBot uses a two-step deployment workflow:

1. **Configure desired state** - Software installations create deployments
2. **Reconcile via maintenance session** - Sessions apply the desired state

```javascript
// Step 1: Stage software installation
await callTool('immybot_software_install', {
  softwareId: 123,
  computerIds: [456]
});
// ↑ This creates a deployment, does NOT install immediately

// Step 2: Reconcile state
await callTool('immybot_maintenance_sessions_start', {
  computerId: 456
});
// ↑ This runs the maintenance session to actually install software
```

## Environment Variables

Copy [`.env.example`](.env.example) and set the variables below.

### Gateway Mode (Docker)

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_MODE` | `direct` | Set to `gateway` for WYRE MCP Gateway. Gateway mode requires the four `x-immybot-*` credential headers on each `/mcp` request and never falls back to `IMMYBOT_*`. The Docker image and Compose default to `gateway`. |
| `MCP_TRANSPORT` | `stdio` | Transport mode (`http` or `stdio`) |
| `MCP_HTTP_PORT` | `8080` | HTTP server port |
| `MCP_HTTP_HOST` | `0.0.0.0` when a real `CONDUIT_S2S_SECRET` is set and this is unset; `127.0.0.1` for the insecure-dev bypass | Bind address. A configured secret honors this value, including `0.0.0.0`, so container deploys stay reachable. The image and Compose set `0.0.0.0`. |
| `CONDUIT_S2S_SECRET` | — | Required for HTTP. HMAC secret checked against `X-Gateway-S2S` on `/mcp`. Generate with `openssl rand -hex 32`. If empty or a known placeholder, the HTTP server logs an error and exits non-zero. The value is never logged. |
| `MCP_ALLOW_INSECURE_DEV` | unset | Set to exactly `1` to start HTTP without `CONDUIT_S2S_SECRET`. Logs a warning, does not enforce `X-Gateway-S2S`, and binds `127.0.0.1` only. A non-loopback `MCP_HTTP_HOST` refuses to start. A placeholder secret still refuses to start. Local development only. |
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) |

`/health` stays unauthenticated and does not read credentials. The stdio transport does not use `CONDUIT_S2S_SECRET`.

### Direct Mode (CLI)

| Variable | Required | Description |
|----------|----------|-------------|
| `IMMYBOT_INSTANCE_SUBDOMAIN` | ✅ | ImmyBot instance subdomain |
| `IMMYBOT_TENANT_ID` | ✅ | Microsoft Entra tenant ID |
| `IMMYBOT_CLIENT_ID` | ✅ | Application client ID |
| `IMMYBOT_CLIENT_SECRET` | ✅ | Client secret |

### HTTP authentication

With `MCP_TRANSPORT=http` and `CONDUIT_S2S_SECRET` set, every `/mcp` request must include `X-Gateway-S2S`. The check is `verifyS2sHeader` in [`src/s2s-verify.ts`](src/s2s-verify.ts): the header value is `t=<unix seconds>,v1=<hex>`, where the hex is HMAC-SHA256 of the literal string `t=<unix seconds>` keyed with `CONDUIT_S2S_SECRET` (64 lowercase hex characters). The timestamp must be within 300 seconds of the server clock. A missing or invalid header is HTTP 401, before vendor credentials are read.

```bash
TS=$(date +%s)
SIG=$(printf 't=%s' "$TS" | openssl dgst -sha256 -hmac "$CONDUIT_S2S_SECRET" -hex | awk '{print $NF}')
curl -sS http://127.0.0.1:8080/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "X-Gateway-S2S: t=${TS},v1=${SIG}" \
  -H 'X-ImmyBot-Instance-Subdomain: acmemsp' \
  -H 'X-ImmyBot-Tenant-Id: 12345678-1234-1234-1234-123456789abc' \
  -H 'X-ImmyBot-Client-Id: 87654321-4321-4321-4321-cba987654321' \
  -H 'X-ImmyBot-Client-Secret: your-client-secret' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

In `AUTH_MODE=gateway`, those four `X-ImmyBot-*` headers are required. A request missing any of them gets HTTP 401 and does not fall back to `IMMYBOT_*` in the process environment. Direct mode (`AUTH_MODE` unset) still requires a valid `X-Gateway-S2S` header, then uses the `IMMYBOT_*` environment variables. Direct mode does not read the `X-ImmyBot-*` headers.

Local HTTP without a secret is development-only. It binds `127.0.0.1` and logs a warning. A non-loopback `MCP_HTTP_HOST` (including the image default `0.0.0.0`) makes startup exit. Do not publish that port off loopback.

```bash
MCP_TRANSPORT=http MCP_ALLOW_INSECURE_DEV=1 npm start
```

## Tools Reference

### Navigation Tools

| Tool | Description |
|------|-------------|
| `immybot_navigate` | Navigate to domain |
| `immybot_status` | Show current state |
| `immybot_back` | Return to main menu |

### Computers Tools

| Tool | Description |
|------|-------------|
| `immybot_computers_list` | List computers with filtering |
| `immybot_computers_get` | Get computer details |
| `immybot_computers_search` | Search computers by name |
| `immybot_computers_inventory` | Get hardware/software inventory |
| `immybot_computers_create` | Create computer record |
| `immybot_computers_deployments` | List computer deployments |
| `immybot_computers_trigger_checkin` | Force agent check-in |

### Software Tools

| Tool | Description |
|------|-------------|
| `immybot_software_list_global` | List global software packages |
| `immybot_software_list` | List all software (global + tenant) |
| `immybot_software_get` | Get software details |
| `immybot_software_search` | Search software by name |
| `immybot_software_versions` | List software versions |
| `immybot_software_latest_version` | Get latest version |
| `immybot_software_categories` | List categories |
| `immybot_software_publishers` | List publishers |
| `immybot_software_install` | Stage software installation |
| `immybot_software_stats` | Get installation statistics |

## Error Handling

The server provides structured error responses:

```json
{
  "content": [{"type": "text", "text": "Error: Authentication failed"}],
  "isError": true
}
```

Common error types:
- **Authentication errors** - Invalid credentials or expired tokens
- **Not found errors** - Resource doesn't exist  
- **Validation errors** - Missing or invalid parameters
- **Rate limit errors** - Too many requests
- **Server errors** - Internal ImmyBot API issues

## Development

### Build from Source

```bash
git clone https://github.com/WYRE-AI/immybot-mcp.git
cd immybot-mcp
npm install
npm run build
npm start
```

### Testing

```bash
npm test
```

### Docker Build

```bash
docker build -t immybot-mcp --secret id=npmrc,src=$HOME/.npmrc .
```

The checked-in Compose file is gateway mode. It requires `CONDUIT_S2S_SECRET` and does not pass static `IMMYBOT_*` credentials.

## Support

- [ImmyBot API Documentation](https://docs.immy.bot/reference/api-documentation/)
- [Microsoft Entra App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [WYRE MCP Gateway](https://github.com/wyre-technology/mcp-gateway)

## License

Apache-2.0 - see [LICENSE](LICENSE) for details. 