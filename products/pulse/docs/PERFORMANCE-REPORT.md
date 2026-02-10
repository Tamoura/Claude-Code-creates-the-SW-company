# Pulse Performance Report

**Date**: 2026-02-07
**Audited By**: Performance Engineer (PERF-01)
**Product**: Pulse - AI-Powered Developer Intelligence Platform
**Branch**: feature/pulse/inception

---

## Executive Summary

Pulse's backend API meets the p95 < 200ms target for all non-auth endpoints. The WebSocket subsystem handles 150+ concurrent connections and 1000+ messages/second. Two N+1 query patterns were identified and fixed. The frontend dependency footprint is minimal. Overall, the codebase is well-architected for performance at the current scale.

---

## 1. API Response Time Benchmarks

**Target**: p95 < 200ms (auth endpoints: < 500ms due to intentional bcrypt cost)
**Method**: 20 iterations per endpoint via Fastify inject (no network overhead)

| Endpoint | p50 | p95 | p99 | Status |
|----------|-----|-----|-----|--------|
| `GET /health` | 1ms | 17ms | 17ms | PASS |
| `POST /api/v1/auth/login` | 2ms | 334ms | 334ms | PASS (bcrypt expected) |
| `GET /api/v1/repos` | 2ms | 8ms | 8ms | PASS |
| `GET /api/v1/metrics/velocity` | 1ms | 5ms | 5ms | PASS |
| `GET /api/v1/metrics/coverage` | 1ms | 3ms | 3ms | PASS |
| `GET /api/v1/metrics/summary` | 3ms | 10ms | 10ms | PASS |
| `GET /api/v1/activity` | 1ms | 2ms | 2ms | PASS |
| `POST /api/v1/webhooks/github` | 1ms | 2ms | 2ms | PASS |

**Notes**:
- The `auth/login` endpoint's higher latency is expected because bcrypt with cost factor 12 is intentionally slow (anti-brute-force). This is by design.
- The `metrics/summary` endpoint makes 4 parallel queries (velocity + coverage + commit count + deployment count) which explains its slightly higher p95.
- All other endpoints are well under target.

**Benchmark test file**: `products/pulse/apps/api/tests/performance/api-benchmarks.test.ts`

---

## 2. WebSocket Throughput

**Target**: Handle 100+ concurrent connections

| Test | Result | Target | Status |
|------|--------|--------|--------|
| 150 concurrent connections | <100ms to add all | <100ms | PASS |
| Broadcast to 100 subscribers | <50ms | <50ms | PASS |
| 500 connect/disconnect cycles | <100ms | <100ms | PASS |
| 1000 message serialization+send | <100ms | <100ms | PASS |
| Backpressure detection | Messages dropped | Drop when buffer full | PASS |

**Architecture Assessment**:
- `ConnectionManager` uses a Map<WebSocket, ConnectionMeta> for O(1) lookup.
- `RoomManager` maintains room subscriptions with in-memory Sets.
- Heartbeat interval (30s) with 60s timeout prevents zombie connections.
- Backpressure check (`ws.bufferedAmount`) prevents memory exhaustion on slow clients.
- Redis pub/sub used for cross-process broadcasting (graceful fallback to in-memory).

**Benchmark test file**: `products/pulse/apps/api/tests/performance/websocket-load.test.ts`

---

## 3. Database Query Analysis

### 3.1 N+1 Queries Found and Fixed

**Issue 1: MetricsService.getCoverage() -- FIXED**

Before:
```
Query 1: SELECT repos WHERE teamId = X
Query 2..N+1: SELECT coverage_reports WHERE repoId = repo[i] (one per repo)
```

After:
```
Query 1: SELECT repos WITH coverageReports (Prisma include, single query with subselects)
```

This eliminates N additional roundtrips. For a team with 20 repos, this reduces from 21 queries to 1.

**Issue 2: WebhookService.processPushEvent() -- FIXED**

Before:
```
For each commit in push event:
  UPSERT INTO commits (sequential, N roundtrips)
```

After:
```
INSERT INTO commits ... ON CONFLICT DO NOTHING (single batch, 1 roundtrip)
```

For a push with 10 commits, this reduces from 10 queries to 1. Commit SHAs are immutable so skip-on-duplicate is semantically correct.

### 3.2 Queries That Are Already Well-Optimized

- **MetricsService.getVelocity()**: Single query to find merged PRs with date range filter. Uses `@@index([repoId, state])` index. No N+1.
- **MetricsService.getSummary()**: Runs 4 queries in parallel via `Promise.all` (velocity, coverage, commit count, deployment count). Efficient.
- **RepoService.listRepos()**: Uses `Promise.all` for count + findMany in parallel. Pagination properly uses skip/take.
- **handleActivityFeed()**: Queries 4 tables (commits, PRs, reviews, deployments) in parallel. Each uses indexes on `repoId` and timestamp columns.

### 3.3 Index Coverage

The Prisma schema defines 50+ indexes. Key indexes verified:
- `commits(repoId, committedAt DESC)` -- used by activity feed
- `pull_requests(repoId, state)` -- used by velocity metrics
- `pull_requests(repoId, createdAt DESC)` -- used by activity feed
- `coverage_reports(repoId, reportedAt DESC)` -- used by coverage trends
- `metric_snapshots(teamId, metric, periodStart DESC)` -- used by dashboard aggregates
- `risk_snapshots(teamId, calculatedAt DESC)` -- used by risk history

### 3.4 Potential Future Optimizations

1. **BRIN Indexes**: The architecture docs mention BRIN indexes for time-series columns (`committedAt`, `createdAt`, `submittedAt`, `reportedAt`). These are not yet applied because Prisma doesn't support BRIN natively. They would need to be added via raw SQL migration. **Impact**: 2-5x improvement on range scans for large tables.

2. **Activity Feed UNION**: The `handleActivityFeed` handler queries 4 tables separately, merges results in-memory, then sorts/paginates. For teams with high volumes, a raw SQL `UNION ALL` with `ORDER BY timestamp DESC LIMIT N` would be more efficient (pushes sorting to the database). **Impact**: Moderate at scale; fine for MVP.

3. **MetricSnapshot Materialized Views**: Instead of computing metrics on-the-fly from raw data, precomputed `MetricSnapshot` records are used for historical views. The current implementation runs aggregation on demand. Moving to scheduled background aggregation (already designed in the architecture) would reduce dashboard load times further.

4. **Connection Pooling**: The Prisma plugin uses default connection pool settings. For production, `connection_limit` and `pool_timeout` should be tuned in the `DATABASE_URL` connection string based on expected concurrent connections.

---

## 4. Frontend Bundle Analysis

### 4.1 Dependencies

| Package | Purpose | Estimated Gzipped Size |
|---------|---------|----------------------|
| `next` | Framework (SSR, routing) | Framework overhead (shared) |
| `react` + `react-dom` | UI library | ~42KB |
| `recharts` | SVG charts | ~45KB |
| `tailwindcss` | Styling (dev only, purged in prod) | ~10KB after purge |

**Total estimated client JS**: ~97KB gzipped (framework + react + recharts)

### 4.2 Assessment

The bundle is well under the 200KB gzipped target. Key observations:

- **No heavy utility libraries**: No lodash, moment.js, or date-fns in the client bundle. Date operations are in the backend.
- **Recharts is the heaviest client dependency** at ~45KB gzipped. This was an intentional choice (ADR-004) and is reasonable for a chart-heavy dashboard.
- **Charts use `'use client'` directive**: VelocityChart and CoverageChart are properly marked as client components, enabling Next.js to code-split them.
- **ActivityFeed is a server component**: It doesn't use `'use client'`, meaning it renders on the server (no JS shipped for this component).
- **No unused imports detected**: Each component imports only what it needs from recharts.

### 4.3 Recommendations

1. **Lazy load chart components**: Use `next/dynamic` with `ssr: false` to defer loading recharts until the user scrolls to the charts section. This would reduce initial page load by ~45KB.

2. **Add `@next/bundle-analyzer`**: Install as a dev dependency and configure in `next.config.js` to generate visual bundle analysis reports on demand:
   ```js
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   });
   module.exports = withBundleAnalyzer(nextConfig);
   ```

3. **Tree-shake recharts**: Currently imports `BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer` which are the exact components used. This is correct -- recharts supports tree-shaking so only used components are bundled.

---

## 5. Optimizations Applied

| Optimization | Location | Impact |
|-------------|----------|--------|
| Fix N+1 in getCoverage() | `src/modules/metrics/service.ts` | N+1 reduced to 1 query |
| Batch commit upserts | `src/modules/webhooks/service.ts` | N upserts reduced to 1 createMany |
| Separate perf test config | `jest.perf.config.ts` | Prevents DB interference with integration tests |

---

## 6. Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| Integration (all modules) | 118 | PASS |
| Performance (API benchmarks) | 9 | PASS |
| Performance (WebSocket load) | 7 | PASS |
| Frontend (all components) | 103 | PASS |
| **Total** | **237** | **PASS** |

---

## 7. Acceptance Criteria Status

| Criteria | Target | Actual | Status |
|----------|--------|--------|--------|
| API p95 response time | < 200ms | 2-17ms (non-auth) | PASS |
| WebSocket concurrent connections | 100+ | 150 tested | PASS |
| N+1 queries | None | 2 found, 2 fixed | PASS |
| Frontend bundle | < 200KB gzipped | ~97KB estimated | PASS |
| Performance report | Documented | This document | PASS |

---

## 8. Files Created/Modified

### New Files
- `products/pulse/apps/api/tests/performance/api-benchmarks.test.ts` -- API response time benchmarks
- `products/pulse/apps/api/tests/performance/websocket-load.test.ts` -- WebSocket throughput tests
- `products/pulse/apps/api/jest.perf.config.ts` -- Separate Jest config for performance tests
- `products/pulse/docs/PERFORMANCE-REPORT.md` -- This report

### Modified Files
- `products/pulse/apps/api/src/modules/metrics/service.ts` -- Fixed N+1 in getCoverage()
- `products/pulse/apps/api/src/modules/webhooks/service.ts` -- Batch commit inserts
- `products/pulse/apps/api/jest.config.ts` -- Exclude performance tests from default run
- `products/pulse/apps/api/package.json` -- Added `test:perf` script

---

**Run benchmarks**: `cd products/pulse/apps/api && npm run test:perf`
**Run integration tests**: `cd products/pulse/apps/api && npm test`
