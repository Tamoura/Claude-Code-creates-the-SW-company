# ConnectIn -- Developer Security Checklist

> **Security Engineer** | ConnectSW
> **Version**: 1.0
> **Date**: February 20, 2026
> **Purpose**: PR-level security review checklist for ConnectIn developers

---

## How to Use This Checklist

Every pull request that touches backend code, API endpoints, authentication, data access, or frontend rendering must be reviewed against this checklist. Mark each applicable item as checked before approving the PR.

**Not all sections apply to every PR.** Check the sections relevant to the code changed. If a section is not applicable, mark it as N/A.

---

## 1. Authentication

### Token Handling

- [ ] JWT access tokens use RS256 algorithm (never HS256 or `none`)
- [ ] Access token expiry is 15 minutes (not longer)
- [ ] Refresh tokens are opaque (not JWT), stored in Redis, and rotated on each use
- [ ] Old refresh tokens are invalidated when a new one is issued
- [ ] Cookies use `httpOnly`, `Secure`, `SameSite=Strict` flags
- [ ] Refresh token cookie has restricted `Path=/api/auth/refresh`
- [ ] No tokens or credentials appear in URL query parameters
- [ ] No tokens or credentials are logged (check `console.log`, `request.log`, error handlers)

### Session Management

- [ ] Sessions are invalidated on password change
- [ ] Sessions are invalidated on account deletion
- [ ] Session creation logs: userId, IP, userAgent, timestamp
- [ ] Failed login attempts are counted and trigger progressive lockout (5+ failures)
- [ ] Lockout duration follows progressive schedule (1min, 5min, 15min, 1hr)

### OAuth

- [ ] OAuth state parameter is generated (256-bit random), stored in Redis (5 min TTL), and validated on callback
- [ ] Redirect URI is validated against a strict allowlist (no user-controlled redirects)
- [ ] OAuth tokens are encrypted with AES-256-GCM before database storage
- [ ] Existing accounts are linked (not duplicated) when OAuth email matches

### Password Management

- [ ] Passwords hashed with bcrypt, cost factor 12+
- [ ] Password validation: min 8 chars, 1 uppercase, 1 number, 1 special char, max 128 chars
- [ ] Password comparison uses `bcrypt.compare()` (constant-time)
- [ ] Reset tokens are 256-bit random, single-use, 1-hour expiry
- [ ] Password reset invalidates all existing sessions

---

## 2. Authorization

### Permission Checks

- [ ] Every protected endpoint has `authenticate` middleware
- [ ] Routes requiring email verification use `requireVerified` middleware
- [ ] Recruiter-only routes use `requireRole('recruiter', 'admin')` middleware
- [ ] Admin-only routes use `requireRole('admin')` middleware
- [ ] Admin routes return 404 (not 403) for unauthorized users to hide route existence

### Data Access Boundaries

- [ ] Profile mutations verify `userId === authenticatedUser.id`
- [ ] Post/comment mutations verify `authorId === authenticatedUser.id`
- [ ] Job mutations verify `postedBy === authenticatedUser.id`
- [ ] Message reads verify conversation membership
- [ ] Message sends verify connection exists between sender and recipient
- [ ] Job applicant lists verify `job.postedBy === authenticatedUser.id`
- [ ] No IDOR vulnerabilities: all resource access checks ownership or membership

### Role Assignment

- [ ] User role is set server-side only (never accepted from client input)
- [ ] Role changes are restricted to admin API
- [ ] Role changes are logged in audit trail (adminId, targetUserId, oldRole, newRole)

---

## 3. Input Validation

### Zod Schemas

- [ ] Every API endpoint has a Zod schema for request body/params/query
- [ ] Schema is registered in Fastify route config (validated before handler)
- [ ] String fields have explicit `max()` length limits
- [ ] Email fields use `.email()` validation + `.toLowerCase().trim()` transform
- [ ] UUID fields use `.uuid()` validation
- [ ] Enum fields use `.enum()` with explicit allowed values
- [ ] Number fields have `min()` and `max()` bounds
- [ ] Pagination: `page` max 100, `limit` max 50

### Sanitization

- [ ] All user-generated text content is sanitized with `DOMPurify` before storage
- [ ] Profile fields (headline, summary) are sanitized
- [ ] Post content and comments are sanitized
- [ ] Message content is sanitized
- [ ] Job descriptions and requirements are sanitized
- [ ] Connection request messages are sanitized
- [ ] Search queries are sanitized (trim, length limit)

### File Uploads

- [ ] File type validated by magic bytes (not just file extension)
- [ ] File size enforced (avatar: 5MB, post image: 10MB)
- [ ] Only JPEG, PNG, WebP formats accepted
- [ ] Images re-encoded via Sharp (prevents polyglot file attacks)
- [ ] EXIF/metadata stripped from uploaded images
- [ ] Filenames replaced with UUIDs (no user-controlled filenames in storage)
- [ ] Upload count limited (max 4 images per post)

---

## 4. Data Protection

### PII Handling

- [ ] API responses use explicit DTOs -- never return raw database records
- [ ] `password_hash` is NEVER included in any API response
- [ ] `verification_token` and `reset_token` are NEVER included in any API response
- [ ] OAuth tokens are NEVER included in any API response
- [ ] Internal IDs used only where necessary; no leaking of sequential auto-increment IDs
- [ ] Prisma queries use `select` to limit returned fields (not `include` with full relations)

### Encryption

- [ ] All external communication uses HTTPS/TLS
- [ ] OAuth tokens stored with AES-256-GCM encryption
- [ ] Passwords stored as bcrypt hashes (never plaintext, never reversible encryption)
- [ ] No sensitive data in client-side local storage or session storage
- [ ] Secrets loaded from environment variables, not hardcoded

### Logging Hygiene

- [ ] No passwords, tokens, or API keys appear in log output
- [ ] No message content appears in log output
- [ ] No full request bodies with sensitive data appear in log output
- [ ] Error messages to clients never include stack traces, SQL queries, or file paths
- [ ] User IDs appear in logs for tracing (but not combined with PII like email in debug logs)

---

## 5. API Security

### Rate Limiting

- [ ] Auth endpoints rate limited: 5 req/min per IP
- [ ] Registration rate limited: 3 req/hour per IP
- [ ] General API rate limited: 100 req/min per authenticated user
- [ ] Unauthenticated endpoints rate limited: 20 req/min per IP
- [ ] AI endpoints rate limited: 5 optimizations/day, 20 content assists/day per user
- [ ] Search rate limited: 60 req/min per user
- [ ] File uploads rate limited: 10 uploads/hour per user
- [ ] Rate limit responses include `Retry-After` header

### CORS

- [ ] CORS origin is set to explicit allowlist (not `*`)
- [ ] Development origins are conditionally included (only when `NODE_ENV=development`)
- [ ] `credentials: true` is set (required for cookie-based auth)
- [ ] Preflight cache set to 24 hours

### Headers

- [ ] Content-Security-Policy header set with `script-src 'self'`
- [ ] Strict-Transport-Security header set with `max-age=63072000`
- [ ] X-Frame-Options set to `DENY`
- [ ] X-Content-Type-Options set to `nosniff`
- [ ] Referrer-Policy set to `strict-origin-when-cross-origin`
- [ ] Permissions-Policy restricts unnecessary browser features

### Error Responses

- [ ] Error responses use the standard envelope: `{ success: false, error: { code, message, details? } }`
- [ ] Internal errors return generic 500 message (no implementation details)
- [ ] Authentication errors use "Invalid email or password" (no username enumeration)
- [ ] Authorization errors return 404 (not 403) to hide resource existence where appropriate
- [ ] Validation errors provide field-level feedback without exposing internal structure

### Request Size

- [ ] JSON body limit set to 1 MB
- [ ] File upload limits enforced at the Fastify level (before route handler)
- [ ] WebSocket message size limited to 8 KB
- [ ] URL query string limited to 2 KB

---

## 6. Frontend Security

### XSS Prevention

- [ ] User-generated content rendered using React's auto-escaping (JSX expressions, not `dangerouslySetInnerHTML`)
- [ ] If `dangerouslySetInnerHTML` is used, content is sanitized with DOMPurify first
- [ ] No inline `<script>` tags; all JavaScript in bundled files
- [ ] CSP header enforced by the backend blocks inline scripts

### Secure Storage

- [ ] Tokens stored in httpOnly cookies only (never in localStorage or sessionStorage)
- [ ] No sensitive data stored in browser storage
- [ ] CSRF tokens (if used for forms) stored in session-scoped memory (not localStorage)

### Third-Party Scripts

- [ ] No third-party analytics scripts that access DOM or user data
- [ ] External resources (fonts, CDN assets) use Subresource Integrity (SRI) hashes where possible
- [ ] `iframe` embedding blocked by `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`

### Arabic/RTL-Specific

- [ ] User-generated text direction is detected server-side (not trusted from client)
- [ ] Mixed-direction content uses Unicode bidirectional algorithm (no custom hacks that could be exploited)
- [ ] Right-to-left override characters (U+202E) are stripped from user input

---

## 7. Dependencies

### Vulnerability Scanning

- [ ] `npm audit` reports zero critical or high vulnerabilities
- [ ] Dependabot or Renovate is configured for automated dependency updates
- [ ] No packages with known CVEs in production dependencies
- [ ] Lock file (`package-lock.json`) is committed and reviewed for unexpected changes

### Supply Chain

- [ ] New dependencies reviewed for necessity (not adding unnecessary packages)
- [ ] New dependencies checked for maintenance status (last commit, open issues)
- [ ] No packages with `postinstall` scripts that execute arbitrary code
- [ ] TypeScript `@types/*` packages match runtime dependency versions

---

## 8. Testing

### Security Test Cases Required

For any PR that modifies authentication, authorization, or data access:

- [ ] **Auth bypass test**: Verify that accessing a protected endpoint without a token returns 401
- [ ] **IDOR test**: Verify that accessing another user's resource returns 404 (not the resource)
- [ ] **Role test**: Verify that a `user` cannot access `recruiter` or `admin` endpoints
- [ ] **Verification test**: Verify that unverified users cannot access restricted features
- [ ] **Rate limit test**: Verify that exceeding rate limits returns 429 with Retry-After header
- [ ] **Input validation test**: Verify that invalid inputs are rejected with appropriate error messages
- [ ] **XSS test**: Verify that `<script>` tags in input are sanitized (not rendered as HTML)
- [ ] **SQL injection test**: Verify that SQL special characters in input do not alter query behavior

For any PR that modifies file upload handling:

- [ ] **File type test**: Verify that non-image files (even with `.jpg` extension) are rejected
- [ ] **File size test**: Verify that oversized files are rejected before processing
- [ ] **Filename test**: Verify that filenames are replaced with UUIDs (no path traversal)

For any PR that modifies messaging:

- [ ] **Connection test**: Verify that non-connected users cannot send messages
- [ ] **Membership test**: Verify that users cannot read messages from conversations they are not in

---

## Quick Reference: Common Security Anti-Patterns

| Anti-Pattern | Correct Pattern |
|-------------|----------------|
| `user.role = request.body.role` | `user.role = 'user'` (server-assigned) |
| `prisma.user.findUnique({ where: { id: request.params.id } })` without ownership check | Add `AND userId = authenticatedUser.id` or return 404 |
| `reply.send(user)` (raw Prisma result) | `reply.send(toUserDTO(user))` (explicit response DTO) |
| `console.log(request.body)` | `request.log.info({ userId: request.body.email })` (no password) |
| `localStorage.setItem('token', jwt)` | Use httpOnly cookie (set by server) |
| Checking file extension only | Verify magic bytes + re-encode image |
| `res.status(403).send('Forbidden')` for admin routes | `res.status(404).send('Not found')` (hide route) |
| Generic CORS `origin: '*'` | Explicit origin allowlist |
| Trusting `Content-Type` header for uploads | Validate actual file content (magic bytes) |
| Long-lived JWT (24hr+) | 15-minute access token + refresh token rotation |

---

## PR Review Template

When reviewing a security-sensitive PR, paste this into the review comment:

```markdown
## Security Review

**Reviewer**: [name]
**Date**: [date]

### Sections Reviewed
- [ ] Authentication
- [ ] Authorization
- [ ] Input Validation
- [ ] Data Protection
- [ ] API Security
- [ ] Frontend Security
- [ ] Dependencies
- [ ] Testing

### Findings
| Severity | Finding | Location | Recommendation |
|----------|---------|----------|----------------|
| | | | |

### Verdict
- [ ] APPROVED: No security concerns
- [ ] APPROVED WITH NOTES: Minor issues documented above
- [ ] CHANGES REQUESTED: Security issues must be resolved before merge
- [ ] BLOCKED: Critical vulnerability found
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-20 | Security Engineer (AI Agent) | Initial security checklist |
