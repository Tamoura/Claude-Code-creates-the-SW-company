# Dockerfile for Mu'aththir Web (Next.js)
# Multi-stage build: deps -> build -> production
# Relies on next.config.js having output: 'standalone'

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY apps/web/package.json apps/web/package-lock.json* ./

RUN npm ci && npm cache clean --force

# ---------------------------------------------------------------------------
# Stage 2: Build the Next.js application
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ ./

# Build-time environment variables
ARG NEXT_PUBLIC_API_URL=http://localhost:5005
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: Production — standalone Next.js output
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3108

# dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy the standalone server and static assets
COPY --from=build --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nodejs:nodejs /app/.next/static ./.next/static

# Copy public assets if they exist (build will skip gracefully if absent)
# The wildcard pattern ensures no failure when public/ is missing.
COPY --from=build --chown=nodejs:nodejs /app/public* ./public/

USER nodejs

EXPOSE 3108

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3108', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
