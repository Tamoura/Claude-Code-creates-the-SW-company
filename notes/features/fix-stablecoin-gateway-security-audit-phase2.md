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
