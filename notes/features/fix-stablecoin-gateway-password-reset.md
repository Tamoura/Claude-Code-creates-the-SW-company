# Password Reset Flow - Stablecoin Gateway

## Branch
fix/stablecoin-gateway/security-audit-phase5

## Issue
MEDIUM severity: No password reset functionality exists. Users who
forget passwords have no recovery path.

## Approach
- Redis-backed reset tokens (no Prisma migration needed)
- Key: `reset:<token>` => JSON `{ userId, email, createdAt }`
- TTL: 1 hour
- crypto.randomBytes(32).toString('hex') for token generation
- Same password complexity rules as signup (12+ chars, upper, lower,
  digit, special char)
- Same bcrypt hashing (12 rounds) via existing hashPassword utility

## Key Files
- Auth route: apps/api/src/routes/v1/auth.ts
- Validation: apps/api/src/utils/validation.ts (signupSchema has
  password rules)
- Crypto: apps/api/src/utils/crypto.ts (hashPassword, verifyPassword)
- Redis plugin: apps/api/src/plugins/redis.ts (fastify.redis)

## Design Decisions
- forgot-password always returns 200 to prevent email enumeration
- Token is logged (not emailed) since this is dev/staging
- Token one-time use: deleted from Redis after consumption
- Reuse signupSchema password rules for newPassword validation
