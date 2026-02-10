# Pulse Playwright E2E Configuration

## Task: QA-01
## Branch: feature/pulse/inception

## Context
- Frontend: Next.js 14 on port 3106
- Backend: Fastify on port 5003
- 22 pages discovered in the web app
- Auth: email/password + GitHub OAuth (stub)
- Dashboard requires authentication (layout has sidebar + header)
- Login page has email/password form + GitHub OAuth button
- API has register/login endpoints returning JWT tokens

## Approach
1. Create root package.json for pulse with playwright deps
2. playwright.config.ts with dual webServer config
3. Auth fixtures that register+login via API, store auth state
4. Page Object Models for login and dashboard
5. Smoke tests for all public+dashboard pages
6. Auth flow test
7. Dashboard content tests

## Key Decisions
- Use storageState for auth persistence between tests
- Auth fixture calls API directly (register+login) then sets localStorage/cookies
- Page objects encapsulate selectors and common actions
- All tests are independent and create their own state
- Tests structured to validate config parsability without requiring live servers

## Files to Create
- products/pulse/package.json (root with playwright scripts)
- products/pulse/playwright.config.ts
- products/pulse/e2e/fixtures/auth.ts
- products/pulse/e2e/pages/dashboard.page.ts
- products/pulse/e2e/pages/login.page.ts
- products/pulse/e2e/smoke.spec.ts
- products/pulse/e2e/auth.spec.ts
- products/pulse/e2e/dashboard.spec.ts

## Existing Tests (baseline)
- Frontend: 103 tests, 16 suites (all passing)
- Backend: 100 tests, 7 suites (all passing)
