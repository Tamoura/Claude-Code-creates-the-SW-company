# Privacy & Observability Audit Report

**Product**: stablecoin-gateway
**Scope**: `products/stablecoin-gateway/apps/api/src/` -- all source files
**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer)
**Date**: 2026-02-28
**Methodology**: Full manual source code scan across 54 TypeScript files

---

## Executive Summary

**Overall Privacy Assessment**: GOOD (7.5/10)
**Overall Observability Assessment**: STRONG (8.5/10)

The stablecoin-gateway demonstrates above-average maturity in both privacy and observability for a product at this stage. Privacy protections are well-considered with a dedicated PII redaction layer in the logger, GDPR endpoints (access, export, erasure), and hashed email storage in Redis. Observability infrastructure covers all four SRE Golden Signals with structured logging, OpenTelemetry instrumentation, metrics collection, and slow query detection. However, several gaps remain that would block compliance with GDPR/CCPA in production and limit operational visibility under load.

**Top 5 Findings (by severity)**:

1. **[HIGH]** Email PII logged in plaintext in auth routes (despite logger redaction)
2. **[HIGH]** No data retention policy or automated data purge for expired tokens, old payment sessions, or audit logs
3. **[MEDIUM]** Consent mechanism absent -- no explicit user consent capture for data processing
4. **[MEDIUM]** IP addresses stored in AuditLog without retention policy or anonymization
5. **[LOW]** OpenTelemetry exporter not configured -- traces are created but discarded

---

## SECTION A: Privacy & Data Protection

### A1. PII Inventory

The following PII fields exist in the database (per `schema.prisma`):

| PII Type | Model | Field | Storage | Encryption |
|----------|-------|-------|---------|------------|
| Email | User | `email` | Plaintext | No |
| Password | User | `passwordHash` | bcrypt hash | N/A (one-way) |
| Wallet address | PaymentSession | `merchantAddress`, `customerAddress` | Plaintext | No |
| IP address | AuditLog | `ip` | Plaintext | No |
| User agent | AuditLog | `userAgent` | Plaintext | No |
| Webhook URL | WebhookEndpoint | `url` | Plaintext | No |
| Webhook secret | WebhookEndpoint | `secret` | AES-256-GCM (prod) | Yes (conditional) |
| API key | ApiKey | `keyHash` | SHA-256 hash | N/A (one-way) |
| Refresh token | RefreshToken | `tokenHash` | SHA-256 hash | N/A (one-way) |

### A2. PII in Logs -- FINDINGS

**Finding PII-01: Email logged in plaintext in auth routes**
- **Severity**: HIGH
- **Status**: PARTIALLY MITIGATED
- **Files**:
  - `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:59` -- `logger.info('Signup attempted for existing email', { email: body.email });`
  - `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:94` -- `logger.info('User signed up', { userId: user.id, email: user.email });`
  - `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:208` -- `logger.info('User logged in', { userId: user.id, email: user.email });`
  - `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:601-603` -- `logger.info('Password reset token generated', { userId: user.id, email: user.email });`
  - `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:664-666` -- `logger.info('Password reset completed', { userId: tokenData.userId, email: tokenData.email });`
  - `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/services/email.service.ts:530` -- `logger.info('Email sent', { to: message.to, subject: message.subject });`

- **Analysis**: The logger at `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/logger.ts:13` includes `'email'` in `SENSITIVE_SUBSTRINGS`, which means any key containing the substring "email" will be redacted to `[REDACTED]`. This DOES protect the `{ email: body.email }` cases above because the key is literally `"email"`.

  HOWEVER, the `EmailService` at line 530 logs `{ to: message.to }` -- the key is `"to"`, which does NOT match any sensitive pattern. The email address in the `to` field will be logged in plaintext.

- **Verdict**: The logger's redaction catches keys named "email" but misses the `to` field containing an email address. This is a value-level PII leak that key-based redaction cannot catch.

- **Fix**: Either rename the log key to `email_to` (which would trigger substring match), or add `'to'` to `SENSITIVE_EXACT`, or implement value-pattern matching (e.g., regex for `@` in string values).

**Finding PII-02: IP addresses logged in observability plugin**
- **Severity**: MEDIUM
- **Status**: PARTIALLY MITIGATED
- **Files**:
  - `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts:123` -- `ip: request.ip` (debug level)
  - `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts:146` -- `ip: request.ip` (response log, all levels)
  - `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts:175` -- `ip: request.ip` (error handler)

- **Analysis**: The key is `"ip"`, which IS in `SENSITIVE_EXACT` at `logger.ts:22`. The redaction will replace it with `[REDACTED]`. This is WORKING AS INTENDED.

- **Verdict**: IP addresses in structured log output are correctly redacted. However, IPs stored in the `AuditLog` database table (see A5) are NOT redacted.

**Finding PII-03: Wallet addresses not classified as PII in logger**
- **Severity**: LOW
- **Status**: ACCEPTED RISK
- **Analysis**: Wallet addresses (e.g., `0x742d35Cc...`) are pseudonymous on public blockchains. They are logged freely (e.g., `merchant_address`, `customer_address` in payment-sessions.ts). While wallet addresses are technically PII under GDPR (they can be linked to individuals through exchanges), they are also public on-chain. The current approach of logging them is consistent with the blockchain transparency model. However, for GDPR strictness, they should be treated as pseudonymous identifiers.

### A3. Consent Mechanisms -- FINDINGS

**Finding CONSENT-01: No consent capture mechanism**
- **Severity**: MEDIUM
- **Status**: MISSING
- **Analysis**: The `User` model in `schema.prisma` contains no consent fields (e.g., `consentedAt`, `consentVersion`, `privacyPolicyVersion`). The signup endpoint at `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:41-118` creates a user with only `email` and `passwordHash` -- no consent flag is recorded.

  For GDPR Article 6 (Lawful Basis for Processing), the system needs to demonstrate that users consented to data processing at the time of signup. Currently there is no evidence trail.

- **Required**: Add `consentedAt DateTime?`, `consentVersion String?`, and `privacyPolicyAcceptedAt DateTime?` to the `User` model. The signup endpoint should record consent with a timestamp.

### A4. Data Deletion (GDPR Right to Erasure) -- FINDINGS

**Finding DELETE-01: Account deletion is implemented**
- **Severity**: N/A
- **Status**: IMPLEMENTED
- **File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/me.ts:135-178`

- **Analysis**: `DELETE /v1/me` correctly:
  1. Revokes all active refresh tokens
  2. Creates an audit log entry BEFORE deletion (preserving the actor ID)
  3. Deletes the user (Prisma cascades to RefreshToken, PaymentSession, ApiKey, WebhookEndpoint, PaymentLink, NotificationPreference)
  4. Returns 204

- **Gap**: AuditLog records survive user deletion by design (stated in comments). This is correct for compliance, but the audit log entry at deletion time stores `ip` and `userAgent` which are PII of the deleted user. Under strict GDPR interpretation, these should be anonymized after a retention period.

### A5. Data Export (GDPR Right to Data Portability) -- FINDINGS

**Finding EXPORT-01: Data export is implemented**
- **Severity**: N/A
- **Status**: IMPLEMENTED
- **File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/me.ts:45-125`

- **Analysis**: `GET /v1/me/export` correctly:
  1. Fetches user profile (excluding passwordHash)
  2. Fetches payment sessions, API keys (excluding keyHash), webhook endpoints (excluding secret), and payment links
  3. Sets `Content-Disposition: attachment` for file download
  4. Returns JSON format

- **Good**: Sensitive fields (keyHash, passwordHash, secret) are explicitly excluded via `select` projections.

### A6. Data Retention Policies -- FINDINGS

**Finding RETENTION-01: No automated data retention or purge**
- **Severity**: HIGH
- **Status**: MISSING
- **Analysis**: There are no mechanisms in the codebase for:
  - Purging expired refresh tokens (they accumulate indefinitely in the `refresh_tokens` table)
  - Purging old/completed payment sessions after a retention period
  - Purging old audit log entries
  - Purging old webhook delivery records (including response bodies that may contain PII)

  The `RefreshToken` model has `expiresAt` and `revoked` fields, but there is no scheduled job to delete expired/revoked tokens. Over time this table will grow unboundedly.

- **Required**: Implement a scheduled cleanup job that:
  1. Deletes refresh tokens where `expiresAt < NOW() - 30 days` AND `revoked = true`
  2. Anonymizes or deletes audit log entries older than the configured retention period
  3. Purges webhook delivery response bodies after 90 days

### A7. Encryption at Rest -- FINDINGS

**Finding ENCRYPT-01: Selective encryption at rest**
- **Severity**: MEDIUM
- **Status**: PARTIALLY IMPLEMENTED
- **Files**:
  - `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/encryption.ts` -- AES-256-GCM implementation
  - `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/startup-checks.ts` -- Production enforcement

- **What IS encrypted**: Webhook secrets (AES-256-GCM, mandatory in production)
- **What is NOT encrypted**: User email addresses, wallet addresses
- **Analysis**: The encryption infrastructure is sound (AES-256-GCM with random IV, auth tag, entropy validation on the key). Production enforcement is in place via `enforceProductionEncryption()`. However, user email addresses -- the primary PII -- are stored in plaintext in the database. Database-level encryption (PostgreSQL TDE or column-level encryption) is not configured.

- **Recommendation**: For production, enable PostgreSQL TDE (Transparent Data Encryption) at the infrastructure level, or implement column-level encryption for the `email` field using the existing AES-256-GCM utility.

### A8. PII in Redis -- FINDINGS

**Finding REDIS-01: Email hashed before Redis storage**
- **Severity**: N/A
- **Status**: IMPLEMENTED
- **File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:126-129`

- **Analysis**: The login lockout mechanism hashes the email with SHA-256 before using it as a Redis key: `const emailHash = createHash('sha256').update(body.email.toLowerCase()).digest('hex')`. This is correctly commented as `// PRIVACY: Hash email before using as Redis key to avoid storing PII`. The password reset flow also stores data in Redis (line 599), but this is short-lived (1-hour TTL) and contains `userId` and `email` -- the email in Redis is PII but auto-expires.

---

## SECTION B: Observability (SRE Four Golden Signals)

### B1. Structured Logging

**Status**: IMPLEMENTED
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/logger.ts`

| Criteria | Status | Details |
|----------|--------|---------|
| JSON format in production | YES | Line 66: `console.log(JSON.stringify(logEntry))` |
| Human-readable in dev | YES | Line 68: `console.log(...)` with formatted output |
| Timestamp in every entry | YES | Line 57: `new Date().toISOString()` |
| Log level in every entry | YES | Line 60: `level` field |
| PII redaction | YES | Lines 8-46: `redactSensitiveFields()` with substring + exact matching |
| Correlation IDs | YES | See B1a below |

**Finding LOG-01: Correlation ID via X-Request-ID**
- **Status**: IMPLEMENTED
- **File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/app.ts:51-52`
- **Analysis**: Fastify is configured with `requestIdHeader: 'x-request-id'` and `requestIdLogLabel: 'request_id'`. The observability plugin logs `request_id: request.id` on every request/response pair. This enables end-to-end request tracing through log aggregation.

**Finding LOG-02: Logger does not redact values, only keys**
- **Severity**: LOW
- **Status**: ARCHITECTURAL LIMITATION
- **File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/logger.ts:30-46`
- **Analysis**: The `redactSensitiveFields` function iterates object keys and checks if the KEY matches a sensitive pattern. It does NOT inspect values for PII patterns (e.g., email addresses in arbitrary string values). This means `{ to: "user@example.com" }` passes through unredacted because the key `"to"` is not sensitive. A defense-in-depth approach would add value-level regex scanning for email patterns (`/\S+@\S+\.\S+/`), but this has performance implications.

**Finding LOG-03: Array values not recursively redacted**
- **Severity**: LOW
- **Status**: GAP
- **File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/logger.ts:38-40`
- **Analysis**: The redaction function handles nested objects but skips arrays (`!Array.isArray(value)`). If an array contains objects with sensitive keys, those objects will not be redacted. Example: `{ users: [{ email: "a@b.com" }] }` -- the array element's `email` key will NOT be redacted.

### B2. Latency Tracking (Golden Signal: Latency)

**Status**: IMPLEMENTED
**Files**:
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts:115` -- `request.startTime = Date.now()`
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts:129` -- `const duration = Date.now() - (request.startTime || Date.now())`
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts:144` -- `duration_ms: duration` in every response log

| Criteria | Status | Details |
|----------|--------|---------|
| Request duration measured | YES | `Date.now()` delta on every request |
| Duration in log output | YES | `duration_ms` field in response logs |
| Percentile calculation | YES | p50, p95, p99 from sliding window of 1000 samples |
| Average latency | YES | `totalDuration / requestCount` |
| Per-endpoint breakdown | NO | Duration tracked globally, not per route |

**Finding LATENCY-01: No per-endpoint latency breakdown**
- **Severity**: LOW
- **Status**: GAP
- **Analysis**: The metrics store tracks `byStatus` and `byMethod` but not `byRoute`. In production, knowing that `POST /v1/payment-sessions` has a p99 of 500ms while `GET /health` has 2ms is critical for identifying bottlenecks. The current implementation aggregates all routes into a single percentile distribution.

### B3. Traffic Monitoring (Golden Signal: Traffic)

**Status**: IMPLEMENTED
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts:50-67`

| Criteria | Status | Details |
|----------|--------|---------|
| Total request count | YES | `metrics.requests.total` |
| Requests by HTTP method | YES | `metrics.requests.byMethod` |
| Requests by status code | YES | `metrics.requests.byStatus` |
| Request rate (RPM) | NO | Raw count only, no rate calculation |

### B4. Error Tracking (Golden Signal: Errors)

**Status**: IMPLEMENTED
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts:81-85`

| Criteria | Status | Details |
|----------|--------|---------|
| Total error count | YES | `metrics.errors.total` (4xx + 5xx) |
| Error rate percentage | YES | Calculated in metrics endpoint (line 256) |
| Errors by type (4xx vs 5xx) | YES | `metrics.errors.byType` |
| Error logging with stack trace | YES | `logger.error()` includes `error.stack` (logger.ts:85) |
| Differentiated log levels | YES | 5xx=error, 4xx=warn, 2xx/3xx=info (observability.ts:136) |

### B5. Saturation (Golden Signal: Saturation)

**Status**: PARTIALLY IMPLEMENTED

| Criteria | Status | Details |
|----------|--------|---------|
| Database pool monitoring | PARTIAL | Pool size configured and validated (prisma.ts:13-26), but pool utilization not tracked |
| Memory usage monitoring | NO | No process.memoryUsage() tracking |
| CPU usage monitoring | NO | No CPU metrics |
| Connection count | PARTIAL | SSE connections tracked (payment-sessions.ts:28-31) |
| Event loop lag | NO | No event loop delay measurement |

**Finding SAT-01: No resource saturation metrics**
- **Severity**: MEDIUM
- **Status**: MISSING
- **Analysis**: The system tracks request counts and durations but does not monitor resource utilization. In production, knowing that the database connection pool is 95% utilized or that the Node.js event loop is lagging by 200ms is critical for capacity planning and preventing cascading failures. The SSE connection tracking (global and per-user limits) is a good pattern but is not exposed in the metrics endpoint.

### B6. Health Endpoints

**Status**: IMPLEMENTED
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/app.ts:276-353`

| Endpoint | Purpose | Dependency Checks | Auth Required |
|----------|---------|-------------------|---------------|
| `GET /health` | Deep health check | Database (SELECT 1), Redis (PING) | Optional (INTERNAL_API_KEY for details) |
| `GET /ready` | Readiness probe | Database (SELECT 1) | No |

**Analysis**:
- `/health` returns `{ status: "healthy" }` publicly, or detailed `{ checks: { database, redis } }` with latency measurements when `x-internal-api-key` header is provided (timing-safe comparison).
- `/ready` is lightweight for load balancer probing -- only checks DB reachability.
- Both return correct HTTP status codes (200 for healthy, 503 for unhealthy).
- Rate-limit exemption is correctly configured for both endpoints via `allowList` (app.ts:142-145).

**Verdict**: Health endpoints are well-designed and follow Kubernetes/cloud-native best practices.

### B7. Slow Query Logging

**Status**: IMPLEMENTED
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/prisma.ts:29-54`

| Criteria | Status | Details |
|----------|--------|---------|
| Prisma query event subscription | YES | `prisma.$on('query', ...)` |
| Configurable threshold | YES | `SLOW_QUERY_THRESHOLD_MS` env var, defaults to 500ms |
| Query text logged | YES | `query: e.query` |
| Duration logged | YES | `duration_ms: e.duration` |
| Log level | WARN | Appropriate severity for slow queries |

**Finding SQ-01: Slow query params not logged**
- **Severity**: LOW
- **Status**: MINOR GAP
- **Analysis**: The Prisma query event provides `e.params` which contains the query parameters. These are not currently logged, which makes it harder to reproduce slow queries. However, logging params could expose PII (e.g., email in WHERE clause). The current approach of logging only the query template is a reasonable privacy/debuggability tradeoff.

### B8. Metrics Persistence

**Status**: IMPLEMENTED
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts:184-206`

| Criteria | Status | Details |
|----------|--------|---------|
| Periodic metrics flush | YES | Every 60 seconds via `setInterval` |
| Metrics logged as structured JSON | YES | `logger.info('metrics_snapshot', { ... })` |
| Cleanup on shutdown | YES | `clearInterval(flushInterval)` on `onClose` hook |
| Prevent process keepalive | YES | `flushInterval.unref()` |
| Metrics endpoint | YES | `GET /internal/metrics` with INTERNAL_API_KEY auth |

**Analysis**: The 60-second flush interval writes a `metrics_snapshot` log entry with `requests_total`, `errors_total`, `avg_duration_ms`, `p99_ms`, and status breakdown. This ensures metrics survive in log aggregation (CloudWatch, Datadog) even if the process crashes. The `started_at` field allows monitoring systems to detect restarts. The in-memory nature is explicitly documented with a migration path to `prom-client + Prometheus` noted in comments.

### B9. Distributed Tracing

**Status**: IMPLEMENTED (BASELINE)
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/telemetry.ts`

| Criteria | Status | Details |
|----------|--------|---------|
| OpenTelemetry SDK initialized | YES | `@opentelemetry/sdk-node` with auto-instrumentations |
| Service name configured | YES | `serviceName: 'stablecoin-gateway'` |
| Auto-instrumentation | YES | `getNodeAutoInstrumentations()` (HTTP, Fastify, Prisma, etc.) |
| Exporter configured | CONDITIONAL | Exports only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set |
| Graceful shutdown | YES | `process.on('SIGTERM', () => sdk.shutdown())` |
| Import order correct | YES | `telemetry.ts` imported first in `index.ts:2` |
| W3C Trace Context propagation | YES | Automatic via auto-instrumentations |

**Finding TRACE-01: Traces discarded without exporter**
- **Severity**: LOW
- **Status**: BY DESIGN
- **Analysis**: When `OTEL_EXPORTER_OTLP_ENDPOINT` is not set, the SDK creates and propagates spans but discards them (no exporter). This is correct for development and CI. In production, setting the env var enables export to any OTLP-compatible collector (Jaeger, Tempo, Datadog). The `fs` instrumentation is disabled to reduce noise, which is a good practice.

---

## SECTION C: Summary Table

### Privacy Findings

| ID | Finding | Severity | Status | File:Line |
|----|---------|----------|--------|-----------|
| PII-01 | Email logged via `to` key in EmailService (bypasses redaction) | HIGH | OPEN | `src/services/email.service.ts:530` |
| PII-02 | IP addresses redacted in logs by SENSITIVE_EXACT | N/A | MITIGATED | `src/plugins/observability.ts:123,146` |
| PII-03 | Wallet addresses not classified as PII in logger | LOW | ACCEPTED | Multiple files |
| CONSENT-01 | No consent capture at signup | MEDIUM | MISSING | `src/routes/v1/auth.ts:41` |
| DELETE-01 | Account deletion implemented (GDPR Art. 17) | N/A | IMPLEMENTED | `src/routes/v1/me.ts:135` |
| EXPORT-01 | Data export implemented (GDPR Art. 20) | N/A | IMPLEMENTED | `src/routes/v1/me.ts:45` |
| RETENTION-01 | No data retention policy or automated purge | HIGH | MISSING | N/A |
| ENCRYPT-01 | Webhook secrets encrypted; email not encrypted at rest | MEDIUM | PARTIAL | `src/utils/encryption.ts` |
| REDIS-01 | Email hashed before Redis storage | N/A | IMPLEMENTED | `src/routes/v1/auth.ts:127` |
| LOG-02 | Logger redacts by key name only, not by value pattern | LOW | LIMITATION | `src/utils/logger.ts:30` |
| LOG-03 | Array elements not recursively redacted | LOW | GAP | `src/utils/logger.ts:38` |

### Observability Findings

| ID | Finding | Severity | Status | File:Line |
|----|---------|----------|--------|-----------|
| LOG-01 | Structured JSON logging with correlation IDs | N/A | IMPLEMENTED | `src/utils/logger.ts`, `src/app.ts:51` |
| LATENCY-01 | No per-endpoint latency breakdown | LOW | GAP | `src/plugins/observability.ts:72` |
| SAT-01 | No resource saturation metrics (memory, CPU, pool) | MEDIUM | MISSING | N/A |
| SQ-01 | Slow query params not logged (privacy tradeoff) | LOW | ACCEPTED | `src/plugins/prisma.ts:46` |
| TRACE-01 | OTel traces discarded without exporter config | LOW | BY DESIGN | `src/telemetry.ts` |

### Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| PII Handling (storage) | 7/10 | Email plaintext in DB, but passwords/tokens/API keys properly hashed |
| PII Handling (logs) | 8/10 | Robust key-based redaction; one `to` field leak |
| PII Handling (transmission) | 9/10 | HTTPS enforced for webhook URLs, HSTS configured |
| Consent Mechanisms | 2/10 | Not implemented |
| Data Deletion | 9/10 | Full cascade delete with audit trail |
| Data Export | 9/10 | Comprehensive export excluding sensitive fields |
| Retention Policies | 1/10 | Not implemented |
| Structured Logging | 9/10 | JSON in prod, correlation IDs, PII redaction |
| Latency Tracking | 8/10 | Duration on every request, percentiles, missing per-route |
| Traffic Monitoring | 8/10 | By method and status code, no rate calculation |
| Error Tracking | 9/10 | Error rates, categorized, stack traces, differentiated log levels |
| Saturation Monitoring | 3/10 | SSE connection limits only |
| Health Endpoints | 10/10 | Deep checks, auth-gated details, rate-limit exempt |
| Slow Query Logging | 9/10 | Configurable threshold, structured output |
| Metrics Persistence | 8/10 | 60s flush to logs, metrics endpoint |
| Distributed Tracing | 7/10 | OTel baseline ready, needs exporter config |

---

## SECTION D: Remediation Roadmap

### 30-Day Plan (Critical)

1. **Fix PII-01**: Rename the `to` key in `EmailService.sendEmail()` to `email_recipient` so the logger's substring redaction catches it. Alternatively, add `'to'` to `SENSITIVE_EXACT`. (~1 hour)

2. **Implement RETENTION-01**: Create a scheduled cleanup job (can be a Fastify plugin or standalone worker) that:
   - Deletes revoked/expired refresh tokens older than 30 days
   - Deletes webhook delivery records (response bodies) older than 90 days
   - Anonymizes audit log IP/userAgent fields older than 180 days
   (~2 days)

3. **Fix LOG-03**: Update `redactSensitiveFields` to recursively process array elements. (~2 hours)

### 60-Day Plan (Important)

4. **Implement CONSENT-01**: Add consent fields to User model, capture consent at signup with version tracking. (~3 days including migration)

5. **Implement SAT-01**: Add resource saturation metrics:
   - `process.memoryUsage()` in metrics snapshot
   - Database pool utilization (Prisma metrics)
   - Event loop delay via `perf_hooks.monitorEventLoopDelay()`
   - Expose SSE connection counts in `/internal/metrics`
   (~2 days)

6. **Implement LATENCY-01**: Track request durations by route pattern (e.g., `POST /v1/payment-sessions`) in addition to global aggregation. (~1 day)

### 90-Day Plan (Strategic)

7. **ENCRYPT-01**: Evaluate column-level encryption for `User.email` or enable PostgreSQL TDE at the infrastructure level. (~1 week)

8. **TRACE-01**: Configure OTLP exporter in production deployment to ship traces to Jaeger/Tempo/Datadog. (~1 day infra)

9. **LOG-02**: Consider value-level PII detection (regex for email patterns in string values). Benchmark performance impact before enabling. (~3 days)

---

## SECTION E: Positive Findings (What Works Well)

The following elements are production-ready and demonstrate strong engineering:

1. **Logger PII redaction** (`logger.ts:8-46`): Dual-strategy (substring + exact match) with recursive object traversal. The explicit separation prevents false positives on short patterns like "ip".

2. **Email enumeration prevention** (`auth.ts:48-63, 608`): Both signup and forgot-password return identical responses regardless of email existence.

3. **Email hashing in Redis** (`auth.ts:126-129`): SHA-256 hash of email used as Redis key for lockout, with explicit `// PRIVACY` comment.

4. **GDPR endpoints** (`me.ts`): Complete implementation of Articles 15 (Access), 17 (Erasure), and 20 (Portability) with explicit exclusion of sensitive fields from export.

5. **Webhook secret handling** (`webhooks.ts` + `encryption.ts`): Secrets shown only once at creation, encrypted at rest with AES-256-GCM, mandatory in production.

6. **Health endpoint design** (`app.ts:276-353`): Auth-gated infrastructure details, timing-safe key comparison, rate-limit exemption, deep dependency checks with latency.

7. **Metrics snapshot flush** (`observability.ts:184-199`): Periodic structured log output ensures metrics survive process crashes and are available in log aggregation.

8. **OpenTelemetry baseline** (`telemetry.ts`): Correctly imported before all other modules, auto-instrumentation enabled, graceful shutdown, ready for production exporter.

9. **Slow query detection** (`prisma.ts:45-54`): Event-based detection with configurable threshold, logged at WARN level.

10. **Timing-safe comparisons**: Used consistently for INTERNAL_API_KEY (`observability.ts:220-231`, `webhook-worker.ts:38-40`, `app.ts:324-326`) and JTI blacklist checks.
