# Stablecoin Gateway: Test Coverage & CI/CD Audit Report (v2)

**Audit Date**: 2026-02-28
**Auditor**: Code Reviewer Agent (Principal Software Architect + Security Engineer + Staff Backend Engineer)
**Product**: stablecoin-gateway
**Scope**: All test files, E2E tests, CI/CD workflows, dependency configuration
**Previous Audit**: 2026-02-28 (v1) -- this report supersedes with comprehensive file-level analysis

---

## Executive Summary

**Overall Assessment**: Good (7.5/10)

The stablecoin-gateway has an exceptionally deep test suite with **1,559 total test cases** across **168 test files**, spanning backend API integration tests, frontend component/hook tests, and a comprehensive 83-test full-stack E2E suite. The CI/CD pipeline includes 6 quality gate jobs with SAST scanning (CodeQL + Semgrep), Gitleaks secret scanning, and npm audit. Security testing covers SSRF, BOLA, CORS, rate limiting, account lockout, token revocation, and path traversal -- well above industry average.

However, there are specific gaps that need attention before the next production deployment.

**Top 5 Findings (Prioritized)**:

| # | Severity | Finding | Impact |
|---|----------|---------|--------|
| 1 | **HIGH** | E2E full-stack tests (83 cases) not integrated into CI | Critical cross-cutting regressions undetected |
| 2 | **HIGH** | `EmailService` has zero test coverage | Notification preferences, receipt HTML, XSS prevention untested |
| 3 | **HIGH** | Checkout route (`/v1/checkout/:id`) has no dedicated tests | Public-facing unauthenticated endpoint untested for expiry, field exclusion |
| 4 | **MEDIUM** | JWT_SECRET in CI workflow is low-entropy (`test-jwt-secret-ci`, 19 chars) | Does not meet the 64-char minimum enforced by own test suite |
| 5 | **MEDIUM** | No coverage threshold enforcement in API Jest config | Test coverage can silently regress |

**Recommendation**: Fix HIGH items before next production deployment. Current state is safe for staging.

---

## 1. Test Coverage -- Quantitative Summary

### Total Inventory

| Layer | Test Files | Test Cases | Testing Framework |
|-------|-----------|------------|-------------------|
| Backend API (`apps/api/tests/`) | 115 | 1,029 | Jest + real PostgreSQL + Redis |
| Frontend components (`apps/web/src/`) | 45 | 394 | Vitest + jsdom |
| Frontend tests dir (`apps/web/tests/`) | 7 | 53 | Vitest + jsdom |
| E2E full-stack (`e2e/integration/`) | 1 | 83 | Jest + fetch() against live services |
| **TOTAL** | **168** | **1,559** | |

### Backend Test Files by Directory

| Directory | Files | Test Cases | Coverage Focus |
|-----------|-------|------------|----------------|
| `tests/integration/` | 30 | ~280 | Route-level with real Fastify + DB |
| `tests/services/` | ~40 | ~415 | Service-layer business logic + race conditions |
| `tests/routes/v1/` | ~19 | ~165 | Route-specific: GDPR, pagination, expiry, lockout |
| `tests/routes/` (other) | 4 | ~15 | Rate limiting, SSE, webhook worker |
| `tests/plugins/` | 4 | ~53 | Auth, observability, Redis configuration |
| `tests/unit/` | 3 | ~56 | Encryption, payment state machine, URL validator |
| `tests/utils/` | ~10 | ~100 | Validation, logging, env, crypto, JWT entropy |
| `tests/schema/` | 1 | 3 | Decimal precision in Prisma schema |
| `tests/ci/` | 2 | 18 | Deploy preflight + audit config verification |
| `tests/workers/` | 2 | 14 | Refund processing worker + locking |

### Route Coverage Matrix

| Source Route File | Test File(s) | Test Cases | Status |
|-------------------|-------------|------------|--------|
| `routes/v1/auth.ts` | `auth.test.ts`, `auth-rate-limit.test.ts`, `auth-rate-limit-isolated.test.ts`, `account-lockout.test.ts`, `auth-jti.test.ts`, `auth-logout-validation.test.ts`, `change-password.test.ts`, `password-reset.test.ts`, `password-reset-session-revocation.test.ts`, `sessions.test.ts`, `token-revocation.test.ts` | ~60+ | EXCELLENT |
| `routes/v1/payment-sessions.ts` | `payment-sessions.test.ts`, `payment-sessions-patch.test.ts`, `payment-session-expiry.test.ts`, `payment-concurrency.test.ts`, `payment-idempotency.test.ts`, `pagination.test.ts`, `idempotency-key-validation.test.ts` | ~83 | EXCELLENT |
| `routes/v1/webhooks.ts` | `webhooks.test.ts`, `webhook-rotation.test.ts`, `webhook-encryption-enforcement.test.ts` | ~56 | EXCELLENT |
| `routes/v1/refunds.ts` | `refunds.test.ts`, `refund-idempotency.test.ts`, `refunds-pagination.test.ts`, `refunds-permission.test.ts` | ~32 | EXCELLENT |
| `routes/v1/payment-links.ts` | `payment-links.test.ts` | 34 | GOOD |
| `routes/v1/api-keys.ts` | `api-keys.test.ts` | 15 | GOOD |
| `routes/v1/admin.ts` | `admin-routes.test.ts`, `admin-auth.test.ts` | 15 | GOOD |
| `routes/v1/analytics.ts` | `analytics.test.ts` | 9 | GOOD |
| `routes/v1/notifications.ts` | `notifications.test.ts` | 7 | GOOD |
| `routes/v1/me.ts` | `gdpr-data-access.test.ts`, `gdpr-account-deletion.test.ts` | 15 | GOOD |
| `routes/internal/webhook-worker.ts` | `webhook-worker.test.ts` | 8 | GOOD |
| `routes/v1/checkout.ts` | None (indirect only via `merchant-payment-flow.test.ts`) | 0 | **MISSING** |
| `routes/v1/dev.ts` | None | 0 | **MISSING** (dev-only) |

**Routes tested: 11 of 13 (85%)**

### Service Coverage Matrix

| Service File | Test File(s) | Status |
|-------------|-------------|--------|
| `webhook.service.ts` | `webhook.service.test.ts`, `webhook.test.ts`, `webhook-event-type.test.ts`, `webhook-resource-id.test.ts` | EXCELLENT |
| `webhook-delivery.service.ts` | `webhook-delivery.test.ts` (15 cases, race conditions, idempotency) | GOOD |
| `webhook-circuit-breaker.service.ts` | `webhook-circuit-breaker.test.ts`, `circuit-breaker-atomicity.test.ts` | GOOD |
| `blockchain-monitor.service.ts` | `blockchain-monitor.test.ts`, `blockchain-monitor-timeout.test.ts`, `blockchain-monitor-tolerance.test.ts`, `blockchain-monitor-error-paths.test.ts` | EXCELLENT |
| `blockchain-transaction.service.ts` | `blockchain-transaction.test.ts`, `blockchain-multi-transfer.test.ts`, `blockchain-field-bypass.test.ts` | EXCELLENT |
| `kms.service.ts` | `kms.service.test.ts`, `kms-key-rotation.test.ts`, `kms-error-sanitization.test.ts`, `kms-signing-algorithm.test.ts`, `kms-recovery-validation.test.ts`, `kms-audit-log.test.ts`, `kms-admin-rotation.test.ts` | EXCELLENT |
| `kms-signer.service.ts` | `kms-signer.service.test.ts` (17 cases) | GOOD |
| `nonce-manager.service.ts` | `nonce-manager.test.ts`, `nonce-lock-atomicity.test.ts` | GOOD |
| `audit-log.service.ts` | `audit-log.test.ts` (24 cases), `audit-log-persistence.test.ts` | EXCELLENT |
| `payment.service.ts` | `payment-race-condition.test.ts`, `payment-state-machine-enforcement.test.ts`, `payment-verification-precision.test.ts`, integration tests | GOOD |
| `refund.service.ts` | `refund-race-condition.test.ts`, `refund-failsafe.test.ts`, `refund-idempotency-blockchain.test.ts`, `refund-payment-status-guard.test.ts`, `refund-confirmation-finality.test.ts` | EXCELLENT |
| `refund-finalization.service.ts` | Partially via `refund-confirmation-finality.test.ts` | FAIR |
| `refund-query.service.ts` | Partially via `refund-failsafe.test.ts` | FAIR |
| `analytics.service.ts` | Via `analytics.test.ts` route tests only | FAIR |
| `payment-link.service.ts` | Via `payment-links.test.ts` route tests only | FAIR |
| `email.service.ts` | **NONE** | **MISSING** |
| `blockchain-query.service.ts` | **NONE** | **MISSING** |
| `webhook-delivery-executor.service.ts` | **NONE** | **MISSING** |

**Services tested: 14 of 19 (74%) -- 3 with zero coverage**

### Plugin & Utility Coverage

| Category | Tested | Total | Percentage |
|----------|--------|-------|-----------|
| Plugins (`auth.ts`, `redis.ts`, `observability.ts`, `prisma.ts`) | 4 | 4 | **100%** |
| Utils (`validation.ts`, `encryption.ts`, `crypto.ts`, `url-validator.ts`, `env-validator.ts`, `logger.ts`, etc.) | 8 of 11 | 11 | **73%** |

---

## 2. Test Quality Assessment

### What Is Working Well

**1. Real Database Integration (No Mocks for Infrastructure)**

The test setup (`/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/setup.ts`) uses real PrismaClient + real Redis. Database cleanup respects FK constraints. Every integration test uses `buildApp()` to construct a real Fastify instance with all middleware (auth, rate limiting, CORS, validation, Helmet headers). Tests exercise `app.inject()` for full middleware-stack fidelity.

**2. Security Test Depth -- SSRF, BOLA, CORS, Headers**

File `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/integration/webhooks.test.ts` lines 771-960 contains a dedicated `SSRF Protection` describe block testing:
- `localhost` rejection
- `127.0.0.1` rejection
- Private networks (`10.x.x.x`, `192.168.x.x`)
- Cloud metadata endpoint (`169.254.169.254`)
- URL credential injection (`user:password@host`)
- SSRF via webhook update (not just creation)

BOLA protection is tested across webhooks, API keys, refunds, and SSE tokens with explicit cross-user isolation checks.

**3. Financial Precision Testing (Best-in-Class)**

Files:
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/services/financial-precision.test.ts` (12 cases)
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/services/decimal-precision-fix.test.ts` (7 cases)
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/schema/decimal-precision.test.ts` (3 cases)
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/services/payment-verification-precision.test.ts` (4 cases)

Tests cover: `0.1 + 0.2 === 0.3` using Decimal.js, three partial refunds of $33.33 on $99.99, large amounts >$1M, Wei-to-USD conversions with USDC 6-decimal precision, and Prisma schema validation ensuring `Decimal(18,6)` not `Decimal(10,2)`.

**4. Race Condition / Concurrency Testing**

Explicit concurrent tests with `Promise.all` and `Promise.allSettled`:
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/services/payment-race-condition.test.ts` (4 cases)
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/services/refund-race-condition.test.ts` (9 cases)
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/services/nonce-lock-atomicity.test.ts` (4 cases)
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/services/spending-limit-atomicity.test.ts` (7 cases)
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/integration/payment-concurrency.test.ts` (4 cases)
- Webhook idempotency race (`webhook-delivery.test.ts:448-453`)

**5. CI/CD Self-Testing (Innovative)**

Files:
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/ci/deploy-preflight.test.ts` (14 cases) -- parses `deploy-production.yml` YAML to verify test steps precede build steps, env vars are set with correct values, and PostgreSQL/Redis services are defined
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/ci/audit-config.test.ts` (4 cases) -- verifies npm audit uses `--audit-level=high` and has no `continue-on-error`

This is a pattern I strongly endorse and rarely see in practice.

**6. E2E Full-Stack Test Quality**

File `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/e2e/integration/full-stack.test.ts` -- 83 test cases across 21 describe blocks using raw `fetch()` against live services with NO mocks and NO app imports. Covers: auth flows, payment CRUD, API keys, webhooks, refunds, analytics, profile/export endpoints, input validation bounds, BOLA protection, rate limiting headers, RFC 7807 error format, password validation, security headers, webhook URL validation, path traversal prevention, and idempotency key validation.

**7. Database State Verification**

Tests verify actual database state, not just HTTP responses:
- Webhook deletion verified in DB (`webhooks.test.ts:664-667`)
- Cascade deletion of webhook deliveries verified (`webhooks.test.ts:762-766`)
- Webhook secret stored in correct format in DB (`webhooks.test.ts:216-220`)
- Refund updates against `app.prisma` for state setup (`refunds.test.ts:53-61`)

**8. Email Enumeration Prevention**

File `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/integration/auth.test.ts:82-115` -- duplicate signup returns 201 with generic message (not 409), and the response explicitly lacks `access_token` to prevent login.

**9. Rate Limit Bucket Isolation**

Tests use unique `User-Agent` headers per describe block to isolate fingerprinted rate limit buckets:
```typescript
const testUA = `AuthSignupTest/${Date.now()}`;
```
This prevents cross-test interference when auth endpoints use IP+UA fingerprinting.

**10. Frontend Test Coverage Breadth**

45 frontend test files in `apps/web/src/` covering:
- All dashboard pages (Analytics, ApiKeys, CreatePaymentLink, DashboardHome, Invoices, PaymentDetail, PaymentsList, Refunds, Security, Settings, Webhooks)
- Admin pages (MerchantsList, MerchantPayments)
- Checkout flows (Success, Failed)
- Auth pages (Signup)
- Public pages (Home, Pricing, Docs)
- Component-level (ErrorBoundary, Sidebar, StatCard, ThemeToggle, TopHeader, TransactionsTable, SseStatusBadge, CheckoutPreview, DeveloperIntegration)
- Hooks (useAnalytics, useDashboardData, usePaymentEvents, useRefunds, useSessions, useSettings, useTheme)
- Libraries (api-client, payments, wallet, transactions, invoice-pdf)
- Accessibility suite (19 tests)
- Auth lifecycle, token manager (7 additional tests in `tests/` dir)

---

## 3. Missing Tests -- Critical Gaps

### Gap #1: EmailService -- ZERO Test Coverage

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/services/email.service.ts`

**Severity**: HIGH

**Lines of untested code**: ~185 lines of business logic

**What is untested**:
- `sendPaymentReceipt()` -- receipt HTML generation with payment details
- `sendMerchantNotification()` -- different event types (`payment.received`, `payment.failed`, `refund.processed`) produce correct subjects and templates
- `getNotificationPreferences()` -- auto-creation of default preferences for new users
- `updateNotificationPreferences()` -- partial update behavior (only provided fields updated)
- `escapeHtml()` (line 68) -- XSS prevention function that escapes `<`, `>`, `&`, `"`, `'` characters. This is **security-critical** code with zero test coverage
- Error handling -- `sendPaymentReceipt` and `sendMerchantNotification` should return `false` on failure

**Recommended test file**: `tests/services/email.service.test.ts` with 10-12 test cases.

### Gap #2: Checkout Route -- No Dedicated Tests

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/checkout.ts`

**Severity**: HIGH

**Why this matters**: This is a **public endpoint** (no authentication required) at `GET /v1/checkout/:id`. It:
1. Returns payment session data to unauthenticated customers
2. Has expiry logic (returns 410 for expired sessions)
3. Deliberately excludes sensitive fields (`merchant_address`, `customer_address`, `tx_hash`) to prevent enumeration
4. Has rate limiting (60 req/min per IP)

**None of these behaviors have dedicated test coverage.** The E2E test touches checkout indirectly via `merchant-payment-flow.test.ts` but does not verify:
- Expired payment returns 410
- Non-existent payment returns 404
- Response body excludes sensitive fields (the most critical assertion)
- Rate limiting on the public endpoint

**Recommended test file**: `tests/integration/checkout.test.ts` with 6-8 test cases.

### Gap #3: BlockchainQueryService

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/services/blockchain-query.service.ts`

**Severity**: MEDIUM

**Impact**: This service reads blockchain state. While `blockchain-monitor.service.ts` and `blockchain-transaction.service.ts` are well-tested, the query service has no dedicated tests.

### Gap #4: WebhookDeliveryExecutorService

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/services/webhook-delivery-executor.service.ts`

**Severity**: MEDIUM

**Impact**: The executor that performs actual HTTP delivery has no tests. `webhook-delivery.test.ts` tests the `WebhookDeliveryService` queue/process logic but mocks `global.fetch`, so the executor's HTTP behavior, timeout handling, and response parsing are untested.

### Gap #5: Dev Route Production Guard

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/dev.ts`

**Severity**: LOW (dev-only, but important guard)

**Impact**: The comment says "NEVER registered in production" but no test verifies this claim. A regression that accidentally registers dev routes in production would allow anyone to mark payments as COMPLETED without blockchain verification.

---

## 4. CI/CD Pipeline Analysis

### Workflow Inventory (17 total monorepo-wide, 4 directly relevant)

| Workflow File | Trigger | Purpose | Stablecoin-Gateway Impact |
|--------------|---------|---------|---------------------------|
| `test-stablecoin-gateway.yml` | PR paths + push to main | **Primary CI**: lint, security, test-api, test-frontend, secrets-scan, quality-gate | **DIRECT** -- primary gate |
| `security-sast.yml` | PR + push to main | CodeQL + Semgrep + npm audit (all products) | **DIRECT** -- security scanning |
| `claude-code-review.yml` | PR (all types) | AI-powered code review via Claude | **DIRECT** -- review gate |
| `test.yml` | PR + push to main | Monorepo shared lint + security | **INDIRECT** -- shared checks |

### Primary CI: `test-stablecoin-gateway.yml`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/.github/workflows/test-stablecoin-gateway.yml`

**Architecture** (6 jobs, all must pass via quality gate):

```
lint ----------------\
security -------------\
test-api (PG+Redis) ----> quality-gate (if: always(), verifies all 5 succeeded)
test-frontend ---------/
secrets-scan ---------/
```

| Job | Steps | Services | Status |
|-----|-------|----------|--------|
| `lint` | checkout, npm ci, ESLint, TypeScript `tsc --noEmit` | None | GOOD |
| `security` | checkout, npm ci, `npm audit --audit-level=high --omit=dev` | None | GOOD |
| `test-api` | checkout, npm ci, prisma generate, prisma migrate deploy, `npm test -- --forceExit --testTimeout=30000` | PostgreSQL 15-alpine (health checked), Redis 7-alpine (health checked) | EXCELLENT |
| `test-frontend` | checkout, npm ci, `npm test` (Vitest) | None | GOOD |
| `secrets-scan` | checkout (full history), Gitleaks | None | EXCELLENT |
| `quality-gate` | Verifies all 5 jobs passed, fails if any did not | None | EXCELLENT |

**Strengths**:
- Path-filtered: only triggers on `products/stablecoin-gateway/**` changes
- Real PostgreSQL and Redis services with health checks
- Database migrations run before tests
- All 5 jobs must pass (enforced by quality-gate with `if: always()`)
- Gitleaks scans full git history (`fetch-depth: 0`)

### SAST Pipeline: `security-sast.yml`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/.github/workflows/security-sast.yml`

| Job | Tool | Config | Status |
|-----|------|--------|--------|
| `codeql` | GitHub CodeQL | `security-extended` queries, JS/TS | EXCELLENT |
| `semgrep` | Semgrep | Default ruleset, SARIF upload, PR commenting (20 findings max) | GOOD (but `continue-on-error: true`) |
| `npm-audit` | npm audit | All products + packages, `--audit-level=critical --omit=dev` | GOOD |

### AI Code Review: `claude-code-review.yml`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/.github/workflows/claude-code-review.yml`

Runs on all PR types (opened, synchronize, ready_for_review, reopened). Uses `anthropics/claude-code-action@v1` with code-review plugin. This adds an AI review layer to every PR.

---

## 5. CI/CD Findings

### Finding #1: E2E Full-Stack Tests Not in CI (HIGH)

**Location**: E2E tests at `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/e2e/integration/full-stack.test.ts` require both API (port 5001) and frontend (port 3104) running. No CI job starts these services and runs the E2E suite.

**Impact**: 83 test cases covering BOLA, RFC 7807 compliance, security headers, rate limiting, path traversal, and idempotency are never validated in CI. Regressions would go undetected until manual testing.

**Fix**: Add an `e2e` job to `test-stablecoin-gateway.yml` that starts both services, waits for health checks, runs `npm test` in `e2e/`, and adds it to the quality-gate dependency list.

### Finding #2: JWT_SECRET in CI is Low-Entropy (MEDIUM)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/.github/workflows/test-stablecoin-gateway.yml:94`

**Code**:
```yaml
JWT_SECRET: test-jwt-secret-ci
```

This is 19 characters. The project's own test at `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/utils/jwt-secret-entropy.test.ts` enforces a 64-character minimum for production. While this is a test-only value, it:
1. Contradicts the project's own security standards
2. Establishes a pattern of low-entropy secrets in version control

**Fix**: Use a 64+ character test secret to align with the project's entropy requirements.

### Finding #3: Semgrep is Non-Blocking (MEDIUM)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/.github/workflows/security-sast.yml:49`

```yaml
continue-on-error: true
```

Semgrep findings never block the build. Security issues found by static analysis are informational only.

**Fix**: Remove `continue-on-error` after establishing a findings baseline. Use `.semgrepignore` for known false positives.

### Finding #4: `forceExit` Masks Resource Leaks (LOW)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/.github/workflows/test-stablecoin-gateway.yml:122` and `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/e2e/integration/jest.config.ts:109`

Both CI and E2E config use `forceExit`. This masks Fastify server or database connection leaks that are not properly cleaned up in `afterAll()`.

**Fix**: Run tests locally with `--detectOpenHandles` to identify the leak source. Remove `forceExit` once fixed.

### Finding #5: No Coverage Threshold Enforcement (MEDIUM)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/package.json`

The API uses Jest but has no `coverageThreshold` configured. The E2E config has thresholds (80% across the board at `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/e2e/integration/jest.config.ts:62-69`) but measures test file coverage, not source code coverage.

**Fix**: Add Jest config for API with:
```typescript
coverageThreshold: {
  global: { branches: 75, functions: 80, lines: 80, statements: 80 }
},
collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts']
```

### Finding #6: No Staging Step in CI Pipeline (MEDIUM)

The CI pipeline runs tests and gates quality, but there is no deployment workflow for staging visible in the workflow files. The `deploy-preflight.test.ts` references a `deploy-production.yml`, suggesting production deployment exists, but there is no staging gate between CI pass and production.

### Finding #7: Unused Playwright in Frontend (LOW)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/package.json`

The frontend declares `@playwright/test: ^1.58.2` as a devDependency and defines a `test:e2e` script, but no Playwright test files exist in `apps/web/`. All E2E testing uses the separate `e2e/` directory with Jest + fetch. The dependency is dead weight.

---

## 6. Deployment Safety Assessment

| Check | Present? | Details |
|-------|----------|---------|
| Pre-deployment test gate | YES | `quality-gate` requires all 5 jobs (lint, security, test-api, test-frontend, secrets-scan) |
| TypeScript type checking | YES | `tsc --noEmit --pretty` in lint job |
| ESLint | YES | `npm run lint --if-present` |
| Security audit | YES | `npm audit --audit-level=high --omit=dev` (blocking) |
| SAST scanning | YES | CodeQL (`security-extended`) + Semgrep (non-blocking) |
| Secret scanning | YES | Gitleaks with full git history |
| Database migration | YES | `prisma migrate deploy` runs in CI |
| Health check endpoint | YES | `/health` and `/ready` tested in `health.test.ts` (6 cases) |
| E2E tests in CI | **NO** | 83 E2E tests exist but run manually only |
| Coverage enforcement | **NO** | No thresholds configured |
| Staging deployment | **UNKNOWN** | Not visible in available workflow files |
| Rollback capability | **UNKNOWN** | Not visible in available workflow files |
| npm audit (critical) | YES | Global SAST workflow audits all products at `--audit-level=critical` |

---

## 7. Secret Management in CI

| Secret/Value | Method | Assessment |
|-------------|--------|------------|
| `GITHUB_TOKEN` | `${{ secrets.GITHUB_TOKEN }}` (auto-injected) | GOOD |
| `GITLEAKS_LICENSE` | `${{ secrets.GITLEAKS_LICENSE }}` | GOOD |
| `CLAUDE_CODE_OAUTH_TOKEN` | `${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}` | GOOD |
| `DATABASE_URL` | Hardcoded (points to local service container) | ACCEPTABLE (test-only) |
| `REDIS_URL` | Hardcoded (`redis://localhost:6379`) | ACCEPTABLE (test-only) |
| `JWT_SECRET` | Hardcoded (`test-jwt-secret-ci`) | **NEEDS FIX** -- low entropy |
| `FRONTEND_URL` | Hardcoded (`http://localhost:3104`) | ACCEPTABLE (test-only) |
| `ALLOWED_ORIGINS` | Hardcoded (`http://localhost:3104`) | ACCEPTABLE (test-only) |
| `USE_KMS` | Hardcoded (`false`) | ACCEPTABLE (test-only) |
| `LOG_LEVEL` | Hardcoded (`warn`) | ACCEPTABLE |

**No production secrets are exposed.** All hardcoded values are test-only configuration for CI service containers.

---

## 8. Dependency Assessment

### Backend (`apps/api/package.json`)

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `fastify` | `^5.7.4` | Current | Major version 5 |
| `@prisma/client` | `^5.8.1` | Check for updates | Prisma 5.x, verify latest patches |
| `bcrypt` | `^6.0.0` | Current | Secure password hashing |
| `ethers` | `^6.10.0` | Current | Ethereum interaction |
| `zod` | `^3.22.4` | Current | Input validation |
| `@fastify/helmet` | `^13.0.2` | Current | Security headers |
| `@fastify/rate-limit` | `^10.3.0` | Current | Rate limiting |
| `@fastify/jwt` | `^10.0.0` | Current | JWT auth |
| `ioredis` | `^5.9.3` | Current | Redis client |
| `@aws-sdk/client-kms` | `^3.995.0` | Current | AWS KMS |
| `decimal.js` | `^10.6.0` | Current | Financial precision |
| `bullmq` | `^5.70.1` | Current | Job queue |
| `@typescript-eslint/*` | `^6.18.1` | **OUTDATED** | v6 is legacy, v8 is current. Frontend uses v8. |

### Frontend (`apps/web/package.json`)

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `react` | `^19.2.0` | Current | React 19 (latest) |
| `vite` | `^7.2.4` | Current | Build tool |
| `vitest` | `^3.2.4` | Current | Test framework |
| `@playwright/test` | `^1.58.2` | **Unused** | No Playwright tests exist in web dir |
| `viem` | `^2.46.2` | Current | Ethereum client |
| `wagmi` | `^3.5.0` | Current | Wallet connection |
| `tailwindcss` | `^4.1.18` | Current | Styling |
| `typescript` | `~5.9.3` | Current | |

### Inconsistency

The API uses `@typescript-eslint/eslint-plugin: ^6.18.1` (v6) while the frontend uses `typescript-eslint: ^8.56.0` (v8). This should be unified to v8.

---

## 9. Test Quality Scorecard

| Domain | Coverage | Quality | Edge Cases | Security | Overall |
|--------|----------|---------|------------|----------|---------|
| Auth & AuthZ | 9/10 | 9/10 | 9/10 | 9/10 | **9.0** |
| Payment Flow | 9/10 | 9/10 | 8/10 | 8/10 | **8.5** |
| Refund System | 9/10 | 8/10 | 9/10 | 8/10 | **8.5** |
| Webhook System | 9/10 | 8/10 | 9/10 | 9/10 | **8.8** |
| Blockchain & KMS | 8/10 | 8/10 | 8/10 | 8/10 | **8.0** |
| Financial Precision | 10/10 | 10/10 | 10/10 | N/A | **10.0** |
| Rate Limiting | 9/10 | 9/10 | 8/10 | 9/10 | **8.8** |
| Security Headers/CORS | 8/10 | 8/10 | 7/10 | 9/10 | **8.0** |
| BOLA Protection | 8/10 | 8/10 | 8/10 | 9/10 | **8.3** |
| GDPR Compliance | 7/10 | 7/10 | 6/10 | 7/10 | **6.8** |
| Observability | 7/10 | 8/10 | 6/10 | N/A | **7.0** |
| CI/CD Pipeline | 7/10 | 8/10 | 7/10 | 8/10 | **7.5** |
| Frontend Components | 8/10 | 7/10 | 6/10 | 6/10 | **6.8** |
| E2E Full-Stack | 9/10 | 8/10 | 8/10 | 8/10 | **8.3** |

**Weighted Average: 8.2/10**

---

## 10. Remediation Roadmap

### Immediate (1-2 days)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Write `tests/services/email.service.test.ts` (10-12 tests: receipts, notifications, preferences, `escapeHtml` XSS) | 2-3 hours | Closes HIGH gap |
| 2 | Write `tests/integration/checkout.test.ts` (6-8 tests: happy path, 410 expiry, 404, field exclusion, rate limit) | 2 hours | Closes HIGH gap |
| 3 | Change `JWT_SECRET` in `test-stablecoin-gateway.yml` to 64+ characters | 5 minutes | Aligns CI with own security standards |
| 4 | Add Jest `coverageThreshold` to API test config | 30 minutes | Prevents silent regressions |

### Short-Term (1-2 weeks)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 5 | Add E2E job to `test-stablecoin-gateway.yml` (start services, run `e2e/integration/full-stack.test.ts`) | 4 hours | Adds 83 tests to CI |
| 6 | Write tests for `blockchain-query.service.ts` | 2 hours | Closes MEDIUM gap |
| 7 | Write tests for `webhook-delivery-executor.service.ts` | 2 hours | Closes MEDIUM gap |
| 8 | Remove `continue-on-error` from Semgrep in `security-sast.yml` | 15 minutes | Makes SAST blocking |
| 9 | Remove `forceExit` from CI and E2E config, fix underlying leaks | 2 hours | Catches resource leaks |
| 10 | Update `@typescript-eslint/*` from v6 to v8 in API package | 1 hour | Consistency + latest rules |

### Medium-Term (1 month)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 11 | Add staging deployment workflow with E2E gate | 1 day | Pre-production validation |
| 12 | Add webhook delivery integration test with local HTTP server | 4 hours | Tests real HTTP delivery |
| 13 | Write dev-route production guard test (verify not registered when `NODE_ENV=production`) | 30 minutes | Prevents accidental exposure |
| 14 | Remove unused Playwright dependency from `apps/web/package.json` | 5 minutes | Reduces attack surface |
| 15 | Add rollback automation in deployment workflow | 1 day | Production safety |

---

## Appendix: Metrics Summary

```
TOTAL TEST FILES:              168
TOTAL TEST CASES:            1,559
  Backend API:               1,029 (115 files)
  Frontend:                    447 (52 files)
  E2E Full-Stack:               83 (1 file)

CI PIPELINE JOBS:                6 (lint, security, test-api, test-frontend, secrets-scan, quality-gate)
CI WORKFLOW FILES:               4 relevant (test, SAST, Claude review, monorepo shared)
SAST TOOLS:                      3 (CodeQL, Semgrep, Gitleaks)

ROUTES TESTED:              11/13 (85%)
SERVICES TESTED:            14/19 (74%)
PLUGINS TESTED:              4/4  (100%)

TEST-TO-SOURCE RATIO:        2.09:1 (115 test files / 55 source files for API)
SECURITY TEST CATEGORIES:       10 (SSRF, BOLA, CORS, headers, rate limit, lockout,
                                    token revocation, path traversal, encryption, PII redaction)
RACE CONDITION TEST FILES:       6
FINANCIAL PRECISION TESTS:      26
```

---

*Report generated by Code Reviewer Agent. All file paths are absolute. All findings include specific file references.*
*Previous version (v1) is superseded by this comprehensive analysis.*
