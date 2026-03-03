# AI Fluency Platform — Developer Guide

> This guide is for engineers contributing to the AI Fluency platform. It covers environment setup, testing conventions, code standards, and the development workflow.

---

## Table of Contents

1. [Development Environment](#1-development-environment)
2. [Initial Setup](#2-initial-setup)
3. [Database Setup](#3-database-setup)
4. [Environment Variables](#4-environment-variables)
5. [Development Workflow](#5-development-workflow)
6. [Testing Guide](#6-testing-guide)
7. [Code Conventions](#7-code-conventions)
8. [Commit Format](#8-commit-format)
9. [PR Process](#9-pr-process)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Development Environment

### System Requirements

| Tool | Minimum Version | How to Check |
|------|----------------|-------------|
| Node.js | 20.x LTS | `node --version` |
| npm | 10.x | `npm --version` |
| PostgreSQL | 15.x | `psql --version` |
| Redis | 7.x | `redis-server --version` |
| Docker | 24.x | `docker --version` (optional — recommended) |
| Git | 2.40+ | `git --version` |

### Recommended IDE Setup

**VS Code extensions** (install from `.vscode/extensions.json` if present):
- ESLint
- Prettier — Code formatter
- Prisma
- TypeScript and JavaScript Language Features (built-in)
- Tailwind CSS IntelliSense

**Settings** (add to your workspace settings):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## 2. Initial Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/connectsw/platform.git
cd products/ai-fluency
```

### Step 2 — Start infrastructure services

```bash
# Start PostgreSQL 15 and Redis 7 via Docker Compose
docker-compose up -d postgres redis

# Verify they are running
docker-compose ps
```

If you prefer to run PostgreSQL and Redis without Docker, ensure they are running on their default ports (5432 and 6379 respectively) and update your `.env` files accordingly.

### Step 3 — Set up the backend API

```bash
cd apps/api

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env

# Edit .env — see Section 4 for required values
# At minimum for local dev: DATABASE_URL, DATABASE_ADMIN_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET

# Generate JWT secrets
echo "JWT_SECRET=$(openssl rand -base64 64)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64)"
```

### Step 4 — Set up the frontend

```bash
# In a new terminal
cd apps/web

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local — minimum: NEXT_PUBLIC_API_URL=http://localhost:5014
```

### Step 5 — Start development servers

```bash
# Terminal 1: Start backend API (port 5014)
cd apps/api && npm run dev

# Terminal 2: Start frontend (port 3118)
cd apps/web && npm run dev
```

Verify:
```bash
curl http://localhost:5014/health    # Should return {"status":"healthy",...}
open http://localhost:3118           # Should open the web app
```

---

## 3. Database Setup

### Creating the databases

Two databases are required: one for development, one for tests.

```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create the application database roles
CREATE ROLE api_service WITH LOGIN PASSWORD 'dev_password' BYPASSRLS;
CREATE ROLE api_service_rls WITH LOGIN PASSWORD 'dev_password_rls';

# Create databases
CREATE DATABASE ai_fluency_dev OWNER api_service;
CREATE DATABASE ai_fluency_test OWNER api_service;

# Grant schema permissions for the RLS role
GRANT CONNECT ON DATABASE ai_fluency_dev TO api_service_rls;
GRANT CONNECT ON DATABASE ai_fluency_test TO api_service_rls;

\q
```

### Running migrations

```bash
cd apps/api

# Run dev database migrations (also generates Prisma client)
npx prisma migrate dev

# Apply migrations to test database
DATABASE_URL=postgresql://api_service_rls:dev_password_rls@localhost:5432/ai_fluency_test \
  DATABASE_ADMIN_URL=postgresql://api_service:dev_password@localhost:5432/ai_fluency_test \
  npx prisma migrate deploy
```

### Viewing the database

Prisma Studio provides a web-based database browser:

```bash
cd apps/api && npx prisma studio
# Opens http://localhost:5555
```

### Resetting the development database

```bash
cd apps/api

# Drop and recreate all tables, run all migrations from scratch
npx prisma migrate reset

# This will prompt for confirmation (destructive operation)
```

### Seeding development data

```bash
cd apps/api

# Seed test organizations, users, and sample assessment data
npm run db:seed
```

---

## 4. Environment Variables

### Backend — `apps/api/.env`

All variables are required unless marked optional. The app refuses to start if any required variable is missing, with a clear error message identifying the missing variable.

| Variable | Required | Description | Development Value |
|----------|----------|-------------|------------------|
| `DATABASE_URL` | Yes | PostgreSQL — uses `api_service_rls` role (RLS enforced). Used for all application queries. | `postgresql://api_service_rls:dev_password_rls@localhost:5432/ai_fluency_dev` |
| `DATABASE_ADMIN_URL` | Yes | PostgreSQL — uses `api_service` role (BYPASSRLS). Used only for migrations and admin scripts. | `postgresql://api_service:dev_password@localhost:5432/ai_fluency_dev` |
| `REDIS_URL` | Yes | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Yes | Secret for signing access tokens. Generate: `openssl rand -base64 64` | Any 64+ character string |
| `JWT_REFRESH_SECRET` | Yes | Separate secret for refresh tokens. Must differ from JWT_SECRET. | Any 64+ character string |
| `JWT_ACCESS_EXPIRY` | Yes | Access token TTL in seconds | `900` |
| `JWT_REFRESH_EXPIRY` | Yes | Refresh token TTL in seconds | `604800` |
| `SENDGRID_API_KEY` | Yes | SendGrid API key. In dev, use a test key that routes to a dev inbox. | `SG.xxx` — obtain from SendGrid dashboard |
| `EMAIL_FROM` | Yes | Sender address for all outgoing email | `noreply@ai-fluency.connectsw.com` |
| `S3_BUCKET` | Yes | S3 bucket for certificate PDFs and avatars | `ai-fluency-assets-dev` |
| `S3_REGION` | Yes | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Yes | AWS credentials — use a dev IAM user with S3 write access to the dev bucket | From AWS IAM console |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS credentials | From AWS IAM console |
| `BADGR_API_URL` | Yes | Badgr API base URL | `https://api.badgr.io` |
| `BADGR_API_TOKEN` | Yes | Badgr API token | From Badgr developer portal |
| `BADGR_ISSUER_ID` | Yes | Your Badgr issuer entity ID | From Badgr dashboard |
| `SSO_ENCRYPTION_KEY` | Yes | AES-256-GCM key for SSO config secrets at rest. Must be 32 bytes (64 hex chars). Generate: `openssl rand -hex 32` | Any 64-character hex string |
| `POSTHOG_API_KEY` | No | PostHog project API key. Omit in dev to disable analytics. | `phc_xxx` |
| `NODE_ENV` | Yes | Runtime environment | `development` |
| `PORT` | No | Server port (defaults to 5014) | `5014` |
| `INTERNAL_API_KEY` | No | Key for internal endpoints (/metrics). Generate any string. | Any string |

### Frontend — `apps/web/.env.local`

| Variable | Required | Description | Development Value |
|----------|----------|-------------|------------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL — used by the browser-side API client | `http://localhost:5014` |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog project key for client-side analytics. Omit in dev. | `phc_xxx` |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog host (defaults to cloud) | `https://app.posthog.com` |

---

## 5. Development Workflow

### Branch naming

```
feature/ai-fluency/<feature-name>    # New feature
fix/ai-fluency/<issue-id>            # Bug fix
docs/ai-fluency/<description>        # Documentation only
refactor/ai-fluency/<description>    # Refactoring
```

### TDD workflow (mandatory for all feature work)

The platform follows Red-Green-Refactor TDD. Every line of application code must be driven by a test that failed first.

```
1. RED — Write a failing test for the new behavior
   - Test file must exist before implementation file
   - Run tests, confirm the new test fails: npm test
   - Do NOT write application code in this step

2. GREEN — Write the minimum code to make all tests pass
   - Implement only what is needed to pass the failing test
   - Run tests, confirm all pass: npm test
   - Commit when all tests are green

3. REFACTOR — Improve the code without changing behavior
   - Clean up duplication, improve naming, extract functions
   - Run tests after each refactor to confirm nothing broke
   - Commit if refactor is non-trivial
```

**Example TDD cycle for a new endpoint:**

```bash
# Step 1 — Write the test (RED)
# Edit: apps/api/tests/routes/assessment-templates.test.ts
# Add: test('POST /api/v1/assessment-templates returns 201 with template')

cd apps/api && npm test -- --testPathPattern="assessment-templates"
# Expected: 1 failing test

# Step 2 — Implement the route (GREEN)
# Edit: apps/api/src/routes/assessment-templates.ts
# Add: the POST handler

npm test -- --testPathPattern="assessment-templates"
# Expected: all tests pass

git add apps/api/tests/routes/assessment-templates.test.ts
git add apps/api/src/routes/assessment-templates.ts
git diff --cached --stat
git commit -m "feat(templates): implement POST assessment-templates endpoint [US-XX][FR-XXX]"

# Step 3 — Refactor (if needed)
# Improve error handling, extract shared logic
npm test -- --testPathPattern="assessment-templates"
# All tests still pass

git add apps/api/src/routes/assessment-templates.ts
git commit -m "refactor(templates): extract validation to shared helper [US-XX][FR-XXX]"
```

---

## 6. Testing Guide

### Overview

| Test type | Location | Tool | Database | Notes |
|-----------|----------|------|---------|-------|
| Unit | `apps/api/tests/unit/` | Jest | None | Pure functions — scoring, crypto |
| Integration | `apps/api/tests/routes/` | Jest + Supertest | ai_fluency_test (real) | Real DB, no mocks |
| Component | `apps/web/tests/` | RTL | None | Behavior testing |
| E2E | `e2e/tests/` | Playwright | ai_fluency_test (real) | Full stack |

**Critical rule**: No mocks for database or Redis in integration tests. Use the real `ai_fluency_test` database. This catches RLS policy issues, constraint violations, and query performance problems that mocks hide.

---

### Unit Tests

Unit tests cover pure functions — the scoring algorithm, crypto helpers, and error factories. These have no dependencies and should run in milliseconds.

**When to write unit tests:**
- Scoring algorithm (ScoringService) — complex logic with many edge cases
- Crypto helpers — timing-safe comparisons, token generation
- Validation functions — custom Zod refinements
- Pure utility functions

**Example unit test:**

```typescript
// apps/api/tests/unit/scoring.test.ts
import { ScoringService } from '../../src/services/scoring';

describe('ScoringService', () => {
  describe('prevalence-weighted dimension score', () => {
    it('weights indicators by prevalence', () => {
      const indicators = [
        { score: 1.0, prevalenceWeight: 0.8 },
        { score: 0.0, prevalenceWeight: 0.2 },
      ];

      const dimensionScore = ScoringService.scoreDimension(indicators);

      // (1.0 × 0.8 + 0.0 × 0.2) / (0.8 + 0.2) = 0.8
      expect(dimensionScore).toBeCloseTo(0.8);
    });

    it('flags discernment gap when both key indicators fail', () => {
      const responses = buildResponsesWithBothDiscernmentFailing();

      const result = ScoringService.score(responses, template);

      expect(result.discernmentGap).toBe(true);
    });
  });
});
```

Run:
```bash
cd apps/api && npm test -- --testPathPattern="unit"
```

---

### Integration Tests

Integration tests hit the real API over HTTP using Supertest. They use the `ai_fluency_test` database and run the full request-response cycle including auth middleware, RLS context, and database constraints.

**Standard test setup pattern:**

```typescript
// apps/api/tests/routes/assessment-sessions.test.ts
import { buildApp } from '../../src/app';
import { createTestOrg, cleanupTestOrg } from '../helpers/test-org';
import type { FastifyInstance } from 'fastify';

describe('POST /api/v1/assessment-sessions', () => {
  let app: FastifyInstance;
  let orgId: string;
  let authToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // createTestOrg creates an org, a LEARNER user, and returns a valid JWT
    const { org, token } = await createTestOrg(app);
    orgId = org.id;
    authToken = token;
  });

  afterAll(async () => {
    // Remove all test data for this org
    await cleanupTestOrg(orgId, app.prisma);
    await app.close();
  });

  it('returns 201 with session ID and questions', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assessment-sessions',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: { templateId: STANDARD_TEMPLATE_ID },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.sessionId).toBeDefined();
    expect(body.questions).toHaveLength(32);
  });

  it('returns 401 without auth token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assessment-sessions',
      payload: { templateId: STANDARD_TEMPLATE_ID },
    });

    expect(response.statusCode).toBe(401);
  });

  it('cannot access another org\'s template', async () => {
    // Template belongs to a different org
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/assessment-sessions',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: { templateId: OTHER_ORG_TEMPLATE_ID },
    });

    // RLS makes the template invisible — returns 404, not 403
    expect(response.statusCode).toBe(404);
  });
});
```

**Key helpers** (in `apps/api/tests/helpers/`):

- `createTestOrg(app)` — Creates a test org + LEARNER user, returns `{ org, user, token }`
- `createTestManager(orgId, app)` — Creates a MANAGER user in the given org
- `cleanupTestOrg(orgId, prisma)` — Cascades DELETE from all org-scoped tables
- `buildTestTemplate(orgId, prisma)` — Creates a standard 32-question template

**Database state verification:**

After a mutation endpoint, verify the DB state directly — do not rely solely on the API response.

```typescript
it('persists the assessment session to the database', async () => {
  const response = await app.inject({ /* ... */ });
  const { sessionId } = response.json();

  // Verify DB state directly
  const session = await app.prisma.assessmentSession.findUnique({
    where: { id: sessionId },
  });

  expect(session).not.toBeNull();
  expect(session!.status).toBe('IN_PROGRESS');
  expect(session!.orgId).toBe(orgId);  // RLS isolation verified
});
```

Run:
```bash
cd apps/api

# All integration tests
npm test

# Specific route tests
npm test -- --testPathPattern="auth"
npm test -- --testPathPattern="assessment-sessions"

# With verbose output
npm test -- --verbose

# With coverage
npm test -- --coverage
```

---

### Frontend Tests (React Testing Library)

Component tests verify user-visible behavior — what a user sees and can interact with. Test behavior, not implementation details.

**Core rules:**
- Use `screen.getByRole()` over `getByTestId()` — tests what users see
- Test keyboard navigation for all interactive elements (WCAG 2.1 AA required)
- Never test internal component state
- Mock the API client (`apps/web/src/lib/api.ts`) — do not make real HTTP calls in component tests

**Example component test:**

```typescript
// apps/web/tests/components/auth/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../../../src/components/auth/LoginForm';

// Mock the API module
jest.mock('../../../src/lib/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('LoginForm', () => {
  it('shows validation error when email is empty', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  it('is keyboard-navigable in logical order', async () => {
    render(<LoginForm />);

    // Tab through the form
    await userEvent.tab();
    expect(screen.getByLabelText(/email/i)).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByLabelText(/password/i)).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();
  });

  it('calls API with credentials on valid submission', async () => {
    const mockPost = require('../../../src/lib/api').api.post;
    mockPost.mockResolvedValueOnce({ accessToken: 'fake_token', user: { id: '1' } });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'alex@example.com');
    await user.type(screen.getByLabelText(/password/i), 'SecurePass123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'alex@example.com',
        password: 'SecurePass123!',
      });
    });
  });
});
```

Run:
```bash
cd apps/web

# All component tests
npm test

# Watch mode (recommended during development)
npm test -- --watch

# Specific component
npm test -- --testPathPattern="LoginForm"
```

---

### E2E Tests (Playwright)

End-to-end tests run against both the real API and the real frontend. They simulate actual user journeys in a browser.

**Prerequisites:**
```bash
# Install Playwright browsers (first time only)
cd e2e && npx playwright install chromium
```

**Both servers must be running:**
```bash
# Terminal 1
cd apps/api && npm run dev

# Terminal 2
cd apps/web && npm run dev
```

**Page Object Models:**

All E2E tests use Page Object Models (POM) to avoid duplication. POMs live in `e2e/pages/`.

```typescript
// e2e/pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.signInButton = page.getByRole('button', { name: /sign in/i });
  }

  async goto() {
    await this.page.goto('http://localhost:3118/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
```

**Example E2E test:**

```typescript
// e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Authentication', () => {
  test('user can log in and reach the dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('alex@example.com', 'SecurePass123!');

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('wrong@example.com', 'wrongpassword');

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });
});
```

Run:
```bash
cd e2e

# All E2E tests (headless)
npm test

# With UI (visual debugging)
npx playwright test --ui

# Single spec
npx playwright test auth.spec.ts

# Show HTML report
npx playwright show-report
```

---

## 7. Code Conventions

### File naming

| Type | Convention | Example |
|------|-----------|---------|
| Route files | kebab-case, plural noun | `assessment-sessions.ts` |
| Service files | kebab-case | `scoring.ts`, `learning-path.ts` |
| Plugin files | kebab-case | `prisma.ts`, `rate-limit.ts` |
| Test files | mirror source path + `.test.ts` | `tests/routes/assessment-sessions.test.ts` |
| React components | PascalCase | `LoginForm.tsx`, `DashboardLayout.tsx` |
| React hooks | camelCase, `use` prefix | `useAuth.ts`, `useApi.ts` |
| E2E page objects | PascalCase + `Page` | `LoginPage.ts`, `AssessmentPage.ts` |

### Import order

```typescript
// 1. Node built-ins
import { createHash } from 'crypto';

// 2. External packages
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// 3. Internal absolute imports (@connectsw/*)
import { AppError } from '@connectsw/shared/utils/errors';
import { logger } from '@connectsw/shared/utils/logger';

// 4. Relative imports (closest first)
import { ScoringService } from '../services/scoring';
import type { AssessmentSession } from './types';
```

### Fastify plugin registration order

**This order is mandatory.** Fastify's dependency injection requires plugins to be registered before any plugin or route that depends on them.

```typescript
// apps/api/src/app.ts
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });  // logger configured by observability plugin

  // 1. Configuration (must be first — others depend on it)
  await app.register(configPlugin);

  // 2. Prisma (database client + RLS middleware)
  await app.register(prismaPlugin);

  // 3. Redis (connection used by rate-limit and BullMQ)
  await app.register(redisPlugin);

  // 4. Auth (JWT verification — depends on config for JWT_SECRET)
  await app.register(authPlugin);

  // 5. Rate limiting (depends on Redis)
  await app.register(rateLimitPlugin);

  // 6. Observability (Pino logger, Prometheus — last infrastructure plugin)
  await app.register(observabilityPlugin);

  // 7. Routes (all after infrastructure plugins are ready)
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(organizationRoutes, { prefix: '/api/v1' });
  // ... all other route modules
}
```

### Multi-tenancy rules

Never query a tenant-scoped table without the RLS context having been set.

```typescript
// WRONG — never do this in a route handler
async function handler(request: FastifyRequest) {
  // RLS context may not be set here
  const sessions = await request.server.prisma.assessmentSession.findMany();
}

// CORRECT — RLS middleware (registered as onRequest hook in prismaPlugin)
// automatically sets app.current_org_id = request.orgId before this runs
async function handler(request: FastifyRequest) {
  // By the time this runs, PostgreSQL RLS is active for request.orgId
  const sessions = await request.server.prisma.assessmentSession.findMany({
    where: { userId: request.user.sub },  // No orgId filter needed — RLS handles it
  });
}
```

The RLS middleware is registered in `apps/api/src/plugins/prisma.ts` as a Fastify `onRequest` hook. It runs before every route handler automatically. Do not manually set `app.current_org_id` in route handlers — it is handled centrally.

**Defense in depth** — even though RLS makes cross-org access impossible at the DB layer, route handlers should still verify ownership where appropriate:

```typescript
// Defense in depth: verify the resource belongs to this user's org
// RLS already blocks cross-org access, but this makes the code's intent clear
const session = await prisma.assessmentSession.findUnique({
  where: { id: sessionId },  // RLS filters to current org automatically
});

if (!session) {
  // This org does not have a session with this ID
  throw new AppError('NOT_FOUND', 'Assessment session not found.', 404);
}
```

### Error handling with AppError

All errors must use `AppError` to produce RFC 7807 responses. Never throw raw `Error` objects or send error responses manually.

```typescript
import { AppError } from '../utils/errors';

// Throwing an AppError
throw new AppError(
  'NOT_FOUND',          // Error code (becomes title and part of type URL)
  'Template not found.', // Human-readable detail
  404                    // HTTP status
);

// AppError with additional context fields
throw new AppError('ACCOUNT_LOCKED', 'Too many failed attempts.', 423, {
  retryAfter: 900,  // Added to the RFC 7807 response body
});
```

The global error handler in `app.ts` catches all `AppError` instances and formats them as RFC 7807 responses automatically. Unhandled errors produce a generic `500 INTERNAL_ERROR` response and are logged with the full stack trace.

### RFC 7807 error format

All error responses follow RFC 7807. See `docs/API.md` — Section 5 for full documentation and examples.

---

## 8. Commit Format

```
type(scope): short description [US-XX][FR-XXX]

Optional longer body explaining why this change was made.
Wrap at 72 characters.
```

### Types

| Type | When |
|------|------|
| `feat` | New endpoint, feature, or behavior |
| `fix` | Bug fix |
| `test` | New or modified tests only |
| `docs` | Documentation only |
| `refactor` | Code restructuring, no behavior change |
| `chore` | Dependency updates, config, tooling |
| `ci` | CI/CD pipeline changes |

### Traceability IDs

Every feature commit must include at least one traceability ID:
- `US-XX` — User story ID from the PRD
- `FR-XXX` — Functional requirement ID from the PRD

```bash
# Feature with traceability
feat(assess): implement session start endpoint [US-01][FR-001]

# Test with traceability
test(scoring): add prevalence-weighted scoring unit tests [US-03][FR-002]

# Bug fix with issue reference
fix(rls): use SET LOCAL for PgBouncer compatibility [FR-016]

# Documentation (DOCS-XX ID)
docs(api): add authentication sequence diagram [DOCS-01]

# Architecture/chore — skip traceability with env var
SKIP_TRACEABILITY=1 git commit -m "chore(deps): bump prisma to 5.10.0"
```

The `commit-msg` hook enforces traceability IDs. To skip (arch/chore only):
```bash
SKIP_TRACEABILITY=1 git commit -m "chore: ..."
```

---

## 9. PR Process

Complete this checklist before opening a PR:

```
Pre-PR Checklist

Tests
[ ] All existing tests pass: cd apps/api && npm test
[ ] All new behavior has tests written first (TDD — no test = no merge)
[ ] Frontend tests pass: cd apps/web && npm test
[ ] E2E tests pass for affected user journeys

Code Quality
[ ] Linter passes: npm run lint (in both apps/api and apps/web)
[ ] No TypeScript errors: npm run typecheck
[ ] No TODO or FIXME comments left in code
[ ] No console.log statements left in code

Security
[ ] No secrets or credentials in code
[ ] All new endpoints enforce authentication where required
[ ] Role-based access control verified for new routes
[ ] RLS context is set before all tenant-scoped queries
[ ] New environment variables are documented in docs/DEVELOPMENT.md

Documentation
[ ] docs/API.md updated if new endpoints added or existing ones changed
[ ] .claude/addendum.md updated if new conventions introduced
[ ] Inline code comments added for non-obvious logic

PR Description
[ ] PR title follows commit format: type(scope): description
[ ] PR body references user stories (US-XX) and functional reqs (FR-XXX)
[ ] Breaking changes clearly called out
[ ] Migration steps documented if schema changes are included
```

### Branch and merge strategy

- Target branch: `main`
- Merge strategy: squash merge (keeps main history clean)
- All CI checks must pass before merge
- At least one review approval required

---

## 10. Troubleshooting

### Prisma migration conflicts

**Symptom**: `Error: Migration failed to apply cleanly`

**Cause**: Local migration state is out of sync with the database (e.g., you pulled a new migration from main while local changes exist).

**Fix**:
```bash
cd apps/api

# View current migration status
npx prisma migrate status

# If you have local drift: reset the dev database (destructive!)
npx prisma migrate reset

# Or to mark an applied migration as rolled back:
npx prisma migrate resolve --rolled-back <migration_name>
```

---

### RLS context not set — "No rows returned" or empty results

**Symptom**: Queries against tenant-scoped tables return empty results even though data exists in the database.

**Cause**: The RLS context (`app.current_org_id`) was not set before the query. This happens when:
1. A route handler queries the DB before the auth plugin has set `request.orgId` (plugin registration order problem)
2. A background job queries tenant-scoped tables without setting RLS context explicitly

**Fix for application code** — Verify plugin registration order in `app.ts` (auth plugin must register before route modules).

**Fix for background workers** — Background workers must set RLS context manually:
```typescript
// In a BullMQ worker, set RLS context before querying tenant data
await prisma.$executeRaw`SET LOCAL app.current_org_id = ${orgId}`;
const sessions = await prisma.assessmentSession.findMany({ ... });
```

**Diagnostic** — Check what `app.current_org_id` is set to in the DB session:
```sql
SELECT current_setting('app.current_org_id', true);
```

---

### JWT expiry issues in tests

**Symptom**: Integration tests intermittently fail with `401 UNAUTHORIZED` after running for more than 15 minutes.

**Cause**: The JWT generated in `beforeAll` has expired by the time a later test runs.

**Fix**: Generate a JWT with a longer expiry for tests, or regenerate it per test:
```typescript
// In test helpers — set a longer expiry for test tokens
const testToken = await createTestJwt(app, { userId, orgId, role, expiresIn: '24h' });
```

---

### Port conflicts

**Symptom**: `Error: listen EADDRINUSE: address already in use :::5014`

**Fix**:
```bash
# Find the process using port 5014
lsof -ti:5014 | xargs kill -9

# Or for port 3118
lsof -ti:3118 | xargs kill -9
```

If another ConnectSW product is already using these ports, check `.claude/PORT-REGISTRY.md` at the project root. AI Fluency is assigned API port 5014 and web port 3118 — these must not be changed.

---

### Redis connection refused

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Fix**:
```bash
# If using Docker Compose
docker-compose up -d redis
docker-compose ps  # Verify redis is running

# If running Redis directly
redis-server &

# Verify Redis is accepting connections
redis-cli ping  # Should return: PONG
```

---

### Prisma client out of date

**Symptom**: TypeScript errors referencing Prisma model fields that don't exist, or `Cannot find name 'PrismaClient'`

**Cause**: The Prisma client needs regeneration after schema changes.

**Fix**:
```bash
cd apps/api
npx prisma generate
```

This regenerates `node_modules/.prisma/client/` from the current `schema.prisma`. Run it after every `git pull` that includes schema changes.
