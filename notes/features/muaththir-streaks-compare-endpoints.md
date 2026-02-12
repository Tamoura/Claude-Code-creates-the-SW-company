# Muaththir: Streaks & Compare Endpoints

## Branch
`feature/muaththir/backend-final-features`

## Endpoints

### 1. GET /api/children/:childId/streaks
- Calculate consecutive-day observation streaks
- Returns: currentStreak, bestStreak, totalObservations, lastObservationDate
- Logic: Group observations by observedAt date, find consecutive day sequences
- Auth: required (parent must own child)

### 2. GET /api/children/compare
- Compare dashboard data across multiple children
- Query param: childIds=id1,id2
- Returns array of dashboard summaries per child
- Auth: required (parent must own all children)
- Reuse dashboard scoring logic

## Patterns
- Routes: FastifyPluginAsync, preHandler: [fastify.authenticate]
- Validation: Zod schemas via validateQuery/validateBody
- Ownership: verifyChildOwnership(fastify, childId, parentId)
- Tests: build-app helper with setupTestDb, cleanDb, closeDb, createTestApp
- Registration in app.ts with prefix

## Baseline
- 471/471 tests passing
