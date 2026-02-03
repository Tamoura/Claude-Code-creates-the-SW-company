# StableFlow Stablecoin Gateway — Audit Report (v12)

**Date:** February 3, 2026
**Auditor:** ConnectSW Code Reviewer (Automated, 4-agent parallel exploration)
**Branch:** feature/stablecoin-gateway/audit-remediation (commits f1ace6f, 37e4645 — low/medium remediation)
**Product Version:** v1.2.0-rc (Phase 1 features: Payment Links, QR Codes, Checkout Widget, Email Notifications)
**Previous Audit:** v11 (February 2, 2026 — Overall Score 8.3/10)

---

# PART A — EXECUTIVE MEMO

---

## Section 0: Methodology and Limitations

### Audit Scope

| Directory Scanned | File Types |
|---|---|
| `apps/api/src/services/` | `.ts` |
| `apps/api/src/workers/` | `.ts` |
| `apps/api/src/routes/` | `.ts` |
| `apps/api/src/plugins/` | `.ts` |
| `apps/api/src/utils/` | `.ts` |
| `apps/api/src/app.ts` | `.ts` |
| `apps/api/src/index.ts` | `.ts` |
| `apps/api/prisma/` | `.prisma` |
| `apps/api/tests/` | `.ts` |
| `apps/web/src/` | `.ts`, `.tsx` |
| `apps/web/e2e/` | `.ts` |
| `.github/workflows/` | `.yml` |
| Root configs | `.json`, `.yml`, `.env*` |

- **Total files reviewed:** 119 source files + 104 backend test suites + 42 frontend test suites = 265 files
- **Total lines of code analyzed:** 25,206 (10,981 backend + 14,225 frontend) + approximately 18,000 (tests) = approximately 43,000 lines
- **Backend source files:** 51 files across services, routes, plugins, utils, workers
- **Frontend source files:** 68 files across components, pages, hooks, lib
- **Test suites:** 146 total (104 backend Jest, 42 frontend Vitest)

### Methodology

- Static analysis: manual code review of all source files by 4 parallel agents (services, routes, plugins/utils/schema, tests/CI/frontend)
- Schema analysis: Prisma schema, database indexes, relations, constraints
- Dependency audit: `package.json` and lock file review
- Configuration review: environment files, Docker configs, CI/CD pipelines
- Test analysis: full test suite execution, coverage assessment, quality evaluation, gap identification
- Architecture review: dependency graph, layering, coupling analysis, concurrency patterns

### Test Execution Results

| Suite | Files | Pass | Fail | Skip |
|---|---|---|---|---|
| Backend (Jest) | 104 | 952 | 0 | 0 |
| Frontend Unit (Vitest) | 42 | 361 | 0 | 0 |
| E2E (Playwright) | 14 | 73 | 0 | 0 |
| **Total** | **160** | **1,386** | **0** | **0** |

Pass rate: 100% (all tests passing, including 5 new dashboard page test suites added in this cycle)

### Out of Scope

- Dynamic penetration testing (no live exploit attempts were made)
- Runtime performance profiling (no load tests executed)
- Third-party SaaS integrations (only code-level integration points reviewed)
- Infrastructure-level security (cloud IAM, network policies, firewall rules)
- Generated code (Prisma client) unless it poses a security risk
- Third-party library internals (but vulnerable versions are noted)
- Blockchain on-chain testing (smart contract interactions reviewed in code only)
- Frontend accessibility (WCAG compliance not assessed)

### Limitations

- This audit is based on static code review. Some issues (memory leaks, race conditions under load, intermittent failures) may only manifest at runtime.
- Compliance assessments are technical gap analyses, not formal certifications.
- Scores reflect the state of the code at the time of audit and may change with subsequent commits.

---

## Section 1: Executive Decision Summary

### Overall Assessment: CONDITIONALLY PRODUCTION-READY

| Question | Answer |
|----------|--------|
| **Can this go to production?** | Conditionally — after Phase 1 items and 2 newly identified service-layer gaps are resolved |
| **Is it salvageable?** | Yes — the product is well-architected with strong security foundations and 1,386 passing tests |
| **Risk if ignored** | Medium — newly found service-layer gaps are behind authentication but represent real logic flaws |
| **Recovery effort** | 1-2 weeks with 1 engineer for Phase 1 items plus new findings |
| **Enterprise-ready?** | Nearly — CSRF, httpOnly tokens, and refund validation are the remaining blockers |
| **Compliance-ready?** | SOC2: Nearly (CSRF gap, refund validation). OWASP Top 10: 8/10 Pass, 2 Partial |

### Audit Progress (v9 through v12)

| Metric | v9 | v10 | v11 | v12 |
|--------|-----|------|------|------|
| Overall Score | 7.1 | 8.2 | 8.3 | 8.0 |
| Critical Issues | 2 | 0 | 0 | 0 |
| High Issues (open) | 5 | 3 | 3 | 4 |
| Tests Passing | 951+160 | 951+160 | 951+160 | 952+361 |
| Phase 0 Items | 5 open | 5 resolved | 5 resolved | 5 resolved |
| Phase 1 Items | 7 open | 5 open | 5 open | 7 open |
| Score Gate | FAIL | PASS | PASS | FAIL (Security 7.5, Performance 7.5) |

**v12 Delta:** This audit performed deeper service-layer analysis using 4 parallel agents. The deeper pass uncovered 8 new findings (1 High, 5 Medium, 2 Low) in business logic, concurrency, and blockchain integration that previous audits did not reach. Test coverage improved significantly (+202 tests) with 5 new dashboard page test suites. Two technical dimensions (Security, Performance) dropped below the 8/10 gate threshold due to newly identified gaps.

### Top 5 Risks in Plain Language

1. **A malicious website could trick a logged-in merchant into making unauthorized API calls** — The API lacks CSRF protection, meaning a merchant visiting a compromised website could unknowingly initiate payments or change settings.

2. **A merchant could request a refund for a payment that was never completed** — The refund service does not verify that the original payment reached COMPLETED status before accepting a refund request. This could lead to accounting discrepancies and unauthorized fund transfers.

3. **Session tokens could be stolen if any future code vulnerability allows script injection** — Refresh tokens are returned in JSON responses rather than secure browser-only cookies, meaning any JavaScript vulnerability could capture long-lived session tokens.

4. **If a blockchain node becomes unresponsive, payment verification requests hang indefinitely** — Blockchain RPC calls have no timeout, meaning a slow or unresponsive node could cause requests to hang until the server's connection limit is exhausted.

5. **Public-facing payment and QR code endpoints could be abused for denial of service** — The checkout, payment link resolution, and QR code generation endpoints have no rate limiting, allowing automated abuse that could degrade service for legitimate users.

---

## Section 2: Stop / Fix / Continue

| Category | Items |
|----------|-------|
| **STOP** | Nothing requires immediate cessation. All Critical issues from v9 have been resolved. No regressions detected. |
| **FIX** | Refund service must verify payment status is COMPLETED before accepting refunds. CSRF protection must be added. Refresh tokens should move to httpOnly cookies. Blockchain RPC calls need timeouts. Refresh endpoint should include role in JWT. Public endpoints need rate limiting. Webhook deliveries need atomic claim-before-process. |
| **CONTINUE** | Decimal.js precision for financial calculations. Atomic INCRBY spending limits with rollback. Idempotency key pattern for payment processing. HMAC-based API key hashing with timing-safe comparison. Comprehensive behavioral test suite (952 backend + 361 frontend + 73 E2E = 1,386 tests). Webhook signature verification with timing-safe comparison. Payment state machine with allow-list transitions. AES-256-GCM encryption. Anti-enumeration signup responses. DNS-resolution SSRF protection. Redis distributed locking. Provider failover with health caching. KMS error sanitization. |

---

## Section 3: System Overview

### Architecture

```
                    +---------------+
                    |   Merchant    |
                    |   Browser     |
                    +-------+-------+
                            | HTTPS
                    +-------v-------+
                    |  Vite + React |  Port 3104
                    |  Frontend     |  React 18 + Tailwind
                    +-------+-------+
                            | REST API
                    +-------v-------+
                    |  Fastify      |  Port 5001
                    |  Backend API  |  TypeScript + Prisma
                    +--+----+----+--+
                       |    |    |
            +----------+    |    +----------+
            v               v               v
     +----------+    +----------+    +----------+
     |PostgreSQL|    |  Redis   |    |Blockchain|
     |  (Prisma)|    | (Cache,  |    |  (RPC)   |
     |          |    |  Locks)  |    |  Ethers  |
     +----------+    +----------+    +----------+
```

### Technology Stack

- **Runtime:** Node.js 20+, TypeScript 5+
- **Backend:** Fastify with JWT auth (HS256 pinned), rate limiting, CORS, Helmet security headers
- **Frontend:** Vite 5, React 18, Tailwind CSS
- **Database:** PostgreSQL 15+ via Prisma ORM (Decimal(18,6) for financial data)
- **Cache/Locks:** Redis (circuit breaker, nonce locks, rate limiting, spending limits, JTI blacklist)
- **Blockchain:** ethers.js v6 for EVM-compatible chains (Ethereum, Polygon) with ProviderManager failover
- **Crypto:** AES-256-GCM encryption (direct hex key), HMAC-SHA256 API keys, bcrypt passwords (12 rounds)
- **Testing:** Jest (952 backend), Vitest (361 frontend), Playwright (73 E2E)

### Key Flows

1. **Payment Flow:** Merchant creates payment via API or payment link -> system generates checkout URL -> customer pays on-chain -> blockchain monitor detects ERC-20 Transfer event -> webhook notifies merchant
2. **Auth Flow:** Email/password signup -> JWT access token (15min) + refresh token -> atomic token rotation on refresh -> JTI blacklisting on logout via Redis
3. **Refund Flow:** Merchant requests refund -> atomic spending limit check (INCRBY + rollback) -> Redis nonce lock -> blockchain transaction via KMS signer -> confirmation monitoring -> webhook notification

---

## Section 4: Critical Issues (Top 10)

### 1. No CSRF Protection (Carried from v9/v10)

- **Severity:** High (downgraded from Critical in v9 — in-memory token storage reduces exploitability)
- **Likelihood:** Medium — requires social engineering to trick merchant to visit attacker site
- **Blast Radius:** Product — any authenticated merchant action
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** A malicious website could trick a merchant's browser into making API calls if the merchant has an active session
- **Compliance Impact:** OWASP A01 (Broken Access Control), SOC2 Security

### 2. Refresh Tokens in JSON Body Instead of httpOnly Cookies (Carried from v9/v10)

- **Severity:** High
- **Likelihood:** Medium — requires XSS or malicious browser extension to exfiltrate
- **Blast Radius:** Feature — session hijacking per user
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** If any JavaScript vulnerability is found, refresh tokens in memory can be exfiltrated for persistent account access
- **Compliance Impact:** OWASP A07, SOC2 Security

### 3. Refresh Endpoint Omits Role in JWT (Carried from v10)

- **Severity:** High
- **Likelihood:** Medium — affects all refreshed tokens in every session
- **Blast Radius:** Feature — authorization inconsistency
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** After token refresh, the JWT payload lacks the `role` field present in the original token. The auth plugin does a database lookup so admin checks work, but any service trusting the JWT role claim directly would see undefined.
- **Compliance Impact:** OWASP A01 (Broken Access Control)

### 4. Public Endpoints Without Rate Limiting (Carried from v10)

- **Severity:** Medium
- **Likelihood:** Medium — automated abuse is straightforward
- **Blast Radius:** Product — service availability
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** Checkout, payment link resolution, and QR code generation endpoints are public and unrate-limited. QR generation is CPU-intensive and could be used for denial-of-service.
- **Compliance Impact:** SOC2 Availability

### 5. Refund Allowed on Non-Completed Payments (New in v12)

- **Severity:** High
- **Likelihood:** Medium — any authenticated merchant can trigger via API
- **Blast Radius:** Product — accounting discrepancies, unauthorized fund transfers
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** A merchant could request a refund for a payment session that never reached COMPLETED status. The refund service checks remaining refundable amount but does not verify that the original payment was actually completed, potentially creating phantom refund transactions
- **Compliance Impact:** OWASP A04 (Insecure Design), SOC2 Processing Integrity

### 6. No Timeout on Blockchain RPC Calls (New in v12)

- **Severity:** Medium
- **Likelihood:** Medium — blockchain nodes periodically become unresponsive
- **Blast Radius:** Product — resource exhaustion, cascading failures
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** Calls to blockchain RPC endpoints (getTransactionReceipt, getBlockNumber) have no timeout. If a node hangs, the verification request blocks indefinitely, consuming a server connection until the OS TCP timeout (potentially minutes)
- **Compliance Impact:** SOC2 Availability

### 7. Admin Search Query No Max Length (Carried from v10)

- **Severity:** Medium
- **Likelihood:** Low — requires admin credentials
- **Blast Radius:** Feature — database and memory pressure
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** A malicious or compromised admin could send megabyte-length search strings that create expensive database LIKE queries
- **Compliance Impact:** SOC2 Availability

### 8. Payment Link Resolve Endpoint Missing Max Usage Check (Carried from v11)

- **Severity:** Medium
- **Likelihood:** Medium — any user can hit the resolve endpoint
- **Blast Radius:** Feature — confuses users, potential overpayment
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** The public resolve endpoint does not validate maxUsages or expiry, so an exhausted or expired payment link can still be resolved and displayed to customers, though the checkout step would ultimately fail.
- **Compliance Impact:** SOC2 Processing Integrity

### 9. Nonce Lock Fallback TOCTOU Race (Carried from v9/v10, downgraded)

- **Severity:** Medium (Lua script handles primary path)
- **Likelihood:** Low — requires Redis failure during active transaction
- **Blast Radius:** Product — duplicate blockchain transactions
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** If Redis is unavailable, the nonce manager falls back to a non-atomic check that could assign the same nonce to two transactions
- **Compliance Impact:** SOC2 Processing Integrity

### 10. API Container Port Not Bound to Localhost in Docker (Carried from v10)

- **Severity:** Medium
- **Likelihood:** Low — development environment concern
- **Blast Radius:** Feature — API accessible from network
- **Risk Owner:** DevOps
- **Category:** Infrastructure
- **Business Impact:** The API port binding in docker-compose is "5001:5001" instead of "127.0.0.1:5001:5001", making the API accessible from any network interface
- **Compliance Impact:** OWASP A05 (Security Misconfiguration)

### 11. Webhook Worker Timing-Safe Comparison Leaks Key Length (Carried from v10)

- **Severity:** Medium
- **Likelihood:** Low — requires precise timing measurement capability
- **Blast Radius:** Feature — information disclosure
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** The length check before timingSafeEqual short-circuits, leaking the length of the internal API key through timing differences
- **Compliance Impact:** OWASP A02 (Cryptographic Failures)

### 12. Refresh and Logout Bodies Not Zod-Validated (Carried from v10)

- **Severity:** Low
- **Likelihood:** Low — type coercion edge cases
- **Blast Radius:** Feature — potential runtime errors
- **Risk Owner:** Dev
- **Category:** Code
- **Business Impact:** The /refresh and /logout endpoints use raw type assertions instead of Zod validation. A non-string refresh_token value could cause unexpected behavior.
- **Compliance Impact:** OWASP A03 (Injection)

---

## Section 5: Risk Register (Summary)

| Issue ID | Title | Severity | Owner | SLA | Status |
|----------|-------|----------|-------|-----|--------|
| RISK-001 | XSS in email HTML templates | Critical | Dev | Phase 0 | **RESOLVED** (v10) |
| RISK-002 | Spending limit race condition | Critical | Dev | Phase 0 | **RESOLVED** (v10) |
| RISK-003 | No CSRF protection | High | Dev | Phase 1 | Open |
| RISK-004 | Signup email enumeration | High | Dev | Phase 0 | **RESOLVED** (v10) |
| RISK-005 | Refresh tokens not in httpOnly cookies | High | Dev | Phase 1 | Open |
| RISK-006 | CSP unsafe-inline for scripts | High | Dev | Phase 1 | **RESOLVED** (v10) |
| RISK-007 | Dev routes no auth | High | DevOps | Phase 0 | **RESOLVED** (v10) |
| RISK-008 | Nonce lock TOCTOU race | Medium | Dev | Phase 2 | Open (downgraded) |
| RISK-009 | Encryption key SHA-256 hashing | Medium | Dev | Phase 2 | **RESOLVED** (v10) |
| RISK-010 | Dual PrismaClient instances | Medium | Dev | Phase 1 | **RESOLVED** (v10) |
| RISK-011 | Webhook worker error message leakage | Medium | Dev | Phase 1 | **RESOLVED** (v10) |
| RISK-012 | Payment link usage count race | Medium | Dev | Phase 1 | **RESOLVED** (v10) |
| RISK-013 | Checkout exposes merchant wallet address | Low | Dev | Phase 2 | Open (accepted risk) |
| RISK-014 | Rate limit keyGenerator timing | Medium | Dev | Phase 2 | Open |
| RISK-015 | Redis no auth in Docker | Medium | DevOps | Phase 1 | **RESOLVED** (v10) |
| RISK-016 | Swagger UI in production | Medium | DevOps | Phase 0 | **RESOLVED** (v10) |
| RISK-017 | Refund worker FOR UPDATE outside transaction | Medium | Dev | Phase 1 | **RESOLVED** (v10) |
| RISK-018 | Admin search unbounded length | Medium | Dev | Phase 2 | Open |
| RISK-019 | Redis circuit breaker module-level state | Low | Dev | Phase 3 | Open |
| RISK-020 | Refund amount precision loss at boundary | Low | Dev | Phase 2 | Open |
| RISK-021 | Webhook event ID weak randomness | Low | Dev | Phase 2 | Open |
| RISK-022 | Missing ownership check on payment status update | Low | Dev | Phase 2 | Open |
| RISK-023 | No frontend component tests | Low | Dev | Phase 2 | Open |
| RISK-024 | CI missing SAST and secret scanning | Low | DevOps | Phase 2 | Partial (security-checks.yml added) |
| RISK-025 | Param IDs not validated as UUID across routes | Low | Dev | Phase 3 | Open |
| RISK-026 | env-validator calls process.exit(1) | Low | Dev | Phase 3 | Open |
| RISK-027 | No max refund amount validation | Low | Dev | Phase 2 | Open |
| RISK-028 | Metrics endpoint not timing-safe | Low | Dev | Phase 3 | **RESOLVED** (v10) |
| RISK-029 | Response format inconsistencies | Low | Dev | Phase 3 | Open |
| RISK-030 | SSE tests timing-dependent | Low | Dev | Phase 3 | Open |
| RISK-031 | Refresh endpoint omits role in JWT | High | Dev | Phase 1 | Open |
| RISK-032 | Public endpoints without rate limiting | Medium | Dev | Phase 2 | Open |
| RISK-033 | API container port not localhost-bound | Medium | DevOps | Phase 1 | Open |
| RISK-034 | Webhook worker timing-safe length leak | Medium | Dev | Phase 2 | Open |
| RISK-035 | Refresh/logout bodies not Zod-validated | Low | Dev | Phase 2 | Open |
| RISK-036 | SSE counters process-local | Low | Dev | Phase 3 | Open |
| RISK-037 | PaymentService instantiated per request | Low | Dev | Phase 3 | Open |
| RISK-038 | Delete endpoint response inconsistency | Low | Dev | Phase 3 | Open |
| RISK-039 | Refund pagination default inconsistency | Low | Dev | Phase 3 | Open |
| RISK-040 | Payment link resolve missing max usage check | Medium | Dev | Phase 2 | Open (NEW) |
| RISK-041 | Audit log fire-and-forget uses console.error | Medium | Dev | Phase 2 | Open (NEW) |
| RISK-042 | CORS origin comparison case-sensitive | Low | Dev | Phase 3 | Open (NEW) |
| RISK-043 | Encryption key lacks entropy validation | Low | Dev | Phase 3 | Open |
| RISK-044 | Refund allowed on non-completed payments | High | Dev | Phase 1 | Open (NEW v12) |
| RISK-045 | No timeout on blockchain RPC calls | Medium | Dev | Phase 1 | Open (NEW v12) |
| RISK-046 | Webhook delivery not atomically claimed | Medium | Dev | Phase 2 | Open (NEW v12) |
| RISK-047 | No rate limiting on refund creation | Medium | Dev | Phase 2 | Open (NEW v12) |
| RISK-048 | Zod validation errors leak schema details | Medium | Dev | Phase 2 | Open (NEW v12) |
| RISK-049 | Unbounded TEXT fields in webhook delivery table | Medium | Dev | Phase 2 | Open (NEW v12) |
| RISK-050 | API key hash falls back to unsalted SHA-256 | Medium | Dev | Phase 1 | Open (NEW v12) |
| RISK-051 | Blockchain query service missing authorization scope | Low | Dev | Phase 2 | Open (NEW v12) |

**Total: 51 findings** (0 Critical, 4 High open, 14 Medium open, 15 Resolved, 18 Low)

---

## Scores

### Technical Dimension Scores

| Dimension | v9 | v10 | v11 | **v12** | Change v11-v12 | Notes |
|-----------|-----|------|------|---------|----------------|-------|
| Security | 6.5 | 8 | 8 | **7.5** | -0.5 | Deeper services analysis found: refund on non-completed payments (logic flaw), no refund rate limiting, API key hash fallback to unsalted SHA-256. Existing gaps remain: CSRF, httpOnly tokens, role in refresh JWT. |
| Architecture | 8 | 8.5 | 8.5 | **8** | -0.5 | Webhook delivery not atomically claimed before processing (double-delivery risk). Blockchain query service lacks authorization scoping. Core architecture remains solid. |
| Test Coverage | 8.5 | 8.5 | 8.5 | **9** | +0.5 | 1,386 tests all passing (up from 1,184). 5 new dashboard page test suites (ApiKeys, Invoices, Security, Webhooks, MerchantsList). Frontend coverage improved from 160 to 361 tests. |
| Code Quality | 8 | 8.5 | 8.5 | **8** | -0.5 | Zod validation errors leak schema details to clients. Audit log redaction covers only top-level keys. Transfer event parsing does not validate topics array length. |
| Performance | 7 | 8 | 8 | **7.5** | -0.5 | No timeout on blockchain RPC calls is a real availability risk. Webhook secret decrypted per-delivery (not cached). Still no load testing baseline. |
| DevOps | 6.5 | 8 | 8 | **8** | 0 | CI pipeline comprehensive with 6 mandatory gates. Security-checks workflow for secret detection. Remaining: API port binding, CI Redis no auth. |
| Runability | 8 | 8 | 8.5 | **8.5** | 0 | Full stack starts, all 1,386 tests pass, real data flows, both builds succeed. Node 20 pinned via .nvmrc for Vitest compatibility. |

**Technical Score: 8.1/10** (down from 8.3 — deeper analysis revealed gaps in Security and Performance)

### Readiness Scores

| Dimension | v9 | v10 | v11 | **v12** | Change v11-v12 | Notes |
|-----------|-----|------|------|---------|----------------|-------|
| Security Readiness | 6 | 8 | 8 | **7.5** | -0.5 | 4 High open (up from 3). New: refund validation logic flaw. CSRF and httpOnly remain. |
| Product Potential | 8.5 | 9 | 9 | **9** | 0 | Solid domain logic. Atomic spending limits, state machine, idempotency. 1,386 tests confirm correctness. |
| Enterprise Readiness | 6 | 7.5 | 7.5 | **7.5** | 0 | CSRF and refund validation gaps are primary blockers. Test coverage improvement is positive signal. |

### Overall Score: 8.0/10 — Conditionally Production-Ready

**Score Gate: FAIL** — Security (7.5) and Performance (7.5) are below the 8/10 threshold.

**Improvement Plan Required:** See Phase 1 remediation items below. Resolving RISK-044 (refund validation), RISK-045 (RPC timeout), and RISK-050 (API key hash fallback) would restore Security to 8/10. Adding RPC timeouts and a load testing baseline would restore Performance to 8/10.

---

## Compliance Summary

### OWASP Top 10

| Control | Status | Evidence |
|---------|--------|----------|
| A01: Broken Access Control | Partial | Strong: dev routes gated, JWT auth, role-based access, API key permissions, ownership checks. Gap: CSRF still missing. |
| A02: Cryptographic Failures | Pass | AES-256-GCM direct hex key, bcrypt (12 rounds), HMAC-SHA256 API keys, timing-safe comparison on metrics. Minor: webhook worker length leak. |
| A03: Injection | Pass | HTML escaping in email templates via escapeHtml(). Prisma ORM prevents SQL injection. Zod validation on most endpoints. |
| A04: Insecure Design | Pass | Payment state machine (allow-list transitions), idempotency keys, rate limiting, account lockout (5 attempts, 15min TTL), Redis circuit breaker. |
| A05: Security Misconfiguration | Pass | CSP scriptSrc self only, Swagger gated in production, HSTS with preload (1 year), body limit 1MB, max param length 256. |
| A06: Vulnerable and Outdated Components | Pass | No known vulnerable dependencies. npm audit passes at high level. |
| A07: Identification and Authentication Failures | Partial | Email enumeration fixed (generic 201). Token rotation atomic. JWT algorithm pinned (HS256). Gap: refresh tokens in JSON body, role missing from refresh JWT. |
| A08: Software and Data Integrity Failures | Pass | HMAC webhook signatures, timing-safe comparison, API key verification via HMAC-SHA256. |
| A09: Security Logging and Monitoring Failures | Pass | Structured audit logging with 13+ sensitive patterns redacted, PII sanitization, fire-and-forget audit trail. |
| A10: Server-Side Request Forgery (SSRF) | Pass | DNS resolution + private IP blocking (10.x, 192.168.x, 172.16-31.x, 127.x, 169.254.x, ::1), cloud metadata blocking, HTTPS enforcement. |

**Result: 8/10 Pass, 2/10 Partial, 0/10 Fail**

### SOC2 Type II

| Principle | Status | Evidence |
|-----------|--------|----------|
| Security | Partial | Encryption at rest, HMAC keys, bcrypt, JWT auth, rate limiting, account lockout, SSRF protection. Gap: CSRF missing, refresh tokens in JSON body. |
| Availability | Pass | Health checks, Redis circuit breaker (30s threshold), single Prisma pool, atomic Redis operations, provider failover with cooldown and health caching. |
| Processing Integrity | Pass | Decimal(18,6) for financial data, atomic INCRBY spending limits with rollback, payment state machine, idempotency keys, $transaction for refund worker, FOR UPDATE SKIP LOCKED. |
| Confidentiality | Pass | AES-256-GCM encryption at rest, log sanitization (13+ patterns), HMAC key storage, KMS error sanitization preventing credential leakage, audit trail. |
| Privacy | Pass | No PII in logs, audit trail, no unnecessary data collection. |

### ISO 27001 Annex A

| Control Area | Status | Evidence |
|-------------|--------|----------|
| A.5 Information Security Policies | Partial | Security patterns in code. No formal security policy document. |
| A.6 Organization of Information Security | Pass | Clear code ownership, agent-based development with review gates. |
| A.8 Asset Management | Pass | Database schema well-defined, data classification implicit. |
| A.9 Access Control | Partial | JWT auth, role-based routes, account lockout. Gap: CSRF. |
| A.10 Cryptography | Pass | AES-256-GCM, HMAC-SHA256, bcrypt (12 rounds). Direct hex key derivation. |
| A.12 Operations Security | Pass | CI pipeline (test, lint, security audit, build, E2E), Docker deployment, Redis auth, security-checks workflow, localhost binding. |
| A.14 System Development | Pass | 1,184 tests, TDD approach, race conditions fixed, atomic financial operations, state machine enforcement. |
| A.16 Incident Management | Partial | Audit logging exists with PII sanitization. No incident response runbook or automated alerting. |
| A.18 Compliance | Partial | This audit series (v9-v11) provides gap analysis. No formal compliance program. |

---

## Remediation Phases (Updated)

**Phase 0 (48 hours): COMPLETE** — All 5 items resolved in v10 (XSS, spending limit race, email enumeration, dev routes guard, Swagger guard).

**Phase 1 (Remaining — 1 week):**
- Add CSRF protection via `@fastify/csrf-protection` or double-submit cookie
- Move refresh tokens to httpOnly secure SameSite=strict cookies
- Add `role` to refresh endpoint JWT payload
- Bind API container port to localhost in docker-compose
- Fix nonce lock fallback to use serializable transaction

**Phase 2 (2-4 weeks):**
- Add `.max(255)` to admin search query parameter
- Add rate limiting to checkout, payment link resolve, and QR endpoints
- Add max usage and expiry validation to payment link resolve endpoint
- Fix webhook worker timing comparison (hash both values before comparing)
- Add Zod validation to /refresh and /logout request bodies
- Replace console.error with logger.error in audit log service
- Add frontend component tests (target 60% coverage)
- Fix rate limit keyGenerator to run after auth plugin
- Add UUID validation to route param IDs

**Phase 3 (4-8 weeks):**
- Replace process.exit(1) in env-validator with thrown error
- Standardize API response format across all endpoints
- Move SSE counters to Redis for multi-instance support
- Normalize CORS origins to lowercase before comparison
- Add entropy validation to encryption key initialization
- Add load testing baseline
- Add incident response runbook
- Add monitoring and alerting pipeline

---

# PART B — ENGINEERING APPENDIX

(This section contains file:line references, code examples, and technical detail. For engineering team only.)

---

## Section 6: Architecture Problems

### 6.1 Redis Circuit Breaker Module-Level State

**Location:** `apps/api/src/plugins/auth.ts:10-11`

The Redis circuit breaker state (`redisFailedSince`) is stored in module-level variables. In a multi-instance deployment, each instance tracks its own circuit state independently. The 30-second threshold is per-instance.

**Impact:** Inconsistent circuit breaker behavior across instances. One instance may reject requests while another accepts them.

**Fix:** Store circuit breaker state in Redis itself (atomic increment with TTL), or accept per-instance behavior and document the limitation.

### 6.2 Rate Limit KeyGenerator Timing

**Location:** `apps/api/src/app.ts:153-167`

The rate limit keyGenerator runs before the auth plugin decorates `request.currentUser`. The generator attempts to use `request.currentUser` for per-user rate limiting but falls back to IP-based limiting.

**Impact:** Authenticated rate limiting does not work as intended — all authenticated requests use IP-based limiting.

**Fix:** Register the rate limit plugin after the auth plugin, or use a `preHandler` hook.

### 6.3 PaymentService Instantiated Per Request

**Location:** `apps/api/src/routes/v1/payment-sessions.ts:26, 129, 176, 211`

Each request handler creates a new `PaymentService` instance. Currently lightweight but fragile to future changes if the service ever holds caches or connections.

**Impact:** Low — no resource leaks currently.

### 6.4 env-validator Calls process.exit(1)

**Location:** `apps/api/src/utils/env-validator.ts`

The environment validator calls `process.exit(1)` on validation failure, preventing graceful shutdown and making the function untestable.

**Fix:** Throw an error instead of calling `process.exit`.

---

## Section 7: Security Findings

### Authentication and Authorization

#### 7.1 No CSRF Protection (Open — High)

**Location:** `apps/api/src/app.ts` (no CSRF plugin registered)

The Fastify application registers CORS with credentials support but does not implement CSRF protection. Since tokens are stored in-memory (not cookies), exploitability is reduced. However, if refresh tokens move to httpOnly cookies (recommended), CSRF becomes critical.

**Fix:**
```typescript
import csrf from '@fastify/csrf-protection';
await app.register(csrf, { cookieOpts: { signed: true, sameSite: 'strict' } });
```

#### 7.2 Refresh Endpoint Missing Role in JWT (Open — High)

**Location:** `apps/api/src/routes/v1/auth.ts:266-269`

During login (line 186) and signup (line 73), the JWT includes `role: user.role`. The refresh endpoint omits it.

**Fix:** Fetch user from database and include role:
```typescript
const user = await fastify.prisma.user.findUnique({ where: { id: decoded.userId } });
const accessToken = fastify.jwt.sign(
  { userId: decoded.userId, role: user.role, jti: randomUUID() },
  { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
);
```

#### 7.3 Refresh/Logout Bodies Not Zod-Validated (Open — Low)

**Location:** `apps/api/src/routes/v1/auth.ts:234, 319`

Both endpoints use raw `as` type assertion. A `logoutSchema` export already exists in `validation.ts:37-39` but is not imported.

### API Security

#### 7.4 Admin Search No Max Length (Open — Medium)

**Location:** `apps/api/src/routes/v1/admin.ts:10`

**Fix:** Add `.max(255)` to the Zod string schema.

#### 7.5 Public Endpoints Without Rate Limiting (Open — Medium)

**Locations:**
- `apps/api/src/routes/v1/checkout.ts:10-53` — public checkout, no auth, no rate limit
- `apps/api/src/routes/v1/payment-links.ts:189-207` — public resolve, no auth, no rate limit
- `apps/api/src/routes/v1/payment-links.ts:211-279` — public QR generation (CPU-intensive), no auth, no rate limit

**Fix:** Apply route-level rate limiting: `config: { rateLimit: { max: 60, timeWindow: '1 minute' } }`

#### 7.6 Payment Link Resolve Missing Max Usage Check (New — Medium)

**Location:** `apps/api/src/routes/v1/payment-links.ts:189-207`

The resolve endpoint returns the payment link without checking maxUsages, expiry, or active status. The QR endpoint (line 240-246) correctly validates these.

**Fix:** Add the same validation to the resolve endpoint:
```typescript
if (link.expiresAt && link.expiresAt < new Date()) {
  throw new AppError(400, 'link-expired', 'This payment link has expired');
}
if (link.maxUsages !== null && link.usageCount >= link.maxUsages) {
  throw new AppError(400, 'link-max-usage-reached', 'Payment link usage limit reached');
}
if (!link.active) {
  throw new AppError(400, 'link-inactive', 'This payment link is no longer active');
}
```

#### 7.7 Webhook Worker Timing-Safe Length Leak (Open — Medium)

**Location:** `apps/api/src/routes/internal/webhook-worker.ts:36-41`

The length check short-circuits before `timingSafeEqual`, leaking the key length.

**Fix:** Hash both values before comparison to normalize length.

#### 7.8 Audit Log Fire-and-Forget Uses console.error (New — Medium)

**Location:** `apps/api/src/services/audit-log.service.ts:124`

Database write failures in the audit log service are logged via `console.error()` rather than the structured logger service, meaning failures may not be captured in production logging infrastructure.

**Fix:** Replace with `logger.error('CRITICAL: Audit log database write failed', { action, actor, error })`.

#### 7.9 Refund Allowed on Non-Completed Payments (New v12 — High)

**Location:** `apps/api/src/services/refund.service.ts:126-227`

The refund creation logic computes `totalRefunded` by filtering non-FAILED refunds and checks against the payment amount. However, it does not verify that `paymentSession.status === 'COMPLETED'` before proceeding. A merchant could create refunds against PENDING or FAILED payment sessions.

**Fix:**
```typescript
if (paymentSession.status !== 'COMPLETED' && paymentSession.status !== 'REFUNDED') {
  throw new AppError(400, 'payment-not-completed', 'Refunds can only be created for completed payments');
}
```

#### 7.10 No Timeout on Blockchain RPC Calls (New v12 — Medium)

**Location:** `apps/api/src/services/blockchain-monitor.service.ts:71-245`

Calls to `provider.getTransactionReceipt()` and `provider.getBlockNumber()` do not have explicit timeouts. If the RPC endpoint is slow or unresponsive, the verification hangs indefinitely, consuming a server connection.

**Fix:** Wrap provider calls with `AbortSignal.timeout()`:
```typescript
const receipt = await provider.getTransactionReceipt(txHash, { signal: AbortSignal.timeout(15000) });
```

#### 7.11 API Key Hash Fallback to Unsalted SHA-256 (New v12 — Medium)

**Location:** `apps/api/src/utils/crypto.ts:30-32`

In production, if `API_KEY_HMAC_SECRET` is not set, API key hashing falls back to unsalted SHA-256 instead of HMAC-SHA256. The env-validator warns but does not fail hard.

**Fix:** Change the fallback to throw in production:
```typescript
if (process.env.NODE_ENV === 'production') {
  throw new Error('API_KEY_HMAC_SECRET is required in production');
}
```

#### 7.12 Webhook Delivery Not Atomically Claimed (New v12 — Medium)

**Location:** `apps/api/src/services/webhook-delivery.service.ts:182-213`

The `processQueue` method selects deliveries with `FOR UPDATE SKIP LOCKED` but does not mark them as DELIVERING inside the transaction. If the process crashes after selection but before processing, deliveries remain in PENDING and will be re-selected, causing duplicate webhook deliveries.

**Fix:** Update status to DELIVERING inside the SELECT transaction before releasing the lock.

#### 7.13 Zod Validation Errors Leak Schema Details (New v12 — Medium)

**Locations:** `apps/api/src/routes/v1/payment-sessions.ts:108-114`, `apps/api/src/routes/v1/webhooks.ts:184-189`, `apps/api/src/routes/v1/payment-links.ts:144-150`

Error handlers return raw Zod error messages via `detail: error.message`. These verbose messages can reveal API schema structure to attackers.

**Fix:** Sanitize Zod errors before returning:
```typescript
detail: 'Invalid request parameters'  // Generic message
```

#### 7.14 Unbounded TEXT Fields in Database (New v12 — Medium)

**Location:** `apps/api/prisma/schema.prisma` — WebhookDelivery model (lines 237-239), AuditLog model (line 328)

`responseBody`, `errorMessage` (webhook_deliveries), and `details` (audit_logs) are unbounded TEXT fields. A large webhook response or audit event could consume excessive storage.

**Fix:** Truncate at application layer before database insert (e.g., 10KB limit for responseBody, 1KB for errorMessage).

### Infrastructure Security

#### 7.15 API Container Port Not Localhost-Bound (Open — Medium)

**Location:** `docker-compose.yml:52`

Port binding is `"5001:5001"` instead of `"127.0.0.1:5001:5001"`.

---

## Section 8: Performance and Scalability

### 8.1 Resolved Issues (from v10)

- **Dual PrismaClient** (RESOLVED): Single `app.prisma` instance shared with refund worker
- **Spending limit race** (RESOLVED): Atomic INCRBY with rollback in blockchain-transaction.service.ts
- **Refund worker locking** (RESOLVED): `$transaction` wrapping in refund-processing.worker.ts
- **Payment link usage race** (RESOLVED): Atomic SQL UPDATE in payment-link.service.ts

### 8.2 Remaining Concerns

- **No timeout on blockchain RPC calls** (Medium — NEW v12): `getTransactionReceipt()` and `getBlockNumber()` calls block indefinitely if node is unresponsive. Location: `blockchain-monitor.service.ts:71-245`.
- **Webhook secret decrypted per-delivery** (Medium — NEW v12): Every delivery decrypts the endpoint secret via `decryptSecret()`. Performance overhead and reduced debuggability. Location: `webhook-delivery-executor.service.ts:71-85`.
- **Admin search unbounded string length** (Medium): Could create expensive ILIKE queries
- **QR code generation CPU cost** (Medium): `QRCode.toDataURL()` is CPU-intensive, no rate limiting on public endpoint
- **Rate limit keyGenerator timing** (Medium): Runs before auth plugin, so per-user limiting falls back to IP
- **Provider health cache 30s TTL** (Low): If a provider fails after being cached as healthy, requests may be routed to a failed provider for up to 30 seconds before failover
- **No load testing baseline** (Medium): No k6/Artillery tests in CI. Performance thresholds are unknown.

---

## Section 9: Testing Gaps

### Coverage Assessment

| Area | Estimated Coverage | Notes |
|------|-------------------|-------|
| Backend services | 90%+ | Excellent behavioral testing, race condition tests, atomicity tests |
| Backend routes | 80% | Good coverage including security edge cases (lockout, SSRF, encryption) |
| Frontend components | 40% | Dashboard components tested (Sidebar, TransactionsTable, StatCard, CheckoutPreview, DeveloperIntegration) |
| Frontend pages | 60% | 5 new dashboard page suites (ApiKeys, Invoices, Security, Webhooks, MerchantsList) plus auth, checkout, home |
| E2E flows | 70% | 73 tests covering auth, payments, webhooks, admin |
| Security tests | 85% | Exceptional: HMAC, encryption, sanitization, atomicity, race conditions, lockout, SSRF, circuit breaker |

### Test Quality Highlights

The test suite demonstrates exceptional security-specific coverage:
- **Spending limit atomicity** (spending-limit-atomicity.test.ts): Atomic INCRBY with rollback, concurrent requests, Redis failure degradation
- **Account lockout** (account-lockout.test.ts): 5-failure lockout, 429 response, counter reset, TTL expiry, Redis degradation
- **Encryption** (encryption.test.ts, encryption-validation.test.ts): AES-256-GCM round-trip, random IV uniqueness, tampering detection, key validation
- **Race conditions** (refund-race-condition.test.ts): Full integration with real Prisma/Redis, concurrent refunds, FOR UPDATE locking
- **Nonce lock TOCTOU** (nonce-lock-atomicity.test.ts): Lua compare-and-delete, lock ownership, fallback behavior
- **KMS error sanitization** (kms-error-sanitization.test.ts): AWS ARNs, IAM roles, account IDs never leaked
- **SSRF protection** (url-validator.test.ts): Localhost, private ranges, cloud metadata, IPv6, HTTPS enforcement
- **Circuit breaker** (circuit-breaker-atomicity.test.ts): Lua script atomic INCR+EXPIRE+SET, threshold behavior, fallback

### Missing Test Scenarios

1. **Refund on non-completed payment** — No test verifies that refund creation rejects payments with status other than COMPLETED
2. **Concurrent request tests at API level** — Race conditions tested at service level but not at HTTP request level
3. **CSRF attack simulation** — No test verifies cross-origin request rejection
4. **Refresh token concurrent rotation** — No test for simultaneous refresh requests
5. **RPC timeout handling** — No test verifies behavior when blockchain node is unresponsive
6. **Webhook delivery double-delivery** — No test for process crash between SELECT FOR UPDATE and status update

---

## Section 10: DevOps Issues

### 10.1 Resolved Issues (from v10)

- **Redis auth** (RESOLVED): `--requirepass` with env var in docker-compose
- **Localhost binding** (RESOLVED): Postgres and Redis bound to `127.0.0.1`
- **Secret scanning** (RESOLVED): `security-checks.yml` scans for hardcoded secrets
- **Swagger guard** (RESOLVED): Gated behind `NODE_ENV !== 'production'`
- **Metrics auth** (RESOLVED): Uses `crypto.timingSafeEqual`

### 10.2 Remaining Issues

- **API container port not localhost-bound** (Medium): `"5001:5001"` in docker-compose instead of `"127.0.0.1:5001:5001"`
- **CI Redis no auth** (Low): Redis service in CI workflow uses `redis:7-alpine` without `--requirepass`. Inconsistent with production docker-compose.
- **Production deploy sleep-based wait** (Low): `sleep 120` instead of ECS service stability polling in deploy-production.yml:151
- **Post-deployment tests placeholder** (Low): `echo "Running post-deployment validation..."` with no actual smoke tests

---

## Section 11: Compliance Readiness

### OWASP Top 10 (2021) — Control-by-Control

| Control | Status | Evidence / Gap |
|---------|--------|----------------|
| A01: Broken Access Control | Partial | Strong: dev routes gated, JWT auth, role-based access, API key permissions, ownership checks. Gap: CSRF missing. Role omitted from refresh JWT. |
| A02: Cryptographic Failures | Pass | AES-256-GCM direct hex key derivation, bcrypt (12 rounds), HMAC-SHA256 API keys, timing-safe comparison on metrics. Minor gap: webhook worker length leak in timing comparison. |
| A03: Injection | Pass | HTML escaping in email templates via escapeHtml(). Prisma ORM prevents SQL injection. Zod validation on all major endpoints. Minor gap: /refresh and /logout bodies not Zod-validated. |
| A04: Insecure Design | Pass | Payment state machine (allow-list transitions), idempotency keys, rate limiting on auth, account lockout (5 attempts, 15min TTL), Redis circuit breaker with 30s threshold. |
| A05: Security Misconfiguration | Pass | CSP scriptSrc self only (no unsafe-inline), Swagger gated in production, HSTS with preload (1 year), body limit 1MB, max param length 256. |
| A06: Vulnerable and Outdated Components | Pass | No known vulnerable dependencies. npm audit passes at high audit level in CI. |
| A07: Identification and Authentication Failures | Partial | Email enumeration fixed (generic 201). Token rotation atomic with Prisma $transaction. JWT algorithm pinned (HS256). Gap: refresh tokens in JSON body, role missing from refresh JWT. |
| A08: Software and Data Integrity Failures | Pass | HMAC webhook signatures, timing-safe comparison, API key verification via HMAC-SHA256. CI quality gates enforce testing before merge. |
| A09: Security Logging and Monitoring Failures | Pass | Structured audit logging with 13+ sensitive patterns redacted, PII sanitization, fire-and-forget audit trail with in-memory buffer fallback. |
| A10: Server-Side Request Forgery (SSRF) | Pass | DNS resolution + private IP blocking for all webhook URLs. Covers IPv4/IPv6 private ranges, loopback, link-local, cloud metadata endpoints. HTTPS enforcement. |

### SOC2 Type II — Trust Service Principles

| Principle | Status | Evidence / Gap |
|-----------|--------|----------------|
| Security | Partial | AES-256-GCM encryption at rest, HMAC-SHA256 keys, bcrypt (12 rounds), JWT auth, rate limiting, account lockout, SSRF protection with DNS validation. Gap: CSRF missing, refresh tokens in JSON body. |
| Availability | Pass | Health checks on all services, Redis circuit breaker (30s threshold), single Prisma connection pool, atomic Redis operations, blockchain provider failover with health caching and cooldown. |
| Processing Integrity | Pass | Decimal(18,6) for financial data, atomic INCRBY spending limits with rollback, payment state machine with allow-list transitions, idempotency keys, $transaction for refund worker, FOR UPDATE SKIP LOCKED for concurrent claims. |
| Confidentiality | Pass | AES-256-GCM encryption at rest for webhook secrets, log sanitization (13+ patterns), HMAC key storage, KMS error sanitization prevents AWS credential leakage, audit trail with PII sanitization. |
| Privacy | Pass | No PII in logs (13+ sensitive patterns redacted), structured audit trail, no unnecessary data collection. |

### ISO 27001 Annex A — Key Controls

| Control Area | Status | Evidence / Gap |
|-------------|--------|----------------|
| A.5 Information Security Policies | Partial | Security patterns thoroughly implemented in code. No formal security policy document. |
| A.6 Organization of Information Security | Pass | Clear code ownership, agent-based development with automated review gates. |
| A.8 Asset Management | Pass | Database schema well-defined with Prisma, data classification implicit in model structure. |
| A.9 Access Control | Partial | JWT auth, role-based routes, API key permissions (read/write/refund), account lockout. Gap: CSRF. |
| A.10 Cryptography | Pass | AES-256-GCM with direct hex key derivation, HMAC-SHA256, bcrypt (12 rounds), JWT HS256 algorithm pinning. |
| A.12 Operations Security | Pass | CI pipeline (test, lint, security audit, build, E2E), Docker deployment with secret enforcement, Redis auth, security-checks workflow, localhost binding for DB/Redis. |
| A.14 System Development | Pass | 1,386 tests, TDD approach, race conditions fixed with atomic operations, financial precision with Decimal.js, payment state machine. |
| A.16 Incident Management | Partial | Audit logging exists with PII sanitization and in-memory buffer fallback. No incident response runbook or automated alerting pipeline. |
| A.18 Compliance | Partial | This audit series (v9-v11) provides comprehensive gap analysis. No formal compliance program or external certification. |

---

## Section 12: Technical Debt Map

| Priority | Debt Item | Interest (cost of delay) | Owner | Payoff |
|----------|-----------|--------------------------|-------|--------|
| HIGH | Refund on non-completed payment | Accounting errors, unauthorized fund transfers | Dev | Prevents phantom refunds |
| HIGH | CSRF protection missing | Becomes critical when refresh tokens move to cookies | Dev | Eliminates cross-site attack class |
| HIGH | Refresh token handling | XSS discovery becomes session hijacking vector | Dev | Reduces blast radius of any XSS |
| HIGH | Refresh JWT missing role | Any microservice trusting JWT claims gets wrong authorization | Dev | Consistent authorization across services |
| HIGH | No RPC timeout | Blockchain node hang causes cascading server failure | Dev | Prevents resource exhaustion |
| MEDIUM | API key hash fallback | Rainbow table attacks possible without HMAC | Dev | Eliminates weak hash path |
| MEDIUM | Admin search unbounded | Database DoS from malicious admin | Dev | Query safety |
| MEDIUM | Public endpoint rate limiting | Automated abuse of QR generation, checkout | Dev | Service availability protection |
| MEDIUM | Payment link resolve validation | Expired/exhausted links confuse users | Dev | Better UX and data integrity |
| MEDIUM | Webhook delivery double-delivery | Merchants receive duplicate events on process crash | Dev | Exactly-once delivery semantics |
| MEDIUM | Zod error message leakage | Attackers learn API schema structure | Dev | Opaque error responses |
| MEDIUM | Unbounded TEXT fields | Storage exhaustion from large webhook responses | Dev | Bounded storage |
| MEDIUM | Audit log error handling | Failed audit writes go undetected in production | Dev | Better forensic capability |
| LOW | Response format inconsistencies | API consumers handle multiple shapes | Dev | Cleaner API contract |
| LOW | Jest open handles | CI builds hang | Dev | Faster CI |
| LOW | env-validator process.exit | Untestable startup validation | Dev | Testable startup |

---

## Section 13: Remediation Roadmap (Phased)

### Phase 0 — Immediate (48 hours): COMPLETE

All 5 Phase 0 items resolved in v10:
1. Email template HTML escaping (RESOLVED)
2. Atomic spending limit with rollback (RESOLVED)
3. Generic signup response for email enumeration (RESOLVED)
4. Dev routes gated behind NODE_ENV (RESOLVED)
5. Swagger UI gated behind NODE_ENV (RESOLVED)

### Phase 1 — Stabilize (1-2 weeks remaining)

| Item | Owner | Verification | RISK ID |
|------|-------|-------------|---------|
| Add payment status check in refund service (must be COMPLETED) | Dev | New test: refund on PENDING payment returns 400 | RISK-044 |
| Add AbortSignal.timeout(15s) to blockchain RPC calls | Dev | New test: RPC timeout returns 504 within 15s | RISK-045 |
| Fail hard on missing API_KEY_HMAC_SECRET in production | Dev | Startup fails without HMAC secret in production mode | RISK-050 |
| Add CSRF protection via `@fastify/csrf-protection` or SameSite cookies | Dev | Cross-origin POST returns 403 | RISK-003 |
| Move refresh tokens to httpOnly secure SameSite=strict cookies | Dev | Cookie set in response, not in JSON body | RISK-005 |
| Add `role` to refresh endpoint JWT payload (auth.ts:266-269) | Dev | Decoded refresh token contains `role` field | RISK-031 |
| Bind API port to localhost: `"127.0.0.1:5001:5001"` in docker-compose | DevOps | `docker port` shows localhost binding | RISK-033 |

**Gate:** All scores >= 8/10, no High issues remaining. Completing first 3 items restores Security to 8/10 and Performance to 8/10.

### Phase 2 — Production-Ready (2-4 weeks)

| Item | Owner | Verification | RISK ID |
|------|-------|-------------|---------|
| Mark webhook deliveries as DELIVERING inside SELECT transaction | Dev | New test: process crash does not cause double delivery | RISK-046 |
| Add rate limiting on refund creation (10/minute per user) | Dev | 11th refund request in 1 minute returns 429 | RISK-047 |
| Sanitize Zod error messages in error handlers | Dev | Validation errors return generic messages | RISK-048 |
| Add size limits to unbounded TEXT fields (truncate on insert) | Dev | responseBody capped at 10KB | RISK-049 |
| Add `.max(255)` to admin search query | Dev | Search >255 chars returns 400 | RISK-018 |
| Add rate limiting to checkout, resolve, QR endpoints | Dev | 61st request in 1 minute returns 429 | RISK-032 |
| Add max usage and expiry validation to payment link resolve | Dev | Resolve of exhausted link returns 400 | RISK-040 |
| Fix webhook worker timing comparison (hash before compare) | Dev | Timing analysis shows constant-time | RISK-034 |
| Add Zod validation to /refresh and /logout bodies | Dev | Non-string refresh_token returns 400 | RISK-035 |
| Replace console.error with logger.error in audit log service | Dev | Audit log failures appear in structured logs | RISK-041 |
| Fix rate limit keyGenerator to run after auth | Dev | Per-user limiting works for authenticated requests | RISK-014 |
| Add UUID validation to route param IDs | Dev | Non-UUID param returns 400 | RISK-025 |

**Gate:** All scores >= 8.5/10, compliance gaps addressed.

### Phase 3 — Excellence (4-8 weeks)

| Item | Owner | Verification |
|------|-------|-------------|
| Replace process.exit(1) in env-validator | Dev | Unit test: validator throws on missing env vars |
| Standardize API response format | Dev | Contract tests verify consistent shape |
| Move SSE counters to Redis | Dev | Multi-instance test |
| Normalize CORS origins to lowercase | Dev | Case-variant origin correctly matched |
| Add entropy validation to encryption key | Dev | Low-entropy key rejected on startup |
| Add load testing baseline | DevOps | k6/Artillery results documented |
| Add incident response runbook | DevOps | Runbook in docs/ |
| Add monitoring/alerting pipeline | DevOps | Alert fires on health check failure |

**Gate:** All scores >= 9/10, audit-ready for external review.

---

## Section 14: Quick Wins (1-day fixes)

1. **Add payment status check to refund service** — Add `if (paymentSession.status !== 'COMPLETED') throw new AppError(400, ...)` in `refund.service.ts:131`. Closes RISK-044.
2. **Add RPC timeout** — Wrap all `provider.getTransactionReceipt()` and `provider.getBlockNumber()` calls with `AbortSignal.timeout(15000)` in `blockchain-monitor.service.ts`. Closes RISK-045.
3. **Fail hard on missing HMAC secret** — Change the fallback in `crypto.ts:30-32` to throw in production instead of warning. Closes RISK-050.
4. **Add `role` to refresh JWT** — One line change in `auth.ts:266-269`: add `role: user.role` to the sign payload after database lookup. Closes RISK-031.
5. **Add `.max(255)` to admin search** — One line change in `admin.ts:10`: `.max(255)` on the Zod string. Closes RISK-018.
6. **Bind API port to localhost** — One line change in `docker-compose.yml:52`: `"127.0.0.1:5001:5001"`. Closes RISK-033.
7. **Add Zod validation to /refresh** — Import and use existing schema in `auth.ts:234`. Closes RISK-035.
8. **Add rate limit to QR endpoint** — Add `config.rateLimit` to route definition in `payment-links.ts:211`. Closes RISK-032.
9. **Add max usage check to resolve endpoint** — Copy validation from QR endpoint (line 240-246) to resolve handler (line 189-207) in `payment-links.ts`. Closes RISK-040.
10. **Fix audit log error handling** — Replace `console.error` with `logger.error` in `audit-log.service.ts:124`. Closes RISK-041.

---

## Section 15: AI-Readiness Score

| Sub-dimension | Score | Notes |
|---------------|-------|-------|
| Modularity | 1.8/2 | Clean service layer separation, plugin architecture, workers isolated, single Prisma instance shared correctly. |
| API Design | 1.7/2 | RESTful routes, versioned API (v1), Zod validation, idempotency support. Minor: response inconsistencies, missing UUID param validation. |
| Testability | 1.8/2 | 1,386 tests, behavioral testing with real infrastructure, security-specific tests. Frontend page tests now cover major dashboard views. |
| Observability | 1.5/2 | Structured logging, audit trail with PII sanitization, log redaction (13+ patterns). Missing: metrics export, alerting, distributed tracing. |
| Documentation | 1.5/2 | PRD exists, API docs via Swagger, README comprehensive, env vars documented. Missing: deployment runbook, incident response, ADRs. |

**AI-Readiness Score: 8.3/10**

---

## Score Gate Check

**FAIL** — 2 dimensions below 8/10 threshold.

| Dimension | Score | Status |
|-----------|-------|--------|
| Security | 7.5/10 | **BELOW THRESHOLD** |
| Architecture | 8/10 | PASS |
| Test Coverage | 9/10 | PASS |
| Code Quality | 8/10 | PASS |
| Performance | 7.5/10 | **BELOW THRESHOLD** |
| DevOps | 8/10 | PASS |
| Runability | 8.5/10 | PASS |

**Overall Score: 8.0/10 — GATE FAILED**

### Improvement Plan to Restore Gate PASS

**Security 7.5 → 8.0 (3 items):**
1. Add payment status check in refund service — prevents refunds on non-completed payments (RISK-044)
2. Fail hard on missing API_KEY_HMAC_SECRET in production — eliminates unsalted SHA-256 fallback (RISK-050)
3. Add rate limiting on refund creation — prevents abuse (RISK-047)

**Performance 7.5 → 8.0 (2 items):**
1. Add AbortSignal.timeout(15s) to all blockchain RPC calls — prevents indefinite hangs (RISK-045)
2. Cache decrypted webhook secrets with TTL — eliminates per-delivery decryption overhead (RISK-related to performance)

**Estimated effort:** 3-5 items, each under 1 day. After completion, re-audit should show both dimensions at 8/10 or above.

Remaining Phase 1 items (CSRF, httpOnly tokens, role in refresh JWT, API port binding) would bring Security to 9/10 and Enterprise Readiness to 8.5/10. These are recommended but no longer blocking the score gate.
