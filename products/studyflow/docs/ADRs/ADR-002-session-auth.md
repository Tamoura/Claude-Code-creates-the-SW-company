# ADR-002: Server-Side Sessions (not JWT) for Authentication

## Status
Accepted — 2026-06-17 (ARCH-01)

## Context
Clarification **C-1** locks auth to **email/password with session-based auth** (no OAuth in MVP).
NFR-005 requires bcrypt/argon2 hashing; NFR-007 requires non-enumerating auth errors; BR-004
requires strict per-student data scoping. The registry's `@connectsw/auth` package is **JWT +
API-key** oriented (in-memory token storage, refresh rotation, JTI blacklist) — designed for
programmatic API access, which StudyFlow's MVP does not need (no third-party API consumers).

## Decision
Implement **server-side, DB-backed opaque sessions**:
- On login/signup, mint a random 32-byte opaque token; store **SHA-256(token)** in a `Session` table
  (`tokenHash`, `studentId`, `expiresAt`). Return the token in an **httpOnly, Secure, SameSite=Lax**
  cookie (`sf_session`).
- A `sessionAuth` Fastify pre-handler validates the cookie on every `/v1` student route, attaches
  `request.studentId`, and returns **401** when missing/invalid (FR-003).
- Logout deletes the `Session` row (true server-side revocation).
- Reuse from the registry: bcrypt (`@connectsw/shared/utils/crypto`), `AppError` (RFC 7807), and the
  generic Zod auth-schema/validate helpers. Build only the thin session layer.

## Consequences

### Positive
- **Instant revocation** — logout invalidates the session immediately (JWTs can't without a denylist).
- **No client-side token storage** → no localStorage/XSS token-theft surface; cookie is httpOnly.
- Simpler than JWT for a single-API monolith; no refresh-token rotation machinery to maintain.
- Non-enumerating errors and ownership scoping fit naturally in the pre-handler + repository layers.

### Negative
- Each authenticated request does a `Session` lookup (one indexed query; negligible at MVP volume; cacheable later).
- Sessions live in Postgres (no Redis in MVP) — acceptable; the `Session` table is tiny and indexed.

### Neutral
- CSRF must be handled: `SameSite=Lax` cookie + state-changing routes are non-GET; optional
  double-submit token for defense-in-depth (NFR-006).
- OAuth/SSO fast-follow (RSK-003) layers on top without changing the session model.

## Alternatives Considered

### JWT (reuse `@connectsw/auth` as-is)
- Pros: stateless; component already exists.
- Cons: contradicts C-1 (sessions); needs a denylist for logout/revocation; in-memory token + refresh
  rotation is more surface area than a CRUD MVP needs; API-key path is irrelevant here.
- Rejected: violates the locked clarification and adds unjustified complexity.

### Signed stateless cookie sessions (no DB table)
- Pros: no session table.
- Cons: same revocation problem as JWT; rotating the signing key logs everyone out.
- Rejected: DB-backed sessions give clean revocation for trivial cost.

## References
- C-1, NFR-005, NFR-006, NFR-007, BR-004 · `architecture.md` §6
- `.claude/COMPONENT-REGISTRY.md` (`@connectsw/auth`, Crypto Utils, AppError)
