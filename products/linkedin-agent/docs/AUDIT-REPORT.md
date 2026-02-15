# LinkedIn Agent — Audit Report

**Date**: February 15, 2026
**Auditor**: ConnectSW Code Reviewer Agent
**Product**: LinkedIn Agent (AI-powered LinkedIn content assistant)
**Branch**: `foundation/linkedin-agent`

---

# PART A — EXECUTIVE MEMO

---

## Section 0: Methodology and Limitations

**Audit Scope:**
- Directories scanned: `apps/api/src/`, `apps/api/tests/`, `apps/api/prisma/`, `apps/web/src/`, `apps/web/tests/`
- File types: `.ts`, `.tsx`, `.prisma`, `.json`, `.js`, `.env.example`
- Total source files reviewed: 28
- Total test files reviewed: 13
- Total lines of production code analyzed: 2,227
- Total lines of test code analyzed: 1,369

**Methodology:**
- Static analysis: manual code review of all source and test files
- Schema analysis: Prisma schema, database indexes, relations, constraints
- Dependency audit: `package.json` review for both API and web apps
- Configuration review: environment validation, CORS, security headers, Next.js config
- Test analysis: test coverage assessment, test quality, gap identification
- Architecture review: dependency graph, layering, service separation

**Out of Scope:**
- Dynamic penetration testing (no live exploit attempts)
- Runtime performance profiling (no load tests executed)
- Third-party library internals
- Infrastructure-level security (cloud IAM, network policies)
- Generated code (Prisma client)

**Limitations:**
- This audit is based on static code review. Runtime issues (memory leaks, race conditions under load) may only manifest at runtime.
- Compliance assessments are technical gap analyses, not formal certifications.
- Scores reflect the code at the time of audit.

---

## Section 1: Executive Decision Summary

| Question | Answer |
|----------|--------|
| **Can this go to production?** | Conditionally — after Phase 1 fixes (1-2 weeks) |
| **Is it salvageable?** | Yes — strong foundation, well-architected |
| **Risk if ignored** | High — open API allows unbounded cost generation |
| **Recovery effort** | 2-3 weeks with 1 engineer |
| **Enterprise-ready?** | No — missing authentication, rate limiting, CI/CD |
| **Compliance-ready?** | SOC2: No, OWASP Top 10: Partial (6/10 pass) |

### Top 5 Risks in Plain Language

1. **Anyone can generate expensive AI content** — The API has no authentication. Any person who discovers the server URL can trigger AI model calls that cost real money, with no spending limits.

2. **No protection against abuse** — There is no rate limiting. A single user or bot could send thousands of requests per minute, exhausting the AI budget or crashing the system.

3. **Carousel generation can lose data** — When regenerating carousel slides, old slides are deleted before new ones are confirmed. If the AI call fails mid-process, the post loses all its carousel content with no recovery.

4. **AI responses are not validated** — The system trusts that AI models return properly formatted content. If a model returns garbage, the system silently stores it or shows empty results to users.

5. **Build errors are hidden** — The frontend is configured to ignore TypeScript and ESLint errors during builds. Real bugs could ship to production without anyone knowing.

---

## Section 2: Stop / Fix / Continue

| Category | Items |
|----------|-------|
| **STOP** | Deploying to any public-facing environment until authentication is added. Ignoring build errors in Next.js config. |
| **FIX** | Add authentication on all non-health endpoints. Add rate limiting on AI-generation endpoints. Wrap carousel operations in database transactions. Remove `ignoreBuildErrors` from Next.js config. Add request timeouts to OpenRouter calls. |
| **CONTINUE** | Clean architecture with proper service/route separation. Zod validation on all API inputs. RFC 7807 error responses. Bilingual Arabic/English content support. OpenRouter multi-model routing. Comprehensive database schema with proper indexes. Test infrastructure (101 tests passing). |

---

## Section 3: System Overview

**Architecture:**
```
[Browser — Next.js 15 Frontend :3114]
              |
              v
[Fastify 5 API Server :5010]
   |              |              |
   v              v              v
[Prisma ORM]  [OpenRouter API]  [Security Headers]
   |              |
   v              v
[PostgreSQL]   [AI Models]
                ├── Claude Sonnet 4.5 (writing, translation)
                ├── Gemini 2.0 Flash (analysis)
                └── DALL-E 3 (images)
```

**Technology Stack:**
- Frontend: Next.js 15, React 19, Tailwind CSS, TypeScript
- Backend: Fastify 5, TypeScript, Zod validation
- Database: PostgreSQL 15+ with Prisma 6 ORM
- AI: OpenRouter multi-model routing
- Testing: Jest 29 (API), Jest 30 + React Testing Library (Web)

**Key Flows:**
1. Trend Analysis: User pastes content, Gemini Flash analyzes for topics/angles, results stored in DB
2. Post Generation: User provides topic + preferences, Claude Sonnet writes bilingual post, format recommended by Gemini
3. Carousel Generation: AI generates slide-by-slide content with image prompts from existing post

---

## Section 4: Critical Issues (Top 10)

### RISK-001: No Authentication on Any Endpoint
- **Severity**: Critical
- **Likelihood**: Certain (endpoints are publicly accessible)
- **Blast Radius**: Organization (financial loss, data exposure)
- **Risk Owner**: Security / Dev
- **Category**: Code
- **Business Impact**: Anyone who discovers the API URL can generate AI content at the company's expense. All post data is readable and modifiable without credentials.
- **Fix**: Implement JWT authentication using `@fastify/jwt`. Protect all endpoints except health checks.
- **Compliance Impact**: OWASP A01 (Broken Access Control), SOC2 Security, ISO 27001 A.9

### RISK-002: No Rate Limiting
- **Severity**: Critical
- **Likelihood**: High (trivial to exploit)
- **Blast Radius**: Organization (cost exhaustion, DoS)
- **Risk Owner**: Dev / DevOps
- **Category**: Code
- **Business Impact**: A single actor can exhaust the entire OpenRouter budget in minutes by repeatedly calling generation endpoints. No circuit breaker exists.
- **Fix**: Add `@fastify/rate-limit` with stricter limits on AI endpoints (10 req/hour for generation, 5 for carousel).
- **Compliance Impact**: OWASP A04 (Insecure Design), SOC2 Availability

### RISK-003: Carousel Delete-Then-Create Race Condition
- **Severity**: High
- **Likelihood**: Medium (happens on LLM failure during generation)
- **Blast Radius**: Feature (carousel data lost)
- **Risk Owner**: Dev
- **Category**: Code
- **Business Impact**: When regenerating carousel slides, existing slides are deleted before new ones are created. If the AI call or database insert fails, all carousel content for that post is permanently lost.
- **Fix**: Wrap the delete + create operations in a Prisma `$transaction`.
- **Compliance Impact**: SOC2 Processing Integrity

### RISK-004: Unvalidated OpenRouter API Responses
- **Severity**: High
- **Likelihood**: Medium (depends on model behavior)
- **Blast Radius**: Feature (incorrect data stored)
- **Risk Owner**: Dev
- **Category**: Code
- **Business Impact**: AI model responses are cast to TypeScript types without runtime validation. Missing usage data defaults to 0, causing incorrect cost tracking. Empty content is silently accepted.
- **Fix**: Add Zod schema validation for OpenRouter responses. Throw on missing content or usage data.
- **Compliance Impact**: SOC2 Processing Integrity

### RISK-005: Next.js Build Errors Suppressed
- **Severity**: High
- **Likelihood**: Certain (config actively hides errors)
- **Blast Radius**: Product (bugs ship undetected)
- **Risk Owner**: Dev
- **Category**: Process
- **Business Impact**: TypeScript type errors and ESLint violations are silently ignored during builds. Real bugs and security issues could reach production without detection.
- **Fix**: Remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` from `next.config.js`. Fix any surfaced errors.
- **Compliance Impact**: OWASP A04 (Insecure Design), ISO 27001 A.14

### RISK-006: No Request Timeout on OpenRouter Calls
- **Severity**: High
- **Likelihood**: Medium (LLM services have variable latency)
- **Blast Radius**: Product (server threads blocked)
- **Risk Owner**: Dev
- **Category**: Code
- **Business Impact**: `fetch()` calls to OpenRouter have no AbortController timeout. If OpenRouter hangs, the request blocks indefinitely, consuming server resources and eventually causing the API to become unresponsive.
- **Fix**: Add AbortController with 60-second timeout to all `callLLM()` fetch calls.
- **Compliance Impact**: SOC2 Availability

### RISK-007: Post Generation Not in Transaction
- **Severity**: Medium
- **Likelihood**: Low (requires DB failure at specific moment)
- **Blast Radius**: Feature (orphaned records)
- **Risk Owner**: Dev
- **Category**: Code
- **Business Impact**: Post creation and generation log creation are separate operations. If the log insert fails, the post exists without its audit trail, making cost tracking incomplete.
- **Fix**: Wrap post + generation log creation in a `$transaction`.
- **Compliance Impact**: SOC2 Processing Integrity

### RISK-008: Missing Content-Security-Policy Header
- **Severity**: Medium
- **Likelihood**: Low (requires XSS vector)
- **Blast Radius**: Product (client-side attacks)
- **Risk Owner**: Dev
- **Category**: Infrastructure
- **Business Impact**: The API sets some security headers (X-Frame-Options, HSTS) but lacks Content-Security-Policy and Permissions-Policy. This reduces defense-in-depth against injection attacks.
- **Fix**: Add CSP and Permissions-Policy headers in the `onSend` hook.
- **Compliance Impact**: OWASP A05 (Security Misconfiguration)

### RISK-009: No CI/CD Pipeline
- **Severity**: Medium
- **Likelihood**: Certain (no pipeline exists)
- **Blast Radius**: Organization (quality regression)
- **Risk Owner**: DevOps
- **Category**: Process
- **Business Impact**: No automated tests run on pull requests. No deployment pipeline. Changes can be merged without passing any quality checks.
- **Fix**: Create GitHub Actions workflow for test, lint, and build on PRs.
- **Compliance Impact**: ISO 27001 A.14, SOC2 Security

### RISK-010: No Retry Logic for LLM Calls
- **Severity**: Medium
- **Likelihood**: Medium (transient failures are common)
- **Blast Radius**: Feature (user-facing errors)
- **Risk Owner**: Dev
- **Category**: Code
- **Business Impact**: If an OpenRouter API call fails due to a transient network error or rate limit, the entire request fails immediately with no retry. Users see cryptic errors and must manually retry.
- **Fix**: Add exponential backoff retry (3 attempts) in `callLLM()` for 429 and 5xx responses.
- **Compliance Impact**: SOC2 Availability

---

## Section 5: Risk Register

| Issue ID | Title | Domain | Severity | Owner | SLA | Dependency | Verification | Status |
|----------|-------|--------|----------|-------|-----|------------|--------------|--------|
| RISK-001 | No authentication on endpoints | Security | Critical | Dev | Phase 1 (1-2w) | None | `curl -H '' /api/posts` returns 401 | Open |
| RISK-002 | No rate limiting | Security | Critical | Dev | Phase 1 (1-2w) | None | 11th request in 1 min returns 429 | Open |
| RISK-003 | Carousel delete-create race condition | Architecture | High | Dev | Phase 1 (1-2w) | None | Test: fail LLM mid-carousel, verify old slides intact | Open |
| RISK-004 | Unvalidated OpenRouter responses | Architecture | High | Dev | Phase 1 (1-2w) | None | Test: mock empty response, verify error thrown | Open |
| RISK-005 | Next.js build errors suppressed | DevOps | High | Dev | Phase 0 (48h) | None | `npx next build` with strict mode passes | Open |
| RISK-006 | No fetch timeout on LLM calls | Performance | High | Dev | Phase 1 (1-2w) | None | Test: mock hanging fetch, verify abort after 60s | Open |
| RISK-007 | Post generation not in transaction | Architecture | Medium | Dev | Phase 2 (2-4w) | None | Test: fail log insert, verify post rolled back | Open |
| RISK-008 | Missing CSP header | Security | Medium | Dev | Phase 1 (1-2w) | None | Response headers include Content-Security-Policy | Open |
| RISK-009 | No CI/CD pipeline | DevOps | Medium | DevOps | Phase 1 (1-2w) | None | PR triggers GitHub Actions workflow | Open |
| RISK-010 | No LLM call retry logic | Performance | Medium | Dev | Phase 2 (2-4w) | RISK-006 | Test: mock 429 response, verify 3 retries | Open |
| RISK-011 | Test coverage gaps (trends, carousel, generate) | Testing | Medium | QA | Phase 1 (1-2w) | None | `npm test` covers generate, trends, carousel endpoints | Open |
| RISK-012 | Frontend pages untested | Testing | Medium | QA | Phase 2 (2-4w) | None | Page-level test files exist for all 6 pages | Open |
| RISK-013 | No Fastify logger in production | DevOps | Medium | Dev | Phase 2 (2-4w) | None | Production logs include request IDs and timing | Open |
| RISK-014 | Missing database indexes | Performance | Low | Dev | Phase 2 (2-4w) | None | Explain analyze on common queries shows index usage | Open |
| RISK-015 | Hardcoded model costs | Architecture | Low | Dev | Phase 3 (4-8w) | None | Cost table fetched from OpenRouter or config file | Open |

---

# PART B — ENGINEERING APPENDIX

(For engineering team only. Contains file:line references and code examples.)

---

## Section 6: Architecture Problems

### 6.1 Carousel Race Condition (`apps/api/src/routes/carousel.ts:37-61`)

The carousel generation endpoint performs a delete-then-create pattern without transaction protection:

```typescript
// Line 37: Deletes ALL existing slides first
await fastify.prisma.carouselSlide.deleteMany({
  where: { postDraftId: id },
});

// Line 42-46: Calls external LLM (can fail)
const { slides, llmResponse } = await generateCarouselSlides(
  post.title, post.content, body.slideCount
);

// Line 49-61: Creates new slides (can partially fail)
const createdSlides = await Promise.all(
  slides.map((slide) => fastify.prisma.carouselSlide.create({ ... }))
);
```

**Fix**: Wrap in `$transaction`:
```typescript
const createdSlides = await fastify.prisma.$transaction(async (tx) => {
  await tx.carouselSlide.deleteMany({ where: { postDraftId: id } });
  // Generate slides BEFORE the transaction if possible,
  // or accept the trade-off of longer transaction hold time
  return Promise.all(slides.map((s) => tx.carouselSlide.create({ data: { ... } })));
});
```

### 6.2 Post Generation Multi-Step Without Transaction (`apps/api/src/routes/posts.ts:69-124`)

Post creation + generation log creation are separate operations. If `generationLog.createMany` fails, the post exists without audit trail.

### 6.3 Fastify Logger Disabled (`apps/api/src/app.ts:24`)

```typescript
const app = Fastify({
  logger: opts.logger ?? false,  // Always false unless explicitly passed
});
```

Production deployments get no request logging. Should default to structured JSON logging in production.

---

## Section 7: Security Findings

### Authentication and Authorization

**A01: Broken Access Control — FAIL**

No authentication middleware exists. Every endpoint is publicly accessible:
- `apps/api/src/app.ts:108-116` — All routes registered without auth hooks
- No `@fastify/jwt`, `@fastify/auth`, or custom auth plugin in dependencies
- `apps/api/package.json` — No auth-related packages

### API Security

**Missing Rate Limiting**
- `apps/api/package.json` — No `@fastify/rate-limit` dependency
- `apps/api/src/app.ts` — No rate limit plugin registration
- AI generation endpoints (`/api/posts/generate`, `/api/posts/:id/carousel`, `/api/trends/analyze`) have no per-endpoint limits

**Missing Request Timeout on External Calls**
- `apps/api/src/services/openrouter.ts:118-132` — `fetch()` called without AbortController
- Server `requestTimeout: 120000` (2 min) exists at Fastify level but external fetch has none

### Data Security

**OpenRouter Response Not Validated**
- `apps/api/src/services/openrouter.ts:147-153` — Response cast to type without Zod validation
- Usage data defaults to 0 if missing: `data.usage?.prompt_tokens ?? 0`
- Content defaults to empty string: `data.choices?.[0]?.message?.content ?? ''`

### Infrastructure Security

**Security Headers Incomplete**
- `apps/api/src/app.ts:46-57` — Sets X-Frame-Options, HSTS, Referrer-Policy
- Missing: Content-Security-Policy, Permissions-Policy, X-Permitted-Cross-Domain-Policies

**Next.js Config Suppresses Errors**
- `apps/web/next.config.js:5-8` — `eslint.ignoreDuringBuilds: true`, `typescript.ignoreBuildErrors: true`

---

## Section 8: Performance and Scalability

### 8.1 No AbortController on External Fetch (`apps/api/src/services/openrouter.ts:118`)

LLM calls can take 10-60 seconds. If OpenRouter hangs, the connection blocks indefinitely. With enough concurrent requests, the server becomes unresponsive.

### 8.2 Unbounded Model Usage Query (`apps/api/src/routes/models.ts:48-89`)

The `groupBy` query on GenerationLog has no `take` limit. With many distinct models over 90 days, this could return a large result set.

### 8.3 Missing Database Indexes

The schema has good indexes but is missing:
- `PostDraft(publishedAt)` — for published post queries
- `PostDraft(status, createdAt)` — compound index for the most common list query
- `GenerationLog(provider)` — for cost-by-provider analysis

### 8.4 No Caching Layer

Every dashboard load makes 2 API calls. Model usage statistics don't change frequently and could be cached for 5-15 minutes.

---

## Section 9: Testing Gaps

**Current Coverage:**
- API: 38 tests across 4 suites (health, posts CRUD, models, env validation)
- Web: 63 tests across 7 suites (6 components + api utility)
- **Total: 101 tests, all passing**

**Estimated Line Coverage:**
- API: ~50% (routes/services partially covered)
- Web: ~35% (components tested, pages not tested)

**Critical Missing Tests:**

| Endpoint/Feature | Priority | Why |
|------------------|----------|-----|
| `POST /api/trends/analyze` | High | Core feature, calls external AI |
| `POST /api/posts/generate` | High | Core feature, most expensive endpoint |
| `POST /api/posts/:id/carousel` | High | Data integrity risk (RISK-003) |
| `POST /api/posts/:id/translate` | Medium | Calls external AI |
| Dashboard page component | Medium | Most visited page |
| Post generation form | Medium | Complex form with API integration |
| Error boundary behavior | Medium | User experience on failures |
| OpenRouter timeout/retry | High | Reliability (RISK-006, RISK-010) |

**E2E Tests:**
- Playwright is mentioned in README but no E2E test files exist
- `e2e/` directory referenced but not created

---

## Section 10: DevOps Issues

### No CI/CD Pipeline
- No `.github/workflows/` directory or files
- No automated test execution on PRs
- No build verification
- No deployment automation

### No Monitoring or Alerting
- Fastify logger disabled by default
- No health check monitoring
- No cost alerting for OpenRouter usage
- No error rate tracking

### No Docker Configuration
- No `Dockerfile` or `docker-compose.yml`
- Database assumed to be running locally
- No containerized development or deployment

### Secret Management
- `.env` file is NOT tracked by git (verified, properly gitignored)
- `.env.example` exists with placeholder values
- No secret rotation strategy documented
- No vault or secrets manager integration

---

## Section 11: Compliance Readiness

### OWASP Top 10 (2021)

| Control | Status | Evidence |
|---------|--------|----------|
| A01: Broken Access Control | **Fail** | No authentication on any endpoint. All routes publicly accessible (`app.ts:108-116`). |
| A02: Cryptographic Failures | **Partial** | API keys stored server-side only, HSTS enabled in production. No encryption at rest for stored content. |
| A03: Injection | **Pass** | Prisma ORM prevents SQL injection. Zod validates all inputs. No raw SQL queries. |
| A04: Insecure Design | **Fail** | No rate limiting, no abuse prevention, build errors suppressed. |
| A05: Security Misconfiguration | **Partial** | Good security headers but missing CSP. CORS properly configured. `ignoreBuildErrors` is misconfiguration. |
| A06: Vulnerable Components | **Pass** | All dependencies are current versions (Fastify 5, Prisma 6, Next.js 15, React 19). |
| A07: Auth Failures | **Fail** | No authentication system exists. |
| A08: Data Integrity Failures | **Partial** | No CI/CD pipeline to verify builds. Carousel operations lack transaction protection. |
| A09: Logging Failures | **Fail** | Logger exists but disabled in production mode. No request ID correlation. No security event logging. |
| A10: SSRF | **Pass** | No user-controlled URLs passed to server-side fetch. OpenRouter URL is from env config only. |

**Summary: 3 Pass, 3 Partial, 4 Fail**

### SOC2 Type II

| Principle | Status | Evidence |
|-----------|--------|----------|
| Security | **Fail** | No authentication, no rate limiting, no access control. |
| Availability | **Partial** | Health checks exist. No monitoring, no retry logic, no circuit breakers. |
| Processing Integrity | **Partial** | Zod validation good. Missing transactions for multi-step operations. Unvalidated AI responses. |
| Confidentiality | **Partial** | API keys server-side. No encryption at rest. Logger redacts sensitive patterns. |
| Privacy | **N/A** | No PII collected beyond content. No user accounts yet. |

### ISO 27001 Annex A

| Control Area | Status | Evidence |
|-------------|--------|----------|
| A.9 Access Control | **Fail** | No authentication or authorization |
| A.10 Cryptography | **Partial** | HSTS configured, no at-rest encryption |
| A.12 Operations Security | **Fail** | No monitoring, logging disabled in production |
| A.14 System Development | **Fail** | No CI/CD, build errors suppressed |

---

## Section 12: Technical Debt Map

| Priority | Debt Item | Interest (cost of delay) | Owner | Payoff |
|----------|-----------|--------------------------|-------|--------|
| HIGH | No authentication system | Unlimited cost exposure, data breach risk | Dev | Closes RISK-001, RISK-002 partially |
| HIGH | No rate limiting | Financial loss from abuse | Dev | Closes RISK-002 |
| HIGH | Build errors suppressed | Bugs ship undetected, compounding over time | Dev | Closes RISK-005, improves all code quality |
| HIGH | Missing tests for core endpoints | Regression risk on every change | QA | Closes RISK-011 |
| MEDIUM | No database transactions | Data inconsistency accumulates | Dev | Closes RISK-003, RISK-007 |
| MEDIUM | No CI/CD | Manual quality checks, human error | DevOps | Closes RISK-009 |
| MEDIUM | No request timeout/retry | User frustration, wasted API calls | Dev | Closes RISK-006, RISK-010 |
| LOW | Missing indexes | Slow queries as data grows | Dev | Closes RISK-014 |
| LOW | Hardcoded model costs | Inaccurate cost tracking | Dev | Closes RISK-015 |

---

## Section 13: Remediation Roadmap

### Phase 0 — Immediate (48 hours)
- Remove `ignoreBuildErrors: true` from `apps/web/next.config.js` and fix any surfaced errors — Owner: Dev
- Verify `.env` is not in git history — Owner: Dev
- Gate: `npx next build` passes with strict mode

### Phase 1 — Stabilize (1-2 weeks)
- Add `@fastify/rate-limit` with 100 req/15min general, 10 req/hour on generation endpoints — Owner: Dev
- Add AbortController with 60s timeout to `callLLM()` in `openrouter.ts` — Owner: Dev
- Wrap carousel generation in Prisma `$transaction` — Owner: Dev
- Add Zod validation for OpenRouter API responses — Owner: Dev
- Add Content-Security-Policy and Permissions-Policy headers — Owner: Dev
- Add tests for `/api/trends/analyze`, `/api/posts/generate`, `/api/posts/:id/carousel` — Owner: QA
- Create GitHub Actions workflow for test + build on PRs — Owner: DevOps
- Gate: All scores >= 6/10, no Critical issues remaining

### Phase 2 — Production-Ready (2-4 weeks)
- Implement JWT authentication with `@fastify/jwt` — Owner: Dev / Security
- Wrap post generation in database transaction — Owner: Dev
- Enable Fastify structured logging in production — Owner: Dev
- Add page-level tests for all 6 frontend pages — Owner: QA
- Add LLM call retry logic with exponential backoff — Owner: Dev
- Add missing database indexes — Owner: Dev
- Add E2E tests with Playwright — Owner: QA
- Gate: All scores >= 8/10, compliance gaps addressed

### Phase 3 — Excellence (4-8 weeks)
- Fetch model costs from OpenRouter API dynamically — Owner: Dev
- Add cost alerting and budget limits — Owner: Dev
- Add Docker configuration for deployment — Owner: DevOps
- Add monitoring and error alerting — Owner: DevOps
- Implement caching layer for dashboard and model usage — Owner: Dev
- Gate: All scores >= 9/10, audit-ready for external review

---

## Section 14: Quick Wins (1-day fixes)

1. Remove `ignoreBuildErrors` from `apps/web/next.config.js:5-8` — 5 minutes
2. Add AbortController timeout to `apps/api/src/services/openrouter.ts:118` — 30 minutes
3. Add CSP header to `apps/api/src/app.ts:46-57` — 15 minutes
4. Wrap carousel delete+create in `$transaction` in `apps/api/src/routes/carousel.ts:37-61` — 30 minutes
5. Add Zod schema for OpenRouter response in `apps/api/src/services/openrouter.ts:147` — 45 minutes
6. Install and configure `@fastify/rate-limit` in `apps/api/src/app.ts` — 1 hour
7. Add missing database indexes to `apps/api/prisma/schema.prisma` — 30 minutes
8. Enable Fastify logger with JSON output for production in `apps/api/src/app.ts:24` — 30 minutes

---

## Section 15: AI-Readiness Score

| Sub-dimension | Score | Notes |
|---------------|-------|-------|
| Modularity | 1.5/2 | Clean service/route separation. Content-generator handles too many concerns. |
| API Design | 1.5/2 | RFC 7807 errors, consistent pagination. Missing OpenAPI spec. |
| Testability | 1.0/2 | Good test infrastructure but 50% of endpoints untested. `buildTestApp()` helper is excellent. |
| Observability | 0.5/2 | Logger exists but disabled in production. No request tracing, no cost alerting. |
| Documentation | 1.5/2 | PRD, API docs, ADRs exist. Missing OpenAPI spec and deployment guide. |
| **Total** | **6.0/10** | |

---

## Scores

### Technical Dimension Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Security | 3/10 | No auth, no rate limiting, no CSP. Good: Zod validation, CORS, some headers. |
| Architecture | 7/10 | Clean separation, good patterns, proper error handler. Missing: transactions, retry logic. |
| Test Coverage | 5/10 | 101 tests passing. Core generation endpoints untested. No E2E. Estimated 40-50% line coverage. |
| Code Quality | 7/10 | TypeScript strict mode, clean code, good error handling. Logging incomplete. |
| Performance | 5/10 | No caching, no fetch timeout, missing some indexes. Body/request timeouts configured. |
| DevOps | 2/10 | No CI/CD, no Docker, no monitoring. Health checks exist. |
| Runability | 7/10 | Full stack starts, health OK, UI loads. Build passes. API serves real responses. Slight deduction for `ignoreBuildErrors`. |

**Technical Score: 5.1/10**

### Readiness Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Security Readiness | 3/10 | Cannot withstand any real-world attack due to missing auth and rate limiting. |
| Product Potential | 7/10 | Core logic is sound. Bilingual AI content generation works. Clean architecture. |
| Enterprise Readiness | 2/10 | Missing auth, rate limiting, CI/CD, monitoring, compliance controls. |

### Overall Score

**Overall Score: 4.5/10 — Needs Work**

The product has strong architectural foundations and working AI integration, but critical security gaps and missing operational infrastructure prevent production deployment.
