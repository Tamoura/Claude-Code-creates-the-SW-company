# ConnectGRC Backend Foundation

## Task: BACKEND-01
## Branch: foundation/connectgrc
## Port: 5006 (backend), 3110 (frontend - reserved)

## Summary
Set up backend API foundation for ConnectGRC (AI-first GRC platform).
Scaffolding layer that all features build on.

## Key Decisions
- Reuse @connectsw/shared for logger, crypto, prisma, redis plugins
- Adapt auth plugin from stablecoin-gateway (roles: talent, employer, admin)
- Adapt observability plugin from stablecoin-gateway
- Copy error classes from invoiceforge
- Copy pagination helper from invoiceforge
- Database: postgresql://postgres@localhost:5432/connectgrc_dev
- Test DB: postgresql://postgres@localhost:5432/connectgrc_test

## Acceptance Criteria
- [ ] Fastify server starts on port 5006
- [ ] GET /health returns 200 with status, version, uptime, database status
- [ ] Prisma client generated and connects to database
- [ ] At least 5 integration tests passing
- [ ] All plugins loaded in correct order
- [ ] Error handling returns consistent format
- [ ] Environment variables validated at startup

## Progress
- [ ] package.json + tsconfig.json + .env.example + .gitignore
- [ ] Prisma schema + migration + seed
- [ ] App core (app.ts, server.ts, config.ts)
- [ ] Plugins (prisma, auth, redis, observability)
- [ ] Utilities (logger, crypto, errors, pagination)
- [ ] Routes (health, index)
- [ ] Test setup + integration tests
