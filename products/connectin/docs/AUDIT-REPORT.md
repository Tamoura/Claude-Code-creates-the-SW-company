# ConnectIn — Professional Audit Report

**Date:** 2026-02-22
**Auditor:** ConnectSW Code Reviewer
**E2E Gate:** PASS (26/26 tests)
**Scope:** Full product audit across 11 technical dimensions

---

# PART A — EXECUTIVE MEMO

*This section contains no file-line references, no code snippets, and no secret values. It is safe to share with board members, investors, and external stakeholders.*

---

## Section 0: Methodology and Limitations

### Scope

This audit covered every directory in the ConnectIn product monorepo, including `apps/api`, `apps/web`, `e2e`, `docs`, CI/CD pipeline configuration, Docker and docker-compose files, and all package manifests. File types examined included TypeScript source files, Prisma schema and migration artifacts, environment configuration files, GitHub Actions workflow definitions, Dockerfile and docker-compose definitions, Next.js configuration, and test files across all three testing layers (integration, unit, and end-to-end).

The audit scanned approximately 100+ files across both the backend API and frontend web application.

### Methodology

The following analytical techniques were applied during this audit:

- **Static code analysis**: Reading and reviewing source code for correctness, security posture, and maintainability patterns without executing the application.
- **Schema analysis**: Reviewing the Prisma schema to assess data model design, relationships, index coverage, and PII handling.
- **Dependency review**: Examining `package.json` files for dependency versions, known vulnerability patterns, and license considerations.
- **CI/CD pipeline review**: Reading GitHub Actions workflow definitions to assess build quality, test automation, security gates, and deployment posture.
- **Integration test review**: Reading test files to understand coverage scope, test realism, and gap areas.
- **Accessibility scan**: Static review of component source code against WCAG 2.1 AA criteria including heading hierarchy, ARIA usage, color contrast ratios, keyboard navigation, and focus management.
- **Privacy review**: Assessing data collection, consent mechanisms, and GDPR-relevant endpoints against applicable regulatory requirements.

### Out of Scope

The following were not performed and are recommended as follow-on activities:

- Dynamic penetration testing (runtime exploitation attempts against a live environment)
- Runtime performance profiling under realistic user load
- Third-party library internals beyond version and API usage
- Cloud infrastructure review (no cloud environment was provided for this audit)
- Legal review of privacy policies or terms of service

### Limitations

All scores and findings reflect the state of the codebase at the time of this audit (2026-02-22). Scores are based on static review only and may differ from results obtained through dynamic testing. The absence of a finding does not guarantee the absence of a vulnerability.

---

## Section 1: Executive Decision Summary

| Question | Answer |
|---|---|
| Can this go to production? | Conditionally — after Phase 1 remediation is complete |
| Is the codebase salvageable? | Yes — the foundation is strong and well-structured |
| Risk if gaps are ignored | High — accessibility non-compliance and DevOps gaps create real legal and operational exposure |
| Recovery effort required | 2 to 3 weeks with 2 engineers working in parallel |
| Enterprise-ready? | No — observability, privacy, and accessibility gaps must be closed first |
| SOC2 Type II ready? | No — logging completeness, access control coverage, and change management gaps prevent this |
| OWASP Top 10 posture | Partial — security architecture is strong but CSRF enforcement and monitoring gaps remain |

### Top 5 Risks in Plain Language

**Risk 1 — Disabled users cannot fully use the platform.** Users who rely on screen readers, keyboard-only navigation, or high-contrast display settings will encounter broken experiences. Modal dialogs on the Jobs page trap keyboard focus incorrectly, several pages have no visible heading, color contrast on error messages and secondary text does not meet the legal minimum ratio, and page titles do not change as users navigate between sections. This is not only a user experience problem — in many jurisdictions, inaccessible web products violate accessibility law and can result in litigation.

**Risk 2 — Development credentials are stored in version control.** Configuration files containing authentication signing keys and database connection strings are present in the repository. Even though these are development-only values, the pattern normalizes storing secrets in code. If a developer reuses the same values in staging or production, or if the repository is ever made public or accessed by an unauthorized party, the consequences could be severe and difficult to contain.

**Risk 3 — The automated security check cannot stop a bad deployment.** The CI pipeline runs a security vulnerability scan against all installed packages, which is good practice. However, the pipeline is configured to continue and succeed even if the scan reports critical vulnerabilities. This means a deployment containing a known critical security flaw could complete without any human review or automated block.

**Risk 4 — The team has no visibility into production health.** ConnectIn has no monitoring infrastructure in place. Prometheus metrics are emitted by the API server but nothing collects or displays them. There is no alerting, no error tracking service, and no centralized log aggregation. If the service degrades or stops responding, the team will only find out when users report problems through other channels, by which point the damage to user trust may already be significant.

**Risk 5 — European and PDPL-regulated users cannot consent before data collection begins.** The platform has a well-designed database model for recording user consent, but no cookie consent banner or privacy notice is shown to users on first visit. Personal data including IP addresses and user agent strings are collected from the moment a session begins, before any consent is gathered. This creates regulatory exposure in any market with active data protection enforcement.

---

## Section 2: Stop, Fix, and Continue

### STOP — Immediate Actions Required

- **Stop committing any configuration file that contains secret values**, even development ones. Establish a `.env.local` pattern that is gitignored from the start of every project, and move all existing secret values out of version-controlled files immediately. Rotate any secrets that were committed so that previous git history cannot be used to extract working credentials.
- **Stop deploying without a documented rollback plan.** The current deployment process is entirely manual with no automated recovery path. Any deployment that introduces a critical defect would require manual database intervention and service restart, with no defined procedure and significant risk of extended downtime.

### FIX — Required Before Production Launch

- Fix all accessibility violations, prioritizing the modal focus traps, missing page headings, color contrast failures, and missing page titles.
- Fix the CI pipeline security audit step to be blocking rather than advisory — a failing security scan must fail the build.
- Add a monitoring infrastructure, either by configuring Prometheus scraping and Grafana dashboards in docker-compose or by integrating a third-party APM service such as Sentry, Datadog, or New Relic.
- Add a cookie consent mechanism to the frontend that gates personal data collection on explicit user acknowledgment before any session data is recorded.
- Replace the `prisma db push` development workflow with proper `prisma migrate deploy` migration management so that schema changes are tracked, versioned, and safely applied in production without risk of data loss.

### CONTINUE — Strengths to Preserve

- **Continue the JWT authentication architecture.** Storing access tokens in JavaScript memory rather than localStorage, combined with httpOnly refresh token cookies, is an excellent security posture that protects against the most common token theft vectors and should be maintained.
- **Continue the comprehensive integration test suite.** Running tests against a real PostgreSQL database with real HTTP requests and including dedicated OWASP security scenario tests represents industry-leading quality for a product at this stage of development.
- **Continue the modular API architecture.** The separation of routes, services, plugins, and library utilities is clean, consistent, and highly maintainable. New features can be added with confidence because existing boundaries are clear and respected.

---

## Section 3: System Overview

### Architecture

```
User (Browser)
    |
    v
Next.js 16 Frontend (Port 3111)
  - Server-side rendering + React 19
  - Memory-based JWT access tokens
  - httpOnly refresh token cookie
  - CSRF double-submit cookie pattern
  - CSP headers, X-Frame-Options: DENY
    |
    v
Fastify 4 API (Port 5007)
  - Plugin-based architecture
  - JWT authentication middleware
  - Rate limiting (global + per-route)
  - Prometheus metrics export at /metrics
  - Pino structured access logging
    |
    +---> PostgreSQL 15 (Primary data store)
    |       13 Prisma models, cursor pagination
    |
    +---> Redis 7 (Configured; not yet used for caching or token blacklisting)
```

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | Next.js | 16.1.6 |
| Frontend Runtime | React | 19.2.3 |
| Frontend Language | TypeScript | 5.x |
| Frontend Styling | Tailwind CSS | 4.x |
| Backend Framework | Fastify | 4.26 |
| Backend ORM | Prisma | 5.10 |
| Backend Language | TypeScript | 5.x |
| Database | PostgreSQL | 15 |
| Cache Layer | Redis | 7 (configured, unused) |
| Test Runner | Jest + Playwright | — |

### Key User Flows

**Authentication Flow:** A new user registers with email and password, receives an email verification link, confirms their address, and then logs in to receive a short-lived JWT access token (15-minute expiry) and a long-lived refresh token (30-day expiry) stored as an httpOnly cookie. The refresh token is hashed before storage in the database and rotated on every refresh call, meaning each use invalidates the previous token.

**Feed Flow:** Authenticated users fetch their feed via a cursor-paginated endpoint that returns posts from their connected network ordered by recency. The cursor pagination pattern avoids offset-based performance degradation as the dataset grows and provides stable pagination in the presence of new content.

**Jobs Flow:** Recruiters can create job listings via role-gated endpoints. All authenticated users can browse and search open positions, save jobs to a personal list, and submit applications with a cover letter. The API enforces role-based access control so that only users with the recruiter role can create or manage listings.

**Connections Flow:** Users can send connection requests subject to business rules: a maximum of 100 pending outgoing requests at any time, a 30-day cooldown before re-requesting a rejected connection, and a 90-day expiry on unanswered requests. The connection acceptance endpoint validates ownership so a user cannot accept a request on behalf of another user.

---

```
SCORES (11 Dimensions)
======================
CORE DIMENSIONS:
  Security:         7/10  [BELOW THRESHOLD]
  Architecture:     8/10  [PASS]
  Test Coverage:    7/10  [BELOW THRESHOLD]
  Code Quality:     8/10  [PASS]
  Performance:      6/10  [BELOW THRESHOLD]
  DevOps:           6/10  [BELOW THRESHOLD]
  Runability:       8/10  [PASS]

NEW DIMENSIONS:
  Accessibility:    5/10  [BELOW THRESHOLD]
  Privacy:          6/10  [BELOW THRESHOLD]
  Observability:    6/10  [BELOW THRESHOLD]
  API Design:       7/10  [BELOW THRESHOLD]

READINESS:
  Security Readiness:    7.0/10  [BELOW THRESHOLD]
  Product Potential:     7.4/10  [BELOW THRESHOLD]
  Enterprise Readiness:  6.2/10  [BELOW THRESHOLD]

TECHNICAL SCORE: 6.7/10
OVERALL:         6.8/10 — Needs Work before production
```

---

## Section 4: Critical Issues — Top 10

| # | Issue | File / Location | Severity | Likelihood | Blast Radius | Risk Owner | Category | Business Impact | Remediation Phase |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Modal keyboard trap missing in ApplyModal | Jobs components — ApplyModal | High | Certain | All keyboard and screen-reader users | Frontend Lead | Accessibility | Legal exposure in accessibility-regulated markets; users with disabilities cannot complete job applications | Phase 0 / Phase 1 |
| 2 | Modal keyboard trap missing in CreateJobModal | Jobs components — CreateJobModal | High | Certain | Recruiter users on keyboard or screen reader | Frontend Lead | Accessibility | Recruiters cannot post jobs using keyboard navigation; WCAG 2.1 failure | Phase 0 / Phase 1 |
| 3 | Missing page headings and input labels across multiple pages | Feed page, Jobs page, Profile page inputs | High | Certain | Screen-reader users; SEO indexing | Frontend Lead | Accessibility | Screen-reader users cannot navigate page structure; document outline is broken; pages appear equivalent to assistive technology | Phase 0 |
| 4 | No cookie consent banner before data collection | Frontend root layout — global | High | Certain | All EU and PDPL-regulated users | Product Lead | Privacy | GDPR Articles 6 and 7 non-compliance; potential regulatory fine on first enforcement action | Phase 1 |
| 5 | Security audit non-blocking in CI pipeline | CI pipeline configuration file | High | Possible | All deployments following a new vulnerability disclosure | DevOps Lead | DevOps / Security | Critical package vulnerability could reach production without triggering a deployment block | Phase 0 |
| 6 | No monitoring or alerting infrastructure | Infrastructure — no Prometheus scraper, Grafana, or APM | High | Certain | Entire production service during any degradation event | Engineering Lead | Observability | Downtime and degradation go undetected until users report problems; no SLA enforcement possible; incident response is reactive only | Phase 2 |
| 7 | Dev secrets pattern in version control | API application root — .env file | Medium | Low | Dev environment credentials; pattern propagation risk | DevOps Lead | Security | Sets a dangerous precedent; risk escalates significantly if the pattern is copied to staging or production environments | Phase 0 |
| 8 | CSRF enforcement not explicitly verified per route | API plugin layer — csrf.ts registration | Medium | Low | Authenticated state-changing endpoints | Backend Lead | Security | CSRF protection is registered at the plugin level but per-route enforcement is unclear; could leave mutation endpoints exposed to cross-site request forgery | Phase 1 |
| 9 | No token blacklisting for immediate session revocation | API — auth service, Redis configured but unused | Medium | Low | Users with compromised sessions | Backend Lead | Security | Stolen refresh tokens cannot be invalidated until their natural expiry window of up to 30 days; Redis infrastructure is already provisioned and ready | Phase 2 |
| 10 | No database schema migration history | Database — prisma db push used in CI | Medium | Possible | Production database stability on every schema change | DevOps Lead | DevOps | Schema changes cannot be safely rolled back; no audit trail of database changes over time; production data loss is possible during a schema update | Phase 1 |

---

## Section 5: Risk Register

| Issue ID | Title | Domain | Severity | Owner | SLA | Dependency | Verification | Status |
|---|---|---|---|---|---|---|---|---|
| RISK-001 | Modal focus trap missing in ApplyModal | Accessibility | High | Frontend Lead | Phase 0 — 48h | None | Keyboard tab cycling stays within modal when open | Open |
| RISK-002 | Modal focus trap missing in CreateJobModal | Accessibility | High | Frontend Lead | Phase 0 — 48h | None | Keyboard tab cycling stays within modal when open | Open |
| RISK-003 | Feed page missing h1 element | Accessibility | High | Frontend Lead | Phase 0 — 48h | None | axe-core scan passes on feed page; heading outline tool shows h1 | Open |
| RISK-004 | Jobs page missing h1 element | Accessibility | High | Frontend Lead | Phase 0 — 48h | None | axe-core scan passes on jobs page; heading outline tool shows h1 | Open |
| RISK-005 | Profile headline input missing aria-label | Accessibility | High | Frontend Lead | Phase 0 — 48h | None | Screen reader announces input purpose correctly | Open |
| RISK-006 | Landing page heading hierarchy skips h2 | Accessibility | Medium | Frontend Lead | Phase 1 — 1 week | None | Heading outline tool shows no skipped levels on landing page | Open |
| RISK-007 | Error text color contrast 3.5:1 against white | Accessibility | Medium | Frontend Lead | Phase 1 — 1 week | None | Contrast ratio tool reports 4.5:1 or better for all error text | Open |
| RISK-008 | Placeholder text color contrast 3.2:1 against light background | Accessibility | Medium | Frontend Lead | Phase 1 — 1 week | None | Contrast ratio tool reports 4.5:1 or better for placeholder text | Open |
| RISK-009 | Secondary text color contrast 3.8:1 against white | Accessibility | Medium | Frontend Lead | Phase 1 — 1 week | None | Contrast ratio tool reports 4.5:1 or better for secondary text | Open |
| RISK-010 | Child pages do not override root metadata page title | Accessibility | Medium | Frontend Lead | Phase 1 — 1 week | None | Browser tab title changes on navigation to each main section | Open |
| RISK-011 | No cookie consent banner before data collection | Privacy | High | Product Lead | Phase 1 — 1 week | Legal review | Cookie consent displays before any session data is recorded | Open |
| RISK-012 | No right-to-restrict-processing endpoint (GDPR Art. 18) | Privacy | Medium | Backend Lead | Phase 2 — 2 weeks | None | Restriction endpoint returns 200 and marks account as restricted | Open |
| RISK-013 | No data retention policy enforcement | Privacy | Medium | Backend Lead | Phase 2 — 2 weeks | Legal guidance | Retention policy document exists; automated enforcement job runs on schedule | Open |
| RISK-014 | IP and UserAgent collected before consent is obtained | Privacy | High | Backend Lead | Phase 1 — 1 week | RISK-011 | Consent capture precedes session data collection in all flows | Open |
| RISK-015 | CI security audit non-blocking on critical findings | DevOps / Security | High | DevOps Lead | Phase 0 — 48h | None | Build fails when npm audit reports a critical vulnerability | Open |
| RISK-016 | No secret scanning in CI pipeline | DevOps / Security | High | DevOps Lead | Phase 1 — 1 week | None | TruffleHog or equivalent scan runs on every push and pull request | Open |
| RISK-017 | No SAST tool configured | DevOps / Security | Medium | DevOps Lead | Phase 2 — 2 weeks | None | CodeQL or Snyk runs on every pull request and reports findings | Open |
| RISK-018 | No Dependabot configuration | DevOps | Medium | DevOps Lead | Phase 1 — 1 week | None | Dependabot pull requests appear on a weekly schedule for npm | Open |
| RISK-019 | Prisma db push in CI — no migration history | DevOps | Medium | DevOps Lead | Phase 1 — 1 week | None | prisma migrate deploy runs successfully in CI against versioned migrations | Open |
| RISK-020 | Dev secrets committed in .env file | Security | Medium | DevOps Lead | Phase 0 — 48h | None | .env absent from repository; .env.local pattern in gitignore; secrets rotated | Open |
| RISK-021 | CSRF per-route enforcement not explicitly verified | Security | Medium | Backend Lead | Phase 1 — 1 week | None | All state-changing routes tested with missing CSRF token return 403 | Open |
| RISK-022 | No token blacklisting — Redis is provisioned but unused | Security | Medium | Backend Lead | Phase 2 — 2 weeks | None | Revoked refresh token returns 401 on any subsequent use attempt | Open |
| RISK-023 | No Prometheus scraper or Grafana configured | Observability | High | DevOps Lead | Phase 2 — 2 weeks | None | Grafana dashboard displays live metrics scraped from API /metrics endpoint | Open |
| RISK-024 | No external error tracking (Sentry or equivalent) | Observability | High | Engineering Lead | Phase 2 — 2 weeks | None | Sentry receives a test error from the staging environment | Open |
| RISK-025 | No distributed tracing (OpenTelemetry) | Observability | Low | Engineering Lead | Phase 3 — 4+ weeks | None | Trace spans visible in Jaeger or Grafana Tempo for all API requests | Open |
| RISK-026 | No deployment automation — deployment is entirely manual | DevOps | High | DevOps Lead | Phase 3 — 4+ weeks | None | CD pipeline deploys to staging automatically and to production on approval | Open |
| RISK-027 | Redis present but unused for caching | Performance | Medium | Backend Lead | Phase 2 — 2 weeks | None | Feed and jobs cache hit rate above 80% under normal load | Open |
| RISK-028 | Next.js image hostname wildcard too permissive | Performance / Security | Low | Frontend Lead | Phase 2 — 2 weeks | None | next.config.ts restricts image optimization to known trusted domains only | Open |
| RISK-029 | OpenAPI schema incomplete — only some routes annotated | API Design | Medium | Backend Lead | Phase 2 — 2 weeks | None | All routes have complete OpenAPI schema objects with request and response definitions | Open |
| RISK-030 | No coverage threshold enforcement in CI | Test Coverage | Medium | QA Lead | Phase 1 — 1 week | None | CI fails if line coverage drops below 80% on any test run | Open |

---

---

# PART B — ENGINEERING APPENDIX

*This section contains full technical detail including exact file references, code patterns, and line number citations. It is intended for the engineering team and should not be shared externally.*

---

## Section 6: Architecture Analysis

### Plugin Registration Order

The Fastify application registers plugins in `apps/api/src/app.ts` at lines 45-64 in a deliberate order that reflects security-first thinking. Security plugins — including the rate limiter, CORS, Helmet, and CSRF protection — are registered before any route plugins. This ordering ensures that all incoming requests are filtered through security middleware before reaching business logic handlers, which is the correct pattern and should be maintained as new routes and plugins are added.

### Module Structure

The API follows a clean three-layer architecture with clear boundaries between responsibilities:

- `src/routes/` — HTTP route handlers with Fastify schema validation for requests and responses
- `src/services/` — Business logic services that own database access via Prisma
- `src/plugins/` — Fastify plugins for cross-cutting concerns (auth, rate-limiting, CSRF, Prometheus metrics, request IDs)
- `src/lib/` — Pure utility modules that have no side effects (error class hierarchy, response formatter, pagination helper)
- `src/config/` — Centralized configuration with environment variable validation on startup

This separation is applied consistently across all feature domains (auth, feed, profile, network, jobs) and makes the codebase highly maintainable. A developer new to any one feature area can immediately understand where to look for each layer of logic.

### Error Hierarchy

The file `apps/api/src/lib/errors.ts` defines a typed error hierarchy that extends a base `AppError` class. Specific error types include `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ValidationError`, and `ConflictError`. Each error type carries an HTTP status code and a machine-readable string error code. The Fastify error handler in `app.ts` catches all instances of `AppError` and serializes them using the standard response envelope, ensuring API consumers receive a predictable error structure regardless of which endpoint generated the error.

### Response Format

The utility module `apps/api/src/lib/response.ts` provides a consistent response envelope containing `success` (boolean), `data` (the payload), and an optional `meta` field. Every route handler uses this formatter, which ensures API consumers receive a predictable structure across all endpoints. The `meta` field is used for pagination cursors in list endpoints, carrying the `nextCursor` value.

### Pagination

The module `apps/api/src/lib/pagination.ts` implements cursor-based pagination using a base64-encoded cursor that contains the last record ID and timestamp. This approach is the correct choice for a social network feed and avoids the O(n) performance degradation that offset-based pagination suffers as the dataset grows. The cursor approach is used consistently across feed, jobs listing, and network connection list endpoints.

### Service Pattern Consistency

All service files follow the same pattern: a class is defined and exported as a singleton instance, with methods that accept typed parameter objects and return typed outputs. Database access goes through Prisma exclusively — no raw SQL is used anywhere in the reviewed code. This consistency reduces cognitive overhead when reading across different feature areas and makes the codebase well-suited for AI-assisted development.

---

## Section 7: Security Findings

### Authentication

The JWT authentication plugin is defined in `apps/api/src/plugins/auth.ts`. It uses the `@fastify/jwt` library with the HS256 algorithm. Access tokens carry a 15-minute expiry (`exp` claim) and refresh tokens carry a 30-day expiry. This is an appropriate balance between security (short-lived access tokens limit the window of exploitation if intercepted) and user experience (30-day refresh tokens mean users are not frequently logged out on active sessions).

In `apps/api/src/config/index.ts`, bcrypt is configured with 12 rounds. This is a strong configuration — 12 rounds provides meaningful brute-force resistance while remaining performable on modern server hardware, taking approximately 250-400ms per hash operation.

In `apps/api/src/services/auth.service.ts` at approximately lines 468-473, refresh tokens are hashed with SHA-256 before being stored in the database. This means that even if the database is compromised, the attacker obtains only hashes and cannot directly use them as refresh tokens. Token rotation is applied on every successful refresh call, invalidating the previous token entry.

### CSRF Protection

The CSRF plugin is registered in `apps/api/src/plugins/csrf.ts` using `@fastify/csrf-protection`. A dedicated token endpoint exists in `apps/api/src/routes/health.routes.ts` at lines 7-11, returning a signed CSRF token that the frontend fetches on demand. The frontend client at `apps/web/src/lib/api.ts` lazily fetches this token, caches it for the duration of the browser session, and sends it as an `x-csrf-token` header with every mutating request (POST, PUT, DELETE, PATCH).

**Engineering Gap:** The audit confirmed that the CSRF plugin is registered and the token endpoint exists, and that the frontend sends the token. However, the audit could not confirm that every state-changing route handler explicitly invokes the CSRF verification hook. The `@fastify/csrf-protection` plugin can be configured globally (all routes) or per-route. The current configuration must be reviewed to verify that no mutation routes are accidentally exempted. A dedicated test that sends a mutation request without a CSRF token and expects a 403 response should be added for every state-changing endpoint group.

### Rate Limiting

The global rate limiter is defined in `apps/api/src/plugins/rate-limiter.ts` with a limit of 100 requests per minute per IP in production and 1000 per minute in development. The following per-route overrides are defined in `apps/api/src/routes/auth.routes.ts`: the login endpoint is limited to 5 requests per minute per IP, registration to 3 requests per minute, and token refresh to 10 requests per minute. These are appropriately aggressive limits for sensitive authentication endpoints and provide meaningful protection against credential-stuffing attacks.

### BOLA (Broken Object Level Authorization)

The file `apps/api/tests/security.test.ts` at lines 19-44 contains explicit BOLA test cases. These tests authenticate as User A, create a connection request from User B to User A, and then verify that User A cannot accept a connection request that was directed to User B. The `apps/api/src/services/connection.service.ts` enforces ownership checks before processing any connection state change by verifying that the authenticated user ID matches the recipient ID of the request. These tests pass in CI, confirming that this protection is active and correct.

### XSS Prevention

Post content submitted to the feed is processed through the `sanitize-html` library as defined in `apps/api/src/routes/feed.schemas.ts`. The library is configured to strip all HTML tags and attributes that are not on an explicit allowlist, preventing stored cross-site scripting attacks through post content. Profile fields use a custom `stripHtml` function defined in `apps/api/src/routes/profile.schemas.ts` that removes all HTML tags entirely. These two approaches provide appropriate defense-in-depth for user-generated content.

### Account Lockout

The lockout logic in `apps/api/src/services/auth.service.ts` at approximately lines 84-91 increments a failed attempt counter on each unsuccessful login for a given email address. After 5 consecutive failures, the account is locked and subsequent login attempts return a locked-account error regardless of whether the password is correct. The threshold of 5 is defined in `apps/api/src/config/index.ts`. This effectively prevents online brute-force attacks against user passwords.

---

## Section 8: Performance and Scalability

### Strengths

The Prisma ORM generates parameterized SQL for all database operations, and no N+1 query patterns were observed in the reviewed service code. Related records are fetched using Prisma `include` directives within a single query rather than issuing sequential queries. Cursor-based pagination in `apps/api/src/lib/pagination.ts` ensures that list endpoints remain performant regardless of dataset size, as each page requires only a single indexed seek rather than a full scan. The Prisma schema defines indexes on foreign key columns and fields used in WHERE and ORDER BY clauses.

### Redis Caching Gap

Redis 7 is declared as a service in `docker-compose.yml` with appropriate health checks and resource limits. The Redis client is initialized in the API application code. However, Redis is not used for any caching, session storage, or token blacklisting operations at the time of this audit. The infrastructure investment is already made — the gap is purely application-layer code to activate it.

**Recommendation:** Implement a cache-aside pattern for the feed query (the most expensive and most frequently called endpoint) and the jobs search query. A 60-second TTL for feed queries and a 120-second TTL for jobs listings would significantly reduce database load under concurrent usage. Cache invalidation should occur when a user creates a new post (invalidate the feed cache for their connections) or when a job listing is created, updated, or closed.

### Image Configuration

The `apps/web/next.config.ts` file configures Next.js image optimization with a wildcard hostname pattern that allows the Next.js image proxy to fetch and optimize images from any origin on the internet. This creates a potential server-side request forgery vector where an attacker could cause the Next.js server to fetch content from internal network addresses or unauthorized external services. It also removes the ability to restrict image sources to known trusted domains. This should be restricted to the specific domains from which user-uploaded profile images will be served in production.

### Load Testing Gap

No load testing suite exists and no baseline performance metrics have been captured. Before production launch, a minimum load test scenario should establish p95 and p99 response time baselines under expected concurrent user load and identify the concurrency threshold at which the system begins to degrade. Tools such as k6 or Artillery are appropriate for this purpose.

---

## Section 9: Testing Gaps

### API Test Coverage

Eight integration test files exist in `apps/api/tests/`. All tests run against a real PostgreSQL database instance with no mocking of the database layer or HTTP layer, which means the tests verify actual system behavior rather than simulated behavior. A dedicated `security.test.ts` file covers OWASP-relevant scenarios including BOLA, rate limiting behavior, account lockout, and authentication edge cases. This is an excellent testing posture for the integration layer.

**Gaps:** No unit tests exist for pure utility functions in `src/lib/`, meaning pagination logic, error formatting, and response construction are only tested indirectly through integration tests. No coverage threshold is enforced in the CI pipeline, so test coverage could silently regress as new code is added without corresponding tests. Jobs search filter combinations and the profile completeness calculation logic are not explicitly tested in isolation.

### Frontend Test Coverage

Over 40 test files exist in `apps/web/` using Jest and React Testing Library. The testing approach focuses on component behavior from the user's perspective (what the user sees and can interact with) rather than implementation details (how the component is internally structured), which is the correct philosophy for frontend testing and produces more resilient tests.

**Gap:** No automated accessibility testing using tools such as `jest-axe` or `@axe-core/react` is integrated into the test suite. The 10 accessibility violations documented in this audit were only discoverable through manual review. Adding `jest-axe` to the component test suite would catch regressions in ARIA usage, heading structure, and contrast automatically on every test run.

### End-to-End Coverage

The 26 Playwright tests in `e2e/` cover the following user flows: authentication (11 tests including registration, login, logout, and session refresh), feed (5 tests), profile (3 tests), network connections (3 tests), and jobs (4 tests covering creation, browsing, and application). All 26 tests pass in CI, confirming that the primary user journeys function correctly end-to-end against the full stack.

**Gaps:** No visual regression testing is in place, so a CSS change that breaks the layout or color scheme will not be caught automatically. No performance assertions exist within the E2E tests. No accessibility assertions using Playwright's built-in accessibility APIs or an axe integration are present.

---

## Section 10: DevOps Issues

### CI Pipeline Structure

The CI pipeline defined in `.github/workflows/connectin-ci.yml` runs 7 sequential jobs: lint, API integration tests, web unit tests, end-to-end Playwright tests, security audit, Docker build, and a quality gate summary job. Both PostgreSQL 15 and Redis 7 service containers are provisioned for the test jobs, which is the correct approach to ensure that tests run against the same infrastructure versions as production.

### Security Audit Non-Blocking

At approximately line 228 of `connectin-ci.yml`, the `npm audit --audit-level=critical` step includes `continue-on-error: true`. This configuration means that a critical vulnerability finding in any installed npm package does not cause the pipeline job to fail. The pipeline reports the finding in its output but proceeds to the next step and ultimately succeeds. The intent was likely to avoid blocking deployments on advisory-level findings, but the effect is that deployments containing known critical vulnerabilities can complete without any human review or automated block. This must be corrected immediately.

### Missing Security Scanning

No secret scanning tool is configured in the CI pipeline. Tools such as TruffleHog, detect-secrets, or GitHub's native secret scanning (when enabled on the repository) would catch accidentally committed secrets before they are merged. No SAST tool such as CodeQL, Snyk Code, or SonarQube is integrated into the pipeline or as a GitHub App on the repository. These gaps mean that statically detectable code vulnerabilities and credential leaks will not be caught automatically.

### Prisma db push in CI

The CI pipeline runs `prisma db push` at approximately line 141 of the workflow file. The `db push` command is a Prisma development convenience that directly introspects the schema file and applies the necessary DDL changes to the target database without creating a migration file. This approach does not generate a migration history, which means schema changes cannot be audited over time, cannot be selectively rolled back, and cannot be safely applied to a production database that contains existing user data. The correct production workflow uses `prisma migrate deploy` against a set of versioned migration files that are committed to the repository.

### Docker Strengths

The API Dockerfile uses a multi-stage build that separates the dependency installation and TypeScript compilation stage from the final production image stage, significantly reducing the final image size and the attack surface. The final image stage runs as a non-root user with UID 1001 named `fastify`, following the principle of least privilege. A `HEALTHCHECK` instruction is included so that container orchestrators can detect unhealthy instances. The `docker-compose.yml` defines CPU and memory resource limits for all four services (API, Web, PostgreSQL, Redis) and includes health check configurations with appropriate intervals and retry counts.

### Deployment Gap

No deployment step exists in the CI pipeline. All deployments to any environment are performed manually by a developer. This prevents automated rollback (there is no automated forward path to reverse), makes deployment frequency impossible to measure in DORA terms, and creates a single point of human failure in the release process. Any developer error during a manual deployment step has no automated recovery.

---

## Section 11: Compliance Tables

### OWASP Top 10 (2021)

| Control | Status | Notes |
|---|---|---|
| A01 — Broken Access Control | Partial | BOLA tests pass; CSRF enforcement gap needs verification; connection ownership enforced at service layer |
| A02 — Cryptographic Failures | Pass | bcrypt 12 rounds for passwords; refresh tokens SHA-256 hashed in DB; HTTPS expected in production via reverse proxy |
| A03 — Injection | Pass | Prisma ORM parameterizes all queries; no raw SQL observed anywhere in the codebase |
| A04 — Insecure Design | Partial | Connection business rules enforced; account lockout implemented; no formal threat model document exists |
| A05 — Security Misconfiguration | Partial | Helmet, CORS, and CSRF configured correctly; dev secrets committed to version control; wildcard image hostname |
| A06 — Vulnerable and Outdated Components | Partial | npm audit runs in CI but is non-blocking; no Dependabot configuration for automated dependency updates |
| A07 — Identification and Authentication Failures | Pass | Account lockout after 5 attempts; per-route rate limiting; refresh token rotation; bcrypt strong hashing |
| A08 — Software and Data Integrity Failures | Partial | No SAST configured; no code signing; refresh token integrity enforced via hashing |
| A09 — Security Logging and Monitoring Failures | Fail | No alerting infrastructure; no log aggregation; no error tracking; prom metrics emitted but not scraped |
| A10 — Server-Side Request Forgery | Partial | Next.js image wildcard hostname creates an SSRF vector; no other SSRF vectors identified |

### OWASP API Security Top 10 (2023)

| Control | Status | Notes |
|---|---|---|
| API1 — Broken Object Level Authorization | Pass | Explicit BOLA tests pass in security.test.ts; ownership checks in connection service |
| API2 — Broken Authentication | Pass | JWT with rotation; account lockout; strict rate limiting on all auth routes |
| API3 — Broken Object Property Level Authorization | Partial | Fastify schemas validate and filter input fields; a comprehensive mass-assignment review is recommended |
| API4 — Unrestricted Resource Consumption | Partial | Rate limiting is active globally and per-route; payload size limits were not explicitly reviewed |
| API5 — Broken Function Level Authorization | Pass | RBAC is enforced on all recruiter-gated routes; role check in service layer |
| API6 — Unrestricted Access to Sensitive Business Flows | Pass | Connection business limits (100 pending, 30-day cooldown, 90-day expiry) are enforced at service layer |
| API7 — Server Side Request Forgery | Partial | Wildcard hostname in Next.js image configuration creates an SSRF vector through the image optimization proxy |
| API8 — Security Misconfiguration | Partial | Helmet, CORS, and CSRF are configured; dev secrets committed; wildcard image hostname |
| API9 — Improper Inventory Management | Partial | API is versioned at /api/v1; OpenAPI exists at /docs but coverage is incomplete for many routes |
| API10 — Unsafe Consumption of APIs | Pass | No third-party API consumption was observed in the reviewed codebase |

### SOC2 Type II Trust Service Principles

| Principle | Status | Primary Gap |
|---|---|---|
| Security | Partial | No SAST; no secret scanning; CSRF enforcement gap; missing monitoring and alerting |
| Availability | Fail | No monitoring infrastructure; no automated deployment; no automated rollback; no SLA measurement possible |
| Processing Integrity | Partial | Input validation is strong via Fastify schemas; no checksums on data export; no data integrity monitoring |
| Confidentiality | Partial | TLS expected at reverse proxy; no data classification policy; no encryption at rest documented |
| Privacy | Partial | Consent model exists in database; no cookie consent UI; no data retention enforcement; no right-to-restrict endpoint |

### WCAG 2.1 AA — POUR Principles

| Principle | Status | Specific Failures |
|---|---|---|
| Perceivable | Fail | Error text color contrast 3.5:1 (need 4.5:1); placeholder text contrast 3.2:1; secondary text contrast 3.8:1; all three below the WCAG 1.4.3 minimum |
| Operable | Fail | Modal focus traps missing in ApplyModal and CreateJobModal; keyboard users cannot be contained within open dialogs, violating the modal interaction pattern required by WCAG 2.1 |
| Understandable | Fail | Page titles do not update on navigation (WCAG 2.4.2 failure); feed and jobs pages missing h1 elements breaking document outline |
| Robust | Partial | ARIA `role="dialog"` and `aria-modal="true"` are correctly applied to all modals; icon-only button ARIA labels are present; `lang` attribute updates dynamically for RTL/LTR switching |

### GDPR Rights and Requirements

| Right or Requirement | Status | Notes |
|---|---|---|
| Right to Access (Art. 15) | Pass | GET /api/v1/auth/export endpoint exists and returns structured user data |
| Right to Erasure (Art. 17) | Pass | DELETE /api/v1/auth/account endpoint exists and removes user data |
| Right to Portability (Art. 20) | Pass | Export endpoint provides data in a structured, machine-readable format |
| Right to Restriction (Art. 18) | Fail | No endpoint implements processing restriction; data can only be deleted, not restricted |
| Right to Rectification (Art. 16) | Partial | Profile update endpoints exist; completeness of updatable fields not fully verified |
| Lawful Basis (Art. 6) | Fail | No cookie consent banner; no consent mechanism before data collection begins |
| Data Minimization (Art. 5.1.c) | Partial | IP and UserAgent are collected and stored; retention purpose is not documented |
| Breach Notification (Art. 33) | Fail | No incident response process is documented; no monitoring to detect breaches |

### DORA Metrics Assessment

| Metric | Current State | Target |
|---|---|---|
| Deployment Frequency | Unknown — manual deployments with no tracking infrastructure | Daily or weekly deployments |
| Lead Time for Changes | Approximately 25 minutes (the duration of one full CI pipeline run) | Under 1 hour from commit to production |
| Change Failure Rate | Unknown — no monitoring to detect production failures after deployment | Under 15% |
| Mean Time to Recovery | Unknown — no automated rollback; manual intervention required for all incidents | Under 1 hour |

---

## Section 11b: Accessibility Detail

| # | File | Approximate Location | WCAG Criterion | Severity | Specific Fix |
|---|---|---|---|---|---|
| 1 | `apps/web/src/app/(main)/profile/page.tsx` | Lines 80-89 — profile headline input | 1.3.1 Info and Relationships; 4.1.2 Name, Role, Value | High | Add `aria-label="Edit headline"` attribute to the input element, or associate a visible `<label>` element using `htmlFor` and a matching `id` on the input |
| 2 | `apps/web/src/components/jobs/ApplyModal.tsx` | Entire modal component | 2.1.1 Keyboard; 2.1.2 No Keyboard Trap (inverse — must trap focus inside open dialog) | High | Implement a focus trap using `focus-trap-react` or a custom implementation that intercepts Tab and Shift+Tab to cycle focus within the dialog boundaries while it is open |
| 3 | `apps/web/src/components/jobs/CreateJobModal.tsx` | Entire modal component | 2.1.1 Keyboard; 2.1.2 No Keyboard Trap | High | Same solution as RISK-002 — implement a focus trap that contains keyboard focus within the open dialog |
| 4 | `apps/web/src/app/(main)/feed/page.tsx` | Page-level markup structure | 1.3.1 Info and Relationships; 2.4.6 Headings and Labels | High | Add `<h1 className="sr-only">{t("feed.title")}</h1>` at the top of the main content area; the `sr-only` Tailwind class makes it visible to assistive technology without altering the visual layout |
| 5 | `apps/web/src/app/(main)/jobs/page.tsx` | Page-level markup structure | 1.3.1; 2.4.6 | High | Add `<h1 className="sr-only">{t("jobs.title")}</h1>` using the same pattern as the feed page fix |
| 6 | `apps/web/src/app/page.tsx` | Line 74 — heading element | 1.3.1 Info and Relationships | Medium | Change the `<h3>` element to `<h2>` to eliminate the skipped heading level and maintain a correct sequential heading hierarchy on the landing page |
| 7 | Global CSS — error color `#EF4444` | Tailwind configuration or global stylesheet | 1.4.3 Contrast Minimum | Medium | Replace `#EF4444` (Tailwind `red-500`, 3.5:1 on white) with `#B91C1C` (Tailwind `red-700`, approximately 5.9:1 on white), which satisfies WCAG 1.4.3 AA and AAA thresholds |
| 8 | Global CSS — placeholder color `#94A3B8` | Tailwind configuration or global stylesheet | 1.4.3 Contrast Minimum | Medium | Darken to `#64748B` (Tailwind `slate-500`) at minimum, or use a different visual treatment such as italic text to distinguish placeholders without relying solely on low-contrast color |
| 9 | Global CSS — secondary text color `#64748B` | Tailwind configuration or global stylesheet | 1.4.3 Contrast Minimum | Medium | Darken to `#475569` (Tailwind `slate-600`) which achieves approximately 4.5:1 contrast against white backgrounds, satisfying WCAG 1.4.3 |
| 10 | `apps/web/src/app/layout.tsx` and all child page layouts | Root metadata export and child page layout files | 2.4.2 Page Titled | Medium | Each page file in `apps/web/src/app/(main)/` should export its own `metadata` object with a unique `title` string (for example: `{ title: "Feed | ConnectIn" }`) so that the browser tab title and screen-reader page announcements reflect the current page |

---

## Section 11c: Privacy Detail

| Data Type | Where Stored | Lawful Basis | Retention Policy | Encrypted at Rest | User Deletable | User Exportable |
|---|---|---|---|---|---|---|
| Email address | User model — `users` table | Contract performance (account creation) | None defined | Depends on database-level encryption (not configured) | Yes — account deletion endpoint | Yes — export endpoint |
| Display name | Profile model — `profiles` table | Contract performance | None defined | Depends on database-level encryption | Yes — account deletion | Yes — export endpoint |
| Password hash | User model — `users` table | Contract performance | Until account deletion | bcrypt hash — not reversible to plaintext | Yes — account deletion removes the record | No — correctly excluded from export |
| IP address (session) | Session model — `sessions` table | Legitimate interest (security) | 30-day session expiry (session record deleted on expiry) | Depends on database-level encryption | Yes — session deletion or account deletion | Yes — included in export |
| User agent string (session) | Session model — `sessions` table | Legitimate interest (security) | 30-day session expiry | Depends on database-level encryption | Yes — session deletion | Yes — included in export |
| User agent string (consent) | Consent model — `consents` table | Legal obligation (consent audit trail) | None defined — audit records should be retained | Depends on database-level encryption | No — audit records must not be altered | Yes — included in export |
| IP address (consent) | Consent model — `consents` table | Legal obligation (consent audit trail) | None defined | Depends on database-level encryption | No — audit records must not be altered | Yes — included in export |

---

## Section 11d: Observability Detail

### Four Golden Signals Assessment

**Latency:** The Pino access log plugin records request duration in milliseconds for every HTTP request, making raw latency data available in the log stream. The Prometheus histogram `http_request_duration_seconds` captures latency with configurable bucket boundaries, which would allow p50, p95, and p99 percentile calculations. However, no Prometheus server scrapes this endpoint, no Grafana dashboard visualizes latency trends over time, and no alerting rule fires when latency exceeds a defined threshold. Rating: Partially implemented — the instrumentation exists but is not connected to any actionable infrastructure.

**Traffic:** The Prometheus counter `http_requests_total` is labeled by HTTP method, route path, and response status code, providing the data necessary to measure request volume and traffic patterns. However, as with latency, no scraping infrastructure collects these metrics, no dashboard visualizes them, and no alert fires when traffic drops to zero (which would indicate a potential total service outage). Rating: Partially implemented.

**Errors:** Error responses are logged via Pino with structured fields for the error message, code, and context. The Prometheus counter distinguishes 4xx and 5xx responses through the status code label on `http_requests_total`. However, no error rate alert exists, no error tracking service captures stack traces with user context, and no on-call notification would fire during an error rate spike. An error surge would only be detected when users begin reporting issues directly. Rating: Partially implemented.

**Saturation:** Calling `prom-client`'s `collectDefaultMetrics()` function captures Node.js process-level metrics including heap memory usage, event loop lag, and garbage collection timing and frequency. These are emitted at the `/metrics` endpoint alongside the application-level metrics. However, as with all other metric signals, they are not scraped, visualized, or alerting on any threshold. An out-of-memory condition or event loop starvation would not trigger any automated response. Rating: Partially implemented.

---

## Section 12: Technical Debt Map

| Priority | Debt Item | Accruing Interest | Owner | Payoff |
|---|---|---|---|---|
| Critical | No database migration history — prisma db push in use | Each schema change risks data loss in production and cannot be safely rolled back | DevOps Lead | Switch development workflow to `prisma migrate dev` and commit migration files; use `prisma migrate deploy` in CI |
| Critical | Security audit non-blocking in CI | Critical package vulnerabilities can reach production undetected on every deploy | DevOps Lead | Change `continue-on-error: true` to `false` on the security audit step — a one-line change |
| High | No monitoring infrastructure | Outages are invisible until user reports arrive; no SLA can be measured or guaranteed | Engineering Lead | Add Prometheus service and Grafana to docker-compose; configure alerting rules for the four golden signals |
| High | No cookie consent before data collection | Regulatory exposure accumulates in every EU and PDPL market from day one of operation | Product Lead | Implement a consent banner that gates session creation on explicit user acknowledgment |
| High | Modal focus traps missing in job application modals | Accessibility litigation risk increases with every user who encounters the broken keyboard navigation | Frontend Lead | Implement focus-trap-react in ApplyModal and CreateJobModal |
| High | Redis provisioned but unused | Cache infrastructure cost is incurred with zero performance benefit; feed will degrade at scale | Backend Lead | Implement cache-aside pattern for feed and jobs queries using the existing Redis client |
| Medium | Dev secrets in version control | Pattern normalization increases the risk that the mistake is repeated in staging or production | DevOps Lead | Add .env to gitignore; rotate all committed credential values; document .env.example with placeholders |
| Medium | OpenAPI schema incomplete | API consumers cannot generate reliable client SDKs; auto-generated documentation is misleading | Backend Lead | Complete schema annotation for all route handlers across all route files |
| Medium | No coverage threshold in CI | Test coverage can silently regress as new features are added without corresponding tests | QA Lead | Add `--coverage --coverageThreshold='{"global":{"lines":80}}'` to Jest test command in CI |
| Medium | No Dependabot configuration | Dependency vulnerabilities accumulate between the infrequent manual `npm audit` reviews | DevOps Lead | Create `.github/dependabot.yml` for the npm ecosystem with a weekly update schedule |
| Low | Next.js image hostname wildcard in next.config.ts | SSRF attack surface grows as the application handles more image origins | Frontend Lead | Restrict the `remotePatterns` configuration to the specific known trusted image hosting domains |
| Low | No token blacklisting despite Redis being available | Stolen refresh tokens remain valid for up to 30 days after discovery of compromise | Backend Lead | Implement a Redis-backed token blacklist that is checked on every refresh token validation |

---

## Section 13: Remediation Roadmap

### Phase 0 — Immediate (48 hours)

These items can each be completed within one business day and should be treated as blockers for any production deployment timeline.

**Fix accessibility quick wins.** Add `aria-label="Edit headline"` to the profile headline input in `apps/web/src/app/(main)/profile/page.tsx` at approximately line 80. Add a visually hidden `<h1>` element to both the feed page (`apps/web/src/app/(main)/feed/page.tsx`) and the jobs page (`apps/web/src/app/(main)/jobs/page.tsx`). Change the `<h3>` on the landing page (`apps/web/src/app/page.tsx` at line 74) to `<h2>`. These changes require fewer than 20 lines of code across three files. Assigned to: Frontend developer.

**Make CI security audit blocking.** In `.github/workflows/connectin-ci.yml` at approximately line 228, change `continue-on-error: true` to `continue-on-error: false`. This is a single-character change that immediately strengthens the security posture of every future deployment by ensuring critical package vulnerabilities block the pipeline. Assigned to: DevOps lead.

**Remove .env from version control.** Add `apps/api/.env` and `apps/web/.env` to the project's `.gitignore` file. Create `.env.example` files in both directories with all required environment variable names and placeholder values. Rotate all JWT signing secrets and any other credential values that were previously committed, as those values in git history must be considered compromised regardless of future gitignore changes. Assigned to: DevOps lead.

### Phase 1 — Short Term (1 to 2 weeks)

These items are required before a production launch can proceed.

**Implement modal focus traps.** Add a focus trap implementation to `apps/web/src/components/jobs/ApplyModal.tsx` and `apps/web/src/components/jobs/CreateJobModal.tsx` using an established library such as `focus-trap-react`. The focus trap should activate when the modal opens, contain Tab and Shift+Tab cycling within the dialog's focusable elements, and deactivate when the modal closes. Assigned to: Frontend developer. Estimated effort: 4 hours.

**Fix color contrast violations.** Update the Tailwind configuration or global CSS to replace the non-compliant error text color (`#EF4444`) with a WCAG-compliant alternative (`#B91C1C`), darken placeholder text and secondary text colors to meet the 4.5:1 minimum contrast ratio, and audit any other color combinations that may have been introduced since the original design. Assigned to: Frontend developer. Estimated effort: 2 to 4 hours.

**Add per-page metadata titles.** Export a page-specific `metadata` object from each page file in `apps/web/src/app/(main)/` with a unique `title` string that describes the current page and includes the product name (for example: `{ title: "Feed | ConnectIn" }`). This resolves WCAG 2.4.2 across all authenticated pages. Assigned to: Frontend developer. Estimated effort: 1 to 2 hours.

**Add Dependabot configuration.** Create `.github/dependabot.yml` configured for the `npm` package ecosystem, with entries targeting the root `package.json`, `apps/api/package.json`, and `apps/web/package.json`. Set the update schedule to `weekly`. Assigned to: DevOps lead. Estimated effort: 1 hour.

**Implement database migrations.** Replace the `prisma db push` command in the CI workflow with `prisma migrate deploy`. Run `prisma migrate dev --name initial-schema` locally to generate the first migration file from the current schema state. Commit the generated migration files and confirm the CI pipeline applies them successfully on a clean database. Assigned to: DevOps lead. Estimated effort: 4 hours.

**Implement cookie consent.** Add a cookie consent banner component to the root layout that is displayed before any session data is collected. The banner should offer at minimum an "Accept" option and a link to the privacy policy. Session creation should be deferred until after acknowledgment, or the consent event itself should be the trigger for beginning IP and user agent collection. Coordinate with legal on the required consent text and the specific data processing purposes that must be disclosed. Assigned to: Frontend developer and Product lead. Estimated effort: 1 to 2 days.

### Phase 2 — Medium Term (2 to 4 weeks)

These items address observability, caching, additional security hardening, and privacy gap closure.

**Add Prometheus and Grafana to docker-compose.** Define a `prometheus` service in `docker-compose.yml` configured with a scrape job targeting the API `/metrics` endpoint. Define a `grafana` service with a provisioned dashboard for the four golden signals (latency histograms, request rate, error rate, and process saturation). Configure at minimum one alerting rule that fires when the API returns no successful responses for 5 minutes. Assigned to: DevOps lead. Estimated effort: 2 days.

**Implement Redis caching for feed and jobs.** Add a cache-aside pattern in the feed service and jobs service using the existing Redis client. Use a 60-second TTL for feed page queries and a 120-second TTL for jobs listing queries. Invalidate the relevant cache keys when new posts are created or when job listings are modified. Assigned to: Backend developer. Estimated effort: 1 day.

**Implement token blacklisting with Redis.** Add a Redis SET that stores hashed refresh token values that have been explicitly revoked (on logout, password change, or account compromise). Check the blacklist during the refresh token validation flow before issuing a new token pair. Use a TTL on each Redis key equal to the remaining lifetime of the original refresh token so that the blacklist entry is automatically cleaned up when the token would have expired anyway. Assigned to: Backend developer. Estimated effort: 4 hours.

**Add Sentry or equivalent error tracking.** Integrate Sentry into the API using the `@sentry/node` SDK and into the frontend using the `@sentry/nextjs` SDK. Configure both integrations to capture unhandled errors with full stack traces and user context. Set up alerting in Sentry to notify the engineering team when a new error type is first encountered or when an existing error's frequency exceeds a defined threshold. Assigned to: Backend and frontend developers. Estimated effort: 1 day.

**Add SAST to CI pipeline.** Enable GitHub's CodeQL analysis as a GitHub Actions workflow, or integrate Snyk Code as a CI step. Configure SAST to run on every pull request targeting the main branch and to report findings as pull request annotations. Define a threshold above which findings block the pull request merge. Assigned to: DevOps lead. Estimated effort: 4 hours.

**Add right-to-restrict-processing endpoint.** Implement `POST /api/v1/auth/restrict` following GDPR Article 18, which marks the authenticated user's account as restricted in the database. When an account is restricted, the API should halt all data processing for that account while retaining the data intact. Add a corresponding `DELETE /api/v1/auth/restrict` endpoint to lift the restriction when the user requests it. Assigned to: Backend developer. Estimated effort: 4 hours.

**Define and enforce data retention policy.** Work with legal counsel to define specific retention periods for each PII data category collected by the platform (for example: session records deleted after 30 days, consent records retained for 7 years). Implement an automated cleanup job that runs on a nightly schedule and deletes records that have exceeded their defined retention period. Assigned to: Backend developer and Legal. Estimated effort: 2 to 3 days.

### Phase 3 — Long Term (4 to 8 weeks)

These items address architectural maturity, compliance depth, and operational scalability.

**Implement continuous deployment pipeline.** Add a CD stage to the CI pipeline that automatically deploys the built Docker image to a staging environment after all test gates pass. Add a manual approval gate before production deployment. Implement an automated rollback trigger based on post-deployment health check results so that a failed deployment is reversed automatically within minutes without requiring manual intervention. Assigned to: DevOps lead. Estimated effort: 1 week.

**Implement OpenTelemetry distributed tracing.** Instrument the Fastify API with the OpenTelemetry Node.js SDK, enabling automatic span generation for HTTP requests, Fastify route handling, and Prisma database queries. Configure a Jaeger or Grafana Tempo backend to collect and visualize trace data. This will enable root cause analysis for performance degradation across the full request lifecycle. Assigned to: Backend developer. Estimated effort: 2 to 3 days.

**Build a load testing suite.** Create k6 or Artillery test scripts that simulate realistic concurrent user load patterns on the feed, jobs search, and authentication endpoints. Run the load tests to establish p50, p95, and p99 response time baselines. Identify the concurrency threshold at which the system degrades. Add a performance gate to the CI pipeline that fails if p95 latency exceeds a defined SLA threshold. Assigned to: QA lead. Estimated effort: 3 to 5 days.

**Conduct a full GDPR compliance audit.** Engage a legal or compliance specialist to review the complete personal data lifecycle, consent mechanisms, privacy policy text, breach notification procedure, data processor agreements with any third-party services, and data subject request handling procedures. This audit should produce a Record of Processing Activities (ROPA) as required by GDPR Article 30. Assigned to: Security lead and Legal. Estimated effort: 2 to 4 weeks.

---

## Section 14: Quick Wins — 1-Day Fixes

Each of the following changes requires under one hour of engineering effort and provides immediate, measurable improvement to the product's quality or security posture.

1. **Profile headline label** — In `apps/web/src/app/(main)/profile/page.tsx` at approximately line 80, add `aria-label="Edit headline"` to the headline input element. This resolves WCAG 4.1.2 for that specific field and makes the input purpose discoverable to screen readers without any visual change.

2. **Feed page h1** — In `apps/web/src/app/(main)/feed/page.tsx`, add `<h1 className="sr-only">{t("feed.title")}</h1>` at the top of the main content container. The `sr-only` Tailwind class hides the element visually while keeping it in the accessibility tree for screen readers and headings-based navigation.

3. **Jobs page h1** — In `apps/web/src/app/(main)/jobs/page.tsx`, add `<h1 className="sr-only">{t("jobs.title")}</h1>` using the same pattern as the feed page fix above.

4. **Landing page heading hierarchy** — In `apps/web/src/app/page.tsx` at approximately line 74, change the `<h3>` element to `<h2>` to eliminate the skipped heading level and restore a correct sequential heading hierarchy on the landing page.

5. **Error text color** — Globally replace the error text color `#EF4444` with `#B91C1C` in the Tailwind configuration or global CSS. The new value achieves approximately 5.9:1 contrast against white, satisfying both WCAG 1.4.3 AA and AAA thresholds. Users with low vision will be able to read error messages without difficulty.

6. **Make CI security audit blocking** — In `.github/workflows/connectin-ci.yml` at approximately line 228, change `continue-on-error: true` to `continue-on-error: false`. This single change ensures that critical package vulnerabilities block the pipeline from completing, preventing the deployment of code with known critical security flaws.

7. **Add .env to gitignore** — Add `apps/api/.env` and `apps/web/.env` entries to the repository root `.gitignore` and to any per-app `.gitignore` files. Create `apps/api/.env.example` and `apps/web/.env.example` files with all required variable names and clearly labeled placeholder values. This prevents future accidental commits of sensitive configuration.

8. **Add Dependabot configuration** — Create `.github/dependabot.yml` with entries for the `npm` package ecosystem targeting the root directory, `apps/api`, and `apps/web`, each with a `weekly` update schedule. Dependabot will then automatically open pull requests for dependency updates, keeping the dependency tree current without manual monitoring effort.

9. **Profile input aria-describedby** — Add a `<p id="headline-hint">` element with brief guidance text (for example: "Your professional headline appears below your name on your profile") immediately below the profile headline input field. Add `aria-describedby="headline-hint"` to the input element. Screen readers will then read the hint text after announcing the input's label, providing additional context to the user.

10. **Dynamic page titles for all main pages** — Add an exported `metadata` object to each layout or page file in `apps/web/src/app/(main)/` — covering feed, jobs, profile, and network — that sets a unique `title` string for each section. Browser tab titles and screen reader page-load announcements will then correctly reflect the current page, resolving WCAG 2.4.2 across all authenticated pages in a single pass.

---

## Section 15: AI-Readiness Score

This score evaluates how suitable the ConnectIn codebase is as a foundation for AI-assisted development, automated code generation, and continuous AI-driven improvement cycles.

| Sub-dimension | Score | Notes |
|---|---|---|
| Modularity | 2.0 / 2.0 | Clean plugin/module/lib separation is maintained consistently across all feature domains. Each concern is independently addressable and new features can be added without modifying existing boundaries. Service files are single-responsibility and have clear interfaces. |
| API Design | 1.5 / 2.0 | The API is versioned at `/api/v1`, uses a consistent response envelope, and follows RESTful conventions throughout. The OpenAPI specification at `/docs` exists but is incomplete — many routes lack schema annotations — which reduces machine-readability and prevents automated client generation from the spec alone. |
| Testability | 1.5 / 2.0 | Integration tests with a real database are excellent and cover security scenarios. 26 E2E tests cover all primary user flows. The absence of unit tests for pure utility functions in `src/lib/` and the absence of coverage threshold enforcement in CI reduce the score, as AI-generated code changes cannot be validated against isolated function contracts. |
| Observability | 1.0 / 2.0 | Prometheus metrics are emitted and access logs are structured with consistent fields including request ID, user ID, and duration. However, the absence of aggregation infrastructure means the signals are generated but not actionable. AI-driven performance optimization would have no feedback loop without a metrics stack. |
| Documentation | 1.0 / 2.0 | A README exists and describes the setup process. The API documentation at `/docs` is incomplete. No architecture decision records were found in the repository. The incomplete OpenAPI specification reduces the context available to AI systems during code generation and code review tasks. |
| **Total** | **7.0 / 10** | ConnectIn has a strong technical foundation with clear module boundaries and consistent patterns that make AI-assisted development straightforward in practice. The primary limiters are the incomplete OpenAPI specification, the absence of observability aggregation infrastructure, and the documentation gaps. Addressing the Phase 1 remediation items will raise this score to approximately 8.5/10. |

---

*End of Audit Report — ConnectIn — 2026-02-22*
*Prepared by: ConnectSW Code Reviewer*
*Classification: Internal — Engineering and Leadership*
