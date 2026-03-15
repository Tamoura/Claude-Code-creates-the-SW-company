# Caching Patterns for Distributed Systems

Caching is the practice of storing frequently accessed data in a fast-access layer (typically in-memory) to reduce latency, lower database load, and improve throughput. It is simultaneously one of the most effective performance optimizations available and one of the most common sources of subtle, hard-to-debug data inconsistency bugs. For CTOs, the caching strategy you choose will define both your system's performance ceiling and the complexity of your consistency guarantees.

## Overview

A cache stores a subset of your data in a location that is faster to access than the primary data store. The five fundamental caching patterns differ in who is responsible for populating and updating the cache, and when those operations occur relative to reads and writes. Each pattern makes a different trade-off between consistency, latency, complexity, and write performance. There is no universally best pattern; the right choice depends on your read/write ratio, consistency requirements, and tolerance for stale data.

## When to Use / When NOT to Use

| Scenario | Caching Appropriate | Caching Inappropriate |
|---|---|---|
| Read-heavy workloads (>10:1 read/write ratio) | Yes | N/A |
| Data that changes every request (real-time stock prices) | No (or very short TTL) | Use streaming instead |
| Expensive database queries (joins, aggregations) | Yes | N/A |
| User session data | Yes (Redis is standard) | N/A |
| Financial transaction records | With extreme caution | Prefer direct reads for audit trails |
| Data with strict regulatory consistency (banking balances) | Generally no | Direct database reads |
| Static or semi-static reference data (country lists, configs) | Yes (long TTL, refresh-ahead) | N/A |
| Personalized per-user data with millions of users | Yes if access follows power law | No if access is uniform (low hit rate) |
| Early-stage products with low traffic | Usually no (premature optimization) | Optimize code/queries first |

## The Five Caching Patterns

### 1. Cache-Aside (Lazy Loading)

The application checks the cache before querying the database. On a cache miss, the application reads from the database, writes the result to the cache, and returns it. The cache is populated on demand.

```
Read: App -> Cache (hit?) -> return
       App -> Cache (miss) -> DB -> write to Cache -> return
Write: App -> DB (cache not updated; entry expires or is explicitly invalidated)
```

**Strengths**: only caches data that is actually requested (efficient memory use). Application has full control over what gets cached and when. Cache failure degrades to slower database reads, not outage.

**Weaknesses**: first request for any item always hits the database (cold start penalty). Risk of stale data if writes bypass the cache invalidation path. Every caller must implement the read-through logic (unless abstracted into a repository layer).

**Best for**: general-purpose caching for web applications. The most commonly used pattern.

### 2. Read-Through

Similar to cache-aside, but the cache itself is responsible for loading data from the database on a miss. The application always reads from the cache; the cache handles miss logic internally.

**Strengths**: simpler application code (no cache-miss logic). Consistent caching behavior across all callers. Easier to swap cache implementations.

**Weaknesses**: requires a cache that supports read-through (or a wrapper library). First request still hits the database. Cache must know how to query the database, coupling the cache layer to the data model.

**Best for**: when you want to abstract caching entirely from application code. Libraries like Caffeine (Java), django-cacheops (Python), or custom Prisma middleware enable this.

### 3. Write-Through

Every write goes to the cache first, and the cache synchronously writes to the database. The cache always contains the latest data because writes flow through it.

**Strengths**: cache is always consistent with the database (no stale reads). Reads never miss for recently written data. Simplifies read paths.

**Weaknesses**: write latency increases (two synchronous writes: cache + database). Every write populates the cache, even for data that may never be read (wasted memory). Not suitable for write-heavy workloads with low read rates.

**Best for**: systems where read-after-write consistency is critical and the dataset fits comfortably in cache memory. Often combined with read-through for a fully transparent cache layer.

### 4. Write-Behind (Write-Back)

The application writes to the cache, which acknowledges immediately. The cache asynchronously flushes writes to the database in batches. This decouples write latency from database performance.

**Strengths**: dramatically faster writes (in-memory only, database write is deferred). Enables write batching and coalescing (multiple writes to the same key become one database write). Absorbs traffic spikes without overwhelming the database.

**Weaknesses**: risk of data loss if the cache fails before flushing to the database. Complex failure handling and recovery. Harder to debug because the database state lags behind the cache. Not suitable for data that must be durably persisted immediately (e.g., financial transactions).

**Best for**: high-write-throughput scenarios where eventual persistence is acceptable. Analytics counters, activity feeds, view counts. Often backed by a WAL (write-ahead log) for crash recovery.

### 5. Refresh-Ahead

The cache proactively refreshes entries before they expire based on predicted access patterns. When a cached item is accessed and its TTL is within a refresh window (e.g., 80% expired), the cache triggers an asynchronous background reload.

**Strengths**: eliminates the latency spike on cache misses for frequently accessed data. Users never experience a cold-cache read. Maintains consistently fast reads for hot data.

**Weaknesses**: wastes resources refreshing data that may not be requested again. Requires predicting access patterns accurately. More complex to implement correctly. Can generate unnecessary database load if refresh predictions are wrong.

**Best for**: data with predictable, regular access patterns (e.g., product catalog pages, homepage data, leaderboards). Combined with cache-aside as a supplement for hot keys.

## Cache Invalidation Strategies

Phil Karlton's famous quote applies: "There are only two hard things in computer science: cache invalidation and naming things."

### TTL-Based Expiration

Set a time-to-live on every cached entry. After expiration, the entry is evicted and the next read goes to the database.

- **Short TTL (1-60 seconds)**: high consistency, higher database load. Good for frequently changing data.
- **Medium TTL (1-15 minutes)**: balanced. Good for API responses, session data.
- **Long TTL (1-24 hours)**: low database load, higher stale risk. Good for reference data, configs.

### Event-Driven Invalidation

When data changes, the write path publishes an event (via a message bus, database trigger, or CDC stream) that invalidates or updates the relevant cache entries.

**Strengths**: near-real-time consistency. No stale data window.
**Weaknesses**: requires an event infrastructure (Kafka, Redis Pub/Sub, Debezium CDC). Adds operational complexity.

### Versioned Keys

Append a version number to cache keys (`user:123:v7`). When data changes, increment the version. Old entries are never explicitly invalidated; they expire naturally via TTL. New reads use the new version key and miss the cache, triggering a fresh load.

**Strengths**: simple, no invalidation logic needed. Naturally handles race conditions.
**Weaknesses**: stale versions waste memory until TTL expires.

## Real-World Example: Meta's Cache Consistency at Scale

Meta (Facebook) published research on achieving 99.99999999% (ten nines) cache consistency across their Memcached and TAO caching layers. Their system serves billions of cache reads per second across geographically distributed datacenters.

Key techniques from their approach:

1. **Cache invalidation via database commit log**: every database write generates an invalidation event that is propagated to all caching tiers. This eliminates the race condition where a stale read repopulates the cache after an invalidation.

2. **Lease mechanism**: when a cache miss occurs, the cache issues a "lease" to the reader. If another write invalidates the entry before the reader fills it, the lease is revoked, preventing stale data from being written. This solved the thundering herd problem where many concurrent readers all miss and all query the database.

3. **Regional consistency**: cross-region cache invalidation uses an asynchronous pipeline with ordering guarantees. Reads within a region are consistent; cross-region reads may be slightly stale (bounded by replication lag).

The lesson for CTOs: cache consistency at scale is solvable, but it requires deliberate engineering. At most scales (under 10M users), TTL-based expiration with event-driven invalidation for critical paths is sufficient. (Source: Meta Engineering, "Scaling Memcache at Facebook," NSDI 2013; "Cache Made Consistent," VLDB 2022)

## Redis vs Memcached

| Dimension | Redis | Memcached |
|---|---|---|
| **Data structures** | Strings, hashes, lists, sets, sorted sets, streams, HyperLogLog | Strings only |
| **Persistence** | Optional (RDB snapshots, AOF log) | None (pure cache) |
| **Clustering** | Built-in (Redis Cluster, hash slots) | Client-side consistent hashing |
| **Pub/Sub** | Built-in | Not available |
| **Memory efficiency** | Less efficient for simple key-value (overhead from data structure metadata) | More efficient for simple key-value |
| **Multi-threading** | Single-threaded event loop (Redis 7 has I/O threads) | Multi-threaded |
| **Max value size** | 512 MB | 1 MB (default, configurable) |
| **Eviction policies** | 8 policies (LRU, LFU, random, TTL-based) | LRU only |
| **Use case** | Session store, message broker, leaderboards, rate limiting, general cache | Pure high-throughput caching |
| **Ecosystem** | Lua scripting, modules (RedisJSON, RediSearch, RedisTimeSeries) | Minimal |

**Decision**: Choose Redis unless you need maximum memory efficiency for simple string caching at extreme scale and have no need for data structures, persistence, or pub/sub. Redis is the default choice for 95% of use cases.

## TTL Strategy Guide

| Data Type | Recommended TTL | Rationale |
|---|---|---|
| User session tokens | 15-30 minutes | Security: limit exposure window |
| API response cache (public) | 60-300 seconds | Balance freshness and performance |
| Database query results | 30-120 seconds | Depends on write frequency |
| Static reference data (countries, currencies) | 24 hours | Rarely changes, high read frequency |
| Computed aggregations (dashboards) | 5-15 minutes | Expensive to compute, moderate staleness OK |
| Feature flags | 30-60 seconds | Need relatively fast propagation |
| DNS records | 300 seconds (standard) | Balance between propagation speed and DNS load |
| User profile data | 5-15 minutes | Changes infrequently, read often |

**Rule of thumb**: set TTL to the maximum staleness your users can tolerate. Then halve it for safety.

## Decision Framework

**Choose cache-aside** when you want maximum control, your read patterns are unpredictable, and you can tolerate occasional cold-cache latency. This is the right default for most applications.

**Choose read-through + write-through** when read-after-write consistency is critical and your cache library supports it. Good for systems where users immediately see their own writes.

**Choose write-behind** when write throughput is your bottleneck and you can tolerate eventual consistency with the database. Analytics, counters, and activity feeds are classic use cases.

**Choose refresh-ahead** as a supplement to cache-aside for your hottest data paths. Product catalogs, homepage content, and leaderboards benefit from proactive refresh.

**Do not cache** when data changes on every read, when the dataset is too large for the cache to hold a useful working set, when consistency requirements are absolute (audit logs, financial ledgers), or when the database is already fast enough.

## Common Mistakes

1. **Caching everything**: indiscriminate caching fills memory with data that is rarely re-accessed, evicting actually hot data. Cache only data with a high read/write ratio and significant access frequency.

2. **No cache-miss handling for thundering herds**: when a popular cache entry expires, hundreds of concurrent requests all miss and all hit the database simultaneously. Use a lock/lease mechanism or request coalescing (only one request fetches, others wait).

3. **Forgetting to invalidate on write**: updating the database without invalidating or updating the cache leads to serving stale data. Every write path must have a corresponding cache invalidation path.

4. **Using cache as the primary data store**: caches are not databases. They evict data under memory pressure. If your application breaks when the cache is cold (after a restart or failover), you have a cache dependency, not a cache optimization.

5. **Same TTL for everything**: a 5-minute TTL is wrong for both session tokens (too long for security) and reference data (too short, causing unnecessary database queries).

6. **Not monitoring hit rate**: a cache with a <80% hit rate is probably caching the wrong data or has TTLs that are too short. A hit rate >99% may indicate over-caching.

## Key Metrics to Track

| Metric | Target | Why It Matters |
|---|---|---|
| Cache hit rate | >90% (ideally >95%) | Below 80% suggests wrong data is cached |
| Cache miss latency (p99) | <50ms additional vs cached read | Measures the penalty users pay on misses |
| Eviction rate | Low and stable | Spikes indicate memory pressure |
| Memory utilization | <80% of allocated | Leave headroom for spikes |
| Key count and size distribution | Monitor trend | Detect unbounded growth |
| TTL distribution | No keys without TTL | Keys without TTL cause memory leaks |
| Stale read rate | Measure for critical paths | Business-dependent threshold |
| Cache fill time after cold start | <5 minutes for hot working set | Measures recovery speed |

## References

- Nishtala, R. et al. (2013). "Scaling Memcache at Facebook." NSDI 2013.
- Meta Engineering. "Cache Made Consistent: Meta's Cache Invalidation Solution." VLDB 2022.
- Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly Media. Chapter 5.
- Redis Documentation. "Redis data types and abstractions." https://redis.io/docs
- AWS ElastiCache Best Practices. https://docs.aws.amazon.com/AmazonElastiCache/
- Vaidya, M. (2023). "Caching Strategies and How to Choose the Right One." AWS Architecture Blog.
