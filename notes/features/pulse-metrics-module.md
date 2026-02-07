# Pulse Metrics Module (BACKEND-04)

## Task
Build team velocity and code quality metrics for the Pulse API.

## Endpoints
- `GET /api/v1/metrics/velocity?teamId=X&period=7d|30d|90d`
- `GET /api/v1/metrics/coverage?teamId=X&repoId=Y`
- `GET /api/v1/metrics/summary?teamId=X`

## Metrics to Compute
1. **PR merge rate**: count of merged PRs per period
2. **Cycle time**: median time from PR open to merge (hours)
3. **Review time**: median time from PR open to first review (hours)
4. **Test coverage**: latest coverage % per repo, trend over time
5. **Summary**: aggregated view of all above

## Architecture Decisions
- Service class `MetricsService` takes PrismaClient in constructor (PATTERN-010)
- Handlers class `MetricsHandlers` formats responses
- Routes file registers under `/api/v1/metrics`
- Zod schemas for query validation
- All auth required (team membership verified)
- Time-series data from MetricSnapshot table
- Real-time computation from raw PR/Commit/CoverageReport data
- Aggregation function computes and stores MetricSnapshots

## File Structure
```
src/modules/metrics/
  schemas.ts    - Zod validation schemas
  service.ts    - Business logic, DB queries
  handlers.ts   - Request/response formatting
  routes.ts     - Fastify route registration
```

## Test Plan
1. GET /api/v1/metrics/velocity - auth, empty data, with PRs, period filtering
2. GET /api/v1/metrics/coverage - auth, empty data, with coverage reports
3. GET /api/v1/metrics/summary - auth, empty data, with mixed data
4. Aggregation function - computes and stores snapshots
5. Edge cases: no team membership, invalid params
