FROM node:26-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# GitHub Packages auth comes in as a BuildKit secret (the release workflow
# passes --secret id=npmrc) so the token never lands in a layer or in image
# metadata. Local builds: --secret id=npmrc,src=$HOME/.npmrc
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci --ignore-scripts

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies (must be in builder stage for auth)
RUN npm prune --omit=dev

# Production stage
FROM node:26-alpine

WORKDIR /app

# Set production environment.
# 0.0.0.0 is the in-container bind. Startup still refuses to listen unless
# CONDUIT_S2S_SECRET is a real secret. MCP_ALLOW_INSECURE_DEV=1 refuses to
# start while this host is 0.0.0.0; that bypass only binds 127.0.0.1.
# AUTH_MODE=gateway never falls back to image env vendor credentials.
ENV NODE_ENV=production
ENV AUTH_MODE=gateway
ENV MCP_HTTP_PORT=8080
ENV MCP_HTTP_HOST=0.0.0.0
ENV LOG_LEVEL=info

# Create non-root user
RUN addgroup -g 1001 -S mcp && adduser -u 1001 -S mcp -G mcp

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R mcp:mcp /app

# OCI labels for GHCR
LABEL org.opencontainers.image.source=https://github.com/WYRE-AI/immybot-mcp
LABEL org.opencontainers.image.description="MCP server for ImmyBot - Windows endpoint management and software deployment automation"
LABEL org.opencontainers.image.licenses=Apache-2.0
LABEL io.modelcontextprotocol.server.name="io.github.WYRE-AI/immybot-mcp"

# Switch to non-root user
USER mcp

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    http.get('http://localhost:8080/health', (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }).on('error', () => process.exit(1));"

# Start server
CMD ["node", "dist/index.js"]