# Security Gate Report: GATE-SECURITY-01 — Foundation

**Product**: AI Fluency
**Assessment Date**: 2026-03-03
**Assessed By**: Security Engineer (DevSecOps Agent)
**Gate Type**: Foundation Security Gate
**Branch Assessed**: main (post-merge)
**Assessment Type**: Foundation — first gate before any feature work proceeds

---

## Gate Result: PASS-WITH-CONDITIONS

**Critical Findings**: 0
**High Findings**: 3
**Medium Findings**: 4
**Low Findings**: 2

The AI Fluency foundation has strong security architecture — Argon2 password hashing, timing-safe comparisons, SHA-256 token hashing, Zod env validation, CORS allow-listing, rate limiting, and RFC 7807 error consistency are all correctly implemented. Three high-severity gaps must be resolved before the first production feature lands: the `@fastify/helmet` plugin is declared as a dependency but never registered, the PostgreSQL RLS session variable (`app.current_org_id`) is never set at request time despite being referenced throughout the schema, and eight high-severity CVEs exist in the workspace (primarily in transitive dependencies).

---

## 1. Dependency Audit

### Backend (`apps/api`) and Frontend (`apps/web`)

Both `pnpm audit --audit-level=high --prod` runs report the same 14 vulnerabilities because this is a monorepo with a shared lockfile. 8 of the 14 are High severity. The ai-fluency package itself is not the direct consumer of most vulnerable packages — they are transitive dependencies from other products in the monorepo workspace.

**Summary**: 2 low | 4 moderate | 8 high

| Package | Severity | Advisory | Path | Note |
|---------|----------|---------|------|------|
| `tar` (<=7.5.3) | HIGH | GHSA-r6q2-hw4h-h46w | `packages__shared>bcrypt>@mapbox/node-pre-gyp>tar` | Race condition, path traversal |
| `tar` (<7.5.7) | HIGH | GHSA-34x7-hfp2-rc4v | `packages__shared>bcrypt>@mapbox/node-pre-gyp>tar` | Hardlink path traversal / arbitrary file write |
| `tar` (<7.5.7) | HIGH | GHSA-8qq5-rm4j-mr97 | `packages__shared>bcrypt>@mapbox/node-pre-gyp>tar` | Arbitrary file overwrite |
| `tar` | HIGH | GHSA-83g3-92jg-28cx | `packages__shared>bcrypt>@mapbox/node-pre-gyp>tar` | Arbitrary file read/write via hardlink target escape |
| `next` (>=13.0.0 <15.0.8) | HIGH | GHSA-h25m-26qc-wcjf | `products__archforge__apps__web>next` | HTTP request deserialization DoS |
| `fastify` (<5.7.2) | HIGH | GHSA-jx2c-rxcm-jvmq | `packages__shared>fastify` | Content-Type tab character allows body validation bypass |
| `nodemailer` | HIGH | GHSA-rcmh-qjqh-p98v | `products__muaththir__apps__api>nodemailer` | DoS via recursive addressparser |
| `serialize-javascript` (<=7.0.2) | HIGH | GHSA-5c6j-r48x-rmvq | `products__connectin__apps__web>@sentry/nextjs>...` | RCE via RegExp.flags |

**Key observation**: None of the 8 high-severity findings originate from ai-fluency's own direct dependencies. They are either:
- In `packages/shared` (bcrypt's `@mapbox/node-pre-gyp>tar`) — affects the whole monorepo
- In other products (`archforge`, `connectin`, `muaththir`) that share the lockfile
- The `fastify` CVE (GHSA-jx2c-rxcm-jvmq) in `packages__shared>fastify` is relevant if ai-fluency's fastify version is below 5.7.2

**Action required**: The `fastify` CVE (body validation bypass) is the most relevant to ai-fluency. The `tar` and `next` CVEs are indirect. Update `packages/shared` fastify to `>=5.7.2` and coordinate `bcrypt` update path.

---

## 2. Secret Scanning

### Status: PASS (with note on .env file)

**Hardcoded secrets in source**: None found. All secrets correctly read from `process.env.*`.

**Committed .env files**: A `.env` file exists at `products/ai-fluency/apps/api/.env` on disk. Git confirms it is NOT tracked (`git show HEAD:products/ai-fluency/apps/api/.env` returns fatal error — file exists on disk but not in HEAD). The root `.gitignore` correctly excludes `.env` files.

**Verification evidence**:
```
git ls-files products/ai-fluency/apps/api/.env  # empty — not tracked
git show HEAD:products/ai-fluency/apps/api/.env  # fatal: not in HEAD
```

**Note**: The `.env` contains development placeholder values (`change-me-min-32-chars-in-production-aaa`) and a zeroed SSO encryption key (`000...000`). These are appropriate for local development. The values must be replaced before any production deployment. The `.env.test` file is also on disk but not tracked by git — this is correct behavior for test environments.

**Sensitive patterns checked**: No API keys, passwords, private keys, or bearer tokens found hardcoded in `src/` or `web/src/`. Logger correctly redacts `password`, `secret`, `token`, `authorization`, `apikey`, `email`, `cookie` fields via substring matching in `logger.ts`.

---

## 3. OWASP Top 10 Assessment (2025 Edition)

### A01 — Broken Access Control

**Result**: WARN (medium gap — RLS context never set)

**What is implemented correctly**:
- JWT authentication verifies signature and expiry using `@fastify/jwt` with algorithm pinned to `HS256` (algorithm confusion attacks prevented)
- Auth plugin fetches user from DB on every request, confirms `deletedAt IS NULL` and checks `LOCKED` / `DEACTIVATED` status
- `requireRole` decorator enforces minimum role via `ROLE_HIERARCHY` array comparison
- Both `authenticate` and `requireRole` decorators are available for per-route use

**Gap found — HIGH**:

The `prisma.ts` plugin comment at line 9 states:
```
* - Fastify onRequest hook: sets app.current_org_id for RLS
*   so PostgreSQL Row Level Security automatically filters all tenant data
```

The schema's comment block at line 249-251 states:
```
// All tenant-scoped tables have RLS policies applied via migration SQL:
//   ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY org_isolation ON <table>
//     USING (org_id = current_setting('app.current_org_id')::uuid);
```

However, the actual `prisma.ts` plugin implementation contains NO code that executes:
```sql
SET LOCAL app.current_org_id = '<orgId>';
```

There is no `onRequest` hook in the plugin. The RLS context variable is declared in schema comments and referenced in security documentation but is never set at runtime. This means PostgreSQL's Row Level Security policies, if applied via migration, will either:
- Fail with a `missing_param_or_setting` error if `current_setting()` requires the variable to exist, or
- Return empty results if using `current_setting('app.current_org_id', true)` (the `true` = missing_ok flag returns NULL), silently bypassing the isolation boundary

This is the most architecturally significant security gap in the foundation.

**OWASP reference**: A01:2025 Broken Access Control
**WSTG ID**: WSTG-AUTHZ-01
**CWE**: CWE-862 (Missing Authorization)

### A02 — Cryptographic Failures

**Result**: PASS

- Passwords hashed with **Argon2** (`argon2` package v0.31.0) — correct algorithm, not MD5/SHA1/bcrypt
- JWT secrets sourced from environment variables with minimum 32-character enforcement via Zod
- JWT algorithm pinned to `HS256` with `verify: { algorithms: ['HS256'] }` — prevents algorithm confusion attacks
- Refresh tokens and verification tokens stored as **SHA-256 hashes** (`hashToken()` in `crypto.ts`) — never plaintext
- SSO secrets stored as **AES-256-GCM encrypted** per schema comment on `SSOConfig.encryptedSecret`
- Timing-safe comparisons using `timingSafeEqual` implemented in `crypto.ts` and used in `observability.ts` for internal API key check
- `safeCompare()` pads buffers to equal length to prevent length-based timing leakage — correct implementation
- TLS: REDIS_URL uses ioredis which supports TLS; DATABASE_URL relies on PostgreSQL TLS config (not visible in app code — externally configured)

**Minor note**: The `SSO_ENCRYPTION_KEY` is defined in `.env.example` and `.env.test` as a 64-character hex string (32 bytes), but no encryption/decryption utility for the SSO secret is implemented in the current foundation code. The `encryptedSecret` field exists in the schema but no AES-256-GCM code is present yet. This is acceptable for foundation phase — flag for implementation when SSO routes are built.

### A03 — Injection

**Result**: PASS

- All database queries use **Prisma ORM** — no raw SQL with user input
- One `$queryRaw` call exists in `health.ts`: `` fastify.prisma.$queryRaw`SELECT 1` `` — this is a template literal with no user input, which Prisma executes as a parameterized query. Safe.
- Input validation via Zod is confirmed for environment variables at startup
- No route body validators are needed yet (only `/health` and `/ready` exist, both GET with no body)
- No `eval()`, `new Function()`, or command injection patterns found
- Query params and URL path params are not yet used in any route

### A04 — Insecure Design

**Result**: WARN (medium gap — security headers not registered)

The product architecture is well-designed: multi-tenant RLS, role hierarchy, soft-deletes for GDPR, audit log with immutable append-only semantics, SHA-256 token hashing, and Argon2 password hashing are all correct design decisions.

**Gap found**: `@fastify/helmet` is listed in `package.json` dependencies but is **not registered** in `app.ts`. Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS) are absent from all API responses. This is a HIGH finding — see HIGH-002 below.

### A05 — Security Misconfiguration

**Result**: PASS (with notes)

- **CORS**: Configured restrictively. Explicit allowlist via `ALLOWED_ORIGINS` env var. No wildcard (`*`). Production requires an `Origin` header (no-origin requests rejected). Default origin is `http://localhost:3118`.
- **Error messages**: Global error handler returns generic `'An unexpected error occurred'` in production. Stack traces suppressed in production (`NODE_ENV === 'production'` check in `app.ts` line 168). RFC 7807 error format used consistently.
- **Body limit**: Set to 1 MB (`bodyLimit: 1_048_576`) — prevents oversized request DoS.
- **Request IDs**: `requestIdHeader: 'x-request-id'` and correlation IDs in all log entries.

**Note**: The `INTERNAL_API_KEY` env var is optional (`z.string().min(1).optional()` in config.ts). If not set, `/metrics` returns 503 rather than 401. This is acceptable — the endpoint reveals no sensitive data without the key.

**Note**: `trustProxy: true` is set globally. This is appropriate if deployed behind a trusted reverse proxy (nginx, AWS ALB) but would allow IP spoofing if directly exposed to the internet. Document deployment constraint.

### A06 — Vulnerable and Outdated Components

**Result**: FAIL

8 high-severity vulnerabilities found (documented in Section 1). The Fastify body validation bypass (GHSA-jx2c-rxcm-jvmq) is most directly relevant to this product.

### A07 — Authentication Failures

**Result**: PASS (with note on account lockout)

- **JWT expiry**: Access token 15 minutes (`JWT_ACCESS_EXPIRY=900`), refresh token 7 days (`JWT_REFRESH_EXPIRY=604800`) — appropriate values
- **JWT verification**: Full signature, expiry, and payload validation on every request
- **Rate limiting**: Configured via `@fastify/rate-limit`. Default 100 req/60 seconds. Auth endpoints will be covered once built.
- **Refresh token**: Stored as SHA-256 hash in `UserSession` model (`refreshTokenHash` field)
- **Login failure tracking**: `loginFailureCount` and `lockedUntil` fields exist in `User` model, `LOCKED` status checked in auth plugin
- **Session invalidation**: `UserSession` model enables server-side session revocation

**Note**: No auth routes exist yet (login, logout, register are commented out in `routes/index.ts`). Account lockout logic exists in the data model but is not yet implemented in any route handler. This is appropriate for the foundation phase.

### A08 — Software and Data Integrity Failures

**Result**: WARN (medium)

- Lock file (`pnpm-lock.yaml`) exists and is committed (confirmed by pnpm workspace usage)
- No GitHub Actions workflow files specific to ai-fluency found to audit for expression injection
- Prisma migration files provide schema-as-code integrity
- No artifact signing implemented (acceptable for development phase)

**Gap**: No `actionlint` evidence on CI workflow files. Address when CI is configured.

### A09 — Security Logging and Monitoring Failures

**Result**: PASS

- Structured JSON logging in production via `logger.ts`
- PII redaction applied to all log entries — `email`, `password`, `token`, `authorization`, `cookie`, `ip` fields are automatically redacted to `[REDACTED]`
- Request correlation via `x-request-id` header
- Access log on every request with `request_id`, `method`, `url`, `status`, `duration_ms`, `user_id`
- Error log with severity differentiation (info/warn/error based on status code)
- `/metrics` endpoint with request totals, error counts, p50/p95/p99 latency (protected by `INTERNAL_API_KEY`)
- Periodic metrics snapshot logged every 60 seconds

**Note**: No alerting configured (acceptable for foundation — alerting is infrastructure). No failed authentication attempt counter in logs yet (will be added with auth routes).

### A10 — SSRF

**Result**: PASS (not yet applicable)

No server-side URL fetching exists in the current foundation. The BADGR integration (`BADGR_API_URL` env var) is planned but not yet implemented. When implemented, validate URL against an allowlist before fetching.

---

## 4. Input Validation Coverage

Routes currently implemented:

| Route | Method | Auth Required | Body Schema | Status |
|-------|--------|--------------|-------------|--------|
| `/health` | GET | No | No body | PASS — no input, response schema defined |
| `/ready` | GET | No | No body | PASS — no input, response schema defined |
| `/metrics` | GET | INTERNAL_API_KEY header | No body | PASS — header checked with timing-safe compare |

**Future routes** (commented out in `routes/index.ts`):
- `/api/v1/auth/*` — not yet implemented
- `/api/v1/assessments/*` — not yet implemented
- `/api/v1/profiles/*` — not yet implemented

The Zod-based input validation infrastructure is fully in place (`zod` in dependencies, ZodError handler in global error handler, config.ts uses Zod for env validation). All future routes must use Zod body validation — the CSRF protection (`@fastify/csrf-protection` in dependencies) and cookie support (`@fastify/cookie`) are ready.

---

## 5. Auth Security

| Control | Status | Evidence |
|---------|--------|---------|
| JWT algorithm pinned (HS256) | PASS | `app.ts` line 83-86: `sign: { algorithm: 'HS256' }, verify: { algorithms: ['HS256'] }` |
| JWT secret min length enforced | PASS | `config.ts` line 19-24: Zod `.min(32)` on JWT_SECRET and JWT_REFRESH_SECRET |
| JWT secret from env var | PASS | `process.env.JWT_SECRET` — not hardcoded |
| Separate access/refresh secrets | PASS | `JWT_SECRET` and `JWT_REFRESH_SECRET` are distinct env vars |
| Access token expiry (15 min) | PASS | `JWT_ACCESS_EXPIRY=900` |
| Refresh token expiry (7 days) | PASS | `JWT_REFRESH_EXPIRY=604800` |
| Refresh tokens hashed in DB | PASS | `UserSession.refreshTokenHash` — SHA-256 hash, never plaintext |
| User status checked on every request | PASS | Auth plugin queries DB on each request, checks LOCKED/DEACTIVATED |
| Timing-safe token comparison | PASS | `crypto.ts:safeCompare()`, used in `observability.ts` |
| Rate limiting on all endpoints | PASS | `@fastify/rate-limit` registered globally, 100 req/60s default |
| Rate limit key by userId (not IP) | PASS | `keyGenerator` in `rate-limit.ts` uses `user:${userId}` when authenticated |
| CSRF protection dependency | PASS | `@fastify/csrf-protection` in dependencies; frontend sends `x-csrf-token` header |

**Gap**: CSRF protection (`@fastify/csrf-protection`) is listed in `package.json` and the frontend API client (`api.ts`) correctly fetches and sends CSRF tokens, but there is no corresponding CSRF plugin registration in `app.ts` for the current foundation. This must be wired when auth routes are added.

---

## 6. Multi-Tenant Security (RLS Verification)

**Result**: HIGH RISK — RLS context variable not set at runtime

### What the schema declares

Every tenant-scoped model in `schema.prisma` has a comment declaring RLS protection:
```
-- RLS: org_id = current_setting('app.current_org_id')::uuid
```

The schema comment block at line 249-251 describes the expected migration SQL:
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON <table>
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

### What the application actually does

The `prisma.ts` plugin's JSDoc says it "sets app.current_org_id for RLS" but contains no code to do this. There is no `fastify.addHook('onRequest', ...)` call in the plugin. No code anywhere in the API source executes:
```sql
SET LOCAL app.current_org_id = '<orgId>';
```

### Risk

If the RLS migration SQL has been applied, queries will either error (`current_setting` returns error if variable not set and `missing_ok` is false) or silently return empty sets (if `missing_ok = true`). If the migration has NOT been applied, there is no tenant isolation at the database layer at all — all users can query all organizations' data via Prisma.

The auth plugin correctly binds `orgId` to the JWT and fetches only the user matching `orgId`, providing application-layer isolation. But without database-layer RLS, a bug in any route handler could expose cross-tenant data.

**Tenant-scoped tables requiring RLS**:
- `users`
- `user_sessions`
- `sso_configs`
- `teams`
- `assessment_templates` (also allows `orgId IS NULL` for platform templates)
- `assessment_sessions`
- `responses`
- `fluency_profiles`
- `learning_paths`
- `learning_path_modules`
- `module_completions`
- `certificates`
- `audit_logs`

---

## 7. Findings Summary

### HIGH-001: RLS Context Variable Never Set — Multi-Tenant Isolation Gap

**Severity**: HIGH
**OWASP**: A01:2025 Broken Access Control
**WSTG**: WSTG-AUTHZ-01
**CWE**: CWE-862 (Missing Authorization)
**Component**: `products/ai-fluency/apps/api/src/plugins/prisma.ts`

**Description**: The `prisma.ts` plugin declares in its JSDoc that it sets `app.current_org_id` for PostgreSQL RLS, but contains no implementation of this behavior. The schema documents RLS policies for all 13 tenant-scoped tables, but the application never executes `SET LOCAL app.current_org_id` in a request hook. This means PostgreSQL RLS is either non-functional (if not applied in migration) or will cause errors/silent data loss (if applied but variable not set).

**Evidence**:
```typescript
// prisma.ts — JSDoc says this is implemented:
// * - Fastify onRequest hook: sets app.current_org_id for RLS

// But there is NO onRequest hook in the implementation.
// The auth plugin sets request.currentUser.orgId but never
// propagates it to the PostgreSQL session variable.
```

**Remediation**: Add a `fastify.addHook('preHandler', ...)` hook (after auth runs) in the prisma plugin or a dedicated RLS plugin that executes:
```typescript
await fastify.prisma.$executeRaw`SET LOCAL app.current_org_id = ${request.currentUser.orgId}::uuid`;
```
This must run within the same database transaction/connection as the route handler query. Alternatively use Prisma middleware. Reference: OWASP Cheat Sheet: SQL Injection Prevention.

**Due**: Before any route that queries tenant-scoped tables goes live.

---

### HIGH-002: @fastify/helmet Declared but Not Registered — Missing Security Headers

**Severity**: HIGH
**OWASP**: A05:2025 Security Misconfiguration
**WSTG**: WSTG-CONF-07
**CWE**: CWE-693 (Protection Mechanism Failure)
**Component**: `products/ai-fluency/apps/api/src/app.ts`

**Description**: `@fastify/helmet` is listed as a production dependency in `package.json` but is never imported or registered in `app.ts`. All API responses lack security headers:
- `Content-Security-Policy` — absent
- `X-Frame-Options: DENY` — absent
- `X-Content-Type-Options: nosniff` — absent
- `Referrer-Policy: strict-origin-when-cross-origin` — absent
- `Strict-Transport-Security` — absent (critical for production HTTPS)

**Evidence**:
```typescript
// package.json:
"@fastify/helmet": "^13.0.0",  // listed

// app.ts — no import, no registration of @fastify/helmet
// grep result: "No helmet/CSP configuration found in app.ts"
```

**Remediation**: Add to `app.ts`:
```typescript
import helmet from '@fastify/helmet';
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
});
```
Register before CORS, before routes.

**Due**: Before any public exposure of the API.

---

### HIGH-003: Fastify CVE — Body Validation Bypass (GHSA-jx2c-rxcm-jvmq)

**Severity**: HIGH (transitive)
**OWASP**: A06:2025 Vulnerable and Outdated Components
**Advisory**: GHSA-jx2c-rxcm-jvmq
**Component**: `packages/shared` — `fastify` dependency

**Description**: Fastify versions below 5.7.2 allow a Content-Type header containing a tab character to bypass body validation. An attacker can send a `Content-Type: application/json\t` header to skip schema validation while still having the body parsed as JSON. This could allow schema-violating payloads to reach route handlers.

**Evidence**: `pnpm audit` confirms `fastify` in `packages__shared` is affected.

**Remediation**: Update `packages/shared` `fastify` to `>=5.7.2`. This applies to all products in the monorepo using the shared fastify package.

**Due**: Within 7 days (High severity per policy).

---

### MEDIUM-001: @fastify/csrf-protection Not Wired in app.ts

**Severity**: MEDIUM
**OWASP**: A01:2025 Broken Access Control (CSRF)
**CWE**: CWE-352
**Component**: `products/ai-fluency/apps/api/src/app.ts`

**Description**: The frontend API client (`api.ts`) correctly fetches and sends `x-csrf-token` on all mutating requests, but the backend has not registered `@fastify/csrf-protection`. The CSRF token endpoint (`GET /api/v1/csrf-token`) is referenced in the frontend but does not exist on the backend. Currently there are no mutation routes, so this is not exploitable yet. However, the first auth route (login, register) will be vulnerable to CSRF if this is not wired before then.

**Note**: JWT-based APIs using `Authorization: Bearer` headers are inherently CSRF-safe for those endpoints. CSRF is only relevant for cookie-based sessions. If the final auth design uses httpOnly cookies for session tokens (as implied by `credentials: 'include'` in `api.ts`), CSRF protection is mandatory.

**Remediation**: Register `@fastify/cookie` and `@fastify/csrf-protection` in `app.ts` before auth routes are implemented. Implement `GET /api/v1/csrf-token` endpoint.

**Due**: Before auth routes are implemented.

---

### MEDIUM-002: trustProxy: true — Requires Documented Deployment Constraint

**Severity**: MEDIUM
**OWASP**: A05:2025 Security Misconfiguration
**CWE**: CWE-346 (Origin Validation Error)
**Component**: `products/ai-fluency/apps/api/src/app.ts` line 38

**Description**: `trustProxy: true` is set globally, which trusts all `X-Forwarded-For` headers. If the API is ever directly exposed to the internet without a reverse proxy (e.g., during development testing or misconfigured staging), an attacker can spoof their IP address. The rate limiter uses `request.ip` for unauthenticated requests, which could be bypassed.

**Remediation**: Change `trustProxy: true` to `trustProxy: 1` (trust only 1 hop) or document that this API must only run behind a trusted reverse proxy. Add deployment checklist item.

**Due**: Document before first staging deployment.

---

### MEDIUM-003: Prisma Query Logging Includes Query Text in Production

**Severity**: MEDIUM
**OWASP**: A09:2025 Security Logging and Monitoring Failures
**CWE**: CWE-200 (Exposure of Sensitive Information)
**Component**: `products/ai-fluency/apps/api/src/plugins/prisma.ts` line 28-36

**Description**: The Prisma client is configured with `{ emit: 'event', level: 'query' }` for slow query logging. When a query runs slower than the threshold, the slow query logger outputs the full query text:
```typescript
logger.warn('Slow query detected', { query: e.query, ... });
```
For slow queries that include where clauses with user IDs or org IDs, the query text will be logged. While the logger redacts fields by key name, it does not inspect query SQL text for embedded values. In production, Prisma parameters are typically separate from query text, but this warrants verification. The `{ emit: 'stdout', level: 'error' }` and `warn` settings bypass the custom logger and write directly to stdout — these may not have PII redaction.

**Remediation**: Remove `{ emit: 'stdout', level: 'error' }` and `{ emit: 'stdout', level: 'warn' }` — route all Prisma logs through the custom logger for consistent PII redaction. Review slow query log output to confirm parameters are not embedded in query text.

**Due**: Before production deployment.

---

### MEDIUM-004: Stack Traces Logged to Server Logs in Error Handler

**Severity**: MEDIUM (low risk — server-side only)
**OWASP**: A09:2025 Security Logging and Monitoring Failures
**CWE**: CWE-209
**Component**: `products/ai-fluency/apps/api/src/utils/logger.ts` lines 118-130

**Description**: The `logger.error()` method logs the full `err.stack` property to server logs in all environments. In development this is useful. In production, stack traces in server logs are acceptable IF the log aggregation system is access-controlled. However, the `error()` call in the global error handler routes unexpected errors with their full stack to the log. This is generally acceptable but should be reviewed once a log aggregation system is in place to ensure logs are not accessible to application-layer users.

**Remediation**: Accept as acceptable risk for production if log system is access-controlled. Document in runbook.

---

### LOW-001: JWT Algorithm Explicitly Pinned — Verify Secret Length Requirement

**Severity**: LOW
**OWASP**: A02:2025 Cryptographic Failures
**CWE**: CWE-327

**Description**: HS256 requires a secret of at least 256 bits (32 bytes). The Zod schema enforces `min(32)` characters, which when using UTF-8 base characters is 32 bytes. However, if the secret contains only ASCII characters (as the example `change-me-min-32-chars-in-production-aaa` suggests), 32 characters = 32 bytes = 256 bits, which is the minimum. Production secrets should be generated with `openssl rand -base64 64` (64 bytes / 512 bits) as recommended in `.env.example`.

**Remediation**: Ensure deployment runbook mandates `openssl rand -base64 64` for JWT_SECRET generation. Consider increasing Zod minimum from 32 to 64.

---

### LOW-002: SSO Encryption Key Placeholder in .env.test

**Severity**: LOW (test environment only)
**OWASP**: A02:2025 Cryptographic Failures
**CWE**: CWE-326

**Description**: The `.env.test` file contains `SSO_ENCRYPTION_KEY=000...000` (64 zeros). This is a zeroed-out placeholder. Since SSO encryption is not yet implemented in the foundation, this has no runtime impact. However, the `.env.test` pattern of using all-zeros keys should be explicitly called out in the test setup documentation to prevent confusion when implementation begins.

**Remediation**: Add a comment to `.env.test` noting this is a placeholder. When SSO encryption is implemented, generate a proper test key.

---

## 8. Security Controls Assessment

| Control | Status | Evidence |
|---------|--------|---------|
| Argon2 password hashing | PASS | `argon2` in dependencies; Prisma schema `passwordHash` field documented as Argon2id |
| SHA-256 token hashing | PASS | `crypto.ts:hashToken()` using `createHash('sha256')` |
| Timing-safe comparisons | PASS | `crypto.ts:safeCompare()`, `observability.ts:timingSafeHeaderCheck()` |
| JWT algorithm pinned (HS256) | PASS | `app.ts` line 84-85 |
| Env var validation at startup | PASS | `config.ts` — Zod schema, fails fast |
| Rate limiting | PASS | `@fastify/rate-limit` registered, 100 req/60s |
| CORS allowlist (no wildcard) | PASS | `app.ts` lines 56-79 — explicit origin check |
| RFC 7807 error format | PASS | All error paths use `AppError.toJSON()` or `buildProblemDetails()` |
| No stack traces to clients | PASS | `app.ts` line 167-172 — generic message in production |
| PII redaction in logs | PASS | `logger.ts:redactSensitiveFields()` — 14 sensitive substrings |
| Body size limit | PASS | `bodyLimit: 1_048_576` (1 MB) |
| Database soft delete (GDPR) | PASS | `deletedAt` on `User`, `AssessmentSession` |
| Audit log model | PASS | Immutable `AuditLog` model with `beforeState`/`afterState` snapshots |
| Refresh tokens hashed in DB | PASS | `UserSession.refreshTokenHash` — never plaintext |
| Account lockout model | PASS | `loginFailureCount`, `lockedUntil`, `LOCKED` status |
| RLS context set at runtime | FAIL | No `SET LOCAL app.current_org_id` in any request hook |
| Security headers (helmet) | FAIL | `@fastify/helmet` not registered in `app.ts` |
| CSRF protection | WARN | Dependency present, frontend wired, backend not registered yet |

---

## 9. Recommendations

### Immediate Actions (Before Next Sprint)

1. **Register `@fastify/helmet`** in `app.ts` (HIGH-002). The package is already installed. This is a 10-line fix.

2. **Implement RLS context hook** (HIGH-001). Add a `preHandler` hook that executes `SET LOCAL app.current_org_id` after authentication. This must be implemented and tested before any route that touches tenant-scoped tables.

3. **Update `packages/shared` fastify** to `>=5.7.2` (HIGH-003). The body validation bypass CVE directly affects request integrity.

### Before First Auth Routes (Sprint 1.1 or Feature Work)

4. **Wire `@fastify/csrf-protection` and `@fastify/cookie`** in `app.ts` and implement the `GET /api/v1/csrf-token` endpoint (MEDIUM-001).

5. **Fix `trustProxy` setting** — change to `1` or document the reverse proxy requirement (MEDIUM-002).

### Before Production Deployment

6. **Fix Prisma stdout logging** — route error/warn levels through the custom logger for PII consistency (MEDIUM-003).

7. **Add product-specific `.gitignore`** — while the root `.gitignore` covers `.env`, add a product-level `.gitignore` in `products/ai-fluency/` as defense-in-depth.

8. **Verify RLS migrations applied** — confirm that the migration SQL described in the schema comments has actually been applied to the database (via `\d+ users` in psql).

9. **Add `actionlint` to CI workflow** for the ai-fluency product when CI is configured.

10. **Generate SBOM** via Syft before first production release.

### Long-term

11. **Implement AES-256-GCM SSO encryption** utility when SSO routes are built.

12. **Increase JWT secret minimum** from 32 to 64 characters in Zod schema.

13. **Add failed auth event logging** when auth routes are implemented.

---

## 10. Compliance Status

| Framework | Coverage | Notes |
|-----------|----------|-------|
| OWASP Top 10 2025 | 7/10 PASS, 1 FAIL (A06 CVEs), 2 WARN (A01 RLS, A04 headers) | See section 3 |
| OWASP API Security Top 10 2023 | N/A (no API routes yet beyond health) | Assess when routes implemented |
| GDPR | Partial — soft delete, data retention, audit log present | Consent capture needed when user-facing |
| CWE-79 XSS | PASS — API is JSON only, no HTML rendering | Frontend review needed separately |
| CWE-89 SQLi | PASS — Prisma ORM, no raw SQL with user input | |
| CWE-352 CSRF | WARN — infrastructure ready, not wired | |
| CWE-798 Hardcoded Creds | PASS — all secrets via env vars | |
| CWE-862 Authorization | WARN — app layer OK, DB RLS layer incomplete | |

---

## 11. Next Assessment

**Recommended**: After auth routes implemented (Sprint 1.1 or first feature sprint)
**Mandatory Triggers**:
- Any route that touches tenant-scoped tables goes live (RLS gap must be resolved first)
- SSO feature implementation
- First production deployment
- Any new external API integration (BADGR, AWS S3)

---

*Security Gate GATE-SECURITY-01 conducted by Security Engineer agent*
*Assessment methodology: Static code review, dependency audit (pnpm audit), secret scanning, OWASP Top 10 2025 manual assessment*
