# Muaththir Backend Hardening

## Objective
Safe, non-breaking improvements to the Muaththir API backend.
Must keep all 471 tests passing throughout.

## Assessment

### 1. Input Validation (Zod)
- children.ts: Already has Zod schemas (createChildSchema, updateChildSchema)
- observations.ts: Already has Zod schemas (createObservationSchema, updateObservationSchema, listObservationsQuery)
- goals.ts: Already has Zod schemas (createGoalSchema, updateGoalSchema, listGoalsQuery)
- reports.ts: Already has Zod schema (reportQuerySchema)
- export.ts: Manual format validation, no Zod for query params -> ADD ZOD
- digest.ts: GET only, no body -> no action needed
- activity.ts: GET only, no body -> no action needed

### 2. Error Response Consistency
- Central error handler in app.ts uses RFC 7807 format
- reports.ts line 379 returns `{ error, message }` instead of throwing -> FIX
- export.ts throws BadRequestError (goes through central handler) -> OK

### 3. Rate Limiting
- Already installed: @fastify/rate-limit
- Global: 100 req/min (disabled in test)
- Per-route: auth routes (5/min), export (5/hr), sharing/invite (10/hr)
- No additional action needed

### 4. Health Check Enhancement
- Already checks DB with SELECT 1
- Can add: uptime, memory usage, version from package.json

## Plan
1. Fix reports.ts error response to use validateQuery (consistent with other routes)
2. Add Zod schema validation to export.ts query params
3. Enhance health check with uptime + memory info
4. Run tests after each change

## Constraints
- DO NOT change function signatures
- DO NOT change enum types
- Stage specific files only
- Run tests after every change
