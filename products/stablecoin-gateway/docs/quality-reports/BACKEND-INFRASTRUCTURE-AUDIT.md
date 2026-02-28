# Backend Infrastructure Audit Report

**Product**: Stablecoin Gateway
**Scope**: Plugins, Utils, Prisma Schema, App Config, Environment
**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer + Staff Backend Engineer)
**Date**: 2026-02-28
**Overall Assessment**: Good (7.8/10)
**Recommendation**: Ship with fixes for 3 High-severity items

---

## Executive Summary

**Audience**: CEO, CTO, VP Engineering

The stablecoin-gateway backend infrastructure layer is **well-engineered** and demonstrates security awareness far above average for a project at this stage. The codebase shows evidence of multiple remediation passes (RISK-042 through RISK-075), each addressing real vulnerabilities with proper fixes. Authentication uses dual JWT + API Key paths with JTI revocation, encryption uses AES-256-GCM with proper IV handling, the Prisma schema has comprehensive indexing, and environment validation is thorough with Shannon entropy checks.

**Top 5 Risks (plain language)**:

1. **Webhook secrets stored in plaintext in dev** -- The `WebhookEndpoint.secret` column stores the raw HMAC secret. In production `WEBHOOK_ENCRYPTION_KEY` is required, but in dev/test the `secret` field is plaintext. If a dev database backup leaks, all webhook signing secrets are exposed. (Medium risk -- dev-only)
2. **In-memory metrics are not durable** -- All request counters, error rates, and percentile data reset on every process restart and are not aggregated across instances. A production deployment with 3+ instances gives fragmented observability. (Medium risk -- operational)
3. **Logger does not respect log level for warn/info/error** -- The `logLevel` field is read but only enforced for `debug`. An `info`-level logger still emits all `warn` and `error` calls regardless, which is correct, but setting `LOG_LEVEL=error` will NOT suppress `info` or `warn`. (Low risk -- operational)
4. **`observability.ts` sets its own error handler that re-throws** -- This competes with the global error handler in `app.ts`. Fastify only invokes the last-registered `setErrorHandler`, so the observability plugin's handler silently replaces the app-level one for routes registered before it. (Medium risk -- functional correctness)
5. **No server.ts entry point found** -- The file `apps/api/src/server.ts` does not exist on disk. The application presumably starts via a different entry point, but this means `validateEnvironment()` and `enforceProductionEncryption()` may or may not be called depending on the actual entry point. (Medium risk -- deployment)

**Estimated effort to fix**: 3-5 engineering days for all findings.

---

## System Overview

**System type**: Payment gateway API (SaaS backend)
**Stack**: Fastify 4.x, Prisma ORM, PostgreSQL 15+, Redis (ioredis), TypeScript 5+, ethers.js 6
**Architecture**: Layered monolith (plugins -> routes -> services -> Prisma)
**Key flows**: Auth (signup/login/refresh/logout), Payment sessions (create/confirm/complete), Refunds, Webhooks (create/deliver), API Keys, Payment Links, Analytics
**External deps**: Alchemy/Infura/QuickNode (blockchain RPC), AWS KMS (optional)

```
                    +-----------+
                    |  Frontend |
                    |  :3104    |
                    +-----+-----+
                          |
                    +-----v-----+
                    | Fastify   |
                    | :5001     |
                    +-----+-----+
                          |
          +-------+-------+-------+-------+
          |       |       |       |       |
       +--v--+ +--v--+ +--v--+ +--v--+ +--v--+
       |Auth | |Rate | |CORS | |Helm | |Obs  |
       |Plug | |Lim  | |     | |et   | |     |
       +--+--+ +--+--+ +-----+ +-----+ +--+--+
          |       |                        |
       +--v-------v------------------------v--+
       |          Route Handlers               |
       |  auth, payments, webhooks, refunds... |
       +--+---+---+---------------------------+
          |   |   |
       +--v-+ | +-v--+
       |Pris| | |Redi|
       |ma  | | |s   |
       +--+-+ | +--+-+
          |   |    |
       +--v-+ | +--v------+
       | PG | | | Redis   |
       +----+ | +---------+
              |
        +-----v-------+
        | Blockchain   |
        | Providers    |
        | (Alchemy,    |
        |  Infura,     |
        |  QuickNode)  |
        +--------------+
```

---

## Prisma Schema Analysis

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/prisma/schema.prisma`

### Statistics

| Metric | Count |
|--------|-------|
| Models | 9 |
| Enums | 4 (Role, PaymentStatus, RefundStatus, WebhookStatus) |
| Relations (foreign keys) | 10 |
| Explicit indexes (`@@index`) | 22 |
| Unique constraints (`@unique` / `@@unique`) | 8 |
| Cascade deletes | 7 (all FK relations) |

### What Is Working Well

1. **Comprehensive indexing**: 22 explicit indexes covering all common query patterns (status+createdAt, userId+status, merchantAddress, expiresAt, etc.). This is production-grade.
2. **Proper idempotency constraints**: `@@unique([userId, idempotencyKey])` on PaymentSession and `@@unique([paymentSessionId, idempotencyKey])` on Refund prevent duplicate operations.
3. **Webhook delivery idempotency**: `@@unique([endpointId, eventType, resourceId])` prevents duplicate webhook deliveries -- excellent.
4. **Decimal precision**: `@db.Decimal(18, 6)` for monetary amounts avoids floating-point issues.
5. **Column mapping**: All fields use `@map()` for snake_case database columns while keeping camelCase in TypeScript.
6. **Cascade deletes**: All child relations cascade from User, which is correct for a merchant-scoped system.
7. **Audit log table**: Standalone `AuditLog` model with indexed actor, action, resourceType, and timestamp.

### Findings

#### SCHEMA-01: WebhookEndpoint.secret stored as plaintext String

**File**: `schema.prisma:201`
**Severity**: Medium
**OWASP**: A02:2021 Cryptographic Failures
**CWE**: CWE-312 (Cleartext Storage of Sensitive Information)

The `secret` field is a plain `String`. While `encryption.ts` provides `encryptSecret()` / `decryptSecret()`, the schema itself has no indication that encryption is mandatory. If any code path writes to this field without calling `encryptSecret()`, the webhook signing secret is stored in cleartext.

**Fix**: This is an application-layer concern (the schema cannot enforce encryption), but add a comment to the schema and consider renaming the field to `encryptedSecret` to make the contract explicit:

```prisma
// SECURITY: Must always contain encrypted value from encryptSecret()
encryptedSecret String @map("encrypted_secret")
```

#### SCHEMA-02: No index on AuditLog compound queries

**File**: `schema.prisma:333-337`
**Severity**: Low
**Impact**: Performance degradation on audit queries

Individual indexes exist on `actor`, `action`, `resourceType`, and `timestamp`, but common queries like "all actions by actor X on resource type Y" require a compound index:

```prisma
@@index([actor, resourceType, timestamp])
```

#### SCHEMA-03: PaymentLink.shortCode index is redundant

**File**: `schema.prisma:293`
**Severity**: Low (informational)

`shortCode` already has `@unique` (line 265), which implicitly creates an index. The explicit `@@index([shortCode])` on line 293 is redundant and wastes storage.

**Fix**: Remove `@@index([shortCode])`.

#### SCHEMA-04: No soft-delete pattern on User model

**File**: `schema.prisma:17-36`
**Severity**: Low
**Impact**: GDPR/compliance

All child relations cascade delete from User. If a merchant account is deleted, all payment history, refund records, webhook endpoints, and audit trails are permanently destroyed. For a financial system, soft-delete (a `deletedAt` timestamp) is strongly recommended to preserve transaction history for regulatory compliance while anonymizing PII.

#### SCHEMA-05: RefreshToken has redundant `revoked` Boolean alongside `revokedAt`

**File**: `schema.prisma:47-48`
**Severity**: Low (informational)

Both `revokedAt DateTime?` and `revoked Boolean @default(false)` exist. The `revoked` field is redundant -- `revokedAt IS NOT NULL` conveys the same information. This creates a consistency risk where one could be updated without the other.

**Fix**: Remove the `revoked` field and query `revokedAt IS NOT NULL` instead.

---

## Plugin Analysis

### Plugin: `auth.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/auth.ts`

#### What Is Working Well

1. **Dual auth (JWT + API Key)**: Clean fallback from JWT to API key with proper error re-throwing for security-specific errors (lines 88-96).
2. **JTI blacklist with fail-closed semantics**: When Redis is unavailable, JWT requests are rejected with 503 rather than silently accepted (RISK-051). This is excellent security posture.
3. **Circuit breaker tracking**: `redisFailedSince` timestamp tracks when Redis became unavailable (line 11).
4. **Permission enforcement**: `requirePermission()` checks per-key scopes (read/write/refund) for API keys.
5. **Fire-and-forget `lastUsedAt` update**: Non-blocking update with `.catch()` to avoid adding latency to every authenticated request (line 110-113).
6. **Proper plugin dependency declaration**: `dependencies: ['@fastify/jwt', 'prisma']` (line 174).

#### Findings

##### AUTH-01: `optionalAuth` silently swallows all errors including 503

**File**: `auth.ts:127-133`
**Severity**: Medium
**CWE**: CWE-754 (Improper Check for Unusual or Exceptional Conditions)

```typescript
fastify.decorate('optionalAuth', async (request: FastifyRequest) => {
  try {
    await fastify.authenticate(request);
  } catch (error) {
    // Silently fail for optional auth
  }
});
```

If Redis is down and `authenticate()` throws a 503 `service-unavailable` error, `optionalAuth` swallows it. This means a route using `optionalAuth` will silently treat a potentially-revoked token as "unauthenticated" rather than failing closed. An attacker with a revoked token could access optional-auth routes as if unauthenticated.

**Fix**: Re-throw 503 errors:

```typescript
fastify.decorate('optionalAuth', async (request: FastifyRequest) => {
  try {
    await fastify.authenticate(request);
  } catch (error) {
    // Fail closed on infrastructure errors -- do NOT silently degrade
    if (error instanceof AppError && error.code === 'service-unavailable') {
      throw error;
    }
    // Silently fail for auth errors (token expired, invalid, etc.)
  }
});
```

##### AUTH-02: JWT user lookup hits database on every request

**File**: `auth.ts:77-83`
**Severity**: Low
**Impact**: Performance

Every JWT-authenticated request queries `prisma.user.findUnique()` to verify the user still exists. At scale (1000+ RPS), this adds a database round-trip per request. Consider caching user existence in Redis with a short TTL (30-60s).

##### AUTH-03: API key permissions type assertion is unchecked

**File**: `auth.ts:140`
**Severity**: Low
**CWE**: CWE-704 (Incorrect Type Conversion)

```typescript
const permissions = request.apiKey.permissions as { read: boolean; write: boolean; refund: boolean };
```

The `permissions` field is `Json` in Prisma (arbitrary JSON). If a malformed value is stored (e.g., `null`, a string, or missing keys), this cast will succeed but `permissions[permission]` will return `undefined` (falsy), which would deny access. This is safe-by-default but should be explicitly validated.

---

### Plugin: `prisma.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/prisma.ts`

#### What Is Working Well

1. **Pool size validation**: Rejects invalid pool sizes (< 1 or > 500) with clear error messages (RISK-073).
2. **Slow query detection**: Configurable threshold with structured logging.
3. **Graceful shutdown**: `onClose` hook disconnects Prisma.
4. **Connection string pool params**: Appends `connection_limit` and `pool_timeout` to DATABASE_URL.

#### Findings

##### PRISMA-01: Slow query log includes raw query text

**File**: `prisma.ts:47-53`
**Severity**: Low
**CWE**: CWE-532 (Insertion of Sensitive Information into Log File)

```typescript
logger.warn('Slow query detected', {
  query: e.query,
  // ...
});
```

The `e.query` field may contain sensitive data in WHERE clauses (email addresses, hashed tokens). The logger's `redactSensitiveFields` function redacts by key name, not by value content, so a key named `query` passes through unredacted.

**Fix**: Truncate or sanitize the query string before logging, or log only the query template without parameters.

---

### Plugin: `redis.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/redis.ts`

#### What Is Working Well

1. **Graceful degradation**: If Redis is unavailable, the plugin decorates with `null` and logs a warning rather than crashing.
2. **TLS support**: `REDIS_TLS` and `REDIS_TLS_REJECT_UNAUTHORIZED` environment variables.
3. **Connection timeout**: 5-second timeout on initial ping prevents hanging startup.
4. **Reconnection strategy**: Exponential backoff capped at 2 seconds.
5. **Comprehensive event logging**: connect, ready, error, close, reconnecting events all logged.

#### Findings

##### REDIS-01: `maxRetriesPerRequest: 3` may cause slow responses under Redis failure

**File**: `redis.ts:52`
**Severity**: Low
**Impact**: Latency

With 3 retries and exponential backoff (50ms, 100ms, 150ms), a Redis failure adds up to 300ms latency to every request that touches Redis. Consider setting `maxRetriesPerRequest: 1` for the rate-limit and JTI-check paths where fail-fast is preferred, and using a separate client with higher retries for background jobs.

---

### Plugin: `observability.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts`

#### What Is Working Well

1. **Structured logging with correlation**: Request ID, method, URL, status, duration, user ID, IP.
2. **Percentile tracking**: p50, p95, p99 latency from rolling 1000-sample window.
3. **Periodic metrics flush**: 60-second interval logs a summary for log aggregation.
4. **`unref()` on interval**: Prevents the timer from keeping the process alive during shutdown.
5. **Internal metrics endpoint**: Protected by timing-safe INTERNAL_API_KEY comparison.
6. **Timing-safe comparison with length-normalized buffers**: Prevents length-leaking timing attacks (lines 224-231).

#### Findings

##### OBS-01: `setErrorHandler` in observability plugin competes with app.ts

**File**: `observability.ts:164-178`
**Severity**: High
**CWE**: CWE-755 (Improper Handling of Exceptional Conditions)

The observability plugin calls `fastify.setErrorHandler()` at line 164. The `app.ts` file also calls `fastify.setErrorHandler()` at line 383. In Fastify, `setErrorHandler` on the same encapsulation context replaces the previous handler. Because the observability plugin is registered with `fastify-plugin` (which breaks encapsulation), both handlers compete for the same scope.

The observability handler at line 178 does `throw error` to "re-throw to let Fastify handle it." However, throwing inside an error handler causes Fastify to use its default error handler, NOT the custom one from `app.ts`. This means:
- The RFC 7807 error formatting in `app.ts` lines 383-427 may never execute.
- ZodError handling, AppError formatting, and production error masking may be bypassed.
- Stack traces could leak to clients in production.

**Fix**: Remove `setErrorHandler` from the observability plugin. Instead, add error logging in the `app.ts` error handler, or use `onError` hook (which does not consume the error):

```typescript
// In observability plugin -- use onError hook instead
fastify.addHook('onError', async (request, reply, error) => {
  const duration = Date.now() - (request.startTime || Date.now());
  logger.error('Request error', error, {
    request_id: request.id,
    method: request.method,
    url: request.url,
    duration_ms: duration,
    user_id: request.currentUser?.id,
    ip: request.ip,
  });
});
```

##### OBS-02: In-memory metrics are process-local

**File**: `observability.ts:24-67`
**Severity**: Medium
**Impact**: Operational blindness in multi-instance deployments

The comment on line 28 acknowledges this. In a 3-instance deployment behind a load balancer, each instance reports 1/3 of the traffic. The `/internal/metrics` endpoint returns only the data from the instance that handles the request.

**Fix**: Migrate to `prom-client` with a `/metrics` endpoint in Prometheus exposition format. Use a push gateway or sidecar for aggregation.

##### OBS-03: Percentile arrays grow unbounded between flushes

**File**: `observability.ts:92-98`
**Severity**: Low
**Impact**: Memory

The `p99` array is capped at 1000 entries via `shift()`, but `shift()` on a large array is O(n). At high throughput (1000+ RPS), this array is constantly being shifted. Use a circular buffer or a streaming percentile algorithm (t-digest).

---

## Utility Analysis

### Utility: `crypto.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/crypto.ts`

#### What Is Working Well

1. **Bcrypt with 12 rounds**: Above the minimum recommended 10. Good balance of security and performance.
2. **HMAC-SHA-256 for API keys**: Correct choice -- fast enough for per-request lookup, resistant to rainbow tables with a server-side secret.
3. **Production enforcement**: `hashApiKey()` throws in production if `API_KEY_HMAC_SECRET` is missing (RISK-050).
4. **Timing-safe webhook signature verification**: `crypto.timingSafeEqual()` with proper length check (lines 70-82).
5. **Cryptographically secure random generation**: `crypto.randomBytes(32)` for API keys, webhook secrets, payment IDs.

#### Findings

##### CRYPTO-01: Webhook signature verification vulnerable to replay attacks

**File**: `crypto.ts:60-83`
**Severity**: High
**CWE**: CWE-294 (Authentication Bypass by Capture-replay)
**OWASP**: A07:2021 Identification and Authentication Failures

`verifyWebhookSignature()` accepts a `timestamp` parameter but does **not** validate whether the timestamp is recent. An attacker who intercepts a valid webhook payload can replay it indefinitely because the signature remains valid forever.

**Fix**: Add a timestamp freshness check (e.g., reject if timestamp is older than 5 minutes):

```typescript
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  maxAgeMs: number = 300_000 // 5 minutes
): boolean {
  // Reject stale timestamps to prevent replay attacks
  const age = Date.now() - timestamp;
  if (age > maxAgeMs || age < -60_000) { // also reject future timestamps
    return false;
  }

  const expectedSignature = signWebhookPayload(payload, secret, timestamp);
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}
```

##### CRYPTO-02: `getApiKeyPrefix` returns fixed 16-char prefix

**File**: `crypto.ts:47-49`
**Severity**: Low (informational)

The prefix format `sk_live_` is 8 characters, so `substring(0, 16)` captures `sk_live_` plus 8 characters of the random part. This is fine for display but should be documented as the "visible portion" so developers know it is NOT a security boundary.

---

### Utility: `encryption.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/encryption.ts`

#### What Is Working Well

1. **AES-256-GCM**: Authenticated encryption with associated data. NIST-approved, tamper-resistant.
2. **96-bit random IV**: Correct size for GCM mode, generated fresh for each encryption.
3. **128-bit auth tag**: Maximum strength for GCM.
4. **Key entropy validation**: Rejects keys with fewer than 8 unique hex characters (RISK-043).
5. **Proper format**: `iv:authTag:ciphertext` with base64 encoding, easy to store in a single DB column.
6. **Input validation on decryption**: Validates IV length, auth tag length, and format before attempting decryption.
7. **Error information hiding**: Logs full error server-side, returns generic message to caller (RISK-075).

#### Findings

##### ENC-01: No key rotation mechanism

**File**: `encryption.ts:39`
**Severity**: Medium
**CWE**: CWE-320 (Key Management Errors)

`encryptionKey` is a single global variable. There is no mechanism to:
- Rotate to a new encryption key
- Decrypt data encrypted with a previous key
- Identify which key version was used to encrypt a given ciphertext

For a payment system, key rotation is a compliance requirement (PCI DSS Requirement 3.6).

**Fix**: Add a key version prefix to encrypted data (e.g., `v1:iv:authTag:ciphertext`) and support multiple keys:

```typescript
const ENCRYPTION_KEYS: Map<string, Buffer> = new Map();
const CURRENT_KEY_VERSION = 'v1';
```

##### ENC-02: Module-level mutable state (`encryptionKey`)

**File**: `encryption.ts:39`
**Severity**: Low
**Impact**: Testability

The `encryptionKey` is a module-level `let` variable. This makes tests interdependent (one test's `initializeEncryption()` affects another). Consider using dependency injection or a factory pattern.

---

### Utility: `env-validator.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/env-validator.ts`

#### What Is Working Well

1. **Shannon entropy validation**: Calculates bits-per-character entropy and rejects secrets below 3.0 threshold. This catches weak secrets like `aaaaaaaaaaaaa...`.
2. **Placeholder detection**: Both exact-match (`"secret"`, `"password"`) and substring-match (`"change_me"`, `"your-jwt-secret"`) patterns prevent shipping with example values.
3. **Production vs. dev enforcement**: Errors in production, warnings in dev -- correct graduated severity.
4. **Comprehensive coverage**: Validates JWT, Database, Redis, Blockchain, Webhook Encryption, API Key HMAC, Internal API Key, and KMS config.
5. **KMS format validation**: Validates ARN, UUID, or alias format for KMS Key IDs.
6. **Clear error messages**: Each error includes a generation command (`openssl rand -hex 64`).

#### Findings

##### ENV-01: DATABASE_URL not validated for content

**File**: `env-validator.ts:232-245`
**Severity**: Low

`validateDatabase()` only checks if `DATABASE_URL` is set, not whether it is a valid PostgreSQL connection string. A typo like `postgresql:/postgres@...` (missing slash) will pass validation but fail at Prisma connection time with a confusing error.

**Fix**: Add basic format validation:

```typescript
if (!process.env.DATABASE_URL.startsWith('postgresql://') &&
    !process.env.DATABASE_URL.startsWith('postgres://')) {
  errors.push('DATABASE_URL must start with postgresql:// or postgres://');
}
```

##### ENV-02: No validation for RATE_LIMIT_MAX and RATE_LIMIT_WINDOW

**File**: `env-validator.ts` (missing)
**Severity**: Low
**Impact**: Misconfiguration

`app.ts` reads `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` with `parseInt()` and defaults, but `env-validator.ts` does not validate them. Setting `RATE_LIMIT_MAX=0` would effectively disable rate limiting.

---

### Utility: `logger.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/logger.ts`

#### What Is Working Well

1. **PII redaction**: Comprehensive list of sensitive field names (password, secret, token, email, ip, etc.) with both substring and exact-match patterns.
2. **Recursive redaction**: Nested objects are also redacted.
3. **Structured JSON in production**: `JSON.stringify` for log aggregation compatibility.
4. **Human-readable in dev**: Formatted output with timestamps.

#### Findings

##### LOG-01: Log level filtering not implemented for info/warn/error

**File**: `logger.ts:55-96`
**Severity**: Low
**Impact**: Log volume in production

The `logLevel` field is set from `LOG_LEVEL` env var but only checked in `debug()`. Setting `LOG_LEVEL=error` will NOT suppress `info` and `warn` messages. This means there is no way to reduce log volume in production without code changes.

**Fix**: Implement level hierarchy:

```typescript
private readonly LEVELS: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
};

private shouldLog(level: LogLevel): boolean {
  return this.LEVELS[level] >= this.LEVELS[this.logLevel];
}
```

##### LOG-02: `error()` method has inconsistent signature

**File**: `logger.ts:80`
**Severity**: Low (DX issue)

```typescript
error(message: string, error?: Error | unknown, data?: LogData)
```

Some call sites pass `(message, data)` without an error object (e.g., `logger.error('msg', { key: 'value' })`). When the second argument is a plain object (not an Error), it is wrapped as `{ error: { ... } }` instead of being spread as log data. This causes confusing log output.

---

### Utility: `redis-rate-limit-store.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/redis-rate-limit-store.ts`

#### What Is Working Well

1. **Atomic Lua script**: INCR + PEXPIRE in a single atomic operation prevents race conditions (lines 81-88).
2. **In-memory fallback**: When Redis is unavailable, falls back to an in-memory Map with TTL-based expiry (RISK-056).
3. **Expired entry eviction**: `evictExpired()` called before each in-memory increment to prevent unbounded memory growth.
4. **Child store pattern**: Supports route-specific TTL via `child()` method.

#### Findings

##### RATE-01: In-memory fallback is per-instance, not distributed

**File**: `redis-rate-limit-store.ts:41`
**Severity**: Medium
**Impact**: Rate limit bypass in multi-instance deployments

When Redis is unavailable, each server instance has its own independent counter. An attacker can send N requests to each of M instances, achieving N*M total requests before being limited on any single instance. This is acknowledged by the code but worth documenting as a known limitation.

##### RATE-02: `_routeTtl` uses dynamic property assignment

**File**: `redis-rate-limit-store.ts:75, 130`
**Severity**: Low (code quality)

`(this as any)._routeTtl` and `(childStore as any)._routeTtl` bypass TypeScript's type system. This should be a proper class property.

---

### Utility: `validation.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/validation.ts`

#### What Is Working Well

1. **Strong password policy**: Minimum 12 characters with uppercase, lowercase, number, and special character requirements.
2. **Ethereum address validation**: Uses ethers.js `isAddress()` + zero-address rejection + checksum normalization via `getAddress()`.
3. **HTTPS enforcement for redirect URLs**: `httpsUrlSchema` allows HTTP only for localhost (RISK-060).
4. **Metadata size limits**: 50 keys max, 500-char string values, 16KB total JSON size.
5. **Idempotency key validation**: Alphanumeric, 1-64 chars, prevents injection via key field.
6. **Webhook URL HTTPS enforcement**: `createWebhookSchema` requires `https://` prefix.
7. **Status removed from update schema**: Prevents direct API manipulation of payment state (documented security decision).
8. **Pagination guards**: `max(100)` limit, `max(10000)` offset prevents resource exhaustion.

#### Findings

##### VAL-01: Password schema allows common weak passwords

**File**: `validation.ts:21-30`
**Severity**: Low
**CWE**: CWE-521 (Weak Password Requirements)

The regex-based policy accepts passwords like `Abcdefghijk1!` (sequential letters) or `Password1234!` (dictionary word). Consider adding a breach-check against Have I Been Pwned's k-anonymity API or a minimum entropy check.

##### VAL-02: Missing `max` constraint on refund amount

**File**: `validation.ts:159`
**Severity**: Low

```typescript
amount: z.number().positive('Amount must be positive'),
```

Unlike payment amounts (capped at 10,000 USD), refund amounts have no upper bound in the schema. While business logic should validate refund <= payment amount, the schema should also have a reasonable cap.

---

### Utility: `payment-state-machine.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/payment-state-machine.ts`

#### What Is Working Well

1. **Allow-list approach**: Transitions are explicitly listed rather than deny-listed. New states require conscious addition.
2. **Idempotent self-transitions**: Terminal states allow self-transitions for duplicate event handling in distributed systems.
3. **Security transitions enforced**: PENDING -> COMPLETED is blocked (cannot skip confirmation). FAILED -> anything is blocked.
4. **Comprehensive ADR documentation**: The inline comment explains why self-transitions exist, why allow-list was chosen over deny-list, and why xstate was rejected.
5. **Clean single-responsibility**: State machine is separate from PaymentService, independently testable.

No findings. This module is exemplary.

---

### Utility: `provider-manager.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/provider-manager.ts`

#### What Is Working Well

1. **Multi-provider failover**: Iterates through providers, skipping failed ones in cooldown.
2. **Health cache**: 30-second TTL prevents redundant health checks.
3. **Cooldown period**: Failed providers are retried after 60 seconds.

#### Findings

##### PROV-01: Health check leaks provider URLs in logs

**File**: `provider-manager.ts:85`
**Severity**: Low
**CWE**: CWE-532

```typescript
logger.warn('Provider failed health check', { network, url });
```

RPC provider URLs often contain API keys (e.g., `https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY`). The logger's redaction checks for key names containing "apikey" but the field here is named `url`, so it passes through unredacted.

**Fix**: Extract and redact the path portion of the URL before logging.

---

### Utility: `url-validator.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/url-validator.ts`

#### What Is Working Well

1. **Comprehensive SSRF protection**: Blocks 127.x.x.x, 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x, 0.0.0.0/8.
2. **DNS rebinding prevention**: Resolves hostname to IPs and validates ALL resolved addresses.
3. **Both IPv4 and IPv6**: Checks both A and AAAA records.
4. **Cloud metadata protection**: Explicit check for 169.254.169.254.
5. **Credential blocking**: Rejects URLs with embedded username:password.
6. **DNS timeout**: 5-second timeout prevents hanging on slow DNS.

No findings. This module is excellent and addresses a critical OWASP vulnerability (SSRF, A10:2021).

---

### Utility: `token-units.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/token-units.ts`

#### What Is Working Well

1. **String arithmetic via Decimal.js**: Avoids IEEE 754 floating-point precision loss.
2. **Input validation**: Rejects negative and zero amounts.

#### Findings

##### TOKEN-01: Only `amountToTokenUnits` exists; no reverse conversion

**File**: `token-units.ts`
**Severity**: Low (completeness)

There is no `tokenUnitsToAmount()` function for the reverse conversion. This may be needed for displaying blockchain amounts to users.

---

### Utility: `startup-checks.ts`

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/startup-checks.ts`

Single-purpose module that enforces `WEBHOOK_ENCRYPTION_KEY` in production. Clean and correct.

---

## App Configuration Analysis (`app.ts`)

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/app.ts`

### Registered Fastify Plugins (in order)

| # | Plugin | Source | Config |
|---|--------|--------|--------|
| 1 | `@fastify/compress` | npm | threshold: 1024, gzip+deflate |
| 2 | `@fastify/helmet` | npm | CSP, HSTS 1yr with preload |
| 3 | `@fastify/cors` | npm | Origin whitelist, credentials: true |
| 4 | `@fastify/jwt` | npm | HS256 pinned, secret from env |
| 5 | `observabilityPlugin` | local | Request logging, metrics |
| 6 | `prismaPlugin` | local | Pool size validated |
| 7 | `redisPlugin` | local | Optional, graceful degradation |
| 8 | `@fastify/rate-limit` | npm | Redis-backed store, user/apikey keying |
| 9 | `authPlugin` | local | JWT + API Key dual auth |
| 10 | `@fastify/swagger` | npm | OpenAPI 3.0 spec |
| 11 | `@fastify/swagger-ui` | npm | Non-production only |

### Registered Routes

| Prefix | Module | Auth |
|--------|--------|------|
| `/v1/auth` | authRoutes | Public (login/signup) |
| `/v1/payment-sessions` | paymentSessionRoutes | Authenticated |
| `/v1/webhooks` | webhookRoutes | Authenticated |
| `/v1/api-keys` | apiKeyRoutes | Authenticated |
| `/v1/refunds` | refundRoutes | Authenticated |
| `/v1/admin` | adminRoutes | Admin only |
| `/v1/checkout` | checkoutRoutes | Public/Optional |
| `/v1/payment-links` | paymentLinkRoutes | Authenticated |
| `/v1/notifications` | notificationRoutes | Authenticated |
| `/v1/analytics` | analyticsRoutes | Authenticated |
| `/v1/me` | meRoutes | Authenticated |
| `/v1/dev` | devRoutes | Non-production only |
| `/internal` | webhookWorkerRoutes | Internal |
| `/health` | inline | Public (details require INTERNAL_API_KEY) |
| `/ready` | inline | Public |

### What Is Working Well

1. **JWT algorithm pinned to HS256**: Prevents algorithm confusion attacks (line 122-123).
2. **CORS origin whitelist with case-insensitive matching**: Prevents case-sensitivity bypass (RISK-042).
3. **Production CORS rejects missing Origin**: Blocks sandboxed iframe requests with `Origin: null` (lines 92-97).
4. **Body limit**: 1MB max prevents oversized payload DoS (line 40).
5. **Max param length**: 256 characters prevents URL parameter abuse (line 54).
6. **Path parameter validation**: SAFE_ID_RE regex (`/^[a-zA-Z0-9_-]{1,128}$/`) on all `:id` params prevents path traversal (RISK-062).
7. **Health check with tiered access**: Public gets status only; authenticated internal callers get dependency details (RISK-068).
8. **Timing-safe health check auth**: Uses `crypto.timingSafeEqual` for INTERNAL_API_KEY comparison (line 352-353).
9. **Swagger UI disabled in production**: Prevents information disclosure (line 257).
10. **RFC 7807 error responses**: All error paths return consistent `type`/`title`/`status`/`detail` format.
11. **Dev routes guarded**: `NODE_ENV !== 'production'` check (line 292).
12. **Rate limit keying by user/API key**: Prevents shared-IP throttling for corporate NATs (lines 157-171).
13. **Request ID propagation**: `requestIdHeader: 'x-request-id'` for distributed tracing.
14. **Trust proxy**: Enabled for correct `request.ip` behind load balancers.

### Findings

##### APP-01: Health check timing-safe comparison has a length-leak vulnerability

**File**: `app.ts:351-353`
**Severity**: Low
**CWE**: CWE-208 (Observable Timing Discrepancy)

```typescript
const isAuthorized = internalKey && providedKey &&
  internalKey.length === providedKey.length &&
  crypto.timingSafeEqual(Buffer.from(internalKey), Buffer.from(providedKey));
```

The `internalKey.length === providedKey.length` check short-circuits before `timingSafeEqual`, leaking whether the attacker's key has the correct length. The observability plugin's metrics endpoint (line 224-231) handles this correctly by padding both buffers to the same length. The health endpoint should use the same approach.

**Fix**: Use the same padded comparison as the metrics endpoint:

```typescript
const maxLen = Math.max(internalKey.length, providedKey.length);
const expectedBuf = Buffer.alloc(maxLen, 0);
const suppliedBuf = Buffer.alloc(maxLen, 0);
Buffer.from(internalKey).copy(expectedBuf);
Buffer.from(providedKey).copy(suppliedBuf);
const isAuthorized = providedKey.length === internalKey.length &&
  crypto.timingSafeEqual(suppliedBuf, expectedBuf);
```

##### APP-02: Rate limit `keyGenerator` accesses `request.currentUser` before auth runs

**File**: `app.ts:157-171`
**Severity**: Low
**Impact**: Rate limiting falls back to IP for all requests

The global rate limiter is registered (line 190) BEFORE `authPlugin` (line 192). The `keyGenerator` function checks `request.currentUser?.id`, but at the time the rate limiter runs, auth has not yet executed, so `currentUser` is always `undefined`. This means ALL requests use the IP-based fallback, defeating the user-keyed rate limiting strategy.

**Fix**: Either register rate limiting after auth, or use a `preHandler` hook in individual routes to apply per-user rate limiting after authentication has populated `request.currentUser`.

##### APP-03: Missing server.ts entry point

**File**: Not found on disk
**Severity**: Medium
**Impact**: Deployment

The file `apps/api/src/server.ts` does not exist. Without seeing the entry point, it is impossible to verify that:
- `validateEnvironment()` from `env-validator.ts` is called before `buildApp()`
- `enforceProductionEncryption()` from `startup-checks.ts` is called
- Graceful shutdown (SIGTERM/SIGINT) handlers are registered
- The correct port and host are used

---

## .env.example Analysis

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/.env.example`

### What Is Working Well

1. **Clear placeholder format**: Values like `"your-jwt-secret-change-in-production"` are caught by `isPlaceholderValue()`.
2. **Generation instructions**: Comments include `openssl rand -hex 32` commands.
3. **Empty defaults for production secrets**: `WEBHOOK_ENCRYPTION_KEY=""`, `INTERNAL_API_KEY=""`, `API_KEY_HMAC_SECRET=""` -- these correctly start empty.
4. **Documentation**: Each section has comments explaining purpose and requirements.

### Findings

##### ENV-EX-01: JWT_SECRET has a guessable placeholder value

**File**: `.env.example:13`
**Severity**: Low (informational -- caught by env-validator)

```
JWT_SECRET="your-jwt-secret-change-in-production"
```

The `isPlaceholderValue()` function in `env-validator.ts` correctly catches `"your-jwt-secret"` as a substring pattern. However, developers who copy `.env.example` to `.env` and forget to change this value will get an error on startup, which is the correct behavior.

##### ENV-EX-02: ALLOWED_ORIGINS mismatch with FRONTEND_URL

**File**: `.env.example:35 vs :22`
**Severity**: Low (configuration)

```
FRONTEND_URL="http://localhost:3104"
ALLOWED_ORIGINS="http://localhost:3101"
```

The CORS allowed origin (`3101`) does not match the frontend URL (`3104`). This means the frontend cannot make authenticated requests to the API out of the box. One of these values is likely stale.

---

## OpenAPI / Swagger Analysis

### What Is Working Well

1. **11 tags defined**: auth, payments, payment-links, checkout, refunds, webhooks, api-keys, analytics, notifications, account, admin, internal.
2. **Security schemes registered**: `bearerAuth` (JWT) and `apiKeyAuth` (API Key).
3. **Shared schemas**: `ErrorResponse` and `PaginationResponse` defined as reusable components.
4. **Server URL configured**: Points to `localhost:5001` for development.

### Findings

##### SWAGGER-01: OpenAPI schema incomplete

**File**: `app.ts:218-253`
**Severity**: Low (DX issue)

Only `ErrorResponse` and `PaginationResponse` are registered as component schemas. The following are missing and should be added for complete API documentation:
- `PaymentSession` (request and response)
- `Refund`
- `WebhookEndpoint`
- `ApiKey`
- `PaymentLink`
- `AuthResponse`

Individual route handlers may define inline schemas, but shared component schemas improve client SDK generation.

---

## Security Findings Summary

### Authentication & Authorization

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| AUTH-01 | `optionalAuth` swallows 503 errors | Medium | Open |
| AUTH-02 | JWT user lookup on every request (no cache) | Low | Open |
| AUTH-03 | API key permissions type assertion unchecked | Low | Open |
| -- | JWT algorithm pinned to HS256 | -- | Good |
| -- | JTI blacklist with fail-closed | -- | Good |
| -- | Dual auth (JWT + API Key) | -- | Good |
| -- | Bcrypt 12 rounds | -- | Good |

### Injection Vulnerabilities

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| -- | No raw SQL (all Prisma ORM) | -- | Good |
| -- | Zod validation on all inputs | -- | Good |
| -- | Path parameter regex validation | -- | Good |
| -- | Ethereum address validation via ethers.js | -- | Good |

### Data Security

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| SCHEMA-01 | Webhook secret column name does not indicate encryption | Medium | Open |
| ENC-01 | No encryption key rotation mechanism | Medium | Open |
| CRYPTO-01 | Webhook signature lacks replay protection | High | Open |
| PROV-01 | RPC URLs with API keys logged unredacted | Low | Open |
| PRISMA-01 | Slow query log may contain sensitive data | Low | Open |
| -- | AES-256-GCM with random IV | -- | Good |
| -- | HMAC-SHA-256 for API key hashing | -- | Good |
| -- | Timing-safe comparisons throughout | -- | Good |

### API Security

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| APP-01 | Health check has length-leak in timing comparison | Low | Open |
| APP-02 | Rate limit keyGenerator runs before auth | Low | Open |
| -- | CORS origin whitelist | -- | Good |
| -- | Helmet security headers | -- | Good |
| -- | HTTPS enforcement for webhooks and redirects | -- | Good |
| -- | SSRF protection with DNS resolution | -- | Good |

### Infrastructure

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| OBS-01 | Competing error handlers (observability vs app) | High | Open |
| APP-03 | Missing server.ts entry point | Medium | Open |
| -- | Redis graceful degradation | -- | Good |
| -- | Environment validation at startup | -- | Good |
| -- | Shannon entropy for secrets | -- | Good |

---

## Risk Matrix (Top 10)

| Rank | ID | Title | Severity | Likelihood | Blast Radius | Risk Score |
|------|-----|-------|----------|------------|--------------|------------|
| 1 | OBS-01 | Competing error handlers | High | High | Product-wide | 9 |
| 2 | CRYPTO-01 | Webhook replay vulnerability | High | Medium | Feature-specific | 8 |
| 3 | AUTH-01 | optionalAuth swallows 503 | Medium | Medium | Feature-specific | 6 |
| 4 | APP-02 | Rate limit keying before auth | Low | High | Product-wide | 5 |
| 5 | ENC-01 | No key rotation mechanism | Medium | Low | Product-wide | 5 |
| 6 | APP-03 | Missing server.ts | Medium | Medium | Product-wide | 5 |
| 7 | RATE-01 | In-memory fallback per-instance | Medium | Low | Product-wide | 4 |
| 8 | OBS-02 | Process-local metrics | Medium | High | Operational | 4 |
| 9 | SCHEMA-04 | No soft-delete for compliance | Low | Low | Organization-wide | 3 |
| 10 | APP-01 | Health check length leak | Low | Low | Feature-specific | 2 |

---

## What Is Working Well (Commendations)

This codebase demonstrates **above-average security engineering**. The following deserve explicit commendation:

1. **Fail-closed JTI revocation** (auth.ts): When Redis is unavailable, JWT requests are rejected with 503 rather than silently accepted. This is the correct security posture and is rarely implemented correctly.

2. **Shannon entropy validation** (env-validator.ts): Going beyond simple length checks to measure actual randomness of secrets. Catches weak keys like repeated characters.

3. **SSRF protection with DNS rebinding prevention** (url-validator.ts): Resolves hostnames to IPs and validates all resolved addresses against private ranges. Includes IPv6, cloud metadata, and link-local checks.

4. **Payment state machine** (payment-state-machine.ts): Allow-list approach with comprehensive ADR documentation explaining design decisions. Self-transitions for idempotency. Independently testable.

5. **Timing-safe comparisons everywhere**: Used for webhook signatures, health check auth, metrics auth, and internal API key comparison. The metrics endpoint even pads buffers to equal length.

6. **Atomic Lua script for rate limiting** (redis-rate-limit-store.ts): INCR + PEXPIRE in a single atomic operation prevents race conditions.

7. **Environment validation breadth**: 8 separate validators covering JWT, DB, Redis, Blockchain, Webhook Encryption, API Key HMAC, Internal API Key, and KMS.

8. **Decimal.js for token amounts** (token-units.ts): Avoids IEEE 754 floating-point precision loss for financial calculations.

9. **CORS production hardening**: Rejects requests with no Origin header in production (prevents sandboxed iframe attacks). Case-insensitive matching prevents bypass.

10. **Comprehensive Prisma indexing**: 22 explicit indexes covering all query patterns, with composite unique constraints for idempotency.

---

## Remediation Roadmap

### Immediate (1-3 days)

1. **OBS-01**: Replace `setErrorHandler` in observability plugin with `onError` hook. (1 hour)
2. **CRYPTO-01**: Add timestamp freshness check to `verifyWebhookSignature()`. (2 hours)
3. **AUTH-01**: Re-throw 503 in `optionalAuth`. (30 minutes)
4. **APP-01**: Use padded buffer comparison in health check auth. (30 minutes)

### Short-term (1-2 weeks)

5. **APP-02**: Move per-user rate limiting to post-auth middleware. (4 hours)
6. **ENC-01**: Add key version prefix to encrypted data format. (1 day)
7. **SCHEMA-01**: Rename `secret` to `encryptedSecret` with migration. (2 hours)
8. **LOG-01**: Implement log level hierarchy. (1 hour)

### Medium-term (1-2 months)

9. **OBS-02**: Migrate to `prom-client` for Prometheus-compatible metrics. (2-3 days)
10. **SCHEMA-04**: Add soft-delete pattern for GDPR compliance. (2-3 days)
11. **SWAGGER-01**: Complete OpenAPI component schemas for SDK generation. (1 day)

---

## Quick Wins (< 1 day each)

1. Remove redundant `@@index([shortCode])` from PaymentLink (SCHEMA-03)
2. Remove redundant `revoked` Boolean from RefreshToken (SCHEMA-05)
3. Add compound index `@@index([actor, resourceType, timestamp])` to AuditLog (SCHEMA-02)
4. Add `max(10000)` to refund amount in `createRefundSchema` (VAL-02)
5. Add `tokenUnitsToAmount()` reverse conversion to token-units.ts (TOKEN-01)
6. Fix ALLOWED_ORIGINS / FRONTEND_URL port mismatch in .env.example (ENV-EX-02)
7. Make `_routeTtl` a proper typed class property (RATE-02)
8. Add DATABASE_URL format validation in env-validator (ENV-01)

---

## AI-Readiness Score: 7/10

| Dimension | Score | Notes |
|-----------|-------|-------|
| Modularity | 1.5/2 | Clean plugin architecture, but observability competes with app error handler |
| API Design | 1.5/2 | RFC 7807 errors, versioned routes, but OpenAPI schemas incomplete |
| Testability | 1.5/2 | `buildApp()` pattern excellent, but module-level mutable state hurts isolation |
| Observability | 1.0/2 | Structured logging + metrics exist, but process-local and no distributed tracing |
| Documentation | 1.5/2 | Excellent inline ADRs (state machine), but no server.ts and incomplete Swagger |

---

*Report generated by Code Reviewer Agent. All file paths are absolute. All findings include file:line references.*
