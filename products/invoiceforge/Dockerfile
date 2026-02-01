# ─── Base ────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ─── Dependencies ────────────────────────────────────
FROM base AS deps
COPY apps/api/package*.json ./
RUN npm ci --only=production

# ─── Build ───────────────────────────────────────────
FROM base AS build
COPY apps/api/package*.json ./
RUN npm ci
COPY apps/api/ .
RUN npx prisma generate
RUN npm run build

# ─── Production ──────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 5004
CMD ["node", "dist/server.js"]
