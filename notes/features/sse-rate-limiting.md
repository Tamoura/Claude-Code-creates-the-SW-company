# SSE Rate Limiting Feature

## Problem
The SSE endpoint `GET /v1/payment-sessions/:id/events` has no rate limiting.
An attacker with a valid token can open thousands of concurrent SSE connections,
exhausting server resources (connection exhaustion DoS).

## Solution
Add per-user rate limiting (10 connections/minute) to the SSE endpoint.
Since SSE connections are long-lived, we limit connection creation rate,
not ongoing connections.

## Key Decisions
- Rate limit key: `sse:{userId}` from JWT token, falling back to `sse:{ip}`
- Max: 10 connections per minute per user
- Uses existing `@fastify/rate-limit` per-route config pattern (same as auth routes)

## Files Changed
- `products/stablecoin-gateway/apps/api/src/routes/v1/payment-sessions.ts` - Added rate limit config to SSE route
- `products/stablecoin-gateway/apps/api/tests/routes/sse-rate-limit.test.ts` - Test file

## Branch
`fix/stablecoin-gateway/audit-critical-fixes`
