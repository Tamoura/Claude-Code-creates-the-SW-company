# Pulse - Initial Migration Plan

**Version**: 1.0
**Last Updated**: 2026-02-07
**Author**: Data Engineer
**Migration Name**: `0001_initial_schema`

---

## 1. Overview

This document describes the initial database migration for Pulse. The migration creates all 18 tables, 12 enums, 50+ indexes, and 5 triggers required for the MVP. It is generated from the Prisma schema (managed by the Backend Engineer) and should match the design in `db-schema.sql`.

### Migration Identity

| Field | Value |
|-------|-------|
| Migration Name | `0001_initial_schema` |
| Database | `pulse_dev` (local), `pulse` (production) |
| PostgreSQL Version | 15+ |
| Prisma Version | 5.x |
| Estimated Execution Time | <5 seconds (empty database) |

---

## 2. Tables Created

### 2.1 Core Identity (3 tables)

| Table | Rows at Launch | Growth Rate |
|-------|---------------|-------------|
| users | 0 | ~10/month per team |
| teams | 0 | ~1/month |
| team_members | 0 | ~10/month per team |

### 2.2 Repository Data (5 tables)

| Table | Rows at Launch | Growth Rate | Notes |
|-------|---------------|-------------|-------|
| repositories | 0 | ~2/month per team | Slow growth |
| commits | 0 | **3,000-6,000/month per team** | Highest volume table |
| pull_requests | 0 | 200-400/month per team | Medium-high |
| reviews | 0 | 400-800/month per team | ~2x PRs |
| deployments | 0 | 100-200/month per team | Medium |

### 2.3 Computed Data (3 tables)

| Table | Rows at Launch | Growth Rate | Notes |
|-------|---------------|-------------|-------|
| coverage_reports | 0 | 200-400/month per team | 1 per merged PR |
| metric_snapshots | 0 | **~3,240/month per team** | Second highest volume |
| risk_snapshots | 0 | ~60/month per team | 3x/day on workdays |

### 2.4 Notifications (3 tables)

| Table | Rows at Launch | Growth Rate | Notes |
|-------|---------------|-------------|-------|
| notifications | 0 | ~500-1,000/month per team | 30-day retention |
| notification_preferences | 0 | ~1 per new user | Static |
| device_tokens | 0 | ~1 per device | Static |

### 2.5 Auth and Admin (4 tables)

| Table | Rows at Launch | Growth Rate | Notes |
|-------|---------------|-------------|-------|
| team_invitations | 0 | ~2/month per team | Low |
| refresh_tokens | 0 | ~30/month per team | One per login |
| audit_logs | 0 | **500-1,000/month per team** | Append-only |
| job_state | 5 (pre-seeded) | 0 | Static, updated in place |

---

## 3. High-Growth Tables

These tables will grow fastest and need the most attention for performance.

### 3.1 commits

**Why it grows fast**: Every git push creates 1+ commit rows. A team of 10 developers averaging 5 commits/day generates ~1,100 commits/month on weekdays alone.

**Mitigation strategies**:
1. BRIN index on `committed_at` (in initial migration)
2. Composite B-tree on `(repo_id, committed_at DESC)` for scoped queries
3. UNIQUE constraint on `(repo_id, sha)` prevents duplicate ingestion
4. **Future**: Monthly range partitioning when >5M rows (see Section 5)

### 3.2 metric_snapshots

**Why it grows fast**: 9 metric types * N repos * hourly computation = rapid accumulation. With 5 repos: 9 * 6 (5 repo-level + 1 team-level) * 24 hours * 30 days = ~38,880 rows/month.

**Mitigation strategies**:
1. Composite index on `(team_id, metric, period_start DESC)` for dashboard queries
2. Partial index on `repo_id` (WHERE NOT NULL) for repo-level queries
3. **Future**: Monthly range partitioning on `period_start`
4. **Future**: Downsampling old data (hourly -> daily after 12 months)

### 3.3 audit_logs

**Why it grows fast**: Append-only, never deleted. Every API mutation, login, and admin action creates a log entry.

**Mitigation strategies**:
1. B-tree index on `timestamp DESC` for recent entries
2. Composite index on `(resource_type, resource_id)` for resource-specific audit trails
3. **Future**: Quarterly range partitioning on `timestamp`
4. **Future**: Archive to cold storage (S3/R2) after 12 months

---

## 4. Migration Safety

### 4.1 Pre-Migration Checklist

- [ ] Verify PostgreSQL version >= 15
- [ ] Verify `pgcrypto` extension is available
- [ ] Backup database (if data exists)
- [ ] Verify sufficient disk space (initial schema is <1 MB)
- [ ] Verify Prisma CLI version matches project

### 4.2 Migration Execution

```bash
# Development
cd products/pulse/apps/api
npx prisma migrate dev --name initial_schema

# Production
npx prisma migrate deploy
```

### 4.3 Rollback Plan

Since this is the initial migration on an empty database, rollback is:

```bash
# Drop all tables and start over
npx prisma migrate reset
```

For future migrations, every UP migration must have a corresponding DOWN. Prisma does not auto-generate DOWN migrations, so we document them manually:

```sql
-- DOWN migration for 0001_initial_schema
-- WARNING: This drops ALL data. Only use for development.

DROP TABLE IF EXISTS job_state CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS team_invitations CASCADE;
DROP TABLE IF EXISTS device_tokens CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS risk_snapshots CASCADE;
DROP TABLE IF EXISTS metric_snapshots CASCADE;
DROP TABLE IF EXISTS coverage_reports CASCADE;
DROP TABLE IF EXISTS deployments CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS pull_requests CASCADE;
DROP TABLE IF EXISTS commits CASCADE;
DROP TABLE IF EXISTS repositories CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS risk_level;
DROP TYPE IF EXISTS device_platform;
DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS anomaly_severity;
DROP TYPE IF EXISTS anomaly_type;
DROP TYPE IF EXISTS metric_type;
DROP TYPE IF EXISTS deployment_environment;
DROP TYPE IF EXISTS deployment_status;
DROP TYPE IF EXISTS review_state;
DROP TYPE IF EXISTS pr_state;
DROP TYPE IF EXISTS sync_status;
DROP TYPE IF EXISTS user_role;

DROP FUNCTION IF EXISTS update_updated_at_column();
```

---

## 5. Future Partitioning Plan

### 5.1 Timeline

| Milestone | Trigger | Action |
|-----------|---------|--------|
| Launch | 0 rows | No partitioning. BRIN indexes sufficient. |
| Month 3 (50 teams) | ~750K commits | Monitor query performance. Prepare partition scripts. |
| Month 6 (100 teams) | ~3M commits | Execute commits partitioning if query latency >100ms. |
| Month 9 (150 teams) | ~5M+ commits, ~3M+ metric_snapshots | Partition metric_snapshots. |
| Month 12 (200 teams) | ~10M commits, ~1M+ audit_logs | Partition audit_logs (quarterly). |

### 5.2 Partition Creation Automation

When partitioning is needed, create a monthly cron job to auto-create next month's partition:

```sql
-- Run on 25th of each month to create next month's partition
DO $$
DECLARE
  next_month_start DATE := date_trunc('month', NOW() + INTERVAL '1 month');
  next_month_end DATE := date_trunc('month', NOW() + INTERVAL '2 months');
  partition_name TEXT := 'commits_' || to_char(next_month_start, 'YYYY_MM');
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF commits_partitioned
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, next_month_start, next_month_end
  );
END $$;
```

### 5.3 Migration Path (Non-Partitioned to Partitioned)

When ready to partition `commits`:

1. **Create partitioned table**: `commits_partitioned` with same schema
2. **Create partitions**: One per existing month + current + next month
3. **Copy data**: `INSERT INTO commits_partitioned SELECT * FROM commits`
4. **Swap tables**: Within a transaction, rename old table and new table
5. **Update Prisma schema**: Point to new table name
6. **Drop old table**: After verifying the swap is successful

This is a zero-downtime migration if done during low-traffic hours with proper locking.

---

## 6. Performance Monitoring

### 6.1 Key Queries to Monitor

These are the highest-frequency queries that must stay under 100ms:

| Query Pattern | Table(s) | Expected Index | Target Latency |
|--------------|----------|----------------|-----------------|
| Dashboard velocity chart | metric_snapshots | idx_metrics_team_metric_period | <50ms |
| Activity feed (latest 50) | commits, pull_requests | idx_commits_repo_date, idx_prs_repo_created | <30ms |
| Current risk score | risk_snapshots | idx_risk_latest | <10ms |
| Unread notification count | notifications | idx_notifications_user_unread | <10ms |
| Stalled PR detection | pull_requests | idx_prs_open_no_review | <50ms |

### 6.2 Monitoring Setup

Add these to the observability plugin:

```sql
-- Table sizes (run weekly)
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
       pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
       pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Slow query log threshold
ALTER DATABASE pulse_dev SET log_min_duration_statement = 100;
```

---

**Created by**: Data Engineer
**Last Updated**: 2026-02-07
**Status**: Complete
