# Pulse Performance Review (PERF-01)

## Task
Performance audit of the Pulse backend and frontend.

## Key Findings

### N+1 Query Patterns
1. **MetricsService.getCoverage()** - Loops over repos and issues a separate `coverageReport.findMany` for each repo. This is an N+1 pattern. Should use a single query with `groupBy` or `IN` clause.
2. **handleActivityFeed()** - Issues 4 separate queries (commits, PRs, reviews, deployments) then merges in-memory. Each includes a `repository` relation. Not strictly N+1 but could benefit from a UNION-like approach or limiting per-table queries better.

### Webhook Processing
3. **WebhookService.processPushEvent()** - Sequential upsert loop for commits. Should use `createMany` with `skipDuplicates` for bulk inserts when possible, falling back to individual upserts only on conflict.

### Database Schema - Good
- 50+ indexes already defined in Prisma schema, including composite indexes
- BRIN indexes mentioned in architecture docs (not yet applied in schema - they'd need raw SQL migrations)
- Proper `@@unique` constraints prevent duplicates at DB level

### WebSocket Architecture - Good
- ConnectionManager with heartbeat/timeout cleanup
- Backpressure handling (bufferedAmount check)
- Room-based pub/sub via Redis
- Clean separation of concerns

### Frontend Bundle
- Dependencies are minimal: Next.js, React, Recharts, Tailwind
- Recharts (~45KB gzipped) is the heaviest client-side dep
- No unnecessary large libs (no moment.js, lodash, etc.)
- Charts are `'use client'` components (proper code splitting)

## Optimizations Applied
1. WebhookService.processPushEvent() - batch upsert with createMany + skipDuplicates, fallback to individual upserts
2. MetricsService.getCoverage() - single batched query instead of N+1 per-repo queries

## Performance Test Files Created
- `products/pulse/apps/api/tests/performance/api-benchmarks.test.ts`
- `products/pulse/apps/api/tests/performance/websocket-load.test.ts`
