# AI Fluency -- Production Audit Report

**Date**: 2026-03-06
**Auditor**: Code Reviewer, ConnectSW
**Branch**: feature/ai-fluency/openrouter-assessments
**Scope**: Full product audit (backend + frontend + docs)

---

## Executive Summary

**Overall Score: 7.4 / 10**
**Verdict: PASS-WITH-CONDITIONS**

The AI Fluency platform demonstrates solid foundational architecture with well-structured code, strong security fundamentals, and good test coverage for a product at this stage. The backend is well-layered with proper separation of concerns, the auth system follows security best practices (Argon2id, timing-safe comparisons, SHA-256 token hashing), and the scoring engine is correctly implemented as a pure function.

Conditions for full PASS:
1. Fix the `$executeRawUnsafe` call in the RLS plugin -- it uses parameterized queries but the function name suggests risk (see Critical #1)
2. Add missing `GET /api/v1/auth/me` endpoint that the frontend depends on
3. Address the frontend-backend auth token mismatch (frontend uses `credentials: 'include'` for cookies, but backend sends tokens in response body)
4. Add pagination to profile history endpoint

**Top 5 Risks (Plain Language):**
1. The frontend login flow will not work end-to-end because the API client and auth hook expect a different auth contract than what the backend provides
2. Profile and learning path queries lack orgId filtering -- a user in Org A could theoretically read another user's profile if they guess the userId
3. No session expiry cleanup job exists -- expired assessment sessions and refresh tokens accumulate forever
4. The `dimensions.sort()` call in learning-path.service.ts mutates the original array (JavaScript sort is in-place)
5. AI evaluator and feedback services are implemented but never wired into any route

---

## Dimension Scores

| Dimension | Score | Status |
|-----------|-------|--------|
| Code Quality | 8/10 | PASS |
| Security | 7/10 | PASS-WITH-CONDITIONS |
| Test Coverage | 7/10 | PASS |
| Architecture | 8/10 | PASS |
| Error Handling | 8/10 | PASS |
| Performance | 6/10 | PASS-WITH-CONDITIONS |
| Documentation | 7/10 | PASS |
| Accessibility | 8/10 | PASS |
| Type Safety | 7/10 | PASS |
| DevOps/CI | 5/10 | NEEDS WORK |

---

## Critical Findings (must fix before merge)

### C-1: Frontend-Backend Auth Contract Mismatch

**Severity**: Critical | **Likelihood**: High | **Blast Radius**: Product-wide

**Description**: The frontend `useAuth` hook (`apps/web/src/hooks/useAuth.ts:34-48`) calls `GET /api/v1/auth/me` on mount to check the session. This endpoint does not exist in the backend (`apps/api/src/routes/auth.ts`). Additionally, the frontend API client (`apps/web/src/lib/api.ts:31-36`) sends `credentials: 'include'` expecting httpOnly cookie-based auth, but the backend returns the access token in the JSON response body. The frontend has no token storage or Authorization header injection.

**Files**:
- `apps/web/src/hooks/useAuth.ts:36` -- calls `/auth/me` which does not exist
- `apps/web/src/lib/api.ts:31` -- uses `credentials: 'include'` but no Authorization header
- `apps/api/src/routes/auth.ts` -- no `/me` endpoint defined

**Fix**: Either:
(a) Add a `GET /api/v1/auth/me` endpoint to the backend and store the access token in an httpOnly cookie (matching the frontend's expectations), OR
(b) Add a TokenManager to the frontend that stores the access token in memory and injects the `Authorization: Bearer` header into every request.

### C-2: Profile Routes Missing orgId Filtering (Cross-Tenant Data Leak Risk)

**Severity**: Critical | **Likelihood**: Medium | **Blast Radius**: Organization-wide

**Description**: The profile routes (`apps/api/src/routes/profiles.ts:23,50`) query `fluencyProfile` filtered only by `userId`, not by `orgId`. Since the auth plugin verifies the user exists in the JWT's org, the userId is trusted. However, the addendum mandates that all tenant-scoped queries operate within RLS context. These queries bypass RLS entirely because `withRls()` is not used, and the raw Prisma queries go through the admin connection.

**Files**:
- `apps/api/src/routes/profiles.ts:23` -- `findFirst({ where: { userId: user.id } })` -- no orgId filter
- `apps/api/src/routes/profiles.ts:50` -- `findMany({ where: { userId: user.id } })` -- no orgId filter

**Fix**:
```typescript
// BEFORE:
const profile = await fastify.prisma.fluencyProfile.findFirst({
  where: { userId: user.id },
  orderBy: { createdAt: 'desc' },
});

// AFTER:
const profile = await fastify.prisma.fluencyProfile.findFirst({
  where: { userId: user.id, orgId: user.orgId },
  orderBy: { createdAt: 'desc' },
});
```

### C-3: Learning Path Service Mutates Local Array

**Severity**: High | **Likelihood**: High | **Blast Radius**: Feature-specific

**Description**: `apps/api/src/services/learning-path.service.ts:44` calls `dimensions.sort()` which mutates the original `dimensions` array in-place. Since `dimensions` is defined as a local `const`, this is technically safe per invocation, but it is a correctness bug pattern: the sorted order persists for the rest of the function when it should not modify the source array.

**File**: `apps/api/src/services/learning-path.service.ts:44`

**Fix**:
```typescript
// BEFORE:
const sortedDimensions = dimensions.sort(
  (a, b) => (dimScores[a] ?? 0) - (dimScores[b] ?? 0)
);

// AFTER:
const sortedDimensions = [...dimensions].sort(
  (a, b) => (dimScores[a] ?? 0) - (dimScores[b] ?? 0)
);
```

---

## High-Priority Findings (should fix soon)

### H-1: AI Evaluator and Feedback Services Never Used

**Severity**: High | **Likelihood**: High | **Blast Radius**: Feature-specific

**Description**: `AIEvaluator` (`apps/api/src/services/ai-evaluator.ts`) and `AIFeedbackGenerator` (`apps/api/src/services/ai-feedback.ts`) are fully implemented and tested but are never instantiated or called from any route handler. The assessment completion flow (`apps/api/src/services/assessment.service.ts:186-278`) uses only the rule-based `scoreAssessment()` function. This means the OpenRouter integration is dead code -- assessments never get AI-powered evaluation or feedback.

**Fix**: Wire the AI evaluator into the `completeSession` method or create dedicated endpoints for AI-powered features.

### H-2: No Session/Token Cleanup Job

**Severity**: High | **Likelihood**: High | **Blast Radius**: Product-wide

**Description**: Expired refresh tokens (`user_sessions.expiresAt`) and expired/abandoned assessment sessions (`assessment_sessions.expiresAt`) are never cleaned up. The `UserSession` table will grow unboundedly. The addendum specifies BullMQ workers for background jobs, but no worker code exists.

**Files**:
- `apps/api/src/services/auth.service.ts:228-229` -- deletes individual expired sessions on refresh, but no bulk cleanup
- No `apps/api/src/workers/` directory exists despite addendum specification

**Fix**: Implement a scheduled BullMQ job that runs every hour:
1. Delete `user_sessions WHERE expiresAt < NOW()`
2. Update `assessment_sessions SET status = 'EXPIRED' WHERE status = 'IN_PROGRESS' AND expiresAt < NOW()`

### H-3: No Audit Logging

**Severity**: High | **Likelihood**: Medium | **Blast Radius**: Product-wide

**Description**: The schema defines an `AuditLog` model, but no route or service writes to it. Login, logout, registration, assessment completion, and profile creation are all sensitive operations that should be audit-logged per the addendum.

**Files**: No audit log writes found anywhere in `apps/api/src/`.

### H-4: Assessment Session Expiry Not Enforced

**Severity**: High | **Likelihood**: Medium | **Blast Radius**: Feature-specific

**Description**: `AssessmentService.createSession()` sets `expiresAt` (`apps/api/src/services/assessment.service.ts:63`), but `saveResponse()` and `completeSession()` never check if the session has expired. A user could complete a session days after it expired.

**Fix**: Add `expiresAt: { gt: new Date() }` to the `findFirst` where clauses in `saveResponse` and `completeSession`.

### H-5: Password Strength Validation Too Weak

**Severity**: Medium | **Likelihood**: Medium | **Blast Radius**: Product-wide

**Description**: The registration schema (`apps/api/src/routes/auth.ts:24`) only requires `min(8)` characters. No complexity requirements (uppercase, lowercase, digit, special character). The addendum specifies OWASP password policies.

**Fix**: Add regex or zod refinement:
```typescript
password: z.string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character')
```

---

## Medium-Priority Findings (improve later)

### M-1: Profile History Endpoint Lacks Pagination

**File**: `apps/api/src/routes/profiles.ts:50-73`

The `GET /history` endpoint uses `findMany` without `take`/`skip`. For users with many assessment attempts, this returns unbounded data. The addendum mandates pagination on all list endpoints with `page`/`limit` query params and a max limit of 100.

### M-2: Login Does Not Implement Account Lockout

**File**: `apps/api/src/services/auth.service.ts:138-203`

The `User` model has `loginFailureCount` and `lockedUntil` fields, but the login logic never increments `loginFailureCount` on failed attempts or locks the account. This leaves the system vulnerable to brute-force attacks (rate limiting helps but is not sufficient).

### M-3: `$executeRawUnsafe` Usage in RLS Plugin

**File**: `apps/api/src/plugins/prisma.ts:81`

```typescript
await tx.$executeRawUnsafe(
  `SELECT set_config('app.current_org_id', $1, true)`,
  orgId
);
```

This uses `$executeRawUnsafe` but with parameterized `$1` binding, so it is actually safe from SQL injection. However, the function name triggers static analysis warnings. Recommend using `$executeRaw` with tagged template:
```typescript
await tx.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`;
```

### M-4: No CSRF Protection Activated

**File**: `apps/api/package.json:25`

`@fastify/csrf-protection` is listed as a dependency but never registered in `app.ts`. If the auth model transitions to cookie-based tokens, CSRF protection becomes mandatory.

### M-5: Frontend Type Mismatch with Backend

**File**: `apps/web/src/types/index.ts`

The frontend `UserRole` type uses lowercase (`'learner' | 'manager' | 'admin'`) while the backend uses uppercase enums (`'LEARNER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN'`). The frontend `User` type has `name: string` while the backend returns `firstName` and `lastName` separately. The frontend `AssessmentSession.status` uses lowercase `'in_progress'` vs backend `'IN_PROGRESS'`. These mismatches will cause runtime bugs when the API is connected.

### M-6: No `withRls()` Usage in Route Handlers

**Files**: All route handlers in `apps/api/src/routes/`

The `withRls()` decorator is defined in the Prisma plugin but never used by any route handler. All queries go through `fastify.prisma` directly without setting `app.current_org_id`. This means PostgreSQL RLS policies (if applied via migration SQL) would block all queries, or if the application uses the admin connection, RLS is bypassed entirely.

### M-7: Graceful Shutdown Does Not Drain Connections

**File**: `apps/api/src/index.ts:29-37`

The SIGINT/SIGTERM handlers call `process.exit(0)` immediately without calling `app.close()` first. This does not gracefully drain in-flight requests or close DB/Redis connections.

**Fix**:
```typescript
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal} -- shutting down gracefully`);
  await app.close();
  process.exit(0);
};
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
```

---

## Detailed Analysis

### 1. Code Quality (8/10)

**Strengths:**
- Consistent file structure and naming conventions across all backend files
- Each service file has a clear JSDoc header explaining its purpose and security considerations
- Plugin registration order is documented and enforced
- The scoring engine is a clean pure function with no side effects
- Error handling uses a consistent AppError + RFC 7807 pattern throughout
- Zod validation at every route boundary
- Logger with PII redaction is well-designed

**Issues:**
- Validation logic is duplicated across routes (the `safeParse` + `throw AppError` pattern is repeated 10+ times). A shared `validateBody()` helper would reduce boilerplate
- The `sequence` variable in `learning-path.service.ts:65-72` is incremented but never used (the `map` index is used instead at line 92)
- `apps/api/src/services/auth.service.ts` duplicates `hashToken()` that already exists in `apps/api/src/utils/crypto.ts`

### 2. Security (7/10)

**Strengths:**
- Argon2id with OWASP-recommended parameters (memoryCost 65536, timeCost 3)
- Refresh tokens stored as SHA-256 hashes, never plaintext
- `crypto.timingSafeEqual` used consistently for security comparisons (crypto.ts, observability.ts)
- JWT algorithm pinned to HS256 preventing algorithm confusion attacks
- Rate limiting configured with per-user keying for authenticated requests
- Helmet security headers enabled
- CORS with origin validation, strict in production
- Generic error messages on login to prevent user enumeration
- Input validation with Zod on every route
- `.env` file not tracked in git

**Issues:**
- **C-2**: Profile queries lack orgId filtering (cross-tenant risk)
- **H-5**: Password validation too weak (min 8 chars, no complexity)
- **M-2**: Account lockout logic not implemented despite schema support
- **M-4**: CSRF protection dependency installed but not registered
- **M-6**: RLS context never set in route handlers via `withRls()`
- No Content-Security-Policy (disabled in Helmet config at `apps/api/src/app.ts:84`)
- Login endpoint has no separate, stricter rate limit (uses global 100/minute)
- No request size limit per endpoint (only global 1MB limit)

### 3. Test Coverage (7/10)

**Strengths:**
- 18 backend test files covering all major flows
- 3 unit test files for AI services (openrouter, evaluator, feedback)
- 6 E2E Playwright specs
- Tests use real database (no mocks) per company standards
- Good edge case coverage: expired tokens, locked accounts, non-existent resources
- Scoring tests thoroughly verify the algorithm (boundary values, prevalence weighting, discernment gap)
- Test helpers (`build-app.ts`, `test-org.ts`) are well-structured

**Issues:**
- No tests for learning-path service's discernment gap priority logic
- No tests for concurrent session creation (race conditions)
- No tests for session expiry enforcement (because it is not implemented)
- Frontend test coverage is minimal (3 test files: Header, home, login only)
- No tests for the `saveResponse` response idempotency across multiple sessions
- The `auth-full.test.ts` file exists but was not read -- may contain additional coverage

### 4. Architecture (8/10)

**Strengths:**
- Clean layered architecture: routes -> services -> Prisma (no routes calling DB directly except profiles.ts)
- Plugin system with explicit dependency declarations and ordering
- Services are injected via constructor (PrismaClient, FastifyInstance) enabling testability
- Scoring engine is a pure function with no side effects -- excellent for testing and reproducibility
- Multi-tenancy via RLS is well-designed at the schema level
- Algorithm versioning prevents historical score invalidation
- Soft deletes for GDPR compliance on user-facing tables

**Issues:**
- `profiles.ts` route handler queries Prisma directly instead of going through a service
- AI services (evaluator, feedback) are orphaned -- built but not integrated
- No repository pattern -- services directly use PrismaClient, making it harder to swap data access
- No event/message system for cross-cutting concerns (audit logging, notifications)

### 5. Error Handling (8/10)

**Strengths:**
- RFC 7807 Problem Details format for ALL error responses -- no exceptions
- Global error handler catches AppError, ZodError, Fastify validation, rate limit, and unexpected errors
- Production errors do not expose stack traces or internal details
- 404 handler returns structured error response
- AI services degrade gracefully with fallback results

**Issues:**
- The global error handler at `app.ts:144-160` casts `error` to check `statusCode === 429` which may not catch all rate limit error formats across @fastify/rate-limit versions
- No circuit breaker on OpenRouter calls -- if the external API is slow, requests will hang until fetch timeout

### 6. Performance (6/10)

**Issues:**
- **N+1 in assessment creation**: `createSession` fetches all active questions (`apps/api/src/services/assessment.service.ts:46-58`) regardless of how many are needed for a single template. If the question bank grows to thousands, this becomes expensive
- **Unbounded query**: Profile history (`profiles.ts:50`) has no pagination limit
- **No database connection pooling config**: Prisma uses default pool settings; no `connection_limit` or `pool_timeout` configured in DATABASE_URL
- **No Redis caching**: Questions and templates are fetched from DB on every request despite being largely static global data
- **Metrics samples array** (`observability.ts:41-44`): Uses `.push()` and `.shift()` on a 1000-element array. This is O(n) for shift. Consider using a circular buffer
- **No index usage hints**: The schema has good indexes, but `getSession` fetches all active questions again rather than joining through the session's template

**Strengths:**
- Slow query logging with configurable threshold
- Rate limiting prevents abuse
- `bodyLimit: 1MB` prevents payload abuse

### 7. Documentation (7/10)

**Strengths:**
- Product addendum is comprehensive with tech stack, auth conventions, scoring formula, and plugin order
- Three ADRs (multi-tenancy, scoring algorithm, tech stack)
- API documentation exists (`docs/API.md`)
- Business analysis document exists
- Architecture document exists
- Inline JSDoc on every file explaining purpose and security considerations

**Issues:**
- No OpenAPI/Swagger spec generated from route schemas (the `api-schema.yml` may exist but routes use Zod, not JSON Schema for validation -- no automatic spec generation)
- Missing README setup instructions for running the full stack locally
- No runbook or troubleshooting guide
- The PRD should be reviewed to verify AI evaluator/feedback features are in scope vs. deferred

### 8. Accessibility (8/10)

**Strengths:**
- `aria-label` on all interactive elements (buttons, progress bars)
- `role="progressbar"` with `aria-valuenow/min/max` on all progress indicators
- `aria-live="polite"` on loading states, `aria-live="assertive"` on error alerts
- `sr-only` legends on fieldsets (ScenarioOptions, LikertOptions)
- Keyboard focus indicators (`focus:ring-2 focus:ring-brand-500`)
- `SkipNav` component exists for skip-to-content navigation
- `min-h-[48px]` and `min-w-[48px]` touch targets on interactive elements
- `aria-current="page"` on active nav items
- Semantic HTML: `<nav>`, `<fieldset>`, `<legend>`, `<header>`
- `aria-hidden="true"` on decorative elements

**Issues:**
- Header shows both public and auth nav items unconditionally (`apps/web/src/components/layout/Header.tsx:45`) -- should conditionally render based on auth state
- No mobile menu / hamburger for responsive nav
- LikertOptions uses `<button>` with `role="radio"` but is not wrapped in `role="radiogroup"` -- violates ARIA pattern requirements
- No `aria-describedby` linking error messages to form inputs (Input component would need this)

### 9. Type Safety (7/10)

**Strengths:**
- TypeScript strict mode enabled
- Zod schemas for all API input validation
- Fastify module augmentation for decorators (`types/index.ts`)
- Explicit interfaces for all service inputs/outputs
- Generic typing on API client (`api.get<T>`)

**Issues:**
- `tx: any` in `types/index.ts:55` -- the `withRls` callback parameter is typed as `any`
- Frontend types diverge from backend types significantly (M-5)
- `optionsMap: Record<string, unknown>` in scoring.ts loses type safety
- `dimensionWeights` cast from `Json` to `Record<string, number>` in `assessment.service.ts:229` -- no runtime validation
- `status: string` parameter in `learning-path.service.ts:180` should be the enum type
- Several `as` type assertions without runtime checks (`request.user as {...}` in auth.ts)

### 10. DevOps/CI (5/10)

**Issues:**
- No CI/CD pipeline files (no `.github/workflows/` in the product directory)
- No Dockerfile for the API or web app
- `docker-compose.yml` exists but was not reviewed for completeness
- No health check configured in Docker for container orchestration
- No database migration CI step
- No lint/typecheck CI step
- No automated test runner in CI
- No environment-specific configuration management (only `.env` files)
- No build artifacts or deployment configuration

**Strengths:**
- `package.json` has lint, typecheck, and test scripts defined
- `engines.node >= 20` specified
- Prisma migration scripts available

---

## Security Findings

### Authentication & Authorization
| Finding | Severity | CWE |
|---------|----------|-----|
| No `/auth/me` endpoint for session verification | High | CWE-613 |
| Password policy too weak (min 8, no complexity) | Medium | CWE-521 |
| Account lockout not implemented | Medium | CWE-307 |
| Login rate limit uses global config (100/min) | Medium | CWE-307 |
| Refresh token rotation not implemented | Low | CWE-613 |

### Data Security
| Finding | Severity | CWE |
|---------|----------|-----|
| Profile queries bypass RLS (no orgId filter) | Critical | CWE-639 |
| RLS context never activated in route handlers | High | CWE-862 |
| No audit logging on sensitive operations | Medium | CWE-778 |

### API Security
| Finding | Severity | CWE |
|---------|----------|-----|
| CSRF protection not registered | Medium | CWE-352 |
| CSP disabled in Helmet config | Low | CWE-1021 |
| No request timeout on external AI API calls | Low | CWE-400 |

---

## Performance & Scalability

| Issue | Impact | Fix |
|-------|--------|-----|
| All questions loaded on every session create/get | Latency increases with question bank growth | Cache questions in Redis; filter by template |
| Profile history has no pagination | OOM for users with many assessments | Add page/limit with Zod validation (max 100) |
| No Redis caching for static data | Unnecessary DB queries on every request | Cache templates, questions, algorithm versions |
| Metrics array uses shift() -- O(n) | Minor CPU waste under high load | Use circular buffer or typed array |
| No connection pool tuning | Connection exhaustion under load | Add `?connection_limit=10&pool_timeout=10` to DATABASE_URL |

---

## Testing Gaps

| Gap | Priority | Estimated Effort |
|-----|----------|-----------------|
| Frontend component tests beyond login/home/header | High | 3 days |
| Session expiry enforcement tests | High | 0.5 days |
| Cross-tenant data isolation tests | Critical | 1 day |
| Concurrent request race condition tests | Medium | 1 day |
| AI evaluator integration (when wired) | Medium | 1 day |
| Account lockout flow tests | Medium | 0.5 days |
| E2E assessment-to-learning-path flow | Medium | 1 day |

---

## AI-Readiness Score (7/10)

| Aspect | Score | Notes |
|--------|-------|-------|
| Modularity | 1.5/2 | Good separation of routes/services/plugins; AI services are isolated |
| API Design | 1.5/2 | RESTful with Zod validation; lacks OpenAPI spec for agent consumption |
| Testability | 1.5/2 | Pure scoring function; test helpers; but AI services untestable in integration |
| Observability | 1.0/2 | Structured logging with PII redaction; but no distributed tracing |
| Documentation | 1.5/2 | Good inline docs; addendum is comprehensive; missing OpenAPI |

---

## Technical Debt Map

### High-Interest Debt (fix ASAP)
1. **Frontend-backend auth mismatch** -- Blocks all user-facing functionality. Interest: Every frontend feature depends on auth working.
2. **Missing RLS enforcement** -- Cross-tenant data leak risk. Interest: Every new query without orgId is a potential security bug.
3. **AI services orphaned** -- Built but unused. Interest: Maintaining untested integration code that rots.

### Medium-Interest Debt (fix next quarter)
1. **No audit logging** -- Required for SOC 2, GDPR compliance evidence.
2. **No background workers** -- Expired sessions pile up, no badge issuance, no LTI grade passback.
3. **No pagination on list endpoints** -- Will degrade performance as data grows.
4. **Validation boilerplate** -- Repeated 10+ times across route files.

### Low-Interest Debt (monitor)
1. **No OpenAPI spec** -- Useful for external integrations and AI agent tooling.
2. **No Redis caching** -- Not a problem at current scale, becomes one at 10K+ concurrent users.
3. **Metrics implementation is basic** -- In-memory counters reset on restart. Consider Prometheus.

---

## Refactoring Roadmap

### 30-Day Plan (Critical Fixes)
1. **Fix auth contract** -- Add token management to frontend OR `/auth/me` endpoint with cookies (2 days)
2. **Add orgId filtering to all queries** -- Audit every Prisma call, add orgId where clause (1 day)
3. **Fix array mutation in learning-path.service.ts** -- 5 minutes
4. **Add session expiry checks** -- Add `expiresAt > now()` to saveResponse/completeSession (0.5 days)
5. **Add pagination to profile history** -- Zod schema + Prisma take/skip (0.5 days)
6. **Implement account lockout** -- Increment loginFailureCount on fail, lock after 5 (1 day)
7. **Cross-tenant integration tests** -- Verify user A cannot read user B's data (1 day)

### 60-Day Plan (Important Improvements)
1. **Wire AI evaluator and feedback into assessment flow** (2 days)
2. **Implement BullMQ workers** -- Session cleanup, token cleanup (2 days)
3. **Add audit logging middleware** (2 days)
4. **Frontend component test coverage** -- Dashboard, assessment, profile pages (3 days)
5. **Stronger password policy** (0.5 days)
6. **Register CSRF protection plugin** (0.5 days)
7. **Add CI/CD pipeline** -- GitHub Actions for lint, typecheck, test, build (1 day)

### 90-Day Plan (Strategic Improvements)
1. **OpenAPI spec generation from Zod schemas** (1 day)
2. **Redis caching for questions/templates** (1 day)
3. **Prometheus metrics export** (1 day)
4. **Dockerfile + docker-compose production config** (1 day)
5. **Extract validation helper to reduce route boilerplate** (0.5 days)
6. **Add distributed tracing (OpenTelemetry)** (2 days)

---

## Quick Wins (1-Day Fixes)

1. **Fix `dimensions.sort()` mutation** in `learning-path.service.ts:44` -- Add spread operator (5 min)
2. **Remove duplicate `hashToken`** in `auth.service.ts` -- Import from `utils/crypto.ts` (10 min)
3. **Add orgId to profile queries** in `profiles.ts:23,50` (10 min)
4. **Add `expiresAt` check** to `saveResponse` and `completeSession` (15 min)
5. **Replace `$executeRawUnsafe`** with tagged template `$executeRaw` in `prisma.ts:81` (5 min)
6. **Fix unused `sequence` variable** in `learning-path.service.ts:65` (5 min)
7. **Add `role="radiogroup"`** wrapper around LikertOptions buttons (5 min)
8. **Conditionally render nav items** in Header based on auth state (15 min)
9. **Add graceful shutdown** -- Call `app.close()` before `process.exit()` in `index.ts` (10 min)
10. **Align frontend types** with backend enum casing (UPPER_CASE) (30 min)
