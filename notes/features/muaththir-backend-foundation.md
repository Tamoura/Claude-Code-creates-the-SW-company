# Muaththir Backend Foundation (BACKEND-01)

## Task
Implement the base Fastify application with database, auth, and health check.

## Key Decisions
- Fastify 5.x, Prisma 6.x, PostgreSQL 15+
- Port 5005 for backend, muaththir_dev for DB
- JWT 1hr access + 7d refresh token (HttpOnly cookie)
- bcrypt cost 12 for passwords
- Password: 8+ chars, 1 uppercase, 1 number
- RFC 7807 error responses
- Copy and adapt components from stablecoin-gateway and invoiceforge

## Component Registry Adaptations
- Auth plugin: Simplified for JWT-only (no API keys, no Redis)
- Prisma plugin: Minor adaptation for Fastify 5.x
- Logger: Copy as-is from stablecoin-gateway
- Errors: Copy as-is from invoiceforge
- Pagination: Copy as-is from invoiceforge
- Crypto: Adapted to remove API key functions, keep password hashing

## Test Strategy
- Real database (muaththir_test), no mocks
- buildApp() helper creates Fastify instance for tests
- app.inject() for integration testing

## TDD Order
1. Health endpoint tests -> implementation
2. Auth register tests -> implementation
3. Auth login tests -> implementation
4. Auth logout tests -> implementation
5. Auth refresh tests -> implementation
