# ADR-002: Event Storage Strategy

**Status**: Accepted
**Date**: 2026-02-12
**Deciders**: Architect
**Product**: RecomEngine

---

## Context

Events are the highest-volume data in RecomEngine. The system ingests behavioral events (product views, clicks, add-to-cart, purchases, recommendation interactions) at a sustained rate of up to 10,000 events/second across all tenants.

Key requirements for event storage:
- **Write throughput**: Sustain 10,000 inserts/second aggregate
- **Read patterns**: Time-range queries scoped by `tenant_id` (analytics aggregation, recommendation model training)
- **Data volume**: 100M events/month = ~50GB/month at ~500 bytes/event
- **Retention**: Raw events retained 90 days; older data archived or aggregated
- **Query performance**: Analytics queries over 30-90 day ranges must complete in <500ms
- **Deduplication**: Events are idempotent on (tenant_id, user_id, event_type, product_id, timestamp)

We need to decide the storage engine and data organization strategy for the events table.

## Decision

We will use **PostgreSQL native range partitioning** on the `events` table, partitioned by month on the `created_at` column.

### Partition scheme

```sql
CREATE TABLE events (
    id         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    tenant_id  TEXT        NOT NULL,
    event_type event_type  NOT NULL,
    user_id    TEXT        NOT NULL,
    product_id TEXT        NOT NULL,
    session_id TEXT,
    metadata   JSONB       DEFAULT '{}'::jsonb,
    timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE events_2026_01 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE events_2026_02 PARTITION OF events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... created ahead of time by a scheduled function
```

### Indexes per partition

Each partition inherits the parent table's indexes:
- `(tenant_id, timestamp)` -- primary query pattern for analytics
- `(tenant_id, user_id, event_type)` -- user behavior lookups for recommendations
- `(tenant_id, product_id)` -- product-level analytics
- `(tenant_id, user_id, event_type, product_id, timestamp)` -- deduplication checks

### Partition management

- A PostgreSQL function `create_event_partition(date)` creates partitions on demand
- A scheduled job (pg_cron or application-level cron) creates partitions 3 months ahead
- Partitions older than 90 days are detached (not dropped) and can be archived to cheaper storage
- Detaching a partition is an O(1) metadata operation; it does not lock or move data

### Retention strategy

| Age | Action |
|-----|--------|
| 0-90 days | Raw events in active partitions (full query access) |
| 90 days | Daily aggregates computed and stored in `analytics_daily` |
| 90+ days | Partition detached from parent table; archived (pg_dump or S3) |
| 1 year | Archived partitions deleted unless compliance requires longer retention |

## Consequences

### Positive

- **No additional dependency**: PostgreSQL is already in the stack. No need to install, configure, or operate TimescaleDB, ClickHouse, or another time-series database.
- **Partition pruning**: The PostgreSQL query planner automatically skips partitions outside the queried date range. A 30-day analytics query on a table with 12 months of partitions only scans 1-2 partitions.
- **Efficient data lifecycle**: Detaching a 1-month partition is instant (metadata-only DDL). No DELETE statements, no vacuum overhead, no table bloat.
- **Index locality**: Each partition has its own B-tree indexes, sized to the partition's data. This keeps indexes in memory for recent partitions.
- **Prisma compatibility**: Prisma ORM works transparently with partitioned tables. Queries target the parent `events` table; PostgreSQL routes to the correct partition.
- **Backup granularity**: Individual partitions can be backed up or restored independently.

### Negative

- **Partition management overhead**: Partitions must be created ahead of time. If a partition does not exist for an incoming event's timestamp, the INSERT fails.
  - **Mitigation**: Scheduled function creates partitions 3 months ahead. The `create_event_partition()` function is idempotent and can be called as a fallback in the application code.
- **Unique constraint limitation**: PostgreSQL requires the partition key (`created_at`) to be part of any unique constraint. This means deduplication cannot use a simple UNIQUE constraint on `(tenant_id, user_id, event_type, product_id, timestamp)`.
  - **Mitigation**: Deduplication is handled at the application level using a Redis-backed check (24-hour TTL bloom filter) before INSERT. The database index on the dedup fields serves as a secondary check.
- **Cross-partition queries are slower**: Queries spanning many months (e.g., "all events for user X ever") scan multiple partitions.
  - **Mitigation**: Analytics uses pre-aggregated `analytics_daily` table for long-range queries. Recommendation model training queries are bounded to recent data (90 days max).

### Neutral

- Write throughput of 10,000 inserts/second is achievable on a single PostgreSQL instance with WAL and connection pooling (PgBouncer). If this becomes insufficient, options include: batch inserts, write-ahead Redis buffer, or partitioning writes across multiple PostgreSQL instances.

## Alternatives Considered

### TimescaleDB

**Rejected because**:
- Adds an external dependency (TimescaleDB extension must be installed on the PostgreSQL instance)
- Not all managed PostgreSQL providers support TimescaleDB (limits hosting options)
- The key features of TimescaleDB (automatic partitioning, compression, continuous aggregates) can be achieved with native PostgreSQL features at MVP scale
- The team has no production experience with TimescaleDB
- **Revisit trigger**: If event volume exceeds 1B events/month or if compression becomes critical for storage cost, TimescaleDB should be reconsidered

### ClickHouse

**Rejected because**:
- Entirely separate database engine requiring its own infrastructure, monitoring, and expertise
- Massive over-engineering for MVP scale (ClickHouse is designed for petabyte-scale analytics)
- Adds operational complexity: data must be synced from PostgreSQL or events must be dual-written
- Not part of the ConnectSW technology stack

### Unpartitioned PostgreSQL table

**Rejected because**:
- A single events table with 100M+ rows per month will suffer from index bloat and slow vacuum operations
- DELETE-based retention (purging old rows) causes table fragmentation and extended vacuuming
- Query performance degrades as the table grows (no partition pruning)
- Data lifecycle management (archival, backup) is coarser-grained

## References

- PostgreSQL Documentation: Table Partitioning (https://www.postgresql.org/docs/15/ddl-partitioning.html)
- PRD Section 11: Technical Constraints (event storage requirements)
- PRD Open Questions: "Should event storage use PostgreSQL partitioned tables or TimescaleDB?"
