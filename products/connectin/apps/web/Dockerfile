# ============================================
# ConnectIn Web -- Multi-Stage Docker Build
# ============================================
# Stage 1: Install dependencies
# Stage 2: Build Next.js application
# Stage 3: Minimal production image (standalone)
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js standalone output for minimal Docker image
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
WORKDIR /app

# Copy standalone server
COPY --from=build /app/.next/standalone ./

# Copy static assets
COPY --from=build /app/.next/static ./.next/static

# Copy public directory
COPY --from=build /app/public ./public

# Switch to non-root user
USER nextjs

EXPOSE 3111

ENV PORT=3111
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3111/ || exit 1

CMD ["node", "server.js"]
