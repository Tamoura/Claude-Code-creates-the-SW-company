# Security Decisions & Risk Acceptance

**Product**: Stablecoin Gateway
**Date**: 2026-01-28
**Status**: MVP Launch (Month 1-2)

---

## CRIT-002: Private Key Storage - RESOLVED (KMS-01)

### Decision
**AWS KMS Hot Wallet implemented. Raw private keys no longer stored in environment variables.**

### Rationale
1. **Deferred MVP Strategy**: Initially accepted risk with env var + controls (Month 1-2)
2. **Post-Launch Upgrade**: Implemented AWS KMS at Month 2 (2026-02-27) to transition to HSM-backed signing
3. **Production-Ready**: KMS implementation enables key rotation without downtime and audit logging
4. **Non-Custodial**: Customer funds still go directly to merchant wallets (we never hold)
5. **Compliance**: Satisfies SOC 2 and industry best practices for hot wallet key storage

### Risk Level
**LOW** (was MEDIUM with env vars, now RESOLVED with AWS KMS)

### Implementation Details (Deployed 2026-02-27)

#### 1. AWS KMS Integration
- **Service**: `kms.service.ts` — Core KMS operations (sign, verify, health checks)
- **Provider**: `kms-signer.service.ts` — Wallet provider abstraction for production/dev environments
- **Adapter**: `KMSWalletAdapter` — ethers.js-compatible interface for blockchain operations
- **Key Storage**: AWS KMS (never in application memory)
- **Signing Algorithm**: secp256k1 (Ethereum standard)
- **Network Support**: Polygon, Ethereum, EVM-compatible chains

#### 2. Startup Guard & Safety
- **Cold Start Check**: Verifies KMS key accessibility on application startup
- **AppError Type**: Typed error class with RFC 7807 JSON serialization
- **Production Mode**: Blocks raw env var key usage in production (throws 500)
- **Dev Fallback**: Allows env var key with warning logs in development only
- **Health Check**: Validates KMS connectivity before accepting transactions

#### 3. Structured Audit Logging
- **AuditLog Model**: Records all KMS operations (sign, rotate, health check)
- **Fire-and-Forget**: Audit logging never blocks transaction processing
- **Sensitive Field Redaction**: Key IDs masked in logs (first 8 chars only)
- **Queryable**: Admin API supports filtering by actor, action, timestamp
- **Ring Buffer Fallback**: In-memory 10k-entry fallback if database unavailable

#### 4. Key Rotation Endpoint
- **Endpoint**: `POST /v1/admin/kms/rotate`
- **Auth**: Admin role required
- **Input**: `{ newKeyId: string }`
- **Response**: `{ success: bool, message: string, keyId: string }`
- **Health Check**: Validates new key before returning success
- **No Downtime**: Rotation happens without restart
- **Idempotent**: Safe to retry if network error occurs
- **Error Handling**:
  - 400: Invalid newKeyId (validation error)
  - 401: Unauthenticated or non-admin role
  - 503: New key unhealthy (KMS unavailable or key disabled)

### Migration Path (Completed)

**Phase 1 (MVP - Month 1-2)**:
- ✅ Environment variables with balance limits + monitoring
- ✅ Maximum wallet balance: $100
- ✅ Incident response plan documented

**Phase 2 (Post-Launch - Feb 27, 2026)**:
- ✅ AWS KMS integration complete
- ✅ Key rotation endpoint deployed
- ✅ Audit logging enabled
- ✅ Production startup guard active
- ✅ All tests passing (KMS service, signer provider, rotation endpoint)

### Sign-Off

- [x] **CEO**: Approved KMS implementation (2026-02-27)
- [x] **Security Engineer**: Audit logging and rotation endpoint reviewed
- [x] **Backend Engineer**: KMS service, signer provider, endpoint implemented
- [x] **DevOps Engineer**: AWS KMS key provisioned and health checks configured
- [x] **QA Engineer**: All KMS tests passing (100%)

### Review Date
**Ongoing** - AWS KMS in production, key rotation endpoint available for emergency use

---

## Environment Variable Best Practices

### Storage
```bash
# ❌ NEVER commit to git
.env

# ✅ Use encrypted secret storage
# - GitHub: Repository Secrets (encrypted at rest)
# - Railway: Encrypted environment variables
# - Render: Encrypted environment variables
```

### Access Control
- Limit to 1-2 people maximum
- Use 2FA on all accounts with access
- Audit access logs monthly

### Rotation Procedure
1. Generate new Ethereum wallet
2. Transfer $100 to new wallet
3. Update `HOT_WALLET_PRIVATE_KEY` in production
4. Restart application
5. Verify transactions working
6. Delete old private key from all locations
7. **Total time**: < 10 minutes

### Emergency Contact
If private key compromised, contact CEO immediately:
- **Slack**: @ceo
- **Email**: ceo@connectsw.com
- **Phone**: [REDACTED]

---

**Classification**: INTERNAL - CONFIDENTIAL
**Next Review**: 2026-03-01
