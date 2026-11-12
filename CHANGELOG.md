## [Unreleased]

### Security

- Patched vulnerable npm dependencies reported by the Trivy image scan (including `proxy-addr`, `hono`, `qs`, `body-parser`, `ip-address`, `@modelcontextprotocol/sdk`).
- Container image: removed the unused npm CLI from the runtime stage and upgraded Alpine packages (zlib).

## [1.2.8](https://github.com/wyre-technology/immybot-mcp/compare/v1.2.7...v1.2.8) (2026-07-23)


### Bug Fixes

* **security:** request-scoped credentials via AsyncLocalStorage to close cross-tenant leak ([#45](https://github.com/wyre-technology/immybot-mcp/issues/45)) ([7abd5b0](https://github.com/wyre-technology/immybot-mcp/commit/7abd5b0fcaf4e07fde51d7289f71804fde1a1503))

## [1.2.7](https://github.com/wyre-technology/immybot-mcp/compare/v1.2.6...v1.2.7) (2026-07-21)


### Bug Fixes

* **deps:** re-pin typescript to ^6.0.3 (regressed again, root cause corrected) ([#43](https://github.com/wyre-technology/immybot-mcp/issues/43)) ([f3f2f14](https://github.com/wyre-technology/immybot-mcp/commit/f3f2f14c550fcbc5ba9db896e63b8223f1bf67b7)), closes [41/#39](https://github.com/wyre-technology/immybot-mcp/issues/39) [#42](https://github.com/wyre-technology/immybot-mcp/issues/42)

## [1.2.6](https://github.com/wyre-technology/immybot-mcp/compare/v1.2.5...v1.2.6) (2026-07-20)


### Bug Fixes

* **deps:** exclude dev-dependency majors from Dependabot auto-merge ([#41](https://github.com/wyre-technology/immybot-mcp/issues/41)) ([995135d](https://github.com/wyre-technology/immybot-mcp/commit/995135dacb8f47f1435b422053b6dd370b739d58))

## [1.2.5](https://github.com/wyre-technology/immybot-mcp/compare/v1.2.4...v1.2.5) (2026-07-20)


### Bug Fixes

* **deps:** re-pin typescript to ^6.0.3 (regressed by [#39](https://github.com/wyre-technology/immybot-mcp/issues/39)) ([#40](https://github.com/wyre-technology/immybot-mcp/issues/40)) ([38f575a](https://github.com/wyre-technology/immybot-mcp/commit/38f575a83241dcf49be233469f6b1bef5bb73784))

## [1.2.4](https://github.com/wyre-technology/immybot-mcp/compare/v1.2.3...v1.2.4) (2026-07-18)


### Bug Fixes

* **deps:** pin typescript back to ^6.0.3, unblock tsup DTS build ([#38](https://github.com/wyre-technology/immybot-mcp/issues/38)) ([6dc4e18](https://github.com/wyre-technology/immybot-mcp/commit/6dc4e18719e3e1225d36c75573ae9bbe076ac99f)), closes [35/blackpoint-mcp#39](https://github.com/35/blackpoint-mcp/issues/39)

## [1.2.3](https://github.com/wyre-technology/immybot-mcp/compare/v1.2.2...v1.2.3) (2026-05-30)


### Bug Fixes

* republish to MCP Registry with public container image ([#23](https://github.com/wyre-technology/immybot-mcp/issues/23)) ([acd2803](https://github.com/wyre-technology/immybot-mcp/commit/acd280318a7e705ad838b13746454c6ea8e6f036))

## [1.2.2](https://github.com/wyre-technology/immybot-mcp/compare/v1.2.1...v1.2.2) (2026-05-29)


### Bug Fixes

* **registry:** shorten server.json description to <=100 chars ([#22](https://github.com/wyre-technology/immybot-mcp/issues/22)) ([d485c8b](https://github.com/wyre-technology/immybot-mcp/commit/d485c8bba9f49ffca575fd062b92e83b3792afca))

## [1.2.1](https://github.com/wyre-technology/immybot-mcp/compare/v1.2.0...v1.2.1) (2026-05-29)


### Bug Fixes

* **ci:** stop semantic-release github comment step from failing release; add OCI label ([#21](https://github.com/wyre-technology/immybot-mcp/issues/21)) ([91c16a2](https://github.com/wyre-technology/immybot-mcp/commit/91c16a21ac118d39fd427d289adbbe25bae07c8f))

# [1.2.0](https://github.com/wyre-technology/immybot-mcp/compare/v1.1.0...v1.2.0) (2026-05-29)


### Features

* **ci:** publish to MCP Registry on release ([#20](https://github.com/wyre-technology/immybot-mcp/issues/20)) ([652e99c](https://github.com/wyre-technology/immybot-mcp/commit/652e99c1862d7fac28d44821c3f5a4f1469973d9))

# [1.1.0](https://github.com/wyre-technology/immybot-mcp/compare/v1.0.0...v1.1.0) (2026-05-22)


### Bug Fixes

* add extra parameter to setRequestHandler callbacks (MCP SDK v1.27.1) ([15ad127](https://github.com/wyre-technology/immybot-mcp/commit/15ad127230cf84e43f0082b2fb3b8b51a637ed4a))
* add type assertion for content[0].text access ([1a81d6d](https://github.com/wyre-technology/immybot-mcp/commit/1a81d6d3458abf7aca82d9b145f117dcca86097d))
* cast CallToolRequestSchema handler to any (MCP SDK v1.27.1 type mismatch) ([01070bf](https://github.com/wyre-technology/immybot-mcp/commit/01070bfd0a03e41711aeef86743b9a368581f693))
* cast node-immybot Tenant type to any for missing properties ([d66a163](https://github.com/wyre-technology/immybot-mcp/commit/d66a1630eedcd91dd4eb50137f115c9ff379c896))
* cast node-immybot types to any for missing properties ([2930870](https://github.com/wyre-technology/immybot-mcp/commit/293087049a4051ac81712b6bd551603107ba4be3))
* cast node-immybot types to any for missing properties ([4b04475](https://github.com/wyre-technology/immybot-mcp/commit/4b04475bac8cea4689fc46fc3db2866d0ac796c5))
* cast node-immybot types to any for missing properties ([4b31e9f](https://github.com/wyre-technology/immybot-mcp/commit/4b31e9f55333e1ea1a26bfa595b7a7e74e2b8878))
* cast start() argument to any for missing description property ([8122ec6](https://github.com/wyre-technology/immybot-mcp/commit/8122ec69f624e945dea4e71dc1888c6a409f6ca8))
* cast tenant search result to any[] for missing type properties ([ddf75ae](https://github.com/wyre-technology/immybot-mcp/commit/ddf75ae8add5bd753f8c8227850c157ca0180f28))
* correct Streamable HTTP transport import path ([#2](https://github.com/wyre-technology/immybot-mcp/issues/2)) ([deebff6](https://github.com/wyre-technology/immybot-mcp/commit/deebff62e26ec5e2b332802d2545f86a36eb4c57))
* ensure v1.0.0 release tag is in branch history for semantic-release ([3a39e9f](https://github.com/wyre-technology/immybot-mcp/commit/3a39e9f67151d889d440657efe75ca7cf9841d6d))
* narrow union type for content[0].text to satisfy TypeScript strict mode ([00855b5](https://github.com/wyre-technology/immybot-mcp/commit/00855b58680b5adea3520da60e75c86903bbf16f))
* use ListToolsRequestSchema/CallToolRequestSchema and request.params directly ([51f1a75](https://github.com/wyre-technology/immybot-mcp/commit/51f1a7596c98cdd486b43ac7155aaf6c6a93552d))
* use Record type for string-keyed domainDescriptions access ([7526dfa](https://github.com/wyre-technology/immybot-mcp/commit/7526dfa78e52f422398460e1effd903c0533e081))


### Features

* add server.json for MCP Registry publication ([#6](https://github.com/wyre-technology/immybot-mcp/issues/6)) ([00363c8](https://github.com/wyre-technology/immybot-mcp/commit/00363c86efe5c17e569683553b94e83ed4df307b))

# 1.0.0 (2026-05-22)


### Bug Fixes

* add extra parameter to setRequestHandler callbacks (MCP SDK v1.27.1) ([15ad127](https://github.com/wyre-technology/immybot-mcp/commit/15ad127230cf84e43f0082b2fb3b8b51a637ed4a))
* add type assertion for content[0].text access ([1a81d6d](https://github.com/wyre-technology/immybot-mcp/commit/1a81d6d3458abf7aca82d9b145f117dcca86097d))
* cast CallToolRequestSchema handler to any (MCP SDK v1.27.1 type mismatch) ([01070bf](https://github.com/wyre-technology/immybot-mcp/commit/01070bfd0a03e41711aeef86743b9a368581f693))
* cast node-immybot Tenant type to any for missing properties ([d66a163](https://github.com/wyre-technology/immybot-mcp/commit/d66a1630eedcd91dd4eb50137f115c9ff379c896))
* cast node-immybot types to any for missing properties ([2930870](https://github.com/wyre-technology/immybot-mcp/commit/293087049a4051ac81712b6bd551603107ba4be3))
* cast node-immybot types to any for missing properties ([4b04475](https://github.com/wyre-technology/immybot-mcp/commit/4b04475bac8cea4689fc46fc3db2866d0ac796c5))
* cast node-immybot types to any for missing properties ([4b31e9f](https://github.com/wyre-technology/immybot-mcp/commit/4b31e9f55333e1ea1a26bfa595b7a7e74e2b8878))
* cast start() argument to any for missing description property ([8122ec6](https://github.com/wyre-technology/immybot-mcp/commit/8122ec69f624e945dea4e71dc1888c6a409f6ca8))
* cast tenant search result to any[] for missing type properties ([ddf75ae](https://github.com/wyre-technology/immybot-mcp/commit/ddf75ae8add5bd753f8c8227850c157ca0180f28))
* correct Streamable HTTP transport import path ([#2](https://github.com/wyre-technology/immybot-mcp/issues/2)) ([deebff6](https://github.com/wyre-technology/immybot-mcp/commit/deebff62e26ec5e2b332802d2545f86a36eb4c57))
* narrow union type for content[0].text to satisfy TypeScript strict mode ([00855b5](https://github.com/wyre-technology/immybot-mcp/commit/00855b58680b5adea3520da60e75c86903bbf16f))
* use ListToolsRequestSchema/CallToolRequestSchema and request.params directly ([51f1a75](https://github.com/wyre-technology/immybot-mcp/commit/51f1a7596c98cdd486b43ac7155aaf6c6a93552d))
* use Record type for string-keyed domainDescriptions access ([7526dfa](https://github.com/wyre-technology/immybot-mcp/commit/7526dfa78e52f422398460e1effd903c0533e081))


### Features

* add server.json for MCP Registry publication ([#6](https://github.com/wyre-technology/immybot-mcp/issues/6)) ([00363c8](https://github.com/wyre-technology/immybot-mcp/commit/00363c86efe5c17e569683553b94e83ed4df307b))
* initial scaffold for immybot-mcp with full domain coverage ([6ff1fe3](https://github.com/wyre-technology/immybot-mcp/commit/6ff1fe3132acfadadf985feac06250244cd21dd1))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Corrected the Streamable HTTP transport import in `src/http.ts`. The code
  imported `StreamableHTTPServerTransport` from the non-existent
  `@modelcontextprotocol/sdk/server/http.js`, causing the container to crash on
  startup with `ERR_MODULE_NOT_FOUND`. It now imports from the correct
  `@modelcontextprotocol/sdk/server/streamableHttp.js` path.
- Bumped `@wyre-technology/node-immybot` dependency from `^0.1.0` to `^1.0.0` to
  match the published package version (the `^0.1.0` range no longer resolved).

### Added
- Initial release of ImmyBot MCP server
- OAuth 2.0 authentication with Microsoft Entra ID client credentials
- Decision-tree navigation for organized tool discovery
- Comprehensive ImmyBot API integration:
  - Computers domain (device and endpoint management)
  - Software domain (application and package management)  
  - Navigation tools (immybot_navigate, immybot_status, immybot_back)
- Gateway mode support for WYRE MCP Gateway
  - Per-request stateless server instances
  - Header-based credential injection
  - HTTP transport with health checks
- Docker container deployment
  - Multi-stage build with dependency pruning
  - Health checks and graceful shutdown
  - Non-root user for security
- Structured logging with configurable levels
- Elicitation infrastructure for interactive tool calls
- Two-step deployment model support (stage + reconcile)

### Security
- OAuth 2.0 client credentials authentication
- Non-root container user (mcp:1001)
- Environment-based credential injection
- Secure HTTP header handling for gateway mode
