# Dockerfile for Stablecoin Gateway API

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY apps/api/package*.json ./

# Install ALL dependencies (including devDeps needed for tsc)
RUN npm ci && npm cache clean --force

# Copy source code
COPY apps/api/ ./

# Copy Prisma schema and generate client
COPY apps/api/prisma ./prisma
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and install production-only dependencies
COPY apps/api/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Generate Prisma client in runner stage (needs devDep prisma binary)
COPY apps/api/prisma ./prisma
RUN npx prisma generate

# Copy built output from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/index.js"]
