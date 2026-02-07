# Pulse API - STRIDE Threat Model

**Date**: 2026-02-07
**Author**: Security Engineer (DevSecOps)
**Scope**: Pulse API v0.1 (Foundation Sprint)
**Status**: Initial Assessment

---

## System Overview

Pulse is an AI-Powered Developer Intelligence Platform. The API layer
(Fastify) handles:

- User authentication (email/password + GitHub OAuth)
- GitHub webhook ingestion (HMAC SHA-256 verification)
- Repository management (CRUD, sync status)
- Real-time activity streaming (WebSocket with JWT auth)
- REST activity feed (paginated, cursor-based)

### Trust Boundaries

```
                       INTERNET
                          |
     +--------------------+--------------------+
     |                    |                    |
  Browser              GitHub              Mobile
  (Frontend)          (Webhooks)            App
     |                    |                    |
=====|====================|====================|=====
     |          TRUST BOUNDARY 1               |
     |        (TLS termination)                |
=====|====================|====================|=====
     |                    |                    |
  [CORS]           [HMAC verify]         [CORS]
     |                    |                    |
+----+----+         +----+----+         +----+----+
| Auth    |         | Webhook |         | Auth    |
| Plugin  |         | Handler |         | Plugin  |
| (JWT)   |         |         |         | (JWT)   |
+---------+         +---------+         +---------+
     |                    |                    |
=====|====================|====================|=====
     |          TRUST BOUNDARY 2               |
     |       (Application layer)               |
=====|====================|====================|=====
     |                    |                    |
  +--+----+           +--+----+           +--+----+
  |Service|           |Service|           |  WS   |
  | Layer |           | Layer |           |Handler|
  +---+---+           +---+---+           +---+---+
      |                   |                   |
======|===================|===================|======
      |          TRUST BOUNDARY 3              |
      |        (Data persistence)              |
======|===================|===================|======
      |                   |                   |
  +---+---+           +--+---+           +---+---+
  |Prisma |           |Prisma|           | Redis |
  |  ORM  |           | ORM  |           |Pub/Sub|
  +---+---+           +--+---+           +---+---+
      |                   |
  +---+---+           +---+---+
  |  DB   |           |  DB   |
  |(users)|           |(data) |
  +-------+           +-------+
```

---

## STRIDE Analysis

### 1. Spoofing (Identity)

| ID | Threat | Component | Severity | Mitigation Status |
|----|--------|-----------|----------|-------------------|
| S-01 | Attacker forges JWT token | Auth Plugin | Critical | **Mitigated**: HS256 with secret. **Risk**: Weak default fallback `pulse-dev-secret` if JWT_SECRET env var missing. |
| S-02 | Stolen JWT used from different client | All authenticated routes | High | **Partially mitigated**: 1hr expiry. No IP binding or fingerprinting. |
| S-03 | Brute-force login credentials | POST /auth/login | High | **NOT MITIGATED**: Rate limiting not registered in app.ts despite dependency being installed. |
| S-04 | Forged GitHub webhook | POST /webhooks/github | High | **Mitigated**: HMAC SHA-256 signature verification with `timingSafeEqual`. |
| S-05 | GitHub OAuth CSRF | GET /auth/github | Medium | **NOT MITIGATED**: `state` parameter not generated or validated. |
| S-06 | WebSocket connection with stolen token | WS /activity/stream | Medium | **Partially mitigated**: JWT verification on connect. Token in query string risks exposure in logs. |

### 2. Tampering (Data Integrity)

| ID | Threat | Component | Severity | Mitigation Status |
|----|--------|-----------|----------|-------------------|
| T-01 | Modified webhook payload | Webhook handler | Critical | **Mitigated**: HMAC SHA-256 signature verification. **Risk**: `JSON.stringify(request.body)` reconstructs body; may differ from raw payload. |
| T-02 | SQL injection via user input | All DB queries | Critical | **Mitigated**: Prisma ORM parameterizes all queries. No raw SQL except `SELECT 1` in health check (safe). |
| T-03 | Tampered JWT payload | Auth routes | Critical | **Mitigated**: JWT signature verification via @fastify/jwt. |
| T-04 | Modified request parameters | Repo/Activity routes | Medium | **Partially mitigated**: Zod validation on most endpoints. Some handlers cast before validation (repos/handlers.ts line 32). |

### 3. Repudiation (Deniability)

| ID | Threat | Component | Severity | Mitigation Status |
|----|--------|-----------|----------|-------------------|
| R-01 | User denies performing action | All mutation routes | Medium | **Partially mitigated**: Observability plugin logs request ID, method, URL, status. AuditLog model exists but not yet populated. |
| R-02 | Admin denies changing team config | Team management | Medium | **NOT MITIGATED**: Audit logging model exists but no audit trail is written for mutations. |

### 4. Information Disclosure

| ID | Threat | Component | Severity | Mitigation Status |
|----|--------|-----------|----------|-------------------|
| I-01 | GitHub OAuth token leaked from DB | User.githubToken | Critical | **NOT MITIGATED**: Stored as plaintext string. ENCRYPTION_KEY env var exists but no encryption logic is wired up. |
| I-02 | Stack traces in error responses | Global error handler | Medium | **Partially mitigated**: Production mode hides details. Dev mode exposes `error.message`. |
| I-03 | Sensitive data in logs | Logger | Low | **Mitigated**: Logger has comprehensive SENSITIVE_PATTERNS redaction list covering passwords, tokens, secrets, API keys. |
| I-04 | JWT token in WebSocket URL | WS connection | Medium | **Risk accepted**: Token visible in server access logs and proxy logs. Message-based auth alternative available. |
| I-05 | Password hash in API response | Auth routes | Low | **Mitigated**: User responses exclude passwordHash field. |

### 5. Denial of Service

| ID | Threat | Component | Severity | Mitigation Status |
|----|--------|-----------|----------|-------------------|
| D-01 | Brute-force attacks on auth endpoints | POST /auth/login, /register | High | **NOT MITIGATED**: Rate limiting not active. |
| D-02 | WebSocket connection flooding | WS /activity/stream | Medium | **Partially mitigated**: 10s auth timeout, heartbeat with 60s timeout, backpressure check. No max connections limit. |
| D-03 | Large request body | All endpoints | Low | **Mitigated**: `bodyLimit: 1048576` (1MB) set in Fastify config. |
| D-04 | Webhook replay attacks | POST /webhooks/github | Low | **NOT MITIGATED**: No delivery ID deduplication. Same webhook can be replayed. |
| D-05 | Unbounded database queries | Activity feed | Medium | **Mitigated**: Pagination with max limit of 100. Cursor-based pagination prevents offset attacks. |

### 6. Elevation of Privilege

| ID | Threat | Component | Severity | Mitigation Status |
|----|--------|-----------|----------|-------------------|
| E-01 | Access other team's repositories | GET /repos?teamId=X | High | **NOT MITIGATED**: Any authenticated user can query any teamId. No team membership verification. |
| E-02 | Viewer modifies team settings | Team mutation routes | Medium | **NOT YET APPLICABLE**: Team management routes not implemented yet. RBAC model in schema is ready. |
| E-03 | Member connects repos for other teams | POST /repos | High | **NOT MITIGATED**: teamId comes from request body, not derived from authenticated user's memberships. |
| E-04 | Subscribe to other team's WebSocket room | WS subscribe message | Medium | **NOT MITIGATED**: No verification that user belongs to the team/repo room they subscribe to. |

---

## Risk Matrix

```
           Low        Medium       High       Critical
          +----------+----------+----------+----------+
Likely    |          | S-03     | I-01     |          |
          |          | D-01     | E-01     |          |
          |          |          | E-03     |          |
          +----------+----------+----------+----------+
Possible  | I-04     | S-05     | S-01*    |          |
          |          | R-01     |          |          |
          |          | E-04     |          |          |
          +----------+----------+----------+----------+
Unlikely  | I-05     | T-04     | D-02     | T-01*    |
          | D-03     | I-02     |          |          |
          | D-05     | R-02     |          |          |
          +----------+----------+----------+----------+

* S-01: Critical only if deployed without JWT_SECRET env var
* T-01: Only if JSON reconstruction differs from raw payload
```

---

## Recommended Mitigations (Priority Order)

### Immediate (This Sprint)

1. **Register rate limiting plugin** - Wire up @fastify/rate-limit in
   app.ts with per-route configuration.
2. **Encrypt GitHub tokens at rest** - Implement AES-256-GCM
   encryption for githubToken field using ENCRYPTION_KEY.
3. **Remove JWT secret fallback** - Throw on startup if JWT_SECRET is
   not set in production.
4. **Add team membership checks** - Verify authenticated user belongs
   to the team before returning data.

### Next Sprint

5. **Implement refresh token flow** - Use existing RefreshToken model
   with HttpOnly cookies.
6. **Add OAuth state parameter** - Generate and validate CSRF token
   for GitHub OAuth flow.
7. **WebSocket room authorization** - Verify team membership before
   allowing room subscription.
8. **Webhook delivery deduplication** - Track processed delivery IDs
   to prevent replay.
9. **Wire up audit logging** - Write to AuditLog table for all
   mutations.

### Future

10. **Add JWT `jti` claim** for token revocation capability.
11. **IP-based session binding** for high-security operations.
12. **Implement RBAC middleware** for role-based route protection.
13. **Add CSP nonce generation** for frontend script injection protection.

---

## Review Schedule

- **Next review**: After Sprint 2 (repos + activity complete)
- **Full penetration test**: Before production launch
- **Ongoing**: Security review on every PR that touches auth, crypto,
  or data access patterns
