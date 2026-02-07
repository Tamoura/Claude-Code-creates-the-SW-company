# Pulse Audit High-Priority Fixes

## Branch: feature/pulse/inception (existing)

## Fix 1: Team Membership Verification Middleware (HIGH - Security)
- Create `src/plugins/team-auth.ts` as Fastify preHandler
- Extracts teamId from query, params, or body
- Checks teamMember table for userId + teamId
- Returns 403 if not a member
- Apply to: repos, metrics, risk, activity routes

## Fix 2: N+1 Query in Risk Factors (HIGH - Performance)
- `computeCoverageDelta()` in `src/modules/risk/factors.ts`
- Currently loops repos, 2 queries each
- Refactor to batch: 2 total queries for all repos
- Process results in memory

## Fix 3: Risk Score Threshold Alignment (MEDIUM - Consistency)
- Backend: <=33 low, <=66 medium, >66 high (in service.ts)
- Mobile: <=40 low, <=70 medium, >70 high (in theme.ts)
- Align mobile to match backend thresholds
- Update mobile tests in __tests__/theme.test.ts
