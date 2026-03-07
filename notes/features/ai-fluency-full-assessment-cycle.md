# AI Fluency - Full Assessment Cycle

## Branch
`feature/ai-fluency/full-assessment-cycle`

## Status: COMPLETE
- 129 tests passing across 15 test suites
- Baseline was 101 tests (11 suites)
- Added 28 new tests in 4 new test files

## Phases Completed
1. Auth API (register, login, me) - replaced 501 stubs
2. Assessment API (start, status, questions, respond, responses, complete, results)
3. Profile API (latest profile, history)
4. Dashboard API (aggregated user data)
5. Seed script (24 indicators, 50 questions, demo org, algorithm v1)
6. Full lifecycle E2E integration test

## Endpoints Implemented

### Auth (/api/v1/auth)
- POST /register - create user with Argon2id hash, return JWT
- POST /login - validate credentials, return JWT
- GET /me - return current user from JWT (requires auth)

### Assessment (/api/v1/assessments)
- POST /start - auto-select template, resume existing session or create new
- GET /:sessionId - session status and progress
- GET /:sessionId/questions - all questions with existing answers
- POST /:sessionId/respond - single answer (upsert)
- POST /:sessionId/responses - batch answers (upsert)
- POST /:sessionId/complete - run scoring engine, create FluencyProfile
- GET /:sessionId/results - retrieve scored FluencyProfile

### Profile (/api/v1/profile)
- GET / - latest FluencyProfile (null if none)
- GET /history - all profiles ordered by date

### Dashboard (/api/v1/dashboard)
- GET / - user info, latest profile, assessment count, learning path

## Key Decisions
- Schema uses Argon2 (not bcrypt) - consistent with existing test helpers
- Assessment /start auto-selects template and resumes IN_PROGRESS sessions
- Completion validates all questions answered before scoring
- Profile returns { profile: null } (200) instead of 404 when no profile
- Scoring uses existing scoring.ts service (pure function)
- 2-hour session expiry, idempotent response upserts

## Seed Data
- 24 behavioral indicators (6 per dimension, mix OBSERVABLE + SELF_REPORT)
- 50 questions (30 scenario + 20 self-report)
- Demo org (demo-org), demo user (demo@ai-fluency.com / Demo1234)
- Algorithm version 1, Generic assessment template
