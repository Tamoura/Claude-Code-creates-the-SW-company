# Pulse Audit High-Priority Fixes

## Branch: feature/pulse/inception (existing)
## Status: COMPLETE

## Fix 1: Team Membership Verification Middleware (HIGH - Security)
- DONE: Created `src/plugins/team-auth.ts` as Fastify preHandler
- Extracts teamId from query, params, or body
- Checks teamMember table for userId + teamId
- Returns 403 if not a member
- Applied to: repos, metrics, risk, activity routes
- 8 new integration tests added (3 in repos, 3 in metrics, 2 in risk)
- Commit: e0931e0

## Fix 2: N+1 Query in Risk Factors (HIGH - Performance)
- DONE: Refactored `computeCoverageDelta()` in `src/modules/risk/factors.ts`
- Was: 2 queries per repo in a loop (2*N round-trips)
- Now: 2 batch queries total, processed in-memory per repo
- All 20 risk tests pass
- Commit: fccf5d0

## Fix 3: Risk Score Threshold Alignment (MEDIUM - Consistency)
- DONE: Aligned mobile thresholds to match backend
- Backend: <=33 low, <=66 medium, >66 high (unchanged)
- Mobile: Updated from <=40/<=70/>70 to <=33/<=66/>66
- Updated 6 tests in __tests__/theme.test.ts
- Commit: c2d64e4

## Test Results
- API: 132/132 tests passing (8 suites)
- Mobile: 67/67 tests passing (11 suites)
