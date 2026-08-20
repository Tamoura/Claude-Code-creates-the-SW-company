# ConnectBPM API — build context is the PRODUCT root (products/connectbpm).
# The API declares no `workspace:*` dependencies, so it builds standalone.
# syntax=docker/dockerfile:1

# ── deps ─────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY apps/api/package.json ./
RUN pnpm install --prod=false --no-frozen-lockfile

# ── build ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY apps/api/package.json apps/api/tsconfig.json ./
COPY apps/api/prisma ./prisma
COPY apps/api/src ./src
RUN pnpm exec prisma generate && pnpm exec tsc

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && apk add --no-cache curl

COPY apps/api/package.json ./
COPY apps/api/prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Non-root. `node` (uid 1000) ships with the base image.
RUN chown -R node:node /app
USER node

EXPOSE 5018

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:5018/health/live || exit 1

CMD ["node", "dist/index.js"]
