# Fix: AI Fluency Backend Security Gate Issues

**Branch**: fix/ai-fluency/backend-gate-issues
**Date**: 2026-03-03

## Issues to Fix

### CRITICAL-001: RLS onRequest hook missing in prisma.ts
- The prisma plugin does not set `app.current_org_id` per request
- Multi-tenant isolation relies on this being set for every authenticated request
- Fix: Add `fastify.addHook('onRequest', ...)` that calls `prisma.$executeRaw`
- Using tagged template literal for SQL injection safety (not string interpolation)

### HIGH-001: @fastify/helmet not registered in app.ts
- Package is in dependencies but never registered
- Fix: Import and register before routes in app.ts

### HIGH-002: Auth routes not registered
- `/api/v1/auth/register` and `/api/v1/auth/login` return 404
- auth.ts route file needs to be created (stub returning 501)
- routes/index.ts needs to register it

### HIGH-003: .env.test committed to git
- .env.test contains secrets (JWT secrets, DB URLs)
- Fix: Add .gitignore, run git rm --cached

### HIGH-004: Hardcoded indicator codes in scoring.ts
- `'DELEGATION_REASONING'` and `'DISCERNMENT_MISSING_CONTEXT'` hardcoded
- No verification against actual DB seed data
- Fix: Extract to named constants with explanatory comment

## Key Decisions

### RLS hook SQL injection safety
Using `prisma.$executeRaw` with tagged template literal instead of
`$executeRawUnsafe` with string interpolation. The orgId from JWT is
UUID-formatted but we should still use parameterized queries.

### Auth routes stub
The route file creates a minimal stub returning 501 Not Implemented.
This ensures the routes exist and respond with JSON (not 404).
Full auth implementation is a separate sprint.

### Indicator short codes
Based on the `BehavioralIndicator.shortCode` field (VARCHAR 50),
the discernment gap detection uses two specific short codes.
These are documented as constants in scoring.ts.
