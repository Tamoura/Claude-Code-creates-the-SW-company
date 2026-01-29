# Security Audit Plan - Stablecoin Gateway

**Date**: 2026-01-29
**Audited By**: Security Engineer
**Product**: Stablecoin Gateway
**Branch**: `fix/stablecoin-gateway/security-audit-2026-01`

---

## Executive Summary

This security audit identified **10 critical and high-risk issues** that must be addressed before the product can be deployed to production. The issues range from production-breaking authentication failures to security vulnerabilities that could lead to unauthorized access and potential financial loss.

**Severity Breakdown**:
- **CRITICAL (Production Breaking)**: 4 issues
- **HIGH (Security Risk)**: 3 issues
- **MEDIUM (Quality/Reliability)**: 3 issues

**Estimated Fix Time**: 8-12 hours
**Risk Level**: CRITICAL - Product cannot be deployed in current state

---

## Issue Details & Fix Plan

### CRITICAL BLOCKERS (Production Breaking)

#### CRIT-01: Frontend Cannot Authenticate - No Authorization Headers

**Status**: CONFIRMED
**Severity**: CRITICAL
**Impact**: Complete frontend-to-backend authentication failure
**CVSS**: 9.1 (Critical)

**Evidence**:
- **File**: `products/stablecoin-gateway/apps/web/src/lib/api-client.ts`
- **Lines**: 72-91 (request method)
- **Code**:
  ```typescript
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  ```

**Root Cause**:
The API client never attaches the `Authorization: Bearer <token>` header to outgoing requests. All authenticated endpoints (`/v1/payment-sessions/*`) require authentication via `fastify.authenticate` middleware (lines 11, 49, 96 in `payment-sessions.ts`), which checks for the `Authorization` header. Without this header, all requests will return `401 Unauthorized`.

**Reproduction**:
1. User logs in successfully, receives JWT token
2. User calls `apiClient.createPaymentSession({ ... })`
3. Request is sent without `Authorization` header
4. Backend returns `401 Unauthorized`
5. Frontend cannot create payment sessions

**Fix Strategy**:

**Option A: Local Storage + Global Token Management** (RECOMMENDED)
- Store JWT in localStorage after login
- Create a global token manager in `lib/auth.ts`
- Modify `ApiClient.request()` to automatically inject token from localStorage
- Add token refresh logic when token expires

**Option B: Context API Pattern**
- Use React Context to pass token down component tree
- Modify `ApiClient` to accept token as constructor parameter
- Requires significant component refactoring

**Recommended Fix (Option A)**:

1. **Create Token Manager** (`apps/web/src/lib/auth.ts`):
   ```typescript
   export const TokenManager = {
     getToken(): string | null {
       return localStorage.getItem('auth_token');
     },
     setToken(token: string): void {
       localStorage.setItem('auth_token', token);
     },
     clearToken(): void {
       localStorage.removeItem('auth_token');
     }
   };
   ```

2. **Modify ApiClient.request()** (`apps/web/src/lib/api-client.ts:72-76`):
   ```typescript
   const headers: Record<string, string> = {
     'Content-Type': 'application/json',
     ...options.headers,
   };

   // Inject auth token if available
   const token = TokenManager.getToken();
   if (token) {
     headers['Authorization'] = `Bearer ${token}`;
   }
   ```

3. **Update Login Flow**: After successful login, call `TokenManager.setToken(response.token)`

**Files to Modify**:
- `apps/web/src/lib/api-client.ts` (add auth header injection)
- `apps/web/src/lib/auth.ts` (new file - token manager)
- `apps/web/src/pages/LoginPage.tsx` (store token after login)
- `apps/web/src/pages/SignupPage.tsx` (store token after signup)

**Testing**:
- Unit test: Verify token is injected when present, omitted when absent
- E2E test: Login → Create payment session → Verify 201 response (not 401)

**Dependencies**: None (can be fixed independently)
**Priority**: P0 - Must fix first

---

#### CRIT-02: SSE Unusable - EventSource Cannot Set Auth Headers

**Status**: CONFIRMED
**Severity**: CRITICAL
**Impact**: Real-time payment status updates completely broken
**CVSS**: 8.6 (High)

**Evidence**:
- **Backend File**: `products/stablecoin-gateway/apps/api/src/routes/v1/payment-sessions.ts`
- **Backend Lines**: 127-178 (SSE endpoint)
- **Backend Code**:
  ```typescript
  fastify.get('/:id/events', async (request, reply) => {
    await request.jwtVerify(); // Line 130 - REQUIRES JWT
    const userId = (request.user as { userId: string }).userId;
    // ...
  });
  ```

- **Frontend File**: `products/stablecoin-gateway/apps/web/src/lib/api-client.ts`
- **Frontend Lines**: 196-204 (createEventSource method)
- **Frontend Code**:
  ```typescript
  createEventSource(paymentId: string): EventSource {
    return new EventSource(`${this.baseUrl}/v1/payment-sessions/${paymentId}/events`);
  }
  ```

**Root Cause**:
The W3C EventSource API does not support custom headers (this is a browser limitation, not a bug in our code). The backend SSE endpoint requires JWT authentication via `request.jwtVerify()` (line 130), which extracts the JWT from the `Authorization` header. Since EventSource cannot send this header, authentication will always fail with a 401 error.

**Technical Background**:
- EventSource specification: https://html.spec.whatwg.org/multipage/server-sent-events.html
- "User agents must not send authentication or cookie information with the request" (paraphrased)
- This is a deliberate security restriction in the browser

**Current Behavior**:
1. Frontend calls `apiClient.createEventSource('ps_abc123')`
2. Browser creates EventSource connection to `/v1/payment-sessions/ps_abc123/events`
3. Backend calls `request.jwtVerify()` → throws error (no Authorization header)
4. EventSource connection fails with 401
5. Real-time updates never work

**Fix Strategy**:

**Option A: JWT in Query Parameter** (RECOMMENDED for prototype)
- Pass JWT as URL parameter: `?token=<jwt>`
- Extract token from query string in SSE endpoint
- Validate token manually

**Option B: Session-Based Auth with Cookies**
- Use HTTP-only cookies for session management
- EventSource sends cookies automatically
- Requires significant auth refactor

**Option C: WebSocket with Custom Headers**
- Replace SSE with WebSocket (WebSocket supports custom headers)
- More complex implementation
- Overkill for prototype

**Recommended Fix (Option A)**:

1. **Modify Frontend** (`apps/web/src/lib/api-client.ts:196-204`):
   ```typescript
   createEventSource(paymentId: string): EventSource {
     const token = TokenManager.getToken();
     if (!token) {
       throw new Error('Authentication required for event stream');
     }

     const url = `${this.baseUrl}/v1/payment-sessions/${paymentId}/events?token=${encodeURIComponent(token)}`;
     return new EventSource(url);
   }
   ```

2. **Modify Backend** (`apps/api/src/routes/v1/payment-sessions.ts:127-178`):
   ```typescript
   fastify.get('/:id/events', async (request, reply) => {
     try {
       // Extract token from query parameter
       const { token } = request.query as { token?: string };

       if (!token) {
         throw new AppError(401, 'unauthorized', 'Missing authentication token');
       }

       // Manually verify JWT
       const decoded = fastify.jwt.verify(token) as { userId: string };
       const userId = decoded.userId;

       const { id } = request.params as { id: string };

       // Get payment session and verify ownership
       const session = await fastify.prisma.paymentSession.findUnique({
         where: { id },
       });

       if (!session) {
         throw new AppError(404, 'payment-not-found', 'Payment session not found');
       }

       if (session.userId !== userId) {
         throw new AppError(403, 'forbidden', 'Access denied to this payment session');
       }

       // Set up SSE headers
       reply.raw.writeHead(200, {
         'Content-Type': 'text/event-stream',
         'Cache-Control': 'no-cache',
         'Connection': 'keep-alive',
       });

       // Send initial data
       const data = {
         status: session.status,
         confirmations: session.confirmations,
         tx_hash: session.txHash,
       };
       reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);

       // Heartbeat and cleanup (existing code)
       const heartbeat = setInterval(() => {
         reply.raw.write(': heartbeat\n\n');
       }, 30000);

       request.raw.on('close', () => {
         clearInterval(heartbeat);
         reply.raw.end();
       });
     } catch (error) {
       logger.error('Error in SSE stream', error);
       reply.raw.writeHead(401, { 'Content-Type': 'text/plain' });
       reply.raw.end('Unauthorized');
     }
   });
   ```

**Security Considerations**:
- **Risk**: JWT in query parameter appears in server logs
- **Mitigation**: This is acceptable for prototype/development
- **Production Alternative**: Use session cookies + HTTP-only flag (Option B)

**Files to Modify**:
- `apps/web/src/lib/api-client.ts` (add token to query string)
- `apps/api/src/routes/v1/payment-sessions.ts` (extract token from query)

**Testing**:
- Unit test: Verify token extraction from query param
- E2E test: Create payment → Open SSE connection → Verify data received

**Dependencies**: Depends on CRIT-01 (requires TokenManager)
**Priority**: P0 - Must fix after CRIT-01

---

#### CRIT-03: Missing PATCH Endpoint - Frontend Expects /v1/payment-sessions/:id PATCH

**Status**: CONFIRMED
**Severity**: CRITICAL
**Impact**: Frontend cannot update payment session status
**CVSS**: 7.5 (High)

**Evidence**:
- **Frontend File**: `products/stablecoin-gateway/apps/web/src/lib/api-client.ts`
- **Frontend Lines**: 161-183 (updatePaymentSession method)
- **Frontend Code**:
  ```typescript
  return this.request<PaymentSession>(`/v1/payment-sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  ```

- **Backend File**: `products/stablecoin-gateway/apps/api/src/routes/v1/payment-sessions.ts`
- **Backend Issue**: No PATCH route defined (only POST, GET, GET with SSE)

**Root Cause**:
The frontend `updatePaymentSession()` method sends a PATCH request to `/v1/payment-sessions/:id`, but the backend does not define this route. When called, the backend returns `404 Not Found` because no route handler exists.

**Current Backend Routes**:
- `POST /v1/payment-sessions` ✅ (line 10)
- `GET /v1/payment-sessions` ✅ (line 48)
- `GET /v1/payment-sessions/:id` ✅ (line 95)
- `GET /v1/payment-sessions/:id/events` ✅ (line 127)
- `PATCH /v1/payment-sessions/:id` ❌ **MISSING**

**Intended Use Case**:
The frontend needs to update payment session details when:
- Customer connects wallet (update `customer_address`)
- Transaction is submitted (update `tx_hash`, `status: 'confirming'`)
- Transaction is confirmed (update `status: 'completed'`, `confirmations`, `block_number`)

**Fix Strategy**:

Add PATCH endpoint to backend that:
1. Validates user ownership
2. Allows partial updates to safe fields
3. Prevents updating sensitive fields (amount, merchant_address, etc.)
4. Returns updated payment session

**Recommended Fix**:

1. **Add PATCH Route** (`apps/api/src/routes/v1/payment-sessions.ts` - insert after line 124):
   ```typescript
   // PATCH /v1/payment-sessions/:id
   fastify.patch('/:id', {
     onRequest: [fastify.authenticate],
   }, async (request, reply) => {
     try {
       const { id } = request.params as { id: string };
       const userId = request.currentUser!.id;
       const updates = request.body as Record<string, any>;

       // Get existing session and verify ownership
       const paymentService = new PaymentService(fastify.prisma);
       const existingSession = await paymentService.getPaymentSession(id, userId);

       // Validate allowed updates (prevent tampering with critical fields)
       const allowedFields = [
         'customer_address',
         'tx_hash',
         'block_number',
         'confirmations',
         'status',
       ];

       const sanitizedUpdates: Record<string, any> = {};
       for (const [key, value] of Object.entries(updates)) {
         if (allowedFields.includes(key)) {
           sanitizedUpdates[key] = value;
         }
       }

       // Update payment session
       const updatedSession = await fastify.prisma.paymentSession.update({
         where: { id },
         data: sanitizedUpdates,
       });

       const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
       const response = paymentService.toResponse(updatedSession, baseUrl);

       logger.info('Payment session updated', {
         userId,
         paymentSessionId: id,
         updates: Object.keys(sanitizedUpdates),
       });

       return reply.send(response);
     } catch (error) {
       if (error instanceof AppError) {
         return reply.code(error.statusCode).send(error.toJSON());
       }
       logger.error('Error updating payment session', error);
       throw error;
     }
   });
   ```

2. **Add Validation Schema** (`apps/api/src/utils/validation.ts` - add after line 59):
   ```typescript
   export const updatePaymentSessionSchema = z.object({
     customer_address: ethereumAddressSchema.optional(),
     tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
     block_number: z.number().int().positive().optional(),
     confirmations: z.number().int().min(0).optional(),
     status: z.enum(['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED']).optional(),
   });
   ```

3. **Use Validation in Route** (modify step 1 above):
   ```typescript
   const updates = validateBody(updatePaymentSessionSchema, request.body);
   ```

**Security Notes**:
- **Field Whitelist**: Only allow safe fields to be updated
- **Ownership Check**: Verify user owns payment session before update
- **Status Validation**: Prevent invalid status transitions (e.g., COMPLETED → PENDING)

**Files to Modify**:
- `apps/api/src/routes/v1/payment-sessions.ts` (add PATCH endpoint)
- `apps/api/src/utils/validation.ts` (add validation schema)

**Testing**:
- Unit test: Verify field whitelisting, ownership check
- E2E test: Create session → PATCH with updates → Verify changes

**Dependencies**: None (can be fixed independently)
**Priority**: P0 - Must fix

---

#### CRIT-04: Port Mismatch - Frontend Expects 5000, Backend Runs on 5001

**Status**: CONFIRMED
**Severity**: CRITICAL
**Impact**: Frontend cannot connect to backend in development
**CVSS**: 7.5 (High)

**Evidence**:
- **Frontend File**: `products/stablecoin-gateway/apps/web/src/lib/api-client.ts`
- **Frontend Line**: 8
- **Frontend Code**:
  ```typescript
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  ```

- **Backend File**: `products/stablecoin-gateway/apps/api/src/index.ts`
- **Backend Lines**: 12-13
- **Backend Code**:
  ```typescript
  const port = parseInt(process.env.PORT || '5001'); // See .claude/PORT-REGISTRY.md
  ```

**Root Cause**:
The frontend defaults to port 5000, but the backend defaults to port 5001 (as per company port registry). This causes connection failures during development when environment variables are not set.

**Current Behavior**:
1. Developer runs `npm run dev` in both apps
2. Backend starts on port 5001
3. Frontend tries to connect to port 5000
4. All API requests fail with "Connection refused" or "ERR_CONNECTION_REFUSED"

**Fix Strategy**:

Align default ports to match company standards defined in `.claude/PORT-REGISTRY.md`.

**Recommended Fix**:

1. **Update Frontend Default** (`apps/web/src/lib/api-client.ts:8`):
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
   ```

2. **Verify Port Registry Entry** (check `.claude/PORT-REGISTRY.md`):
   - Confirm stablecoin-gateway is assigned port 5001
   - If not assigned, add entry:
     ```markdown
     | stablecoin-gateway | Backend API | 5001 | - |
     ```

3. **Update Documentation** (if needed):
   - `products/stablecoin-gateway/README.md` - update port references
   - `products/stablecoin-gateway/.env.example` - set correct defaults

**Alternative Fix** (if port 5001 is wrong):
If port 5001 is NOT the correct port per PORT-REGISTRY.md, then:
1. Update backend to use correct port
2. Update frontend to match
3. Update all documentation

**Files to Modify**:
- `apps/web/src/lib/api-client.ts` (change default port to 5001)
- Possibly `.claude/PORT-REGISTRY.md` (add entry if missing)
- Possibly `README.md` and `.env.example` (documentation)

**Testing**:
- Manual test: Run both apps without .env → Verify connection works
- E2E test: Should work without requiring environment variable override

**Dependencies**: None (can be fixed independently)
**Priority**: P0 - Simple fix, high impact

---

### HIGH-RISK SECURITY

#### HIGH-01: API Key Permissions Not Enforced

**Status**: CONFIRMED
**Severity**: HIGH
**Impact**: Privilege escalation - API keys can perform unauthorized actions
**CVSS**: 8.1 (High)
**CWE**: CWE-285 (Improper Authorization)

**Evidence**:
- **Schema File**: `products/stablecoin-gateway/apps/api/prisma/schema.prisma`
- **Schema Lines**: 148-170 (ApiKey model)
- **Schema Code**:
  ```prisma
  model ApiKey {
    permissions Json @default("{\"read\":true,\"write\":true,\"refund\":false}")
    // ...
  }
  ```

- **Auth Plugin File**: `products/stablecoin-gateway/apps/api/src/plugins/auth.ts`
- **Auth Plugin Lines**: 41-59 (API key authentication)
- **Auth Plugin Code**:
  ```typescript
  const apiKey = await fastify.prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey) {
    throw new AppError(401, 'unauthorized', 'Invalid API key');
  }

  request.currentUser = apiKey.user;
  request.apiKey = apiKey;  // <-- Permissions stored here, but never checked
  ```

- **Routes File**: `products/stablecoin-gateway/apps/api/src/routes/v1/payment-sessions.ts`
- **Routes Issue**: No permission checks in any route handlers

**Root Cause**:
API keys have a `permissions` field in the database with structure `{ read: boolean, write: boolean, refund: boolean }`, but the backend never validates these permissions before executing actions. An API key with `{ read: true, write: false }` can still create and modify payment sessions.

**Attack Scenario**:
1. User creates API key with read-only permissions: `{ read: true, write: false, refund: false }`
2. Attacker steals the read-only API key
3. Attacker uses key to create payment sessions (should fail but doesn't)
4. Attacker redirects payments to their own wallet address
5. Merchant loses funds

**Current Permission Checks**: NONE

**Expected Permission Checks**:
- `POST /v1/payment-sessions` → Requires `write: true`
- `GET /v1/payment-sessions` → Requires `read: true`
- `GET /v1/payment-sessions/:id` → Requires `read: true`
- `PATCH /v1/payment-sessions/:id` → Requires `write: true`
- `POST /v1/refunds` → Requires `refund: true`

**Fix Strategy**:

Create a permission enforcement decorator that checks API key permissions before executing route handlers.

**Recommended Fix**:

1. **Create Permission Checker** (`apps/api/src/plugins/auth.ts` - add after line 76):
   ```typescript
   // Permission enforcement decorator
   fastify.decorate('requirePermission', (permission: 'read' | 'write' | 'refund') => {
     return async (request: FastifyRequest) => {
       // If authenticated via JWT (user session), allow all permissions
       if (!request.apiKey) {
         return; // JWT users have full permissions
       }

       // If authenticated via API key, check permissions
       const permissions = request.apiKey.permissions as { read: boolean; write: boolean; refund: boolean };

       if (!permissions[permission]) {
         throw new AppError(
           403,
           'insufficient-permissions',
           `This API key does not have '${permission}' permission`
         );
       }
     };
   });
   ```

2. **Add Type Augmentation** (`apps/api/src/plugins/auth.ts` - add to bottom):
   ```typescript
   declare module 'fastify' {
     interface FastifyInstance {
       authenticate: (request: FastifyRequest) => Promise<void>;
       optionalAuth: (request: FastifyRequest) => Promise<void>;
       requirePermission: (permission: 'read' | 'write' | 'refund') => (request: FastifyRequest) => Promise<void>;
     }

     interface FastifyRequest {
       currentUser?: User;
       apiKey?: ApiKey;
     }
   }
   ```

3. **Update Route Handlers** (`apps/api/src/routes/v1/payment-sessions.ts`):
   ```typescript
   // POST /v1/payment-sessions
   fastify.post('/', {
     onRequest: [fastify.authenticate, fastify.requirePermission('write')],
   }, async (request, reply) => {
     // ... existing code
   });

   // GET /v1/payment-sessions
   fastify.get('/', {
     onRequest: [fastify.authenticate, fastify.requirePermission('read')],
   }, async (request, reply) => {
     // ... existing code
   });

   // GET /v1/payment-sessions/:id
   fastify.get('/:id', {
     onRequest: [fastify.authenticate, fastify.requirePermission('read')],
   }, async (request, reply) => {
     // ... existing code
   });

   // PATCH /v1/payment-sessions/:id (after adding endpoint per CRIT-03)
   fastify.patch('/:id', {
     onRequest: [fastify.authenticate, fastify.requirePermission('write')],
   }, async (request, reply) => {
     // ... existing code
   });
   ```

4. **Update Refund Routes** (when implemented):
   ```typescript
   fastify.post('/v1/refunds', {
     onRequest: [fastify.authenticate, fastify.requirePermission('refund')],
   }, async (request, reply) => {
     // ... refund logic
   });
   ```

**Files to Modify**:
- `apps/api/src/plugins/auth.ts` (add requirePermission decorator)
- `apps/api/src/routes/v1/payment-sessions.ts` (add permission checks to all routes)

**Testing**:
- Unit test: Create API key with read-only → Attempt POST → Verify 403
- Unit test: Create API key with write → Attempt POST → Verify success
- Unit test: JWT user → All operations allowed
- Integration test: Full permission matrix

**Dependencies**: None (can be fixed independently)
**Priority**: P1 - High security risk

---

#### HIGH-02: Webhook Signature Inconsistency - Two Schemes + Timing Attack

**Status**: CONFIRMED
**Severity**: HIGH
**Impact**: Webhook verification bypass, potential replay attacks
**CVSS**: 7.4 (High)
**CWE**: CWE-208 (Observable Timing Discrepancy)

**Evidence**:

**Scheme 1** - In `webhook.service.ts`:
- **File**: `products/stablecoin-gateway/apps/api/src/services/webhook.service.ts`
- **Lines**: 35-48 (generateSignature and verifySignature)
- **Code**:
  ```typescript
  generateSignature(payload: Record<string, any>): string {
    const payloadString = JSON.stringify(payload);
    const hmac = createHmac('sha256', this.secret);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  verifySignature(payload: Record<string, any>, signature: string): boolean {
    const expectedSignature = this.generateSignature(payload);
    return expectedSignature === signature;  // ⚠️ NON-CONSTANT TIME COMPARE
  }
  ```

**Scheme 2** - In `crypto.ts`:
- **File**: `products/stablecoin-gateway/apps/api/src/utils/crypto.ts`
- **Lines**: 31-46 (signWebhookPayload and verifyWebhookSignature)
- **Code**:
  ```typescript
  export function signWebhookPayload(payload: string, secret: string, timestamp: number): string {
    const signedPayload = `${timestamp}.${payload}`;
    return crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  }

  export function verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    timestamp: number
  ): boolean {
    const expectedSignature = signWebhookPayload(payload, secret, timestamp);
    return crypto.timingSafeEqual(  // ✅ CONSTANT TIME COMPARE
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
  ```

**Root Cause Analysis**:

1. **Competing Implementations**: Two different webhook signing schemes exist in the codebase:
   - Scheme 1: Signs `JSON.stringify(payload)` directly
   - Scheme 2: Signs `timestamp.payload` (Stripe-style)

2. **Timing Attack Vulnerability**: Scheme 1 uses `===` (string equality), which is NOT constant-time. An attacker can use timing analysis to determine the correct signature character-by-character.

3. **Inconsistent Usage**: It's unclear which scheme is actually used in production. This creates confusion and potential bugs.

**Timing Attack Explanation**:
```javascript
// Non-constant time comparison (Scheme 1)
expectedSignature === signature

// If signature is "abc123...", attacker tries:
// "aXXXXX..." -> Fast failure (first char wrong)
// "abXXXX..." -> Slightly slower failure (second char wrong)
// "abcXXX..." -> Even slower failure (third char correct)
// Attacker can deduce correct characters by measuring response time
```

**Fix Strategy**:

1. **Standardize on Scheme 2** (crypto.ts) - It uses constant-time comparison and includes timestamp
2. **Remove or deprecate Scheme 1** (webhook.service.ts)
3. **Update all webhook verification to use crypto.ts functions**

**Recommended Fix**:

1. **Deprecate WebhookService Methods** (`apps/api/src/services/webhook.service.ts:35-48`):
   ```typescript
   /**
    * @deprecated Use signWebhookPayload from utils/crypto.ts instead
    */
   generateSignature(payload: Record<string, any>): string {
     console.warn('DEPRECATED: Use signWebhookPayload from utils/crypto.ts');
     const payloadString = JSON.stringify(payload);
     const hmac = createHmac('sha256', this.secret);
     hmac.update(payloadString);
     return hmac.digest('hex');
   }

   /**
    * @deprecated Use verifyWebhookSignature from utils/crypto.ts instead
    */
   verifySignature(payload: Record<string, any>, signature: string): boolean {
     console.warn('DEPRECATED: Use verifyWebhookSignature from utils/crypto.ts');
     const expectedSignature = this.generateSignature(payload);

     // FIX: Use constant-time comparison
     return crypto.timingSafeEqual(
       Buffer.from(expectedSignature),
       Buffer.from(signature)
     );
   }
   ```

2. **Update WebhookService.verifyWebhook** (`apps/api/src/services/webhook.service.ts:91-113`):
   ```typescript
   verifyWebhook(payload: WebhookPayload): WebhookVerificationResult {
     if (!payload.signature) {
       return { valid: false, error: 'missing_signature' };
     }

     if (!payload.timestamp) {
       return { valid: false, error: 'missing_timestamp' };
     }

     if (!this.isTimestampValid(payload.timestamp)) {
       return { valid: false, error: 'expired_timestamp' };
     }

     // Use crypto.ts for verification (constant-time)
     const { signature, timestamp, ...dataToVerify } = payload;
     const payloadString = JSON.stringify(dataToVerify);

     const isValid = verifyWebhookSignature(
       payloadString,
       signature,
       this.secret,
       timestamp
     );

     if (!isValid) {
       return { valid: false, error: 'invalid_signature' };
     }

     return { valid: true };
   }
   ```

3. **Import crypto functions** (`apps/api/src/services/webhook.service.ts:8`):
   ```typescript
   import { signWebhookPayload, verifyWebhookSignature } from '../utils/crypto.js';
   ```

4. **Update Documentation**: Add migration guide for any external consumers

**Files to Modify**:
- `apps/api/src/services/webhook.service.ts` (use constant-time comparison, prefer crypto.ts)
- Consider removing deprecated methods in future PR

**Testing**:
- Unit test: Verify constant-time comparison (test with nearly-correct signatures)
- Unit test: Verify timestamp validation
- Security test: Attempt timing attack (should not leak information)

**Dependencies**: None (can be fixed independently)
**Priority**: P1 - Security vulnerability

---

#### HIGH-03: No On-Chain Verification Logic

**Status**: CONFIRMED
**Severity**: HIGH
**Impact**: Payment fraud - Accept fake payments, wrong amounts, wrong tokens
**CVSS**: 8.6 (High)
**CWE**: CWE-345 (Insufficient Verification of Data Authenticity)

**Evidence**:
- **Missing Service**: No blockchain monitoring service exists
- **Payment Update Flow**: Relies on user-submitted data without verification

**Root Cause**:
The system accepts payment status updates (transaction hash, confirmations, completion) without verifying them on-chain. An attacker can submit a fake transaction hash or claim a payment is complete when it's not.

**Attack Scenarios**:

**Scenario 1: Fake Transaction Hash**
1. Attacker creates payment session for $1000
2. Attacker calls PATCH with `tx_hash: "0xFAKE..."`, `status: "completed"`
3. System marks payment as complete
4. Merchant ships product
5. No actual blockchain transaction occurred

**Scenario 2: Wrong Amount**
1. Attacker creates payment session for $1000 USDC
2. Attacker sends $1 USDC on-chain
3. Attacker submits real transaction hash
4. System doesn't verify amount matches
5. Merchant loses $999

**Scenario 3: Wrong Token**
1. Attacker creates payment session for 1000 USDC
2. Attacker sends 1000 worthless tokens (not USDC)
3. Attacker submits real transaction hash
4. System doesn't verify token contract address
5. Merchant receives worthless tokens

**Scenario 4: Wrong Recipient**
1. Attacker creates payment session (merchant address: 0xMERCHANT)
2. Attacker sends USDC to their own address (0xATTACKER)
3. Attacker submits real transaction hash
4. System doesn't verify recipient matches merchant
5. Merchant never receives payment

**Current Verification**: NONE
**Required Verification**:
- Transaction exists on blockchain
- Transaction is confirmed (minimum confirmations)
- Amount matches payment session amount
- Token contract matches payment session token (USDC/USDT address)
- Recipient address matches merchant address
- Sender address is recorded for refunds

**Fix Strategy**:

**Option A: Blockchain Monitor Service** (RECOMMENDED for production)
- Create service that polls blockchain for transactions
- Verify all transaction details on-chain
- Update payment status automatically
- Use ethers.js or web3.js

**Option B: Client-Side Proof Submission** (Acceptable for prototype)
- Require frontend to submit transaction receipt
- Backend verifies receipt against blockchain RPC
- Simpler but less secure (client can still fake receipts)

**Option C: Third-Party Service** (Stripe Atlas, Alchemy, etc.)
- Use blockchain API service for verification
- Most reliable but costs money
- Overkill for prototype

**Recommended Fix (Option B - Prototype Acceptable)**:

1. **Create Blockchain Verification Service** (`apps/api/src/services/blockchain.service.ts`):
   ```typescript
   import { ethers } from 'ethers';
   import { AppError } from '../types/index.js';

   // USDC contract addresses (mainnet)
   const TOKEN_ADDRESSES = {
     polygon: {
       USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
       USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
     },
     ethereum: {
       USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
       USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
     },
   };

   export class BlockchainService {
     private providers: Map<string, ethers.JsonRpcProvider> = new Map();

     constructor() {
       // Initialize providers
       this.providers.set(
         'polygon',
         new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com')
       );
       this.providers.set(
         'ethereum',
         new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com')
       );
     }

     /**
      * Verify a payment transaction on-chain
      */
     async verifyPayment(params: {
       txHash: string;
       network: 'polygon' | 'ethereum';
       token: 'USDC' | 'USDT';
       expectedAmount: number;
       expectedRecipient: string;
       minConfirmations?: number;
     }): Promise<{
       valid: boolean;
       confirmations: number;
       blockNumber: number;
       sender: string;
       error?: string;
     }> {
       const provider = this.providers.get(params.network);
       if (!provider) {
         throw new AppError(500, 'invalid-network', 'Invalid blockchain network');
       }

       try {
         // Get transaction receipt
         const receipt = await provider.getTransactionReceipt(params.txHash);

         if (!receipt) {
           return { valid: false, confirmations: 0, blockNumber: 0, sender: '', error: 'Transaction not found' };
         }

         // Get current block number to calculate confirmations
         const currentBlock = await provider.getBlockNumber();
         const confirmations = currentBlock - receipt.blockNumber + 1;

         // Check minimum confirmations
         const minConf = params.minConfirmations || 12;
         if (confirmations < minConf) {
           return {
             valid: false,
             confirmations,
             blockNumber: receipt.blockNumber,
             sender: '',
             error: `Insufficient confirmations (${confirmations}/${minConf})`,
           };
         }

         // Parse transfer event from logs
         const tokenAddress = TOKEN_ADDRESSES[params.network][params.token];
         const transferEvent = receipt.logs.find(log => {
           return (
             log.address.toLowerCase() === tokenAddress.toLowerCase() &&
             log.topics[0] === ethers.id('Transfer(address,address,uint256)')
           );
         });

         if (!transferEvent) {
           return {
             valid: false,
             confirmations,
             blockNumber: receipt.blockNumber,
             sender: '',
             error: `No ${params.token} transfer found in transaction`,
           };
         }

         // Decode transfer event
         const recipient = '0x' + transferEvent.topics[2].slice(26); // Remove padding
         const sender = '0x' + transferEvent.topics[1].slice(26);
         const amountHex = transferEvent.data;
         const amountWei = BigInt(amountHex);

         // USDC/USDT use 6 decimals (not 18 like ETH)
         const decimals = 6;
         const amountUsd = Number(amountWei) / Math.pow(10, decimals);

         // Verify recipient matches
         if (recipient.toLowerCase() !== params.expectedRecipient.toLowerCase()) {
           return {
             valid: false,
             confirmations,
             blockNumber: receipt.blockNumber,
             sender,
             error: `Recipient mismatch (expected ${params.expectedRecipient}, got ${recipient})`,
           };
         }

         // Verify amount matches (within 0.01 USD tolerance for rounding)
         const amountDiff = Math.abs(amountUsd - params.expectedAmount);
         if (amountDiff > 0.01) {
           return {
             valid: false,
             confirmations,
             blockNumber: receipt.blockNumber,
             sender,
             error: `Amount mismatch (expected ${params.expectedAmount}, got ${amountUsd})`,
           };
         }

         return {
           valid: true,
           confirmations,
           blockNumber: receipt.blockNumber,
           sender,
         };
       } catch (error) {
         throw new AppError(500, 'blockchain-error', `Failed to verify transaction: ${error.message}`);
       }
     }
   }
   ```

2. **Update PATCH Endpoint** (`apps/api/src/routes/v1/payment-sessions.ts` - in PATCH handler):
   ```typescript
   // When status is being updated to CONFIRMING or COMPLETED, verify on-chain
   if (updates.status === 'CONFIRMING' || updates.status === 'COMPLETED') {
     if (!updates.tx_hash) {
       throw new AppError(400, 'missing-tx-hash', 'Transaction hash required for status update');
     }

     // Verify transaction on blockchain
     const blockchainService = new BlockchainService();
     const verification = await blockchainService.verifyPayment({
       txHash: updates.tx_hash,
       network: existingSession.network as 'polygon' | 'ethereum',
       token: existingSession.token as 'USDC' | 'USDT',
       expectedAmount: Number(existingSession.amount),
       expectedRecipient: existingSession.merchantAddress,
       minConfirmations: updates.status === 'COMPLETED' ? 12 : 1,
     });

     if (!verification.valid) {
       throw new AppError(400, 'invalid-transaction', verification.error || 'Transaction verification failed');
     }

     // Add verified data to updates
     sanitizedUpdates.blockNumber = verification.blockNumber;
     sanitizedUpdates.confirmations = verification.confirmations;
     sanitizedUpdates.customerAddress = verification.sender;
   }
   ```

3. **Add Environment Variables** (`.env.example`):
   ```
   POLYGON_RPC_URL=https://polygon-rpc.com
   ETHEREUM_RPC_URL=https://eth.llamarpc.com
   ```

**Files to Create/Modify**:
- `apps/api/src/services/blockchain.service.ts` (new file)
- `apps/api/src/routes/v1/payment-sessions.ts` (add verification to PATCH)
- `apps/api/package.json` (add dependency: `"ethers": "^6.0.0"`)
- `.env.example` (add RPC URLs)

**Testing**:
- Unit test: Mock blockchain verification responses
- Integration test: Test with real testnet transactions
- Security test: Attempt fraud scenarios above

**Dependencies**: Depends on CRIT-03 (PATCH endpoint must exist first)
**Priority**: P1 - Critical for production, acceptable risk for prototype

---

### MEDIUM-RISK QUALITY

#### MED-01: Unbounded Metadata Field

**Status**: CONFIRMED
**Severity**: MEDIUM
**Impact**: DoS via large payloads, database bloat
**CVSS**: 5.3 (Medium)
**CWE**: CWE-400 (Uncontrolled Resource Consumption)

**Evidence**:
- **File**: `products/stablecoin-gateway/apps/api/src/utils/validation.ts`
- **Lines**: 37-49 (createPaymentSessionSchema)
- **Code**:
  ```typescript
  export const createPaymentSessionSchema = z.object({
    // ...
    metadata: z.record(z.unknown()).optional(),  // ⚠️ NO SIZE LIMIT
  });
  ```

- **Database Schema**: `products/stablecoin-gateway/apps/api/prisma/schema.prisma:84`
  ```prisma
  metadata Json?  // No size constraint
  ```

**Root Cause**:
The `metadata` field accepts any JSON object with no size limits. An attacker can send a massive payload (e.g., 100MB JSON) causing:
- Request processing slowdown
- Memory exhaustion
- Database bloat
- DoS of the API server

**Attack Scenario**:
1. Attacker creates payment session with huge metadata:
   ```json
   {
     "amount": 100,
     "metadata": {
       "key1": "A".repeat(10000000),  // 10MB string
       "key2": "B".repeat(10000000),  // 10MB string
       "key3": "C".repeat(10000000),  // 10MB string
       ...  // 100 keys = 1GB payload
     }
   }
   ```
2. Server tries to parse and validate JSON → Memory exhausted
3. Server crashes or becomes unresponsive
4. Legitimate users cannot use service (DoS)

**Current Limits**: NONE
**Industry Standards**:
- Stripe: 50 keys, 500 characters per value
- Square: 25 keys, 255 characters per value

**Fix Strategy**:

Add validation to limit:
1. Number of metadata keys (max 50)
2. Length of string values (max 500 characters)
3. Total JSON size (max 16KB)
4. Nesting depth (max 3 levels)

**Recommended Fix**:

1. **Add Metadata Validation** (`apps/api/src/utils/validation.ts:37-49`):
   ```typescript
   const metadataValueSchema = z.union([
     z.string().max(500, 'Metadata string values must be <= 500 characters'),
     z.number(),
     z.boolean(),
     z.null(),
   ]);

   const metadataSchema = z
     .record(metadataValueSchema)
     .optional()
     .refine(
       (data) => {
         if (!data) return true;
         const keys = Object.keys(data);
         return keys.length <= 50;
       },
       { message: 'Metadata cannot have more than 50 keys' }
     )
     .refine(
       (data) => {
         if (!data) return true;
         const jsonSize = JSON.stringify(data).length;
         return jsonSize <= 16384; // 16KB
       },
       { message: 'Metadata size cannot exceed 16KB' }
     );

   export const createPaymentSessionSchema = z.object({
     amount: z
       .number()
       .min(1, 'Amount must be at least 1 USD')
       .max(10000, 'Amount cannot exceed 10,000 USD'),
     currency: z.enum(['USD']).default('USD'),
     description: z.string().max(500).optional(),
     network: z.enum(['polygon', 'ethereum']).default('polygon'),
     token: z.enum(['USDC', 'USDT']).default('USDC'),
     merchant_address: ethereumAddressSchema,
     success_url: z.string().url().optional(),
     cancel_url: z.string().url().optional(),
     metadata: metadataSchema,
   });
   ```

2. **Add Global Request Size Limit** (`apps/api/src/app.ts` - add to buildApp):
   ```typescript
   await fastify.register(require('@fastify/sensible'));

   // Limit request body size to 1MB
   fastify.addHook('onRequest', async (request, reply) => {
     const contentLength = request.headers['content-length'];
     if (contentLength && parseInt(contentLength) > 1048576) { // 1MB
       throw new AppError(413, 'payload-too-large', 'Request body exceeds 1MB limit');
     }
   });
   ```

**Files to Modify**:
- `apps/api/src/utils/validation.ts` (add metadata validation)
- `apps/api/src/app.ts` (add request size limit)

**Testing**:
- Unit test: Send metadata with 51 keys → Verify 400 error
- Unit test: Send metadata with 600-char value → Verify 400 error
- Unit test: Send 20KB metadata → Verify 400 error
- Unit test: Valid metadata (50 keys, 500 chars each) → Verify success

**Dependencies**: None (can be fixed independently)
**Priority**: P2 - Medium severity, easy fix

---

#### MED-02: Duplicated Address Validation Logic

**Status**: CONFIRMED
**Severity**: MEDIUM
**Impact**: Code maintainability, inconsistent validation
**CVSS**: 4.0 (Medium)
**CWE**: CWE-1041 (Use of Redundant Code)

**Evidence**:

**Location 1** - PaymentService:
- **File**: `products/stablecoin-gateway/apps/api/src/services/payment.service.ts`
- **Lines**: 12-15
- **Code**:
  ```typescript
  if (!data.merchant_address.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new AppError(400, 'invalid-address', 'Invalid merchant wallet address');
  }
  ```

**Location 2** - Validation Schema:
- **File**: `products/stablecoin-gateway/apps/api/src/utils/validation.ts`
- **Lines**: 6-17
- **Code**:
  ```typescript
  export const ethereumAddressSchema = z
    .string()
    .refine((addr) => addr.startsWith('0x'), {
      message: 'Ethereum address must start with 0x',
    })
    .refine((addr) => isAddress(addr), {
      message: 'Invalid Ethereum address format',
    })
    .refine((addr) => addr !== '0x0000000000000000000000000000000000000000', {
      message: 'Zero address is not allowed',
    })
    .transform((addr) => getAddress(addr)); // Convert to checksummed address
  ```

**Root Cause**:
Address validation is implemented in two places with different logic:
1. PaymentService uses regex: `/^0x[a-fA-F0-9]{40}$/`
2. Validation schema uses ethers.js: `isAddress(addr)` + checksum conversion

**Issues**:
1. **Inconsistency**: Different validation rules in different places
2. **Duplication**: Same logic exists twice (DRY violation)
3. **Bypass**: Validation schema is more robust (checks checksum, zero address), but PaymentService validates first and could accept invalid addresses
4. **Maintenance**: Future changes require updating two locations

**Example Bypass**:
```javascript
// This would pass PaymentService validation but fail ethers.js:
merchant_address: "0x0000000000000000000000000000000000000000" // Zero address
```

**Fix Strategy**:

Remove redundant validation from PaymentService. Rely entirely on the validation schema which runs before the service is called.

**Recommended Fix**:

1. **Remove Duplicate Validation** (`apps/api/src/services/payment.service.ts:12-15`):
   ```typescript
   async createPaymentSession(
     userId: string,
     data: CreatePaymentSessionRequest
   ): Promise<PaymentSession> {
     // REMOVE THIS:
     // if (!data.merchant_address.match(/^0x[a-fA-F0-9]{40}$/)) {
     //   throw new AppError(400, 'invalid-address', 'Invalid merchant wallet address');
     // }

     // Validation already done by createPaymentSessionSchema in route handler

     const id = generatePaymentSessionId();
     const expiresAt = new Date();
     expiresAt.setDate(expiresAt.getDate() + 7);

     const paymentSession = await this.prisma.paymentSession.create({
       data: {
         id,
         userId,
         amount: data.amount,
         currency: data.currency || 'USD',
         description: data.description,
         network: data.network || 'polygon',
         token: data.token || 'USDC',
         merchantAddress: data.merchant_address,
         successUrl: data.success_url,
         cancelUrl: data.cancel_url,
         metadata: data.metadata as any,
         expiresAt,
         status: 'PENDING',
       },
     });

     return paymentSession;
   }
   ```

2. **Add Comment Explaining Why** (for future developers):
   ```typescript
   /**
    * Create a new payment session
    *
    * @param userId - User creating the payment session
    * @param data - Payment session data (already validated by createPaymentSessionSchema)
    *
    * Note: Input validation is handled by createPaymentSessionSchema in the route handler.
    * This ensures all addresses are checksummed and valid before reaching this service.
    */
   async createPaymentSession(
     userId: string,
     data: CreatePaymentSessionRequest
   ): Promise<PaymentSession> {
     // ...
   }
   ```

**Alternative Fix** (if validation schema is not always used):

If there are code paths that call PaymentService directly without going through the route handler (e.g., background jobs), then keep the validation but delegate to a shared function:

```typescript
// utils/validation.ts
export function validateEthereumAddress(address: string): string {
  try {
    return ethereumAddressSchema.parse(address);
  } catch (error) {
    throw new AppError(400, 'invalid-address', 'Invalid Ethereum address');
  }
}

// services/payment.service.ts
import { validateEthereumAddress } from '../utils/validation.js';

async createPaymentSession(userId: string, data: CreatePaymentSessionRequest): Promise<PaymentSession> {
  const checksummedAddress = validateEthereumAddress(data.merchant_address);

  const paymentSession = await this.prisma.paymentSession.create({
    data: {
      // ...
      merchantAddress: checksummedAddress,
    },
  });

  return paymentSession;
}
```

**Files to Modify**:
- `apps/api/src/services/payment.service.ts` (remove duplicate validation)

**Testing**:
- Unit test: Verify validation still works via schema
- Unit test: Attempt to pass zero address → Verify rejection
- Regression test: All existing tests should still pass

**Dependencies**: None (can be fixed independently)
**Priority**: P2 - Code quality issue, low risk

---

#### MED-03: CORS Single-Origin String

**Status**: CONFIRMED
**Severity**: MEDIUM
**Impact**: Multi-environment deployment issues
**CVSS**: 4.3 (Medium)
**CWE**: CWE-942 (Overly Permissive Cross-Origin Resource Sharing)

**Evidence**:
- **File**: `products/stablecoin-gateway/apps/api/src/app.ts`
- **Lines**: 53-57
- **Code**:
  ```typescript
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3101',
    credentials: true,
  });
  ```

**Root Cause**:
CORS `origin` is configured as a single string. This works for simple deployments but breaks when you need to allow multiple origins:
- Development: `http://localhost:3101`
- Staging: `https://staging.gateway.io`
- Production: `https://gateway.io`
- Mobile app: `capacitor://localhost`

**Current Behavior**:
- Environment variable `FRONTEND_URL` must be a single URL
- Cannot support multiple frontends simultaneously
- Cannot support dynamic subdomains (e.g., `https://*.gateway.io`)

**Attack Scenario** (Low Severity):
If `origin: '*'` is used to fix the multi-origin problem, it would allow:
1. Attacker hosts malicious site at `https://evil.com`
2. Attacker's JavaScript sends authenticated requests to API
3. User's cookies/credentials are sent (due to `credentials: true`)
4. Attacker can perform actions on behalf of user

**Industry Standard**:
- Use origin validation function
- Whitelist specific origins
- Support environment-based configuration

**Fix Strategy**:

Change CORS to accept an array of allowed origins or a validation function.

**Recommended Fix**:

1. **Update CORS Configuration** (`apps/api/src/app.ts:53-57`):
   ```typescript
   // Parse allowed origins from environment variable
   const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3101')
     .split(',')
     .map(origin => origin.trim());

   await fastify.register(cors, {
     origin: (origin, callback) => {
       // Allow requests with no origin (e.g., mobile apps, Postman)
       if (!origin) {
         callback(null, true);
         return;
       }

       // Check if origin is in whitelist
       if (allowedOrigins.includes(origin)) {
         callback(null, true);
         return;
       }

       // Reject origin
       callback(new Error('Not allowed by CORS'), false);
     },
     credentials: true,
   });
   ```

2. **Update Environment Variables** (`.env.example`):
   ```
   # Comma-separated list of allowed origins
   ALLOWED_ORIGINS=http://localhost:3101,http://localhost:3102,https://gateway.io,https://staging.gateway.io
   ```

3. **Add Documentation** (`README.md`):
   ```markdown
   ## CORS Configuration

   The API uses a whitelist-based CORS policy. Allowed origins are configured via the `ALLOWED_ORIGINS` environment variable:

   ```bash
   # Development (multiple local ports)
   ALLOWED_ORIGINS=http://localhost:3101,http://localhost:3102

   # Production (multiple domains)
   ALLOWED_ORIGINS=https://gateway.io,https://www.gateway.io,https://app.gateway.io
   ```

   **Important**: Never use `origin: '*'` with `credentials: true` as it would allow any website to make authenticated requests on behalf of users.
   ```

**Alternative Fix** (Wildcard Subdomain Support):

If you need to support `*.gateway.io`:

```typescript
await fastify.register(cors, {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    // Allow localhost for development
    if (origin.startsWith('http://localhost:')) {
      callback(null, true);
      return;
    }

    // Allow production domains (exact match)
    const allowedDomains = ['gateway.io', 'www.gateway.io'];
    const originHostname = new URL(origin).hostname;

    if (allowedDomains.includes(originHostname)) {
      callback(null, true);
      return;
    }

    // Allow wildcard subdomains (*.gateway.io)
    if (originHostname.endsWith('.gateway.io')) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
});
```

**Files to Modify**:
- `apps/api/src/app.ts` (change CORS config to use validation function)
- `.env.example` (add ALLOWED_ORIGINS example)
- `README.md` (document CORS configuration)

**Testing**:
- Unit test: Request from allowed origin → Verify CORS headers present
- Unit test: Request from disallowed origin → Verify rejection
- Integration test: Test with multiple origins in ALLOWED_ORIGINS

**Dependencies**: None (can be fixed independently)
**Priority**: P2 - Will cause issues in multi-environment deployments

---

## Fix Dependencies & Order

```
INDEPENDENT (can be done in parallel):
├─ CRIT-01: Frontend auth headers
├─ CRIT-03: PATCH endpoint
├─ CRIT-04: Port mismatch
├─ HIGH-01: API key permissions
├─ HIGH-02: Webhook signature
├─ MED-01: Metadata limits
├─ MED-02: Address validation
└─ MED-03: CORS config

DEPENDENT (must wait for previous):
├─ CRIT-02: SSE auth (depends on CRIT-01 for TokenManager)
└─ HIGH-03: Blockchain verification (depends on CRIT-03 for PATCH endpoint)
```

**Recommended Fix Order**:

**Sprint 1: Critical Blockers (4-6 hours)**
1. CRIT-04: Port mismatch (15 min) ⚡ Quick win
2. CRIT-01: Frontend auth headers (1.5 hours)
3. CRIT-03: PATCH endpoint (1.5 hours)
4. CRIT-02: SSE authentication (1 hour)

**Sprint 2: High-Risk Security (3-4 hours)**
5. HIGH-01: API key permissions (1.5 hours)
6. HIGH-02: Webhook signature (1 hour)
7. HIGH-03: Blockchain verification (2 hours) ⚠️ Optional for prototype

**Sprint 3: Quality Improvements (1-2 hours)**
8. MED-01: Metadata limits (30 min)
9. MED-02: Address validation (15 min)
10. MED-03: CORS config (30 min)

---

## Testing Plan

### Unit Tests

**CRIT-01**: Frontend Auth Headers
- [ ] Token injected when present in localStorage
- [ ] No token header when localStorage empty
- [ ] Token cleared on logout

**CRIT-02**: SSE Authentication
- [ ] Token extracted from query parameter
- [ ] Invalid token rejected
- [ ] Missing token rejected
- [ ] Valid token allows connection

**CRIT-03**: PATCH Endpoint
- [ ] Ownership check prevents unauthorized updates
- [ ] Field whitelist prevents critical field updates
- [ ] Validation schema rejects invalid data
- [ ] Successful update returns updated session

**HIGH-01**: API Key Permissions
- [ ] Read-only key cannot POST/PATCH
- [ ] Write key can POST/PATCH
- [ ] No-refund key cannot create refunds
- [ ] JWT user has all permissions

**HIGH-02**: Webhook Signatures
- [ ] Constant-time comparison prevents timing attacks
- [ ] Invalid signature rejected
- [ ] Valid signature accepted
- [ ] Timestamp validation works

**HIGH-03**: Blockchain Verification
- [ ] Fake tx hash rejected
- [ ] Wrong amount rejected
- [ ] Wrong token rejected
- [ ] Wrong recipient rejected
- [ ] Valid transaction accepted

### Integration Tests

**Auth Flow**:
- [ ] Login → Store token → Create payment session → Success

**Payment Flow**:
- [ ] Create session → Submit tx → PATCH with tx_hash → Blockchain verify → Status updated

**SSE Flow**:
- [ ] Open event stream → Receive updates → Connection stays alive

### E2E Tests (Playwright)

**Happy Path**:
1. User signs up
2. User creates payment session
3. Customer connects wallet (mock)
4. Customer submits transaction
5. Backend verifies transaction
6. Payment marked as complete
7. Merchant receives webhook

**Security Tests**:
1. Attempt to update payment with wrong user → 403
2. Attempt to use API key with insufficient permissions → 403
3. Attempt to submit fake transaction → 400
4. Attempt to replay webhook → 400 (timestamp expired)

---

## Deployment Checklist

Before deploying fixes to production:

- [ ] All 10 issues fixed and tested
- [ ] Unit test coverage ≥ 80%
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing in staging environment
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured

---

## Risk Assessment

**Pre-Fix Risk Level**: CRITICAL
**Post-Fix Risk Level**: LOW (if all fixes implemented)

**Residual Risks** (acceptable for prototype):
- Blockchain verification uses centralized RPC (not decentralized)
- JWT in query parameter for SSE (appears in logs)
- No rate limiting per user (global rate limiting only)

**Production Readiness**:
- ❌ Current state: NOT PRODUCTION READY
- ✅ After Sprint 1: PROTOTYPE READY (internal testing)
- ✅ After Sprint 2: BETA READY (limited external users)
- ✅ After Sprint 3: PRODUCTION READY (public launch)

---

## Appendix: Code References

### File Inventory

**Frontend Files**:
- `apps/web/src/lib/api-client.ts` - API client (CRIT-01, CRIT-02, CRIT-03, CRIT-04)
- `apps/web/src/lib/auth.ts` - NEW: Token manager (CRIT-01)
- `apps/web/src/pages/LoginPage.tsx` - Login flow (CRIT-01)
- `apps/web/src/pages/SignupPage.tsx` - Signup flow (CRIT-01)

**Backend Files**:
- `apps/api/src/index.ts` - Server entry point (CRIT-04)
- `apps/api/src/app.ts` - App configuration (MED-01, MED-03)
- `apps/api/src/routes/v1/payment-sessions.ts` - Payment routes (CRIT-02, CRIT-03, HIGH-01, HIGH-03)
- `apps/api/src/plugins/auth.ts` - Authentication (HIGH-01)
- `apps/api/src/services/payment.service.ts` - Payment logic (MED-02)
- `apps/api/src/services/webhook.service.ts` - Webhook logic (HIGH-02)
- `apps/api/src/services/blockchain.service.ts` - NEW: Blockchain verification (HIGH-03)
- `apps/api/src/utils/crypto.ts` - Crypto utilities (HIGH-02)
- `apps/api/src/utils/validation.ts` - Validation schemas (MED-01, MED-02)
- `apps/api/prisma/schema.prisma` - Database schema (HIGH-01)

### Total Changes Estimate

- **Files Modified**: 12
- **Files Created**: 2
- **Lines Added**: ~800
- **Lines Removed**: ~50
- **Test Files**: 10+

---

**Next Steps**:
1. CEO approval of fix plan
2. Assign to Backend Engineer (Sprint 1)
3. Assign to Security Engineer (Sprint 2 review)
4. QA Engineer validates all fixes
5. Merge to main after all tests pass

---

**Report Prepared By**: Security Engineer
**Date**: 2026-01-29
**Status**: Ready for Implementation
