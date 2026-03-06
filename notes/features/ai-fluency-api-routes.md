# AI Fluency API Routes Implementation

## Branch: feature/ai-fluency/openrouter-assessments (existing)

## Scope
Implement all missing API routes for the AI Fluency backend:
1. Auth routes (replace 501 stubs)
2. Assessment routes (new)
3. Profile routes (new)
4. Learning path routes (new)

## Key Decisions
- Argon2id for password hashing (already in deps)
- JWT access: 15min, refresh: 7 days
- SHA-256 hash of refresh token stored in UserSession table
- All errors use RFC 7807 Problem Details format (AppError)
- Auth plugin provides `request.currentUser` via `fastify.authenticate` preHandler
- Zod for request body validation
- No mocks policy - real DB in tests

## Implementation Order
1. Auth services + routes (dependency for all others)
2. Assessment routes
3. Profile routes
4. Learning path routes

## Patterns Observed
- `buildApp()` factory in app.ts, test helper in tests/helpers/build-app.ts
- `createTestOrg()` helper creates org + admin user + JWT token
- Routes registered with prefix in routes/index.ts
- Auth plugin decorates `fastify.authenticate` and `fastify.requireRole(role)`
- `request.currentUser` has: id, orgId, email, role, status
- Tests use `app.inject()` for HTTP calls
- Module `commonjs` in tsconfig, imports use `.js` extension in source
- jest.config uses `ts-jest` with `diagnostics: false`

## Test Baseline
- 125 tests passing across 14 suites
