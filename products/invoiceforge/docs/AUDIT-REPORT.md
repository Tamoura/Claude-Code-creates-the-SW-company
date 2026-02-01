# InvoiceForge — Comprehensive Audit Report

**Product**: InvoiceForge — AI-Powered Invoice Generator
**Date**: February 1, 2026
**Auditor**: ConnectSW Code Reviewer (4-agent parallel audit)
**Version**: v1.0 (Post-MVP)

---

## Executive Summary

**Overall Assessment**: Needs Work
**Overall Score**: 6.1/10

InvoiceForge is a well-architected AI invoice SaaS with strong backend code quality and 71 integration tests against a real database. The Route-Handler-Service pattern is clean, Zod validation is comprehensive, and business logic (AI generation, tax math, subscription limits) is solid.

However, **the product is not production-ready** due to critical gaps in 4 areas:

1. **Security** — Stripe webhook bypass in test mode, subscription limit race condition, OAuth callback not validated, localStorage token storage
2. **Frontend Testing** — Zero unit tests on the frontend, only 8 E2E smoke tests
3. **DevOps** — No CI/CD pipeline, frontend not deployed, no automated security scanning
4. **Rate Limiting** — Global 100 req/min with no per-endpoint protection on auth or AI generation

**Recommendation**: Fix critical security issues and add frontend tests before production deployment.

---

## System Overview

```
Browser → Next.js (3109) → Fastify API (5004) → PostgreSQL
                                  |
                          +-------+-------+
                          |       |       |
                       Claude   Stripe  SendGrid
                        API      API     (email)
```

- **Type**: Full-stack SaaS (monolith backend, Next.js frontend)
- **Stack**: TypeScript, Fastify 5, Next.js 14, Prisma 6, PostgreSQL 15
- **AI**: Anthropic Claude API for natural language → invoice parsing
- **Payments**: Stripe Connect + Checkout + Billing
- **PDF**: @react-pdf/renderer (server-side)
- **Auth**: JWT (HS256) + bcrypt (12 rounds) + refresh tokens

### Backend Module Structure

| Module | Files | Responsibility |
|--------|-------|---------------|
| auth | routes, handlers, service, schemas | Registration, login, JWT, Google OAuth, password reset |
| invoices | routes, handlers, service, ai-service, pdf-service, schemas | CRUD, AI generation, PDF export, payment links |
| clients | routes, handlers, service, schemas | CRUD, fuzzy matching |
| users | routes, handlers, service | Profile, subscription management |
| webhooks | handlers | Stripe event processing |
| health | routes | Readiness/liveness checks |

---

## Dimension Scores

| Dimension | Score | Gate |
|-----------|:-----:|------|
| Security | 6.0/10 | **BELOW THRESHOLD** |
| Architecture | 7.5/10 | **BELOW THRESHOLD** |
| Test Coverage | 5.5/10 | **BELOW THRESHOLD** |
| Code Quality | 7.5/10 | **BELOW THRESHOLD** |
| Performance | 6.5/10 | **BELOW THRESHOLD** |
| DevOps | 2.0/10 | **BELOW THRESHOLD** |
| Runability | 8.0/10 | PASS |
| **Overall** | **6.1/10** | **FAIL** |

---

## Critical Issues (Top 10)

### Issue #1: Subscription Limit Race Condition

**File**: `apps/api/src/modules/invoices/service.ts:150-193`
**Severity**: Critical | **Likelihood**: Medium | **Blast Radius**: Product-wide

Free tier users can bypass the 5-invoice/month limit by submitting parallel requests. The check at line 176 and counter increment at line 187 are not atomic — between them, another transaction can slip through.

**Exploit**:
```bash
# Submit 10 concurrent requests — all pass the check before any increments
for i in {1..10}; do
  curl -X POST /api/invoices/generate -H "Authorization: Bearer $TOKEN" &
done
```

**Fix**: Use `SELECT ... FOR UPDATE` pessimistic locking or a database-level CHECK constraint.

---

### Issue #2: Stripe Webhook Signature Bypass in Test Mode

**File**: `apps/api/src/modules/webhooks/handlers.ts:19-21`
**Severity**: Critical | **Likelihood**: Low | **Blast Radius**: Organization-wide

When `NODE_ENV === 'test'`, all Stripe signature verification is skipped. If test mode is accidentally enabled in production, any HTTP request can mark invoices as paid.

**Fix**: Always verify signatures. Use a separate test webhook secret for testing.

---

### Issue #3: Stripe OAuth Callback Not Validated (CSRF)

**File**: `apps/api/src/modules/users/handlers.ts:74-111`
**Severity**: Critical | **Likelihood**: Medium | **Blast Radius**: Product-wide

The OAuth callback handler doesn't validate the `state` parameter against the authenticated user. An attacker can hijack the Stripe Connect flow by manipulating the state parameter, linking their Stripe account to a victim's InvoiceForge account.

**Fix**: Generate a cryptographic `state` token tied to the user's session. Validate it in the callback.

---

### Issue #4: Client ID Override Without Authorization (IDOR)

**File**: `apps/api/src/modules/invoices/handlers.ts:32-35`
**Severity**: High | **Likelihood**: Medium | **Blast Radius**: Feature-specific

Users can assign any `clientId` to their invoice without ownership verification. If User A knows User B's client UUID, they can link their invoice to B's client record.

**Fix**: Validate `clientId` belongs to `request.userId` before assignment.

---

### Issue #5: No CI/CD Pipeline

**File**: `.github/workflows/` (missing entirely)
**Severity**: High | **Likelihood**: High | **Blast Radius**: Organization-wide

No automated testing, linting, or security scanning before deployment. Every deploy is manual and untested. No pre-commit hooks configured.

**Fix**: Create GitHub Actions workflow: lint → test → build → deploy.

---

### Issue #6: Zero Frontend Unit Tests

**File**: `apps/web/src/` (0 test files)
**Severity**: High | **Likelihood**: High | **Blast Radius**: Product-wide

The entire frontend has zero unit tests. Login, dashboard, invoice generation, client management, error handling — all untested. Only 8 E2E smoke tests exist covering page loads and navigation.

**Fix**: Add 50+ frontend tests: login flow, dashboard data loading, invoice creation, error states, accessibility.

---

### Issue #7: localStorage Token Storage (XSS Risk)

**File**: `apps/web/src/lib/api.ts:14`
**Severity**: High | **Likelihood**: Medium | **Blast Radius**: Product-wide

Access tokens stored in `localStorage` are accessible to any JavaScript running on the page. A single XSS vulnerability would expose all user tokens.

**Fix**: Move to httpOnly cookies for token storage. Add refresh token rotation on 401.

---

### Issue #8: Global Rate Limiting Only — No Per-Endpoint Protection

**File**: `apps/api/src/app.ts:53-56`
**Severity**: High | **Likelihood**: High | **Blast Radius**: Product-wide

Rate limiting is a flat 100 req/min across all endpoints. No specific protection for:
- Login/register (brute-force attacks)
- AI invoice generation (cost control — each call costs ~$0.01)
- Public invoice endpoint (UUID enumeration)

**Fix**: Tiered limits — auth: 10/min per IP, AI generation: 20/min per user, public: 30/min per IP.

---

### Issue #9: Missing Database Indexes on Foreign Keys

**File**: `apps/api/prisma/schema.prisma` (Client, Invoice models)
**Severity**: High | **Likelihood**: High | **Blast Radius**: Product-wide

`Client.userId`, `Invoice.userId`, and `Invoice.clientId` have no indexes. Every list query does a full table scan filtered by userId. Performance degrades linearly with data growth.

**Fix**: Add indexes:
```prisma
@@index([userId])
@@index([clientId, status])
```

---

### Issue #10: Stripe Connect Placeholder Client ID

**File**: `apps/api/src/modules/users/handlers.ts:58-60`
**Severity**: High | **Likelihood**: High | **Blast Radius**: Feature-specific

Stripe Connect client ID is hardcoded as `'ca_stripe_connect_placeholder'`. Production Stripe Connect flow will fail entirely.

**Fix**: Move to environment variable `STRIPE_CONNECT_CLIENT_ID`.

---

## Architecture Problems

| Problem | Impact | Location |
|---------|--------|----------|
| Subscription tier limits hardcoded in code | Can't change pricing without deploy | `users/service.ts:100-133` |
| Fuzzy client matching loads ALL clients into memory | O(n) memory for large client lists | `clients/service.ts:122-154` |
| No audit logging for financial operations | Compliance risk, can't detect fraud | Entire payment flow |
| CSP allows `unsafe-inline` for scripts/styles | Defeats XSS protection | `app.ts:45-46` |
| No error boundaries in frontend | Silent failures, blank dashboard | `dashboard/page.tsx:29-30` |

---

## Security Findings

### Authentication & Authorization
- JWT HS256 with configurable secret: **Good**
- Bcrypt cost factor 12: **Good**
- Refresh token rotation: **Good**
- IDOR on clientId assignment: **Critical** (`invoices/handlers.ts:32-35`)
- OAuth state parameter not validated: **Critical** (`users/handlers.ts:74-111`)
- Health endpoint leaks DB status publicly: **Medium** (`health/routes.ts:4-6`)

### Injection & XSS
- Zod validation on all inputs: **Good**
- AI output validated with Zod schema: **Good**
- CSP unsafe-inline weakens XSS protection: **Medium** (`app.ts:45-46`)
- Frontend renders invoice notes without sanitization: **Low** (`new/page.tsx:257`)

### Data Security
- Passwords hashed with bcrypt: **Good**
- JWT secrets in env vars (not code): **Good**
- Weak default secrets in .env.example: **Medium** (`.env.example:2-3`)
- Tokens in localStorage instead of httpOnly cookies: **High** (`api.ts:14`)

### API Security
- CORS properly configured for production: **Good** (but unsafe-inline)
- Rate limiting exists but is insufficient: **High** (`app.ts:53-56`)
- Webhook signature verification bypassable: **Critical** (`webhooks/handlers.ts:19-21`)

---

## Performance & Scalability

| Issue | Location | Impact |
|-------|----------|--------|
| Missing FK indexes (userId, clientId) | `schema.prisma` | Query degradation at scale |
| Fuzzy match loads all clients | `clients/service.ts:122-154` | Memory exhaustion for large client lists |
| Duplicate DB queries in PDF handler | `invoices/handlers.ts:182-197` | 2 queries instead of 1 |
| No request timeout configured | `app.ts` | AI calls can hang indefinitely |
| No response compression | `app.ts` | Larger JSON payloads than necessary |

---

## Testing Gaps

### Backend: 8/10 (71 tests, real DB)
- Health check: 3 tests ✅
- Auth: 8 tests ✅ (missing: password reset, Google OAuth)
- Users: 8 tests ✅
- Invoices: 20 tests ✅ (including math validation, subscription limits)
- Clients: 14 tests ✅ (including fuzzy search)
- PDF: 4 tests ✅
- Webhooks: 10 tests ✅
- Public invoices: 4 tests ✅

### Frontend: 1/10 (0 unit tests)
- Login page: **NOT TESTED**
- Dashboard: **NOT TESTED**
- Invoice generation: **NOT TESTED**
- Client management: **NOT TESTED**
- Error states: **NOT TESTED**

### E2E: 3/10 (8 smoke tests)
- Landing page load: 3 tests ✅
- Auth redirect: 2 tests ✅
- Navigation: 3 tests ✅
- Invoice creation flow: **MISSING**
- Payment flow: **MISSING**
- Error handling: **MISSING**

---

## DevOps Issues

| Issue | Severity |
|-------|----------|
| No CI/CD pipeline whatsoever | Critical |
| Frontend not deployed (render.yaml = API only) | Critical |
| No automated security scanning | High |
| No database migration strategy for production | High |
| No monitoring or alerting configured | Medium |
| No staging environment | Medium |
| No rollback procedure documented | Medium |

---

## AI-Readiness Score: 7/10

- **Modularity** (1.5/2): Clean module separation, but AI service tightly coupled to Anthropic SDK
- **API Design** (1.5/2): RESTful with Zod schemas, good for agents
- **Testability** (1.5/2): Backend highly testable, frontend not
- **Observability** (1.0/2): Basic logging, no request ID correlation, no metrics
- **Documentation** (1.5/2): Good README and API docs, missing deployment runbook

---

## Technical Debt Map

### High-Interest Debt (Fix Before Production)
- Webhook signature bypass — active security vulnerability
- No CI/CD — every deploy risks regressions
- Zero frontend tests — can't safely modify UI
- Rate limiting gaps — open to brute-force

### Medium-Interest Debt (Fix Within 30 Days)
- localStorage tokens — XSS attack surface
- Missing DB indexes — performance cliff at scale
- Hardcoded Stripe placeholder — blocks production payments
- No audit logging — compliance risk

### Low-Interest Debt (Monitor)
- CSP unsafe-inline — only exploitable if XSS exists
- Error boundaries missing — UX issue, not security
- Subscription limits in code — inflexible but functional

---

## Refactoring Roadmap

### 30-Day Plan (Critical Fixes)
1. Fix webhook signature validation (remove test bypass)
2. Add CSRF state validation to Stripe OAuth callback
3. Validate clientId ownership in invoice handler
4. Add database indexes on userId/clientId
5. Create GitHub Actions CI/CD pipeline
6. Add per-endpoint rate limiting
7. Replace Stripe placeholder client ID

### 60-Day Plan (Testing & Security)
1. Add 50+ frontend unit tests (login, dashboard, invoice creation, errors)
2. Expand E2E tests to cover full invoice lifecycle
3. Move tokens from localStorage to httpOnly cookies
4. Add audit logging for payment state changes
5. Deploy frontend to production (Vercel or Render)
6. Add request timeouts and response compression

### 90-Day Plan (Hardening)
1. Add subscription limits to database (remove hardcoding)
2. Implement JWT key rotation
3. Add database-level CHECK constraint for tier limits
4. Add error boundaries and retry logic in frontend
5. Implement monitoring/alerting (health checks, error rates)
6. Security penetration testing

---

## Quick Wins (1-Day Fixes)

1. Add `@@index([userId])` to Client and Invoice models in schema.prisma
2. Remove test-mode webhook bypass (always verify signatures)
3. Add `bodyLimit: 524288` and `requestTimeout: 30000` to Fastify config
4. Replace Stripe Connect placeholder with `STRIPE_CONNECT_CLIENT_ID` env var
5. Add validation that clientId belongs to user in invoice handler
6. Register `@fastify/compress` for response compression
7. Add `.nvmrc` with Node 20 for consistent environments

---

## Score Gate Check

**FAIL** — 6 of 7 dimensions are below 8/10.

### Improvement Plan

| Dimension | Current | Target | Key Changes |
|-----------|:-------:|:------:|-------------|
| Security | 6.0 | 8.0 | Fix webhook bypass, OAuth CSRF, IDOR, rate limiting |
| Architecture | 7.5 | 8.0 | Add DB indexes, remove hardcoded limits, audit logging |
| Test Coverage | 5.5 | 8.0 | Add 50+ frontend tests, expand E2E to 20+ tests |
| Code Quality | 7.5 | 8.0 | Error boundaries, request timeouts, token storage |
| Performance | 6.5 | 8.0 | DB indexes, compression, fuzzy match optimization |
| DevOps | 2.0 | 8.0 | CI/CD pipeline, deploy frontend, staging env, monitoring |

**Estimated iterations to reach 8/10**: 2-3 improvement rounds.

---

*Generated by ConnectSW Code Reviewer — 4-agent parallel audit*
*Agents: Services & Business Logic, Routes & API, Plugins/Utils/Schema, Tests/CI/CD/Frontend*
