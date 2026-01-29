# Security Audit Report: Stablecoin Gateway

**Assessment Date**: 2026-01-28

**Assessed By**: Security Engineer - ConnectSW

**Product Version**: 1.0.0

**Assessment Type**: Pre-Production Security Audit

**Branch**: `feature/stablecoin-gateway/production-ready`

---

## Executive Summary

This security audit was conducted on the Stablecoin Gateway, a non-custodial cryptocurrency payment platform that enables merchants to accept USDC/USDT payments. The assessment covered application security, API security, authentication/authorization, database security, blockchain security, dependency vulnerabilities, and configuration security.

### Overall Security Posture

**Risk Level**: **MEDIUM**

The application demonstrates good security practices in several areas including password hashing, input validation, and authentication mechanisms. However, several **CRITICAL** and **HIGH** severity issues must be addressed before production deployment.

### Summary of Findings

| Severity | Count | Status |
|----------|-------|--------|
| **CRITICAL** | 3 | Open |
| **HIGH** | 5 | Open |
| **MEDIUM** | 7 | Open |
| **LOW** | 4 | Open |
| **INFORMATIONAL** | 3 | Open |

### Key Concerns

1. **CRITICAL**: Hardcoded default JWT secret in production code
2. **CRITICAL**: Private key storage in environment variables (insecure for production)
3. **CRITICAL**: Missing webhook signature verification implementation
4. **HIGH**: Missing rate limiting on authentication endpoints
5. **HIGH**: Insufficient JWT token validation (no refresh token revocation)
6. **HIGH**: Missing security headers (HSTS, CSP, X-Frame-Options)

---

## Scope

### In Scope

- Backend API (`apps/api/`)
- Authentication and authorization mechanisms
- Payment session management
- Database schema and queries
- API input validation
- Cryptographic implementations
- Environment configuration
- Dependency vulnerabilities
- Error handling and logging

### Out of Scope

- Frontend application (limited review only)
- Blockchain smart contracts (none deployed)
- Third-party Alchemy/Infura RPC providers
- Infrastructure security (AWS/deployment)
- Penetration testing (to be conducted separately)

---

## Assessment Methodology

- [X] OWASP Top 10 review
- [X] Code review (manual security analysis)
- [X] Dependency vulnerability scanning (attempted)
- [X] Configuration security review
- [X] Authentication/authorization review
- [X] API security review
- [X] Database security review
- [X] Cryptographic implementation review
- [ ] Dynamic application security testing (DAST) - not performed
- [ ] Penetration testing - scheduled post-fixes

---

## Findings

### Critical Issues

#### CRIT-001: Hardcoded Default JWT Secret in Production Code

**Severity**: CRITICAL

**Component**: `apps/api/src/app.ts` (line 43)

**CVSS Score**: 9.8 (Critical)

**Description**: The JWT secret has a hardcoded default value `'change-this-secret-in-production'` that will be used if the `JWT_SECRET` environment variable is not set. This is a severe security vulnerability that could allow attackers to forge authentication tokens.

**Code Location**:
```typescript
await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
});
```

**Impact**:
- Attackers can generate valid JWT tokens if the default secret is used
- Complete authentication bypass
- Unauthorized access to all merchant data and payment sessions
- Potential financial fraud

**Reproduction Steps**:
1. Deploy application without setting JWT_SECRET
2. Generate JWT token using default secret
3. Access protected endpoints with forged token

**Remediation**:
1. **IMMEDIATE**: Remove default value - application should FAIL TO START if JWT_SECRET is not set
2. Add startup validation to check for secure secrets
3. Use environment-specific secrets (minimum 32 bytes of cryptographic randomness)

```typescript
// Recommended fix:
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters');
}

await fastify.register(jwt, {
  secret: JWT_SECRET,
});
```

**Status**: Open

**Due Date**: IMMEDIATE (Before production deployment)

---

#### CRIT-002: Private Key Storage in Environment Variables

**Severity**: CRITICAL

**Component**: `.env.example` (line 34), Configuration

**CVSS Score**: 9.1 (Critical)

**Description**: The application stores hot wallet private keys in plaintext environment variables (`HOT_WALLET_PRIVATE_KEY`). This is highly insecure for production use and violates cryptographic key management best practices.

**Impact**:
- Compromise of environment variables = complete control of hot wallet
- Potential theft of all refund funds
- Exposure through logs, process dumps, or container inspection
- No key rotation capability

**Current Implementation**:
```bash
# .env.example
HOT_WALLET_PRIVATE_KEY="0x..."
```

**Remediation**:
1. **IMMEDIATE**: Never use environment variables for private keys in production
2. Implement AWS KMS (Key Management Service) or HashiCorp Vault
3. Use AWS Secrets Manager for secret rotation
4. Implement multi-signature wallets for refunds
5. Consider hardware security modules (HSM) for key storage

**Recommended Architecture**:
```typescript
// Use AWS KMS for key management
import { KMSClient, SignCommand } from '@aws-sdk/client-kms';

async function signTransaction(txHash: string) {
  const kmsClient = new KMSClient({ region: 'us-east-1' });
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: Buffer.from(txHash),
    MessageType: 'DIGEST',
    SigningAlgorithm: 'ECDSA_SHA_256'
  });

  const response = await kmsClient.send(command);
  return response.Signature;
}
```

**Status**: Open

**Due Date**: IMMEDIATE (Before production deployment)

---

#### CRIT-003: Missing Webhook Signature Verification Implementation

**Severity**: CRITICAL

**Component**: Webhook delivery system (not implemented)

**CVSS Score**: 8.6 (High)

**Description**: The webhook signature verification functions exist in `utils/crypto.ts`, but there is no implemented webhook endpoint that verifies incoming webhook signatures. This means merchant webhook endpoints cannot verify that webhooks are genuinely from the Stablecoin Gateway.

**Impact**:
- Merchants cannot verify webhook authenticity
- Attackers can forge payment completion webhooks
- Potential for merchant fraud
- Replay attack vulnerability

**Missing Implementation**:
- No webhook delivery route/endpoint
- No signature header validation
- No timestamp validation (replay attack prevention)
- No webhook secret rotation mechanism

**Remediation**:
1. Implement webhook delivery endpoint with signature verification
2. Add timestamp validation (reject webhooks older than 5 minutes)
3. Implement webhook retry logic with exponential backoff
4. Add webhook secret rotation API

**Required Implementation**:
```typescript
// Webhook delivery with signature verification
async function deliverWebhook(endpoint: WebhookEndpoint, payload: any) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signature = signWebhookPayload(payloadString, endpoint.secret, timestamp);

  await fetch(endpoint.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Signature': signature,
      'X-Gateway-Timestamp': timestamp.toString(),
    },
    body: payloadString,
  });
}
```

**Status**: Open

**Due Date**: IMMEDIATE (Core feature missing)

---

### High Issues

#### HIGH-001: Missing Rate Limiting on Authentication Endpoints

**Severity**: HIGH

**Component**: `apps/api/src/routes/v1/auth.ts`

**CVSS Score**: 7.5 (High)

**Description**: While global rate limiting is configured (100 req/min), authentication endpoints (`/v1/auth/login`, `/v1/auth/signup`) do not have stricter, endpoint-specific rate limits. This allows brute-force attacks on user credentials.

**Impact**:
- Brute-force attacks on user passwords
- Account enumeration through signup endpoint
- Credential stuffing attacks
- Resource exhaustion (DoS)

**Current Implementation**:
```typescript
// Global rate limiting only (app.ts)
await fastify.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
});
```

**Remediation**:
1. Implement stricter rate limiting on auth endpoints (5 attempts per 15 minutes per IP)
2. Add account-level rate limiting (track failed attempts per email)
3. Implement temporary account lockout after repeated failures
4. Add CAPTCHA after multiple failed attempts

**Recommended Implementation**:
```typescript
fastify.post('/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes',
      keyGenerator: (request) => request.body.email || request.ip
    }
  }
}, async (request, reply) => {
  // Login handler
});
```

**Status**: Open

**Due Date**: 7 days

---

#### HIGH-002: No Refresh Token Revocation Mechanism

**Severity**: HIGH

**Component**: `apps/api/src/routes/v1/auth.ts`

**CVSS Score**: 7.2 (High)

**Description**: The refresh token system has no revocation mechanism. Once issued, refresh tokens remain valid until expiration (7 days), even if the user logs out or the token is compromised.

**Impact**:
- Stolen refresh tokens remain valid until expiration
- No way to force logout users
- Compromised tokens cannot be invalidated
- Account takeover risk

**Current Implementation**:
```typescript
// Refresh tokens are validated only by JWT signature
const decoded = fastify.jwt.verify(refresh_token);
// No database check, no revocation list
```

**Remediation**:
1. Store refresh tokens in database with revocation status
2. Check token validity against database on each refresh
3. Implement logout endpoint that revokes all tokens
4. Add "logout all devices" functionality
5. Consider using Redis for fast token blacklist lookups

**Recommended Schema Addition**:
```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  revoked   Boolean  @default(false)
  revokedAt DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, revoked])
}
```

**Status**: Open

**Due Date**: 7 days

---

#### HIGH-003: Missing Security Headers

**Severity**: HIGH

**Component**: `apps/api/src/app.ts`

**CVSS Score**: 6.5 (Medium-High)

**Description**: The application does not set critical security headers such as HSTS, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and X-XSS-Protection.

**Impact**:
- Clickjacking attacks (no X-Frame-Options)
- MIME-sniffing attacks (no X-Content-Type-Options)
- XSS attacks (no CSP)
- Man-in-the-middle attacks (no HSTS)

**Missing Headers**:
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Permissions-Policy`

**Remediation**:
Install and configure `@fastify/helmet`:

```bash
npm install @fastify/helmet
```

```typescript
import helmet from '@fastify/helmet';

await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});
```

**Status**: Open

**Due Date**: 7 days

---

#### HIGH-004: Insufficient Input Sanitization for Ethereum Addresses

**Severity**: HIGH

**Component**: `apps/api/src/utils/validation.ts`, `apps/api/src/services/payment.service.ts`

**CVSS Score**: 6.8 (Medium-High)

**Description**: Ethereum addresses are validated only with a regex pattern, not with checksum validation. This could allow invalid addresses or case-sensitivity issues that lead to fund loss.

**Impact**:
- Funds sent to invalid addresses (permanent loss)
- Case-sensitivity issues causing transaction failures
- No EIP-55 checksum validation

**Current Implementation**:
```typescript
merchant_address: z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
```

**Remediation**:
Use `ethers.js` for proper address validation:

```typescript
import { isAddress, getAddress } from 'ethers';

merchant_address: z
  .string()
  .refine((addr) => isAddress(addr), 'Invalid Ethereum address')
  .transform((addr) => getAddress(addr)), // Returns checksummed address
```

**Status**: Open

**Due Date**: 7 days

---

#### HIGH-005: No Protection Against Replay Attacks on SSE Endpoint

**Severity**: HIGH

**Component**: `apps/api/src/routes/v1/payment-sessions.ts` (line 127)

**CVSS Score**: 6.5 (Medium-High)

**Description**: The Server-Sent Events (SSE) endpoint `/v1/payment-sessions/:id/events` has no authentication or authorization. Anyone with a payment session ID can subscribe to updates.

**Impact**:
- Information disclosure (payment status, transaction hashes)
- Privacy violation
- Enumeration of active payment sessions

**Current Implementation**:
```typescript
fastify.get('/:id/events', async (request, reply) => {
  // No authentication check!
  const { id } = request.params as { id: string };
  // ...
});
```

**Remediation**:
Add authentication to SSE endpoint:

```typescript
fastify.get('/:id/events', {
  onRequest: [fastify.optionalAuth], // At minimum
}, async (request, reply) => {
  const { id } = request.params as { id: string };

  // Verify ownership if authenticated
  if (request.currentUser) {
    const session = await fastify.prisma.paymentSession.findFirst({
      where: { id, userId: request.currentUser.id }
    });
    if (!session) {
      return reply.code(404).send({ error: 'Not found' });
    }
  }
  // ... rest of SSE logic
});
```

**Status**: Open

**Due Date**: 7 days

---

### Medium Issues

#### MED-001: Weak Password Requirements

**Severity**: MEDIUM

**Component**: `apps/api/src/utils/validation.ts`

**CVSS Score**: 5.3 (Medium)

**Description**: Password policy requires only 8 characters, one uppercase letter, and one number. No special characters required, no check against common passwords.

**Current Requirements**:
```typescript
.min(8, 'Password must be at least 8 characters')
.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
.regex(/[0-9]/, 'Password must contain at least one number'),
```

**Recommendation**:
```typescript
password: z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character')
  .refine((pw) => !commonPasswords.includes(pw), 'Password too common'),
```

**Status**: Open

**Due Date**: 30 days

---

#### MED-002: CORS Configuration Too Permissive

**Severity**: MEDIUM

**Component**: `apps/api/src/app.ts` (line 36)

**CVSS Score**: 5.0 (Medium)

**Description**: CORS is configured to allow a single origin, but credentials are enabled. In production, this should be more restrictive and use an allowlist of origins.

**Current Configuration**:
```typescript
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3101',
  credentials: true,
});
```

**Recommendation**:
```typescript
const allowedOrigins = [
  'https://gateway.io',
  'https://www.gateway.io',
  'https://app.gateway.io',
];

await fastify.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});
```

**Status**: Open

**Due Date**: 30 days

---

#### MED-003: No Request ID Tracking Across Services

**Severity**: MEDIUM

**Component**: Logging system

**CVSS Score**: 4.5 (Medium)

**Description**: While request IDs are generated by Fastify, they are not consistently logged or passed to external services (blockchain RPCs, webhooks). This makes distributed tracing difficult.

**Impact**:
- Difficult to trace requests across services
- Harder to debug production issues
- No correlation between logs and external API calls

**Recommendation**:
1. Log request ID in all log statements
2. Pass request ID to external services via headers
3. Include request ID in error responses
4. Consider implementing OpenTelemetry for distributed tracing

**Status**: Open

**Due Date**: 30 days

---

#### MED-004: Database Connection String Logging Risk

**Severity**: MEDIUM

**Component**: `apps/api/src/plugins/prisma.ts`

**CVSS Score**: 4.8 (Medium)

**Description**: Prisma logs queries in development mode, which may include sensitive data. Ensure database connection strings with credentials are never logged.

**Current Configuration**:
```typescript
log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
```

**Recommendation**:
- Ensure `DATABASE_URL` is never logged
- Sanitize query logs to remove sensitive parameters
- Use Prisma's query event to filter sensitive data

**Status**: Open

**Due Date**: 30 days

---

#### MED-005: No API Key Permissions Enforcement

**Severity**: MEDIUM

**Component**: `apps/api/src/plugins/auth.ts`

**CVSS Score**: 5.5 (Medium)

**Description**: API keys have a `permissions` field (read, write, refund), but these permissions are not enforced in route handlers. All authenticated requests have full access.

**Impact**:
- Principle of least privilege violated
- Read-only keys can create payment sessions
- Increased risk from compromised limited-scope keys

**Recommendation**:
```typescript
// Add permission check decorator
fastify.decorate('requirePermission', (permission: string) => {
  return async (request: FastifyRequest) => {
    await fastify.authenticate(request);

    if (request.apiKey) {
      const perms = request.apiKey.permissions as any;
      if (!perms[permission]) {
        throw new AppError(403, 'forbidden', 'Insufficient permissions');
      }
    }
  };
});

// Use in routes
fastify.post('/', {
  onRequest: [fastify.requirePermission('write')],
}, async (request, reply) => {
  // ...
});
```

**Status**: Open

**Due Date**: 30 days

---

#### MED-006: Missing Transaction Amount Validation

**Severity**: MEDIUM

**Component**: Payment verification (blockchain monitoring - not yet implemented)

**CVSS Score**: 6.0 (Medium)

**Description**: When blockchain monitoring is implemented, the system must verify that the actual on-chain transaction amount matches the expected payment amount. This verification is critical to prevent underpayment fraud.

**Impact**:
- Merchants may receive less than expected amount
- Partial payment attacks
- Financial loss to merchants

**Recommendation**:
When implementing blockchain monitoring:
```typescript
async function verifyTransaction(tx: Transaction, expected: PaymentSession) {
  const actualAmount = parseUnits(tx.value.toString(), 6); // USDC has 6 decimals
  const expectedAmount = parseUnits(expected.amount.toString(), 6);

  if (actualAmount < expectedAmount) {
    throw new Error('Payment amount too low');
  }

  // Verify recipient address
  if (tx.to.toLowerCase() !== expected.merchantAddress.toLowerCase()) {
    throw new Error('Payment to wrong address');
  }
}
```

**Status**: Open (Future implementation)

**Due Date**: Before blockchain monitoring implementation

---

#### MED-007: No Input Size Limits on Metadata Field

**Severity**: MEDIUM

**Component**: `apps/api/src/utils/validation.ts`

**CVSS Score**: 4.2 (Medium)

**Description**: The `metadata` field in payment sessions has no size limit, which could allow DoS attacks through extremely large JSON payloads.

**Current Validation**:
```typescript
metadata: z.record(z.unknown()).optional(),
```

**Recommendation**:
```typescript
metadata: z
  .record(z.unknown())
  .optional()
  .refine(
    (data) => JSON.stringify(data || {}).length <= 10000,
    'Metadata too large (max 10KB)'
  ),
```

**Status**: Open

**Due Date**: 30 days

---

### Low Issues

#### LOW-001: Email Address Case Sensitivity

**Severity**: LOW

**Component**: `apps/api/src/routes/v1/auth.ts`

**CVSS Score**: 3.5 (Low)

**Description**: Email addresses are not normalized to lowercase before storage, which could lead to duplicate accounts with different casing (user@example.com vs USER@example.com).

**Recommendation**:
```typescript
const body = validateBody(signupSchema, request.body);
const normalizedEmail = body.email.toLowerCase().trim();

const existingUser = await fastify.prisma.user.findUnique({
  where: { email: normalizedEmail },
});
```

**Status**: Open

**Due Date**: 90 days

---

#### LOW-002: Missing API Version in URL Path

**Severity**: LOW

**Component**: API routing

**CVSS Score**: 2.0 (Low)

**Description**: While routes are prefixed with `/v1`, there's no version negotiation or deprecation strategy documented.

**Recommendation**:
- Document API versioning strategy
- Plan for v2 migration path
- Implement version sunset notifications

**Status**: Open

**Due Date**: 90 days

---

#### LOW-003: Incomplete Error Messages in Production

**Severity**: LOW

**Component**: `apps/api/src/app.ts` (error handler)

**CVSS Score**: 2.5 (Low)

**Description**: Generic error messages in production are good for security, but make debugging harder. Consider including error correlation IDs in responses.

**Recommendation**:
```typescript
return reply.code(500).send({
  type: 'https://gateway.io/errors/internal-error',
  title: 'Internal Server Error',
  status: 500,
  detail: 'An unexpected error occurred',
  request_id: request.id, // ✓ Already included
  support_url: 'https://support.gateway.io',
});
```

**Status**: Open

**Due Date**: 90 days

---

#### LOW-004: No Rate Limit Headers Returned

**Severity**: LOW

**Component**: Rate limiting middleware

**CVSS Score**: 2.0 (Low)

**Description**: Rate limit responses don't include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers to inform clients.

**Recommendation**:
Configure `@fastify/rate-limit` to add headers:
```typescript
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: 60000,
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
});
```

**Status**: Open

**Due Date**: 90 days

---

### Informational

#### INFO-001: Consider Adding Request Signing for High-Value Operations

**Severity**: INFORMATIONAL

**Component**: API design

**Description**: For high-value operations like refunds, consider requiring request signing with API key to prevent token replay attacks.

**Recommendation**: Implement HMAC request signing for sensitive operations.

**Status**: Open

---

#### INFO-002: Add Security.txt File

**Severity**: INFORMATIONAL

**Component**: Infrastructure

**Description**: Add a `/.well-known/security.txt` file for security researchers to report vulnerabilities.

**Recommendation**:
```
Contact: security@gateway.io
Expires: 2027-01-28T00:00:00.000Z
Preferred-Languages: en
Canonical: https://gateway.io/.well-known/security.txt
```

**Status**: Open

---

#### INFO-003: Consider Implementing Bug Bounty Program

**Severity**: INFORMATIONAL

**Component**: Security program

**Description**: Before production launch, consider implementing a bug bounty program through HackerOne or Bugcrowd to incentivize responsible disclosure.

**Status**: Open

---

## Security Strengths

The following security practices are well-implemented:

### Authentication & Cryptography
- **Strong password hashing**: Bcrypt with cost factor 12 ✓
- **Secure API key hashing**: SHA-256 before storage ✓
- **JWT token expiration**: Short-lived access tokens (15m) ✓
- **Timing-safe comparison**: Used for webhook signature verification ✓
- **Cryptographically secure random generation**: `crypto.randomBytes()` used throughout ✓

### Input Validation
- **Comprehensive Zod schemas**: All inputs validated ✓
- **Type safety**: TypeScript throughout ✓
- **Email format validation**: Using Zod email validator ✓
- **Ethereum address regex**: Basic validation in place ✓

### Database Security
- **Parameterized queries**: Prisma ORM prevents SQL injection ✓
- **No raw SQL**: All queries through ORM ✓
- **Foreign key constraints**: Proper relations defined ✓
- **Indexes**: Performance and security indexes on sensitive fields ✓

### Error Handling
- **Generic error messages in production**: Prevents information disclosure ✓
- **Request ID tracking**: Included in error responses ✓
- **Structured error responses**: RFC 7807 Problem Details format ✓

### API Design
- **RESTful design**: Clear resource hierarchy ✓
- **Proper HTTP status codes**: 200, 201, 400, 401, 404, 409, 500 ✓
- **JSON API**: Consistent response format ✓

### Non-Custodial Architecture
- **No private key storage for customer funds**: Merchants receive funds directly ✓
- **No money transmitter license required**: Non-custodial design ✓

---

## Recommendations

### Immediate Actions (Critical/High - Before Production)

1. **Remove hardcoded JWT secret default** (CRIT-001)
   - Application must fail to start if JWT_SECRET not set
   - Validate secret strength on startup

2. **Implement KMS for private key storage** (CRIT-002)
   - Use AWS KMS or HashiCorp Vault
   - Never store private keys in environment variables

3. **Implement webhook signature verification** (CRIT-003)
   - Build webhook delivery endpoint
   - Add timestamp validation
   - Implement retry logic

4. **Add rate limiting to auth endpoints** (HIGH-001)
   - 5 attempts per 15 minutes per IP
   - Account lockout after repeated failures

5. **Implement refresh token revocation** (HIGH-002)
   - Store tokens in database
   - Add logout endpoint
   - Check revocation status on refresh

6. **Add security headers** (HIGH-003)
   - Install @fastify/helmet
   - Configure CSP, HSTS, X-Frame-Options

7. **Improve Ethereum address validation** (HIGH-004)
   - Use ethers.js isAddress()
   - Implement checksum validation

8. **Add authentication to SSE endpoint** (HIGH-005)
   - Verify ownership of payment session
   - Implement optional auth at minimum

### Short-term (30 days)

1. Strengthen password requirements (MED-001)
2. Restrict CORS to production origins (MED-002)
3. Implement distributed tracing (MED-003)
4. Review database logging (MED-004)
5. Enforce API key permissions (MED-005)
6. Add metadata size limits (MED-007)

### Long-term (90 days)

1. Normalize email addresses (LOW-001)
2. Document API versioning strategy (LOW-002)
3. Add rate limit headers (LOW-004)
4. Implement request signing for refunds (INFO-001)
5. Add security.txt file (INFO-002)
6. Launch bug bounty program (INFO-003)

---

## Compliance Assessment

### OWASP Top 10 2021 Coverage

| # | Vulnerability | Status | Notes |
|---|---------------|--------|-------|
| 1 | Broken Access Control | ⚠️ Partial | SSE endpoint lacks auth (HIGH-005) |
| 2 | Cryptographic Failures | ⚠️ Partial | Private key storage issue (CRIT-002) |
| 3 | Injection | ✅ Good | Prisma ORM prevents SQL injection |
| 4 | Insecure Design | ⚠️ Partial | Missing refresh token revocation (HIGH-002) |
| 5 | Security Misconfiguration | ❌ Issues | Missing security headers (HIGH-003), default JWT secret (CRIT-001) |
| 6 | Vulnerable Components | ⚠️ Unknown | Dependency audit needed |
| 7 | Identification & Authentication Failures | ⚠️ Partial | Weak password policy (MED-001), missing rate limiting (HIGH-001) |
| 8 | Software & Data Integrity Failures | ⚠️ Partial | Missing webhook verification (CRIT-003) |
| 9 | Logging & Monitoring Failures | ⚠️ Partial | Basic logging present, needs enhancement (MED-003) |
| 10 | Server-Side Request Forgery | ✅ N/A | No SSRF vectors identified |

**Overall OWASP Compliance**: 4/10 Full, 5/10 Partial, 1/10 N/A

---

## Dependency Security

**NOTE**: Automated npm audit could not be executed during this review. Manual review was conducted instead.

### Identified Dependencies (apps/api/package.json)

**Production Dependencies**:
- `@fastify/cors@8.5.0`
- `@fastify/jwt@7.2.4`
- `@fastify/rate-limit@9.1.0`
- `@prisma/client@5.8.1` → Updated to 5.22.0 (good)
- `bcrypt@5.1.1`
- `bullmq@5.1.7` → Updated to 5.67.1 (good)
- `ethers@6.10.0` → Updated to 6.16.0 (good)
- `fastify@4.25.2` → Updated to 4.29.1 (good)
- `fastify-plugin@4.5.1`
- `ioredis@5.3.2` → Updated to 5.9.2 (good)
- `pino-pretty@10.3.1`
- `zod@3.22.4` → Updated to 3.25.76 (good)

**Observations**:
- Dependencies appear relatively up-to-date
- Major versions are current (Fastify 4.x, Prisma 5.x, ethers 6.x)
- No obviously outdated packages detected

**Recommendation**:
1. Run `npm audit` in production environment
2. Set up Dependabot or Snyk for automated vulnerability scanning
3. Review transitive dependencies for known CVEs
4. Schedule monthly dependency updates

---

## Environment & Configuration Security

### Environment Variables Review

**Sensitive Variables Identified**:
```bash
JWT_SECRET                  # ⚠️ Default value exists (CRIT-001)
DATABASE_URL                # ✓ Should be secure in production
REDIS_URL                   # ✓ Should be secure in production
ALCHEMY_API_KEY            # ✓ Third-party secret
INFURA_PROJECT_ID          # ✓ Third-party secret
HOT_WALLET_PRIVATE_KEY     # ❌ Plaintext storage (CRIT-002)
```

### Configuration Issues

1. **Development defaults used**: `.env` file contains development values
2. **No environment validation**: Application doesn't validate required env vars on startup
3. **No secrets rotation policy**: Static secrets with no rotation mechanism

**Recommendations**:
1. Use separate `.env.production` file
2. Implement startup validation for required variables
3. Use AWS Secrets Manager with automatic rotation
4. Never commit `.env` files to git (✓ already in .gitignore)

---

## Blockchain/Crypto Security

### Architecture Review

**Non-Custodial Design**: ✅ GOOD
- No customer funds held by platform
- Direct wallet-to-wallet transfers
- Platform only facilitates payment sessions

**Smart Contract Interaction**: ✅ N/A
- No smart contracts deployed
- Direct ERC-20 token transfers only

### Potential Issues

1. **Gas price manipulation**: No protection against gas price frontrunning (merchant pays gas, so low risk)
2. **Refund security**: Refunds require hot wallet private key (CRIT-002)
3. **Transaction verification**: Blockchain monitoring not yet implemented (MED-006)

### Recommendations

1. Implement transaction amount verification before marking as completed
2. Use multi-sig wallets for refund operations
3. Monitor for unusual gas price spikes
4. Implement transaction receipt verification

---

## Testing Security

### Test Coverage Review

**Integration Tests**: ✅ Present
- 17 integration tests passing
- Auth flow tested
- Payment session creation tested

**Security Tests**: ❌ Missing
- No authentication bypass tests
- No SQL injection tests
- No XSS tests
- No rate limiting tests

**Recommendations**:
1. Add security-focused test suite
2. Test authentication/authorization edge cases
3. Test rate limiting behavior
4. Add fuzzing tests for input validation
5. Implement automated security regression tests

---

## Incident Response Readiness

### Current Capabilities

**Logging**: ⚠️ Partial
- Basic structured logging in place
- Request IDs tracked
- Errors logged with stack traces
- No centralized log aggregation mentioned

**Monitoring**: ❌ Not Implemented
- No mention of monitoring tools (Datadog mentioned in README but not configured)
- No alerting configured
- No anomaly detection

**Recommendations**:
1. Implement Datadog or similar APM
2. Configure alerts for:
   - High error rates
   - Failed authentication attempts
   - Unusual payment patterns
   - Rate limit violations
3. Create incident response runbook
4. Define escalation procedures

---

## Next Assessment

**Recommended Date**: 2026-04-28 (90 days post-launch)

**Trigger Events for Early Reassessment**:
- Major feature additions (webhooks, refunds)
- Security incident
- Significant architecture changes
- New critical vulnerabilities in dependencies
- Regulatory changes

**Future Assessment Scope**:
- Penetration testing (external firm)
- DAST scanning with OWASP ZAP
- Load testing with security focus
- Third-party security audit

---

## Conclusion

The Stablecoin Gateway demonstrates a solid foundation with good security practices in several areas, particularly in cryptographic implementations and input validation. However, **three CRITICAL and five HIGH severity issues must be resolved before production deployment**.

### Blocker Issues (Must Fix Before Production)

1. ❌ **CRIT-001**: Remove hardcoded JWT secret default
2. ❌ **CRIT-002**: Implement KMS for private key storage
3. ❌ **CRIT-003**: Implement webhook signature verification
4. ❌ **HIGH-001**: Add rate limiting to auth endpoints
5. ❌ **HIGH-002**: Implement refresh token revocation
6. ❌ **HIGH-003**: Add security headers
7. ❌ **HIGH-004**: Improve Ethereum address validation
8. ❌ **HIGH-005**: Add authentication to SSE endpoint

### Production Readiness: NOT READY

**Estimated time to address critical/high issues**: 5-7 business days

**Sign-off Required From**:
- Security Engineer (this report)
- CEO (business approval)
- QA Engineer (regression testing post-fixes)

---

## Appendix A: Security Testing Commands

### Dependency Audit
```bash
cd apps/api
npm audit --production
npm audit --audit-level=high
```

### Static Analysis
```bash
# ESLint security plugins
npm install --save-dev eslint-plugin-security
```

### Dynamic Testing
```bash
# OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://api:5001
```

---

## Appendix B: Security Contacts

**Internal**:
- Security Engineer: security@connectsw.com
- CEO: ceo@connectsw.com

**External Reporting**:
- Security Issues: security@gateway.io (to be created)
- Bug Bounty: bugbounty@gateway.io (to be created)

**Emergency Escalation**:
- On-call rotation to be established
- PagerDuty integration recommended

---

**Report Generated**: 2026-01-28
**Security Engineer**: ConnectSW Security Team
**Classification**: CONFIDENTIAL - INTERNAL USE ONLY
**Version**: 1.0
