# Build context: workspace root (required for pnpm monorepo lockfile)
# Usage: docker build -f products/ai-fluency/apps/web/Dockerfile ../..

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests (pnpm-lock.yaml is at workspace root)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy app package.json
COPY products/ai-fluency/apps/web/package.json ./products/ai-fluency/apps/web/

# Install only this app's dependencies
RUN pnpm install --frozen-lockfile --filter "@ai-fluency/web..."

# Copy source and build
COPY products/ai-fluency/apps/web/. ./products/ai-fluency/apps/web/

WORKDIR /workspace/products/ai-fluency/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Next.js standalone output — self-contained, no node_modules needed
COPY --from=builder --chown=nextjs:nodejs /workspace/products/ai-fluency/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/products/ai-fluency/apps/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /workspace/products/ai-fluency/apps/web/public ./public

USER nextjs

EXPOSE 3118
ENV PORT=3118
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3118/ || exit 1

CMD ["node", "server.js"]
