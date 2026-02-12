# Muaththir Report Generation Endpoint

## Feature
GET /api/children/:childId/reports/summary

Comprehensive developmental report that aggregates data from
multiple sources into a single API response.

## Implementation Details

### Route: `products/muaththir/apps/api/src/routes/reports.ts`
- Registered in app.ts under `/api/children` prefix
- Uses `verifyChildOwnership` for authorization
- Uses `fastify.authenticate` preHandler

### Data Sources Aggregated
1. Dashboard scores (all 6 dimensions with factors)
2. AI insights (strengths, areas for growth, recommendations, trends)
3. Recent observations (configurable count, default 10)
4. Milestone progress per dimension
5. Goals status summary (active/completed/paused)
6. Observation count by dimension over date range

### Query Parameters
- `from` - ISO date string, default 30 days ago
- `to` - ISO date string, default now
- `observations` - number of recent observations, default 10

### Design Decisions
- Duplicated calculation logic from dashboard.ts and insights.ts
  inline rather than importing to avoid circular dependencies
- Used Promise.all for batch queries (6 parallel data fetches)
- Milestone progress only counts milestones for the child's age band

### Tests: 18 integration tests
File: `products/muaththir/apps/api/tests/integration/reports.test.ts`
