# Pulse Metrics Module (BACKEND-04)

## Status: COMPLETE
16/16 tests passing. Pushed to feature/pulse/inception.

## Endpoints Implemented
- `GET /api/v1/metrics/velocity?teamId=X&period=7d|30d|90d`
- `GET /api/v1/metrics/coverage?teamId=X&repoId=Y`
- `GET /api/v1/metrics/summary?teamId=X&period=7d|30d|90d`
- `POST /api/v1/metrics/aggregate?teamId=X`

## Metrics Computed
1. **PR merge rate**: count of merged PRs per period
2. **Cycle time**: median time from PR open to merge (hours)
3. **Review time**: median time from PR open to first review (hours)
4. **Test coverage**: latest coverage % per repo, trend (up/down/stable)
5. **Summary**: aggregated velocity + coverage + activity counts
6. **Aggregation**: stores MetricSnapshots for time-series data

## Architecture
- Service class `MetricsService` takes PrismaClient (PATTERN-010)
- Handlers class `MetricsHandlers` validates with Zod, delegates to service
- Routes file registers under `/api/v1/metrics` with auth hook
- Parallel queries via Promise.all in getSummary and runAggregation
- Batch inserts via createMany for snapshots

## Files Created/Modified
- `src/modules/metrics/schemas.ts` - Zod validation schemas
- `src/modules/metrics/service.ts` - Business logic, DB queries
- `src/modules/metrics/handlers.ts` - Request/response formatting
- `src/modules/metrics/routes.ts` - Fastify route registration
- `src/app.ts` - Route registration
- `tests/integration/metrics.test.ts` - 16 integration tests

## Learned Patterns
- Create test users directly in DB with `app.jwt.sign()` instead of
  hitting rate-limited auth endpoints. This is faster and avoids
  coupling test setup to auth implementation.
- Use `Prisma.XWhereInput` types instead of `any` for where clauses.
- Use `createMany` for batch inserts instead of sequential creates.
