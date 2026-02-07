# ADR-002: GitHub Data Ingestion Strategy

## Status
Accepted

## Date
2026-02-07

## Context

Pulse needs to ingest GitHub activity data (commits, pull requests, reviews, deployments) both historically (last 90 days on first connection) and in real-time (as events happen). GitHub provides two mechanisms for accessing this data: the REST API (polling) and webhooks (push-based).

**Requirements**:
- Real-time: Activity events visible within 10 seconds of occurring on GitHub (NFR-03)
- Historical: Last 90 days of data ingested on first repo connection (FR-03)
- Rate limits: Stay below 80% of GitHub's 5,000 requests/hour budget (NFR-06)
- Reliability: No lost events, even during server downtime or network issues
- Scale: Support organizations with 100+ repos and 10,000+ PRs per repo

**Key Constraints**:
- GitHub webhooks are fire-and-forget; if our server is down, events are lost
- GitHub REST API rate limit is 5,000 requests/hour per authenticated user
- Large orgs can have repos with 50,000+ commits, making full history ingestion expensive
- GitHub webhook delivery has no guaranteed order

## Alternatives Considered

### Option A: Webhooks Only
- **Pros**: Real-time delivery (subsecond), no polling overhead, no rate limit consumption for real-time data, simple server-side implementation.
- **Cons**: Events lost during server downtime, no historical data, webhook delivery is not guaranteed (GitHub retries 3 times then gives up), no way to backfill gaps.

### Option B: Polling Only
- **Pros**: Complete control over data retrieval, can fetch historical data, no webhook registration complexity, works without a public URL.
- **Cons**: High rate limit consumption (querying N repos every M minutes), 30-minute latency minimum to stay within rate limits, cannot meet 10-second freshness requirement.

### Option C: Webhooks + Polling Hybrid
- **Pros**: Real-time via webhooks, polling as failsafe for missed events, historical data via REST API, rate-limit-efficient (polling is infrequent and conditional), robust against server downtime.
- **Cons**: More complex implementation (two data paths), potential for duplicate events (needs deduplication), webhook registration management required.

## Decision

We choose **webhooks + polling hybrid** (Option C).

## Rationale

1. **Webhooks for real-time**: GitHub webhook delivery latency is typically <1 second. This easily meets our 10-second freshness requirement. Webhooks consume zero rate limit budget.

2. **Polling as failsafe**: A 30-minute polling cycle catches any events missed by webhooks (server downtime, webhook delivery failure, GitHub incidents). At 30-minute intervals with conditional requests (ETags), this consumes minimal rate limit budget.

3. **REST API for historical data**: The initial 90-day backfill requires the REST API. We prioritize recent data (last 30 days first) for immediate dashboard visibility, then backfill older data in the background.

4. **Deduplication via unique constraints**: Both webhooks and polling may produce the same event. We use `UNIQUE (repo_id, sha)` for commits, `UNIQUE (repo_id, github_id)` for PRs/deployments. Duplicate inserts are handled with `ON CONFLICT DO UPDATE` (upsert), which is idempotent.

5. **Rate limit safety**: With conditional requests (`If-None-Match` headers), unchanged data returns 304 and does not consume rate limit. Our polling budget for 50 repos at 30-minute intervals is approximately 100 requests/hour (2% of the 5,000 budget).

## Implementation Design

### Webhook Registration
When a user connects a repo, we register webhooks for these events:
- `push` (commit data)
- `pull_request` (PR lifecycle)
- `pull_request_review` (review submissions)
- `deployment` (deployment events)
- `deployment_status` (deployment status changes)
- `check_run` (CI/coverage data)

Each webhook uses a per-repo HMAC-SHA256 secret for signature verification.

### Webhook Processing Pipeline
```
GitHub POST -> Signature Verification -> Event Normalization -> Database Upsert
                                                             -> Redis Pub/Sub
                                                             -> WebSocket Broadcast
```

### Historical Data Ingestion
```
Phase 1 (High Priority): Last 30 days
  - Commits: GET /repos/{owner}/{repo}/commits?since=30d_ago&per_page=100
  - PRs: GET /repos/{owner}/{repo}/pulls?state=all&since=30d_ago&per_page=100
  - Deployments: GET /repos/{owner}/{repo}/deployments?per_page=100

Phase 2 (Background): Days 31-90
  - Same endpoints with older date ranges
  - Lower priority, pauses if rate limit < 20%
```

### Polling Failsafe
Every 30 minutes:
1. For each connected repo, fetch events since `last_polled_at`
2. Use `If-None-Match` header with stored ETag (304 = no new data, costs 0 quota)
3. Upsert any new events found
4. Update `last_polled_at` timestamp

### Rate Limit Management
- Track `X-RateLimit-Remaining` from every GitHub API response
- If remaining < 10% of limit: pause ingestion, set timer for reset window
- If remaining < 20%: reduce polling frequency to every 60 minutes
- If remaining > 80%: normal operation
- Use conditional requests (ETags) to minimize quota consumption

## Consequences

### Positive
- Real-time data via webhooks (subsecond latency)
- No data loss: polling catches webhook failures
- Rate-limit efficient: webhooks are free, polling uses <5% of budget
- Historical backfill provides immediate value on first connection

### Negative
- Must manage webhook registration lifecycle (create on connect, delete on disconnect)
- Must handle webhook signature verification per repo
- Must implement deduplication (upsert logic)
- Must handle webhook payload size (large push events can be truncated by GitHub)
- Need a publicly accessible URL for webhook delivery (or a tunnel in development)

### Risks
- GitHub API deprecation: Mitigated by abstracting GitHub calls behind a provider interface
- Webhook delivery delays during GitHub incidents: Mitigated by polling failsafe
- Rate limit exhaustion for very large orgs: Mitigated by token rotation strategy (future)
