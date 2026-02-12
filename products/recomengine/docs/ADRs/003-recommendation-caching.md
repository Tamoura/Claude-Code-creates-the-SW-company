# ADR-003: Recommendation Caching

**Status**: Accepted
**Date**: 2026-02-12
**Deciders**: Architect
**Product**: RecomEngine

---

## Context

The recommendation API must respond in <100ms at p95. Recommendation computation involves:
1. Looking up the user's behavioral history (database query)
2. Executing the selected strategy (collaborative filtering, content-based, trending, or frequently-bought-together)
3. Filtering results (exclude unavailable products, already-purchased items)
4. Ranking and scoring

Without caching, steps 1-4 take 50-200ms depending on the strategy and data volume. To meet the <100ms p95 target, we need a caching layer.

We need to decide:
- What to cache (full recommendation responses vs. intermediate computation results)
- Where to cache (in-process memory vs. Redis vs. CDN)
- Cache key design (how to partition cached data)
- TTL strategy (how long to cache before recomputing)
- Invalidation strategy (when to evict cached data)

## Decision

We will use **Redis** as the primary recommendation cache with the following strategy:

### Cache key patterns

| Key | Value | TTL | Use Case |
|-----|-------|-----|----------|
| `reco:{tenantId}:{userId}:{strategy}` | JSON array of `{productId, score, reason}` | 5 min | Per-user recommendations |
| `reco:trending:{tenantId}` | JSON array of `{productId, velocity}` | 15 min | Trending products (shared across all users) |
| `reco:fbt:{tenantId}:{productId}` | JSON array of `{productId, cooccurrence}` | 30 min | Frequently bought together (per product) |
| `reco:catalog:{tenantId}:available` | Redis SET of available productIds | 10 min | Available product filter |
| `reco:widget:{tenantId}:{placementId}` | JSON widget config | 60 sec | Widget configuration |

### TTL rationale

- **5 minutes for user recommendations**: Balances freshness (user's recent behavior is reflected within 5 minutes) with cache hit rate. At 5,000 req/sec, a 5-minute TTL with 1,000 active users per tenant yields >95% cache hit rate.
- **15 minutes for trending**: Trending products change slowly (24-hour velocity window). 15-minute updates are sufficient.
- **30 minutes for frequently-bought-together**: Co-purchase patterns are stable; they only change when new purchase data arrives.
- **60 seconds for widget config**: Allows admin config changes to propagate quickly without excessive cache reads.

### Cache miss behavior

On cache miss:
1. Compute recommendations synchronously in the same request
2. Write result to Redis with TTL
3. Return result to the client

This synchronous fallback is acceptable because:
- Collaborative filtering reads from a pre-computed similarity matrix (refreshed every 15 minutes in-process)
- Content-based filtering uses pre-indexed catalog attributes
- Trending reads from Redis counters (always fast)
- Computation alone takes 50-80ms, within the 100ms budget

### Cache invalidation rules

| Trigger | Action |
|---------|--------|
| Catalog item updated or deleted | `DEL reco:catalog:{tenantId}:available` |
| Catalog item marked unavailable | `DEL reco:catalog:{tenantId}:available` + `DEL reco:{tenantId}:*:{strategy}` for affected strategies |
| Tenant default strategy changed | `DEL reco:{tenantId}:*` (clear all user caches for tenant) |
| Widget config saved | `DEL reco:widget:{tenantId}:{placementId}` |
| Experiment started/stopped | No invalidation needed (strategy resolved at request time, not cached in key) |

For tenant-wide invalidation (`DEL reco:{tenantId}:*`), we use Redis SCAN with a pattern match rather than KEYS to avoid blocking the Redis server.

### Redis failure handling

If Redis is unreachable:
1. All requests become cache misses (compute on every request)
2. Rate limiting falls back to in-process approximate counting (degraded but functional)
3. The system logs warnings and continues operating
4. This follows the ConnectSW Redis Plugin's graceful degradation pattern

## Consequences

### Positive

- **Meets performance target**: Cache hits return in <5ms (Redis round-trip). Even with 50% cache hit rate, the p95 latency stays well under 100ms.
- **Shared cache across API instances**: Unlike in-process caching, Redis is shared across all API instances. A recommendation computed by instance A is available to instance B.
- **Bounded memory**: Redis TTLs ensure stale data is automatically evicted. No manual memory management.
- **Existing infrastructure**: Redis is already in the stack for rate limiting and real-time counters. No additional dependency.
- **Simple key design**: Keys are human-readable and debuggable. Engineers can inspect cached recommendations with `redis-cli GET reco:tenant1:user1:collaborative`.

### Negative

- **Network round-trip**: Each cache check adds ~1ms network latency (Redis round-trip on the same host). In-process caching would be <0.01ms.
  - **Mitigation**: 1ms is negligible compared to the 100ms budget. The benefit of shared cache across instances outweighs this cost.
- **Cache staleness**: Users may see stale recommendations for up to 5 minutes after their behavior changes.
  - **Mitigation**: 5-minute staleness is acceptable for recommendation freshness. Users do not expect real-time recommendation updates within the same browsing session. The TTL is configurable per tenant for use cases requiring faster updates.
- **Redis as a critical dependency for performance**: Without Redis, every request requires full computation.
  - **Mitigation**: The system degrades gracefully (slower but functional). Redis has 99.99% uptime in managed deployments (ElastiCache, Redis Cloud). In development, the Redis Plugin handles disconnections gracefully.
- **Memory consumption**: At 1,000 tenants x 10,000 active users x 500 bytes per cached recommendation = ~5GB Redis memory for user recommendations alone.
  - **Mitigation**: The 5-minute TTL limits memory to only recently-active users. In practice, only ~10% of users are active at any time, reducing actual memory to ~500MB. Redis memory is monitored via the observability plugin.

### Neutral

- The caching strategy does not affect the recommendation computation logic itself. Strategies produce the same output regardless of whether the result is cached. This separation of concerns simplifies testing (strategies can be tested without Redis).

## Alternatives Considered

### In-process (Node.js) cache only

**Rejected because**:
- Not shared across API instances. Each instance maintains its own cache, leading to redundant computation and inconsistent responses.
- Memory is bounded by Node.js heap limit (~4GB). With 1,000 tenants, in-process cache would be undersized.
- Cache is lost on process restart (cold start penalty after deployments).

### CDN-level caching (Cloudflare, CloudFront)

**Rejected because**:
- Recommendations are personalized per user. CDN caching would require user-specific cache keys, which most CDNs do not support efficiently.
- SDK requests include API keys in headers, making CDN caching rules complex.
- Invalidation is slow and coarse-grained at the CDN level.
- **Exception**: The SDK JavaScript bundle itself IS served from CDN. Only the API responses are cached in Redis.

### Pre-computation pipeline (compute recommendations proactively)

**Considered for Phase 2**:
- Instead of caching on first request, pre-compute recommendations for all active users on a schedule (every 5 minutes).
- Pros: Eliminates cache misses entirely; all requests are cache hits.
- Cons: Wasteful for inactive users; requires a background worker infrastructure.
- **Decision**: Defer to Phase 2. The synchronous cache-miss fallback is fast enough for MVP. Pre-computation becomes valuable when the user base exceeds the point where cache misses cause noticeable p95 degradation.

### Write-through cache on event ingestion

**Rejected because**:
- Every event would trigger recommendation recomputation, which is expensive and unnecessary (most events do not meaningfully change recommendations).
- Adds latency to the event ingestion path (target: <50ms).
- The 5-minute TTL achieves a similar effect with much less computational overhead.

## References

- PRD NFR-001: Recommendation API <100ms p95
- PRD NFR-020: Cached results preferred over no data
- ConnectSW Redis Plugin documentation
- Redis documentation: Key expiration and eviction (https://redis.io/docs/manual/keyspace-notifications/)
