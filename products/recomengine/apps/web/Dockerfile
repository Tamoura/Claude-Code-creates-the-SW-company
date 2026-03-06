# ---- Build Stage ----
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# Copy config files
COPY next.config.js tsconfig.json tailwind.config.js postcss.config.js ./

# Copy source and build
COPY src ./src

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3112

# Copy built application and dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./

# Switch to non-root user
USER appuser

EXPOSE 3112

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3112/ || exit 1

CMD ["npx", "next", "start", "-p", "3112"]
