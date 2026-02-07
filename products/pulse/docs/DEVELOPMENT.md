# Pulse Development Guide

This guide covers local development setup, project conventions, testing, and the development workflow for contributing to Pulse.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Runtime |
| PostgreSQL | 15+ | Database |
| Redis | 7+ | Cache and pub/sub |
| Git | 2.x | Version control |
| GitHub OAuth App | -- | Required for GitHub integration features |

### Optional

| Tool | Purpose |
|------|---------|
| Expo CLI (`npx expo`) | Mobile app development |
| Prisma Studio | Visual database browser |

## Initial Setup

### 1. Install dependencies

```bash
cd products/pulse
npm install

cd apps/api
npm install

cd ../web
npm install

cd ../..
```

### 2. Create the database

```bash
createdb pulse_dev
```

### 3. Configure environment

Copy the example environment file and fill in the values:

```bash
cp apps/api/.env.example apps/api/.env
```

**Required environment variables**:

```env
DATABASE_URL=postgresql://postgres@localhost:5432/pulse_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-256-bit-secret-here
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
GITHUB_WEBHOOK_SECRET=your-webhook-secret
ENCRYPTION_KEY=your-32-byte-hex-key
FRONTEND_URL=http://localhost:3106
PORT=5003
NODE_ENV=development
```

To generate a random `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

To generate a random `ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set up GitHub OAuth App

1. Go to GitHub Settings > Developer settings > OAuth Apps > New OAuth App
2. Set the Authorization callback URL to `http://localhost:3106/api/v1/auth/github/callback`
3. Copy the Client ID and Client Secret to your `.env` file

### 5. Run database migrations

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
```

### 6. Seed test data (optional)

```bash
cd apps/api
npm run db:seed
```

### 7. Start development servers

```bash
# From products/pulse/
npm run dev
```

This starts the API on port 5003 and the web frontend on port 3106 concurrently.

## Project Structure

### Backend (`apps/api/`)

The backend follows the **Route-Handler-Service** pattern. Each module contains:

```
modules/<name>/
  routes.ts      # Fastify route definitions (URL, method, middleware)
  handlers.ts    # Request parsing, response formatting
  service.ts     # Business logic (testable independently)
  schemas.ts     # Zod validation schemas
```

**Key directories**:

| Directory | Purpose |
|-----------|---------|
| `src/app.ts` | Fastify app factory (`buildApp`) |
| `src/server.ts` | Server entry point (listen on port 5003) |
| `src/plugins/` | Fastify plugins (prisma, redis, auth, websocket, etc.) |
| `src/modules/` | Domain modules (auth, repos, activity, metrics, risk, webhooks, health) |
| `src/jobs/` | Background job scheduler and job implementations |
| `src/utils/` | Crypto, logger, error classes, pagination helpers |
| `src/lib/` | Shared error classes (AppError, RFC 7807) |
| `prisma/schema.prisma` | Database schema definition |
| `prisma/migrations/` | Database migration files |
| `tests/` | Jest test suites |

### Frontend (`apps/web/`)

The frontend uses Next.js 14 with the App Router:

| Directory | Purpose |
|-----------|---------|
| `src/app/` | Next.js App Router pages |
| `src/components/` | React components (charts, dashboard, UI) |
| `src/hooks/` | Custom React hooks |
| `src/lib/` | API client, token manager, WebSocket client |

### Mobile (`apps/mobile/`)

React Native with Expo:

| Directory | Purpose |
|-----------|---------|
| `app/` | Expo Router screens |
| `components/` | React Native components |
| `hooks/` | Custom hooks (auth, push notifications, WebSocket) |
| `lib/` | API client, secure storage |

## Database

### Schema

The database has 15 tables defined in `apps/api/prisma/schema.prisma`:

**Core tables**: `users`, `teams`, `team_members`
**GitHub data**: `repositories`, `commits`, `pull_requests`, `reviews`, `deployments`
**Metrics**: `coverage_reports`, `metric_snapshots`, `risk_snapshots`
**Notifications**: `notifications`, `notification_preferences`, `device_tokens`
**Infrastructure**: `team_invitations`, `refresh_tokens`, `audit_logs`, `job_state`

### Common commands

```bash
cd apps/api

# Generate Prisma client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name describe_your_change

# Apply migrations
npx prisma migrate dev

# Open Prisma Studio (visual database browser)
npm run db:studio

# Push schema to database (skip migration, development only)
npx prisma db push

# Seed test data
npm run db:seed
```

### Adding a new table

1. Edit `prisma/schema.prisma` to add the new model
2. Run `npx prisma migrate dev --name add_new_table`
3. Run `npx prisma generate` to update the Prisma client

## Testing

Pulse follows Test-Driven Development (TDD) using the Red-Green-Refactor cycle.

### Running tests

```bash
# All tests (API + web)
cd products/pulse
npm test

# API tests only
cd apps/api
npm test

# Watch mode (re-runs on file changes)
cd apps/api
npm run test:watch

# With coverage report
cd apps/api
npm run test:coverage

# Performance tests
cd apps/api
npm run test:perf

# End-to-end tests (Playwright)
cd products/pulse
npm run test:e2e

# E2E with browser visible
npm run test:e2e:headed

# E2E with Playwright UI
npm run test:e2e:ui
```

### Test conventions

**File naming**: Test files live in the `tests/` directory and use the pattern `<module>.test.ts`.

**Test structure**: Tests use the Arrange-Act-Assert pattern:

```typescript
describe('Auth Routes', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should create a new user and return a JWT token', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        password: 'MyStr0ng!Pass',
        name: 'Test User',
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: input,
      });

      // Assert
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.token).toBeDefined();
      expect(body.user.email).toBe('test@example.com');
    });
  });
});
```

**No mocks**: Tests use real database connections and real Redis. The test environment connects to a test database (`pulse_test`) that is reset between test suites.

**Rate limiting in tests**: Auth endpoints use higher rate limits (`max: 100`) in test mode to avoid interfering with test suites that call register/login in `beforeEach`.

## Coding Conventions

### TypeScript

- Strict mode enabled
- All code is TypeScript (no plain JavaScript files)
- Use `import` syntax (ESM modules, `"type": "module"` in package.json)
- Zod schemas at API boundaries for input validation

### API Design

- All REST endpoints are prefixed with `/api/v1/`
- Errors follow RFC 7807 Problem Details format
- Authentication via JWT Bearer token in `Authorization` header
- WebSocket authentication via query parameter or first message
- Rate limiting on all endpoints (stricter limits on auth endpoints)

### Error Handling

Use the error classes from `src/lib/errors.ts`:

```typescript
import { AppError, NotFoundError, ConflictError, UnauthorizedError, BadRequestError } from '../../lib/errors.js';

// These automatically produce RFC 7807 responses:
throw new NotFoundError('Repository not found');     // 404
throw new ConflictError('Email already registered'); // 409
throw new UnauthorizedError('Invalid credentials');  // 401
throw new BadRequestError('Missing teamId');         // 400
```

### Git Conventions

**Branch naming**:
```
feature/pulse/<feature-id>    # New features
fix/pulse/<issue-id>          # Bug fixes
arch/pulse                    # Architecture work
foundation/pulse              # Initial setup
```

**Commit messages** follow Conventional Commits:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`

Example:
```
feat(auth): add email verification endpoint

Implements PRO-03 email verification with token generation
and expiration handling.

Closes #42
```

**Git safety rules** (from company policy):
- Never use `git add .` or `git add -A` -- always stage specific files by name
- Verify staged files before every commit with `git diff --cached --stat`
- Verify after every commit with `git show --stat`
- Pre-commit hook blocks commits with >30 files or >5000 deleted lines

## Background Jobs

Background jobs run within the Fastify process using `setInterval`. Each job is idempotent and tracks its last execution timestamp in the `job_state` database table.

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Metric Aggregation | Every 60 min | Compute velocity and quality metrics from raw events |
| Risk Calculation | Every 4 hours (8am-8pm) | Run sprint risk scoring algorithm |
| Anomaly Detection | Every 15 min | Check for anomalous patterns in recent data |
| GitHub Sync | Every 30 min | Poll GitHub for events missed by webhooks |
| Data Cleanup | Daily at 2am | Archive/delete data older than retention period |

## Adding a New API Module

1. Create the module directory: `src/modules/<name>/`
2. Create the following files:
   - `schemas.ts` -- Zod validation schemas
   - `service.ts` -- Business logic
   - `handlers.ts` -- Request parsing and response formatting
   - `routes.ts` -- Fastify route definitions
3. Register the routes in `src/app.ts`:
   ```typescript
   import myRoutes from './modules/my-module/routes.js';
   await fastify.register(myRoutes, { prefix: '/api/v1/my-module' });
   ```
4. Write tests in `tests/my-module.test.ts`
5. Add the module to the API documentation

## Plugin Registration Order

Plugins are registered in a specific order (per PATTERN-009):

1. Observability (correlation IDs, request logging)
2. Prisma (database connection)
3. Redis (cache, pub/sub)
4. Auth (JWT verification, GitHub OAuth)
5. Rate Limit (Redis-backed)
6. CORS, Helmet (security headers)
7. WebSocket (real-time)
8. Module Routes (domain endpoints)

## Useful Links

| Resource | Location |
|----------|----------|
| API Documentation | [docs/API.md](API.md) |
| WebSocket Protocol | [docs/WEBSOCKET.md](WEBSOCKET.md) |
| Architecture | [docs/architecture.md](architecture.md) |
| OpenAPI Spec | [docs/api-schema.yml](api-schema.yml) |
| Product Requirements | [docs/PRD.md](PRD.md) |
| Database Schema | [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma) |
| ADRs | [docs/ADRs/](ADRs/) |
| Security | [docs/security/](security/) |
