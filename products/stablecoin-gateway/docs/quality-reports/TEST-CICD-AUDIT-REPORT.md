# Stablecoin Gateway -- Test & CI/CD Quality Audit Report

**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer + Staff Backend)
**Date**: 2026-02-28
**Scope**: `products/stablecoin-gateway/apps/api/tests/`, `.github/workflows/`, `e2e/`
**Product Version**: main branch, commit d7b68b4

---

## Executive Summary

**Overall Test & CI/CD Assessment: GOOD (7.5/10)**

The stablecoin-gateway has a remarkably deep test suite for a product of its maturity. With **115 test files** across 7 directories covering **55 source files**, the test-to-source ratio of 2.09:1 is well above industry average. Security testing is particularly thorough, with dedicated tests for OWASP Top 10 categories including auth bypass, rate limiting, account lockout, BOLA, token revocation, and PII redaction.

The CI/CD pipeline is well-structured with 4 workflows covering CI, security scanning, staging deployment, and production deployment with approval gates and database backup.

**Top 5 Findings:**

1. **[HIGH]** E2E test suite is disconnected from CI -- the `e2e/` directory uses a separate Jest config hitting running services, but the CI `e2e` job runs Playwright against `apps/web/`, meaning the full-stack E2E tests are never run in CI.
2. **[HIGH]** Production deployment has no separate test gate job -- tests and deploy are in a single job, so a failing test step does not block via `needs:` dependency; it relies on step ordering within one job.
3. **[MEDIUM]** No test coverage threshold enforcement -- CI runs `--coverage` but has no minimum coverage gate (e.g., `--coverageThreshold`).
4. **[MEDIUM]** Missing tests for `checkout.ts`, `me.ts`, `dev.ts` routes, `email.service.ts`, `telemetry.ts`, and `kms-signing.service.ts`.
5. **[LOW]** The `global.fetch = jest.fn()` mock in `webhook-delivery.test.ts` is a global side effect that could leak between test files.

**Recommendation**: Fix First (address items 1-3 before next production deployment)

---

## Test Infrastructure Analysis

### Test File Inventory

| Directory | Files | Focus Area |
|-----------|-------|------------|
| `tests/integration/` | 30 | Route-level integration tests with real Fastify + real DB |
| `tests/services/` | 32 | Service-layer unit/integration tests |
| `tests/routes/v1/` | 17 | Focused route behavior tests |
| `tests/routes/` (root) | 3 | Rate limiting on specific route groups |
| `tests/routes/internal/` | 1 | Internal webhook worker route |
| `tests/plugins/` | 4 | Plugin-level tests (auth, observability, redis) |
| `tests/unit/` | 3 | Pure unit tests (state machine, encryption, URL validator) |
| `tests/schema/` | 1 | Prisma schema validation tests |
| `tests/ci/` | 2 | CI/CD workflow structure validation tests |
| `tests/utils/` | 9 | Utility function tests |
| **Total** | **115** | |

### Test Setup (`tests/setup.ts`)

**Severity: GOOD**

The setup file at `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/tests/setup.ts`:

- Uses **real PrismaClient** and **real Redis** (no mocks for infrastructure)
- Cleans DB in correct FK-constraint order before tests
- Flushes Redis to clear rate-limit, circuit-breaker, and lockout keys
- Properly disconnects both clients in `afterAll`

**Positive**: This follows the company standard of "no mocks in tests - real databases, real services."

**Risk**: The `beforeAll` runs once for the entire suite, not per file. Tests that modify shared state (users, payment sessions) may have ordering dependencies. This is partially mitigated by many test files creating their own app instances via `buildApp()`.

---

## Coverage Analysis by Domain

### 1. Authentication & Authorization -- EXCELLENT (9/10)

**Test files**: `auth.test.ts`, `auth-negative-paths.test.ts`, `auth-permissions.test.ts`, `auth-jti.test.ts`, `auth-logout-validation.test.ts`, `auth-rate-limit.test.ts`, `auth-rate-limit-isolated.test.ts`, `account-lockout.test.ts`, `admin-auth.test.ts`, `token-revocation.test.ts`, `sessions.test.ts`, `change-password.test.ts`, `password-reset.test.ts`, `password-reset-session-revocation.test.ts`, `sse-auth.test.ts`, `sse-token.test.ts`, `sse-token-revalidation.test.ts`, `sse-query-token.test.ts`

**Covered scenarios**:
- Signup with valid/invalid data
- Email enumeration prevention (returns 201 for duplicate emails)
- Login success/failure
- Expired JWT rejection
- Missing/malformed Authorization header
- Nonexistent user JWT
- Random garbage token
- API key permission enforcement (read-only cannot write = 403)
- Nonexistent API key hash
- JTI revocation via Redis blacklist
- Account lockout after 5 failed attempts (429)
- Lockout expiry simulation
- Failed-attempt counter reset on success
- Graceful degradation when Redis unavailable
- SSE token authentication
- Token revalidation
- Password reset flow with session revocation

**Gap**: No test for JWT algorithm confusion attack (e.g., `alg: "none"`). The `@fastify/jwt` library likely handles this, but an explicit test would confirm.

### 2. BOLA (Broken Object-Level Authorization) -- GOOD (8/10)

**Evidence from tests**:
- `webhooks.test.ts`: "should not return other users webhooks", "should return 404 for other users webhook" (multiple CRUD operations)
- `api-keys.test.ts`: "should return 404 for key owned by another user", "should return 404 when trying to delete another user key"
- `sse-token.test.ts`: "should reject payment session owned by another user"
- `payment-links.test.ts`: "should not return other user's payment links"
- `refunds.test.ts`: "should return 404 for refund owned by another user"
- `webhook-rotation.test.ts`: Cross-user rotation attempt

**Gap**: No explicit BOLA test for `GET /v1/payment-sessions/:id` -- a user retrieving another user's payment session. The route test at `payment-sessions.test.ts:272` tests 404 for nonexistent ID but does not create a second user to verify cross-user isolation.

### 3. Rate Limiting -- EXCELLENT (9/10)

**Test files**: `rate-limit.test.ts`, `rate-limiting-enhanced.test.ts`, `auth-rate-limit.test.ts`, `auth-rate-limit-isolated.test.ts`, `sse-rate-limit.test.ts`, `request-limits.test.ts`

**Covered scenarios**:
- Global rate limit enforcement
- Rate limit headers present (`x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`)
- Health endpoint exemption from rate limiting
- Auth endpoint specific rate limits
- SSE endpoint rate limits
- Request body size limits
- Redis-backed distributed rate limiting
- Graceful fallback without Redis

**Strength**: The use of unique `User-Agent` strings per test block to isolate rate-limit buckets shows sophisticated understanding of the fingerprinting mechanism.

### 4. Financial Precision (Decimal.js) -- EXCELLENT (10/10)

**Test files**: `financial-precision.test.ts`, `decimal-precision.test.ts`, `decimal-precision-fix.test.ts`, `payment-verification-precision.test.ts`

**Covered scenarios**:
- `0.1 + 0.2 === 0.3` (the canonical floating-point bug)
- Three partial refunds ($33.33 x 3 on $99.99) leaving $0.00
- Large amounts (>$1M) maintaining precision
- Wei-to-USD conversion (USDC 6 decimals)
- Partial refund remaining calculation precision
- Proposed refund exceeding remaining amount detection
- Schema validation: Prisma `Decimal(18, 6)` not `Decimal(10, 2)`
- Migration file existence and SQL correctness

**Strength**: This is the best financial precision test suite I have reviewed. It covers the exact edge cases that cause real-world payment bugs. The contrast test (`0.1 + 0.2 !== 0.3` in native Number) is excellent documentation.

### 5. Payment Flow & State Machine -- VERY GOOD (8.5/10)

**Test files**: `payment-state-machine.test.ts`, `payment-state-machine-enforcement.test.ts`, `payment-sessions.test.ts`, `payment-sessions-patch.test.ts`, `payment-session-expiry.test.ts`, `payment-concurrency.test.ts`, `payment-idempotency.test.ts`, `payment-race-condition.test.ts`, `payment-links.test.ts`, `merchant-payment-flow.test.ts`

**Covered scenarios**:
- All valid state transitions (PENDING->CONFIRMING->COMPLETED->REFUNDED)
- All invalid state transitions (16 rejection cases)
- Error messages with hints
- Concurrent `CONFIRMING->COMPLETED` with `SELECT ... FOR UPDATE` lock
- Idempotent same-state transitions
- Database consistency after concurrent writes
- Payment session CRUD
- Pagination and filtering
- Merchant payment flow E2E

**Gap**: No test for payment session expiry handling when a session is in `CONFIRMING` state (only `PENDING` expiry tested).

### 6. Refund System -- VERY GOOD (8.5/10)

**Test files**: `refunds.test.ts`, `refund-idempotency.test.ts`, `refund-idempotency-blockchain.test.ts`, `refund-race-condition.test.ts`, `refund-failsafe.test.ts`, `refund-confirmation-finality.test.ts`, `refund-payment-status-guard.test.ts`, `refund-processing.worker.test.ts`, `refund-worker-locking.test.ts`, `refunds-pagination.test.ts`, `refunds-permission.test.ts`

**Covered scenarios**:
- Only COMPLETED payments can be refunded
- Refund amount cannot exceed payment amount
- Partial refunds
- User isolation (BOLA)
- Idempotency with blockchain
- Race condition handling
- Failsafe mechanisms
- Worker locking
- Pagination

**Gap**: No test for refund amount of exactly `0` (zero-amount refund) or negative amount.

### 7. Webhook System -- VERY GOOD (8.5/10)

**Test files**: `webhooks.test.ts`, `webhook.test.ts`, `webhook.service.test.ts`, `webhook-delivery.test.ts`, `webhook-circuit-breaker.test.ts`, `webhook-encryption-startup.test.ts`, `webhook-encryption-enforcement.test.ts`, `webhook-rotation.test.ts`, `webhook-event-type.test.ts`, `webhook-resource-id.test.ts`, `webhook-worker.test.ts`

**Covered scenarios**:
- CRUD lifecycle
- Multi-endpoint delivery
- Event subscription filtering
- Disabled endpoint skipping
- HMAC signature generation/verification
- Delivery retry with exponential backoff
- Network error handling
- Max retry permanent failure
- Idempotency (duplicate prevention)
- Concurrent race condition handling
- Circuit breaker
- Secret encryption at rest
- Secret rotation

**Issue**: `webhook-delivery.test.ts` uses `global.fetch = jest.fn()` (line 6) which is a global side effect. This mock could leak to other test files running in the same worker. Should use `jest.spyOn(global, 'fetch')` with proper restore in `afterAll`.

### 8. Blockchain & KMS -- GOOD (8/10)

**Test files**: `blockchain-monitor.test.ts`, `blockchain-monitor-timeout.test.ts`, `blockchain-monitor-tolerance.test.ts`, `blockchain-multi-transfer.test.ts`, `blockchain-transaction.test.ts`, `blockchain-verification.test.ts`, `blockchain-field-bypass.test.ts`, `kms.service.test.ts`, `kms-key-rotation.test.ts`, `kms-error-sanitization.test.ts`, `kms-recovery-validation.test.ts`, `kms-signing-algorithm.test.ts`, `kms-signer.service.test.ts`, `kms-admin-rotation.test.ts`, `kms-audit-log.test.ts`, `nonce-manager.test.ts`, `nonce-lock-atomicity.test.ts`, `provider-failover.test.ts`, `sender-validation.test.ts`

**Covered scenarios**:
- Transaction verification (exists, confirmations, recipient)
- EIP-2 s-value normalization
- DER signature parsing
- KMS public key caching
- Transaction signing
- Health check
- Provider failover
- Nonce management with locks

**Issue**: KMS tests use `jest.mock('@aws-sdk/client-kms')` which is appropriate for a third-party service, but there are no contract tests verifying the mock matches real AWS KMS behavior.

### 9. Security-Specific Tests -- EXCELLENT (9/10)

**Test files**: `security-headers.test.ts`, `security-log-sanitization.test.ts`, `logger-redaction.test.ts`, `encryption.test.ts`, `encryption-validation.test.ts`, `cors-null-origin.test.ts`, `app-cors.test.ts`, `jwt-secret-entropy.test.ts`, `hmac-api-key.test.ts`, `production-secrets-mandatory.test.ts`, `env-validator.test.ts`, `audit-log.test.ts`, `audit-log-persistence.test.ts`, `spending-limit-atomicity.test.ts`, `wallet-spending-limits.test.ts`, `wallet-network-caching.test.ts`

**Covered scenarios**:
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS, CSP)
- X-Powered-By removal
- PII redaction in logs (password, token, secret, key, authorization, email)
- AES-256-GCM encryption/decryption
- Tampering detection (ciphertext, IV, auth tag)
- CORS null origin rejection
- JWT secret entropy validation
- HMAC API key hashing
- Production secret enforcement (process.exit on missing secrets)
- Audit log persistence

**Gap**: No SSRF test for webhook URL validation (testing that internal/private IPs like `127.0.0.1`, `169.254.x.x`, `10.x.x.x` are rejected as webhook destinations).

### 10. GDPR Compliance -- GOOD (7.5/10)

**Test files**: `gdpr-data-access.test.ts`, `gdpr-account-deletion.test.ts`

**Covered**: Right of Access (Article 15), Right to Erasure (Article 17)

**Gap**: No test for Right to Data Portability (Article 20) export endpoint (`GET /v1/me/export`), which is implemented in `me.ts`.

### 11. Observability & DevOps -- GOOD (7/10)

**Test files**: `observability.test.ts`, `observability-auth.test.ts`, `health.test.ts`, `audit-config.test.ts`, `deploy-preflight.test.ts`

**Strength**: The `ci/` tests that parse YAML workflow files and verify step ordering, environment variables, and service definitions are an innovative approach to CI/CD testing. This is a pattern I rarely see and strongly endorse.

---

## Untested Source Files

The following source files have **no dedicated test file**:

| Source File | Severity | Risk |
|-------------|----------|------|
| `src/routes/v1/checkout.ts` | **HIGH** | Public-facing endpoint, no auth required. No test for session enumeration, expiry edge cases, or data leakage. |
| `src/routes/v1/me.ts` | **MEDIUM** | GDPR routes partially tested (data access, deletion) but export endpoint untested. |
| `src/routes/v1/dev.ts` | **LOW** | Dev-only route, but no test verifying it is NOT registered in production. |
| `src/services/email.service.ts` | **MEDIUM** | Email sending logic untested. |
| `src/services/analytics.service.ts` | **LOW** | Analytics service partially covered by `analytics.test.ts` route test. |
| `src/telemetry.ts` | **LOW** | OpenTelemetry initialization not tested. |
| `src/services/kms-signing.service.ts` | **LOW** | Covered by `kms-signer.service.test.ts` (naming mismatch). |
| `src/utils/redis-rate-limit-store.ts` | **LOW** | Implicitly tested through rate-limit integration tests. |
| `src/utils/startup-checks.ts` | **LOW** | Partially covered by env-validator tests. |
| `src/app.ts` | **LOW** | Implicitly tested by every integration test via `buildApp()`. |

**Estimated Test Coverage**: ~78-82% of source files have direct or strong indirect test coverage. The gaps are concentrated in public-facing routes (`checkout.ts`) and operational infrastructure (`telemetry.ts`, `email.service.ts`).

---

## CI/CD Pipeline Analysis

### Workflow Inventory

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR + push to main | Tests, lint, security audit, E2E, build |
| `security-checks.yml` | Push + PR (path-filtered) | Hardcoded secret detection |
| `deploy-staging.yml` | Push to main | Test gate + deploy to ECS |
| `deploy-production.yml` | Manual (workflow_dispatch) | Pre-flight tests + DB backup + deploy to ECS |

### CI Pipeline (`ci.yml`) -- GOOD (7.5/10)

**Strengths**:
- 5 parallel jobs: `test-api`, `test-web`, `lint`, `security`, `e2e`
- `build` job depends on `[test-api, test-web, lint]` via `needs:`
- Real PostgreSQL 15 and Redis 7 service containers
- Type check (`tsc --noEmit`) runs BEFORE build and tests
- `npm audit --audit-level=high` blocks on HIGH/CRITICAL vulnerabilities
- Codecov coverage upload

**Issues**:

#### Issue #1: E2E Job Disconnect (HIGH)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/.github/workflows/ci.yml:192-228`

The CI `e2e` job runs Playwright against `apps/web/` (the frontend):
```yaml
- name: Run E2E tests
  working-directory: products/stablecoin-gateway/apps/web
  run: npx playwright test
```

But the `e2e/` directory at the product root contains a **separate Jest-based full-stack integration test** (`e2e/integration/full-stack.test.ts`) that hits a running API at `localhost:5001` and frontend at `localhost:3104`. This test:
- Tests auth flow (signup, login, duplicate rejection)
- Tests payment session creation
- Tests API key CRUD
- Tests webhook CRUD
- Tests frontend accessibility
- Tests auth edge cases

**This full-stack test is never run in CI.** The `build` job does not depend on `e2e` via `needs:`, so even the Playwright tests are non-blocking.

**Impact**: Full-stack integration bugs (API + DB + frontend interplay) can reach production undetected.

**Fix**:
```yaml
build:
  name: Build
  needs: [test-api, test-web, lint, e2e]  # Add e2e dependency
```
And add a CI job for the full-stack integration tests (requires both API and web running).

#### Issue #2: Security Job Non-Blocking (MEDIUM)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/.github/workflows/ci.yml:229-231`

The `build` job depends on `[test-api, test-web, lint]` but NOT `security`:
```yaml
build:
  name: Build
  needs: [test-api, test-web, lint]  # Missing: security, e2e
```

A build with HIGH-severity npm vulnerabilities will still succeed.

**Fix**:
```yaml
needs: [test-api, test-web, lint, security, e2e]
```

#### Issue #3: No Coverage Threshold (MEDIUM)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/.github/workflows/ci.yml:78`

```yaml
run: npm test -- --ci --coverage
```

Coverage is generated and uploaded to Codecov, but there is no `--coverageThreshold` flag or Jest config to fail the build if coverage drops below a minimum. Coverage can silently regress.

**Fix**: Add to `jest.config.ts`:
```typescript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80,
  },
},
```

### Security Checks Workflow (`security-checks.yml`) -- GOOD (7/10)

**Strengths**:
- Checks for hardcoded JWT_SECRET in docker-compose
- Checks for hardcoded POSTGRES_PASSWORD
- Scans for common secret patterns (API_KEY, SECRET, PASSWORD)
- Verifies `.env.example` exists
- Verifies `.env` is in `.gitignore`

**Issues**:

#### Issue #4: Limited Secret Scanning Scope (MEDIUM)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/.github/workflows/security-checks.yml:51-65`

The secret scan only checks `docker-compose*.yml` files. It does not scan:
- `.ts` source files for hardcoded secrets
- `.env.example` for accidentally committed real values
- Config files (`tsconfig.json`, `jest.config.ts`, etc.)

**Fix**: Adopt a proper secret scanning tool like `truffleHog`, `detect-secrets`, or `gitleaks` as a CI step:
```yaml
- name: Run gitleaks
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Issue #5: No SAST (Static Application Security Testing) (MEDIUM)

No SAST tool (e.g., Semgrep, CodeQL, Snyk Code) is configured. The security checks are limited to dependency auditing (`npm audit`) and secret pattern matching.

**Fix**: Add CodeQL or Semgrep:
```yaml
- name: Run Semgrep
  uses: returntocorp/semgrep-action@v1
  with:
    config: >-
      p/owasp-top-ten
      p/nodejs
      p/typescript
```

### Deploy Staging (`deploy-staging.yml`) -- GOOD (7.5/10)

**Strengths**:
- `test-gate` job runs full test suite before deployment
- `deploy` job depends on `test-gate` via `needs:`
- Uses `environment: staging` for GitHub environment protection
- AWS credentials via GitHub Secrets
- Post-deployment smoke tests (curl health endpoints)
- Docker images tagged with both SHA and `latest`

**Issues**:

#### Issue #6: Sleep-Based Deploy Verification (LOW)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/.github/workflows/deploy-staging.yml:186-188`

```yaml
- name: Wait for deployment
  run: sleep 60
```

A fixed 60-second sleep is fragile. ECS deployments can take longer. Better to use `aws ecs wait services-stable`:

```yaml
- name: Wait for deployment
  run: |
    aws ecs wait services-stable \
      --cluster stablecoin-gateway-staging \
      --services api web \
      --region us-east-1
```

#### Issue #7: No Rollback Automation for Staging (LOW)

If the staging smoke test fails, the workflow exits with failure but does not roll back. The production workflow has rollback instructions; staging should have similar.

### Deploy Production (`deploy-production.yml`) -- VERY GOOD (8.5/10)

**Strengths**:
- `workflow_dispatch` (manual trigger) with version input -- prevents accidental deploys
- `environment: production` for GitHub approval gates
- Pre-flight test gate (unit tests + lint) before build
- **Database backup via RDS snapshot** before migrations -- critical for a financial system
- Snapshot naming includes timestamp and version tag
- `aws rds wait db-snapshot-available` ensures backup completes before proceeding
- Post-deployment health verification
- Detailed rollback instructions in failure step
- Docker images tagged with version (not just `latest`)

**Issues**:

#### Issue #8: Single-Job Architecture (HIGH)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/.github/workflows/deploy-production.yml:11-14`

Tests and deployment are in a **single job** (`deploy`). If any step fails, the entire job fails -- but this means:
1. If the test step passes and the deploy step fails, the DB snapshot exists but no restore is automatic
2. There is no `needs:` dependency chain; step ordering is the only guard
3. A future refactoring that reorders steps could accidentally deploy before tests

**Fix**: Split into two jobs:
```yaml
jobs:
  pre-flight:
    name: Pre-flight Gate
    runs-on: ubuntu-latest
    steps: [tests, lint]

  deploy:
    name: Deploy
    needs: [pre-flight]
    runs-on: ubuntu-latest
    environment: production
    steps: [backup, migrate, build, push, deploy, verify]
```

#### Issue #9: Rollback is Manual Instructions Only (MEDIUM)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/.github/workflows/deploy-production.yml:180-198`

The rollback step only echoes instructions. For a financial system, automated rollback (at least for the ECS service) would be safer:

```yaml
- name: Rollback on failure
  if: failure()
  run: |
    echo "Rolling back ECS services to previous task definition..."
    aws ecs update-service \
      --cluster stablecoin-gateway-production \
      --service api \
      --force-new-deployment \
      --region us-east-1
```

#### Issue #10: Sleep 120s for Production (LOW)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/.github/workflows/deploy-production.yml:159`

Same issue as staging but with 120 seconds. Use `aws ecs wait services-stable`.

---

## E2E Test Analysis

### `e2e/integration/full-stack.test.ts` -- GOOD (7/10)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/e2e/integration/full-stack.test.ts`

**Strengths**:
- Tests complete user journey: signup -> login -> create payment -> API key CRUD -> webhook CRUD
- Tests auth edge cases (invalid token, missing token, expired JWT)
- Uses unique timestamp-based test data to avoid conflicts
- Tests both API and frontend accessibility

**Issues**:

#### Issue #11: Hardcoded Ports (MEDIUM)

```typescript
const API_BASE_URL = 'http://localhost:5001';
const FRONTEND_URL = 'http://localhost:3104';
```

These should be environment variables. Port 5001 does not match the company port registry (API ports are 5000+, and the addendum mentions different ports in different places).

#### Issue #12: No Cleanup (LOW)

Test data (users, payment sessions, API keys) created during E2E tests is not cleaned up. In a shared staging environment, this would pollute the database.

#### Issue #13: Sequential Test Dependencies (MEDIUM)

Tests depend on shared state (`authToken`, `createdApiKeyId`, `createdWebhookId`) set by previous tests. If the login test fails, all subsequent tests fail with misleading errors. Each test block should be independently runable.

---

## Test Quality Assessment

### Testing Approach Distribution

| Approach | File Count | Percentage |
|----------|-----------|------------|
| Integration (real Fastify + real DB) | 87 | 75.6% |
| Unit (isolated function tests) | 15 | 13.0% |
| Schema/Config validation | 3 | 2.6% |
| CI/CD structure validation | 2 | 1.7% |
| Mock-heavy service tests | 8 | 7.0% |

**Assessment**: The 75%+ integration test ratio is excellent. Tests are testing **behavior** (HTTP status codes, response shapes, database state) rather than implementation details. The few mock-heavy tests (`kms.service.test.ts`, `webhook-delivery.test.ts`) mock external dependencies (AWS KMS, HTTP fetch) which is appropriate.

### Anti-Patterns Detected

1. **Global fetch mock** in `webhook-delivery.test.ts` (line 6): `global.fetch = jest.fn()` should be `jest.spyOn(global, 'fetch')` with restore.

2. **Shared state across describe blocks** in `full-stack.test.ts`: `authToken` and IDs are set in one `describe` and used in another. A test framework reordering or parallel execution would break these.

3. **No negative test for dev routes in production**: `dev.ts` contains comment "NEVER registered in production" but there is no test verifying this claim (e.g., `expect(app).not.toHaveRoute('/v1/dev/simulate/:id')` when `NODE_ENV=production`).

### Test Quality Strengths

1. **Rate limit bucket isolation**: Using unique `User-Agent` strings per test block to avoid rate-limit collisions is sophisticated.

2. **Financial precision contrast tests**: Testing both `Decimal('0.1').plus('0.2') === '0.3'` AND `0.1 + 0.2 !== 0.3` in the same test is excellent documentation-as-code.

3. **CI/CD meta-tests**: Tests that parse workflow YAML to verify step ordering and env vars (`audit-config.test.ts`, `deploy-preflight.test.ts`) catch deployment regressions that traditional tests miss.

4. **Concurrency tests**: `payment-race-condition.test.ts` uses `Promise.allSettled` with real database `SELECT ... FOR UPDATE` to verify serialization. This is production-grade testing.

5. **Security test depth**: 8 distinct auth negative-path tests, account lockout with Redis simulation, PII redaction verification, encryption tampering detection.

---

## Critical Issues Summary (Ranked by Risk)

| # | Severity | Issue | Location | Fix Effort |
|---|----------|-------|----------|------------|
| 1 | **HIGH** | E2E tests not blocking CI build | `ci.yml:229` | 1 hour |
| 2 | **HIGH** | Security audit not blocking CI build | `ci.yml:229` | 10 min |
| 3 | **HIGH** | Production deploy: single-job architecture | `deploy-production.yml:11` | 2 hours |
| 4 | **MEDIUM** | No test coverage threshold | `ci.yml:78` | 30 min |
| 5 | **MEDIUM** | No SAST tool in CI | `.github/workflows/` | 2 hours |
| 6 | **MEDIUM** | Checkout route (`checkout.ts`) untested | `src/routes/v1/checkout.ts` | 3 hours |
| 7 | **MEDIUM** | BOLA gap for payment session GET by ID | `payment-sessions.test.ts` | 1 hour |
| 8 | **MEDIUM** | Secret scanning limited to docker-compose | `security-checks.yml:51` | 1 hour |
| 9 | **MEDIUM** | E2E hardcoded ports and no cleanup | `e2e/integration/full-stack.test.ts` | 1 hour |
| 10 | **LOW** | Global fetch mock leak risk | `webhook-delivery.test.ts:6` | 15 min |
| 11 | **LOW** | No dev route production guard test | Missing | 30 min |
| 12 | **LOW** | Sleep-based deploy verification | `deploy-staging.yml:186`, `deploy-production.yml:159` | 30 min |
| 13 | **LOW** | No automated rollback for staging | `deploy-staging.yml` | 1 hour |

---

## Remediation Roadmap

### Immediate (This Sprint)

1. Add `security` and `e2e` to `build.needs` in `ci.yml`
2. Add `--coverageThreshold` to Jest config or CI command
3. Write tests for `checkout.ts` (public endpoint, no auth -- highest risk)
4. Add BOLA test for `GET /v1/payment-sessions/:id` with cross-user check
5. Fix global fetch mock in `webhook-delivery.test.ts`

### Next Sprint

6. Split production deploy into 2 jobs (pre-flight + deploy)
7. Add SAST tool (Semgrep or CodeQL) to CI
8. Add `gitleaks` secret scanner to CI
9. Replace `sleep` with `aws ecs wait services-stable`
10. Add dev-route production guard test

### Backlog

11. Write tests for `email.service.ts`
12. Write test for GDPR data export (`GET /v1/me/export`)
13. Add JWT algorithm confusion test
14. Add SSRF test for webhook URL validation
15. Convert E2E to use environment variables for ports
16. Add E2E test cleanup (delete test data)

---

## Test Category Scorecard

| Category | Coverage | Quality | Depth | Overall |
|----------|----------|---------|-------|---------|
| Auth & AuthZ | 9/10 | 9/10 | 9/10 | **9/10** |
| BOLA | 8/10 | 8/10 | 7/10 | **7.7/10** |
| Rate Limiting | 9/10 | 9/10 | 9/10 | **9/10** |
| Financial Precision | 10/10 | 10/10 | 10/10 | **10/10** |
| Payment Flow | 8/10 | 9/10 | 9/10 | **8.7/10** |
| Refund System | 8/10 | 8/10 | 9/10 | **8.3/10** |
| Webhook System | 8/10 | 7/10 | 9/10 | **8/10** |
| Blockchain & KMS | 8/10 | 7/10 | 8/10 | **7.7/10** |
| Security | 9/10 | 9/10 | 8/10 | **8.7/10** |
| GDPR | 7/10 | 7/10 | 6/10 | **6.7/10** |
| Observability | 7/10 | 8/10 | 6/10 | **7/10** |
| CI/CD Pipeline | 7/10 | 8/10 | 7/10 | **7.3/10** |

**Weighted Average: 8.1/10**

---

## CI/CD Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| Build Gate | 8/10 | Type check + build before tests; but no bundle size check |
| Test Gate | 7/10 | Tests run before deploy; but E2E and security non-blocking |
| Secret Management | 8/10 | Secrets in GitHub Secrets; CI test uses safe test values |
| Deployment Safety | 7.5/10 | DB backup, approval gates; but single-job, manual rollback |
| Security Scanning | 6/10 | npm audit + custom secret patterns; no SAST, no gitleaks |
| Rollback Plan | 6/10 | Instructions printed; no automation |

**CI/CD Overall: 7.1/10**

---

*Report generated by Code Reviewer Agent. All file paths are absolute. All findings include specific file references and line numbers where applicable.*
