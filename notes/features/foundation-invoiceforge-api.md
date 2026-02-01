# InvoiceForge Backend API Foundation

## Status: Complete

## What Was Built
- Fastify backend API foundation for InvoiceForge product
- Port: 5004
- Database: PostgreSQL (invoiceforge_dev / invoiceforge_test)

## Architecture
- Fastify 5 + Prisma 6 + PostgreSQL 15
- Modular structure: modules/{health,auth,invoices,clients,users}
- Plugins: prisma (DB decorator), auth (JWT middleware)
- Zod for all input validation
- All monetary values as integers (cents)
- Tax rates as integers (basis points)

## Implemented
- Health check endpoint (GET /api/health)
- Auth module: register, login, refresh, logout
- JWT access tokens (1hr) + refresh tokens (7d, HttpOnly cookie)
- bcrypt password hashing (cost 12)
- Session management in database
- Stub routes for invoices, clients, users (501 Not Implemented)
- Custom error handling (AppError hierarchy)
- Pagination helpers

## Tests
- 18 tests passing (3 health + 15 auth)
- Real PostgreSQL test database (no mocks)
- Table cleanup between tests

## Key Decisions
- Prisma 6 used (not 7) because Prisma 7 requires config
  migration that breaks traditional schema.prisma format
- Error handler registered before routes so encapsulated
  Fastify contexts inherit it
- JWT SignOptions cast needed for @types/jsonwebtoken
  compatibility with StringValue from ms package

## Files
- Working directory: products/invoiceforge/apps/api/
- Source: src/ (app.ts, server.ts, config.ts, modules/, plugins/, lib/)
- Tests: tests/ (health.test.ts, auth.test.ts, setup.ts)
- Schema: prisma/schema.prisma
