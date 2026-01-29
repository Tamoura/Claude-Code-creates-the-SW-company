# Changelog

All notable changes to the Stablecoin Gateway project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased] - Security Audit Phase 2

**Date**: 2026-01-29
**Branch**: `fix/stablecoin-gateway/security-audit-phase2`
**Audit Status**: All 10 issues resolved and verified (155+ dedicated tests passing)

### Security

- **FIX-01**: Added Bearer token authentication to `/internal/metrics` endpoint using `INTERNAL_API_KEY` environment variable. Production requires the key; development allows open access when unset. (CRIT-PHASE2-01)
- **FIX-02**: Removed SSE tokens from URL query strings to prevent log leakage. Tokens are now sent via `Authorization: Bearer` header using `event-source-polyfill`. Query-string tokens return 401. (CRIT-PHASE2-02)
- **FIX-03**: Gated mock wallet code behind dual condition (`VITE_USE_MOCK=true` AND `import.meta.env.DEV=true`). Production builds throw on any mock wallet access. (CRIT-PHASE2-03)
- **FIX-04**: Hardened JWT token management. Tokens stored via `TokenManager` with automatic clear on 401 responses. All API methods include `Authorization` header. (HIGH-PHASE2-01)
- **FIX-05**: Unified encryption key validation. Both `encryption.ts` and `env-validator.ts` now require exactly 64 hexadecimal characters for `WEBHOOK_ENCRYPTION_KEY`. Legacy 32-character keys are rejected. (HIGH-PHASE2-02)
- **FIX-06**: Added payment session expiration state machine. `PENDING` sessions transition to `FAILED` on expiry. Terminal states (`FAILED`, `REFUNDED`) have no outgoing transitions. (HIGH-PHASE2-03)
- **FIX-07**: Removed hardcoded secrets from `docker-compose.yml`. All secrets use `${VAR:?error}` syntax. Added CI workflow (`security-checks.yml`) that scans for leaked secrets on every push and PR. (HIGH-PHASE2-04)
- **FIX-08**: Added Redis TLS support via `REDIS_TLS`, `REDIS_TLS_REJECT_UNAUTHORIZED`, and `REDIS_PASSWORD` environment variables. Includes exponential backoff retry and reconnect-on-error handling. (MED-PHASE2-01)
- **FIX-09**: Implemented tiered rate limiting. Auth endpoints limited to 5 req/min per IP+User-Agent fingerprint. Health endpoint (`/health`) exempt from rate limiting. Rate limit headers returned on all limited endpoints. (MED-PHASE2-02)
- **FIX-10**: Added refund service failsafe. Production throws if blockchain service is unavailable at startup or refund time. Development/test mode logs warnings and degrades gracefully. (MED-PHASE2-03)

### Added

- `INTERNAL_API_KEY` environment variable for metrics endpoint authentication
- `REDIS_TLS` environment variable to enable TLS on Redis connections
- `REDIS_TLS_REJECT_UNAUTHORIZED` environment variable for self-signed cert handling
- `REDIS_PASSWORD` environment variable for Redis authentication
- `VITE_USE_MOCK` environment variable (frontend) with production-build safety gate
- `security-checks.yml` CI workflow for automated secret scanning
- `SECURITY-AUDIT-PHASE2-PLAN.md` documenting all 10 issues and fix strategies
- `SECURITY-AUDIT-PHASE2-TEST-REPORT.md` with per-fix verification results
- 155+ new security tests across backend and frontend

### Changed

- `docker-compose.yml` now requires `.env` file for all secrets (no hardcoded defaults)
- `.env.example` updated with all new environment variables and generation instructions
- `SECURITY.md` updated to version 2.0 with all Phase 2 controls documented
- `README.md` updated with comprehensive environment variable reference table
- Security score updated from 92/100 to 95/100
- Total test count updated: backend 467 tests, frontend 79 tests

### Fixed

- Encryption key length mismatch between `encryption.ts` (accepted 32+ chars) and `env-validator.ts` (required 64 hex chars) -- both now enforce 64 hex characters
- Sensitive headers no longer logged in unauthorized access attempts (redacted)
- Webhook delivery race conditions prevented with row locking
- Rate limiting now keys by user/API key instead of IP for authenticated requests

---

## [1.0.0] - 2026-01-27

### Added

- Initial release of Stablecoin Gateway
- Payment session creation and management (USDC/USDT on Polygon/Ethereum)
- MetaMask and WalletConnect integration
- Merchant dashboard with real-time payment tracking
- Webhook notifications with HMAC-SHA256 signatures
- JWT authentication with refresh token revocation
- API key system with granular permissions (read, write, refund)
- Server-Sent Events for real-time payment status
- On-chain payment verification
- Rate limiting (100 req/min per API key)
- OWASP security headers via Helmet
- Phase 1 security audit (10 issues resolved, score: 92/100)
