# Dockerfile for Mu'aththir API
# Multi-stage build: deps -> build -> production

# ---------------------------------------------------------------------------
# Stage 1: Install dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package manifests only (better layer caching)
COPY apps/api/package.json apps/api/package-lock.json* ./

RUN npm ci --ignore-scripts && npm cache clean --force

# ---------------------------------------------------------------------------
# Stage 2: Build TypeScript and generate Prisma client
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/ ./

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript -> dist/
RUN npm run build

# Prune dev dependencies so only production deps remain
RUN npm prune --production

# ---------------------------------------------------------------------------
# Stage 3: Production — minimal image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only what is needed to run
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nodejs:nodejs /app/package.json ./package.json

# Uploads directory for child photos
RUN mkdir -p /app/uploads && chown nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 5005

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5005/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
