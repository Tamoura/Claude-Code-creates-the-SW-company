# Account Lockout After Failed Logins

## Branch
fix/stablecoin-gateway/security-audit-phase4

## Problem
No tracking of failed login attempts per account. A slow,
distributed brute force attack across many IPs could guess
passwords over time. The existing IP+UA rate limiting does
not protect against credential stuffing across different IPs.

## Solution
Redis-based account lockout keyed by email address (not IP).
- After 5 failed attempts: lock for 15 minutes
- Successful login resets the counter
- Graceful degradation when Redis is unavailable

## Key Design Decisions
- Use Redis (not Prisma/DB) to avoid schema migrations
- Lock key: `lockout:<email>`, fail counter: `failed:<email>`
- 15-minute TTL on both keys
- If Redis is null, allow login with a logged warning

## Files Modified
- apps/api/src/routes/v1/auth.ts (login handler)
- apps/api/tests/routes/v1/account-lockout.test.ts (new)
