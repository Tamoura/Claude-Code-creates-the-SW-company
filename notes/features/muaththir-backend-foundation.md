# Muaththir Backend Foundation (BACKEND-01)

## Status: COMPLETE

## Results
- 28 integration tests passing (5 health + 23 auth)
- 80%+ code coverage (statements, lines)
- All acceptance criteria met

## Key Decisions
- Fastify 5.x, Prisma 6.x, PostgreSQL 15+
- Port 5005 for backend, muaththir_dev for DB
- JWT 1hr access + 7d refresh token (HttpOnly cookie)
- bcrypt cost 12 for passwords
- Password: 8+ chars, 1 uppercase, 1 number
- RFC 7807 error responses
- Error handler must be set BEFORE routes for Fastify 5.x encapsulation

## Component Registry Adaptations
- Auth plugin: Simplified for JWT-only (no API keys, no Redis)
- Prisma plugin: Minor adaptation for Fastify 5.x
- Logger: Adapted to suppress output in test mode
- Errors: Copy as-is from invoiceforge
- Pagination: Copy as-is from invoiceforge
- Crypto: Adapted to remove API key functions, keep password hashing

## Lesson Learned
In Fastify 5.x, `setErrorHandler` must be called BEFORE routes are
registered. Routes registered with `app.register()` create encapsulated
contexts, and the error handler only applies to routes registered after
it. This was different from how the stablecoin-gateway (Fastify 4.x)
worked.

## Files Created
- `products/muaththir/apps/api/package.json` - Dependencies
- `products/muaththir/apps/api/tsconfig.json` - TypeScript config
- `products/muaththir/apps/api/jest.config.ts` - Jest config
- `products/muaththir/apps/api/prisma/schema.prisma` - Full data model
- `products/muaththir/apps/api/src/app.ts` - buildApp function
- `products/muaththir/apps/api/src/server.ts` - Entry point (port 5005)
- `products/muaththir/apps/api/src/plugins/prisma.ts` - DB lifecycle
- `products/muaththir/apps/api/src/plugins/auth.ts` - JWT auth
- `products/muaththir/apps/api/src/plugins/observability.ts` - Logging
- `products/muaththir/apps/api/src/routes/health.ts` - GET /api/health
- `products/muaththir/apps/api/src/routes/auth.ts` - Auth endpoints
- `products/muaththir/apps/api/src/lib/errors.ts` - Error classes
- `products/muaththir/apps/api/src/lib/pagination.ts` - Pagination
- `products/muaththir/apps/api/src/utils/logger.ts` - Structured logger
- `products/muaththir/apps/api/src/utils/crypto.ts` - Password hashing
- `products/muaththir/apps/api/src/types/index.ts` - Type augmentation
- `products/muaththir/apps/api/tests/helpers/build-app.ts` - Test helper
- `products/muaththir/apps/api/tests/integration/health.test.ts`
- `products/muaththir/apps/api/tests/integration/auth.test.ts`
