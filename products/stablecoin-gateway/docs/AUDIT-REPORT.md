# Stablecoin Gateway - Production Code Audit Report

**Date**: January 31, 2026
**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer + Staff Backend Engineer)
**Branch**: `fix/stablecoin-gateway/audit-2026-01-critical`
**Scope**: Full product audit (API, Frontend, CI/CD, Infrastructure)

---

## Executive Summary

**Overall Assessment: Fair (6.5/10)**

The Stablecoin Gateway demonstrates strong foundational security with excellent cryptographic implementation (AES-256-GCM, timing-safe HMAC, bcrypt), comprehensive input validation via Zod schemas, and proper SSRF protection. Eight critical security issues identified in the previous audit (Jan 31, 2026 AM) have been fixed on this branch. However, this audit identifies **5 new critical issues**, **8 high-severity findings**, and **12 medium-severity findings** across services, routes, infrastructure, and CI/CD.

**Top 5 Risks (Plain Language)**:
1. **Race condition in payment completion** - Two simultaneous requests could complete the same payment twice, resulting in double-crediting the merchant.
2. **DNS rebinding in webhook delivery** - An attacker could trick the system into sending webhook data to internal servers, exposing sensitive payment information.
3. **No idempotency protection on refunds** - Network retries could create duplicate refund transactions, sending double the money back to customers.
4. **CI/CD deploys without test gates** - Staging deploys on every push to main with no test verification, risking broken code in production path.
5. **Timing attack on internal API key** - The webhook worker endpoint uses plain string comparison for authentication, allowing attackers to brute-force the key.

**Recommendation: Fix First** - Address critical and high issues before next production deployment.

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

**Technology Stack**: Node.js 20, TypeScript 5, Fastify 4, Prisma ORM, PostgreSQL 15, Redis 7, ethers.js v6
**Key Flows**: Auth (JWT+API key) → Payment Sessions → Blockchain Verification → Webhooks → Refunds
**External Dependencies**: Alchemy/Infura RPC, AWS ECS Fargate, SendGrid, Datadog

---

## Critical Issues (Top 10)

### Issue #1: Race Condition in Payment Status Update (Double-Completion)

**Description**: `updatePaymentStatus()` performs read-then-write without database locking. Two concurrent blockchain confirmations for the same payment can both complete, triggering duplicate webhooks and double-crediting the merchant.

**File/Location**: `apps/api/src/services/payment.service.ts:133-160`

**Impact**:
- Severity: Critical
- Likelihood: Medium (requires concurrent blockchain events)
- Blast Radius: Organization-wide (financial loss)

**Exploit Scenario**:
1. Customer submits payment. Two blockchain monitor workers detect confirmation simultaneously.
2. Worker A reads payment status = CONFIRMING, proceeds to update.
3. Worker B reads payment status = CONFIRMING (not yet updated by A), also proceeds.
4. Both workers set status = COMPLETED and trigger webhooks.
5. Merchant receives two `payment.completed` webhooks, fulfills order twice.

**Fix**: Wrap in transaction with `FOR UPDATE` lock (pattern already exists in PATCH route):
```typescript
// BEFORE (vulnerable):
const session = await this.prisma.paymentSession.findUnique({ where: { id } });
// ... validate transition ...
await this.prisma.paymentSession.update({ where: { id }, data: { status } });

// AFTER (secure):
await this.prisma.$transaction(async (tx) => {
  const session = await tx.$queryRaw`
    SELECT * FROM "payment_sessions" WHERE id = ${id} FOR UPDATE
  `;
  // ... validate transition ...
  await tx.paymentSession.update({ where: { id }, data: { status } });
});
```

---

### Issue #2: DNS Rebinding in Webhook Delivery

**Description**: Webhook URLs are validated at registration time via DNS resolution, but DNS can change between validation and delivery. An attacker registers a webhook URL that resolves to a public IP during validation, then changes DNS to `127.0.0.1` before delivery.

**File/Location**: `apps/api/src/services/webhook-delivery.service.ts:422-457`

**Impact**:
- Severity: Critical
- Likelihood: Low (requires DNS control)
- Blast Radius: Organization-wide (SSRF to internal services)

**Exploit Scenario**:
1. Attacker registers webhook `https://evil.example.com/hook` → resolves to `1.2.3.4` (passes validation).
2. Attacker changes DNS: `evil.example.com` → `127.0.0.1`.
3. Payment completes, webhook delivery calls `fetch('https://evil.example.com/hook')`.
4. DNS resolves to `127.0.0.1`, sending payment data to localhost.
5. Internal services receive sensitive payment data.

**Fix**: Cache resolved IPs at validation time, re-validate resolved IP before fetch:
```typescript
// Store resolved IP alongside webhook URL
const resolvedIp = await resolveAndValidate(url);
await prisma.webhookEndpoint.create({
  data: { url, resolvedIp, ... }
});

// At delivery time, verify current DNS matches stored IP
const currentIp = await dns.resolve4(new URL(url).hostname);
if (!currentIp.includes(endpoint.resolvedIp)) {
  throw new Error('DNS resolution changed - potential rebinding attack');
}
```

---

### Issue #3: No Idempotency Protection on Refund Endpoint

**Description**: `POST /v1/refunds` has no idempotency key support. Payment sessions support idempotency keys with parameter mismatch detection, but refunds do not. Network retries or client bugs can create duplicate refund transactions.

**File/Location**: `apps/api/src/routes/v1/refunds.ts:40-78`

**Impact**:
- Severity: Critical
- Likelihood: Medium (network retries common)
- Blast Radius: Product-wide (financial loss via double refund)

**Exploit Scenario**:
1. Merchant clicks "Refund $100" button.
2. Network timeout, client retries the same POST.
3. Both requests create separate refund records.
4. Both refunds are processed, sending $200 to customer instead of $100.

**Fix**: Add `Idempotency-Key` header support matching the payment session pattern:
```typescript
const idempotencyKey = request.headers['idempotency-key'] as string;
if (idempotencyKey) {
  const existing = await prisma.refund.findFirst({
    where: { idempotencyKey, userId: request.user.id }
  });
  if (existing) return reply.code(200).send(formatRefund(existing));
}
```

---

### Issue #4: Timing Attack on Internal Webhook Worker Authentication

**Description**: The internal webhook worker endpoint uses plain JavaScript string comparison (`!==`) for API key verification, which is vulnerable to timing attacks. An attacker can measure response times to progressively guess the correct `INTERNAL_API_KEY`.

**File/Location**: `apps/api/src/routes/internal/webhook-worker.ts:31`

**Impact**:
- Severity: Critical
- Likelihood: Low (requires network timing precision)
- Blast Radius: Product-wide (webhook queue manipulation)

**Fix**:
```typescript
// BEFORE (vulnerable):
if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {

// AFTER (secure):
const expected = Buffer.from(`Bearer ${expectedKey}`);
const actual = Buffer.from(authHeader || '');
if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
```

---

### Issue #5: Decimal Precision Loss in Refund Webhook Payload

**Description**: Refund webhook payloads include a Decimal object that serializes as `[object Object]` instead of a numeric string. Merchants parsing webhook data receive corrupted refund amounts.

**File/Location**: `apps/api/src/services/refund.service.ts:738`

**Impact**:
- Severity: Critical
- Likelihood: High (every refund webhook)
- Blast Radius: Product-wide (merchant reconciliation fails)

**Fix**:
```typescript
// BEFORE:
refunded_amount: totalRefunded,  // Decimal object → "[object Object]"

// AFTER:
refunded_amount: totalRefunded.toString(),  // "100.50"
```

---

### Issue #6: SSE Endpoint Resource Exhaustion (No Connection Limits)

**Description**: The SSE endpoint (`GET /v1/payment-sessions/:id/events`) has no rate limiting or concurrent connection limit. Each connection holds a 30-minute timeout with 30-second heartbeats. An attacker can open thousands of connections to exhaust server resources.

**File/Location**: `apps/api/src/routes/v1/payment-sessions.ts:426-532`

**Impact**:
- Severity: High
- Likelihood: Medium
- Blast Radius: Product-wide (denial of service)

**Fix**: Add per-user connection limit:
```typescript
const MAX_SSE_PER_USER = 5;
const activeConnections = new Map<string, number>();
// Check before accepting connection
if ((activeConnections.get(userId) || 0) >= MAX_SSE_PER_USER) {
  return reply.code(429).send({ error: 'Too many SSE connections' });
}
```

---

### Issue #7: CI/CD Staging Deploys Without Test Gate

**Description**: `deploy-staging.yml` triggers on every push to `main` and deploys directly without running tests, lint, or security checks. Additionally, `ci.yml` runs build in parallel with tests, meaning builds can succeed while tests fail.

**File/Location**: `.github/workflows/deploy-staging.yml:13-110`, `.github/workflows/ci.yml:178-211`

**Impact**:
- Severity: High
- Likelihood: High (every merge to main)
- Blast Radius: Organization-wide (broken staging, path to production)

**Fix**:
```yaml
# deploy-staging.yml: Add pre-flight gate
jobs:
  test:
    # ... run tests first ...
  deploy:
    needs: [test]  # Block deploy until tests pass

# ci.yml: Add dependency
  build:
    needs: [test-api, test-web, lint, security]
```

---

### Issue #8: Unbounded In-Memory Audit Log Buffer

**Description**: The audit log service maintains an in-memory `entries` array with no maximum size limit. In a long-running process, this grows indefinitely, causing memory exhaustion.

**File/Location**: `apps/api/src/services/audit-log.service.ts:79`

**Impact**:
- Severity: High
- Likelihood: Medium (grows over hours/days)
- Blast Radius: Product-wide (OOM crash)

**Fix**: Implement circular buffer with max size:
```typescript
private readonly MAX_ENTRIES = 10_000;
private entries: AuditEntry[] = [];

record(entry: AuditEntry) {
  if (this.entries.length >= this.MAX_ENTRIES) {
    this.entries.shift();
  }
  this.entries.push(entry);
}
```

---

### Issue #9: Non-Atomic Redis Lock Releases

**Description**: Both the nonce manager and refund processing worker release Redis locks using a non-atomic get-then-delete pattern. Between `GET` and `DEL`, another process could acquire and release the lock, causing incorrect state.

**File/Location**: `apps/api/src/services/nonce-manager.service.ts:102-107`, `apps/api/src/workers/refund-processing.worker.ts:121-123`

**Impact**:
- Severity: High
- Likelihood: Low (requires precise timing)
- Blast Radius: Feature-specific (duplicate transactions)

**Fix**: Use atomic Lua script:
```typescript
const UNLOCK_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;
await redis.eval(UNLOCK_SCRIPT, 1, lockKey, lockValue);
```

---

### Issue #10: SSE Error Messages Leak Internal Endpoint Information

**Description**: SSE authentication errors return detailed messages revealing internal endpoint paths (`/v1/auth/sse-token`) and distinguishing between token types, enabling enumeration attacks.

**File/Location**: `apps/api/src/routes/v1/payment-sessions.ts:452, 459`

**Impact**:
- Severity: High
- Likelihood: Medium
- Blast Radius: Feature-specific (information disclosure)

**Fix**: Return generic error for all SSE auth failures:
```typescript
// BEFORE:
reply.code(403).send('Access denied: SSE endpoint requires SSE token (use POST /v1/auth/sse-token)');
reply.code(403).send('Access denied: Token not valid for this payment session');

// AFTER:
reply.code(403).send('Unauthorized');
// Log detailed reason internally
logger.warn('SSE auth failed', { reason: 'wrong-token-type', sessionId: id });
```

---

## Architecture Problems

### Problem 1: God Classes Exceeding 300 Lines

**Problem**: Three services significantly exceed the 300-line guideline:
- `refund.service.ts`: 762 lines (2.5x limit)
- `webhook-delivery.service.ts`: 612 lines (2x limit)
- `blockchain-transaction.service.ts`: 531 lines (1.8x limit)

**Impact**: Difficult to test, reason about, and modify. Changes to one responsibility risk breaking others.

**Solution**: Split by responsibility:
- `RefundService` → `RefundQueryService` + `RefundMutationService` + `RefundProcessingService`
- `WebhookDeliveryService` → `WebhookQueueService` + `WebhookDeliveryService` + `CircuitBreakerService`

### Problem 2: Duplicated Token Address Constants

**Problem**: `TOKEN_ADDRESSES` map is defined in both `blockchain-monitor.service.ts:7-17` and `blockchain-transaction.service.ts:94-103`. Updates require changing both files.

**Impact**: Inconsistency risk when adding new tokens or networks.

**Solution**: Extract to `src/utils/token-addresses.ts` shared constant.

### Problem 3: Two Database Queries Per API Key Auth

**Problem**: Every API-key-authenticated request performs a `findUnique` + `update(lastUsedAt)`, creating unnecessary write load.

**Impact**: At 100 req/s, this is 200 DB queries/s just for authentication, with write contention on the `api_keys` table.

**Solution**: Cache API key lookups in Redis (60s TTL). Batch `lastUsedAt` updates via background job every 30 seconds.

---

## Security Findings

### Authentication & Authorization

| Finding | Severity | Location | Status |
|---------|----------|----------|--------|
| JWT algorithm not pinned (accepts any algorithm) | High | `app.ts:86-90` | Open |
| API key HMAC fallback to unsalted SHA-256 in production | High | `crypto.ts:24-34` | Partially fixed (warns but doesn't fail) |
| Account lockout: 5 attempts/15 min with Redis tracking | N/A | `auth.ts` | Secure |
| Refresh token rotation with JTI blacklisting | N/A | `auth.ts` | Secure |
| API key permission enforcement (read/write/refund) | N/A | Routes | Secure |

### Injection Vulnerabilities

| Finding | Severity | Location | Status |
|---------|----------|----------|--------|
| All queries via Prisma ORM (parameterized) | N/A | All services | Secure |
| Zod schema validation on all inputs | N/A | `validation.ts` | Secure |
| Ethereum address validation with ethers.js | N/A | `validation.ts:6-17` | Secure |
| Metadata size limits (50 keys, 16KB) | N/A | `validation.ts:66-92` | Secure |

### Data Security

| Finding | Severity | Location | Status |
|---------|----------|----------|--------|
| Webhook secrets encrypted AES-256-GCM | N/A | `encryption.ts` | Secure |
| Passwords bcrypt-12 with 12-char minimum | N/A | `crypto.ts` | Secure |
| Logger does not sanitize sensitive data | Medium | `logger.ts:14-28` | Open |
| Silent audit log write failures | Medium | `audit-log.service.ts:120-122` | Open |

### API Security

| Finding | Severity | Location | Status |
|---------|----------|----------|--------|
| CORS origin validation with callback | N/A | `app.ts:62-84` | Secure |
| Helmet security headers (HSTS, CSP, X-Frame) | N/A | `app.ts` | Secure |
| SSRF protection with DNS resolution | N/A | `url-validator.ts` | Secure |
| Rate limiting: 100/min per user, 5/min on auth | N/A | `app.ts` | Secure |
| No rate limit on SSE endpoint | High | `payment-sessions.ts:426` | Open |
| No rate limit on internal webhook worker | Medium | `webhook-worker.ts:19` | Open |

### Infrastructure

| Finding | Severity | Location | Status |
|---------|----------|----------|--------|
| Redis TLS configurable | N/A | `redis.ts` | Secure |
| Env validation with entropy checks | N/A | `env-validator.ts` | Secure |
| ALLOWED_ORIGINS not validated in production | Medium | `app.ts:62` | Open |
| Metrics endpoint open in development | Medium | `observability.ts:174-190` | Open |

---

## Performance & Scalability

| Issue | Impact | Fix |
|-------|--------|-----|
| 2 DB queries per API key auth (findUnique + update lastUsedAt) | 200 queries/s at 100 req/s | Redis cache + batched writes |
| Daily spending limit uses `Math.round()` on floats | Rounding bias accumulates | Use `Decimal.js` for limit checks |
| Gas estimation has no upper bound | Could waste all gas on malformed tx | Cap to 100,000 for ERC-20 transfers |
| Overpayment accepted without limit | Customer could overpay 10x | Cap acceptance to 1% tolerance + warning |
| Observability metrics use single array for p50/p95/p99 | Incorrect percentile calculations | Use tdigest or separate sorted arrays |

---

## Testing Gaps

**Test Count**: 809 tests across 82 API + 6 frontend test files
**Current Pass Rate**: ~72% (579 passing, 229 failing, 1 skipped)
**Failure Root Causes**: Rate limit accumulation (63%), test cleanup cascades, security fix behavioral changes

### Coverage Gaps

| Area | Coverage | Gap |
|------|----------|-----|
| Auth routes (signup/login) | Strong (20+ tests) | Missing: JWT algorithm tampering, refresh token expiry race |
| Payment sessions | Strong (27+ integration tests) | Missing: concurrent completion, SSE connection exhaustion |
| Refunds | Moderate (17 tests) | Missing: idempotency, amount bounds, double-refund race |
| Webhooks | Strong (42+ tests) | Missing: DNS rebinding, large payload, timeout handling |
| Frontend dashboard | None | No tests for DashboardHome, PaymentsList, Settings |
| Frontend wallet integration | None | wallet.ts contains TODO markers |
| E2E flows | None | No Playwright tests in CI |
| SQL injection attempts | None | Relying on Prisma parameterization (correct but untested) |
| Rate limit bypass (X-Forwarded-For) | None | No tests for header spoofing |

### Test Quality Issues

1. **Brittle cleanup**: `webhook-resource-id.test.ts:54` fails on `prisma.user.delete()` when user already cascade-deleted
2. **Rate limit contamination**: Shared Redis between test files causes cascading 429 errors
3. **Frontend over-mocking**: `api-client.test.ts` mocks global fetch, never hits real backend
4. **Missing scenarios**: No tests for database connection pool exhaustion, Redis failure graceful degradation, or blockchain RPC provider failure

---

## DevOps Issues

### CI/CD Pipeline

| Issue | Severity | Location |
|-------|----------|----------|
| Staging deploys without test gate | High | `deploy-staging.yml` |
| Build runs parallel to tests (can succeed while tests fail) | High | `ci.yml:178-211` |
| No SAST/DAST scanning (CodeQL, Snyk, Trivy) | Medium | Missing |
| No E2E tests in pipeline | Medium | Missing |
| No type checking (`tsc --noEmit`) in CI | Medium | Missing from `ci.yml` |
| Hardcoded test JWT secret in YAML | Low | `ci.yml:72` |
| Database backup step commented out | Medium | `deploy-production.yml:78-82` |
| No automated rollback on deploy failure | Medium | `deploy-production.yml` |
| No canary deployment strategy | Low | Full rollout to all instances |

### Monitoring & Observability

| Issue | Severity | Description |
|-------|----------|-------------|
| Silent audit log failures | Medium | `console.error` instead of structured logger with alerts |
| Metrics endpoint unprotected in dev | Medium | Exposes error rates, performance data |
| No alerting on blockchain node failures | Medium | Provider failover works but no notification |

---

## AI-Readiness Score

**Score: 7.0 / 10**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Modularity | 1.2/2 | Good service separation, but god classes (762 lines) hinder agent comprehension. Split services would score 1.8/2. |
| API Design | 1.6/2 | Consistent REST conventions, Zod schemas, clear error format. Missing OpenAPI auto-generation. |
| Testability | 1.4/2 | Real DB tests (excellent), but rate limit contamination and cleanup issues create unreliable feedback loops for agents. |
| Observability | 1.2/2 | Request correlation IDs, structured logging in prod. But logger doesn't redact sensitive data, metrics incomplete. |
| Documentation | 1.6/2 | Strong README, PRD, API docs. Missing inline ADRs for complex business logic decisions (e.g., overpayment acceptance policy). |

**Recommendations**:
- Split god classes to help agents work on isolated components
- Add OpenAPI spec auto-generation from Zod schemas
- Fix test reliability so agents get consistent pass/fail signals
- Add inline decision docs (`// ADR: We accept overpayments because...`)

---

## Technical Debt Map

### High-Interest Debt (fix ASAP)

| Debt | Interest | Payoff |
|------|----------|--------|
| Race condition in payment status update | Double-completion risk on every concurrent event | Prevents financial loss |
| No refund idempotency | Double refund on every network retry | Prevents financial loss |
| Test suite 28% failure rate | Cannot trust CI signal; broken tests mask real regressions | Reliable deployments |
| CI build-without-test-gate | Can deploy broken code | Deployment safety |

### Medium-Interest Debt (fix within 60 days)

| Debt | Interest | Payoff |
|------|----------|--------|
| God classes (3 services >300 lines) | Every feature change risks side effects | Faster development, fewer bugs |
| Duplicated token address constants | Must update 2 files for new token | Maintenance simplicity |
| API key auth: 2 DB queries per request | Performance drag at scale | 2x fewer DB queries |
| No frontend component tests | Regressions go undetected | Frontend quality |

### Low-Interest Debt (monitor)

| Debt | Interest | Payoff |
|------|----------|--------|
| SSE requires fetch (not EventSource API) | Developer friction | Better DX |
| Frontend mock code bundled in production | Dead code in bundle | Smaller bundle |
| Incomplete wallet integration (TODOs) | Feature not complete | Feature completeness |

---

## Refactoring Roadmap

### 30-Day Plan (Critical Fixes)

1. **Fix payment status race condition** — Add FOR UPDATE lock to `updatePaymentStatus()` (`payment.service.ts`)
2. **Fix DNS rebinding** — Cache resolved IPs, re-validate before webhook fetch (`webhook-delivery.service.ts`)
3. **Add refund idempotency** — Support `Idempotency-Key` header on `POST /v1/refunds` (`refunds.ts`)
4. **Fix timing attack** — Use `crypto.timingSafeEqual` in webhook worker auth (`webhook-worker.ts`)
5. **Fix refund webhook decimal** — Call `.toString()` on Decimal in webhook payload (`refund.service.ts:738`)
6. **Add SSE rate limiting** — Per-user connection limit of 5 (`payment-sessions.ts`)
7. **Fix CI pipeline** — Add `needs: [test]` to build and staging deploy stages
8. **Fix test cleanup** — Use `deleteMany` with `where` filter, handle NotFound errors
9. **Cap audit log buffer** — Implement circular buffer with 10,000 max entries
10. **Fix atomic lock release** — Use Lua script in nonce manager and refund worker

### 60-Day Plan (Important Improvements)

1. **Pin JWT algorithm** — Explicitly set `HS256` in JWT plugin registration
2. **Add SAST to CI** — GitHub CodeQL or Snyk for static analysis
3. **Split god classes** — Refund, webhook, blockchain services into single-responsibility classes
4. **Add E2E tests** — Playwright tests for auth flow, payment flow, webhook delivery
5. **Redis cache API keys** — Cache lookups with 60s TTL, batch lastUsedAt writes
6. **Consolidate token addresses** — Move to shared utility file
7. **Fix logger redaction** — Add sensitive field masking (tokens, keys, passwords)
8. **Frontend dashboard tests** — Add component tests for DashboardHome, PaymentsList, Settings

### 90-Day Plan (Strategic Improvements)

1. **Canary deployments** — Deploy to 10% of instances, monitor, then full rollout
2. **Automated rollback** — Revert on health check failure
3. **OpenAPI auto-generation** — Generate from Zod schemas for API docs
4. **Per-route rate limiting** — Different limits for auth, payment, webhook endpoints
5. **Test parallelization** — Isolated Redis/Postgres per test suite in Docker
6. **Frontend mock removal** — Tree-shake mock code from production builds
7. **Webhook secret rotation grace period** — Keep old secret for 24h during rotation

---

## Quick Wins (1-Day Fixes)

1. **Fix refund webhook decimal**: Change `totalRefunded` to `totalRefunded.toString()` in `refund.service.ts:738` (1 line)
2. **Fix timing attack**: Replace `!==` with `crypto.timingSafeEqual` in `webhook-worker.ts:31` (3 lines)
3. **Fix SSE error messages**: Replace specific messages with generic "Unauthorized" in `payment-sessions.ts:452,459` (2 lines)
4. **Cap audit log buffer**: Add `if (this.entries.length >= 10000) this.entries.shift()` in `audit-log.service.ts` (2 lines)
5. **Fix CI build gate**: Add `needs: [test-api, test-web, lint, security]` to build job in `ci.yml` (1 line)
6. **Pin JWT algorithm**: Add `sign: { algorithm: 'HS256' }` to JWT plugin registration in `app.ts` (1 line)
7. **Fix test cleanup**: Use `deleteMany` with filter instead of `delete` in `webhook-resource-id.test.ts:54` (3 lines)
8. **Add ALLOWED_ORIGINS validation**: Add production check to `env-validator.ts` (5 lines)
9. **Fix Decimal in blockchain monitor**: Change `.toNumber()` to `.toString()` in `blockchain-monitor.service.ts:194` (1 line)
10. **Use structured logger for audit failures**: Replace `console.error` with `logger.error` in `audit-log.service.ts:120` (1 line)

---

## Scores Summary

| Area | Score | Notes |
|------|-------|-------|
| Security | 7/10 | Strong crypto & validation, but race conditions and timing attacks remain |
| Architecture | 6/10 | Clean layering, but god classes and duplicated constants |
| Test Coverage | 5/10 | 809 tests but 28% failing, no E2E, no frontend component tests |
| AI-Readiness | 7/10 | Good modularity, needs service splits and test reliability |

---

*Report generated by Code Reviewer Agent on January 31, 2026.*
*Full codebase analysis: 34 source files, 82 test files, 4 CI/CD workflows, 15 frontend components.*
