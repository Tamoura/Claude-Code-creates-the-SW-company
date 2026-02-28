# Privacy & Observability Audit Report

**Product**: Stablecoin Gateway
**Auditor**: Code Reviewer (Principal Architect + Security Engineer + Staff Backend Engineer)
**Date**: 2026-02-28
**Scope**: Full source scan of `apps/api/src/` (54 files) and `apps/web/src/` (90+ files)
**Severity Scale**: Critical / High / Medium / Low

---

## Executive Summary

**Overall Assessment: FAIR (6.5/10)**

The stablecoin-gateway demonstrates strong foundational privacy engineering and solid observability basics. GDPR Articles 15, 17, and 20 are implemented with proper cascade deletes, data export, and self-service access. The logger has a comprehensive field redaction system. Encryption at rest is implemented for webhook secrets using AES-256-GCM. OpenTelemetry is integrated for distributed tracing.

However, there are **2 confirmed PII leaks** where data bypasses the redaction system (email via `to` key, wallet addresses via `walletAddress` key). The cookie consent banner stores preferences in localStorage only (not server-side), making it unauditable under GDPR Art. 7(1). There is **no data retention policy** -- records grow unbounded forever. Two GDPR rights (Restrict Processing Art. 18, Right to Object Art. 21) are entirely missing. There is **no error tracking service** (Sentry or equivalent), and alerting thresholds are undefined.

**Top 5 Risks**:
1. Email recipient logged in plaintext via `to` key in EmailService (bypasses redaction)
2. Wallet addresses logged in plaintext in nonce-manager (not in redaction list)
3. No data retention policy -- audit logs, expired tokens, webhook deliveries grow indefinitely
4. Cookie consent not persisted server-side -- consent proof unauditable under GDPR Art. 7(1)
5. No error tracking service (Sentry/Datadog) -- production incidents invisible

**Recommendation**: Fix the 2 PII logging leaks immediately (30 minutes). Implement data retention within 30 days. Add server-side consent storage and error tracking within 60 days.

---

## SECTION A: PRIVACY ASSESSMENT

### A1. PII in Logs

#### Finding PII-01: Email addresses in auth route logs [MITIGATED]

**Severity**: Low (mitigated by redaction)
**GDPR Article**: Art. 5(1)(f) -- Integrity and Confidentiality
**Files**:
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:64` -- `logger.info('Signup attempted for existing email', { email: body.email })`
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:99` -- `logger.info('User signed up', { userId: user.id, email: user.email })`
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:213` -- `logger.info('User logged in', { userId: user.id, email: user.email })`
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:606-608` -- password reset token generated
- `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:669-671` -- password reset completed

**Analysis**: The logger at `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/logger.ts:13` includes `'email'` in `SENSITIVE_SUBSTRINGS`. The `redactSensitiveFields` function checks `lowerKey.includes(p)` for each pattern. Since the key is literally `"email"`, it matches and the value is replaced with `[REDACTED]`.

**Status**: MITIGATED -- Logger redaction correctly covers these fields.

**Recommendation**: Remove the `email` field from these log calls entirely. Even though redacted, passing PII to the logger violates data minimization (Art. 5(1)(c)). The `userId` is sufficient for debugging.

---

#### Finding PII-02: Wallet addresses logged in plaintext [MEDIUM] **OPEN**

**Severity**: Medium
**GDPR Article**: Art. 5(1)(f) -- Integrity and Confidentiality
**CWE**: CWE-532 (Insertion of Sensitive Information into Log File)
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/services/nonce-manager.service.ts`
**Lines**: 106-111, 151, 166

```typescript
// Line 106-111 -- PLAINTEXT wallet address in production logs
logger.info('Nonce acquired', {
  walletAddress,     // <-- NOT REDACTED
  nonce,
  pendingNonce,
  trackedNonce: trackedNonceStr,
});

// Line 151
logger.info('Nonce confirmed', { walletAddress, nonce });

// Line 166
logger.info('Nonce reset', { walletAddress });
```

The key `walletAddress` does **not** match any pattern in `SENSITIVE_SUBSTRINGS` (which has no entry for `'wallet'` or `'address'`) or `SENSITIVE_EXACT`. The wallet address is logged in plaintext.

Under GDPR, blockchain wallet addresses constitute personal data when linkable to an identifiable person. This system stores `customerAddress` alongside `userId` in `payment_sessions`, making wallet addresses linkable PII.

**Fix** (5 minutes):
```typescript
// In /apps/api/src/utils/logger.ts, line 13, add:
const SENSITIVE_SUBSTRINGS = [
  // ... existing entries ...
  'wallet', 'address',
];
```

**Alternative** (preserves debuggability):
```typescript
const masked = walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4);
logger.info('Nonce acquired', { walletPrefix: masked, nonce });
```

---

#### Finding PII-03: Email recipient logged via `to` key [MEDIUM] **OPEN**

**Severity**: Medium
**GDPR Article**: Art. 5(1)(f)
**CWE**: CWE-532
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/services/email.service.ts`
**Line**: 530

```typescript
logger.info('Email sent', {
  to: message.to,         // <-- Key "to" NOT in redaction list
  subject: message.subject,
});
```

The key `to` does **not** match any pattern in `SENSITIVE_SUBSTRINGS` or `SENSITIVE_EXACT`. The email recipient address is logged in plaintext. This is the one confirmed PII leak in the logging system.

**Fix** (5 minutes):
```typescript
// Option A: Add to SENSITIVE_EXACT in logger.ts
const SENSITIVE_EXACT = new Set([
  // ... existing entries ...
  'to', 'from', 'recipient',
]);

// Option B: Remove the field from the log call
logger.info('Email sent', { subject: message.subject });
```

---

#### Finding PII-04: IP addresses in observability logs [MITIGATED]

**Severity**: Low (mitigated by redaction)
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts`
**Lines**: 122, 145, 174

The observability plugin logs `ip: request.ip` in three hooks. The logger's `SENSITIVE_EXACT` set includes `'ip'` (logger.ts line 22), so these values are redacted to `[REDACTED]`.

**Status**: MITIGATED -- IP addresses are correctly redacted by the logger.

---

#### Finding PII-05: Array values not recursively redacted [LOW]

**Severity**: Low
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/logger.ts`
**Line**: 39

```typescript
} else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
  redacted[key] = redactSensitiveFields(value as LogData);
```

The redaction function handles nested objects but explicitly **skips arrays** (`!Array.isArray(value)`). If an array contains objects with sensitive keys, those inner objects are not redacted. Example: `{ users: [{ email: "a@b.com" }] }` -- the array element's `email` key passes through unredacted.

**Fix**:
```typescript
} else if (Array.isArray(value)) {
  redacted[key] = value.map(item =>
    item !== null && typeof item === 'object' && !Array.isArray(item)
      ? redactSensitiveFields(item as LogData)
      : item
  );
} else if (value !== null && typeof value === 'object') {
```

---

#### PII Logging Summary

| Data Type | Logged? | Key Used | Redacted? | Status |
|-----------|---------|----------|-----------|--------|
| Email (auth routes) | Yes (5 locations) | `email` | Yes | MITIGATED |
| Email (email service) | Yes (1 location) | `to` | **No** | **OPEN** |
| Passwords | Never | N/A | N/A | PASS |
| IP addresses | Yes (observability) | `ip` | Yes | MITIGATED |
| Wallet addresses | Yes (nonce-manager) | `walletAddress` | **No** | **OPEN** |
| API keys | Never logged raw | N/A | N/A | PASS |
| JWT tokens | Never logged | N/A | N/A | PASS |
| Webhook secrets | Never logged | N/A | N/A | PASS |

---

### A2. Consent Mechanism

#### Finding CONSENT-01: Cookie consent stored client-side only [MEDIUM] **OPEN**

**Severity**: Medium
**GDPR Article**: Art. 7(1) -- Conditions for Consent (controller must demonstrate consent was given)
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/web/src/components/CookieConsentBanner.tsx`

**What works well**:
- Granular preferences: `essential` (always true), `analytics`, `marketing` (lines 7-8)
- Timestamped consent record (line 9)
- Two clear choices: "Accept All" and "Essential Only" (lines 36-53)
- Banner rendered globally in `App.tsx` (line 100)
- Accessible: `role="dialog"`, `aria-label="Cookie consent"`, `aria-live="polite"` (lines 59-61)
- Links to privacy policy at `/docs/privacy` (line 69)

**What is missing**:

1. **Server-side persistence**: Consent stored only in `localStorage` (line 23). If the user clears browser data, consent evidence is lost. Under GDPR Art. 7(1), the controller must be able to **demonstrate** consent. localStorage is not auditable.

2. **No consent withdrawal UI**: No way to revoke consent after initial selection. GDPR Art. 7(3) requires withdrawal be as easy as giving consent. The banner only appears once (lines 30-33) and there is no "Manage Cookies" link in the footer or settings.

3. **No consent versioning**: If the privacy policy changes, existing consents are not re-requested. No version field tracks which policy version was consented to.

4. **Privacy policy page does not exist**: The link at `/docs/privacy` (line 69) leads nowhere -- no privacy page exists in `apps/web/src/pages/docs/`.

**Fix**:
```typescript
// 1. Add server-side persistence
async function storeConsent(prefs: ConsentPreferences): void {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
  try {
    await fetch('/v1/me/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...prefs, consent_version: '1.0' }),
    });
  } catch { /* Best-effort */ }
}

// 2. Add "Manage Cookies" button in PublicFooter.tsx
// 3. Add consent_version field to ConsentPreferences interface
// 4. Create /docs/privacy page
```

---

### A3. Data Subject Rights (GDPR)

#### Right of Access (Art. 15) -- IMPLEMENTED

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/me.ts`
**Endpoint**: `GET /v1/me` (lines 24-42)

- Returns user profile: id, email, role, createdAt, updatedAt
- Excludes `passwordHash` via explicit `select`
- Requires authentication via `fastify.authenticate`
- Has OpenAPI schema

**Status**: PASS

---

#### Right to Erasure (Art. 17) -- IMPLEMENTED

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/me.ts`
**Endpoint**: `DELETE /v1/me` (lines 140-184)

- Revokes all refresh tokens before deletion (lines 149-151)
- Creates audit log BEFORE deletion for non-repudiation (lines 156-165)
- Cascade deletes: RefreshToken, PaymentSession, ApiKey, WebhookEndpoint, PaymentLink, NotificationPreference
- AuditLog entries intentionally survive deletion (documented in comments)
- Frontend has "Delete Account" with "type DELETE to confirm" dialog (Settings.tsx lines 345-395)

**Status**: PASS

**Note**: The audit log stores `ip` and `userAgent` from the deletion request (lines 163-164). After deletion, this record persists with the IP of the deleted user. This is acceptable for non-repudiation but should be documented in the privacy policy and subject to the retention policy.

---

#### Right to Data Portability (Art. 20) -- IMPLEMENTED

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/me.ts`
**Endpoint**: `GET /v1/me/export` (lines 44-130)

- Returns all user data as JSON download (`Content-Disposition: attachment`)
- Includes: user profile, payment sessions, API keys, webhook endpoints, payment links
- Explicitly excludes sensitive fields: `keyHash` (line 87), `passwordHash` (implicit via select), `secret` (line 98)
- Parallel queries for performance

**Status**: PASS

**Minor improvement**: Add refunds to the export. Refunds are associated via payment sessions and represent user-relevant financial data.

---

#### Right to Rectification (Art. 16) -- PARTIALLY IMPLEMENTED

**Severity**: Medium

- Users CAN change password via `POST /v1/auth/change-password` (auth.ts lines 468-521)
- Users CAN update notification preferences (Settings.tsx + notifications route)
- Users CANNOT change email address -- Settings page shows email as read-only (Settings.tsx line 201)
- No profile update endpoint exists (no name, business name, etc. in schema)

**Status**: PARTIAL -- Email change should be supported or its absence documented.

---

#### Right to Restrict Processing (Art. 18) -- NOT IMPLEMENTED

**Severity**: Medium

There is no mechanism to restrict processing of a user's data. Users cannot put their account into a "frozen" state where existing data is preserved but no new processing occurs.

**Fix**: Add a `processingRestricted Boolean @default(false)` field to User model. When set, stop processing payments, webhooks, and emails for the user while preserving login and data export access.

---

#### Right to Object (Art. 21) -- NOT IMPLEMENTED

**Severity**: Low (less critical for B2B SaaS under contract performance basis)

No mechanism to object to specific processing activities beyond notification preferences.

**Fix**: Document in privacy policy which processing is based on contract performance (Art. 6(1)(b)) vs. legitimate interest (Art. 6(1)(f)). Only the latter requires an objection mechanism.

---

#### GDPR Rights Summary

| Right | Article | Status | Endpoint | Priority |
|-------|---------|--------|----------|----------|
| Access | Art. 15 | PASS | `GET /v1/me` | -- |
| Erasure | Art. 17 | PASS | `DELETE /v1/me` | -- |
| Portability | Art. 20 | PASS | `GET /v1/me/export` | -- |
| Rectification | Art. 16 | PARTIAL | `POST /v1/auth/change-password` | Medium |
| Restrict Processing | Art. 18 | MISSING | None | Medium |
| Right to Object | Art. 21 | MISSING | None | Low |

---

### A4. Data Minimization

#### Finding DATAMIN-01: Signup collects only necessary fields [PASS]

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts`

Signup collects only `email` and `password`. No unnecessary fields required.

**Status**: PASS

#### Finding DATAMIN-02: Payment creation collects appropriate fields [PASS]

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/services/payment.service.ts`

Fields collected: amount, currency, description, network, token, merchant_address, success_url, cancel_url, metadata. All relevant to payment processing.

**Status**: PASS

**Recommendation**: Document that merchants should not store customer PII in the `metadata` JSON field, or add metadata field size limits.

---

### A5. Encryption at Rest

#### Finding ENCRYPT-01: AES-256-GCM for webhook secrets [PASS]

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/encryption.ts`

- AES-256-GCM (authenticated encryption, NIST approved)
- Random 96-bit IV per operation (line 108)
- 128-bit authentication tag (line 36)
- Key entropy validation rejects weak keys (lines 66-71)
- Production enforcement via `enforceProductionEncryption()` in startup-checks.ts

**Status**: PASS

#### Finding ENCRYPT-02: Password hashing uses bcrypt cost 12 [PASS]

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/crypto.ts`

- bcrypt with 12 rounds (line 4)
- API key hashing: HMAC-SHA256 with server-side secret (lines 25-28)
- Production enforces HMAC secret (lines 31-37)
- Timing-safe comparison for webhook signatures (lines 60-83)

**Status**: PASS

#### Finding ENCRYPT-03: Sensitive fields not encrypted at rest [MEDIUM]

**Severity**: Medium
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/prisma/schema.prisma`

| Field | Table | Encrypted? | Risk |
|-------|-------|-----------|------|
| `email` | `users` | No | Primary PII |
| `merchantAddress` | `payment_sessions` | No | Linkable to identity |
| `customerAddress` | `payment_sessions` | No | Linkable to identity |
| `url` | `webhook_endpoints` | No | Merchant infrastructure |
| `ip` | `audit_logs` | No | PII |
| `secret` | `webhook_endpoints` | **Yes** (AES-256-GCM) | -- |
| `passwordHash` | `users` | One-way hash | -- |
| `keyHash` | `api_keys` | One-way hash | -- |
| `tokenHash` | `refresh_tokens` | One-way hash | -- |

**Recommendation**: Consider column-level encryption for `email` and `customerAddress` using the existing AES-256-GCM utility. Note: encrypting `email` would require a separate hash index for lookups.

---

### A6. Retention Policies

#### Finding RETENTION-01: No data retention policy exists [HIGH] **OPEN**

**Severity**: High
**GDPR Article**: Art. 5(1)(e) -- Storage Limitation

There is **no** TTL, cron job, or scheduled cleanup for any PostgreSQL data:

| Data Type | Current Retention | Growth Risk |
|-----------|------------------|-------------|
| Audit logs | Forever | Stores IP + userAgent; grows with every admin action |
| Revoked refresh tokens | Forever | New tokens on every login; never cleaned |
| Payment sessions | Forever | Financial records (7-year legal retention is appropriate, but no enforcement) |
| Webhook deliveries | Forever | Contains full payload + response body (may include PII) |
| Expired payment links | Forever | Dead links never cleaned |
| Failed webhook deliveries | Forever | Accumulates with retry data |

The only TTL-based cleanup exists in Redis for ephemeral data (rate limit counters, reset tokens, JTI blacklist).

**Fix** -- Create a retention worker:
```typescript
const RETENTION_POLICIES = {
  revokedRefreshTokens: '30 days after revocation',
  failedWebhookDeliveries: '90 days',
  auditLogs: '2 years (regulatory)',
  expiredPaymentLinks: '1 year after expiration',
};

// Daily cron job:
await prisma.refreshToken.deleteMany({
  where: { revoked: true, revokedAt: { lt: thirtyDaysAgo } },
});
await prisma.webhookDelivery.deleteMany({
  where: { status: 'FAILED', lastAttemptAt: { lt: ninetyDaysAgo } },
});
```

---

### A7. PII in Redis

#### Finding REDIS-01: Email hashed before Redis storage [PASS]

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts`
**Lines**: 131-134

```typescript
// PRIVACY: Hash email before using as Redis key to avoid storing PII
const emailHash = createHash('sha256').update(body.email.toLowerCase()).digest('hex');
const lockKey = `lockout:${emailHash}`;
```

Account lockout uses SHA-256 hash of email as Redis key. Properly commented with `// PRIVACY` annotation. Password reset tokens in Redis contain `email` but auto-expire (1-hour TTL).

**Status**: PASS

---

## SECTION B: OBSERVABILITY ASSESSMENT

### B1. Structured Logging

#### Finding OBS-01: JSON-structured logging with field redaction [PASS]

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/logger.ts`

| Criteria | Status | Details |
|----------|--------|---------|
| JSON format in production | Yes | Line 66: `console.log(JSON.stringify(logEntry))` |
| Human-readable in dev | Yes | Line 68: formatted console output |
| ISO-8601 timestamps | Yes | Line 57: `new Date().toISOString()` |
| Log level in every entry | Yes | Line 60: `level` field |
| PII redaction | Yes | Lines 8-46: substring + exact match, recursive objects |
| Configurable log level | Yes | `LOG_LEVEL` env var (line 52) |

**Status**: PASS -- Well-designed dual-strategy redaction with substring matching for long patterns and exact matching for short tokens.

---

#### Finding OBS-02: Request correlation via X-Request-ID [PASS]

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/app.ts`
**Lines**: 51-52

```typescript
requestIdHeader: 'x-request-id',
requestIdLogLabel: 'request_id',
```

Fastify accepts upstream `X-Request-ID` headers and propagates through all log entries. The observability plugin includes `request_id` in every request/response log. Error responses include `request_id` for client-side correlation.

**Status**: PASS

---

### B2. Health Endpoints

#### Finding OBS-03: /health and /ready with deep dependency checks [PASS]

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/app.ts`

**`GET /health` (lines 303-368)**:
- Database connectivity check with latency measurement
- Redis connectivity check with latency measurement
- Returns 503 when database is unhealthy
- Infrastructure details gated behind `INTERNAL_API_KEY` (RISK-068 fix)
- Timing-safe comparison for internal key (lines 351-353)
- Public response: `{ status, timestamp }` only

**`GET /ready` (lines 373-380)**:
- Lightweight `SELECT 1` for load balancer routing
- No infrastructure details exposed
- Returns 200/503

Both endpoints exempted from rate limiting via `allowList` (lines 142-145).

**Status**: PASS -- Follows Kubernetes/cloud-native best practices.

---

### B3. Distributed Tracing

#### Finding OBS-04: OpenTelemetry SDK properly initialized [PASS]

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/telemetry.ts`

| Criteria | Status | Details |
|----------|--------|---------|
| OTel SDK initialized | Yes | `NodeSDK` with `serviceName: 'stablecoin-gateway'` |
| Import order correct | Yes | First import in `index.ts:2` (before all other modules) |
| Auto-instrumentation | Yes | HTTP, Fastify, Prisma auto-instrumented |
| Conditional exporter | Yes | Ships traces when `OTEL_EXPORTER_OTLP_ENDPOINT` is set |
| Graceful shutdown | Yes | SIGTERM handler calls `sdk.shutdown()` |
| W3C Trace Context | Yes | Automatic via auto-instrumentations |
| Noisy instrumentation disabled | Yes | `@opentelemetry/instrumentation-fs: { enabled: false }` |

**Status**: PASS

#### Finding OBS-05: No explicit trace propagation in webhook delivery [LOW]

**Severity**: Low
**File**: Webhook delivery executor service

Webhook delivery makes outbound HTTP requests but does not explicitly include `traceparent` header. Auto-instrumentation may handle this if using Node's native `http` module, but should be verified.

---

### B4. Error Tracking

#### Finding OBS-06: No Sentry or equivalent error tracking [HIGH] **OPEN**

**Severity**: High

There is **no** Sentry, Datadog, Bugsnag, or any third-party error tracking service integrated anywhere in the codebase. Errors are logged via the structured logger, but this provides:

1. No real-time alerting on error spikes
2. No error grouping/deduplication
3. No release tracking
4. No user impact analysis
5. No stack trace aggregation across instances

The global error handler (`app.ts` lines 383-427) logs errors and returns RFC 7807 responses but does not report to any external service.

**Fix**:
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  tracesSampleRate: 0.1,
});

// In error handler:
if (reply.statusCode >= 500) {
  Sentry.captureException(error, { tags: { request_id: request.id } });
}
```

---

### B5. Database Monitoring

#### Finding OBS-07: Slow query detection implemented [PASS]

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/prisma.ts`
**Lines**: 29, 45-54

- Configurable threshold: `SLOW_QUERY_THRESHOLD_MS` env var (default 500ms)
- Logs query text, duration, threshold, and target at WARN level
- Uses Prisma event-based subscription

**Status**: PASS

#### Finding OBS-08: Connection pool monitoring absent [MEDIUM] **OPEN**

**Severity**: Medium
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/prisma.ts`

Pool size is configured and validated (lines 13-26), but there is no monitoring of:
- Active connection count vs. pool capacity
- Connection wait time (requests queued for a connection)
- Pool exhaustion events

Under load, pool exhaustion is the most common database failure mode.

**Fix**: Use Prisma's experimental `$metrics` API or add a `/internal/db-health` endpoint.

---

### B6. SRE Golden Signals

#### Finding OBS-09: 3 of 4 golden signals tracked [PARTIAL]

**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/plugins/observability.ts`

| Signal | Tracked? | Implementation | Gap |
|--------|----------|----------------|-----|
| **Latency** | Yes | `duration_ms` in every log; p50/p95/p99 in `/internal/metrics` | No per-route breakdown |
| **Traffic** | Yes | `requests.total`, `byMethod`, `byStatus` | No request rate (RPM) |
| **Errors** | Yes | `errors.total`, `error_rate`, 4xx/5xx breakdown | -- |
| **Saturation** | **No** | Not tracked | DB pool, memory, CPU, event loop lag |

**Key limitation**: All metrics are in-memory and reset on process restart (documented in comments, lines 24-28). Periodic 60-second flush ensures metrics survive in log aggregation. The `started_at` field allows monitoring systems to detect restarts.

**Fix for saturation**:
```typescript
// Event loop lag
setInterval(() => {
  const start = Date.now();
  setImmediate(() => {
    const lag = Date.now() - start;
    if (lag > 100) logger.warn('Event loop lag', { lag_ms: lag });
  });
}, 5000);

// Memory
const usage = process.memoryUsage();
const pct = Math.round((usage.heapUsed / usage.heapTotal) * 100);
if (pct > 85) logger.warn('High memory', { heapPct: pct });
```

---

### B7. Alerting

#### Finding OBS-10: No alerting thresholds defined [HIGH] **OPEN**

**Severity**: High

There are **no** alert rules, thresholds, or notification channels anywhere in the codebase:

1. Error rate could spike to 100% with no notification
2. Database slow queries could cascade with no alert
3. Webhook delivery could fail for all merchants silently
4. Memory leaks would go undetected until OOM crash

The metrics endpoint (`/internal/metrics`) provides data, but nobody is watching it.

**Fix**: Define alert thresholds in code:
```typescript
export const ALERT_THRESHOLDS = {
  errorRate: { warn: 5, critical: 15 },       // percentage
  p99Latency: { warn: 2000, critical: 5000 }, // ms
  webhookFailRate: { warn: 10, critical: 50 }, // percentage
};
```
Then integrate with PagerDuty, OpsGenie, or Slack webhooks.

---

## SECTION C: WHAT IS WORKING WELL

The following aspects deserve recognition as strong engineering:

1. **Logger PII redaction system** (`/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/logger.ts:8-46`): Dual-strategy (substring + exact match) with recursive object traversal. Explicit separation prevents false positives on short patterns like "ip" matching "description".

2. **GDPR Right to Erasure** (`/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/me.ts:140-184`): Correct sequence -- revoke tokens, write audit log, then cascade delete. Audit log survives by design.

3. **Data Export** (`GET /v1/me/export`): Comprehensive with explicit `select` statements excluding sensitive internal fields. Content-Disposition for browser download.

4. **Encryption at rest** (`/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/utils/encryption.ts`): AES-256-GCM with proper IV, auth tag, key entropy validation, and production startup enforcement.

5. **Health endpoint security** (`/health`): Infrastructure details protected behind INTERNAL_API_KEY with timing-safe comparison. Public consumers see only status.

6. **OpenTelemetry integration** (`/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/telemetry.ts`): Properly initialized before all imports. Auto-instrumentation covers HTTP, DB, and framework automatically.

7. **Email enumeration prevention** (auth.ts lines 57-67, 613): Both signup and forgot-password return identical responses regardless of email existence.

8. **Account lockout with hashed email** (auth.ts lines 131-134): SHA-256 hash of email used as Redis key, explicitly commented with `// PRIVACY`.

9. **Slow query detection** (prisma.ts lines 45-54): Configurable threshold with structured logging at WARN level.

10. **Periodic metrics flush** (observability.ts lines 184-206): 60-second interval with `unref()` to prevent process keepalive. Ensures metrics captured in log aggregation.

11. **Timing-safe comparisons**: Used consistently across INTERNAL_API_KEY checks (observability.ts, app.ts), webhook signature verification (crypto.ts:75), and auth plugin.

12. **Cookie consent accessibility**: Proper `role="dialog"`, `aria-label`, `aria-live="polite"` attributes on the consent banner.

---

## SECTION D: FINDING INDEX

| ID | Category | Severity | Status | File |
|----|----------|----------|--------|------|
| PII-01 | PII Logging | Low | MITIGATED | `apps/api/src/routes/v1/auth.ts` |
| PII-02 | PII Logging | Medium | **OPEN** | `apps/api/src/services/nonce-manager.service.ts:106,151,166` |
| PII-03 | PII Logging | Medium | **OPEN** | `apps/api/src/services/email.service.ts:530` |
| PII-04 | PII Logging | Low | MITIGATED | `apps/api/src/plugins/observability.ts:122,145,174` |
| PII-05 | PII Logging | Low | OPEN | `apps/api/src/utils/logger.ts:39` |
| CONSENT-01 | Consent | Medium | **OPEN** | `apps/web/src/components/CookieConsentBanner.tsx` |
| GDPR-Art16 | Data Rights | Medium | PARTIAL | Settings page (email read-only) |
| GDPR-Art18 | Data Rights | Medium | MISSING | No restrict processing mechanism |
| GDPR-Art21 | Data Rights | Low | MISSING | No objection mechanism |
| DATAMIN-01 | Data Minimization | -- | PASS | `apps/api/src/routes/v1/auth.ts` |
| DATAMIN-02 | Data Minimization | -- | PASS | `apps/api/src/services/payment.service.ts` |
| ENCRYPT-01 | Encryption | -- | PASS | `apps/api/src/utils/encryption.ts` |
| ENCRYPT-02 | Encryption | -- | PASS | `apps/api/src/utils/crypto.ts` |
| ENCRYPT-03 | Encryption | Medium | OPEN | `apps/api/prisma/schema.prisma` |
| RETENTION-01 | Retention | High | **OPEN** | System-wide |
| REDIS-01 | PII in Redis | -- | PASS | `apps/api/src/routes/v1/auth.ts:131` |
| OBS-01 | Logging | -- | PASS | `apps/api/src/utils/logger.ts` |
| OBS-02 | Correlation | -- | PASS | `apps/api/src/app.ts:51-52` |
| OBS-03 | Health | -- | PASS | `apps/api/src/app.ts:303-380` |
| OBS-04 | Tracing | -- | PASS | `apps/api/src/telemetry.ts` |
| OBS-05 | Tracing | Low | OPEN | Webhook delivery |
| OBS-06 | Error Tracking | High | **OPEN** | System-wide |
| OBS-07 | DB Monitoring | -- | PASS | `apps/api/src/plugins/prisma.ts:45-54` |
| OBS-08 | DB Monitoring | Medium | OPEN | `apps/api/src/plugins/prisma.ts` |
| OBS-09 | Golden Signals | Medium | PARTIAL | `apps/api/src/plugins/observability.ts` |
| OBS-10 | Alerting | High | **OPEN** | System-wide |

**Totals**: 26 findings. 14 PASS/MITIGATED, 12 OPEN (3 High, 6 Medium, 3 Low).

---

## SECTION E: REMEDIATION ROADMAP

### Immediate (30 minutes)

| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| 1 | PII-02: Wallet addresses in logs | Add `'wallet'` to `SENSITIVE_SUBSTRINGS` in logger.ts | 5 min |
| 2 | PII-03: Email recipient logged as `to` | Add `'to'`, `'from'`, `'recipient'` to `SENSITIVE_EXACT` in logger.ts | 5 min |
| 3 | PII-01: Email passed to logger unnecessarily | Remove `email` field from auth.ts log calls (lines 64, 99, 213, 608, 670) | 15 min |

### 30-Day Plan

| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| 4 | OBS-06: No error tracking | Integrate Sentry with Fastify error handler | 2 hours |
| 5 | RETENTION-01: No data retention | Create retention worker for expired tokens, old deliveries, audit logs | 1 day |
| 6 | PII-05: Array values not redacted | Update `redactSensitiveFields` to handle arrays | 2 hours |
| 7 | OBS-10: No alerting | Define thresholds, integrate Slack/PagerDuty | 4 hours |

### 60-Day Plan

| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| 8 | CONSENT-01: Client-only consent | Add `POST /v1/me/consent` endpoint + DB table | 1 day |
| 9 | CONSENT-01: No consent withdrawal UI | Add "Manage Cookies" in footer + settings | 4 hours |
| 10 | CONSENT-01: Missing privacy policy page | Create `/docs/privacy` page | 1 day |
| 11 | OBS-09: No saturation monitoring | Add event loop lag + memory tracking | 4 hours |
| 12 | OBS-08: No DB pool monitoring | Add pool metrics via Prisma `$metrics` | 4 hours |

### 90-Day Plan

| # | Finding | Fix | Effort |
|---|---------|-----|--------|
| 13 | ENCRYPT-03: Fields not encrypted at rest | Column-level encryption for email, customerAddress | 2 days |
| 14 | GDPR-Art18: Right to Restrict Processing | Add `processingRestricted` flag to User model | 1 day |
| 15 | GDPR-Art16: Email change | Email change with re-verification flow | 2 days |
| 16 | OBS-09: Migrate to Prometheus | Replace in-memory metrics with prom-client | 1 day |

---

## Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| PII Handling (storage) | 7/10 | Email plaintext in DB; passwords/tokens/keys properly hashed |
| PII Handling (logs) | 7/10 | Robust key-based redaction; 2 confirmed leaks (wallet, email `to`) |
| PII Handling (transmission) | 9/10 | HSTS configured, CORS validated, credentials: true |
| Consent Mechanisms | 4/10 | Banner exists with granularity; no server-side persistence |
| Data Subject Rights | 7/10 | Art. 15/17/20 implemented; Art. 16 partial; Art. 18/21 missing |
| Data Minimization | 9/10 | Minimal data collection at signup and payment creation |
| Encryption at Rest | 7/10 | Webhook secrets encrypted; email/addresses plaintext |
| Retention Policies | 1/10 | No automated retention or purge |
| Structured Logging | 9/10 | JSON in prod, correlation IDs, PII redaction |
| Health Endpoints | 10/10 | Deep checks, auth-gated details, rate-limit exempt |
| Distributed Tracing | 8/10 | OTel baseline ready, auto-instrumentation enabled |
| Error Tracking | 1/10 | No external error tracking service |
| Golden Signals | 6/10 | 3 of 4 tracked; saturation missing; no alerting |
| DB Monitoring | 7/10 | Slow queries detected; pool monitoring missing |
