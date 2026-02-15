# LinkedIn Agent API Tests

## Branch
`feature/linkedin-agent/api-tests` (based on `foundation/linkedin-agent`)

## Summary
Added 38 tests across 4 test suites for the LinkedIn Agent API backend.

## Test Files
- `tests/setup.ts` - shared helpers: env vars, buildTestApp, cleanDB, getTestPrisma
- `tests/health.test.ts` - 6 tests for GET /api/health and /api/health/ready
- `tests/posts.test.ts` - 18 tests for full CRUD on /api/posts
- `tests/models.test.ts` - 8 tests for /api/models and /api/models/usage
- `tests/env.test.ts` - 6 tests for environment validation & caching

## Key Decisions
- Real PostgreSQL (`linkedin_agent_dev`) - no mocks for DB
- `global.fetch` mocked only in models.test.ts to prevent real OpenRouter calls
- Posts tests seed data directly via Prisma, test non-LLM routes only
- cleanDB runs in correct FK-safe order: slides -> logs -> drafts -> sources
