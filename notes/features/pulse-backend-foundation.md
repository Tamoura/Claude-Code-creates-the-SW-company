# Pulse Backend Foundation (BACKEND-01)

## Task
Setup Pulse backend API foundation at `products/pulse/apps/api/`.

## Key Decisions
- Port: 5003 (from PORT-REGISTRY.md)
- Database: pulse_dev (PostgreSQL)
- Branch: feature/pulse/inception (already exists)
- Reuse plugins from stablecoin-gateway (prisma, redis, observability)
- Reuse errors + pagination from invoiceforge
- Auth adapted for Pulse RBAC (ADMIN/MEMBER/VIEWER)

## Architecture Notes
- Plugin order: observability -> prisma -> redis -> auth -> rate-limit -> cors/helmet -> websocket -> routes
- JWT + bcrypt + GitHub OAuth auth
- WebSocket via @fastify/websocket for real-time feed
- RFC 7807 error responses

## DB Schema
- 15+ tables from db-schema.sql
- Prisma schema maps to the SQL schema with proper enums and relations

## Progress
- [ ] Project setup (package.json, tsconfig, jest config)
- [ ] Prisma schema + migration
- [ ] Core app (app.ts, server.ts, config.ts)
- [ ] Plugins (prisma, redis, observability, auth, websocket)
- [ ] Health route
- [ ] Auth routes (register, login)
- [ ] Utilities (logger, crypto, errors, pagination)
- [ ] Tests (build-app helper, health, auth)
