# AI Fluency Platform -- Audit Report: Tests, Database, CI/CD

**Auditor**: Code Reviewer Agent (Principal Architect + Security Engineer + Staff Backend Engineer)
**Date**: 2026-03-07
**Scope**: Database schema, seed data, migrations, all test files, CI/CD pipeline, Docker, DevOps
**Product**: ai-fluency
**Assessment**: Fair (6.5/10)

---

## Executive Summary

**Audience**: CEO, CTO, VP Engineering

The AI Fluency platform has a solid foundation with well-designed database schema (RLS-ready multi-tenancy, proper indexes, GDPR soft-delete), good test coverage for backend API routes (189 API test cases), and a functional CI/CD pipeline. However, there are significant gaps that need attention before enterprise readiness:

1. **Scoring service has ZERO dedicated unit tests** -- the most business-critical logic in the system is only tested indirectly through integration flows.
2. **Frontend test coverage is critically low** -- only 15 tests across 3 files covering 3 of 39 source files (7.7% file coverage).
3. **RLS policies are declared in schema comments but NOT applied in migration SQL** -- the migration creates tables and indexes but never runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or `CREATE POLICY`.
4. **.env file with real secrets exists on disk** (not gitignored content verified -- secrets are test-grade, but pattern is dangerous).
5. **E2E tests use `localStorage` for token injection** -- contradicts the addendum's explicit rule "Never localStorage" for tokens.

**Estimated effort to fix critical items**: 5-8 days
**Recommendation**: Fix First (address items 1-3 before any enterprise demo)

---

## Quantitative Summary

### Test File Inventory

| Layer | Test Files | Test Cases | Source Files | Estimated Coverage |
|-------|-----------|------------|-------------|-------------------|
| API Unit | 3 | 24 | 28 source files | ~11% (by file) |
| API Integration | 18 | 165 | 28 source files | ~64% (by file) |
| Web (RTL) | 3 | 15 | 39 source files | ~7.7% (by file) |
| E2E (Playwright) | 7 | 61 | full stack | UI smoke coverage |
| **TOTAL** | **31** | **265** | **67 source files** | See breakdown below |

### API Test Files (21 files, 189 test cases)

**Integration tests (18 files, 165 cases):**

| File | Cases | Covers |
|------|-------|--------|
| `assessments.test.ts` | 17 | POST/GET/PATCH assessment-sessions CRUD |
| `app-startup.test.ts` | 15 | Fastify boot, plugin registration |
| `scoring.test.ts` | 14 | Scoring via assessment completion (indirect) |
| `assessment.test.ts` | 12 | Full assessment lifecycle (start/respond/complete/results) |
| `auth-endpoints.test.ts` | 12 | Register, login, /me with edge cases |
| `auth.test.ts` | 11 | Auth middleware, token validation |
| `logger.test.ts` | 11 | Pino logger configuration |
| `learning-paths.test.ts` | 11 | POST/GET/PATCH learning paths + modules |
| `health.test.ts` | 10 | Health endpoint responses |
| `rls-hook.test.ts` | 9 | RLS session variable setting |
| `config.test.ts` | 8 | Environment variable validation |
| `error-handling.test.ts` | 8 | Error middleware, RFC 7807 format |
| `profiles.test.ts` | 6 | Profile me + history endpoints |
| `profile.test.ts` | 6 | Profile before/after assessment |
| `observability.test.ts` | 6 | Metrics, logging hooks |
| `auth-routes.test.ts` | 5 | Route existence validation |
| `cors.test.ts` | 3 | CORS headers |
| `full-flow.test.ts` | 1 | End-to-end register-to-profile (1 large test) |

**Unit tests (3 files, 24 cases):**

| File | Cases | Covers |
|------|-------|--------|
| `openrouter.test.ts` | 9 | OpenRouter API client (request/response/errors) |
| `ai-evaluator.test.ts` | 8 | AI response evaluation (score clamping, fallbacks) |
| `ai-feedback.test.ts` | 7 | Post-assessment AI feedback generation |

### Web Test Files (3 files, 15 test cases)

| File | Cases | Covers |
|------|-------|--------|
| `login.test.tsx` | 6 | Login form fields, validation, navigation |
| `Header.test.tsx` | 5 | Nav links, auth state, logo |
| `home.test.tsx` | 4 | Home page render, CTA, heading, sections |

### E2E Test Files (7 files, 61 test cases)

| File | Cases | Covers |
|------|-------|--------|
| `full-journey.spec.ts` | 20 | 8 flows: auth, assessment, profile, learning, dashboard, API flow, multi-tenant, navigation |
| `auth.spec.ts` | 15 | Registration, login UI + API |
| `smoke.spec.ts` | 9 | All pages load without crash |
| `us-18.spec.ts` | 5 | Multi-tenant data isolation |
| `us-01.spec.ts` | 4 | Assessment page |
| `us-02.spec.ts` | 4 | Profile page |
| `us-05.spec.ts` | 4 | Learning paths page |

---

## Critical Issues

### Issue #1: RLS Policies Never Applied in Migration SQL

**Severity**: Critical | **Likelihood**: High | **Blast Radius**: Organization-wide

**Description**: The schema comments and addendum declare that all tenant-scoped tables have RLS policies. The migration SQL at `apps/api/prisma/migrations/20260303073358_init/migration.sql` creates all tables and indexes but NEVER executes `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or `CREATE POLICY org_isolation ON ...`. This means every query returns ALL rows across ALL organizations.

**File/Location**: `apps/api/prisma/migrations/20260303073358_init/migration.sql` -- entire file (572 lines, zero RLS statements)

**Exploit Scenario**:
1. Organization A creates users and assessments
2. Organization B queries assessment_sessions
3. Without RLS, Org B sees Org A's data (all rows returned)
4. The `rls-hook.test.ts` tests SET LOCAL but never verifies row filtering actually works

**Fix**: Add a follow-up migration with RLS enablement:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluency_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create isolation policies (one per table)
CREATE POLICY org_isolation ON users
  USING ("orgId" = current_setting('app.current_org_id')::uuid);
-- ... repeat for each table

-- Bypass policy for admin role
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY admin_bypass ON users TO api_service USING (true);
```

---

### Issue #2: ScoringService Has No Dedicated Unit Tests

**Severity**: High | **Likelihood**: High | **Blast Radius**: Product-wide

**Description**: `apps/api/src/services/scoring.ts` is a 193-line pure function that computes the core business value (fluency scores). It exports `scoreAssessment()` with complex prevalence-weighted scoring, discernment gap detection, and score clamping. There is NO `tests/unit/scoring.test.ts`. The `scoring.test.ts` in integration tests only the flow indirectly through HTTP endpoints.

**File/Location**: `apps/api/src/services/scoring.ts:100-192` (the `scoreAssessment` function)

**Impact**:
- Score calculation bugs affect every user's profile
- No tests verify edge cases: all-zero answers, single dimension, missing indicators, NaN prevalenceWeight, dimensionWeights not summing to 1.0
- Discernment gap detection logic at line 167-173 references specific shortCodes (`DELEGATION_REASONING`, `DISCERNMENT_MISSING_CONTEXT`) -- no test verifies this works

**Fix**: Create `tests/unit/scoring.test.ts` with cases for:
- All correct answers (expect score near 100)
- All incorrect answers (expect score near 0)
- Mixed answers with known expected values
- Self-report Likert normalization (1->0, 3->0.5, 5->1.0)
- Discernment gap triggered vs. not triggered
- Edge case: empty indicators array
- Edge case: prevalenceWeight of 0 for all indicators in a dimension
- Edge case: dimensionWeights that don't sum to 1.0

---

### Issue #3: Frontend Test Coverage is 7.7%

**Severity**: High | **Likelihood**: Medium | **Blast Radius**: Product-wide

**Description**: Only 3 of 39 frontend source files have any test coverage. The tested files are `page.tsx` (home), `Header.tsx`, and `login/page.tsx`. The following critical components have ZERO tests:

**Untested frontend files (36 files):**

- `src/context/AuthContext.tsx` -- Auth state management
- `src/contexts/AuthContext.tsx` -- Duplicate context file (see Issue #7)
- `src/hooks/useAuth.ts` -- Auth hook (mocked in all tests, never tested)
- `src/hooks/useApi.ts` -- API client hook
- `src/lib/api.ts` -- API client
- `src/lib/auth.ts` -- Auth utilities
- `src/app/dashboard/page.tsx` -- Dashboard
- `src/app/assessment/page.tsx` -- Assessment landing
- `src/app/assessment/[id]/page.tsx` -- Assessment flow
- `src/app/assessment/[id]/complete/page.tsx` -- Assessment results
- `src/app/assessment/[id]/LikertOptions.tsx` -- Likert scale component
- `src/app/assessment/[id]/ScenarioOptions.tsx` -- Scenario options component
- `src/app/profile/page.tsx` -- Profile page
- `src/app/profile/[sessionId]/page.tsx` -- Session profile
- `src/app/learning/page.tsx` -- Learning paths
- `src/app/learning/[pathId]/page.tsx` -- Learning path detail
- `src/app/learning/[pathId]/modules/[moduleId]/page.tsx` -- Module detail
- `src/app/register/page.tsx` -- Registration form
- `src/components/auth/ProtectedRoute.tsx` -- Route guard
- `src/components/charts/DimensionRadarChart.tsx` -- Radar chart
- `src/components/charts/OrgFluencyChart.tsx` -- Org chart
- `src/components/layout/Sidebar.tsx` -- Navigation sidebar
- `src/components/layout/SkipNav.tsx` -- Accessibility skip nav
- `src/components/ui/Button.tsx`, `Card.tsx`, `Input.tsx` -- UI primitives
- `src/app/org/dashboard/page.tsx` -- Org dashboard
- `src/app/org/teams/page.tsx` -- Teams management
- `src/app/org/templates/page.tsx` -- Template management
- `src/app/admin/organizations/page.tsx` -- Admin panel
- `src/app/settings/privacy/page.tsx` -- Privacy settings
- `src/app/settings/profile/page.tsx` -- Profile settings
- `src/components/providers/Providers.tsx` -- Context providers
- `src/lib/i18n.ts` -- Internationalization

---

### Issue #4: E2E Auth Helper Stores Token in localStorage

**Severity**: Medium | **Likelihood**: High | **Blast Radius**: Feature-specific

**Description**: The E2E auth helper at `e2e/helpers/auth.ts:138-141` uses `localStorage.setItem('ai_fluency_token', token)` to inject auth tokens into the browser. The product addendum explicitly states: "Never localStorage for tokens -- XSS risk -- use in-memory TokenManager."

**File/Location**: `e2e/helpers/auth.ts:138-141`

```typescript
// CURRENT (contradicts addendum):
export async function injectAuthTokens(page, accessToken, _refreshToken?) {
  await page.evaluate((token) => {
    localStorage.setItem('ai_fluency_token', token);
  }, accessToken);
}
```

**Impact**: If the production frontend also uses localStorage (as the E2E test implies it does), this is an XSS vulnerability. Any injected script can read `localStorage.ai_fluency_token` and exfiltrate the JWT.

**Fix**: Use in-memory TokenManager as specified in the addendum. For E2E tests, use cookie-based injection or API-level auth setup.

---

### Issue #5: Seed Data Prevalence Weights Differ Between seed.ts and seed-data/behavioral-indicators.json

**Severity**: Medium | **Likelihood**: Medium | **Blast Radius**: Product-wide

**Description**: The inline `seed.ts` defines `DELEGATION_TASK_SUITABILITY` with `prevalenceWeight: 0.9` (line ~43 of seed.ts), while `seed-data/behavioral-indicators.json` defines the same indicator with `prevalenceWeight: 0.67` (line 8). The seed.ts appears to be the older version and behavioral-indicators.json the newer canonical source. If both are used in different environments, scores will differ.

**File/Location**:
- `apps/api/prisma/seed.ts:43` -- `prevalenceWeight: 0.9`
- `apps/api/prisma/seed-data/behavioral-indicators.json:8` -- `prevalenceWeight: 0.67`

**Fix**: Ensure seed.ts reads from the JSON files exclusively rather than defining inline duplicates. The seed.ts should import and use the JSON data as the single source of truth.

---

### Issue #6: .env File Exists on Disk with Hardcoded Secrets

**Severity**: Medium | **Likelihood**: Medium | **Blast Radius**: Organization-wide

**Description**: The file `apps/api/.env` exists on disk with secrets:
- `JWT_SECRET=test-jwt-secret-min-32-chars-for-testing-only`
- `JWT_REFRESH_SECRET=test-refresh-secret-min-32-chars-different`
- `SSO_ENCRYPTION_KEY=000...000` (64 zeros)
- `INTERNAL_API_KEY=test-internal-api-key`

While these appear test-grade, the `.env` file should not be committed. Additionally, `apps/api/.env.bak` exists, which may contain previous secrets.

**File/Location**: `apps/api/.env`, `apps/api/.env.bak`

**Fix**: Verify `.env` and `.env.bak` are in `.gitignore`. Delete `.env.bak`. Use environment variables from CI/CD secrets, not files.

---

### Issue #7: Duplicate AuthContext Files

**Severity**: Low | **Likelihood**: Low | **Blast Radius**: Feature-specific

**Description**: Two AuthContext files exist in the frontend:
- `apps/web/src/context/AuthContext.tsx`
- `apps/web/src/contexts/AuthContext.tsx`

This creates confusion about which is canonical and risks importing the wrong one.

**File/Location**: Both paths listed above.

**Fix**: Delete the non-canonical one. Grep all imports to determine which is actually used.

---

## Database Schema Analysis

### Strengths

1. **Comprehensive indexing**: Every foreign key has a corresponding index. Composite indexes on `(orgId, email)`, `(sessionId, questionId)`, `(pathId, moduleId)` support multi-tenant and idempotent queries.
2. **GDPR-ready**: Soft-delete with `deletedAt` on User and AssessmentSession. `dataRetentionDays` on Organization.
3. **Security-conscious design**: Token hashes stored (not plaintext), SSO secrets encrypted (AES-256-GCM), Argon2id for passwords.
4. **Algorithm versioning**: `AlgorithmVersion` table prevents historical score invalidation.
5. **Proper uniqueness constraints**: `@@unique([orgId, email])`, `@@unique([sessionId, questionId])`, `@@unique([orgId, provider])`.

### Issues

| # | Issue | Table | Severity |
|---|-------|-------|----------|
| 1 | **RLS not applied in migration** (see Critical Issue #1) | All tenant-scoped | Critical |
| 2 | **No CHECK constraint on prevalenceWeight** -- should be 0.0-1.0 | behavioral_indicators | Low |
| 3 | **No CHECK constraint on dimensionWeights** -- should sum to 1.0 | assessment_templates | Low |
| 4 | **No partial index** -- schema comment says "Partial index in migration: WHERE deletedAt IS NULL" but no such partial index in migration SQL | users, assessment_sessions | Medium |
| 5 | **No BRIN index** -- schema comment says "BRIN index on createdAt added via migration" but no BRIN index in migration SQL | fluency_profiles, audit_logs | Medium |
| 6 | **Missing ON DELETE CASCADE** on assessment_sessions.userId -- RESTRICT means user deletion fails if they have sessions | assessment_sessions | Low |
| 7 | **certificates table has no ON DELETE behavior** for userId -- user deletion blocked by FK | certificates | Low |
| 8 | **fluency_profiles missing ON DELETE** for sessionId -- orphaned profiles if session deleted | fluency_profiles | Low |

### PII Columns Identified

| Table | Column | PII Type | Protection |
|-------|--------|----------|------------|
| users | email | Direct PII | RLS (not applied) + deletedAt soft-delete |
| users | firstName, lastName | Direct PII | RLS (not applied) |
| users | passwordHash | Credential | Argon2id hashed |
| users | verificationTokenHash, resetTokenHash | Credential | SHA-256 hashed |
| users | avatarUrl | Indirect PII | RLS (not applied) |
| user_sessions | ipAddress | Network PII | RLS (not applied) |
| user_sessions | userAgent | Fingerprint | RLS (not applied) |
| audit_logs | ipAddress, userAgent | Network/Fingerprint PII | RLS (not applied) |

### Cascade Delete Risk Map

```
Organization (RESTRICT)
  |-- User (RESTRICT) -- deletion blocks if sessions exist
  |     |-- UserSession (CASCADE) -- safe
  |     |-- AssessmentSession (RESTRICT) -- blocks user deletion
  |     |-- LearningPath (RESTRICT) -- blocks user deletion
  |     |-- Certificate (RESTRICT) -- blocks user deletion
  |     |-- AuditLog (SET NULL on actorId) -- safe
  |-- Team (RESTRICT) -- blocks org deletion if teams exist
  |-- AssessmentTemplate (SET NULL) -- safe
  |-- SSOConfig (RESTRICT) -- blocks org deletion
```

**Risk**: Deleting a user requires manual cleanup of AssessmentSession, LearningPath, and Certificate records first. There is no cascade path. This is intentional for data integrity but creates operational complexity for GDPR deletion requests.

### Seed Data Quality

| File | Records | Quality |
|------|---------|---------|
| `behavioral-indicators.json` | 24 (7 DELEGATION, 7 DESCRIPTION, 7 DISCERNMENT, 7 DILIGENCE - but actually 6+1 split observable/self-report per dimension) | Good -- proper prevalence weights |
| `questions.json` | 37 questions (20 SCENARIO + 17 SELF_REPORT) | Good -- well-crafted scenarios |
| `assessment-templates.json` | 5 templates (Generic, Developer, Analyst, Manager, Marketer) | Good -- weights sum to 1.0 |
| `learning-modules.json` | 40 modules across 4 dimensions x 3 difficulty levels | Good -- comprehensive |
| `algorithm-versions.json` | 1 version (v1, active) | Minimal but correct |

**Discrepancy**: `seed.ts` says "50 Questions" in its header comment but `questions.json` has 37 entries. The seed.ts also defines its own inline indicators with different prevalenceWeights than the JSON files.

---

## Test Quality Analysis

### Strengths

1. **Real database testing**: All integration tests use a real PostgreSQL database with proper setup/teardown. No mocks for DB layer.
2. **FK-safe cleanup**: Every `afterAll` cleans up in correct foreign key order.
3. **Unique test isolation**: `Date.now()` suffixes on org slugs and emails prevent inter-test conflicts.
4. **Edge case coverage on auth**: Tests for weak passwords, duplicate emails, non-existent orgs, missing fields.
5. **Idempotent response testing**: `assessments.test.ts:264-295` verifies upsert behavior on same question.
6. **E2E flows are comprehensive**: The `full-journey.spec.ts` covers 8 distinct user flows with screenshots.

### Weaknesses

1. **No dedicated scoring unit tests**: The most critical business logic has zero direct unit tests.
2. **No test for auth.service.ts**: The auth service is only tested through HTTP endpoints, not as a unit.
3. **No test for assessment.service.ts**: Same -- only via HTTP.
4. **No test for learning-path.service.ts**: Same.
5. **No test for crypto.ts utility**: Utility functions untested directly.
6. **No test for errors.ts utility**: AppError class untested.
7. **Frontend useAuth hook is always mocked**: Never tested with real auth flow.
8. **Frontend ProtectedRoute untested**: Route guard has zero coverage.
9. **Frontend assessment flow components untested**: LikertOptions, ScenarioOptions, assessment pages.
10. **E2E tests have hardcoded `waitForTimeout`**: `full-journey.spec.ts:389,459,749` uses `waitForTimeout(2000-3000)` which creates flaky tests.

### Missing Test Scenarios

| Area | Missing Scenario | Risk |
|------|-----------------|------|
| Scoring | All answers wrong (expect 0) | Score calculation bug |
| Scoring | Discernment gap triggered | Business logic defect |
| Scoring | Self-report Likert 1-5 normalization | Off-by-one errors |
| Scoring | Empty indicators array | Runtime crash |
| Auth | Account lockout after N failures | Security bypass |
| Auth | Token expiry handling | Session hijack |
| Auth | Refresh token rotation | Token reuse |
| Assessment | Session expiry (expiresAt) | Stale sessions |
| Assessment | Submitting invalid answer keys (e.g., "E" for SCENARIO) | Data integrity |
| Assessment | Concurrent session handling | Race condition |
| Profile | Profile with all dimensions at 0 | Division by zero |
| Learning Path | Discernment gap triggers prepended module | Business logic |
| Frontend | Register page form submission | User flow broken |
| Frontend | Assessment question rendering | Core UX broken |
| Frontend | Radar chart with zero scores | Chart crash |
| Frontend | Accessibility keyboard navigation | WCAG violation |

### Flaky Test Risks

| File:Line | Issue |
|-----------|-------|
| `e2e/tests/stories/full-journey/full-journey.spec.ts:389` | `waitForTimeout(2000)` -- race condition on data load |
| `e2e/tests/stories/full-journey/full-journey.spec.ts:459` | `waitForTimeout(3000)` -- race condition on auth load |
| `e2e/tests/stories/full-journey/full-journey.spec.ts:749` | `waitForTimeout(2000)` -- race condition on page render |
| `e2e/playwright.config.ts:18` | `workers: 1` -- serial execution is safe but slow |
| Multiple integration tests | Each test suite calls `buildApp()` independently -- if tests run in parallel, port conflicts possible |

---

## CI/CD Pipeline Analysis

### Pipeline Structure (`.github/workflows/ai-fluency-ci.yml`)

```
lint-and-typecheck (matrix: api, web)
     |
     +-- test-api (requires lint, uses postgres:15 + redis:7 services)
     |
     +-- test-web (requires lint)
     |
security (independent, parallel)
     |
build (Docker buildx, after tests)
     |
quality-gate (aggregates all results)
```

### Strengths

1. **Service containers**: Real PostgreSQL 15 and Redis 7 in CI -- matches production stack.
2. **Matrix strategy**: Lint/typecheck runs for both api and web in parallel.
3. **Security audit**: `pnpm audit --audit-level=critical --prod` runs on every PR.
4. **Docker build validation**: Both Dockerfiles are built in CI to catch build failures early.
5. **Coverage artifacts**: Uploaded with 7-day retention.
6. **Quality gate**: Final job aggregates all results; blocks merge if any fail.
7. **Graceful degradation**: `if: always()` on dependent jobs prevents cascade failures from blocking reporting.
8. **App existence checks**: Each job verifies the app directory exists, preventing failures on branches that don't have the product yet.

### Issues

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | **No E2E tests in CI** -- Playwright tests never run in the pipeline | High | Add E2E job with `webServer` config in playwright.config.ts |
| 2 | **No test coverage threshold** -- coverage is collected but not enforced (no `--coverageThreshold` in jest config) | High | Add `coverageThreshold: { global: { statements: 80 } }` |
| 3 | **`if: always()` on test-api** -- test-api runs even if lint fails, wasting CI minutes on code that won't pass | Low | Change to `if: needs.lint-and-typecheck.result == 'success'` |
| 4 | **No migration validation** -- `prisma db push --force-reset` in CI skips migration testing; should use `prisma migrate deploy` | Medium | Use `prisma migrate deploy` to validate migration chain |
| 5 | **Traceability gate is `continue-on-error: true`** -- effectively disabled | Low | Remove `continue-on-error` when ready to enforce |
| 6 | **No Semgrep or SAST scanning** -- only npm audit for dependency vulns, no static analysis | Medium | Add Semgrep step |
| 7 | **No Docker image scanning** -- images built but not scanned (e.g., Trivy) | Medium | Add `trivy image` step |
| 8 | **No branch protection check** -- quality-gate passes even with `skipped` jobs | Low | Change skip handling to require explicit success |

### Docker Analysis

**API Dockerfile** (`apps/api/Dockerfile`):
- Multi-stage build (builder + production) -- good
- Non-root user (fastify:nodejs, UID 1001) -- good
- `pnpm deploy --prod` for flat node_modules -- good
- `HEALTHCHECK` on `/health` endpoint -- good
- `node:20-alpine` base -- lightweight

**Web Dockerfile** (`apps/web/Dockerfile`):
- Multi-stage build -- good
- Non-root user (nextjs:nodejs, UID 1001) -- good
- Next.js standalone output -- optimal size
- `HEALTHCHECK` on `/` -- good
- `NEXT_TELEMETRY_DISABLED=1` -- privacy-conscious

**docker-compose.yml**:
- Health checks on all 4 services -- good
- Resource limits on all services -- good
- Volume persistence for postgres data -- good
- `DEV ONLY` comments on exposed ports -- good documentation

**Docker Issues**:

| # | Issue | File:Line | Severity |
|---|-------|-----------|----------|
| 1 | No `.dockerignore` found -- node_modules and .git may be copied into build context | Product root | Medium |
| 2 | `docker-compose.yml` uses version '3.9' which is deprecated in Docker Compose V2 | `docker-compose.yml:1` | Low |
| 3 | No database migration step in compose -- requires manual `prisma migrate deploy` after `docker compose up` | `docker-compose.yml` | Medium |
| 4 | Redis has no password configured -- acceptable for dev, not for production | `docker-compose.yml:39` | Low |

---

## Security Findings (Scope: Tests, DB, CI/CD)

### Authentication & Authorization

| Finding | Location | CVSS | Remediation |
|---------|----------|------|-------------|
| RLS policies not applied | Migration SQL | 8.1 (High) | Create migration with ENABLE RLS + CREATE POLICY |
| Token in localStorage (E2E) | `e2e/helpers/auth.ts:139` | 6.1 (Medium) | Use in-memory TokenManager |
| Test JWT secrets are weak | `apps/api/.env.test:4-5` | 2.0 (Info) | Acceptable for test env |
| No CSRF token validation in E2E tests | E2E helpers | N/A | Add CSRF testing |

### Data Security

| Finding | Location | CVSS | Remediation |
|---------|----------|------|-------------|
| .env file on disk with secrets | `apps/api/.env` | 4.0 (Medium) | Verify gitignored, delete .env.bak |
| .env.bak exists (possible old secrets) | `apps/api/.env.bak` | 3.0 (Low) | Delete immediately |
| SSO_ENCRYPTION_KEY is all-zeros in test env | `apps/api/.env.test:11` | N/A | Acceptable for test |

### Infrastructure

| Finding | Location | Severity |
|---------|----------|----------|
| No Semgrep/SAST in CI | `.github/workflows/ai-fluency-ci.yml` | Medium |
| No container image scanning | Same | Medium |
| No dependency bot (Dependabot/Renovate) configured | Repo root | Low |

---

## Performance Considerations

### Database

1. **Missing partial indexes** (declared in schema comments, absent in migration):
   - `users WHERE deletedAt IS NULL` -- all active user queries pay for scanning soft-deleted rows
   - `assessment_sessions WHERE status = 'IN_PROGRESS' AND deleted_at IS NULL` -- session lookup is hot path

2. **Missing BRIN indexes** (declared in schema comments, absent in migration):
   - `fluency_profiles.createdAt` -- time-range queries on large profiles table
   - `audit_logs.createdAt` -- append-only log, ideal for BRIN

3. **JSON columns without validation**: `dimensionScores`, `selfReportScores`, `indicatorBreakdown`, `optionsJson` are all `JSONB` with no database-level CHECK constraint. Invalid JSON can be inserted.

### Test Performance

- All integration tests run with `--runInBand` (serial execution) which is correct for DB tests but slow
- Each test file creates its own Fastify app instance (`buildApp()`) -- 18 integration files means 18 app startups
- Consider a shared app instance with transaction-based isolation for faster tests

---

## Recommendations Roadmap

### 30-Day Plan (Critical Fixes)

1. **[P0] Create RLS migration** -- Add migration that enables RLS and creates org_isolation policies on all 13 tenant-scoped tables. Add integration test that verifies cross-org data isolation at the DB level. (2 days)

2. **[P0] Add scoring unit tests** -- Create `tests/unit/scoring.test.ts` with 15+ test cases covering all code paths in `scoreAssessment()`. (1 day)

3. **[P1] Add E2E tests to CI** -- Configure Playwright in CI with `webServer` for both API and Web. Start with smoke tests. (2 days)

4. **[P1] Fix localStorage token storage** -- Migrate frontend to in-memory TokenManager. Update E2E helpers. (2 days)

5. **[P1] Add test coverage thresholds** -- Set 80% statement coverage gate in Jest config. (0.5 day)

### 60-Day Plan (Important Improvements)

6. Add frontend tests for: AuthContext, ProtectedRoute, assessment pages, profile page (5 days)
7. Add partial and BRIN indexes per schema comments (1 day)
8. Add Semgrep SAST scanning to CI pipeline (1 day)
9. Add Trivy container scanning to CI pipeline (0.5 day)
10. Consolidate seed.ts to use JSON files exclusively (1 day)
11. Delete duplicate AuthContext file (0.5 day)
12. Add `.dockerignore` files (0.5 day)

### 90-Day Plan (Strategic Improvements)

13. Add service-level unit tests for auth.service.ts, assessment.service.ts, learning-path.service.ts
14. Add visual regression testing for charts (DimensionRadarChart, OrgFluencyChart)
15. Add load testing for assessment session creation (target: 10,000 concurrent per NFR-004)
16. Add contract testing between frontend and API
17. Add database migration testing in CI (use `prisma migrate deploy` instead of `db push`)

---

## Quick Wins (< 1 Day Each)

1. Delete `apps/api/.env.bak` (5 min)
2. Add `coverageThreshold` to Jest config (15 min)
3. Remove `continue-on-error: true` from traceability gate (5 min)
4. Remove deprecated `version: '3.9'` from docker-compose.yml (5 min)
5. Replace `waitForTimeout()` calls in E2E with `waitForSelector()` or `waitForResponse()` (2 hours)
6. Add `.dockerignore` with `node_modules`, `.git`, `*.md`, `coverage/` (15 min)
7. Add `--coverageThreshold` flag to CI test commands (15 min)
8. Fix seed.ts header comment ("50 Questions" should be "37 Questions") (5 min)
9. Delete one of the two AuthContext files (30 min including import fixes)
10. Add Redis password to docker-compose.yml for non-dev profiles (30 min)
