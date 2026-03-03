# Build context: workspace root (required for pnpm monorepo lockfile)
# Usage: docker buildx build -f products/ai-fluency/apps/api/Dockerfile .

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests (.npmrc enables shamefully-hoist=true)
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

# pnpm deploy creates a flat node_modules (no .pnpm symlinks) and copies
# package files (including dist/ and prisma/) + runs prod install so
# @prisma/client postinstall auto-generates the binary with the schema present.
WORKDIR /workspace
RUN pnpm --filter "@ai-fluency/api" deploy --prod /prod

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fastify -u 1001

# Copy the fully deployed package (flat node_modules + compiled output)
COPY --from=builder --chown=fastify:nodejs /prod ./

USER fastify

EXPOSE 5014

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5014/health || exit 1

CMD ["node", "dist/index.js"]
