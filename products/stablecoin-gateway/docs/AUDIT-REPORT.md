# Stablecoin Gateway — Comprehensive Code Audit Report

**Product**: Stablecoin Gateway
**Audit Date**: 2026-01-31
**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer + Staff Backend Engineer)
**Scope**: Full backend API, frontend web app, database schema, CI/CD pipelines, tests
**Codebase Version**: Post-Phase 6 security hardening (770+ tests, 58 audit fix tests)

---

## Executive Summary

**Overall Assessment: GOOD**

The stablecoin-gateway is a well-engineered payment processing platform with strong security fundamentals. After six phases of security hardening, the codebase demonstrates professional-grade authentication, encryption, input validation, and SSRF protection. The test suite is comprehensive (770+ tests) with real database integration — no mock abuse.

**Top 5 Risks (Plain Language)**:

1. **Spending Limit Bypass** — Two simultaneous refund requests can each pass the spending limit check before either is recorded, allowing double the daily limit. Business impact: potential fund drainage.
2. **Nonce Lock Race Condition** — The mechanism preventing duplicate blockchain transactions has a tiny window where two processes could both proceed. Business impact: failed/duplicate blockchain transactions costing gas fees.
3. **Floating-Point Precision in Payment Verification** — Large payment amounts lose precision when converted from blockchain format. Business impact: payments near precision boundaries could be wrongly accepted or rejected.
4. **Missing Refund Idempotency** — No deduplication on blockchain refund transactions. Network retries could process the same refund twice. Business impact: double-spending on refunds.
5. **Password Reset Token Logged** — Reset tokens appear in application logs, accessible to anyone with log access. Business impact: account takeover within 1-hour window.

**Recommendation**: **Fix First** — Address the top 5 critical issues before production launch. The codebase is architecturally sound and close to production-ready.

---

## System Overview

**System Type**: Cryptocurrency payment gateway API with webhook-driven merchant notifications

**Technology Stack**:
- Runtime: Node.js 20+ / TypeScript 5+
- Framework: Fastify (HTTP), Prisma (ORM)
- Database: PostgreSQL 15+ with Redis for caching/rate-limiting
- Blockchain: ethers.js for EVM chains (Ethereum, Polygon, Arbitrum)
- Signing: AWS KMS for custodial wallet key management
- Encryption: AES-256-GCM for webhook secrets, bcrypt for passwords, HMAC-SHA-256 for API keys

**Architecture Pattern**: Layered monolith with service-oriented business logic

```
┌──────────────────────────────────────────────┐
│                   Clients                     │
│         (Merchants, Frontend, SDKs)           │
└──────────────┬───────────────────────────────┘
               │ HTTPS + JWT/API Key
┌──────────────▼───────────────────────────────┐
│              Fastify Routes Layer             │
│  /v1/auth, /v1/payment-sessions, /v1/refunds │
│  /v1/webhooks, /v1/api-keys                  │
├──────────────────────────────────────────────┤
│              Service Layer                    │
│  PaymentService, RefundService,              │
│  WebhookDeliveryService, BlockchainMonitor,  │
│  BlockchainTransactionService, KMSService    │
├──────────────────────────────────────────────┤
│              Data Layer                       │
│  Prisma ORM → PostgreSQL                     │
│  Redis (rate-limit, cache, locks, circuit)   │
├──────────────────────────────────────────────┤
│              External Services                │
│  EVM RPC Providers (Alchemy/Infura)          │
│  AWS KMS (transaction signing)               │
│  Merchant Webhook Endpoints                  │
└──────────────────────────────────────────────┘
```

**Key Business Flows**:
1. Payment Creation → Blockchain Monitoring → Confirmation → Webhook → Merchant
2. Refund Request → Spending Limit Check → KMS Signing → Blockchain Submission → Confirmation → Webhook
3. Webhook Delivery → Retry with Exponential Backoff → Circuit Breaker

---

## Critical Issues (Top 10)

### Issue #1: Spending Limit Bypass via Concurrent Requests

**Description**: The hot wallet spending limit check and recording are not atomic. Two concurrent refund requests can both pass the check before either records its spend.

**File/Location**: `apps/api/src/services/blockchain-transaction.service.ts:208-241`

**Impact**:
- Severity: **Critical**
- Likelihood: **Medium** (requires concurrent requests)
- Blast Radius: **Organization-wide** (fund drainage)

**Exploit Scenario**:
1. Attacker sends two refund requests for $5,000 each simultaneously
2. Request A checks spending limit: $0 spent, $10,000 limit → PASS
3. Request B checks spending limit: $0 spent, $10,000 limit → PASS
4. Both execute, total $10,000 spent in what should be a $10,000/day limit
5. Repeat to drain wallet beyond limits

**Fix**:
```typescript
// Use atomic Redis operation
const result = await redis.eval(`
  local current = tonumber(redis.call('GET', KEYS[1]) or 0)
  local limit = tonumber(ARGV[1])
  local amount = tonumber(ARGV[2])
  if current + amount > limit then
    return {0, current}
  end
  redis.call('INCRBY', KEYS[1], amount)
  redis.call('EXPIRE', KEYS[1], ARGV[3])
  return {1, current + amount}
`, 1, spendingKey, limitCents, amountCents, ttlSeconds);
```

---

### Issue #2: Nonce Manager TOCTOU Race Condition

**Description**: The Redis lock release in NonceManager uses a non-atomic check-then-delete pattern. Between checking the lock value and deleting it, another process could acquire the lock.

**File/Location**: `apps/api/src/services/nonce-manager.service.ts:101-107`

**Impact**:
- Severity: **High**
- Likelihood: **Low** (requires exact timing in 30s window)
- Blast Radius: **Product-wide** (failed blockchain transactions)

**Exploit Scenario**:
1. Process A holds lock with value "abc123", lock is about to expire
2. Process A reads lock value: "abc123" → matches
3. Lock expires, Process B acquires lock with value "def456"
4. Process A deletes the lock (which now belongs to Process B)
5. Process C acquires lock while Process B thinks it's still held
6. Both B and C use same nonce → one transaction fails

**Fix**:
```typescript
// Atomic compare-and-delete via Lua script
private static readonly UNLOCK_SCRIPT = `
  if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
  end
  return 0
`;

// In finally block:
await this.redis.eval(NonceManager.UNLOCK_SCRIPT, 1, lockKey, lockValue);
```

---

### Issue #3: Floating-Point Precision Loss in Payment Verification

**Description**: After computing payment amount with Decimal.js for precision, the code converts to JavaScript Number via `.toNumber()`, losing precision for amounts near IEEE 754 boundaries.

**File/Location**: `apps/api/src/services/blockchain-monitor.service.ts:194`

**Impact**:
- Severity: **High**
- Likelihood: **Low** (edge case with very large or precise amounts)
- Blast Radius: **Feature-specific** (payment verification)

**Exploit Scenario**:
1. Payment for 99999999.999999 USDC created
2. Blockchain transfer matches exactly
3. `new Decimal(amountWei).dividedBy(10^6).toNumber()` → 100000000 (rounding)
4. Comparison fails: 100000000 !== 99999999.999999
5. Valid payment rejected

**Fix**:
```typescript
// BEFORE (vulnerable):
const amountUsd = new Decimal(amountWei.toString())
  .dividedBy(new Decimal(10).pow(decimals))
  .toNumber();

// AFTER (precise):
const amountUsd = new Decimal(amountWei.toString())
  .dividedBy(new Decimal(10).pow(decimals));
// Use Decimal comparison throughout:
if (amountUsd.greaterThanOrEqualTo(paymentSession.amount)) { ... }
```

---

### Issue #4: Missing Refund Idempotency on Blockchain

**Description**: The `executeRefund()` method in BlockchainTransactionService has no idempotency key tracking. Network retries or duplicate requests can cause the same refund to be submitted to the blockchain twice.

**File/Location**: `apps/api/src/services/blockchain-transaction.service.ts:297-460`

**Impact**:
- Severity: **High**
- Likelihood: **Medium** (network timeouts common in blockchain)
- Blast Radius: **Organization-wide** (double-spending)

**Exploit Scenario**:
1. Refund request times out at HTTP level (client receives 504)
2. Client retries the same refund
3. Original request was already submitted to blockchain
4. Second request also submitted — two blockchain transactions for one refund
5. Double the refund amount sent

**Fix**:
```typescript
// Add idempotency key parameter
async executeRefund(params: RefundParams, idempotencyKey?: string): Promise<Result> {
  if (idempotencyKey) {
    const existing = await this.redis.get(`refund_idem:${idempotencyKey}`);
    if (existing) return JSON.parse(existing);
  }
  // ... execute refund ...
  if (idempotencyKey) {
    await this.redis.set(`refund_idem:${idempotencyKey}`, JSON.stringify(result), 'EX', 86400);
  }
}
```

---

### Issue #5: Password Reset Token Logged in Production

**Description**: Password reset tokens are included in structured log output. In production, logs are shipped to ELK/Splunk/CloudWatch and retained for months.

**File/Location**: `apps/api/src/routes/v1/auth.ts:458-462`

**Impact**:
- Severity: **High**
- Likelihood: **Medium** (requires log access)
- Blast Radius: **Feature-specific** (account takeover)

**Exploit Scenario**:
1. User requests password reset
2. Token logged: `{"userId": "...", "email": "user@example.com", "token": "abc123..."}`
3. Attacker with log access (internal threat, log breach) reads token
4. Within 1-hour TTL, attacker resets user's password
5. Account fully compromised

**Fix**:
```typescript
// BEFORE (vulnerable):
logger.info('Password reset token generated', {
  userId: user.id,
  email: user.email,
  token,  // NEVER log tokens
});

// AFTER (secure):
logger.info('Password reset token generated', {
  userId: user.id,
  email: user.email,
  // Token sent via email, never logged
});
```

---

### Issue #6: SSE Endpoint Missing Rate Limiting

**Description**: The Server-Sent Events endpoint for real-time payment updates has no rate limiting or connection cap. All other endpoints are rate-limited.

**File/Location**: `apps/api/src/routes/v1/payment-sessions.ts:404-521`

**Impact**:
- Severity: **High**
- Likelihood: **Medium** (requires valid auth token)
- Blast Radius: **Product-wide** (server resource exhaustion)

**Exploit Scenario**:
1. Attacker obtains valid SSE token (requires authentication)
2. Opens 10,000 concurrent SSE connections
3. Each connection consumes memory for heartbeat intervals
4. Server runs out of memory/file descriptors
5. All legitimate SSE connections dropped

**Fix**: Add connection limiting per user and global cap:
```typescript
fastify.get('/:id/events', {
  config: {
    rateLimit: {
      max: 5,        // 5 SSE connections per user
      timeWindow: '1 minute'
    }
  }
}, async (request, reply) => { ... });
```

---

### Issue #7: Refunded Amount Serialized as Decimal Object

**Description**: Webhook payload includes `refunded_amount` as a Decimal.js object instead of a number, causing malformed JSON delivery to merchants.

**File/Location**: `apps/api/src/services/refund.service.ts:737`

**Impact**:
- Severity: **High**
- Likelihood: **High** (every refund webhook affected)
- Blast Radius: **Feature-specific** (webhook data integrity)

**Exploit Scenario**:
1. Refund processed successfully
2. Webhook payload built with `refunded_amount: totalRefunded` (Decimal object)
3. JSON.stringify produces: `{"refunded_amount": {"d": [9,9,9,9], "e": 3, "s": 1}}`
4. Merchant webhook handler fails to parse amount
5. Merchant reconciliation breaks

**Fix**:
```typescript
// BEFORE:
refunded_amount: totalRefunded,

// AFTER:
refunded_amount: totalRefunded.toNumber(),
// Or for maximum precision:
refunded_amount: totalRefunded.toString(),
```

---

### Issue #8: JTI Blacklist Fails Open on Redis Outage

**Description**: When Redis is unavailable, the JTI (JWT ID) revocation check logs a warning and allows the request. Revoked tokens remain valid during Redis outages.

**File/Location**: `apps/api/src/plugins/auth.ts:28-48`

**Impact**:
- Severity: **Medium**
- Likelihood: **Low** (requires Redis failure)
- Blast Radius: **Product-wide** (session revocation bypassed)

**Exploit Scenario**:
1. User logs out, JTI stored in Redis blacklist
2. Redis goes down (maintenance, crash, network partition)
3. User's revoked JWT is presented
4. JTI check fails, catch block logs warning and continues
5. Revoked token accepted as valid for remaining JWT lifetime (15 min)

**Fix**: In production, treat Redis failure as hard error for security-critical operations:
```typescript
try {
  const revoked = await fastify.redis.get(`revoked_jti:${jti}`);
  if (revoked) throw new AppError(401, 'token-revoked', 'Token has been revoked');
} catch (error) {
  if (error instanceof AppError) throw error;
  if (process.env.NODE_ENV === 'production') {
    throw new AppError(503, 'service-unavailable', 'Authentication service temporarily unavailable');
  }
  logger.warn('JTI check skipped - Redis unavailable');
}
```

---

### Issue #9: IANA Reserved IP Ranges Not Blocked in SSRF Protection

**Description**: The URL validator blocks private (RFC 1918), loopback, and link-local ranges but misses multicast (224.0.0.0/4), reserved (240.0.0.0/4), and broadcast addresses.

**File/Location**: `apps/api/src/utils/url-validator.ts:94-97`

**Impact**:
- Severity: **Medium**
- Likelihood: **Low** (requires multicast-routed infrastructure)
- Blast Radius: **Feature-specific** (SSRF via non-standard ranges)

**Exploit Scenario**:
1. Attacker registers webhook URL pointing to 224.0.0.1 (multicast)
2. SSRF filter passes (not in blocked ranges)
3. Webhook delivery sends HTTP request to multicast address
4. Depending on network config, could reach internal services

**Fix**:
```typescript
// Add to isPrivateIP():
// 224.0.0.0/4 - Multicast
if (first >= 224 && first <= 239) return true;
// 240.0.0.0/4 - Reserved
if (first >= 240) return true;
```

---

### Issue #10: Refund Error Messages Leak Infrastructure Details

**Description**: When refund processing fails, the raw error message is included in webhook payloads. This can contain AWS KMS ARNs, account IDs, or RPC provider URLs.

**File/Location**: `apps/api/src/services/refund.service.ts:400-412, 476-490`

**Impact**:
- Severity: **Medium**
- Likelihood: **Medium** (every failed refund)
- Blast Radius: **Feature-specific** (information disclosure)

**Exploit Scenario**:
1. Refund fails due to KMS timeout
2. Error: `"KMS SignOperation failed: arn:aws:kms:us-east-1:123456789:key/abc-def timeout"`
3. Webhook delivers error to merchant endpoint
4. Attacker discovers AWS account ID, region, and key ARN

**Fix**:
```typescript
// Sanitize errors before webhook inclusion
function sanitizeError(error: string): string {
  return error
    .replace(/arn:aws:[^\s]+/g, '[REDACTED_ARN]')
    .replace(/\d{12}/g, '[REDACTED_ACCOUNT]')
    .replace(/https?:\/\/[^\s]+/g, '[REDACTED_URL]');
}
```

---

## Architecture Problems

### 1. Audit Log Service Uses In-Memory Storage

**Problem**: `AuditLogService` stores entries in `private entries: AuditEntry[] = []`. On process restart, all audit history is lost.
**File**: `apps/api/src/services/audit-log.service.ts:75-125`
**Impact**: No persistent audit trail for compliance, security investigations, or incident response. Fatal for a financial services product.
**Solution**: Persist to dedicated database table (schema already exists in `AuditLog` model). Write entries synchronously to database.

### 2. Worker Health Check Missing

**Problem**: Refund processing worker has no health/liveness probe. If the worker hangs on a database lock or blockchain call, it appears healthy but processes nothing.
**File**: `apps/api/src/workers/refund-processing.worker.ts:29-197`
**Impact**: Refunds stuck in PENDING indefinitely. Requires manual intervention.
**Solution**: Add per-refund timeout and expose worker health status.

### 3. Encryption Key Derivation Redundant

**Problem**: `WEBHOOK_ENCRYPTION_KEY` is validated as 64 hex chars (32 bytes) but then hashed with SHA-256 to derive the key. The hash treats the hex string as ASCII, not binary.
**File**: `apps/api/src/utils/encryption.ts:64-66`
**Impact**: Security is not reduced, but the operation is unnecessary and slightly confusing.
**Solution**: `Buffer.from(keyString, 'hex')` instead of `crypto.createHash('sha256').update(keyString).digest()`.

### 4. Inconsistent Pagination in Refunds Route

**Problem**: The refunds list endpoint defines its own local schemas instead of using centralized schemas from `validation.ts`. Response format differs from other list endpoints.
**File**: `apps/api/src/routes/v1/refunds.ts:29-34, 99-102`
**Impact**: Inconsistent API contract. Clients must handle two different pagination response formats.
**Solution**: Use `listRefundsQuerySchema` from `validation.ts` with proper defaults and return standard `{ data, pagination: { limit, offset, total, has_more } }` format.

---

## Security Findings

### Authentication & Authorization

| Finding | Severity | File | CWE |
|---------|----------|------|-----|
| JTI blacklist fails open on Redis outage | Medium | `plugins/auth.ts:28-48` | CWE-287 |
| Refunds list requires `read` but not `refund` permission | Medium | `routes/v1/refunds.ts:85` | CWE-863 |
| Logout endpoint has no request body validation | Low | `routes/v1/auth.ts:302-365` | CWE-20 |
| API_KEY_HMAC_SECRET not enforced at startup | Medium | `utils/crypto.ts:24-34` | CWE-327 |

### Data Security

| Finding | Severity | File | CWE |
|---------|----------|------|-----|
| Password reset token logged | High | `routes/v1/auth.ts:458-462` | CWE-532 |
| Refund error messages leak infrastructure details | Medium | `services/refund.service.ts:400-412` | CWE-209 |
| URL validator leaks resolved IP in error messages | Low | `utils/url-validator.ts:228` | CWE-209 |
| Logger does not auto-redact PII | Low | `utils/logger.ts:14-27` | CWE-532 |

### API Security

| Finding | Severity | File | CWE |
|---------|----------|------|-----|
| SSE endpoint has no rate limiting | High | `routes/v1/payment-sessions.ts:404-521` | CWE-770 |
| CORS allows null origin with credentials | Medium | `app.ts:66-84` | CWE-942 |
| Metrics endpoint unauthenticated in dev | Medium | `plugins/observability.ts:174-224` | CWE-306 |
| Missing multicast/reserved IP in SSRF filter | Medium | `utils/url-validator.ts:94-97` | CWE-918 |

### Infrastructure

| Finding | Severity | File | CWE |
|---------|----------|------|-----|
| Webhook encryption optional at startup | Medium | `index.ts:16-20` | CWE-311 |
| No container image scanning in CI/CD | Medium | `deploy-production.yml` | CWE-1395 |
| Database backup placeholder not implemented | Low | `deploy-production.yml:78-82` | N/A |

---

## Performance & Scalability

### 1. Missing Timeout in Blockchain RPC Calls

**Issue**: `getTransactionReceipt()` has no explicit timeout. Slow or hung RPC providers block indefinitely.
**File**: `apps/api/src/services/blockchain-monitor.service.ts:110-285`
**Impact**: Payment verification worker threads exhausted during RPC outages.
**Fix**: Wrap with `Promise.race()` and 5-second timeout.

### 2. Nonce Gap Handling

**Issue**: When tracked nonce falls behind blockchain pending nonce, code jumps forward but doesn't handle stuck intermediate transactions.
**File**: `apps/api/src/services/nonce-manager.service.ts:85-88`
**Impact**: Stuck transactions at intermediate nonces prevent subsequent transactions.
**Fix**: Add monitoring for nonce gaps > 2 and automatic replacement transaction logic.

### 3. Request Size Limiting Incomplete

**Issue**: Body limit set to 1MB but query string, headers, and URL length are not explicitly limited.
**File**: `apps/api/src/app.ts:28-29`
**Impact**: Memory exhaustion via very large URLs or headers.
**Fix**: Add `maxParamLength` and `maxHeaderSize` to Fastify server options.

---

## Testing Gaps

### Coverage Summary

| Category | Files | Tests | Coverage |
|----------|-------|-------|----------|
| Integration | 22 | 200+ | Excellent |
| Services | 20+ | 300+ | Excellent |
| Routes | 6 | 80+ | Good |
| Unit | 8 | 90+ | Good |
| Plugins | 4 | 40+ | Good |
| Workers | 2 | 30+ | Moderate |
| CI | 2 | 20+ | Good |
| Schema | 1 | 3 | Adequate |
| **Total** | **65+** | **770+** | **80%+** |

### Strengths

- **Real database integration** — no mock abuse. All integration tests use actual PostgreSQL and Redis.
- **Security-focused tests** — permission boundaries, rate limit isolation, token expiration, SSRF.
- **Race condition tests** — concurrent payment and refund tests with real DB locks.
- **Rate limit test isolation** — unique User-Agent per describe block prevents bucket collisions.
- **Proper cleanup** — all tests include `afterAll` with `app.close()`.

### Missing Scenarios

1. **Redis failure paths** — no tests for Redis connection loss during auth, rate limiting, or circuit breaker
2. **KMS timeout handling** — no tests for AWS KMS being slow or unavailable
3. **Blockchain RPC 502/timeout** — no tests for provider failure during payment verification
4. **Worker integration test** — worker tests mock everything; need one real-DB worker test
5. **Error path matrix** — most tests verify happy paths with limited error scenario coverage
6. **E2E tests in CI** — not currently run in CI pipeline

---

## DevOps Issues

### CI/CD Pipeline

| Check | Status | File |
|-------|--------|------|
| Tests run before deploy | PASS | `ci.yml:66-73` |
| Lint enforcement | PASS | `deploy-production.yml:68-70` |
| Security scanning (npm audit) | PASS | `ci.yml:145-176` |
| Pre-flight gate before production | PASS | `deploy-production.yml:58-70` |
| Container image scanning | **MISSING** | `deploy-production.yml` |
| Coverage threshold enforcement | **MISSING** | `ci.yml:75-80` |
| Database backup before migration | **PLACEHOLDER** | `deploy-production.yml:78-82` |
| Post-deployment smoke tests | **PLACEHOLDER** | `deploy-production.yml:160-164` |
| Rollback strategy | Manual (git tag) | `deploy-production.yml:175` |

### Recommendations

1. Add Trivy container scanning before ECR push
2. Enforce 80% coverage minimum in CI with codecov threshold
3. Implement database backup script (or document RDS snapshot policy)
4. Add post-deployment E2E smoke test suite
5. Replace regex-based secret detection with `gitleaks` GitHub Action

---

## AI-Readiness Score

**Score: 8.5 / 10**

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Modularity** | 2.0/2 | Clean layered architecture. Services, routes, utils, workers are independent. Agents can modify one layer without affecting others. |
| **API Design** | 1.5/2 | Strong Zod schemas, consistent REST patterns. Minor inconsistency in refunds pagination format. |
| **Testability** | 2.0/2 | Real database integration tests. Agents can write a test, run it, and verify behavior immediately. No mock setup required. |
| **Observability** | 1.5/2 | Structured logging, metrics endpoint, audit log. Missing: auto-PII redaction, distributed tracing (OpenTelemetry). |
| **Documentation** | 1.5/2 | Good PRD, README, SECURITY.md. Code comments explain security decisions. Missing: API reference (OpenAPI spec). |

**Recommendations for Improving AI-Readiness**:
- Generate OpenAPI spec from Zod schemas for agent-consumable API docs
- Add OpenTelemetry tracing for cross-service debugging
- Create `.claude/addendum.md` with product-specific context for audit agents

---

## Technical Debt Map

### High-Interest Debt (fix ASAP)

| Debt | Interest | Payoff |
|------|----------|--------|
| Audit log in-memory only | Every restart loses compliance data | Persistent audit trail for investigations |
| Spending limit race condition | Active vulnerability in production | Prevents fund drainage |
| No refund idempotency | Every network retry risks double-spend | Safe retry handling |

### Medium-Interest Debt (fix next quarter)

| Debt | Interest | Payoff |
|------|----------|--------|
| Refunds route uses local schemas | API inconsistency, maintenance burden | Unified validation layer |
| No container scanning in CI | Undetected CVEs in base images | Automated vulnerability detection |
| Worker lacks health check | Silent failures require manual intervention | Self-healing infrastructure |
| Missing RPC timeout | Hung connections during outages | Graceful degradation |

### Low-Interest Debt (monitor)

| Debt | Interest | Payoff |
|------|----------|--------|
| Magic numbers in blockchain service | Minor readability issue | Self-documenting constants |
| Recovery param not cached in KMS | Slight CPU waste per signing | Marginal performance gain |
| No E2E tests in CI | Manual verification needed | Full automation |

---

## Refactoring Roadmap

### 30-Day Plan (Critical Fixes)

1. **Fix spending limit race condition** — Atomic Redis check-and-increment. Prevents fund drainage.
2. **Add refund idempotency** — Redis-based dedup key for blockchain transactions. Prevents double-spend.
3. **Fix nonce manager TOCTOU** — Lua script for atomic compare-and-delete. Prevents duplicate nonces.
4. **Remove password reset token from logs** — One-line fix. Prevents account takeover.
5. **Fix Decimal serialization in webhooks** — Add `.toNumber()` call. Fixes merchant integration.
6. **Add SSE rate limiting** — Configure Fastify rate limit on SSE endpoint. Prevents DoS.
7. **Persist audit log to database** — Write to AuditLog table. Enables compliance.

### 60-Day Plan (Important Improvements)

1. **Add container image scanning** — Trivy in deploy-production.yml
2. **Enforce coverage threshold** — 80% minimum in CI
3. **Add RPC timeout** — Promise.race wrapper for blockchain calls
4. **Fix SSRF multicast ranges** — Add 224.0.0.0/4 and 240.0.0.0/4
5. **Sanitize refund error webhooks** — Strip AWS ARNs and account IDs
6. **Add worker health checks** — Liveness probe with per-refund timeout
7. **Unify refunds route schemas** — Use centralized validation.ts

### 90-Day Plan (Strategic Improvements)

1. **Add OpenTelemetry tracing** — Distributed tracing across services
2. **Generate OpenAPI spec** — From Zod schemas for documentation
3. **Add E2E smoke tests to CI** — Post-deployment verification
4. **Implement PII redaction in logger** — Automatic pattern matching
5. **Add nonce gap monitoring** — Alert on gaps > 2
6. **Load testing suite** — k6 scripts for rate limiting validation

---

## Quick Wins (1-Day Fixes)

1. **Remove token from password reset log** — `auth.ts:462` — delete `token` from log object
2. **Fix Decimal.toNumber() in refund webhook** — `refund.service.ts:737` — add `.toNumber()`
3. **Add multicast IP range to SSRF filter** — `url-validator.ts:94-97` — 2 lines
4. **Redact resolved IP from error message** — `url-validator.ts:228` — replace `(${ip})` with generic text
5. **Add refund pagination defaults** — `refunds.ts:31-32` — add `.default(50)` and `.default(0)`
6. **Add `noSniff` to Helmet config** — `app.ts:45-59` — explicit header setting
7. **Fix encryption key derivation** — `encryption.ts:64-66` — use `Buffer.from(key, 'hex')`
8. **Add metrics endpoint to rate limit allowlist** — `app.ts:108-111` — add path check
9. **Use timing-safe comparison for internal API key** — `observability.ts:184` — `crypto.timingSafeEqual()`
10. **Add body validation to logout endpoint** — `auth.ts:302` — wrap with `z.object({ refresh_token: z.string() })`

---

## Scores Summary

| Category | Score |
|----------|-------|
| Security | 8/10 |
| Architecture | 8.5/10 |
| Test Coverage | 9/10 |
| AI-Readiness | 8.5/10 |
| DevOps | 7.5/10 |
| **Overall** | **8.3/10** |

---

*Report generated by Code Reviewer Agent on 2026-01-31*
*Methodology: 6-phase audit (System Understanding → Static Analysis → Risk Analysis → Architecture Evaluation → Security Review → Recommendations)*
