# ConnectGRC Backend Foundation

## Task: BACKEND-01
## Branch: foundation/connectgrc
## Port: 5006 (backend), 3110 (frontend - reserved)

## Summary
Set up backend API foundation for ConnectGRC (AI-first GRC platform).
Scaffolding layer that all features build on.

## Key Decisions
- Adapted plugins from component registry (not @connectsw/shared)
- Auth plugin adapted from stablecoin-gateway (roles: TALENT, EMPLOYER, ADMIN)
- Observability plugin adapted from stablecoin-gateway
- Error classes copied from invoiceforge
- Pagination helper copied from invoiceforge
- Logger adapted from shared package (suppresses in test mode)
- Database: postgresql://postgres@localhost:5432/connectgrc_dev
- Test DB: postgresql://postgres@localhost:5432/connectgrc_test

## Acceptance Criteria
- [x] Fastify server starts on port 5006
- [x] GET /health returns 200 with status, version, uptime, database status
- [x] Prisma client generated and connects to database
- [x] At least 5 integration tests passing (36 passing)
- [x] All plugins loaded in correct order (CORS > Rate Limit > Prisma > Redis > JWT > Auth > Observability > Routes)
- [x] Error handling returns consistent format
- [x] Environment variables validated at startup (Zod schema)

## Progress
- [x] package.json + tsconfig.json + .env.example + .gitignore
- [x] Prisma schema + migration + seed
- [x] App core (app.ts, server.ts, config.ts)
- [x] Plugins (prisma, auth, redis, observability)
- [x] Utilities (logger, crypto, errors, pagination)
- [x] Routes (health, index)
- [x] Test setup + 36 integration tests across 4 suites
- [x] Port registry updated

## Test Users (after seeding)
- admin@connectgrc.com (password: Test123!@#) - ADMIN role
- talent@connectgrc.com (password: Test123!@#) - TALENT role
- employer@connectgrc.com (password: Test123!@#) - EMPLOYER role
