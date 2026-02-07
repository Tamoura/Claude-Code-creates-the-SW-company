# ADR-005: Real-Time Caching Strategy

## Status
Accepted

## Date
2026-02-07

## Context

Pulse has two conflicting performance requirements: fast dashboard loads (<2 seconds on 3G, NFR-01) and fresh data (activity within 10 seconds of GitHub events, NFR-03). Computing metrics directly from raw event tables on every request would be slow (joins across commits, PRs, deployments). Serving purely cached data would be stale.

Additionally, Pulse uses WebSocket for real-time broadcasting. If we scale to multiple server instances, WebSocket connections on different instances need to share event broadcasts.

**Requirements**:
- Dashboard loads in <2 seconds (cached aggregates)
- Activity feed updates within 10 seconds (real-time via WebSocket)
- API response time p95 < 200ms (NFR-02)
- Support 500+ concurrent WebSocket connections (NFR-05)
- Handle horizontal scaling in the future (multiple API instances)
- Rate limit enforcement across instances

**Key Question**: What caching and real-time infrastructure should we use?

## Alternatives Considered

### Option A: No Cache (Direct DB Queries)
- **Pros**: Simplest implementation, always fresh data, no cache invalidation complexity.
- **Cons**: Dashboard queries would require complex aggregations on every request. With 90 days of commit/PR data across multiple repos, velocity and quality metric queries would take 500ms-2s. Unacceptable for <200ms p95 target.

### Option B: Application-Level Cache (In-Memory Map)
- **Pros**: Zero external dependencies, fast reads (~1ms), simple to implement.
- **Cons**: Lost on server restart, not shared across instances, no pub/sub for WebSocket broadcasting, memory pressure on large datasets, no TTL management.

### Option C: Redis for Everything (Cache + Pub/Sub + Rate Limiting + WebSocket State)
- **Pros**: Single external dependency serves four purposes: metric caching, pub/sub for real-time broadcasting, rate limit counters, and WebSocket room state. Redis is mature, fast (sub-millisecond reads), supports TTL natively, and has built-in pub/sub. ConnectSW already uses Redis for the stablecoin-gateway (production-tested plugin available in Component Registry).
- **Cons**: Adds an external dependency (Redis 7.x), requires deployment and monitoring, single point of failure if not replicated.

### Option D: Redis for Cache + Separate Message Broker (e.g., RabbitMQ/Kafka)
- **Pros**: Dedicated message broker is more feature-rich (acknowledgements, durability, replay).
- **Cons**: Two external dependencies instead of one. Overkill for Pulse's scale. Message brokers add operational complexity. Redis pub/sub is sufficient for our fire-and-forget broadcasting pattern.

## Decision

We choose **Redis for everything** (Option C) using a single Redis 7.x instance serving four purposes: metric caching, pub/sub event broadcasting, rate limit counters, and WebSocket room state.

## Rationale

1. **Single dependency, four purposes**: Instead of adding separate systems for caching, messaging, rate limiting, and session state, a single Redis instance covers all four. This minimizes operational overhead.

2. **Proven pattern from Component Registry**: The stablecoin-gateway uses Redis for caching and rate limiting with the `Redis Plugin` and `Redis Rate Limit Store` (both production-grade). We copy and adapt these components.

3. **Sub-millisecond reads**: Redis stores metric snapshots in memory. Dashboard queries hit Redis first (cache hit: <1ms) and fall back to PostgreSQL only on cache miss. This easily meets the <200ms p95 target.

4. **Native pub/sub for WebSocket**: Redis pub/sub is the standard pattern for broadcasting events to multiple WebSocket server instances. When a webhook arrives, the handler publishes to `events:team:{id}` on Redis. All server instances subscribed to that channel receive the event and forward it to their local WebSocket connections.

5. **Graceful degradation**: If Redis is unavailable, the system degrades gracefully:
   - Caching: Falls back to direct DB queries (slower but functional)
   - Pub/sub: WebSocket broadcasting limited to local instance only
   - Rate limiting: Falls back to in-memory rate limiting (per-instance, not distributed)
   - Room state: In-memory room tracking (already the primary mechanism; Redis is the backup for scaling)

6. **Future horizontal scaling**: When we need multiple API instances behind a load balancer, Redis pub/sub ensures all instances receive all events. Without Redis, WebSocket clients connected to instance A would miss events processed by instance B.

## Cache Architecture

### Cache Layers

| Cache Key Pattern | TTL | Source | Invalidation |
|-------------------|-----|--------|-------------|
| `pulse:metrics:velocity:{teamId}:{range}` | 5 min | Metric aggregation job | Job completion |
| `pulse:metrics:quality:{teamId}:{range}` | 5 min | Metric aggregation job | Job completion |
| `pulse:risk:{teamId}` | Until next calc | Risk calculation job | Job completion |
| `pulse:repos:available:{userId}` | 10 min | GitHub API call | Repo connect/disconnect |
| `pulse:repos:sync:{repoId}` | Session | Ingestion worker | Ingestion complete |
| `pulse:rate:{type}:{identifier}` | Window | Rate limit plugin | Auto-expire |

### Pub/Sub Channels

| Channel | Publishers | Subscribers | Message |
|---------|-----------|-------------|---------|
| `pulse:events:team:{teamId}` | Webhook handler | WebSocket server | Activity event JSON |
| `pulse:events:repo:{repoId}` | Webhook handler | WebSocket server | Repo-specific event |
| `pulse:alerts:team:{teamId}` | Anomaly detector | WebSocket server | Anomaly alert JSON |
| `pulse:sync:repo:{repoId}` | Ingestion worker | WebSocket server | Sync progress update |

### Data Flow: Cache Hit

```
Client -> API -> Redis (cache hit) -> Return cached data (<5ms)
```

### Data Flow: Cache Miss

```
Client -> API -> Redis (cache miss) -> PostgreSQL query -> Write to Redis -> Return data (<200ms)
```

### Data Flow: Real-Time Broadcast

```
GitHub Webhook -> API -> PostgreSQL (store) -> Redis PUBLISH -> WebSocket Server -> Clients
```

## Consequences

### Positive
- Dashboard loads in <2s using cached aggregates
- API p95 <200ms with cache hits
- Real-time broadcasting works across multiple instances
- Rate limiting is distributed
- Single external dependency (Redis) serves four purposes
- Component Registry provides production-tested Redis plugin

### Negative
- Redis is an additional service to deploy and monitor
- Redis pub/sub is fire-and-forget (no message persistence or acknowledgement)
- Cache invalidation requires careful coordination with background jobs
- Memory usage scales with number of teams and time ranges cached

### Risks
- Redis failure: Mitigated by graceful degradation to direct DB queries
- Memory exhaustion: Mitigated by TTL on all keys and key prefix namespacing
- Pub/sub message loss: Acceptable for real-time feeds (clients can refresh; backfill on reconnect handles gaps)

## Configuration

```
REDIS_URL=redis://localhost:6379
REDIS_TLS=false                    # true in production
REDIS_PASSWORD=                    # set in production
```

## Implementation Notes

- Copy `Redis Plugin` from Component Registry (stablecoin-gateway)
- Copy `Redis Rate Limit Store` from Component Registry
- All cache keys prefixed with `pulse:` to avoid conflicts with other ConnectSW products sharing the same Redis instance
- TTL enforcement via `EX` option on `SET` commands
- Pub/sub uses separate Redis connection (pub/sub mode blocks the connection for subscriptions)
- Monitor Redis memory with `INFO memory` command exposed via health endpoint
