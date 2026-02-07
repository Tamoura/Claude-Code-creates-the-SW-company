# ADR-002: Radar Chart Score Calculation and Caching

## Status

Accepted

## Context

The 6-dimension radar chart is the central feature of Mu'aththir's dashboard. Each axis represents a dimension scored 0-100. The PRD defines the formula:

```
score = (observation_factor * 0.4) + (milestone_factor * 0.4) + (sentiment_factor * 0.2)
```

Where:
- `observation_factor` = min(observations_last_30_days, 10) / 10 * 100
- `milestone_factor` = milestones_achieved / milestones_total_for_age_band * 100
- `sentiment_factor` = positive_observations / total_observations_last_30_days * 100

The dashboard must load in <2 seconds (NFR-001) and score calculation must complete in <300ms server-side (NFR-005). This means we need an efficient strategy for computing and serving these scores.

There are three main approaches:

1. **Compute on every request**: Query observations and milestones, calculate scores live.
2. **Pre-calculate on write**: Whenever an observation or milestone changes, recalculate scores and store them.
3. **Compute on read with cache**: Calculate on first request, cache the result, invalidate on data changes.

## Decision

Use a **write-through PostgreSQL cache with staleness flag** (approach 3, hybrid of 2 and 3).

### How It Works

1. A `score_cache` table stores one row per child per dimension (max 6 rows per child).
2. Each row has a `stale` boolean flag (default `true`).
3. **On write** (observation create/update/delete, milestone mark/unmark): Set `stale = true` for all 6 dimensions of the affected child. This is a single, fast UPDATE query.
4. **On read** (dashboard scores request): Check the `score_cache` for the requested child.
   - If all 6 rows have `stale = false`: Return cached scores immediately. This is a single SELECT on an indexed table (~1ms).
   - If any row has `stale = true`: Recalculate all 6 scores, update the cache, set `stale = false`, and return.

### Score Calculation Queries

Recalculation requires exactly two queries:

**Query 1**: Observation aggregates (last 30 days)
```sql
SELECT
    dimension,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_count
FROM observations
WHERE child_id = $1
  AND deleted_at IS NULL
  AND observed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY dimension;
```

**Query 2**: Milestone progress
```sql
SELECT
    md.dimension,
    COUNT(md.id) as total,
    COUNT(cm.id) FILTER (WHERE cm.achieved = true) as achieved_count
FROM milestone_definitions md
LEFT JOIN child_milestones cm
    ON md.id = cm.milestone_id AND cm.child_id = $1
WHERE md.age_band = $2
GROUP BY md.dimension;
```

Both queries use existing indexes and complete in <10ms each for the expected data volumes (up to 500 observations per child, 240 milestones total).

### Score Calculator (Pure Function)

The actual score calculation is a pure, testable function:

```typescript
interface DimensionData {
  observationCount: number;
  positiveCount: number;
  milestonesAchieved: number;
  milestonesTotal: number;
}

function calculateDimensionScore(data: DimensionData): number {
  const { observationCount, positiveCount, milestonesAchieved, milestonesTotal } = data;

  // Observation factor: min(count, 10) / 10 * 100
  const observationFactor = (Math.min(observationCount, 10) / 10) * 100;

  // Milestone factor: achieved / total * 100
  const milestoneFactor = milestonesTotal > 0
    ? (milestonesAchieved / milestonesTotal) * 100
    : 0;

  // Sentiment factor: positive / total * 100
  const sentimentFactor = observationCount > 0
    ? (positiveCount / observationCount) * 100
    : 0;

  // Weighted score
  const score = (observationFactor * 0.4) + (milestoneFactor * 0.4) + (sentimentFactor * 0.2);

  return Math.round(score);
}
```

### Invalidation Points

The cache is invalidated (set `stale = true`) at these points:

| Event | Scope |
|-------|-------|
| Observation created | All 6 dimensions for the child |
| Observation updated (sentiment changed) | All 6 dimensions for the child |
| Observation deleted (soft) | All 6 dimensions for the child |
| Milestone marked as achieved | All 6 dimensions for the child |
| Milestone unmarked | All 6 dimensions for the child |

We invalidate all 6 dimensions (not just the affected one) because:
- It is a single UPDATE query regardless of scope
- The sentiment_factor for one dimension depends only on that dimension's observations, but invalidating all 6 is simpler and the recalculation cost is negligible

### Cache Initialization

When a child is first created, 6 `score_cache` rows are inserted with `score = 0, stale = false` (since there are no observations or milestones to calculate). This avoids a recalculation on the first dashboard load for a new child.

## Consequences

### Positive

- **Dashboard loads are fast**: Cache hit returns 6 rows from an indexed table (~1-3ms). Well under the 300ms target.
- **Writes are fast**: Invalidation is a single UPDATE query. No expensive aggregation on the write path.
- **Recalculation is bounded**: At most 2 queries + 6 multiplications. Completes in <50ms even with 500+ observations.
- **Simple infrastructure**: No Redis, no background workers. Pure PostgreSQL.
- **Testable**: The score calculator is a pure function that can be unit-tested independently.
- **Correct**: Staleness flag ensures the dashboard always shows scores that reflect the latest data, never stale numbers.

### Negative

- **6 extra rows per child**: At 100,000 children, this is 600,000 rows in `score_cache`. This is tiny for PostgreSQL but is worth noting.
- **First load after invalidation is slower**: When scores are stale, the dashboard request triggers recalculation (~50ms extra). This is still well under the 300ms target.
- **Race condition possibility**: If two concurrent requests both find stale scores, both will recalculate. This is harmless (both produce the same result) but wastes some CPU. At MVP scale, this is negligible.

### Neutral

- Moving to Redis-backed caching in the future is straightforward: replace the `score_cache` table reads/writes with Redis GET/SET, keep the same invalidation logic.

## Alternatives Considered

### 1. Compute on Every Request (No Cache)

**Pros**: Simplest to implement. Always accurate. No cache management.

**Cons**: Dashboard load requires 2 aggregation queries on every request. For a child with 500 observations, this takes ~10-30ms per query, totalling 20-60ms. This is within the 300ms target, but:
- Under load (5,000 concurrent users), uncached aggregation queries put unnecessary pressure on the database.
- As observation counts grow beyond 1,000, query time increases linearly.
- No room for future complexity (e.g., weighted trends, AI-enhanced scoring).

**Why rejected**: Works for MVP scale but does not scale. Adding a cache later is harder than building it in from the start.

### 2. Pre-Calculate on Write (Eager Recalculation)

**Pros**: Dashboard reads are always instant (no stale checks). Simplest read path.

**Cons**:
- Every observation create/update/delete triggers a full score recalculation. If a parent logs 5 observations in quick succession, that is 5 recalculations.
- Write latency increases: observation save goes from ~10ms to ~60ms (10ms write + 50ms recalculation).
- The PRD says observation save should complete in <500ms (NFR-002), so this is within budget, but it makes writes feel heavier for no user-visible benefit (the parent may not even visit the dashboard after logging).

**Why rejected**: Unnecessary work on writes. The staleness-flag approach avoids recalculation until someone actually looks at the dashboard.

### 3. Redis Cache with TTL

**Pros**: Sub-millisecond reads. TTL-based expiry is simple. Scales horizontally.

**Cons**:
- Adds Redis as an infrastructure dependency. For MVP, this is unnecessary complexity.
- TTL-based expiry means scores could be stale for the TTL duration (e.g., 5 minutes). The PRD says the radar chart should update "in real-time" when observations are logged (FR-020). A TTL of even 1 minute violates this expectation.
- Could use event-based invalidation instead of TTL, but then we are essentially building the same staleness-flag system in Redis instead of PostgreSQL.

**Why rejected**: Adds infrastructure complexity without meaningful benefit at MVP scale. PostgreSQL-based caching achieves the same performance characteristics for the expected user base. Redis can be adopted when user count exceeds 50,000.

## References

- PRD FR-019: Radar chart score formula
- PRD FR-020: Real-time radar chart updates
- PRD NFR-001: Dashboard loads in <2 seconds
- PRD NFR-005: Radar chart calculation in <300ms
- PRD NFR-020: Radar chart calculation is cacheable, invalidated on changes
