# AI Fluency API Routes Implementation

## Branch: feature/ai-fluency/openrouter-assessments (existing)

## Status: COMPLETE
All 4 route groups implemented and tested.

## Implementation Summary

### 1. Auth Routes (src/routes/auth.ts) - DONE
- POST /api/v1/auth/register - Argon2id hashing, returns JWT tokens
- POST /api/v1/auth/login - credential validation, user enumeration prevention
- POST /api/v1/auth/refresh - SHA-256 token lookup, new access token
- POST /api/v1/auth/logout - invalidates refresh token (requires auth)
- Service: src/services/auth.service.ts

### 2. Assessment Routes (src/routes/assessments.ts) - DONE
- POST /api/v1/assessment-sessions - create session, return questions
- GET /api/v1/assessment-sessions/:id - session with progress
- POST /api/v1/assessment-sessions/:id/responses - upsert response
- POST /api/v1/assessment-sessions/:id/complete - run scoring engine
- GET /api/v1/assessment-sessions/:id/results - scored profile
- Service: src/services/assessment.service.ts

### 3. Profile Routes (src/routes/profiles.ts) - DONE
- GET /api/v1/profiles/me - latest fluency profile
- GET /api/v1/profiles/history - all profiles with session info

### 4. Learning Path Routes (src/routes/learning-paths.ts) - DONE
- POST /api/v1/learning-paths - generate from profile (weakest-first)
- GET /api/v1/learning-paths/:id - path with modules
- PATCH /api/v1/learning-paths/:id/modules/:moduleId - update status
- Service: src/services/learning-path.service.ts

## Key Fix
Moved setErrorHandler() BEFORE registerRoutes() in app.ts so
scoped route plugins inherit the RFC 7807 error handler.

## Test Results
- Before: 125 tests, 14 suites
- After: 176 tests, 18 suites (100% passing)
- New tests: 51 integration tests across 4 new test files
