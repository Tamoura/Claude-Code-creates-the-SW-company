# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (layer cache optimization)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fastify -u 1001

# Install only production dependencies in a clean layer
COPY --chown=fastify:nodejs package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output and Prisma artifacts
COPY --from=builder --chown=fastify:nodejs /app/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=fastify:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=fastify:nodejs /app/prisma ./prisma

USER fastify

EXPOSE 5014

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5014/health || exit 1

CMD ["node", "dist/index.js"]
