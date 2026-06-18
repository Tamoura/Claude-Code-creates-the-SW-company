# API Security: Protecting Your Attack Surface

APIs are the primary attack surface for modern applications. Every endpoint is a potential entry point for attackers, and API vulnerabilities consistently rank among the most exploited weaknesses in web applications. This guide covers the OWASP API Security Top 10, authentication and authorization patterns, input validation, rate limiting, CORS configuration, JWT best practices, and API key management. The goal is to provide CTOs with a comprehensive framework for securing APIs from design through deployment.

## When to Use / When NOT to Use

| Security Control | Apply When | Caution / Skip When |
|-----------------|------------|-------------------|
| Authentication on every endpoint | Always, for any endpoint that returns or modifies user-specific data | Truly public data endpoints (health checks, public content listings) |
| Authorization checks at the resource level | Always -- authentication alone is insufficient | Never skip; missing authorization is the #1 API vulnerability |
| Input validation with strict schemas | Every endpoint, every parameter, every header that influences logic | Never skip; "trust but verify" is not a security strategy |
| Rate limiting | All public-facing endpoints, auth endpoints, expensive operations | Internal service-to-service calls within a trusted network (but still consider) |
| CORS restrictions | All browser-accessible APIs | Server-to-server APIs not called from browsers |
| Request size limits | Always | Endpoints that legitimately handle large uploads (use streaming instead) |
| TLS (HTTPS) | Always, everywhere, no exceptions | Never disable; there is no valid reason for plaintext HTTP in production |

## OWASP API Security Top 10 (2023)

### API1: Broken Object-Level Authorization (BOLA)

The most common and most dangerous API vulnerability. Occurs when an API endpoint accepts an object identifier (user ID, order ID, file ID) and does not verify that the authenticated user is authorized to access that specific object.

**Example:** `GET /api/users/123/orders` returns orders for user 123 regardless of who is authenticated. An attacker changes the ID to 124 and sees another user's orders.

**Prevention:**
- Implement authorization checks at the data access layer, not just the route layer
- Use the authenticated user's identity to scope queries: `WHERE user_id = authenticated_user.id`
- Never rely on client-supplied object IDs for authorization
- Use UUIDs instead of sequential integers to make enumeration harder (but this is obscurity, not security -- still enforce authorization)

### API2: Broken Authentication

Weak or missing authentication allows attackers to impersonate legitimate users. Common issues: weak password policies, missing brute-force protection, tokens in URLs, insecure token storage.

**Prevention:**
- Use established authentication protocols (OAuth 2.0, OIDC)
- Implement account lockout or progressive delays after failed attempts
- Never include tokens in URLs (they appear in server logs, browser history, and referrer headers)
- Use short-lived access tokens with refresh token rotation

### API3: Broken Object Property-Level Authorization

The API returns more data than the client needs, or accepts properties the client should not be able to set. This includes mass assignment vulnerabilities.

**Prevention:**
- Define explicit response schemas -- never return raw database objects
- Use allowlists for writable properties on create/update endpoints
- Never accept `role`, `isAdmin`, `balance`, or other sensitive fields from client input
- Validate response bodies against schemas in tests

### API4: Unrestricted Resource Consumption

No rate limiting, no pagination limits, no request size limits. Attackers can exhaust server resources, run up cloud costs, or scrape entire datasets.

**Prevention:**
- Rate limit by IP, user, and API key
- Set maximum page sizes and enforce them server-side
- Limit request body sizes
- Set timeouts on database queries and external calls
- Use cost-based rate limiting for expensive operations (search, report generation)

### API5: Broken Function-Level Authorization (BFLA)

Users can access administrative functions by discovering undocumented endpoints. Example: a regular user accesses `POST /api/admin/users` and creates admin accounts.

**Prevention:**
- Implement role-based or attribute-based access control on every route
- Do not rely on hidden URLs for security
- Test authorization with multiple user roles in integration tests
- Document all endpoints (hidden endpoints are a security smell)

### API6-10 Summary

| Vulnerability | Key Prevention |
|--------------|----------------|
| API6: Server-Side Request Forgery (SSRF) | Validate and allowlist outbound URLs; do not fetch user-supplied URLs without sanitization |
| API7: Security Misconfiguration | Disable debug endpoints in production; review default configs; automate security scanning |
| API8: Lack of Protection from Automated Threats | Implement CAPTCHA, device fingerprinting, behavioral analysis for bot-targeted endpoints |
| API9: Improper Inventory Management | Maintain an API catalog; decommission old versions; monitor for shadow APIs |
| API10: Unsafe Consumption of APIs | Validate responses from third-party APIs; do not trust upstream data |

## Input Validation

### Principles

1. **Validate everything.** Every parameter -- path, query, header, body -- must be validated before use.
2. **Use a schema validation library.** Zod (TypeScript), Joi (Node.js), Pydantic (Python), or JSON Schema. Manual validation is error-prone.
3. **Fail closed.** If validation fails, reject the request with a 400 status. Never proceed with partially validated data.
4. **Validate type, format, range, and length.** An email field should be validated as a valid email format, not just "is a string."
5. **Sanitize for the output context.** Input validation prevents malformed data. Output encoding prevents injection (XSS, SQL injection).

### Validation Checklist

```
[ ] String fields: max length, allowed characters, regex pattern
[ ] Numeric fields: min, max, integer vs float
[ ] Email fields: format validation (but also verify via email confirmation)
[ ] URL fields: protocol allowlist (https only), no internal IPs
[ ] Date fields: valid format, reasonable range
[ ] Enum fields: exact match against allowed values
[ ] Array fields: max length, validate each element
[ ] Nested objects: validate recursively
[ ] File uploads: max size, allowed MIME types, virus scanning
```

## Rate Limiting

### Strategy

Implement rate limiting at multiple layers:

1. **Global rate limit:** Maximum requests per IP per minute across all endpoints. Protects against DDoS and scraping. Typical: 100-1000 req/min depending on application.

2. **Per-endpoint rate limits:** Tighter limits on expensive or sensitive endpoints.
   - Authentication endpoints: 5-10 attempts per minute per IP
   - Password reset: 3 requests per hour per email
   - Search/report generation: 10-30 per minute per user
   - File upload: 5-10 per minute per user

3. **Per-user rate limits:** After authentication, limit by user identity rather than IP (avoids penalizing shared IPs like corporate NATs).

4. **Cost-based rate limiting:** Assign a cost to each endpoint based on server resource consumption. A simple GET costs 1 unit; a complex search costs 10 units. Rate limit on total cost rather than request count. GitHub's GraphQL API uses this approach.

### Implementation

Use sliding window counters rather than fixed windows to prevent burst abuse at window boundaries. Store counters in Redis or an in-memory store. Return rate limit headers so clients can self-regulate:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1620000000
Retry-After: 30
```

Return 429 Too Many Requests when limits are exceeded. Include a clear error message and the `Retry-After` header.

## CORS Configuration

Cross-Origin Resource Sharing (CORS) controls which domains can make browser-based requests to your API.

**Secure defaults:**
- Never use `Access-Control-Allow-Origin: *` on authenticated endpoints
- Explicitly list allowed origins: `https://app.yourdomain.com`
- Restrict allowed methods: `GET, POST, PUT, DELETE` (not `*`)
- Restrict allowed headers to those your API actually uses
- Set `Access-Control-Max-Age` to cache preflight responses (e.g., 3600 seconds)
- Set `Access-Control-Allow-Credentials: true` only if your API uses cookies or HTTP authentication

**Common mistake:** Reflecting the request's `Origin` header back as `Access-Control-Allow-Origin`. This effectively allows any origin and defeats the purpose of CORS. Validate the origin against an allowlist.

## JWT Best Practices

| Practice | Do | Don't |
|----------|----|----- |
| Algorithm | RS256 or ES256 (asymmetric) | HS256 in distributed systems (shared secret risk) |
| Expiration | Short-lived: 5-15 minutes | No expiration, or hours/days |
| Storage (browser) | HttpOnly, Secure, SameSite=Strict cookie | localStorage, sessionStorage (XSS-accessible) |
| Payload | Minimal claims: sub, exp, iat, roles | Sensitive data (email, PII) in payload |
| Key rotation | Rotate signing keys quarterly; support multiple active keys via `kid` header | Single signing key with no rotation plan |
| Revocation | Use a deny-list (Redis) for critical revocations; short expiry reduces the need | Assume JWTs cannot be revoked |
| Validation | Validate signature, expiration, issuer, audience on every request | Trust the payload without validation |

## API Key Management

API keys authenticate applications (not users). They are suitable for server-to-server communication, third-party integrations, and developer APIs.

**Best practices:**
- Generate keys with at least 256 bits of entropy using CSPRNG
- Hash keys before database storage (SHA-256 is sufficient for high-entropy keys)
- Show the full key only once at creation time
- Use prefixes for identification: `sk_live_`, `sk_test_`, `pk_` (Stripe's pattern)
- Implement scoped keys with granular permissions (read-only, write, admin)
- Log all key usage for audit
- Set expiration dates and enforce rotation
- Allow users to create multiple keys and revoke individual keys
- Rate limit by API key, not just by IP

## Real-World Examples

### Stripe: API Security as Product

Stripe's API security is a reference implementation. They use prefixed API keys (`sk_live_`, `sk_test_`) with separate keys for test and production environments. Their API validates every request parameter against a strict schema and returns detailed, specific error messages for validation failures. They implement idempotency keys for safe retries on payment operations. Their webhook signatures use HMAC-SHA256 with a per-endpoint secret, and they include a timestamp in the signature to prevent replay attacks.

### GitHub: Granular Token Permissions

GitHub's fine-grained personal access tokens allow users to specify exactly which repositories and which operations (read contents, write issues, manage actions) a token can perform. This least-privilege approach limits the blast radius of a compromised token. GitHub also uses token prefixes (`ghp_`, `gho_`, `github_pat_`) for easy identification in secret scanning tools.

### Twilio: Request Signing for Webhooks

Twilio signs webhook requests with HMAC-SHA1 using the account's auth token. The receiving application validates the signature before processing the webhook. This prevents attackers from spoofing webhook requests. They also include a request URL and parameter string in the signature to prevent parameter tampering.

## Decision Framework

### Choose JWT-Based Authentication When...

- You have multiple services that need to verify authentication independently
- You want stateless authentication (no session store required)
- You need to embed authorization claims (roles, permissions) in the token
- You can implement short token lifetimes with refresh token rotation

### Choose Session-Based Authentication When...

- You have a monolithic application with a single backend
- You need immediate session revocation capability
- Your application already uses server-side rendering with cookies
- You want simpler implementation with fewer security pitfalls

### Choose API Keys When...

- Authenticating applications, not users
- The integration is server-to-server (keys never exposed to browsers)
- You need simple, long-lived credentials with rotation capability
- You are building a developer-facing API platform

## Common Mistakes

**1. Authorization checks only at the API gateway.** Gateways verify authentication (is this a valid token?) but rarely verify authorization (does this user have access to this specific resource?). Authorization must happen at the application layer, as close to the data access as possible.

**2. Returning database errors to clients.** Database constraint violation messages, stack traces, and ORM error details leak schema information to attackers. Map all errors to generic, safe error responses. Log the details server-side.

**3. Not validating response bodies.** You validate inputs (good), but you also need to ensure responses do not contain unintended data. A Prisma `findFirst()` that returns the raw database record may include `password_hash`, `internal_notes`, or `ssn` fields. Define explicit response schemas and strip unallowed fields.

**4. CORS wildcard on authenticated endpoints.** `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` is forbidden by the CORS spec, but misconfigurations in CORS libraries can create equivalent vulnerabilities.

**5. No rate limiting on authentication endpoints.** Without rate limiting, attackers can brute-force credentials at thousands of attempts per second. Authentication endpoints should have the most aggressive rate limits in your API.

**6. Trusting client-side authorization.** Hiding a button in the UI is not authorization. If the API endpoint exists, assume attackers will find and call it directly. Every endpoint must enforce its own authorization.

## Key Metrics to Track

| Metric | Why It Matters | Target |
|--------|---------------|--------|
| 4xx error rate by endpoint | Spikes indicate scanning or attacks | Alert on > 2x baseline |
| 401/403 rate by IP | Identifies brute-force attempts | Alert and auto-block after threshold |
| Rate limit trigger rate | Shows whether limits are appropriately set | < 0.1% of legitimate traffic affected |
| API response time p99 | Slow endpoints may indicate injection or abuse | < 500ms for standard endpoints |
| OWASP ZAP / Burp scan findings | Automated vulnerability detection | Zero HIGH or CRITICAL |
| Dependency vulnerability count | Known CVEs in API dependencies | Zero HIGH or CRITICAL with SLA for remediation |
| Token expiration compliance | Percentage of tokens with appropriate lifetimes | 100% under 15 minutes for access tokens |
| API inventory coverage | Percentage of endpoints documented and monitored | 100% |

## References

- OWASP API Security Top 10 (2023): owasp.org/API-Security
- OWASP REST Security Cheat Sheet
- Stripe API documentation: stripe.com/docs/api -- reference implementation for API design and security
- GitHub engineering blog: "Behind GitHub's new authentication token formats" (2021)
- Twilio webhook security documentation
- RFC 7519: JSON Web Token (JWT)
- RFC 6749: OAuth 2.0 Authorization Framework
- RFC 6750: Bearer Token Usage
- NIST SP 800-204: Security Strategies for Microservices-based Application Systems
- Troy Hunt: "OWASP Top 10 for API Security" -- practical walkthrough series
