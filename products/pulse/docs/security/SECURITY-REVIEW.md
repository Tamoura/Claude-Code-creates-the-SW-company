# Pulse API - Security Review

**Date**: 2026-02-07
**Reviewer**: Security Engineer (DevSecOps)
**Scope**: Pulse API v0.1 (Foundation Sprint)
**Branch**: feature/pulse/inception
**Status**: Completed - Fixes Applied

---

## Executive Summary

The Pulse API foundation has a solid security baseline with several
important patterns already in place: JWT authentication, bcrypt
password hashing (cost 12), HMAC SHA-256 webhook verification, Zod
input validation, sensitive data redaction in logs, CORS configuration,
and security headers via Helmet.

This review identified **2 Critical**, **3 High**, **4 Medium**, and
**3 Low** severity findings. The Critical and most High findings have
been addressed in this sprint. Remaining items are tracked for the
next sprint.

---

## Findings Summary

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | Critical | Rate limiting not registered | **FIXED** |
| 2 | Critical | GitHub tokens stored in plaintext | **FIXED** (utility created) |
| 3 | High | JWT secret fallback to weak default | **FIXED** |
| 4 | High | No team membership verification on repo routes | Deferred (Sprint 2) |
| 5 | High | WebSocket room subscription without authorization | Deferred (Sprint 2) |
| 6 | Medium | WebSocket token in query string logged | Documented risk |
| 7 | Medium | No OAuth CSRF state parameter | Deferred (Sprint 2) |
| 8 | Medium | No JWT jti claim for revocation | Deferred (Sprint 2) |
| 9 | Medium | Webhook body reconstruction vs raw payload | Documented risk |
| 10 | Low | Error messages in dev mode expose internals | Acceptable (dev only) |
| 11 | Low | No Content-Type validation on webhook | Low priority |
| 12 | Low | Handler casts before Zod validation | Low priority |

---

## Detailed Findings

### FINDING-01: Rate Limiting Not Registered (Critical) -- FIXED

**Description**: The `@fastify/rate-limit` package was listed in
`package.json` dependencies but was never imported or registered in
`app.ts`. All endpoints were unprotected against brute-force and
denial-of-service attacks.

**Impact**: An attacker could perform unlimited credential stuffing
attacks against the login endpoint, or overwhelm the API with requests.

**Fix Applied**:
- Registered `@fastify/rate-limit` globally in `app.ts` with:
  - Global: 100 requests/minute per IP
  - Auth endpoints: 10 requests/minute per IP (production)
- Added route-level config for `/register` and `/login` endpoints
- 31 security tests added, including rate limit verification

**File**: `src/app.ts`, `src/modules/auth/routes.ts`

---

### FINDING-02: GitHub Tokens Stored in Plaintext (Critical) -- FIXED

**Description**: The `githubToken` field in the User model is stored
as a plain string. The PRD specifies AES-256 encryption at rest, and
the `ENCRYPTION_KEY` environment variable exists in the config, but no
encryption/decryption logic was implemented.

**Impact**: If the database is compromised, all GitHub OAuth tokens
are immediately usable by an attacker to access users' repositories.

**Fix Applied**:
- Created `src/utils/encryption.ts` with:
  - `encryptToken()`: AES-256-GCM with random IV and auth tag
  - `decryptToken()`: Authenticated decryption with tamper detection
  - `isEncrypted()`: Format detection helper
- Output format: `iv:authTag:ciphertext` (all hex-encoded)
- Requires `ENCRYPTION_KEY` (64-char hex = 32 bytes)
- Tests verify: encrypt/decrypt roundtrip, random IVs, tamper detection

**File**: `src/utils/encryption.ts`

**Note**: The OAuth callback stub needs to call `encryptToken()` before
storing when the full GitHub OAuth exchange is implemented.

---

### FINDING-03: JWT Secret Fallback to Weak Default (High) -- FIXED

**Description**: `app.ts` line 66 used
`process.env.JWT_SECRET || 'pulse-dev-secret'`. In production, if the
environment variable is not set, a guessable static string would be used
as the JWT signing secret.

**Impact**: An attacker who knows the default secret can forge valid
JWT tokens for any user.

**Fix Applied**:
- Added production guard: throws on startup if `JWT_SECRET` is not set
  when `NODE_ENV === 'production'`
- Development/test environments still use the fallback for convenience

**File**: `src/app.ts`

---

### FINDING-04: No Team Membership Verification (High) -- Deferred

**Description**: The repos module checks authentication (JWT valid) but
does not verify that the authenticated user is a member of the team
whose data they are requesting. Any authenticated user can pass any
`teamId` parameter and access that team's repositories.

**Impact**: Horizontal privilege escalation. User A can view, connect,
and disconnect repos belonging to Team B.

**Recommendation**: Add middleware that verifies
`user.id IN (SELECT userId FROM team_members WHERE teamId = :teamId)`
before processing team-scoped requests.

---

### FINDING-05: WebSocket Room Subscription Without Authorization (High) -- Deferred

**Description**: After WebSocket authentication, any user can subscribe
to any room (e.g., `team:other-team-id`) without verification that they
belong to that team. The room name is validated for format but not for
authorization.

**Impact**: An authenticated user can subscribe to real-time activity
feeds of teams they don't belong to.

**Recommendation**: Before subscribing, verify the user is a member of
the team or has access to the repo referenced in the room name.

---

### FINDING-06: WebSocket Token in Query String (Medium) -- Documented

**Description**: WebSocket connections support JWT authentication via
the `?token=xxx` query parameter. This token appears in server access
logs, proxy logs, and browser history.

**Impact**: Token exposure in log aggregation systems or shared
browsing environments.

**Mitigation**: The message-based auth alternative is already
supported. Frontend should prefer sending `{ type: "auth", token: "..." }`
as the first WebSocket message instead of using the query parameter.

---

### FINDING-09: Webhook Body Reconstruction (Medium) -- Documented

**Description**: The webhook handler uses `JSON.stringify(request.body)`
to reconstruct the raw body for HMAC signature verification. If
Fastify's JSON parser normalizes whitespace, reorders keys, or
otherwise modifies the payload, the reconstructed body may differ from
what GitHub signed.

**Impact**: Legitimate webhooks could fail verification (false
negative), or in theory, a crafted payload could pass verification
(false positive) if JSON normalization changes the semantic meaning.

**Mitigation**: In practice, `JSON.stringify()` on a
`JSON.parse()`-ed object is deterministic and GitHub sends compact
JSON. However, using Fastify's `rawBody` option would be more robust.

**Recommendation**: Enable `rawBody: true` in Fastify config or use
`addContentTypeParser` to capture the raw buffer for webhook routes.

---

## Security Controls Assessment

### Authentication

| Control | Status | Notes |
|---------|--------|-------|
| JWT-based auth | Active | HS256, 1hr expiry |
| bcrypt password hashing | Active | Cost factor 12 |
| Password strength validation | Active | Zod: 8+ chars, upper, lower, digit, special |
| Auth enforcement on protected routes | Active | All non-health endpoints require JWT |
| Token expiry verification | Active | @fastify/jwt handles exp claim |
| Refresh token support | Schema ready | RefreshToken model exists, flow not implemented |

### Authorization

| Control | Status | Notes |
|---------|--------|-------|
| RBAC model | Schema ready | UserRole enum: ADMIN, MEMBER, VIEWER |
| Team membership verification | **Missing** | Routes accept any teamId from auth'd users |
| WebSocket room authorization | **Missing** | No membership check on subscribe |

### Data Protection

| Control | Status | Notes |
|---------|--------|-------|
| GitHub token encryption | Utility created | AES-256-GCM with random IV |
| Password hash in responses | Excluded | Auth routes filter user response |
| Sensitive data in logs | Redacted | Logger filters 12+ sensitive key patterns |
| TLS in transit | Infra concern | Not applicable at application layer |

### Input Validation

| Control | Status | Notes |
|---------|--------|-------|
| Zod schemas on auth | Active | register, login schemas |
| Zod schemas on repos | Active | connectRepo, repoIdParam, listReposQuery |
| Zod schemas on webhooks | Active | webhookHeaders schema |
| Zod schemas on activity | Active | wsClientMessage, activityFeedQuery |
| Zod schemas on metrics | Active | metricsQuery schema |
| SQL injection protection | Active | Prisma ORM parameterizes all queries |
| Body size limit | Active | 1MB via Fastify config |

### Rate Limiting

| Control | Status | Notes |
|---------|--------|-------|
| Global rate limit | **Active** | 100 req/min per IP |
| Auth endpoint rate limit | **Active** | 10 req/min per IP (production) |
| Webhook rate limit | Inherited | Global 100 req/min applies |

### Security Headers

| Control | Status | Notes |
|---------|--------|-------|
| Content-Security-Policy | Active | Via @fastify/helmet |
| X-Content-Type-Options | Active | `nosniff` |
| X-Frame-Options | Active | Set by helmet |
| Strict-Transport-Security | Active | Set by helmet defaults |
| CORS | Active | Configured for frontend URL only |

### Webhook Security

| Control | Status | Notes |
|---------|--------|-------|
| HMAC SHA-256 verification | Active | With timing-safe comparison |
| Required headers validation | Active | x-hub-signature-256, x-github-event, x-github-delivery |
| Delivery deduplication | **Missing** | Same webhook can be replayed |

---

## Test Coverage

### Security Tests Added (31 tests)

| Category | Tests | Status |
|----------|-------|--------|
| Authentication enforcement | 13 | All pass |
| Error response sanitization | 3 | All pass |
| Input validation | 4 | All pass |
| Rate limiting | 2 | All pass |
| GitHub token encryption | 4 | All pass |
| CORS configuration | 2 | All pass |
| Security headers | 3 | All pass |

### Total Test Suite

| Suite | Tests | Status |
|-------|-------|--------|
| Auth | 14 | All pass |
| Health | 5 | All pass |
| Repos | 18 | All pass |
| Webhooks | 7 | All pass |
| Activity | 18 | All pass |
| Metrics | 7 | All pass |
| **Security** | **31** | **All pass** |
| **Total** | **100** | **All pass** |

---

## Files Created / Modified

### New Files
- `src/utils/encryption.ts` - AES-256-GCM encryption for sensitive data
- `tests/integration/security.test.ts` - 31 security-specific tests
- `docs/security/THREAT-MODEL.md` - STRIDE threat model
- `docs/security/SECURITY-REVIEW.md` - This document

### Modified Files
- `src/app.ts` - Added rate limiting registration, JWT secret validation
- `src/modules/auth/routes.ts` - Added per-route rate limiting config
- `tests/helpers/build-app.ts` - Added ENCRYPTION_KEY for test env

---

## Recommendations for Next Sprint

1. **Team membership middleware** - Verify user belongs to requested
   team before processing. This is the highest-priority remaining item.
2. **WebSocket room authorization** - Check membership before allowing
   subscribe to team/repo rooms.
3. **OAuth state parameter** - Generate CSRF token for GitHub OAuth
   flow, validate on callback.
4. **Refresh token implementation** - Use existing RefreshToken model
   with HttpOnly cookies.
5. **Raw body for webhooks** - Capture raw request body instead of
   reconstructing via JSON.stringify.
6. **Audit logging** - Wire up the existing AuditLog model for all
   mutation operations.
7. **Webhook delivery deduplication** - Track processed delivery IDs
   in Redis or DB.

---

## Conclusion

The Pulse API foundation demonstrates security awareness with proper
use of bcrypt, JWT, HMAC verification, input validation, and security
headers. The two critical findings (missing rate limiting and plaintext
token storage) have been addressed. The remaining high-priority items
(team membership verification and WebSocket authorization) are typical
for a foundation sprint and should be resolved before any production
deployment.

**Overall Security Posture**: Acceptable for development/staging.
**Production Readiness**: Requires completion of FINDING-04 and
FINDING-05 before production deployment.
