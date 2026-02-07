# Pulse Backend Foundation (BACKEND-01)

## Task
Setup Pulse backend API foundation at `products/pulse/apps/api/`.

## Key Decisions
- Port: 5003 (from PORT-REGISTRY.md)
- Database: pulse_dev / pulse_test (PostgreSQL)
- Branch: feature/pulse/inception
- Reuse plugins from stablecoin-gateway (prisma, redis, observability)
- Reuse errors + pagination from invoiceforge
- Auth adapted for Pulse RBAC (ADMIN/MEMBER/VIEWER)
- Error handler must be set BEFORE routes for proper encapsulation

## Architecture Notes
- Plugin order: observability -> prisma -> redis -> auth -> websocket -> routes
- JWT (HS256) + bcrypt (12 rounds) + GitHub OAuth auth
- WebSocket via @fastify/websocket for real-time feed
- RFC 7807 error responses via AppError.toJSON()
- Error/404 handlers MUST be set before route registration

## DB Schema
- 18 tables from db-schema.sql mapped to Prisma models
- 12 enums (UserRole, SyncStatus, PrState, etc.)
- Comprehensive indexes including BRIN for time-series

## Lessons Learned
- Fastify error handler scope: setErrorHandler must be called
  before register() to apply to encapsulated route plugins
- Jest with ESM needs ts-jest/presets/default-esm preset
  and a separate tsconfig.test.json with rootDir: "."
- Logger should suppress output in test env to keep test output clean

## Progress
- [x] Project setup (package.json, tsconfig, jest config)
- [x] Prisma schema + migration (18 models, 12 enums)
- [x] Core app (app.ts, server.ts, config.ts)
- [x] Plugins (prisma, redis, observability, auth, websocket)
- [x] Health route (GET /health with DB + Redis checks)
- [x] Auth routes (register, login, github stubs)
- [x] Utilities (logger, crypto, errors, pagination)
- [x] Tests (15 passing: 5 health, 10 auth)
- [x] Server verified starting on port 5003
