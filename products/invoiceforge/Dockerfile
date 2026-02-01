# ─── Base ────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
LABEL org.opencontainers.image.title="InvoiceForge API"
LABEL org.opencontainers.image.description="AI-powered invoice generation backend"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="ConnectSW"

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

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy build output
COPY --from=build /app/dist ./dist

# Copy Prisma schema, migrations, and generated client
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy package.json for prisma CLI access
COPY --from=build /app/package.json ./package.json

EXPOSE 5004

# Default: start the API server
# For migrations, run: docker run invoiceforge-api npx prisma migrate deploy
CMD ["node", "dist/server.js"]
