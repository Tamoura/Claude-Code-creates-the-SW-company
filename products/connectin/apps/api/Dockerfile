# ============================================
# ConnectIn API -- Multi-Stage Docker Build
# ============================================
# Stage 1: Install production dependencies only
# Stage 2: Build TypeScript + generate Prisma client
# Stage 3: Minimal production image
# ============================================

# Stage 1: Production dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastify
WORKDIR /app

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist

# Copy Prisma schema and generated client
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy package.json for metadata
COPY package*.json ./

# Switch to non-root user
USER fastify

EXPOSE 5007

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5007/health || exit 1

CMD ["node", "dist/index.js"]
