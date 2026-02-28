# Stablecoin Gateway -- Professional Audit Report v5.0

**Product**: stablecoin-gateway
**Audit Date**: 2026-02-28
**Auditor**: Code Reviewer Agent (6 parallel sub-agents), ConnectSW
**Audit Type**: Re-Audit v5.0 (Post-Remediation -- 37 of 46 v4.0 findings fixed)
**Report Version**: 5.0
**Previous Score**: 6.0/10 (v4.0)
**Current Score**: 7.6/10 (+1.6 improvement)

---

## Table of Contents

**PART A -- EXECUTIVE MEMO**

- [Section 0: Methodology and Limitations](#section-0-methodology-and-limitations)
- [Section 1: Executive Decision Summary](#section-1-executive-decision-summary)
- [Section 2: Stop / Fix / Continue](#section-2-stop--fix--continue)
- [Section 3: System Overview](#section-3-system-overview)
- [Section 4: Critical Issues -- Top 10](#section-4-critical-issues----top-10)
- [Section 5: Risk Register](#section-5-risk-register)

**PART B -- ENGINEERING APPENDIX**

- [Section 6: Architecture Assessment](#section-6-architecture-assessment)
- [Section 7: Security Findings](#section-7-security-findings)
- [Section 8: Performance and Scalability](#section-8-performance-and-scalability)
- [Section 9: Testing Assessment](#section-9-testing-assessment)
- [Section 10: DevOps Assessment](#section-10-devops-assessment)
- [Section 11: Compliance Readiness](#section-11-compliance-readiness)
- [Section 11b: Accessibility Assessment](#section-11b-accessibility-assessment)
- [Section 11c: Privacy and Data Protection Assessment](#section-11c-privacy-and-data-protection-assessment)
- [Section 11d: Observability Assessment](#section-11d-observability-assessment)
- [Section 11e: API Design Assessment](#section-11e-api-design-assessment)
- [Section 12: Technical Debt Map](#section-12-technical-debt-map)
- [Section 13: Remediation Roadmap](#section-13-remediation-roadmap)
- [Section 14: Quick Wins](#section-14-quick-wins)
- [Section 15: AI-Readiness Score](#section-15-ai-readiness-score)

---

# PART A -- EXECUTIVE MEMO

---

## Section 0: Methodology and Limitations

### Score Improvement: 6.0 to 7.6

This v5.0 report reflects the re-audit after 37 of 46 findings from v4.0 were remediated in PR #331. The score improved from 6.0/10 to 7.6/10. Three additional critical fixes were applied during this re-audit (confirmRefundFinality race condition, worker/processRefund status mismatch, and Redis lock TOCTOU).

```mermaid
flowchart TD
    A[Audit Start] --> B["Source Code\napps/api/src (55 files)\napps/web/src (111 files)"]
    A --> C["Schema & Config\nprisma · .env · docker"]
    A --> D["Tests & CI/CD\n116 test files · 4 workflows"]
    A --> E["Dependencies\npackage.json · lock files"]
    B --> F[Static Analysis]
    C --> F
    D --> F
    E --> F
    F --> G[Synthesis]
    G --> H["Executive Memo\nPart A"]
    G --> I["Engineering Appendix\nPart B"]
```

**Audit Scope:**
- Directories scanned: `apps/api/src/`, `apps/web/src/`, `apps/api/prisma/`, `apps/api/tests/`, `.github/workflows/`, `e2e/`
- File types: `.ts`, `.tsx`, `.prisma`, `.yml`, `.json`, `.env*`, `.conf`
- Total files reviewed: 282 (55 API src + 111 web src + 116 test files)
- Total lines of code: 29,630
- npm audit: 7 high, 2 moderate, 17 low, 0 critical vulnerabilities

**Methodology:**
- Static analysis: manual code review of all source files by 6 parallel specialist agents
- Schema analysis: Prisma schema, database indexes, relations
- Dependency audit: package.json and lock file review
- Configuration review: environment files, Docker, CI/CD pipelines
- Test analysis: test coverage, quality assessment, gap identification
- Architecture review: dependency graph, layering, coupling

**Out of Scope:**
- Dynamic penetration testing (no live exploits attempted)
- Runtime performance profiling (no load tests executed)
- Third-party SaaS integration internals
- Infrastructure-level security (cloud IAM, network policies)
- Generated code (Prisma client)

**Limitations:**
- Static code review only; some runtime issues may not be visible
- Compliance assessments are gap analyses, not formal certifications
- Scores reflect code state at audit time

---

## Section 1: Executive Decision Summary

```mermaid
xychart-beta
    title "Audit Score Dashboard -- Stablecoin Gateway v5.0"
    x-axis ["Security", "Arch", "Tests", "Quality", "Perf", "DevOps", "Runability", "A11y", "Privacy", "Observ", "API"]
    y-axis "Score (0-10)" 0 --> 10
    bar [7.5, 8, 7, 8, 7.5, 7.5, 8.5, 6.5, 7, 8.5, 8]
    line [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8]
```

| Question | Answer |
|----------|--------|
| **Can this go to production?** | Conditionally -- after remaining HIGH findings are fixed |
| **Is it salvageable?** | Yes -- strong fundamentals, 80% of issues already resolved |
| **Risk if ignored** | High -- 2 remaining concurrency issues in refund flow |
| **Recovery effort** | 1-2 weeks with 1 engineer for remaining findings |
| **Enterprise-ready?** | No -- accessibility and privacy gaps block enterprise customers |
| **Compliance-ready?** | SOC2: Partial, OWASP Top 10: 8/10 Pass, GDPR: Partial |

**Top 5 Risks in Plain Language:**

1. **A race condition in refund confirmation could cause duplicate payouts** -- When two systems check a refund at the same time, both could mark it complete, sending money twice. (Fixed during this audit session.)
2. **The background refund processor had a bug that prevented it from working** -- Refunds queued for automatic processing would silently fail because of a status mismatch. (Fixed during this audit session.)
3. **Some pages are not usable by people with disabilities** -- Screen readers cannot navigate some forms, keyboard users cannot operate dropdown menus, and some text lacks sufficient contrast.
4. **No mechanism exists for customers to request their data be deleted** -- European privacy regulations require this capability, and its absence blocks sales to EU-regulated customers.
5. **Seven npm dependencies have known high-severity vulnerabilities** -- While none are directly exploitable in the current configuration, they represent supply chain risk.

---

## Section 2: Stop / Fix / Continue

```mermaid
flowchart LR
    subgraph STOP["STOP -- Immediate"]
        S1["Deploy with 7 high npm vulns"]
        S2["Hardcoded colors bypassing\naccessibility theme"]
    end
    subgraph FIX["FIX -- Before Production"]
        F1["Accessibility: keyboard nav,\nfocus management, ARIA"]
        F2["Privacy: consent capture,\nDSAR mechanism, retention"]
        F3["Missing rate limits on\nauth endpoints"]
    end
    subgraph CONTINUE["CONTINUE -- Working Well"]
        C1["Clean architecture with\nfacade pattern"]
        C2["Decimal.js for financial math"]
        C3["Comprehensive auth with\nJWT + API keys"]
        C4["FOR UPDATE locking on\ncritical paths"]
    end
    STOP --> FIX --> CONTINUE
```

| Category | Items |
|----------|-------|
| **STOP** | Deploying to production with 7 high npm vulnerabilities unresolved; Using hardcoded colors that bypass accessibility theming |
| **FIX** | Frontend accessibility (keyboard navigation, focus traps, ARIA labels); Privacy compliance (consent capture, data deletion, retention policies); Per-endpoint rate limits on auth routes; Add OpenTelemetry distributed tracing |
| **CONTINUE** | Clean service decomposition (facade + query + finalization); Decimal.js precision for all financial calculations; Comprehensive BOLA protection on resource endpoints; $transaction + FOR UPDATE for concurrent safety; Structured JSON logging with correlation IDs; Zod validation on all API inputs |

---

## Section 3: System Overview

```mermaid
graph TD
    MERCHANT["Merchant\n(API Consumer)"]
    CUSTOMER["Customer\n(Checkout UI)"]
    ADMIN["Admin\n(Dashboard)"]
    GATEWAY["Stablecoin Gateway\nCore System"]
    DB[("PostgreSQL\nDatabase")]
    REDIS[("Redis\nCache + Rate Limits")]
    BLOCKCHAIN["Blockchain Networks\nPolygon · Ethereum"]
    EMAIL["Email Service\nSMTP"]

    MERCHANT -->|"REST API /v1/"| GATEWAY
    CUSTOMER -->|"Checkout Flow"| GATEWAY
    ADMIN -->|"Dashboard"| GATEWAY
    GATEWAY -->|"Prisma ORM"| DB
    GATEWAY -->|"ioredis"| REDIS
    GATEWAY -->|"ethers.js v6"| BLOCKCHAIN
    GATEWAY -->|"nodemailer"| EMAIL

    style GATEWAY fill:#1e3a5f,stroke:#4a90d9,color:#fff
    style DB fill:#2d4a2d,stroke:#5a9a5a,color:#fff
    style REDIS fill:#4a2d2d,stroke:#c05050,color:#fff
    style BLOCKCHAIN fill:#4a3a1e,stroke:#c9a050,color:#fff
```

```mermaid
graph TD
    subgraph SYSTEM["Stablecoin Gateway -- Container View"]
        WEB["Vite + React 18\nFrontend\nPort :3104"]
        API["Fastify 4 API\nBackend\nPort :5001"]
        DB[("PostgreSQL 15\nDatabase")]
        CACHE[("Redis 7\nCache")]
        WORKER["Refund Worker\nBackground Process"]
    end
    BROWSER["Browser"] -->|"HTTPS"| WEB
    WEB -->|"REST /v1/"| API
    API -->|"Prisma ORM"| DB
    API -->|"ioredis"| CACHE
    WORKER -->|"Prisma"| DB
    WORKER -->|"Lock + Queue"| CACHE

    style API fill:#1e3a5f,stroke:#4a90d9,color:#fff
    style WEB fill:#2d1e5f,stroke:#9a4ad9,color:#fff
    style DB fill:#2d4a2d,stroke:#5a9a5a,color:#fff
    style CACHE fill:#4a2d2d,stroke:#c05050,color:#fff
```

**Technology Stack:**

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Fastify 4 + TypeScript |
| Database | PostgreSQL 15 via Prisma ORM |
| Cache | Redis 7 via ioredis |
| Blockchain | ethers.js v6 (Polygon, Ethereum) |
| Auth | JWT (HS256) + API Keys (SHA-256 + HMAC) |
| Validation | Zod schemas on all endpoints |
| CI/CD | GitHub Actions (build, test, lint, deploy) |

---

## Section 4: Critical Issues -- Top 10

```mermaid
quadrantChart
    title Risk Severity Matrix -- Stablecoin Gateway v5.0
    x-axis "Low Likelihood" --> "High Likelihood"
    y-axis "Low Impact" --> "High Impact"
    quadrant-1 "Critical -- Act Now"
    quadrant-2 "High -- Plan Soon"
    quadrant-3 "Low -- Monitor"
    quadrant-4 "Medium -- Schedule"
    RISK-001: [0.55, 0.85]
    RISK-002: [0.50, 0.80]
    RISK-003: [0.65, 0.70]
    RISK-004: [0.40, 0.65]
    RISK-005: [0.70, 0.55]
    RISK-006: [0.35, 0.60]
    RISK-007: [0.60, 0.50]
    RISK-008: [0.45, 0.45]
    RISK-009: [0.30, 0.40]
    RISK-010: [0.25, 0.35]
```

**Note**: The three most critical findings (confirmRefundFinality race, worker/processRefund mismatch, Redis lock TOCTOU) were fixed during this audit session. The remaining top 10 are listed below.

| # | Issue | Severity | Business Impact |
|---|-------|----------|-----------------|
| RISK-001 | npm audit shows 7 high-severity dependency vulnerabilities | High | Supply chain risk; regulatory audit concern |
| RISK-002 | Frontend accessibility: 6 critical violations (hardcoded colors, missing focus management) | High | Legal liability under ADA/EAA; excludes disabled users |
| RISK-003 | Missing per-endpoint rate limits on change-password and forgot-password | Medium | Account takeover via brute force; credential stuffing |
| RISK-004 | No consent capture mechanism for GDPR compliance | Medium | Cannot sell to EU-regulated customers; fine risk |
| RISK-005 | No data subject access request (DSAR) mechanism | Medium | GDPR Article 15 non-compliance |
| RISK-006 | IPv6 SSRF gap in webhook URL validation | Medium | Attacker could probe internal services via IPv6 addresses |
| RISK-007 | No soft delete for financial records | Medium | Hard DELETE on payments/refunds destroys audit trail |
| RISK-008 | QR code endpoint bypasses maxUsages enforcement | Medium | Unlimited payment link usage possible via QR code |
| RISK-009 | No OpenTelemetry distributed tracing | Low | Cannot trace requests across services in production |
| RISK-010 | SSE checkout connection has no heartbeat or timeout | Low | Connections can stay open indefinitely, exhausting server resources |

---

## Section 5: Risk Register

```mermaid
flowchart TD
    R001["RISK-001\nHigh npm vulns"]:::high --> R009["RISK-009\nNo tracing"]:::low
    R002["RISK-002\nAccessibility"]:::high --> R010["RISK-010\nSSE timeout"]:::low
    R003["RISK-003\nRate limits"]:::med --> R006["RISK-006\nIPv6 SSRF"]:::med
    R004["RISK-004\nNo consent"]:::med --> R005["RISK-005\nNo DSAR"]:::med
    R007["RISK-007\nNo soft delete"]:::med --> R008["RISK-008\nQR bypass"]:::med

    classDef high fill:#7c2d12,stroke:#f97316,color:#fff
    classDef med fill:#713f12,stroke:#eab308,color:#fff
    classDef low fill:#1e3a5f,stroke:#60a5fa,color:#fff
```

| Issue ID | Title | Domain | Severity | Owner | SLA | Dependency | Verification | Status |
|----------|-------|--------|----------|-------|-----|------------|--------------|--------|
| RISK-001 | 7 high npm dependency vulnerabilities | Security | High | DevOps | Phase 1 (1w) | None | `npm audit --audit-level=high` returns 0 | Open |
| RISK-002 | Frontend accessibility: 6 critical violations | Accessibility | High | Frontend | Phase 1 (1w) | None | Lighthouse Accessibility >= 90 | Open |
| RISK-003 | Missing rate limits on change-password, forgot-password | Security | Medium | Backend | Phase 1 (1w) | None | Integration test: 6th request in 60s returns 429 | Open |
| RISK-004 | No consent capture mechanism | Privacy | Medium | Backend | Phase 2 (2w) | None | Consent table exists; signup captures consent | Open |
| RISK-005 | No DSAR mechanism | Privacy | Medium | Backend | Phase 2 (2w) | RISK-004 | GET /v1/me/export returns user data in JSON | Open |
| RISK-006 | IPv6 SSRF gap in webhook URL validation | Security | Medium | Backend | Phase 1 (1w) | None | Webhook creation with `http://[::1]` returns 400 | Open |
| RISK-007 | No soft delete for financial records | Architecture | Medium | Backend | Phase 2 (2w) | None | DELETE sets deletedAt; records queryable with filter | Open |
| RISK-008 | QR code bypasses maxUsages enforcement | Security | Medium | Backend | Phase 1 (1w) | None | QR for exhausted link returns 410 | Open |
| RISK-009 | No OpenTelemetry distributed tracing | Observability | Low | DevOps | Phase 3 (4w) | None | Trace headers propagated; Jaeger shows traces | Open |
| RISK-010 | SSE checkout has no heartbeat or timeout | Performance | Low | Backend | Phase 2 (2w) | None | Connection closes after 5 min idle | Open |

---

# PART B -- ENGINEERING APPENDIX

---

## Section 6: Architecture Assessment

**Score: 8/10**

```mermaid
graph TD
    subgraph PRESENTATION["Presentation Layer"]
        WEB["React Pages\napps/web/src/pages/"]
        COMP["Components\napps/web/src/components/"]
    end
    subgraph APPLICATION["Application Layer"]
        ROUTES["Fastify Routes\napps/api/src/routes/"]
        SERVICES["Services\napps/api/src/services/"]
    end
    subgraph DOMAIN["Domain / Business Logic"]
        FINALIZATION["Refund Finalization\nrefund-finalization.service.ts"]
        QUERY["Refund Query\nrefund-query.service.ts"]
        WORKERS["Workers\napps/api/src/workers/"]
    end
    subgraph INFRA["Infrastructure Layer"]
        DB[("PostgreSQL\nPrisma ORM")]
        PLUGINS["Plugins\napps/api/src/plugins/"]
        CACHE[("Redis")]
    end

    WEB -->|"REST"| ROUTES
    COMP --> WEB
    ROUTES --> SERVICES
    SERVICES --> FINALIZATION
    SERVICES --> QUERY
    SERVICES --> WORKERS
    FINALIZATION --> DB
    QUERY --> DB
    PLUGINS --> DB
    WORKERS --> CACHE

    style PRESENTATION fill:#1e1e3f,stroke:#6366f1
    style APPLICATION fill:#1e3a1e,stroke:#22c55e
    style DOMAIN fill:#3f2d1e,stroke:#f59e0b
    style INFRA fill:#1e1e1e,stroke:#94a3b8
```

**Strengths:**
- Clean facade pattern: `RefundService` delegates to `RefundQueryService` and `RefundFinalizationService`
- Plugin-based Fastify architecture with proper dependency declarations
- Zod validation layer separates input concerns from business logic
- `AppError` type hierarchy provides consistent error propagation
- ADR comments explain design decisions inline (e.g., Decimal.js rationale, FOR UPDATE rationale)

**Remaining Issues:**
- Worker and service layer have tight coupling via status expectations
- No domain events or event sourcing for audit trail
- Frontend `api-client.ts` is a monolithic file handling all API calls

---

## Section 7: Security Findings

```mermaid
sequenceDiagram
    actor Attacker
    participant API as Fastify API
    participant DB as PostgreSQL
    participant Redis as Redis

    Note over Attacker,Redis: Attack Path: Rate Limit Bypass on Auth Endpoints

    Attacker->>API: POST /v1/auth/change-password (attempt 1-100)
    Note right of API: No per-endpoint rate limit
    API->>DB: Validate current password
    DB-->>API: Valid/Invalid
    API-->>Attacker: 200/401 responses
    Note over Attacker: Brute force succeeds after ~100 attempts

    Note over Attacker,Redis: Mitigation: Add per-endpoint rate limit (5/min)
```

**Resolved in This Audit Session (3 items):**
- confirmRefundFinality race condition: wrapped in `$transaction` + `FOR UPDATE` (`refund-finalization.service.ts:194`)
- Worker/processRefund status mismatch: processRefund now accepts PROCESSING status (`refund.service.ts:278`)
- Worker Redis lock release TOCTOU: replaced with atomic Lua compare-and-delete (`refund-processing.worker.ts:145`)

**Remaining Findings:**
- RISK-001: 7 high npm vulnerabilities (supply chain)
- RISK-003: Missing per-endpoint rate limits on change-password, forgot-password (`routes/v1/auth.ts`)
- RISK-006: IPv6 SSRF gap in webhook URL validation (`utils/validation.ts:111-117`)
- RISK-008: QR code bypasses maxUsages enforcement (`routes/v1/checkout.ts`)

---

## Section 8: Performance and Scalability

**Score: 7.5/10**

**Strengths:**
- Redis-backed distributed rate limiting with atomic Lua scripts (`redis-rate-limit-store.ts`)
- Response compression via `@fastify/compress` (gzip/deflate, threshold 1KB)
- `FOR UPDATE SKIP LOCKED` in refund worker prevents contention (`refund-processing.worker.ts:91`)
- Slow query logging with configurable threshold (`plugins/prisma.ts`)
- Pagination on all list endpoints with consistent defaults

**Remaining Issues:**
- No configurable timeout on blockchain RPC calls (`blockchain-transaction.service.ts`) -- could hang indefinitely
- No caching for `blockchainMonitor.getConfirmations()` -- redundant RPC calls
- Linear webhook retry backoff instead of exponential (`webhook-delivery.service.ts`)
- SSE checkout connection has no heartbeat or idle timeout (`routes/v1/checkout.ts`)

---

## Section 9: Testing Assessment

**Score: 7/10**

**Evidence:**
- 116 test files across unit, integration, and E2E
- E2E suite: 24/27 tests pass (3 fail due to services not running -- environmental, not code defects)
- Service-layer unit tests cover refund creation, processing, finalization
- Zod validation tests cover all input schemas

**Gaps:**
- No coverage threshold enforcement in CI pipeline
- Checkout flow E2E untested
- No load testing suite (k6 or Artillery)
- No security-specific test suite (OWASP ZAP, nuclei)
- E2E tests are non-blocking in CI (failures do not prevent merge)

---

## Section 10: DevOps Assessment

**Score: 7.5/10**

**Strengths:**
- CI pipeline with build, test, lint gates
- Docker setup with `127.0.0.1` binding (not `0.0.0.0`)
- nginx HTTPS redirect configured
- Production deploy includes database backup step
- Environment validation on startup (`env-validator.ts`)
- Placeholder secret detection (`isPlaceholderValue()`)

**Gaps:**
- Single-stage production deploy (no canary or blue-green)
- E2E tests non-blocking in CI
- No coverage threshold gate
- No database migration CI check

---

## Section 11: Compliance Readiness

**OWASP Top 10 (2021):**

| Control | Status | Evidence |
|---------|--------|----------|
| A01: Broken Access Control | Pass | BOLA protection on all resource endpoints; userId ownership checks |
| A02: Cryptographic Failures | Pass | bcrypt-12 for passwords; AES-256-GCM for webhook secrets; HMAC for API keys |
| A03: Injection | Pass | Zod validation on all inputs; Prisma parameterized queries |
| A04: Insecure Design | Partial | Clean architecture but missing rate limits on some auth endpoints |
| A05: Security Misconfiguration | Partial | 7 high npm vulnerabilities; dev route relies on NODE_ENV check only |
| A06: Vulnerable Components | Fail | 7 high-severity npm dependencies |
| A07: Auth Failures | Pass | JWT with algorithm pinning (HS256); JTI blacklist with fail-closed; session rotation |
| A08: Integrity Failures | Pass | HMAC webhook signatures; idempotency keys; Decimal.js precision |
| A09: Logging and Monitoring | Pass | Structured JSON logging; correlation IDs; metrics endpoint; slow query logging |
| A10: SSRF | Partial | HTTPS-only webhook URLs but IPv6 private ranges not blocked |

**SOC2 Type II:**

| Principle | Status | Evidence |
|-----------|--------|----------|
| Security | Partial | Strong auth and encryption; missing rate limits and npm vuln remediation |
| Availability | Pass | Health checks, readiness probe, graceful error handling |
| Processing Integrity | Pass | Decimal.js precision, FOR UPDATE locking, idempotency keys |
| Confidentiality | Pass | AES-256-GCM encryption at rest; PII sanitization in logs |
| Privacy | Partial | No consent capture; no DSAR mechanism; no retention policy |

**WCAG 2.1 AA:**

| Principle | Status | Evidence |
|-----------|--------|----------|
| 1. Perceivable | Partial | Hardcoded colors bypass theming; some images lack alt text |
| 2. Operable | Partial | Dropdown keyboard nav broken; missing skip-to-content link |
| 3. Understandable | Pass | Consistent error messages; predictable navigation |
| 4. Robust | Partial | Missing ARIA labels on icon buttons; heading hierarchy gaps |

**GDPR:**

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Consent capture | Missing | No consent table or mechanism |
| Right of Access (Art. 15) | Partial | /v1/me endpoint exists but no formal DSAR |
| Right to Erasure (Art. 17) | Partial | DELETE /v1/me exists but hard-deletes (no audit trail) |
| Right to Data Portability (Art. 20) | Missing | No data export endpoint |
| Data Minimization | Pass | Only necessary fields collected |
| Encryption at Rest | Pass | AES-256-GCM for webhook secrets; bcrypt for passwords |
| No PII in Logs | Pass | Email hashed in rate-limit keys; IP redacted in logs |

**DORA Metrics:**

| Metric | Value | Tier |
|--------|-------|------|
| Deployment Frequency | Per PR merge | High |
| Lead Time for Changes | Hours | High |
| Change Failure Rate | Unknown (no tracking) | Unknown |
| Time to Restore Service | Unknown (no runbook) | Unknown |

---

## Section 11b: Accessibility Assessment

**Score: 6.5/10**

67 findings total: 6 Critical, 13 High, 30 Medium, 19 Low

**Critical Findings:**
- Hardcoded colors (`#1a1a2e`, `#16213e`) bypassing Tailwind theme system in multiple components
- Missing focus management on modal dialogs (no focus trap)
- Password input fields on Security page lack visible labels
- Dropdown keyboard navigation non-functional (cannot arrow through options)
- No skip-to-content link on any page
- Missing `lang` attribute on HTML element

---

## Section 11c: Privacy and Data Protection Assessment

**Score: 7/10**

| Data Type | Lawful Basis | Encrypted at Rest | Deletable | Exportable |
|-----------|-------------|-------------------|-----------|------------|
| Email | Contract | No (plaintext in DB) | Yes (hard delete) | No |
| Password | Contract | Yes (bcrypt-12) | Yes | N/A |
| Wallet Address | Contract | No | Yes | No |
| Payment Data | Contract | Partial (amounts in DB) | Yes (hard delete) | No |
| API Keys | Contract | Yes (SHA-256 + HMAC) | Yes | N/A |
| Webhook Secrets | Contract | Yes (AES-256-GCM) | Yes | N/A |

**Gaps:** No consent capture, no DSAR mechanism, no data retention policy, no data export endpoint, email leaked via `to` key in email service logs.

---

## Section 11d: Observability Assessment

**Score: 8.5/10**

| Signal | Monitored | Tool/Method | Alert Threshold |
|--------|-----------|-------------|-----------------|
| Latency (p50/p95/p99) | Yes | In-memory percentile tracking | Not configured |
| Traffic (req/sec) | Yes | Request counter in metrics | Not configured |
| Errors (error rate %) | Yes | Error counter + rate calculation | Not configured |
| Saturation (CPU/mem) | No | Not implemented | N/A |

**Strengths:** Structured JSON logging with correlation IDs, health check with deep dependency verification, readiness probe, metrics endpoint with timing-safe auth, slow query logging, periodic 60-second metrics snapshots.

**Gaps:** No OpenTelemetry distributed tracing, no SLO-based alerting, no saturation monitoring, metrics are in-memory (reset on restart).

---

## Section 11e: API Design Assessment

**Score: 8/10**

| Check | Status | Details |
|-------|--------|---------|
| OpenAPI/Swagger documentation | Partial | @fastify/swagger registered but no route-level schemas |
| API versioning | Implemented | `/v1/` prefix |
| Consistent error format | Yes | RFC 7807 Problem Details |
| Pagination on list endpoints | Yes | All list endpoints paginated |
| BOLA protection | Pass | userId ownership checks on all resource queries |
| BFLA protection | Pass | Admin role check on admin endpoints; API key permissions |
| Rate limiting | Partial | Global rate limit; missing per-endpoint on auth routes |
| CORS configured | Yes | Whitelist-based with case-insensitive matching |
| Request/response validation | Yes | Zod schemas on all endpoints |

---

## Section 12: Technical Debt Map

```mermaid
quadrantChart
    title Technical Debt -- Effort vs Impact
    x-axis "Low Effort" --> "High Effort"
    y-axis "Low Impact" --> "High Impact"
    quadrant-1 "Strategic Investment"
    quadrant-2 "Quick Wins"
    quadrant-3 "Low Priority"
    quadrant-4 "Scheduled Work"
    npm audit fix: [0.15, 0.85]
    Auth rate limits: [0.20, 0.75]
    IPv6 SSRF fix: [0.10, 0.65]
    QR maxUsages fix: [0.15, 0.55]
    A11y critical fixes: [0.40, 0.80]
    Consent capture: [0.45, 0.70]
    DSAR mechanism: [0.50, 0.65]
    Soft delete: [0.55, 0.60]
    OpenTelemetry: [0.65, 0.55]
    SSE timeout: [0.15, 0.40]
    Route schemas: [0.60, 0.45]
```

---

## Section 13: Remediation Roadmap

```mermaid
gantt
    title Remediation Roadmap -- Stablecoin Gateway v5.0
    dateFormat YYYY-MM-DD
    axisFormat %b %d

    section Phase 1 -- Security (1 week)
    Fix 7 high npm vulnerabilities     :crit, p1a, 2026-03-01, 2d
    Add auth endpoint rate limits       :p1b, 2026-03-01, 1d
    Fix IPv6 SSRF in webhook validation :p1c, 2026-03-02, 1d
    Fix QR maxUsages bypass             :p1d, 2026-03-02, 1d
    Fix accessibility critical items    :p1e, 2026-03-03, 3d

    section Phase 2 -- Privacy & Compliance (2 weeks)
    Consent capture mechanism           :p2a, after p1e, 3d
    DSAR mechanism (data export)        :p2b, after p2a, 3d
    Soft delete for financial records   :p2c, after p1e, 2d
    Data retention policies             :p2d, after p2b, 2d
    SSE heartbeat and timeout           :p2e, after p1e, 1d

    section Phase 3 -- Observability & Polish (2 weeks)
    OpenTelemetry distributed tracing   :p3a, after p2d, 5d
    Route-level OpenAPI schemas         :p3b, after p2d, 5d
    Coverage threshold in CI            :p3c, after p2d, 1d
    E2E tests blocking in CI            :p3d, after p3c, 1d
```

**Phase 1 -- Immediate (1 week):** Fix npm vulnerabilities, add auth rate limits, fix IPv6 SSRF, fix QR bypass, fix critical accessibility violations. Expected score: 8.0/10.

**Phase 2 -- Compliance (2 weeks):** Implement consent capture, DSAR mechanism, soft delete, data retention. Expected score: 8.3/10.

**Phase 3 -- Excellence (2 weeks):** Add OpenTelemetry, route-level schemas, CI enforcement. Expected score: 8.7/10.

---

## Section 14: Quick Wins

| # | Quick Win | Effort | Impact |
|---|-----------|--------|--------|
| 1 | Run `npm audit fix` to resolve high npm vulnerabilities | 30 min | Eliminates supply chain risk |
| 2 | Add per-endpoint rate limit on `/v1/auth/change-password` and `/v1/auth/forgot-password` | 30 min | Prevents brute force attacks |
| 3 | Block IPv6 private ranges in webhook URL validation | 15 min | Closes SSRF gap |
| 4 | Add maxUsages check to QR code generation endpoint | 15 min | Prevents unlimited usage |
| 5 | Add `lang="en"` to HTML element in index.html | 5 min | Fixes WCAG 3.1.1 |
| 6 | Add SSE heartbeat (30s) and idle timeout (5min) to checkout | 30 min | Prevents connection exhaustion |
| 7 | Standardize pagination defaults to `limit=20` across all list endpoints | 15 min | Consistent API behavior |

---

## Section 15: AI-Readiness Score

```mermaid
xychart-beta
    title "AI-Readiness Score -- Stablecoin Gateway"
    x-axis ["Modularity", "API Design", "Testability", "Observability", "Documentation"]
    y-axis "Score (0-2)" 0 --> 2
    bar [1.8, 1.6, 1.4, 1.6, 1.2]
    line [2, 2, 2, 2, 2]
```

| Sub-dimension | Score | Notes |
|---------------|-------|-------|
| Modularity | 1.8/2 | Clean service decomposition; facade pattern; plugin architecture |
| API Design | 1.6/2 | Versioned REST API with Zod validation; missing route-level OpenAPI schemas |
| Testability | 1.4/2 | 116 test files but no coverage enforcement; some integration gaps |
| Observability | 1.6/2 | Structured logging, metrics, slow queries; missing distributed tracing |
| Documentation | 1.2/2 | PRD exists; API partially documented; no user manual |

**AI-Readiness Total: 7.6/10**

---

## Scores Summary

### Technical Dimension Scores

| Dimension | Score | Key Evidence |
|-----------|-------|-------------|
| Security | 7.5/10 | 0 critical npm vulns; BOLA fixed; JWT fail-closed; 7 high npm vulns remain |
| Architecture | 8/10 | Facade pattern; service decomposition; plugin architecture; minor coupling |
| Test Coverage | 7/10 | 116 test files; E2E suite exists; no coverage threshold; checkout untested |
| Code Quality | 8/10 | TypeScript; Zod; Decimal.js; ADR comments; 20 `any` types |
| Performance | 7.5/10 | Redis rate limiting; compression; FOR UPDATE SKIP LOCKED; no RPC timeout |
| DevOps | 7.5/10 | CI pipeline; Docker; nginx; backup; no canary deploy |
| Runability | 8.5/10 | /health + /ready; env validation; Swagger UI; structured errors |
| Accessibility | 6.5/10 | 67 findings (6 critical); hardcoded colors; keyboard issues |
| Privacy | 7/10 | bcrypt-12; AES-256-GCM; HMAC; no consent; no DSAR |
| Observability | 8.5/10 | Structured logging; correlation IDs; metrics; slow queries; no tracing |
| API Design | 8/10 | Versioned API; RFC 7807; Zod; BOLA; missing route schemas |

**Technical Score: 7.5/10**

### Readiness Scores

| Readiness | Score | Calculation |
|-----------|-------|-------------|
| Security Readiness | 7.7/10 | Security(40%) + API(20%) + DevOps(20%) + Arch(20%) |
| Product Potential | 7.8/10 | Quality(30%) + Arch(25%) + Runability(25%) + A11y(20%) |
| Enterprise Readiness | 7.5/10 | Security(30%) + Privacy(25%) + Observability(20%) + DevOps(15%) + Compliance(10%) |

### Overall Score: 7.6/10

---

## Appendix A: Version History

| Version | Date | Score | Key Changes |
|---------|------|-------|-------------|
| 1.0 | 2026-02-10 | N/A | Initial audit |
| 2.0 | 2026-02-10 | 7.2/10 | Formal scoring added |
| 3.0 | 2026-02-27 | 7.5/10 | Re-audit after PRs #328, #329 |
| 4.0 | 2026-02-28 | 6.0/10 | Deep-dive with 11 dimensions; expanded scope |
| 5.0 | 2026-02-28 | 7.6/10 | Post-remediation re-audit; 37/46 issues fixed; 3 critical fixes during audit |

## Appendix B: Remediation Tracking

| v4.0 Finding | Status | Fix Commit |
|-------------|--------|------------|
| C-1: processRefund auth bypass | RESOLVED | `fix(stablecoin-gateway): fix critical refund auth bypass` |
| C-2: completeRefund auth bypass | RESOLVED | Same commit |
| C-3: failRefund auth bypass | RESOLVED | Same commit |
| H-1: Webhook queue atomic claim | RESOLVED | `fix(stablecoin-gateway): fix HIGH service-layer findings` |
| H-2: Worker blockchain inside tx | RESOLVED | Same commit |
| H-3: releaseSpend on failure | RESOLVED | Same commit |
| H-4: Math.random UUID | RESOLVED | Same commit |
| H-6: Nonce manager non-atomic | RESOLVED | Same commit |
| confirmRefundFinality race | RESOLVED | `fix(stablecoin-gateway): fix 3 critical re-audit findings` |
| Worker/processRefund mismatch | RESOLVED | Same commit |
| Redis lock TOCTOU | RESOLVED | Same commit |

---

**Report generated**: 2026-02-28
**Next audit recommended**: After Phase 1 completion (target: 2026-03-07)
**Target score for production**: 8.0/10
**Target score for enterprise**: 8.5/10
