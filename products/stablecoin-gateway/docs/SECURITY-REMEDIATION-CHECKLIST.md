# Security Remediation Checklist

**Project**: Stablecoin Gateway
**Audit Date**: 2026-01-28
**Target Completion**: 2026-02-06 (9 days)

---

## Critical Issues (MUST FIX - 3 issues)

### CRIT-001: Hardcoded JWT Secret Default
- [ ] Remove default value from `apps/api/src/app.ts`
- [ ] Add startup validation for JWT_SECRET
- [ ] Validate secret is at least 32 characters
- [ ] Generate secure production secret (64 bytes recommended)
- [ ] Document secret rotation procedure
- [ ] Test: Verify app fails to start without JWT_SECRET
- [ ] Test: Verify app fails to start with weak JWT_SECRET

**Files to modify**:
- `apps/api/src/app.ts`
- `apps/api/src/index.ts` (add validation)

**Assigned to**: ________________
**Completed**: [ ] Date: ________

---

### CRIT-002: Private Key Storage (Environment Variables)
- [x] Research and select KMS solution (AWS KMS, HashiCorp Vault, or Azure Key Vault)
- [x] Set up KMS in development environment
- [x] Create KMS service wrapper (`src/services/kms.service.ts`)
- [x] Implement transaction signing via KMS
- [x] Remove HOT_WALLET_PRIVATE_KEY from .env
- [x] Update refund service to use KMS (ready for implementation)
- [x] Document KMS setup procedure
- [x] Test: Verify transaction signing works with KMS
- [x] Test: Verify private key is never logged
- [x] Add environment variable validation

**Files created**:
- `apps/api/src/services/kms.service.ts`
- `apps/api/src/utils/env-validator.ts`
- `apps/api/scripts/derive-kms-address.ts`
- `apps/api/src/types/asn1.d.ts`
- `apps/api/docs/KMS-SETUP.md`
- `apps/api/tests/services/kms.service.test.ts`

**Files modified**:
- `.env.example` (removed HOT_WALLET_PRIVATE_KEY, added KMS config)
- `docs/DEPLOYMENT.md` (added comprehensive KMS setup instructions)
- `package.json` (added kms:derive-address and test:kms scripts)
- `src/index.ts` (added environment validation)

**NPM Packages Added**:
- `@aws-sdk/client-kms@^3.975.0`
- `asn1.js@^5.4.1`

**Assigned to**: DevOps Engineer
**Completed**: [x] Date: 2026-01-28

---

### CRIT-003: Missing Webhook Signature Verification
- [ ] Create webhook delivery route (`POST /v1/webhooks/:id/deliver`)
- [ ] Implement signature generation in delivery
- [ ] Add timestamp to webhook payload
- [ ] Implement retry logic with exponential backoff
- [ ] Create webhook worker (BullMQ job)
- [ ] Add webhook delivery status tracking
- [ ] Document webhook verification for merchants
- [ ] Test: Verify signature validation works
- [ ] Test: Verify old webhooks are rejected (>5min)
- [ ] Test: Verify retry logic works

**Files to create**:
- `apps/api/src/routes/v1/webhooks.ts`
- `apps/api/src/services/webhook.service.ts`
- `apps/api/src/workers/webhook-delivery.worker.ts`
- `docs/guides/webhook-verification.md`

**Assigned to**: ________________
**Completed**: [ ] Date: ________

---

## High Issues (MUST FIX - 5 issues)

### HIGH-001: Missing Rate Limiting on Auth Endpoints
- [ ] Add endpoint-specific rate limiting to `/v1/auth/login`
- [ ] Add endpoint-specific rate limiting to `/v1/auth/signup`
- [ ] Add endpoint-specific rate limiting to `/v1/auth/refresh`
- [ ] Configure: 5 requests per 15 minutes per IP
- [ ] Add account-level tracking (by email)
- [ ] Implement temporary account lockout (optional)
- [ ] Test: Verify rate limit blocks after 5 attempts
- [ ] Test: Verify rate limit resets after 15 minutes
- [ ] Test: Verify different IPs have separate limits

**Files to modify**:
- `apps/api/src/routes/v1/auth.ts`

**Assigned to**: ________________
**Completed**: [ ] Date: ________

---

### HIGH-002: No Refresh Token Revocation
- [ ] Add RefreshToken model to Prisma schema
- [ ] Run database migration
- [ ] Update signup to store refresh token
- [ ] Update login to store refresh token
- [ ] Update refresh endpoint to check revocation status
- [ ] Create logout endpoint (DELETE /v1/auth/logout)
- [ ] Create logout all devices endpoint
- [ ] Add token cleanup job (remove expired tokens)
- [ ] Test: Verify logout revokes token
- [ ] Test: Verify revoked token can't be refreshed
- [ ] Test: Verify logout all devices works

**Files to modify**:
- `apps/api/prisma/schema.prisma`
- `apps/api/src/routes/v1/auth.ts`

**Files to create**:
- `apps/api/src/workers/token-cleanup.worker.ts`

**Assigned to**: ________________
**Completed**: [ ] Date: ________

---

### HIGH-003: Missing Security Headers
- [ ] Install @fastify/helmet package
- [ ] Register helmet plugin in app.ts
- [ ] Configure Content-Security-Policy
- [ ] Configure HSTS (max-age: 31536000, includeSubDomains, preload)
- [ ] Configure X-Frame-Options: DENY
- [ ] Configure X-Content-Type-Options: nosniff
- [ ] Configure Referrer-Policy: strict-origin-when-cross-origin
- [ ] Test: Verify all headers present in responses
- [ ] Test: Verify CSP blocks inline scripts

**Files to modify**:
- `apps/api/package.json` (add dependency)
- `apps/api/src/app.ts`

**Assigned to**: ________________
**Completed**: [ ] Date: ________

---

### HIGH-004: Weak Ethereum Address Validation
- [ ] Import isAddress and getAddress from ethers.js
- [ ] Update merchant_address validation in Zod schema
- [ ] Add checksum validation
- [ ] Add transform to return checksummed address
- [ ] Update PaymentService to use checksummed addresses
- [ ] Test: Verify invalid addresses are rejected
- [ ] Test: Verify lowercase addresses are checksummed
- [ ] Test: Verify checksummed addresses are preserved

**Files to modify**:
- `apps/api/src/utils/validation.ts`
- `apps/api/src/services/payment.service.ts`

**Assigned to**: ________________
**Completed**: [ ] Date: ________

---

### HIGH-005: SSE Endpoint Missing Authentication
- [ ] Add authentication middleware to SSE endpoint
- [ ] Verify user ownership of payment session
- [ ] Add error handling for unauthorized access
- [ ] Test: Verify unauthenticated requests are blocked
- [ ] Test: Verify users can only access their own sessions
- [ ] Test: Verify authenticated SSE stream works

**Files to modify**:
- `apps/api/src/routes/v1/payment-sessions.ts` (line 127)

**Assigned to**: ________________
**Completed**: [ ] Date: ________

---

## Medium Issues (SHOULD FIX - 7 issues)

### MED-001: Weak Password Requirements
- [ ] Update password schema to require 12+ characters
- [ ] Add lowercase letter requirement
- [ ] Add special character requirement
- [ ] Add common password check (optional)
- [ ] Update error messages
- [ ] Test: Verify weak passwords are rejected
- [ ] Test: Verify strong passwords are accepted

**Files to modify**:
- `apps/api/src/utils/validation.ts`

**Assigned to**: ________________
**Target**: 30 days

---

### MED-002: CORS Too Permissive
- [ ] Create allowlist of production origins
- [ ] Implement origin validation function
- [ ] Configure allowed methods
- [ ] Configure allowed headers
- [ ] Set maxAge to 86400 (24 hours)
- [ ] Test: Verify allowed origins work
- [ ] Test: Verify disallowed origins are blocked

**Files to modify**:
- `apps/api/src/app.ts`

**Assigned to**: ________________
**Target**: 30 days

---

### MED-003: No Request ID Tracking Across Services
- [ ] Add request ID to all log statements
- [ ] Pass request ID to blockchain RPC calls
- [ ] Pass request ID to webhook deliveries
- [ ] Add request ID to external API calls
- [ ] Consider implementing OpenTelemetry
- [ ] Test: Verify request ID propagates
- [ ] Test: Verify request ID in error logs

**Files to modify**:
- `apps/api/src/utils/logger.ts`
- All service files

**Assigned to**: ________________
**Target**: 30 days

---

### MED-004: Database Connection Logging Risk
- [ ] Review Prisma query logging configuration
- [ ] Ensure DATABASE_URL never logged
- [ ] Add query parameter sanitization
- [ ] Test: Verify sensitive data not in logs
- [ ] Test: Verify connection strings not logged

**Files to modify**:
- `apps/api/src/plugins/prisma.ts`

**Assigned to**: ________________
**Target**: 30 days

---

### MED-005: No API Key Permissions Enforcement
- [ ] Create requirePermission decorator
- [ ] Add permission check to payment session routes
- [ ] Add permission check to refund routes (when implemented)
- [ ] Add permission check to webhook routes (when implemented)
- [ ] Test: Verify read-only keys can't write
- [ ] Test: Verify write keys can't refund
- [ ] Test: Verify refund keys can refund

**Files to create**:
- Permission enforcement logic in `apps/api/src/plugins/auth.ts`

**Files to modify**:
- `apps/api/src/routes/v1/payment-sessions.ts`
- Future refund and webhook routes

**Assigned to**: ________________
**Target**: 30 days

---

### MED-006: Missing Transaction Amount Validation
- [ ] Implement blockchain transaction verification
- [ ] Add amount validation (actual vs expected)
- [ ] Add recipient address validation
- [ ] Add token contract validation
- [ ] Test: Verify underpayments are rejected
- [ ] Test: Verify wrong recipient is rejected

**Files to create**:
- `apps/api/src/services/blockchain-monitor.service.ts`

**Assigned to**: ________________
**Target**: Before blockchain monitoring implementation

---

### MED-007: No Metadata Size Limit
- [ ] Add size limit to metadata field (10KB)
- [ ] Update Zod schema with refine
- [ ] Test: Verify large metadata is rejected
- [ ] Test: Verify normal metadata works

**Files to modify**:
- `apps/api/src/utils/validation.ts`

**Assigned to**: ________________
**Target**: 30 days

---

## Low Issues (NICE TO HAVE - 4 issues)

### LOW-001: Email Case Sensitivity
- [ ] Normalize emails to lowercase on signup
- [ ] Normalize emails to lowercase on login
- [ ] Add trim() to remove whitespace
- [ ] Test: Verify duplicate prevention works

**Target**: 90 days

---

### LOW-002: Missing API Versioning Strategy
- [ ] Document API versioning approach
- [ ] Plan v2 migration path
- [ ] Implement version sunset notifications

**Target**: 90 days

---

### LOW-003: Incomplete Error Messages
- [ ] Add support URL to error responses
- [ ] Ensure request_id in all errors

**Target**: 90 days

---

### LOW-004: No Rate Limit Headers
- [ ] Configure rate limit plugin to add headers
- [ ] Add X-RateLimit-Limit
- [ ] Add X-RateLimit-Remaining
- [ ] Add X-RateLimit-Reset

**Target**: 90 days

---

## Informational (CONSIDER)

### INFO-001: Request Signing for High-Value Operations
- [ ] Research request signing patterns
- [ ] Evaluate need for refund operations
- [ ] Implement if needed

---

### INFO-002: Add Security.txt
- [ ] Create .well-known/security.txt
- [ ] Add security contact email
- [ ] Add expiration date
- [ ] Deploy to production

---

### INFO-003: Bug Bounty Program
- [ ] Research bug bounty platforms (HackerOne, Bugcrowd)
- [ ] Define scope and rewards
- [ ] Launch program post-production

---

## Testing Checklist

### Security Regression Tests
- [ ] Authentication bypass attempts
- [ ] SQL injection attempts (should fail with Prisma)
- [ ] XSS attempts in metadata fields
- [ ] Rate limiting behavior
- [ ] Token revocation behavior
- [ ] JWT expiration behavior
- [ ] CORS policy enforcement
- [ ] Security headers presence
- [ ] Ethereum address validation
- [ ] SSE authentication

### Load Testing (Security Focus)
- [ ] Rate limiting under load
- [ ] Authentication endpoint performance
- [ ] DoS resistance (large payloads)
- [ ] Concurrent request handling

### Penetration Testing
- [ ] External pentest scheduled: [ ] Date: ________
- [ ] OWASP ZAP scan completed: [ ] Date: ________
- [ ] Manual security testing: [ ] Date: ________

---

## Deployment Checklist

### Pre-Production
- [ ] All CRITICAL issues resolved
- [ ] All HIGH issues resolved
- [ ] Security headers verified in staging
- [ ] Rate limiting tested in staging
- [ ] JWT secret rotated to strong value
- [ ] KMS configured and tested
- [ ] Environment variables secured
- [ ] CORS restricted to production domains
- [ ] npm audit run and vulnerabilities addressed
- [ ] Security regression tests passing

### Production Launch
- [ ] Monitoring configured (Datadog/equivalent)
- [ ] Security alerts configured
- [ ] Incident response runbook created
- [ ] Escalation procedures documented
- [ ] Security.txt file deployed
- [ ] Final security sign-off obtained

### Post-Launch (First Week)
- [ ] Monitor failed authentication attempts
- [ ] Monitor rate limit violations
- [ ] Monitor error rates
- [ ] Review security logs daily
- [ ] Verify all security controls working

### Post-Launch (30 days)
- [ ] Review security metrics
- [ ] Address any new issues found
- [ ] Complete MEDIUM priority fixes
- [ ] Schedule next security review

---

## Sign-Off

### Issue Resolution
- [ ] All CRITICAL issues resolved - Security Engineer: _____________ Date: _______
- [ ] All HIGH issues resolved - Security Engineer: _____________ Date: _______
- [ ] Security tests passing - QA Engineer: _____________ Date: _______

### Production Approval
- [ ] Security Engineer approval: _____________ Date: _______
- [ ] Backend Engineer approval: _____________ Date: _______
- [ ] QA Engineer approval: _____________ Date: _______
- [ ] CEO approval: _____________ Date: _______

---

## Progress Tracking

**Started**: _________________
**Target Completion**: 2026-02-06
**Actual Completion**: _________________

### Weekly Status Updates

**Week 1 (2026-01-28 to 2026-02-03)**:
- CRITICAL issues: __/3 completed
- HIGH issues: __/5 completed
- Blockers: _________________

**Week 2 (2026-02-04 to 2026-02-06)**:
- Remaining issues: __/__ completed
- Testing status: _________________
- Production readiness: _________________

---

**Classification**: CONFIDENTIAL - INTERNAL USE ONLY
**Version**: 1.0
**Last Updated**: 2026-01-28
