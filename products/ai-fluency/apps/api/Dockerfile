# Build context: workspace root (required for pnpm monorepo lockfile)
# Usage: docker build -f products/ai-fluency/apps/api/Dockerfile ../..

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests (pnpm-lock.yaml and .npmrc are at workspace root)
# .npmrc must be copied so pnpm picks up shamefully-hoist=true
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy app package.json and prisma schema
COPY products/ai-fluency/apps/api/package.json ./products/ai-fluency/apps/api/
COPY products/ai-fluency/apps/api/prisma/ ./products/ai-fluency/apps/api/prisma/

# Install only this app's dependencies
RUN pnpm install --frozen-lockfile --filter "@ai-fluency/api..."

# Copy source and build
COPY products/ai-fluency/apps/api/src/ ./products/ai-fluency/apps/api/src/
COPY products/ai-fluency/apps/api/tsconfig.json ./products/ai-fluency/apps/api/

WORKDIR /workspace/products/ai-fluency/apps/api
RUN pnpm exec prisma generate && pnpm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fastify -u 1001

# Install production dependencies only
COPY --chown=fastify:nodejs package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY --chown=fastify:nodejs products/ai-fluency/apps/api/package.json ./products/ai-fluency/apps/api/
RUN pnpm install --frozen-lockfile --prod --filter "@ai-fluency/api..." && pnpm store prune

# Copy compiled output and Prisma artifacts
COPY --from=builder --chown=fastify:nodejs /workspace/products/ai-fluency/apps/api/dist ./products/ai-fluency/apps/api/dist
COPY --from=builder --chown=fastify:nodejs /workspace/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=fastify:nodejs /workspace/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=fastify:nodejs /workspace/products/ai-fluency/apps/api/prisma ./products/ai-fluency/apps/api/prisma

USER fastify

WORKDIR /app/products/ai-fluency/apps/api
EXPOSE 5014

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5014/health || exit 1

CMD ["node", "dist/index.js"]
