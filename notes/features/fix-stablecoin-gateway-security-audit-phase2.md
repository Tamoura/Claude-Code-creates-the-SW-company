# FIX-PHASE2-01: Secure Internal Metrics Endpoint

## Problem
The `/internal/metrics` endpoint in the stablecoin-gateway had no
authentication. Anyone could access internal metrics revealing request
patterns, error rates, and system performance data.

## Solution
Added Bearer token authentication using `INTERNAL_API_KEY` env var:
- When `INTERNAL_API_KEY` is set: requires `Authorization: Bearer <key>`
- When not set in production: returns 500 error
- When not set in development: allows access for convenience

## Files Modified
- `products/stablecoin-gateway/apps/api/src/plugins/observability.ts`
  - Added auth check before metrics response
- `products/stablecoin-gateway/apps/api/tests/plugins/observability-auth.test.ts`
  - 8 test cases covering auth enforcement
- `products/stablecoin-gateway/.env.example`
  - Updated INTERNAL_API_KEY section with production guidance

## Test Coverage
- 401 when no Authorization header
- 401 when missing Bearer prefix
- 401 when invalid token
- 401 when empty Bearer token
- 200 with valid Bearer token
- 401 for case-sensitive token mismatch
- Production configuration documented
- Development mode allows access without key

---

# FIX-PHASE2-03: Remove Mock Wallet Code from Production

## Problem
Mock wallet and transaction code existed in the production bundle with
hardcoded addresses. The `MockWallet` class with address
`0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` and simulated transaction
logic were unconditionally included in production builds.

## Solution
Gated all mock code behind `VITE_USE_MOCK` environment variable:

1. **wallet.ts**: Refactored to use `WalletProvider` interface with
   `getWallet()` factory function. Mock wallet only accessible when
   `VITE_USE_MOCK=true` AND in dev mode. Production throws errors if
   mock is accidentally accessed.

2. **transactions.ts**: Gated `simulateTransaction` behind env checks.
   Added `processTransaction()` which auto-selects mock vs real based
   on environment. Production throws if simulation is called directly.

3. **vite.config.ts**: Added `define` block to set
   `VITE_USE_MOCK` to `'false'` by default. Enables tree-shaking of
   mock code paths in production builds.

4. **vitest.config.ts**: Added `define` block to set
   `VITE_USE_MOCK=true`, `DEV=true`, `PROD=false` for test environment.

5. **.env.example**: Added `VITE_USE_MOCK=false` with documentation
   that it must be false in production.

## Files Modified
- `products/stablecoin-gateway/apps/web/src/lib/wallet.ts`
  - WalletProvider interface, MockWallet gated, RealWalletProvider stub
  - getWallet(), isMockMode(), isProductionMode() exports
  - Legacy mockWallet proxy with production safety checks
- `products/stablecoin-gateway/apps/web/src/lib/transactions.ts`
  - simulateTransaction gated behind VITE_USE_MOCK + DEV check
  - processRealTransaction for production use
  - processTransaction auto-routing function
- `products/stablecoin-gateway/apps/web/vite.config.ts`
  - define block for VITE_USE_MOCK default
  - production build optimizations
- `products/stablecoin-gateway/apps/web/vitest.config.ts`
  - define block for test environment mock config
- `products/stablecoin-gateway/apps/web/src/test/setup.ts`
  - Updated docs for environment configuration
- `products/stablecoin-gateway/apps/web/src/lib/wallet.test.ts`
  - 14 tests: legacy mock, getWallet, isMockMode, reset, interface
- `products/stablecoin-gateway/apps/web/src/lib/transactions.test.ts`
  - 6 tests: simulation, mock gating, processTransaction
- `products/stablecoin-gateway/apps/web/.env.example`
  - Added VITE_USE_MOCK=false with documentation

## Test Coverage (28 passing)
- Legacy mockWallet backward compatibility (6 tests)
- getWallet returns proper interface and mock in dev (2 tests)
- isMockMode returns true in mock-enabled dev env (1 test)
- isProductionMode returns false in test env (1 test)
- resetWallet resets state properly (1 test)
- WalletProvider error handling (3 tests)
- simulateTransaction updates payment lifecycle (2 tests)
- isMockTransactionMode in test env (1 test)
- processTransaction routes to simulation in mock mode (1 test)
- Mock gating verification (2 tests)

---

# FIX-PHASE2-09: Enhance Rate Limiting for Pre-Auth Endpoints

## Problem
Rate limiting fell back to IP-only for pre-auth endpoints, allowing
bypass via IP rotation. Health/ready endpoints were unnecessarily
rate limited, which could cause issues with load balancers and
monitoring.

## Solution
Enhanced rate limiting with three key changes:

1. **Health endpoint exemption**: `/health` and `/ready` endpoints
   are now exempted from rate limiting via `allowList`. Load balancers
   and monitoring can poll freely. Exempt responses do not include
   rate limit headers (`addHeadersOnExemption: false`).

2. **IP+User-Agent fingerprinting for auth endpoints**: The auth
   route-level rate limiter now uses `auth:${IP}:${UA.substring(0,50)}`
   as the rate limit key instead of IP alone. This makes it harder
   to bypass rate limiting by rotating IPs while using the same
   client, and prevents legitimate shared-IP scenarios from being
   unfairly throttled.

3. **Rate limit headers on all responses**: Non-exempt responses now
   include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and
   `X-RateLimit-Reset` headers.

## Files Modified
- `products/stablecoin-gateway/apps/api/src/app.ts`
  - Added `allowList` for health/ready endpoints
  - Added `addHeadersOnExemption: false`
  - Added `addHeaders` config for x-ratelimit-* headers
  - Added `FastifyRequest` import
- `products/stablecoin-gateway/apps/api/src/routes/v1/auth.ts`
  - Added `keyGenerator` to auth rate limit config
  - Uses IP + truncated User-Agent (50 chars) fingerprint
  - Added `FastifyRequest` import
- `products/stablecoin-gateway/apps/api/tests/integration/rate-limiting-enhanced.test.ts`
  - 8 new tests for enhanced rate limiting behavior
- `products/stablecoin-gateway/apps/api/tests/integration/rate-limit.test.ts`
  - Updated to account for health endpoint exemption
- `products/stablecoin-gateway/apps/api/tests/routes/auth-rate-limit.test.ts`
  - Updated with unique User-Agent for test isolation
- `products/stablecoin-gateway/apps/api/tests/routes/auth-rate-limit-isolated.test.ts`
  - Updated with unique User-Agent for test isolation
- `products/stablecoin-gateway/apps/api/tests/integration/auth.test.ts`
  - Updated with unique User-Agent for test isolation
- `products/stablecoin-gateway/apps/api/tests/integration/sse-auth.test.ts`
  - Updated with unique User-Agent for test isolation

## Test Coverage (8 new tests)
- Health endpoint not rate limited after 150 requests
- Health endpoint has no rate limit headers
- IP+UA fingerprint: same UA rate limited, different UA is not
- Auth endpoints include rate limit headers
- 429 returned with Retry-After when limit exceeded
- Long User-Agent truncated to 50 chars
- Missing User-Agent handled gracefully (uses 'unknown')
- Authenticated endpoints include rate limit headers (limit >= 100)
