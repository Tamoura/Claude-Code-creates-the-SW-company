# Stablecoin Gateway -- Route & API Security Audit Report

**Auditor**: Code Reviewer Agent (Principal Software Architect + Security Engineer + Staff Backend Engineer)
**Date**: 2026-02-28
**Scope**: All files under `products/stablecoin-gateway/apps/api/src/routes/` (v1/ and internal/)
**Methodology**: Manual line-by-line review of 13 route files, 12 schema files, validation utilities, auth plugin, and app.ts

---

## Executive Summary

**Overall Assessment**: Good (7.5 / 10)

The stablecoin-gateway API demonstrates mature security practices that exceed typical early-stage products. Authentication, authorization, input validation, rate limiting, and error handling are consistently applied across most routes. The codebase shows clear evidence of iterative hardening through prior audit remediations (RISK-xxx references throughout).

**Top concerns** (3 items requiring attention):

1. **DEV route has zero authentication** -- any user on the network can complete arbitrary payments
2. **SSE endpoint returns plain-text errors** instead of RFC 7807 JSON, breaking client consistency
3. **Several routes lack explicit rate limits**, relying solely on the global default

**Recommendation**: Fix First (address the 5 Critical/High findings below, then ship)

---

## Route Inventory

### Total: 42 routes across 13 files

| # | File | Prefix | Routes | Auth | Schemas | Rate Limit |
|---|------|--------|--------|------|---------|------------|
| 1 | `v1/auth.ts` | `/v1/auth` | 10 | Mixed | Yes (all 10) | Custom (5 req/15 min) on 5 public routes |
| 2 | `v1/payment-sessions.ts` | `/v1/payment-sessions` | 5 | JWT/API key | Yes (all 5) | Custom on SSE; global on others |
| 3 | `v1/payment-links.ts` | `/v1/payment-links` | 7 | Mixed | Yes (all 7) | Custom on 2 public routes |
| 4 | `v1/refunds.ts` | `/v1/refunds` | 3 | JWT/API key | Yes (all 3) | Custom on POST (10/min) |
| 5 | `v1/webhooks.ts` | `/v1/webhooks` | 6 | JWT/API key | Yes (all 6) | Global only |
| 6 | `v1/api-keys.ts` | `/v1/api-keys` | 4 | JWT/API key | Yes (all 4) | Global only |
| 7 | `v1/admin.ts` | `/v1/admin` | 3 | JWT + Admin | Yes (all 3) | Global only |
| 8 | `v1/checkout.ts` | `/v1/checkout` | 1 | None (public) | Yes | Custom (60/min) |
| 9 | `v1/me.ts` | `/v1/me` | 3 | JWT/API key | Yes (all 3) | Global only |
| 10 | `v1/notifications.ts` | `/v1/notifications` | 2 | JWT/API key | Yes (all 2) | Global only |
| 11 | `v1/analytics.ts` | `/v1/analytics` | 3 | JWT/API key | Yes (all 3) | Global only |
| 12 | `v1/dev.ts` | `/v1/dev` | 1 | **NONE** | **NONE** | **NONE** |
| 13 | `internal/webhook-worker.ts` | `/internal` | 1 | Internal API key | **NONE** | **NONE** |

**Schema coverage**: 40 of 42 routes have OpenAPI schemas (95.2%). The 2 missing are `dev.ts` and `webhook-worker.ts`.

**Zod validation coverage**: 40 of 42 routes validate input with Zod. The 2 missing are `dev.ts` and `webhook-worker.ts`.

---

## What Is Working Well

Before listing findings, the following deserve recognition as above-average security practices:

1. **Email enumeration prevention** (`auth.ts:61-68`): Signup returns identical 201 for existing and new accounts. Forgot-password always returns 200. This is textbook-correct and many production APIs get this wrong.

2. **Refresh token rotation with atomic revoke** (`auth.ts:294-311`): Old token revoked and new token created in a single `$transaction`. Prevents token reuse attacks.

3. **Refresh token hashing** (`auth.ts:89, 203, 251, 344`): SHA-256 hashing before storage. Database breach does not expose tokens.

4. **Account lockout with Redis** (`auth.ts:130-181`): 5 attempts / 15 minutes, using hashed email as Redis key to avoid PII storage. Graceful degradation when Redis is absent.

5. **JTI blacklisting on logout** (`auth.ts:361-381`): Access tokens are blacklisted in Redis for their remaining lifetime. Auth plugin fails closed (503) when Redis is unavailable -- correct security posture.

6. **Blockchain verification on status transitions** (`payment-sessions.ts:341-389`): Status cannot advance to CONFIRMING/COMPLETED without on-chain verification. Prevents payment fraud.

7. **FOR UPDATE locking** (`payment-sessions.ts:254-279`): Raw SQL with `FOR UPDATE` inside a transaction prevents double-completion race conditions.

8. **SSRF protection on webhook URLs** (`webhooks.ts:155`): `validateWebhookUrl()` with DNS resolution prevents internal network scanning.

9. **Webhook secret encryption at rest** (`webhooks.ts:75-81`): AES-256-GCM in production, with explicit enforcement (`requireEncryptionInProduction()`).

10. **Idempotency key validation** (`payment-sessions.ts:59-71`): Format-restricted (alphanumeric, max 64 chars) to prevent database bloat and injection.

11. **Idempotency parameter mismatch detection** (`payment-sessions.ts:86-100`): Returns 409 if the same idempotency key is reused with different parameters. Prevents silent parameter manipulation.

12. **CORS origin validation** (`app.ts:83-115`): Case-insensitive comparison, production rejects null Origin, explicit allowlist.

13. **Helmet security headers** (`app.ts:65-79`): CSP, HSTS with preload, and sub-domain enforcement.

14. **Global path parameter sanitization** (`app.ts:265-276`): Rejects IDs with path traversal, null bytes, or non-printable characters.

15. **JWT algorithm pinning** (`app.ts:120-124`): HS256 only, preventing algorithm confusion attacks.

16. **GDPR compliance routes** (`me.ts`): Right of Access, Right to Erasure, Right to Data Portability -- all correctly implemented with cascade deletes and audit trail.

17. **Consistent pagination** across all list endpoints with `limit` (max 100), `offset` (max 10000), `total`, and `has_more`.

18. **Health endpoint information gating** (`app.ts:349-367`): Infrastructure details require `INTERNAL_API_KEY` via timing-safe comparison.

---

## Findings

### FINDING-01: Dev Route Has No Authentication, Validation, Rate Limiting, or Schema

**Severity**: CRITICAL
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/dev.ts:10`
**OWASP**: A01:2021 Broken Access Control, A07:2021 Identification and Authentication Failures

**Description**: The `POST /v1/dev/simulate/:id` route has zero protections: no auth, no Zod validation, no OpenAPI schema, no rate limit. While it is guarded by a `NODE_ENV !== 'production'` check in `app.ts:292`, this relies on a single environment variable being set correctly. If `NODE_ENV` is accidentally unset or misconfigured in a staging/preview environment, anyone on the network can mark arbitrary payment sessions as COMPLETED with fake blockchain data.

**Exploit Scenario**:
1. Attacker discovers staging environment where `NODE_ENV` is not set to `production`
2. Sends `POST /v1/dev/simulate/<payment-id>` with no authentication
3. Payment is marked COMPLETED with fake `txHash` and `customerAddress`
4. Merchant fulfills the order believing payment was received

**Impact**: Financial loss. A single request completes any payment without actual blockchain settlement.

**Fix**:
```typescript
// Option A: Require explicit opt-in via a separate env var
if (process.env.ENABLE_DEV_ROUTES === 'true' && process.env.NODE_ENV !== 'production') {
  // register dev routes
}

// Option B: Add authentication + audit logging even in dev
fastify.post('/simulate/:id', {
  onRequest: [fastify.authenticate, fastify.requireAdmin],
  schema: simulatePaymentRouteSchema,
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
}, async (request, reply) => {
  // ... existing logic ...
  logger.warn('DEV: Payment simulated', { userId: request.currentUser!.id, paymentSessionId: id });
});
```

---

### FINDING-02: SSE Endpoint Returns Plain-Text Error Responses

**Severity**: HIGH
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/payment-sessions.ts:492-531`
**OWASP**: N/A (API design consistency)

**Description**: The SSE endpoint at `GET /v1/payment-sessions/:id/events` uses `reply.raw.writeHead()` with `Content-Type: text/plain` for all error responses (401, 403, 404, 429). Every other endpoint in the API returns RFC 7807 JSON. This breaks client-side error handling that expects a uniform error shape.

**Lines affected**:
- Line 492-494: 401 response as plain text
- Line 502-504: 401 response as plain text
- Line 508-510: 403 response as plain text
- Line 515-517: 403 response as plain text
- Line 529-531: 404 response as plain text
- Line 535-537: 403 response as plain text
- Line 543-545: 429 response as plain text
- Line 548-550: 429 response as plain text
- Line 623-624: 500 response as plain text

**Fix**: Return JSON error bodies even when using `reply.raw`:
```typescript
reply.raw.writeHead(401, { 'Content-Type': 'application/problem+json' });
reply.raw.end(JSON.stringify({
  type: 'https://gateway.io/errors/unauthorized',
  title: 'Unauthorized',
  status: 401,
  detail: 'Missing or invalid authentication token',
}));
```

---

### FINDING-03: Webhook and API Key Routes Have No Endpoint-Specific Rate Limits

**Severity**: MEDIUM
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/webhooks.ts` (all routes)
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/api-keys.ts` (all routes)
**OWASP**: A04:2021 Insecure Design

**Description**: Both `webhooks.ts` and `api-keys.ts` rely entirely on the global rate limit (100 requests/60 seconds per user). For sensitive operations like creating webhook endpoints, rotating secrets, and creating API keys, this is too permissive.

Specific concerns:
- `POST /v1/webhooks` (create): An attacker with a valid token could create hundreds of webhook endpoints before hitting the global limit
- `POST /v1/webhooks/:id/rotate-secret` (rotate): Could be used to rapidly cycle secrets, locking legitimate integrations out
- `POST /v1/api-keys` (create): Could generate many API keys for persistence after account compromise
- `DELETE /v1/api-keys/:id` (delete): Could mass-delete all keys

**Fix**: Add per-route rate limits:
```typescript
fastify.post('/', {
  onRequest: [fastify.authenticate, fastify.requirePermission('write')],
  schema: createWebhookRouteSchema,
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
    },
  },
}, async (request, reply) => { ... });

// Similarly for rotate-secret (5/min), create-api-key (10/min)
```

---

### FINDING-04: `changePassword` and `sse-token` Routes Missing Rate Limits

**Severity**: MEDIUM
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:469`
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:406`
**OWASP**: A07:2021 Identification and Authentication Failures

**Description**: The `POST /v1/auth/change-password` and `POST /v1/auth/sse-token` routes do not use the `authRateLimit` configuration that the other sensitive auth routes use. They fall back to the global 100/minute limit.

- `change-password`: An attacker with a stolen JWT could brute-force the current password verification at 100 attempts/minute (the `verifyPassword` call at line 486 acts as an oracle)
- `sse-token`: Less critical, but could be used to generate many SSE tokens as a resource exhaustion vector

**Fix**: Apply `authRateLimit` to both:
```typescript
fastify.post('/change-password', { ...authRateLimit, schema: changePasswordRouteSchema }, ...);
fastify.post('/sse-token', { ...authRateLimit, schema: sseTokenRouteSchema }, ...);
```

---

### FINDING-05: Logout Route Missing Rate Limit

**Severity**: LOW
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:335`
**OWASP**: A04:2021 Insecure Design

**Description**: `DELETE /v1/auth/logout` does not use `authRateLimit`. While it requires a valid JWT, an attacker with a stolen token could repeatedly call logout with different (guessed) refresh tokens, probing whether specific refresh tokens exist. The response differentiates between "not found" (404) and "success" (200), enabling refresh token enumeration.

**Fix**: Apply `authRateLimit` and consider returning 200 regardless of whether the token was found (privacy-preserving approach matching the signup pattern).

---

### FINDING-06: Admin Route Missing Rate Limit on KMS Rotation

**Severity**: MEDIUM
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/admin.ts:45`
**OWASP**: A04:2021 Insecure Design

**Description**: `POST /v1/admin/kms/rotate` has no per-route rate limit. While it requires admin auth, a compromised admin account could trigger rapid key rotations, causing service instability. The route already has rollback logic (line 56-57), but rapid calls could exhaust the rollback mechanism.

**Fix**: Add aggressive rate limit:
```typescript
fastify.post('/kms/rotate', {
  schema: kmsRotateRouteSchema,
  config: { rateLimit: { max: 3, timeWindow: '10 minutes' } },
}, ...);
```

---

### FINDING-07: Inconsistent `additionalProperties: true` on All OpenAPI Schemas

**Severity**: LOW
**File**: All files in `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/schemas/*.ts`
**OWASP**: N/A (API design)

**Description**: Every OpenAPI body and response schema sets `additionalProperties: true`. While this prevents Fastify's built-in serializer from stripping unknown fields (which could conflict with Zod's validation), it also means the OpenAPI documentation indicates that clients can send any extra fields and expect any extra fields in responses. This weakens the API contract for consumers reading the docs.

**Impact**: Low -- Zod handles actual validation. But it makes the Swagger documentation misleading.

**Fix**: Consider using `additionalProperties: false` on body schemas (request validation) and keeping `true` only on response schemas where Fastify's serialization might strip fields. Alternatively, add a note in the OpenAPI description that Zod provides the authoritative validation.

---

### FINDING-08: Checkout Route Does Not Validate `:id` as UUID

**Severity**: LOW
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/checkout.ts:22`
**OWASP**: A03:2021 Injection

**Description**: The `GET /v1/checkout/:id` route accepts any string as the `:id` parameter. While the global `SAFE_ID_RE` hook in `app.ts:265` prevents path traversal and null bytes, it does not enforce UUID format. A client could pass non-UUID strings that hit the database unnecessarily.

**Mitigation**: The global `SAFE_ID_RE` regex (`/^[a-zA-Z0-9_-]{1,128}$/`) already prevents injection. The risk is limited to unnecessary database queries with invalid IDs, which Prisma handles safely (returns null). This is LOW because the `uuidParamSchema` defined in `validation.ts:261-263` exists but is never used for path parameter validation in any route.

**Fix**: Apply `uuidParamSchema` validation in route handlers for `:id` parameters:
```typescript
import { uuidParamSchema } from '../../utils/validation.js';

// In route handler:
const { id } = request.params as { id: string };
uuidParamSchema.parse(id); // Throws ZodError for non-UUID
```

---

### FINDING-09: `me.ts` Export Endpoint Lacks Pagination on Child Collections

**Severity**: LOW
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/me.ts:55-113`
**OWASP**: N/A (Performance)

**Description**: The `GET /v1/me/export` endpoint loads ALL payment sessions, API keys, webhook endpoints, and payment links for the user in a single request with no pagination or limit. For a merchant with thousands of transactions, this could produce a multi-megabyte response and cause memory pressure.

**Fix**: Add a `take` limit or implement streaming JSON:
```typescript
fastify.prisma.paymentSession.findMany({
  where: { userId },
  take: 10000, // Safety cap
  orderBy: { createdAt: 'desc' },
});
```

---

### FINDING-10: Payment Link QR Code Route Bypasses Service Validation

**Severity**: LOW
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/payment-links.ts:251-312`
**OWASP**: A01:2021 Broken Access Control

**Description**: The `GET /v1/payment-links/:id/qr` route performs inline validation of `active` and `expiresAt` (lines 273-279) instead of using the `PaymentLinkService.getPaymentLinkByShortCode()` method. While both check the same conditions, the inline validation does NOT check `maxUsages` vs `usageCount`. A payment link that has exhausted its maximum usages can still have its QR code generated and scanned, potentially confusing users.

**Fix**: Delegate validation to the service:
```typescript
// Replace inline checks with service method
const paymentLinkService = new PaymentLinkService(fastify.prisma);
try {
  const link = await paymentLinkService.getPaymentLinkByShortCode(id);
  // ... generate QR
} catch (error) {
  // Link not found, inactive, expired, or exhausted
}
```

---

### FINDING-11: Internal Webhook Worker Returns Non-RFC-7807 Errors

**Severity**: LOW
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/internal/webhook-worker.ts:28-56`
**OWASP**: N/A (API consistency)

**Description**: The webhook worker endpoint returns `{ error: "..." }` for its error responses (lines 29, 53, 78) instead of RFC 7807 format used everywhere else. While this is an internal endpoint, consistency aids debugging and monitoring.

**Fix**:
```typescript
return reply.code(401).send({
  type: 'https://gateway.io/errors/unauthorized',
  title: 'Unauthorized',
  status: 401,
  detail: 'Invalid internal API key',
});
```

---

### FINDING-12: Analytics Routes Do Not Use `validateQuery` Helper

**Severity**: LOW
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/analytics.ts:24-82`
**OWASP**: N/A (Code quality)

**Description**: The analytics routes call `analyticsOverviewQuerySchema.parse(request.query)` directly (line 24) instead of using the `validateQuery()` helper used by all other routes. This is functionally identical but creates inconsistency. Additionally, the overview route parses the query but discards the result (line 24-25), which serves no purpose since the schema is `z.object({}).default({})`.

**Fix**: Use `validateQuery()` for consistency and remove the no-op parse in the overview handler.

---

### FINDING-13: `DELETE /v1/me` Does Not Confirm Intent

**Severity**: MEDIUM
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/me.ts:140-184`
**OWASP**: A04:2021 Insecure Design

**Description**: The `DELETE /v1/me` endpoint permanently deletes a user account and all associated data (payments, API keys, webhooks, payment links) with a single unauthenticated request body. There is no confirmation mechanism -- no password re-entry, no confirmation token, no "type DELETE to confirm". A stolen JWT allows immediate, irreversible account deletion.

**Fix**: Require password confirmation in the request body:
```typescript
const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password required for account deletion'),
});

// In handler:
const { password } = validateBody(deleteAccountSchema, request.body);
const user = await fastify.prisma.user.findUnique({ where: { id: userId } });
const isValid = await verifyPassword(password, user!.passwordHash);
if (!isValid) {
  throw new AppError(401, 'invalid-credentials', 'Password verification failed');
}
```

---

### FINDING-14: Refund Idempotency Key Not Validated for Format

**Severity**: LOW
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/refunds.ts:69`
**OWASP**: A03:2021 Injection

**Description**: The `POST /v1/refunds` route reads the `Idempotency-Key` header (line 69) but does not validate its format using `idempotencyKeySchema` the way `payment-sessions.ts:61-71` does. This means the refund endpoint accepts arbitrary strings as idempotency keys, including very long strings or strings with special characters.

**Fix**: Add the same validation:
```typescript
const idempotencyKey = (request.headers['idempotency-key'] as string) || undefined;
if (idempotencyKey !== undefined) {
  const result = idempotencyKeySchema.safeParse(idempotencyKey);
  if (!result.success) {
    return reply.code(400).send({
      type: 'https://gateway.io/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: result.error.issues[0].message,
    });
  }
}
```

---

### FINDING-15: `sessions` List Endpoint Has No Pagination

**Severity**: LOW
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts:526-550`
**OWASP**: N/A (Performance)

**Description**: `GET /v1/auth/sessions` returns all active refresh tokens for a user without pagination (`findMany` with no `take`/`skip`). While most users will have few active sessions, a programmatic client that logs in frequently without logging out could accumulate many sessions.

**Fix**: Add a reasonable limit:
```typescript
const tokens = await fastify.prisma.refreshToken.findMany({
  where: { userId, revoked: false, expiresAt: { gt: new Date() } },
  orderBy: { createdAt: 'desc' },
  take: 100, // Safety cap
  select: { id: true, createdAt: true, expiresAt: true },
});
```

---

### FINDING-16: `notification` Routes Missing Rate Limit on Preferences Update

**Severity**: LOW
**File**: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company/products/stablecoin-gateway/apps/api/src/routes/v1/notifications.ts:129`
**OWASP**: N/A

**Description**: `PATCH /v1/notifications/preferences` has no per-route rate limit. While the impact is low (it only updates the user's own preferences), a script could rapidly toggle preferences, generating excessive database writes.

**Fix**: Global rate limit (100/min) is sufficient here. This is informational only.

---

## Summary by Category

### 1. Input Validation

| Route File | Assessment | Notes |
|-----------|-----------|-------|
| `auth.ts` | PASS | Zod schemas for all 10 routes. Password complexity enforced (12+ chars, mixed case, number, symbol). |
| `payment-sessions.ts` | PASS | Comprehensive Zod validation. Ethereum address checksumming. Metadata size limits (50 keys, 16KB). HTTPS-only redirect URLs. |
| `payment-links.ts` | PASS | Same quality as payment-sessions. Amount bounds (1-10000). Short code validated via service. |
| `refunds.ts` | PASS | Amount precision limited to 6 decimal places. Payment session ID required. |
| `webhooks.ts` | PASS | HTTPS-only URLs. Event enum validation. SSRF protection via `validateWebhookUrl()`. |
| `api-keys.ts` | PASS | Name length (1-100). Permission object validated. |
| `admin.ts` | PASS | Query params bounded. Search string max 255. |
| `checkout.ts` | PASS (minor) | No Zod on `:id` param (mitigated by global sanitization). |
| `me.ts` | PASS | No body needed for GET/DELETE (correctly). |
| `notifications.ts` | PASS | Boolean-only fields. |
| `analytics.ts` | PASS | Enum validation on `period`, `group_by`. Day range bounded (1-365). |
| `dev.ts` | **FAIL** | No validation whatsoever. |
| `webhook-worker.ts` | PASS (N/A) | Internal endpoint, no user input beyond auth header. |

### 2. Authorization (BOLA Prevention)

| Route File | Assessment | Notes |
|-----------|-----------|-------|
| `auth.ts` | PASS | Logout verifies `userId` matches refresh token owner (`auth.ts:349`). SSE token verifies payment session ownership (`auth.ts:425`). Session revoke scoped to `userId` (`auth.ts:559`). |
| `payment-sessions.ts` | PASS | All queries include `userId` filter. `FOR UPDATE` lock includes `user_id` in WHERE clause (`payment-sessions.ts:277`). |
| `payment-links.ts` | PASS | Service layer enforces `userId` on get/update/delete. Public routes (resolve, QR) do not expose sensitive data. |
| `refunds.ts` | PASS | Service layer enforces `userId`. |
| `webhooks.ts` | PASS | Every query uses `findFirst({ where: { id, userId } })`. |
| `api-keys.ts` | PASS | Every query uses `findFirst({ where: { id, userId } })`. |
| `admin.ts` | PASS | Admin-only via `requireAdmin` hook. Can view all merchants by design. |
| `checkout.ts` | PASS | Public endpoint. Sensitive fields (merchant_address, customer_address, tx_hash) excluded from response. |
| `me.ts` | PASS | Always operates on `request.currentUser!.id`. |
| `notifications.ts` | PASS | Service scoped to `userId`. |
| `analytics.ts` | PASS | Service scoped to `userId`. |
| `dev.ts` | **FAIL** | No auth = no ownership check. Any payment can be completed. |
| `webhook-worker.ts` | N/A | Internal endpoint, not user-scoped. |

### 3. Rate Limiting

| Route | Custom Rate Limit | Global Fallback | Assessment |
|-------|------------------|----------------|------------|
| `POST /v1/auth/signup` | 5/15min (IP+UA) | Yes | PASS |
| `POST /v1/auth/login` | 5/15min (IP+UA) | Yes | PASS |
| `POST /v1/auth/refresh` | 5/15min (IP+UA) | Yes | PASS |
| `DELETE /v1/auth/logout` | None | Yes (100/min) | LOW risk |
| `POST /v1/auth/sse-token` | None | Yes (100/min) | MEDIUM risk |
| `POST /v1/auth/change-password` | None | Yes (100/min) | **MEDIUM risk** |
| `POST /v1/auth/forgot-password` | 5/15min (IP+UA) | Yes | PASS |
| `POST /v1/auth/reset-password` | 5/15min (IP+UA) | Yes | PASS |
| `GET /v1/auth/sessions` | None | Yes | PASS |
| `DELETE /v1/auth/sessions/:id` | None | Yes | PASS |
| `POST /v1/payment-sessions` | None | Yes | PASS |
| `GET /v1/payment-sessions` | None | Yes | PASS |
| `GET /v1/payment-sessions/:id` | None | Yes | PASS |
| `PATCH /v1/payment-sessions/:id` | None | Yes | PASS |
| `GET /v1/payment-sessions/:id/events` | 10/min (userId) | Yes | PASS |
| `POST /v1/payment-links` | None | Yes | PASS |
| `GET /v1/payment-links` | None | Yes | PASS |
| `GET /v1/payment-links/resolve/:shortCode` | 60/min (IP) | Yes | PASS |
| `GET /v1/payment-links/:id/qr` | 30/min (IP) | Yes | PASS |
| `GET /v1/payment-links/:id` | None | Yes | PASS |
| `PATCH /v1/payment-links/:id` | None | Yes | PASS |
| `DELETE /v1/payment-links/:id` | None | Yes | PASS |
| `POST /v1/refunds` | 10/min (user) | Yes | PASS |
| `GET /v1/refunds` | None | Yes | PASS |
| `GET /v1/refunds/:id` | None | Yes | PASS |
| All webhook routes | None | Yes (100/min) | **MEDIUM risk** |
| All API key routes | None | Yes (100/min) | **MEDIUM risk** |
| All admin routes | None | Yes (100/min) | **MEDIUM risk** |
| `GET /v1/checkout/:id` | 60/min (IP) | Yes | PASS |
| All `/v1/me` routes | None | Yes | PASS |
| All notification routes | None | Yes | PASS |
| All analytics routes | None | Yes | PASS |
| `POST /v1/dev/simulate/:id` | **None** | **None** | **CRITICAL** |
| `POST /internal/webhook-worker` | **None** | **None** | Low (internal) |

### 4. Error Responses (RFC 7807 Consistency)

| Route File | RFC 7807 Compliant | Notes |
|-----------|-------------------|-------|
| `auth.ts` | PASS | All error paths return `{ type, title, status, detail }`. |
| `payment-sessions.ts` | **PARTIAL** | SSE endpoint uses plain-text errors. All other routes PASS. |
| `payment-links.ts` | PASS | |
| `refunds.ts` | PASS | |
| `webhooks.ts` | PASS | |
| `api-keys.ts` | PASS | |
| `admin.ts` | PASS | |
| `checkout.ts` | PASS | Uses 410 Gone for expired sessions (correct). |
| `me.ts` | PASS | |
| `notifications.ts` | PASS | |
| `analytics.ts` | PASS | |
| `dev.ts` | PASS | Uses RFC 7807 format for its errors. |
| `webhook-worker.ts` | **FAIL** | Returns `{ error: "..." }` instead of RFC 7807. |

### 5. Pagination

All list endpoints implement pagination with consistent shape:
```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 42,
    "has_more": true
  }
}
```

Uses offset-based pagination (not cursor). All `limit` params are bounded (max 100). All `offset` params are bounded (max 10000).

**Exception**: `GET /v1/auth/sessions` has no pagination (FINDING-15).
**Exception**: `GET /v1/me/export` loads all records unbounded (FINDING-09).

### 6. API Design Consistency

| Aspect | Assessment | Notes |
|--------|-----------|-------|
| HTTP methods | PASS | POST for create, GET for read, PATCH for update, DELETE for delete. Correct throughout. |
| Status codes | PASS | 201 for create, 200 for read/update, 204 for delete, 400/401/403/404 for errors. |
| Naming | PASS | Consistent `snake_case` for JSON fields. Consistent `/v1/` prefix. |
| Versioning | PASS | All routes under `/v1/`. |
| Idempotency | PASS | `Idempotency-Key` header for POST payment-sessions and refunds. 200 vs 201 distinguishes new vs existing. |
| Content negotiation | PASS | JSON responses. SSE uses `text/event-stream`. |

### 7. OpenAPI Schemas

**40 of 42 routes have OpenAPI schemas** (95.2%).

Missing schemas:
1. `v1/dev.ts` -- no schema at all
2. `internal/webhook-worker.ts` -- no schema at all

All schemas use `RouteSchema` type alias (`Record<string, any>`) which is intentionally loose to prevent Fastify from narrowing `reply.code()` TypeScript types. This is documented in `schemas/shared.ts:14-15`.

### 8. CSRF/CORS

| Aspect | Assessment | Notes |
|--------|-----------|-------|
| CORS | PASS | Explicit origin allowlist. Production rejects null Origin. Case-insensitive comparison. |
| CSRF | PASS (by design) | API uses Bearer tokens (JWT + API keys), not cookies. CSRF is not applicable to Bearer-token APIs since the token must be explicitly attached by the client. |
| Security headers | PASS | Helmet with CSP, HSTS (1 year, preload), X-Content-Type-Options, etc. |

---

## Risk Matrix (Top 10)

| # | Finding | Severity | Likelihood | Blast Radius | Risk Score |
|---|---------|----------|-----------|--------------|------------|
| 1 | FINDING-01: Dev route zero auth | Critical | Medium | Product-wide | **HIGH** |
| 2 | FINDING-13: Account deletion no confirmation | Medium | Medium | User-specific | **MEDIUM** |
| 3 | FINDING-02: SSE plain-text errors | High | High | Feature-specific | **MEDIUM** |
| 4 | FINDING-03: Webhook/API key no rate limit | Medium | Medium | Product-wide | **MEDIUM** |
| 5 | FINDING-04: change-password no rate limit | Medium | Medium | User-specific | **MEDIUM** |
| 6 | FINDING-06: Admin KMS no rate limit | Medium | Low | Product-wide | **LOW-MED** |
| 7 | FINDING-14: Refund idempotency key unvalidated | Low | Medium | Feature-specific | **LOW** |
| 8 | FINDING-08: Checkout `:id` not UUID validated | Low | Low | Feature-specific | **LOW** |
| 9 | FINDING-10: QR route bypasses max_usages | Low | Low | Feature-specific | **LOW** |
| 10 | FINDING-09: Export endpoint unbounded | Low | Low | User-specific | **LOW** |

---

## Remediation Roadmap

### Immediate (1-2 days)

1. **FINDING-01**: Add auth + rate limit to dev route, or add secondary env var gate
2. **FINDING-04**: Apply `authRateLimit` to `change-password` and `sse-token`
3. **FINDING-14**: Add `idempotencyKeySchema` validation to refund route

### Short-term (1 week)

4. **FINDING-02**: Convert SSE error responses to RFC 7807 JSON
5. **FINDING-03**: Add per-route rate limits to webhook and API key creation/rotation
6. **FINDING-13**: Add password confirmation to `DELETE /v1/me`
7. **FINDING-11**: Convert webhook-worker errors to RFC 7807

### Low Priority (backlog)

8. **FINDING-06**: Add rate limit to KMS rotation
9. **FINDING-08**: Apply `uuidParamSchema` to `:id` params
10. **FINDING-09**: Add safety cap to export endpoint
11. **FINDING-10**: Use service method for QR route validation
12. **FINDING-15**: Add pagination to sessions list
13. **FINDING-07**: Review `additionalProperties: true` on schemas
14. **FINDING-12**: Use `validateQuery()` consistently in analytics
15. **FINDING-05**: Apply rate limit to logout
16. **FINDING-16**: Consider rate limit on notification preferences

---

## Audit Methodology Notes

- All 13 route files read in full (2,341 lines total)
- All 12 schema files read in full
- `utils/validation.ts` (274 lines), `plugins/auth.ts` (175 lines), `app.ts` (441 lines) read in full
- `types/index.ts` (253 lines) read for error class and Fastify extensions
- Cross-referenced each route against the 8 audit criteria
- Compared patterns against CR-PATTERN-004 (rate limiting) and CR-PATTERN-015 (Zod validation)
- Verified BOLA prevention by tracing `userId` through every data access query

---

*Report generated by Code Reviewer Agent. File count: 13 route files, 12 schema files, 4 supporting files.*
