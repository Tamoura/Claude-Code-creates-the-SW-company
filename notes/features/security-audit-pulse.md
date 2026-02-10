# Security Audit - Pulse API

## Task
SECURITY-01: Full security audit of Pulse API

## Branch
feature/pulse/inception

## Key Findings Summary

### Critical
1. **GitHub OAuth token stored in plaintext** - `githubToken` field in
   User model stored as plain String. Config has ENCRYPTION_KEY but no
   encryption/decryption utility is wired up. The addendum specifies
   AES-256 encryption at rest.
2. **Rate limiting not registered** - `@fastify/rate-limit` is in
   package.json but never imported or registered in app.ts. All
   endpoints are unprotected against brute-force.

### High
3. **JWT secret fallback to weak default** - app.ts line 66 uses
   `process.env.JWT_SECRET || 'pulse-dev-secret'`. In production if
   the env var is missing, a guessable secret is used.
4. **No RBAC enforcement on repo routes** - Repo routes check auth but
   do not verify team membership or role. Any authenticated user can
   access any team's repos by providing a teamId.
5. **WebSocket token in query string** - JWT token sent as URL query
   parameter is logged in server access logs and browser history.
   Should document this risk and prefer message-based auth.
6. **Webhook body reconstruction** - `JSON.stringify(request.body)`
   may not match the raw payload GitHub sent (key ordering, spacing).
   Signature verification could fail or be bypassed.

### Medium
7. **No JWT `jti` claim** - Tokens cannot be individually revoked.
   RefreshToken model exists but no refresh token flow is implemented.
8. **Auth routes lack rate limiting** - Login/register endpoints
   without rate limits are vulnerable to credential stuffing.
9. **GitHub OAuth `state` parameter not validated** - No CSRF
   protection on the OAuth flow.
10. **Error messages in dev mode leak stack traces** - The error
    handler sends `error.message` in non-production, which could leak
    internal paths.

### Low
11. **No Content-Type validation on webhook endpoint** - Should reject
    non-JSON content types.
12. **`connectRepo` handler casts body without full validation** - Uses
    `body.teamId as string` before Zod parse.
13. **Missing `Strict-Transport-Security` header** - Handled by
    @fastify/helmet defaults but worth verifying.

## Code Fixes Applied
- Add rate limiting plugin registration
- Add GitHub token encryption/decryption utilities
- Strengthen JWT secret validation (no fallback in production)
- Add security-specific tests
- Create STRIDE threat model
- Create security review document
