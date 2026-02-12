# Dockerfile for ConnectGRC Web (Next.js)
# Multi-stage build: deps -> build -> production
# Requires next.config.js to have output: 'standalone'

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci && npm cache clean --force

# ---------------------------------------------------------------------------
# Stage 2: Build the Next.js application
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . ./

# Build-time environment variables
ARG NEXT_PUBLIC_API_URL=http://localhost:5006
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: Production — standalone Next.js output
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3110

# dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy the standalone server and static assets
COPY --from=build --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nodejs:nodejs /app/.next/static ./.next/static

# Copy public assets if they exist (wildcard prevents failure when absent)
COPY --from=build --chown=nodejs:nodejs /app/public* ./public/

USER nodejs

EXPOSE 3110

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3110', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
