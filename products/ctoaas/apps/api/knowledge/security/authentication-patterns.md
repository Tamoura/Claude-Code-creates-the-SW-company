# Authentication Patterns: JWT, OAuth 2.0, Sessions, Passkeys, and SSO

Authentication verifies identity -- confirming that a user or system is who they claim to be. The authentication pattern you choose affects security posture, user experience, scalability, and operational complexity for years. This guide covers the major authentication patterns, their trade-offs, implementation considerations, and guidance on when each pattern is appropriate. It is written for CTOs who need to make informed architectural decisions about authentication infrastructure.

## When to Use / When NOT to Use

| Pattern | Best For | Avoid When |
|---------|----------|------------|
| Session-based (server-side) | Monolithic web apps, server-rendered pages, simple architectures | Multiple backend services needing independent auth verification |
| JWT (JSON Web Tokens) | Microservices, SPAs with API backends, stateless architectures | You need instant revocation without additional infrastructure |
| OAuth 2.0 | Third-party integrations, "Login with Google/GitHub," delegated access | Internal-only authentication with no external IdP |
| OIDC (OpenID Connect) | User identity verification on top of OAuth 2.0 flows | Simple machine-to-machine auth (use client_credentials instead) |
| Passkeys (WebAuthn/FIDO2) | Phishing-resistant primary authentication, high-security applications | Users on legacy browsers or devices without biometrics/security keys |
| API keys | Server-to-server, developer APIs, third-party integrations | User-facing authentication, browser-based access |
| Mutual TLS (mTLS) | Service mesh internal traffic, zero-trust architectures | Browser-based applications, consumer-facing products |

## Session-Based Authentication

### How It Works

1. User submits credentials (username + password).
2. Server validates credentials, creates a session record (in-memory, Redis, or database).
3. Server returns a session ID in an HttpOnly, Secure, SameSite cookie.
4. Browser automatically sends the cookie on subsequent requests.
5. Server looks up the session record on each request.

### Trade-offs

**Advantages:**
- Immediate revocation: delete the session record and the user is logged out instantly
- Simple mental model: state is on the server, client holds only an opaque ID
- Mature ecosystem with well-understood security properties
- No token parsing or signature verification on every request

**Disadvantages:**
- Requires server-side session storage (memory, Redis, or database)
- Session storage becomes a scaling bottleneck or single point of failure
- Sticky sessions or shared session stores needed for horizontal scaling
- Not suitable for mobile apps or third-party API consumers (cookies are browser-specific)

### Implementation Considerations

- **Session ID entropy:** At least 128 bits of cryptographically random data
- **Cookie flags:** `HttpOnly` (prevents JavaScript access), `Secure` (HTTPS only), `SameSite=Strict` or `Lax` (CSRF protection)
- **Session expiry:** Absolute timeout (e.g., 24 hours) plus idle timeout (e.g., 30 minutes of inactivity)
- **Session fixation prevention:** Regenerate session ID after successful authentication
- **Concurrent session limits:** Optionally limit sessions per user and notify on new login from unknown device

## JWT (JSON Web Tokens)

### How It Works

1. User authenticates (credentials, OAuth, etc.).
2. Server generates a signed JWT containing claims (user ID, roles, expiration).
3. Client stores the JWT and sends it in the `Authorization: Bearer` header.
4. Each receiving service validates the JWT signature and claims independently.

### Token Structure

A JWT has three Base64url-encoded parts separated by dots: `header.payload.signature`.

- **Header:** Algorithm and token type (`{"alg": "RS256", "typ": "JWT"}`)
- **Payload:** Claims -- registered (`sub`, `exp`, `iat`, `iss`, `aud`) and custom (`roles`, `permissions`)
- **Signature:** Computed over header and payload using the signing key

### Signing Algorithms

| Algorithm | Type | Use When |
|-----------|------|----------|
| RS256 | Asymmetric (RSA) | Multiple services verify tokens; only the auth service has the private key |
| ES256 | Asymmetric (ECDSA) | Same as RS256 but smaller key sizes and faster verification |
| HS256 | Symmetric (HMAC) | Single service both issues and verifies tokens; the shared secret must never leak |
| EdDSA | Asymmetric (Ed25519) | High-performance verification; newer but well-supported |

**Recommendation:** Use RS256 or ES256 for distributed systems. HS256 is acceptable only in single-service architectures where the signing secret is never shared.

### Token Lifecycle

**Access tokens:** Short-lived (5-15 minutes). Sent with every API request. Should not be stored persistently.

**Refresh tokens:** Longer-lived (7-30 days). Used only to obtain new access tokens. Stored securely (HttpOnly cookie or secure device storage). Must be rotated on each use -- when a refresh token is used, a new refresh token is issued and the old one is invalidated. This detects token theft: if a stolen refresh token is used after the legitimate user has already rotated it, the entire session is invalidated.

**ID tokens (OIDC):** Contain user identity claims (name, email). Not used for API authorization. Consumed by the client application to display user information.

### Token Storage in Browsers

| Storage | XSS Risk | CSRF Risk | Recommendation |
|---------|----------|-----------|----------------|
| HttpOnly Secure cookie | Not accessible to JS | Must use SameSite + CSRF token | Preferred for web applications |
| localStorage | Accessible to any JS on the page | No CSRF risk (not sent automatically) | Avoid -- any XSS vulnerability exposes the token |
| sessionStorage | Same as localStorage, but cleared on tab close | Same | Slightly better than localStorage, still vulnerable to XSS |
| In-memory (JS variable) | Accessible to same-page JS only | No CSRF risk | Good for SPAs, but lost on page refresh (pair with refresh token in HttpOnly cookie) |

**Recommended pattern for SPAs:** Store the access token in memory (JavaScript variable). Store the refresh token in an HttpOnly, Secure, SameSite=Strict cookie. On page load, use the refresh token to obtain a new access token silently.

## OAuth 2.0

### Grant Types

| Grant Type | Use Case | Security Notes |
|------------|----------|----------------|
| Authorization Code + PKCE | Web apps, SPAs, mobile apps | Most secure for user-facing apps. PKCE prevents authorization code interception. |
| Client Credentials | Machine-to-machine, service accounts | No user involved. Client authenticates with client_id + client_secret. |
| Device Code | Smart TVs, CLI tools, IoT devices | User authorizes on a separate device with a browser. |
| Refresh Token | Extending sessions without re-authentication | Must be rotated on each use. Stored securely. |

**Deprecated:** Implicit grant (tokens in URL fragment -- vulnerable to interception) and Resource Owner Password Credentials (client handles raw credentials -- use Authorization Code instead).

### PKCE (Proof Key for Code Exchange)

PKCE prevents authorization code interception attacks, which are especially relevant for SPAs and mobile apps that cannot securely store a client secret.

1. Client generates a random `code_verifier` (43-128 characters).
2. Client computes `code_challenge = BASE64URL(SHA256(code_verifier))`.
3. Client sends `code_challenge` with the authorization request.
4. After user authorizes, client exchanges the authorization code along with the original `code_verifier`.
5. The authorization server verifies `SHA256(code_verifier) == code_challenge`.

An attacker who intercepts the authorization code cannot exchange it without the `code_verifier`.

## OpenID Connect (OIDC)

OIDC is an identity layer on top of OAuth 2.0. While OAuth 2.0 is about authorization (what can this application access?), OIDC is about authentication (who is this user?).

**Key additions over OAuth 2.0:**
- **ID Token:** A JWT containing user identity claims (sub, name, email, picture)
- **UserInfo endpoint:** Returns additional user profile information
- **Discovery document:** `.well-known/openid-configuration` provides endpoints and supported features
- **Standard scopes:** `openid`, `profile`, `email`, `address`, `phone`

**When to use OIDC:** When you need to know who the user is, not just verify that they authorized your application. Most "Login with Google" implementations use OIDC.

## Passkeys (WebAuthn / FIDO2)

### How It Works

Passkeys use public-key cryptography tied to a device's biometric sensor or security key. No passwords are transmitted or stored.

1. **Registration:** User creates a passkey. The device generates a key pair, stores the private key in secure hardware (TPM, Secure Enclave), and sends the public key to the server.
2. **Authentication:** Server sends a challenge. Device signs the challenge with the private key (after biometric confirmation). Server verifies the signature with the stored public key.

### Trade-offs

**Advantages:**
- Phishing-resistant: private keys are bound to the origin (domain) and cannot be used on a different site
- No passwords to steal, leak, or forget
- Resistant to credential stuffing and brute force
- User experience is faster than typing passwords (biometric tap vs. typing)
- Synced passkeys (iCloud Keychain, Google Password Manager) solve the device-loss problem

**Disadvantages:**
- Account recovery is complex if all passkeys are lost
- Not all users have compatible devices (though support is now >90% on modern platforms)
- Enterprise adoption requires fallback mechanisms during transition
- Requires server-side implementation of WebAuthn protocol (libraries available for all major languages)

## SSO (Single Sign-On) Patterns

### SAML 2.0

XML-based protocol primarily used in enterprise environments. The identity provider (IdP) authenticates the user and sends a signed SAML assertion to the service provider (SP).

**Use when:** Integrating with enterprise customers who use Okta, Azure AD, or Ping Identity. Most enterprise procurement teams require SAML support.

**Drawbacks:** XML parsing complexity, larger payload than JWT, requires understanding of SAML bindings (HTTP-POST, HTTP-Redirect).

### OIDC-Based SSO

Uses OpenID Connect as the SSO protocol. Simpler than SAML, uses JSON instead of XML, and is the standard for consumer and modern enterprise applications.

**Use when:** Building a new application with SSO requirements. Most modern IdPs (Auth0, Okta, Google Workspace) support OIDC.

### Build vs. Buy for SSO

| Approach | When | Cost Considerations |
|----------|------|---------------------|
| Auth0 / Clerk / WorkOS | Early-stage startup, small team, need to ship fast | $0-$500/month for up to 10K MAU; scales with users |
| Keycloak (self-hosted) | Need full control, on-premise requirements, budget constraints | Free software, but significant ops overhead |
| Custom implementation | Never (for SSO specifically) | The complexity of SAML/OIDC correctly is months of work and a perpetual security liability |

## Real-World Examples

### Shopify: Session Tokens for Embedded Apps

Shopify migrated their embedded app framework from cookie-based authentication to JWT-based session tokens. Embedded apps run inside an iframe on the Shopify admin, and third-party cookie restrictions made cookie-based auth unreliable. Their solution: the Shopify App Bridge generates a signed JWT that the embedded app sends to its backend. The backend verifies the JWT using Shopify's public key. This approach works regardless of browser cookie policies.

### Discord: Token Refresh and Session Management

Discord uses JWTs for API authentication with short expiration times and refresh token rotation. Their engineering blog describes their approach to session management across web, desktop, and mobile clients. Each client type has different token storage strategies: HttpOnly cookies for web, secure keychain storage for mobile, and encrypted local storage for desktop. All share the same token format and refresh flow.

### Apple: Passkeys as Primary Authentication

Apple was an early adopter of passkeys, integrating them into iOS 16 and macOS Ventura. Apple's implementation syncs passkeys across devices via iCloud Keychain, solving the device-loss recovery problem. Their developer documentation provides a reference implementation for server-side WebAuthn verification that has become a model for the industry.

### Okta: OIDC and SAML Bridge

Okta serves as both an OIDC and SAML identity provider, allowing organizations to authenticate users via OIDC while maintaining SAML integrations with legacy enterprise applications. Their architecture demonstrates how to bridge old and new authentication protocols without forcing a migration.

## Decision Framework

### Choose Session-Based Auth When...

- You have a monolithic server-rendered application
- Immediate session revocation is a requirement (banking, healthcare)
- Your team has limited authentication expertise (sessions are simpler to implement correctly)
- All API calls go through a single backend

### Choose JWT When...

- You have multiple backend services that need to verify authentication independently
- You are building a SPA with an API backend
- You need to embed authorization claims in the token
- You can enforce short token lifetimes (5-15 minutes) with refresh token rotation

### Choose OAuth 2.0 / OIDC When...

- You need "Login with Google/GitHub/Microsoft" (social login)
- You are building a platform where third-party apps need scoped access to user data
- Enterprise customers require SSO integration
- You want to delegate authentication to a specialized identity provider

### Choose Passkeys When...

- Security is paramount and you want phishing-resistant authentication
- Your user base has modern devices (2020+)
- You are willing to implement account recovery flows for users who lose all passkeys
- You want to improve UX by eliminating passwords

## Common Mistakes

**1. Rolling your own authentication.** Unless you are building an identity provider, use a well-tested library or service (Passport.js, next-auth, Auth0, Clerk). Authentication has dozens of subtle security requirements that are easy to get wrong.

**2. Long-lived JWTs without refresh tokens.** A JWT with a 24-hour expiration that cannot be revoked is a 24-hour window for a stolen token. Use 5-15 minute access tokens with refresh token rotation.

**3. Storing JWTs in localStorage.** Any XSS vulnerability on your site gives the attacker full access to the token. Use HttpOnly cookies for token storage in browsers.

**4. Not implementing refresh token rotation.** If a refresh token is stolen and the attacker uses it, the legitimate user's next refresh attempt should fail (the token was already rotated), triggering session invalidation. Without rotation, a stolen refresh token provides persistent access.

**5. Missing PKCE on public clients.** SPAs and mobile apps cannot securely store a client secret. Without PKCE, an attacker who intercepts the authorization code can exchange it for tokens.

**6. Trusting the JWT payload without signature verification.** Always verify the signature, expiration, issuer, and audience. A common vulnerability: accepting tokens signed with `alg: none` because the verification library has a permissive default.

**7. Same authentication for all risk levels.** Not all actions require the same assurance level. Viewing a dashboard can use a standard session. Changing a password or initiating a payment should require step-up authentication (re-enter password, MFA, passkey confirmation).

## Key Metrics to Track

| Metric | Why It Matters | Target |
|--------|---------------|--------|
| Authentication success rate | Low rates indicate UX friction or attack | > 95% for legitimate users |
| Time to authenticate | User experience impact | < 2 seconds including MFA |
| Failed authentication rate by IP | Credential stuffing detection | Alert on > 10 failures/min from single IP |
| Token refresh success rate | Session continuity | > 99.5% |
| MFA adoption rate | Security posture | > 80% of users (incentivize or mandate) |
| Passkey registration rate | Passwordless migration progress | Track and report monthly |
| Session hijacking incidents | Measures authentication security | Zero (any is a critical incident) |
| SSO integration uptime | IdP availability affects all authentication | > 99.9% |

## References

- RFC 7519: JSON Web Token (JWT)
- RFC 6749: OAuth 2.0 Authorization Framework
- RFC 7636: PKCE for OAuth 2.0
- OpenID Connect Core 1.0 specification
- W3C Web Authentication (WebAuthn) Level 2 specification
- FIDO Alliance: passkeys developer documentation (passkeys.dev)
- Shopify engineering blog: "Session Tokens for Embedded Apps" (2021)
- Apple developer documentation: "Supporting Passkeys" (2022)
- OWASP Authentication Cheat Sheet
- OWASP Session Management Cheat Sheet
- Auth0 blog: "The Complete Guide to OAuth 2.0 and OpenID Connect Protocols" (2023)
- NIST SP 800-63B: Digital Identity Guidelines -- Authentication and Lifecycle Management
