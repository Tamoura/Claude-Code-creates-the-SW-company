# AI Fluency - Full Assessment Cycle

## Branch
`feature/ai-fluency/full-assessment-cycle`

## Phases
1. Auth API (register, login, me) - replace 501 stubs
2. Assessment API (start, status, questions, responses, complete, results)
3. Profile API (latest profile, history)
4. Seed script (org, template, 50 questions, indicators, algorithm version)
5. Integration tests for full flow

## Key Decisions
- Schema uses Argon2 (not bcrypt) — existing test helpers use argon2
- Config validates JWT_SECRET min 32 chars — .env already has it
- Module is CommonJS with .js import extensions
- Auth plugin already provides `authenticate`/`requireRole` decorators
- Scoring service is pure function — caller persists results
- User model: email unique per org (@@unique([orgId, email]))
- For MVP: skip RLS enforcement, single default org

## Test DB
- `postgresql://postgres@localhost:5432/ai_fluency_test`
- Schema up to date, 101 tests passing at baseline
