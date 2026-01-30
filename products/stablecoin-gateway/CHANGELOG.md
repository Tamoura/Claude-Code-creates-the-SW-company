# Changelog

All notable changes to the Stablecoin Gateway project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased] - Security Audit Phase 4

**Date**: 2026-01-30
**Branch**: `fix/stablecoin-gateway/security-audit-phase4`
**Audit Status**: 7 new issues resolved (4 previously fixed), 40 dedicated Phase 4 tests passing

### Security

- **FIX-01**: Removed payment amount tolerance that allowed $0.01 underpayment. Now requires exact or overpayment only (`amountUsd >= paymentSession.amount`). (CRIT-PHASE4-01)
- **FIX-02**: Fixed wallet network caching bug. Replaced single cached wallet with per-network `Map<string, Wallet>` so Polygon and Ethereum use separate wallet instances. (CRIT-PHASE4-02)
- **FIX-03**: Added `RefundProcessingWorker` that auto-processes PENDING refunds every 30 seconds (batch of 10, fault-tolerant per-refund error handling). (CRIT-PHASE4-03)
- **FIX-05**: Fixed KMS address derivation bug (`publicKey.slice(2)` → `slice(4)` to strip `04` uncompressed point prefix). Added documentation clarifying `MessageType: 'DIGEST'` usage with Keccak-256. (HIGH-PHASE4-05)
- **FIX-06**: Enforced webhook secret encryption in production. `NODE_ENV=production` without `WEBHOOK_ENCRYPTION_KEY` now throws 500 error. Dev/test still allows plaintext. (HIGH-PHASE4-06)
- **FIX-08**: Added SSE token re-validation on every heartbeat (30s). Expired tokens close the connection. Added 30-minute maximum connection timeout with double-close guard. (MED-PHASE4-08)
- **FIX-10**: Added Redis-based account lockout. 5 failed login attempts locks account for 15 minutes. Successful login resets counter. Graceful degradation when Redis unavailable. (MED-PHASE4-10)

### Added

- `RefundProcessingWorker` in `workers/refund-processing.worker.ts`
- Account lockout via Redis (`lockout:<email>`, `failed:<email>` keys)
- SSE connection maximum timeout (30 minutes)
- SSE heartbeat token re-validation
- 40 new Phase 4 security tests across 7 test suites

### Changed

- `blockchain-monitor.service.ts` rejects underpayment (exact or overpay only)
- `blockchain-transaction.service.ts` uses `Map<string, Wallet>` for per-network caching
- `kms.service.ts` correctly strips `04` prefix in `getAddress()`
- `webhooks.ts` throws in production without encryption key
- `payment-sessions.ts` SSE endpoint re-validates JWT on each heartbeat
- `auth.ts` tracks failed logins and locks accounts via Redis
- Security score updated from 98/100 to 99/100

### Fixed

- Payment fraud via systematic $0.01 underpayment
- Wrong-network wallet used for cross-chain refunds
- Refunds stuck in PENDING state forever
- KMS Ethereum address derivation with uncompressed public key
- Webhook secrets stored in plaintext in production
- SSE connections persisting after JWT expiry
- Brute force password attacks via slow distributed attempts

---

## [1.2.0] - Security Audit Phase 3

**Date**: 2026-01-30
**Branch**: `fix/stablecoin-gateway/security-audit-phase3`
**Audit Status**: 7 new issues resolved, 3 previously fixed (71 dedicated Phase 3 tests passing)

### Security

- **FIX-01**: Replaced direct private key env var (`MERCHANT_WALLET_PRIVATE_KEY`) with KMS signer abstraction. `SignerProvider` interface with `KMSSignerProvider` (production via AWS KMS) and `EnvVarSignerProvider` (dev only). Production blocks raw key usage. (CRIT-PHASE3-01)
- **FIX-02**: Prevented refund race conditions using `SELECT ... FOR UPDATE` row locking inside `prisma.$transaction`. Concurrent over-refund attempts are now serialized and rejected. (CRIT-PHASE3-02)
- **FIX-03**: Added `NonceManager` service with Redis distributed locking (`SET key PX timeout NX`) to serialize blockchain transaction nonce acquisition across concurrent requests. (CRIT-PHASE3-03)
- **FIX-04**: Added `POST /v1/webhooks/:id/rotate-secret` endpoint. Generates `whsec_`-prefixed secrets with `crypto.randomBytes(32)`, encrypts with AES-256-GCM before storage. (HIGH-PHASE3-04)
- **FIX-06**: Moved JWT access token storage from `localStorage` to module-scoped memory variable. Eliminates XSS token theft vector. Replaced `Math.random().toString(36)` JTI generation with `crypto.randomUUID()`. (HIGH-PHASE3-06)
- **FIX-09**: Added payment session expiry enforcement inside `$transaction` before status transitions. Uses sentinel pattern to commit FAILED status without rollback. (HIGH-PHASE3-09)
- **Quick Wins**: Updated Dockerfile to `--omit=dev`, added 1MB body size limit, configured request timeouts (30s server, 31s headers, 5s keepalive), added npm audit CI step, documented new env vars. (MED-PHASE3)

### Added

- `KMSSignerProvider` and `EnvVarSignerProvider` in `kms-signer.service.ts`
- `NonceManager` service in `nonce-manager.service.ts`
- `POST /v1/webhooks/:id/rotate-secret` endpoint
- `npm audit` step in CI pipeline
- 71 new Phase 3 security tests across 8 test suites
- `AWS_KMS_KEY_ID` and `AWS_REGION` environment variables for KMS signer

### Changed

- `blockchain-transaction.service.ts` uses `SignerProvider` instead of direct env var access
- `refund.service.ts` uses transactional row locking for refund creation
- `token-manager.ts` uses module-scoped variable instead of `localStorage`
- `auth.ts` uses `crypto.randomUUID()` for JTI generation
- Dockerfile uses `--omit=dev` instead of deprecated `--only=production`
- Server configured with explicit timeouts (30s/31s/5s)
- Security score updated from 95/100 to 98/100

### Fixed

- Private key exposure via environment variable (now KMS-managed)
- Concurrent refund race condition allowing over-refunds
- Blockchain nonce collisions under concurrent load
- JWT tokens accessible to XSS via localStorage
- Weak JTI randomness using Math.random()
- Expired payment sessions still accepting status transitions

---

## [1.1.0] - Security Audit Phase 2

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
