# Rate Limiting Strategies for APIs

Rate limiting is the practice of controlling the number of requests a client can make to your API within a given time window. It protects your infrastructure from abuse, ensures fair access across users, prevents cascading failures during traffic spikes, and is a fundamental component of any production API. For CTOs, rate limiting is not optional; it is a reliability and security requirement that must be designed into your system from day one.

## Overview

A rate limiter tracks request counts per client (identified by API key, user ID, IP address, or a combination) and rejects requests that exceed a defined threshold. Rejected requests receive an HTTP 429 (Too Many Requests) response with headers indicating when the client can retry. The choice of algorithm affects how strictly the limit is enforced, how bursty traffic is handled, and how complex the implementation becomes. In distributed systems, rate limiters must coordinate state across multiple application instances, typically using Redis as the shared counter store.

## When to Use / When NOT to Use

| Scenario | Rate Limiting Needed | Alternative |
|---|---|---|
| Public API endpoints | Yes (always) | N/A |
| Authentication endpoints (login, password reset) | Yes (strict, per-IP) | N/A |
| Internal service-to-service calls in a trusted network | Usually no | Circuit breakers, backpressure |
| Webhook receivers from third-party services | Yes (protect against misbehaving senders) | Queue with bounded processing rate |
| Static asset serving (CDN) | No (CDN handles this) | CDN-level throttling |
| GraphQL APIs | Yes (but use query cost analysis, not request count) | Depth/complexity limits |
| Real-time streaming (WebSocket, SSE) | Yes (connection rate + message rate) | Backpressure protocols |
| Admin/internal tooling with few users | Low priority | Basic auth is usually sufficient protection |
| Free tier vs paid tier differentiation | Yes (different limits per plan) | N/A |

## Rate Limiting Algorithms

### 1. Fixed Window Counter

Divide time into fixed intervals (e.g., 1-minute windows). Count requests per client in each window. Reject when the count exceeds the limit. Reset the counter at the start of each window.

**How it works**: If the limit is 100 requests per minute and the window starts at 12:00:00, a client can make 100 requests between 12:00:00 and 12:00:59. At 12:01:00, the counter resets.

**Strengths**: simple to implement, low memory (one counter per client per window), easy to reason about.

**Weaknesses**: vulnerable to the "boundary burst" problem. A client can make 100 requests at 12:00:55 and 100 more at 12:01:00 (5 seconds later), effectively making 200 requests in 10 seconds while never exceeding the 100/minute limit in any single window. This can overwhelm backends.

**Best for**: simple APIs where exact enforcement precision is not critical. Good starting point for internal tools.

### 2. Sliding Window Log

Store a timestamp for every request in a sorted set (per client). To check the limit, count entries within the last N seconds and reject if the count exceeds the threshold. Remove expired entries.

**How it works**: for a 100 requests/minute limit, on each request, count all timestamps in the last 60 seconds. If count >= 100, reject.

**Strengths**: perfectly accurate. No boundary burst problem. Smooth enforcement.

**Weaknesses**: high memory usage (stores every request timestamp). Expensive computation on every request (counting entries in a time range). Does not scale well for high-throughput APIs.

**Best for**: low-volume, high-value APIs where accuracy matters more than performance (e.g., billing APIs, admin operations).

### 3. Sliding Window Counter

A hybrid of fixed window and sliding log. Maintains counters for the current and previous fixed windows. Estimates the request count in the current sliding window by weighting the previous window's count by the fraction of time elapsed.

**How it works**: if you are 30 seconds into the current 1-minute window, the estimated count is: `previous_window_count * 0.5 + current_window_count`. This approximates a true sliding window with the memory efficiency of fixed counters.

**Strengths**: nearly as accurate as the sliding log with the memory efficiency of fixed windows. Eliminates most of the boundary burst problem. Used by Cloudflare in production.

**Weaknesses**: still an approximation. Slightly more complex to implement than fixed window. Not perfectly smooth at window boundaries.

**Best for**: most production APIs. The best general-purpose algorithm. Recommended default for teams implementing rate limiting for the first time.

### 4. Token Bucket

Each client has a "bucket" that holds tokens. The bucket is refilled at a constant rate (e.g., 10 tokens per second). Each request consumes one token. If the bucket is empty, the request is rejected. The bucket has a maximum capacity, allowing short bursts up to that capacity.

**How it works**: bucket capacity = 100, refill rate = 10/second. A client can burst up to 100 requests instantly, then sustain 10/second. If they stop, the bucket refills over 10 seconds.

**Strengths**: allows controlled bursting (important for real-world traffic patterns where clients send batches). Simple mental model. Two tunable parameters (bucket size for burst, refill rate for sustained rate). Used by AWS API Gateway and many cloud providers.

**Weaknesses**: requires tracking last-checked time and token count per client. Burst capacity can be surprising to clients who do not understand the model. Can be exploited if burst size is too large.

**Best for**: APIs where you want to allow short bursts (mobile clients that batch requests, web apps with page-load request clusters). Most user-facing APIs benefit from some burst tolerance.

### 5. Leaky Bucket

Requests enter a queue (the "bucket") and are processed at a fixed rate. If the queue is full, new requests are rejected. Unlike token bucket, leaky bucket enforces a perfectly smooth output rate.

**How it works**: requests are enqueued and processed at exactly N per second. The queue has a maximum depth. If the queue is full, incoming requests are dropped (429).

**Strengths**: perfectly smooth request rate. Protects backends from any traffic spikes. Predictable load.

**Weaknesses**: adds latency (requests wait in the queue). Burst traffic is queued, not served immediately, which may frustrate users. More complex to implement correctly in distributed systems. Does not distinguish between "a little over the limit" and "massively over the limit."

**Best for**: systems where backend protection matters more than client experience. Background job processing, webhook delivery, email sending. Not ideal for interactive user-facing APIs.

## Real-World Example: Stripe's Rate Limiting

Stripe, one of the most respected API providers, uses a multi-tiered rate limiting approach:

1. **Per-API-key limits**: each API key (tied to a Stripe account) gets a rate limit based on account tier. Live-mode keys have higher limits than test-mode keys.

2. **Per-endpoint limits**: some endpoints have tighter limits (e.g., creating charges vs listing charges) because they have higher backend cost.

3. **Adaptive rate limiting**: Stripe adjusts limits based on system load. During an incident, limits may be tightened to protect critical payment processing paths. During normal operation, limits are generous.

4. **Load shedding**: when the system is under extreme load, Stripe sheds traffic intelligently. Lower-priority requests (analytics, non-critical reads) are shed first. Payment processing is shed last.

5. **Response headers**: Stripe returns `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers on every response, giving clients full visibility into their usage.

Stripe has published that this system processes millions of API requests per minute while maintaining their SLA. They explicitly recommend exponential backoff with jitter for clients that receive 429s, and their client libraries implement this by default. (Source: Stripe Engineering Blog, "Rate limiters and load shedders," 2017)

## Per-User vs Per-Endpoint vs Per-IP

| Strategy | When to Use | Caveat |
|---|---|---|
| **Per-user (API key / auth token)** | Authenticated APIs. Most accurate for fair usage. | Requires authentication before rate limiting. Unauthenticated endpoints need a fallback. |
| **Per-IP** | Unauthenticated endpoints (login page, registration). Simple to implement. | Breaks behind NATs and proxies (shared IPs). Spoofable with rotating IPs. |
| **Per-endpoint** | Protect expensive operations (search, exports, report generation). | Clients may hit limits on one endpoint while having capacity on others. Combine with per-user. |
| **Per-tenant (multi-tenant SaaS)** | Prevent one tenant from degrading service for others ("noisy neighbor"). | Must be combined with per-user within the tenant. |
| **Global** | Protect overall system capacity during extreme events. | Crude; unfairly impacts low-volume clients. Use as a last resort. |

**Recommended approach**: layer multiple strategies. Per-user limits for fairness, per-endpoint limits for expensive operations, and a global safety limit for system protection.

## Distributed Rate Limiting with Redis

In a horizontally scaled deployment, each application instance must share rate limit state. Redis is the standard solution.

### Implementation Pattern (Sliding Window Counter with Redis)

The core operation must be atomic. Use a Redis Lua script or `MULTI/EXEC` transaction:

1. **Key**: `ratelimit:{client_id}:{window_id}` (e.g., `ratelimit:user123:1710499200`)
2. **INCR** the key (atomically increment)
3. **EXPIRE** the key with TTL = window_size (so counters self-clean)
4. If the count exceeds the limit, reject

For the sliding window counter variant, maintain two keys (current window and previous window) and compute the weighted sum.

### Redis Considerations

- **Latency**: Redis operations add 0.5-2ms per request. At very high throughput, this matters. Consider local in-memory pre-checks that fast-reject obvious violations before hitting Redis.
- **Failure mode**: if Redis is unavailable, decide your policy. Options: fail open (allow all requests, log an alert), fail closed (reject all requests), or fall back to local in-memory rate limiting (less accurate but better than nothing).
- **Cluster mode**: for very high throughput (>100K rate limit checks/second), use Redis Cluster with hash tags to ensure related keys land on the same shard.
- **Memory**: each rate limit key is tiny (~100 bytes). Even with 1M unique clients, rate limit data uses <100MB of Redis memory.

## Response Headers and Client Communication

Rate limiting is only effective if clients know about it. Standard headers:

| Header | Description | Example |
|---|---|---|
| `RateLimit-Limit` | Maximum requests allowed in the window | `100` |
| `RateLimit-Remaining` | Requests remaining in the current window | `47` |
| `RateLimit-Reset` | Unix timestamp when the window resets | `1710500400` |
| `Retry-After` | Seconds until the client should retry (on 429 response) | `30` |

### 429 Response Body

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Maximum 100 requests per minute.",
    "retryAfter": 30
  }
}
```

**Important**: always include `Retry-After` in 429 responses. Well-behaved clients use this to back off correctly. Without it, clients typically retry immediately, making the problem worse.

## Decision Framework

**Choose token bucket** when your API serves interactive clients (web, mobile) that naturally send requests in bursts (page loads, batch operations). This is the most client-friendly algorithm. Used by AWS, Google Cloud, and most cloud API providers.

**Choose sliding window counter** when you want accurate, fair enforcement without allowing bursts. Best general-purpose algorithm for APIs that need strict per-minute or per-hour limits.

**Choose fixed window** when simplicity matters more than precision. Good for internal APIs, admin tools, or as a starting point that you refine later.

**Choose leaky bucket** when you need to smooth traffic to protect a sensitive backend system. Good for outgoing webhooks, email sending, or job processing.

**Choose sliding window log** only for low-volume, high-value APIs where perfect accuracy justifies the memory and computation cost.

## Common Mistakes

1. **Rate limiting after authentication only**: unauthenticated endpoints (login, registration, password reset) are the most attacked endpoints. They need per-IP rate limiting. A login endpoint without rate limiting is an open invitation for credential stuffing.

2. **No response headers**: clients cannot self-regulate without visibility into their usage. Always include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers.

3. **Identical limits for all endpoints**: a lightweight GET /health and a heavy POST /reports/generate should not have the same limit. Expensive endpoints need tighter limits.

4. **Failing closed when Redis is down**: if your rate limiter's Redis goes down and you reject all requests, you have turned a cache failure into a total outage. Decide whether to fail open or use local fallback.

5. **Not testing rate limiting in staging**: rate limiting bugs are embarrassing when they block legitimate users in production. Load test your rate limiting logic with realistic traffic patterns.

6. **Counting retries against the limit**: if your rate limiter rejects a request and the client retries (as instructed by Retry-After), the retry counts against their limit. This creates a death spiral. Some systems exempt retries or use a separate retry budget.

7. **Rate limiting by IP in an IPv6 world**: clients may have entire /64 or /48 IPv6 prefixes, giving them billions of unique IPs to rotate through. Rate limit by prefix (/64 or /48), not individual IPv6 address.

## Key Metrics to Track

| Metric | Target | Why It Matters |
|---|---|---|
| 429 response rate | <1% of total requests | >5% means limits are too tight or a client is misbehaving |
| Rate limit Redis latency | <2ms (p99) | Higher latency adds overhead to every request |
| Unique clients hitting limits | Monitor trend | Sudden spikes suggest abuse or misconfigured clients |
| Requests allowed vs rejected ratio | Per endpoint, per client tier | Business input for adjusting limits |
| Redis availability for rate limiting | 99.99%+ | Rate limiting depends on Redis availability |
| Time to first 429 for new clients | Should never happen for normal usage | Indicates limits may be too restrictive |
| Retry-After compliance rate | High indicates well-behaved clients | Low indicates clients ignoring headers |

## References

- Stripe Engineering Blog. "Rate limiters and load shedders." (2017). https://stripe.com/blog/rate-limiters
- Cloudflare Blog. "How we built rate limiting capable of scaling to millions of domains." (2017). https://blog.cloudflare.com
- Google Cloud Architecture. "Rate-limiting strategies and techniques." https://cloud.google.com/architecture/rate-limiting-strategies-techniques
- IETF Draft. "RateLimit Header Fields for HTTP." draft-ietf-httpapi-ratelimit-headers. https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
- Kong Inc. "How to Design a Scalable Rate Limiting Algorithm." (2017). https://konghq.com/blog
- Redis Documentation. "Rate limiting pattern." https://redis.io/docs/manual/patterns/rate-limiting/
- Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly Media.
