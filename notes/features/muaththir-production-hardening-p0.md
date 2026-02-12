# Muaththir Production Hardening P0

## Branch
`feature/muaththir/production-hardening-p0`

## Fixes Applied

### Fix 1: Remove JWT Secret Unsafe Fallback (HIGH-03)
- **File**: `products/muaththir/apps/api/src/app.ts`
- Removed hardcoded fallback `'test-secret-do-not-use-in-production'`
- App now fails fast at startup if `JWT_SECRET` is missing or < 32 chars
- Test helper already sets a 44-char secret, so tests unaffected

### Fix 2: N+1 Query Optimization in Insights/Reports
- **Files**: `src/routes/insights.ts`, `src/routes/reports.ts`
- `buildRecommendations()` had sequential queries for milestone
  data and streak count; now batched with `Promise.all`
- `gatherDimensionData()` in score-calculator.ts was already
  batch-optimized (no change needed)

### Fix 3: Rate Limiting on Password Reset (HIGH-04)
- **File**: `src/routes/auth.ts`
- `forgot-password`: changed from 3/hour to **3 per 15 minutes**
- `reset-password`: changed from 5/15min to **5 per hour**

### Fix 4: Email Enumeration Timing Attack (HIGH-02)
- Already implemented: non-existent user path does a dummy
  `hashPassword()` call to match bcrypt timing of existing path

### Fix 5: Composite Database Index
- Already in schema: `@@index([childId, deletedAt, dimension])`
  on Observation model (line 129 of schema.prisma)

### Fix 6: Soft Delete Filter Audit
- **File**: `src/routes/auth.ts` (demo-login)
- Found one missing `deletedAt: null` filter in demo-login
  observation count; fixed
- All other routes already include the filter

### Fix 7: Goal Templates Pagination
- **File**: `src/routes/goal-templates.ts`
- Added pagination with default limit 50 (max 100)
- Response now uses standard `paginatedResult` format
- Updated tests to match new response shape

## Test Results
- **Before**: 403 passing
- **After**: 413 passing (10 new tests added)
- New test file: `tests/integration/jwt-validation.test.ts` (5 tests)
- Expanded: `tests/integration/goal-templates.test.ts` (+5 tests)
