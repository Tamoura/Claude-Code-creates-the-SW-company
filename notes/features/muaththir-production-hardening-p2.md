# Muaththir Production Hardening P2

## Branch
feature/muaththir/production-hardening-p2

## Tasks

### 1. CSP Headers
- File: `products/muaththir/apps/api/src/app.ts`
- Current: `contentSecurityPolicy: process.env.NODE_ENV === 'production'` (boolean toggle)
- Goal: Proper CSP policy for dev AND production
- Policy: self for scripts/styles/images/fonts/connect, unsafe-inline for styles (Tailwind), block everything else

### 2. Soft-Delete Prisma Middleware
- File: `products/muaththir/apps/api/src/plugins/prisma.ts`
- Add Prisma middleware to auto-filter `deletedAt: null` on findMany/findFirst/findUnique
- Models with `deletedAt`: Observation only (GoalProgress does not exist in schema)
- IMPORTANT: Routes already manually filter `deletedAt: null`. The middleware is a safety net.
  - observations.ts: manually adds `deletedAt: null` in all queries
  - dashboard.ts: manually adds `deletedAt: null` in queries
  - export.ts: manually adds `deletedAt: null` in observations include
  - reports.ts: manually adds `deletedAt: null` in observation queries
  - insights.ts: uses gatherDimensionData which should handle it

### 3. Database Query Optimization
- observations.ts: Already has proper pagination via parsePagination + paginatedResult. GOOD.
- milestones.ts: Uses `include: { childMilestones: { where: { childId } } }` to batch. GOOD.
- goals.ts: Has pagination. But the goal list query does NOT include template data.
  Could include template title for display, but it's a simple FK - acceptable.
- children.ts: GET / includes `_count: { select: { observations: true } }` which counts ALL observations including soft-deleted ones. BUG: should filter to deletedAt: null.
- dashboard.ts: Batches all queries with Promise.all, groups in-memory. GOOD.
- sharing.ts: No pagination on list queries. Could be a concern for users with many shares.

### Issues Found
1. children.ts _count includes soft-deleted observations
2. sharing.ts: GET / and GET /shared-with-me lack pagination (minor - limited by nature)

## Frontend Tasks (Phase 2b)

### 4. RadarChart Memoization
- File: `products/muaththir/apps/web/src/components/dashboard/RadarChart.tsx`
- Wrap score calculations in `useMemo()` with proper deps
- Memoize the data transformation to prevent re-renders
- Export as React.memo component

### 5. API Response Validation with Zod
- Create `products/muaththir/apps/web/src/lib/api-schemas.ts`
- Schemas: DashboardData, Child, Observation
- Update api-client to use `safeParse` on critical responses
- Graceful degradation: log warning on validation failure, still return data

### 6. Loading/Error State Improvements
- Add retry buttons to error states on data-fetching pages
- Pages needing retry: child profile, insights, goals, milestones, timeline,
  reports, dimensions, observe, dashboard (already has partial failure handling)

## Pre-existing Test Failures
- 35 tests failing before this work (DimensionCard, dashboard, etc.)

## Progress
- [ ] Write tests for CSP headers
- [ ] Implement CSP headers
- [ ] Write tests for soft-delete middleware
- [ ] Implement soft-delete middleware
- [ ] Fix children observation count to exclude soft-deleted
- [x] RadarChart memoization
- [x] API schemas with Zod validation
- [x] Loading/error state improvements with retry buttons
- [ ] Run full test suite & build
