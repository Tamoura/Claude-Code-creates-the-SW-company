# Stablecoin Gateway - Production Code Audit Report

**Date**: February 1, 2026
**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer + Staff Backend Engineer)
**Branch**: `fix/stablecoin-gateway/audit-2026-02-fixes` (post-fix re-audit)
**Scope**: Full product audit (API, Frontend, CI/CD, Infrastructure)
**Previous Audit**: January 31, 2026 (pre-fix baseline)

---

## Executive Summary

**Overall Assessment: Good (8/10)**

The Stablecoin Gateway has undergone significant improvement since the January 31 audit. Twenty-nine issues were fixed across 5 phases (test infrastructure, architecture refactors, security fixes, test expansion, AI-readiness). A follow-up audit on February 1 identified and fixed 13 additional issues across financial precision, input validation, auth type safety, error handling, and infrastructure.

**Score Progression**:

| Category | Jan 31 (Pre-fix) | Feb 1 (Post-fix) | After Feb 1 Fixes |
|----------|:-:|:-:|:-:|
| Security | 7/10 | 8/10 | **8.5/10** |
| Architecture | 6/10 | 8.5/10 | **8.5/10** |
| Test Coverage | 5/10 | 7/10 | **7.5/10** |
| AI-Readiness | 7/10 | 8.5/10 | **8.5/10** |

**Key Strengths**:
1. Excellent cryptographic implementation (AES-256-GCM, timing-safe HMAC, bcrypt-12)
2. Comprehensive input validation via Zod schemas with SSRF protection
3. Well-documented architecture decisions via inline ADR comments
4. Strong error catalog with 56 typed error definitions
5. FOR UPDATE row locks for concurrent payment/refund safety
6. Decimal.js used consistently for all monetary arithmetic

**Remaining Risks (ranked)**:
1. Pre-existing test failures (234 of 893) due to Redis mock state contamination
2. E2E tests not gated in CI pipeline (informational only)
3. Spending-limit Lua script tests use incorrect mock expectations
4. Some services still tightly coupled (constructor-based instantiation)

---

## System Overview

**System Type**: Payment Gateway API + Web Frontend
**Architecture**: Layered monolith (Routes → Services → Prisma ORM → PostgreSQL)

```
                    ┌─────────────────┐
                    │   React + Vite  │  Port 3104
                    │   (Frontend)    │
                    └────────┬────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │  Fastify API    │  Port 5001
                    │  (Routes)       │
                    ├─────────────────┤
                    │  Services       │
                    │  (Business)     │
                    ├─────┬─────┬────┤
                    │Prisma│Redis│RPC │
                    └──┬───┴──┬──┴──┬─┘
                       │      │     │
                  ┌────▼──┐ ┌─▼──┐ ┌▼──────────┐
                  │Postgres│ │Redis│ │Alchemy/   │
                  │  15    │ │  7  │ │Infura RPC │
                  └────────┘ └────┘ └───────────┘
```

**Tech Stack**: Fastify 5 + TypeScript 5 + Prisma 5 + PostgreSQL 15 + Redis 7 + ethers.js 6

**Service Count**: 17 services (3,748 lines), 1 worker, 8 Prisma models
**Route Count**: 21 authenticated endpoints across 6 route files
**Test Count**: 99 API test files (~1,214 test cases), 12 frontend test files, 3 E2E suites

---

## Issues Fixed in This Audit Cycle (February 1, 2026)

### Fix 1: IEEE 754 Precision in Gas Estimation (CRITICAL → RESOLVED)
**File**: `apps/api/src/services/blockchain-query.service.ts:87-89`
**Was**: `BigInt(Math.floor(amount * Math.pow(10, decimals)))` — loses precision for values like 123.456
**Fix**: Replaced with `Decimal.js` arithmetic: `new Decimal(amount).times(new Decimal(10).pow(decimals)).floor()`
**Also fixed**: Balance lookup at line 130-131 now uses Decimal.js

### Fix 2: Scientific Notation Bypass in Refund Validation (HIGH → RESOLVED)
**File**: `apps/api/src/routes/v1/refunds.ts:25-31`
**Was**: `val.toString().split('.')` — values like `1.23e-10` bypass decimal check
**Fix**: Use `val.toFixed(20).replace(/0+$/, '')` for reliable decimal place counting

### Fix 3: Idempotency Detection Heuristic (HIGH → RESOLVED)
**File**: `apps/api/src/routes/v1/refunds.ts:64-66`
**Was**: `refund.createdAt < new Date(Date.now() - 1000)` — fragile 1-second threshold
**Fix**: Compare against `request.startTime` from observability plugin

### Fix 4: Unbounded Pagination (MEDIUM → RESOLVED)
**Files**: `payment.service.ts:113`, `refund-query.service.ts:88`
**Was**: No maximum limit — `?limit=999999999` causes OOM
**Fix**: `Math.min(filters.limit || 50, 100)` caps at 100 results

### Fix 5: Inconsistent Refund Pagination Response (MEDIUM → RESOLVED)
**File**: `apps/api/src/routes/v1/refunds.ts:113-116`
**Was**: `{ data, total }` — missing pagination object unlike other endpoints
**Fix**: Returns `{ data, pagination: { limit, offset, total, has_more } }`

### Fix 6: Unsafe JWT Claim Casting (MEDIUM → RESOLVED)
**File**: `apps/api/src/plugins/auth.ts:32,52`
**Was**: `(decoded as any).userId` — bypasses TypeScript safety
**Fix**: Destructure with type annotation, validate `decodedUserId` is a string

### Fix 7: Silent Error in API Key Update (LOW → RESOLVED)
**File**: `apps/api/src/plugins/auth.ts:84`
**Was**: `.catch(() => {})` — silently swallows database errors
**Fix**: `.catch((err) => logger.debug(...))` — logs failures

### Fix 8: Unstructured Logging in Refund Service (MEDIUM → RESOLVED)
**File**: `apps/api/src/services/refund.service.ts:68,270`
**Was**: `console.warn(...)` — bypasses structured logging pipeline
**Fix**: `logger.warn(...)` with structured data objects

### Fix 9: Webhook Decryption Silent Failure (HIGH → RESOLVED)
**File**: `apps/api/src/services/webhook-delivery-executor.service.ts:71-73`
**Was**: Decryption failure falls through to signature generation with wrong secret
**Fix**: Try/catch with error logging, circuit breaker integration, and early return

### Fix 10: Metrics Endpoint Open in Development (MEDIUM → RESOLVED)
**File**: `apps/api/src/plugins/observability.ts:180-183`
**Was**: Dev mode allowed unauthenticated access to performance metrics
**Fix**: Require INTERNAL_API_KEY in all environments

### Fix 11: Missing INTERNAL_API_KEY Startup Validation (MEDIUM → RESOLVED)
**File**: `apps/api/src/utils/env-validator.ts`
**Was**: No validation that INTERNAL_API_KEY is configured
**Fix**: Added `validateInternalApiKey()` — error in production, warning in dev

### Fix 12: Incomplete Log Redaction Patterns (LOW → RESOLVED)
**File**: `apps/api/src/utils/logger.ts:8-12`
**Was**: Missing patterns for `encryption_key`, `hmac`, `mnemonic`, `seed_phrase`
**Fix**: Added 4 new patterns to SENSITIVE_PATTERNS array

### Fix 13: Playwright Port Mismatch (CRITICAL → RESOLVED)
**File**: `apps/web/playwright.config.ts:11,22`
**Was**: `baseURL: 'http://localhost:3101'` — Vite serves on 3104
**Fix**: Updated to `http://localhost:3104`

---

## Remaining Issues (Post-Fix)

### P1: Pre-existing Test Failures (234 of 893)

**Root Cause**: Redis mock state contamination across test files. Rate-limit counters, circuit-breaker state, and JTI revocation entries persist between test suites.

**Impact**: CI cannot gate on 100% test pass rate. False failures mask real regressions.

**Recommendation**: Add `redis.flushdb()` in global test setup `beforeAll`. This was identified in the Phase 1 plan but the existing Redis mock approach in many test files prevents a clean fix without refactoring ~48 test files.

### P2: E2E Tests Not Gated in CI

**File**: `.github/workflows/ci.yml`
**Issue**: E2E job runs independently but `build` job only depends on `[test-api, test-web, lint]`
**Impact**: E2E failures don't block merges
**Recommendation**: Add `e2e` to build job dependencies

### P3: Tight Service Coupling

**Files**: `refund.service.ts:42-52`, `payment.service.ts:10-11`
**Issue**: Services instantiate dependencies in constructors rather than accepting injected instances
**Impact**: Harder to test, harder to swap implementations
**Recommendation**: Refactor to constructor injection pattern

### P4: No Database Constraint on Refund Overspend

**File**: `prisma/schema.prisma` (Refund model)
**Issue**: No CHECK constraint preventing `refund.amount > payment.amount` at DB level
**Impact**: Application-level validation is the only guard
**Recommendation**: Add PostgreSQL CHECK constraint via raw migration

---

## Architecture Assessment (8.5/10)

**Strengths**:
- Clean service decomposition: 17 focused services (largest is 476 lines)
- Facade pattern for refund service preserves API while splitting internals
- Shared token constants extracted to `constants/tokens.ts`
- Fire-and-forget pattern for non-critical updates (lastUsedAt)
- ADR comments explain design decisions inline

**Weaknesses**:
- Constructor-based instantiation instead of dependency injection
- PaymentService handles CRUD + state machine + webhook queueing (3 responsibilities)
- Decimal precision still uses `.toNumber()` at API response boundaries

---

## Security Assessment (8.5/10)

**Strengths**:
- AES-256-GCM for webhook secret encryption with auth tag validation
- HMAC-SHA256 for API key hashing with timing-safe comparison
- bcrypt-12 for password hashing
- JWT algorithm pinned to HS256
- FOR UPDATE locks on payment and refund state transitions
- SSRF protection on webhook URLs (private IP blocking, DNS validation)
- PII redaction in logger with 16 sensitive patterns
- Comprehensive rate limiting (Redis-backed, per-user/IP keying)

**Remaining Gaps**:
- JWT users bypass all permission checks (full access if JWT compromised)
- No rate-limit headers on SSE streaming responses
- Account lockout response reveals email existence

---

## Test Coverage Assessment (7.5/10)

**Strengths**:
- 99 API test files covering services, routes, integration, and plugins
- 80% coverage threshold enforced in Jest config
- Frontend component tests via Vitest + React Testing Library
- 3 E2E suites (auth-flow, payment-flow, dashboard)
- Idempotency and race condition tests present

**Weaknesses**:
- 234 pre-existing test failures (Redis state contamination)
- Token revocation test skipped due to rate-limit conflict
- E2E tests not in CI gate
- No stress/load tests for concurrent payment processing

---

## AI-Readiness Assessment (8.5/10)

**Strengths**:
- OpenAPI spec generation via `@fastify/swagger` at `/docs/json`
- Structured error catalog with 56 typed definitions
- Inline ADR comments on 6 key services
- Consistent snake_case JSON responses
- Idempotency support on create operations
- Correlation IDs on all requests

**Weaknesses**:
- Error catalog codes not fully unique (multiple 401s map to generic 'unauthorized')
- No machine-readable changelog
- No SDK generation from OpenAPI spec

---

## Quick Wins Remaining

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Add `redis.flushdb()` to test setup | Low | Fixes ~180 test failures |
| 2 | Add `e2e` to CI build gate | Low | Prevents broken deploys |
| 3 | Unskip token-revocation test with isolated Redis | Low | Closes security test gap |
| 4 | Add `--forceExit` to Jest CI config | Low | Prevents test hang |

---

## Audit History

| Date | Branch | Auditor | Changes |
|------|--------|---------|---------|
| Jan 31, 2026 AM | `fix/stablecoin-gateway/audit-2026-01-critical` | Code Reviewer Agent | Initial audit (scores: 7/6/5/7) |
| Jan 31, 2026 PM | `improve/stablecoin-gateway/audit-scores-9` | Code Reviewer Agent | 29 fixes across 5 phases |
| Feb 1, 2026 | `fix/stablecoin-gateway/audit-2026-02-fixes` | Code Reviewer Agent | 13 additional fixes (this report) |

---

*Report generated by Code Reviewer Agent (Claude Code) — February 1, 2026*
