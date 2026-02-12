# Security Gate Report — RecomEngine MVP

**Date**: 2026-02-12
**Status**: PASS (with advisories)

## npm audit

| Package | Severity | Issue | Runtime Risk | Mitigation |
|---------|----------|-------|-------------|------------|
| fast-jwt | Moderate | iss claim validation bypass | Low | We don't validate iss claims; upgrade to @fastify/jwt@10+ in Phase 2 |
| fastify | High | DoS via sendWebStream | None | We don't use WebStreams |
| fastify | High | Content-Type tab bypass | Moderate | Input validation via Zod schemas provides defense-in-depth |
| tar/bcrypt | High | Path traversal in tar | None | Build-time only, not runtime |

**Action Items for Phase 2:**
- Upgrade to Fastify 5.x (breaking change — requires migration)
- Upgrade to @fastify/jwt 10.x (breaking change)
- Upgrade bcrypt to 6.x

## Code Security Review

### Authentication & Authorization
- [x] JWT with 1hr expiry, 7d refresh tokens (HttpOnly, Secure, SameSite=strict)
- [x] Password hashing: bcrypt with cost factor 12
- [x] API key hashing: HMAC-SHA256 (constant-time comparison via crypto module)
- [x] API keys shown only once on creation, stored as hash
- [x] Permission enforcement: read vs read_write scopes
- [x] Tenant isolation: all queries scoped by ownerId or tenantId
- [x] Rate limiting: 1000 req/min per API key or IP

### Input Validation
- [x] All request bodies validated via Zod schemas before processing
- [x] Email format validation on signup/login
- [x] Password minimum 8 characters
- [x] String length limits on all fields (prevents DoS via large payloads)
- [x] Batch event limit: max 100 events per request
- [x] Batch catalog limit: max 500 items per request
- [x] Pagination clamped: limit 1-100, offset >= 0

### Data Protection
- [x] No PII in logs (logger redacts email, password fields)
- [x] Anti-enumeration on forgot-password (always returns success)
- [x] Soft deletes preserve data integrity (tenant deletion, catalog items)
- [x] API key revocation cascades on tenant deletion

### OWASP Top 10 Assessment
- [x] **Injection**: Prisma ORM with parameterized queries prevents SQL injection
- [x] **Broken Auth**: JWT + bcrypt + secure cookies
- [x] **Sensitive Data**: API keys hashed, passwords hashed, no secrets in responses
- [x] **XXE**: No XML processing
- [x] **Broken Access Control**: Owner-scoped tenant queries, API key permission checks
- [x] **Security Misconfig**: Helmet headers, CORS configured, rate limiting
- [x] **XSS**: JSON-only API (no HTML rendering on backend)
- [x] **Insecure Deserialization**: Zod schema validation on all inputs
- [x] **Components with Known Vulns**: See audit table above (tracked for Phase 2)
- [x] **Logging & Monitoring**: Structured logging, request ID tracking, observability plugin

### Headers (via @fastify/helmet)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (in production)

## Verdict

**PASS** — No critical runtime vulnerabilities. Dependency upgrades tracked for Phase 2.
Known moderate-severity items have defense-in-depth mitigations in place.
