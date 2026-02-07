# Pulse API Documentation

**Base URL**: `http://localhost:5003/api/v1`
**Production**: `https://api.pulse.dev/api/v1`

## Authentication

All endpoints except those marked as **Public** require a Bearer JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

Tokens are obtained via the `/auth/register` or `/auth/login` endpoints and have a 1-hour lifetime.

## Error Format

All errors follow [RFC 7807 Problem Details](https://datatracker.ietf.org/doc/html/rfc7807):

```json
{
  "type": "https://pulse.dev/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Repository with ID 'abc123' was not found."
}
```

Validation errors include field-level detail:

```json
{
  "type": "https://pulse.dev/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "Request validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email address" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

## Rate Limiting

| Scope | Limit | Window |
|-------|-------|--------|
| Auth endpoints | 10 requests | 1 minute per IP |
| General API | 100 requests | 1 minute per IP |
| Webhooks | 1000 requests | 1 minute |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 1707300000
```

---

## Health

### GET /health

**Public** -- no authentication required.

Returns the system health status including database and Redis connectivity.

**Response** `200 OK`:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**Response** `503 Service Unavailable` (when database is down):

```json
{
  "status": "unhealthy",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": "error",
    "redis": "ok"
  }
}
```

Status values: `ok`, `degraded` (Redis down but database up), `unhealthy` (database down).

---

## Auth

### POST /auth/register

**Public** -- create a new user account.

**Request body**:

```json
{
  "email": "alex@example.com",
  "password": "MyStr0ng!Pass",
  "name": "Alex Manager"
}
```

**Password requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Response** `201 Created`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1abc123",
    "email": "alex@example.com",
    "name": "Alex Manager",
    "githubUsername": null,
    "avatarUrl": null,
    "githubConnected": false,
    "createdAt": "2026-02-07T10:00:00.000Z"
  }
}
```

**Response** `409 Conflict` (email already registered):

```json
{
  "type": "https://pulse.dev/errors/conflict",
  "title": "Conflict",
  "status": 409,
  "detail": "Email already registered"
}
```

**Response** `422 Validation Error`:

```json
{
  "type": "https://pulse.dev/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "Request validation failed",
  "errors": [
    { "field": "password", "message": "Password must contain at least one special character" }
  ]
}
```

### POST /auth/login

**Public** -- authenticate with email and password.

**Request body**:

```json
{
  "email": "alex@example.com",
  "password": "MyStr0ng!Pass"
}
```

**Response** `200 OK`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1abc123",
    "email": "alex@example.com",
    "name": "Alex Manager",
    "githubUsername": "alex-dev",
    "avatarUrl": "https://avatars.githubusercontent.com/u/123",
    "githubConnected": true,
    "createdAt": "2026-02-07T10:00:00.000Z"
  }
}
```

**Response** `401 Unauthorized`:

```json
{
  "type": "https://pulse.dev/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid email or password"
}
```

### GET /auth/github

**Public** -- initiate the GitHub OAuth flow.

Redirects the user to GitHub's authorization page with the following scopes:
- `repo` -- full access to repositories (needed for webhooks and private repo data)
- `read:org` -- read organization membership
- `read:user` -- read user profile data

**Response** `302 Found`:

Redirects to `https://github.com/login/oauth/authorize?client_id=...&scope=repo+read:org+read:user`

**Response** `500 Internal Server Error` (GitHub OAuth not configured):

```json
{
  "type": "https://pulse.dev/errors/configuration-error",
  "title": "Configuration Error",
  "status": 500,
  "detail": "GitHub OAuth is not configured"
}
```

### GET /auth/github/callback

**Public** -- handle the GitHub OAuth callback.

**Query parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Authorization code from GitHub |
| `state` | string | No | State parameter for CSRF protection |

**Response** `200 OK`:

```json
{
  "message": "GitHub OAuth callback received",
  "code": "received"
}
```

Note: Full token exchange is implemented in production. The callback exchanges the authorization code for an access token, encrypts it with AES-256-GCM, and stores it in the database.

---

## Repositories

All repository endpoints require authentication.

### GET /repos

List connected repositories for a team.

**Query parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `teamId` | string | Yes | -- | Team ID |
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 20 | Results per page (max 100) |
| `syncStatus` | enum | No | -- | Filter by status: `idle`, `syncing`, `complete`, `error` |

**Response** `200 OK`:

```json
{
  "data": [
    {
      "id": "clx2def456",
      "githubId": 123456789,
      "name": "backend-api",
      "fullName": "acme/backend-api",
      "organization": "acme",
      "language": "TypeScript",
      "defaultBranch": "main",
      "isPrivate": false,
      "syncStatus": "complete",
      "syncProgress": 100,
      "lastActivityAt": "2026-02-07T09:30:00.000Z",
      "connectedAt": "2026-02-01T10:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

### GET /repos/available

List GitHub repositories available for connection. Requires the user to have a connected GitHub account with a valid token.

**Response** `200 OK`:

```json
{
  "data": [
    {
      "githubId": 123456789,
      "name": "backend-api",
      "fullName": "acme/backend-api",
      "organization": "acme",
      "language": "TypeScript",
      "defaultBranch": "main",
      "isPrivate": false,
      "lastPushAt": "2026-02-07T09:30:00.000Z"
    }
  ],
  "message": "GitHub API integration pending"
}
```

### POST /repos

Connect a new repository to a team for monitoring.

**Request body**:

```json
{
  "teamId": "clx1team123",
  "githubId": 123456789,
  "name": "backend-api",
  "fullName": "acme/backend-api",
  "organization": "acme",
  "language": "TypeScript",
  "defaultBranch": "main",
  "isPrivate": false
}
```

**Response** `201 Created`:

```json
{
  "id": "clx2def456",
  "githubId": 123456789,
  "name": "backend-api",
  "fullName": "acme/backend-api",
  "syncStatus": "syncing",
  "syncProgress": 0,
  "connectedAt": "2026-02-07T10:00:00.000Z"
}
```

Upon connection, the system:
1. Registers GitHub webhooks for `push`, `pull_request`, `deployment`, and `deployment_status` events
2. Begins background ingestion of the last 90 days of historical data
3. Most recent 30 days are loaded first for immediate visibility

### DELETE /repos/:id

Disconnect a repository. Historical data is retained for 30 days before deletion.

**Path parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Repository ID |

**Response** `200 OK`:

```json
{
  "id": "clx2def456",
  "name": "backend-api",
  "disconnectedAt": "2026-02-07T10:00:00.000Z",
  "message": "Repository disconnected. Data retained for 30 days."
}
```

### GET /repos/:id/sync-status

Check the ingestion/sync progress for a specific repository.

**Path parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Repository ID |

**Response** `200 OK`:

```json
{
  "id": "clx2def456",
  "name": "backend-api",
  "syncStatus": "syncing",
  "syncProgress": 67,
  "syncStartedAt": "2026-02-07T10:00:00.000Z",
  "syncCompletedAt": null,
  "syncError": null
}
```

Sync status values: `idle`, `syncing`, `complete`, `error`.

---

## Activity

### GET /activity

Authenticated. Returns a paginated activity feed combining commits, pull requests, reviews, and deployments sorted by timestamp (newest first).

**Query parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `cursor` | string | No | -- | ISO timestamp cursor for pagination |
| `limit` | integer | No | 20 | Results per page (1-100) |
| `repoId` | string | No | -- | Filter by repository ID |
| `teamId` | string | No | -- | Filter by team ID |
| `eventType` | enum | No | -- | Filter: `commit`, `pull_request`, `review`, `deployment` |
| `since` | datetime | No | -- | Only events after this ISO timestamp |
| `until` | datetime | No | -- | Only events before this ISO timestamp |

**Response** `200 OK`:

```json
{
  "items": [
    {
      "type": "pull_request",
      "repo": "acme/backend-api",
      "author": "priya-dev",
      "timestamp": "2026-02-07T10:30:00.000Z",
      "summary": "#142 Add user authentication middleware",
      "metadata": {
        "id": "clx3pr001",
        "number": 142,
        "state": "open"
      }
    },
    {
      "type": "commit",
      "repo": "acme/backend-api",
      "author": "jordan-dev",
      "timestamp": "2026-02-07T10:15:00.000Z",
      "summary": "feat(auth): implement JWT refresh token rotation",
      "metadata": {
        "id": "clx3cm001",
        "sha": "abc1234def5678"
      }
    },
    {
      "type": "review",
      "repo": "acme/backend-api",
      "author": "alex-lead",
      "timestamp": "2026-02-07T10:05:00.000Z",
      "summary": "approved review on #141",
      "metadata": {
        "id": "clx3rv001",
        "state": "approved"
      }
    },
    {
      "type": "deployment",
      "repo": "acme/backend-api",
      "author": "system",
      "timestamp": "2026-02-07T09:45:00.000Z",
      "summary": "production deployment: success",
      "metadata": {
        "id": "clx3dp001",
        "environment": "production",
        "status": "success"
      }
    }
  ],
  "cursor": "2026-02-07T09:45:00.000Z",
  "hasMore": true
}
```

**Pagination**: Use the `cursor` value from the response as the `cursor` query parameter for the next page. When `hasMore` is `false`, there are no more results.

### WebSocket: /activity/stream

Real-time activity streaming via WebSocket. See [WEBSOCKET.md](WEBSOCKET.md) for the full protocol specification.

**Connection URL**: `ws://localhost:5003/api/v1/activity/stream?token=<JWT>`

---

## Metrics

All metrics endpoints require authentication.

### GET /metrics/velocity

Team velocity metrics including PR merge rate, cycle time, and review time.

**Query parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `teamId` | string | Yes | -- | Team ID |
| `period` | enum | No | `30d` | Time range: `7d`, `30d`, `90d` |

**Response** `200 OK`:

```json
{
  "teamId": "clx1team123",
  "period": "30d",
  "prsMerged": {
    "total": 47,
    "weeklyBreakdown": [
      { "weekStart": "2026-01-13", "count": 12 },
      { "weekStart": "2026-01-20", "count": 15 },
      { "weekStart": "2026-01-27", "count": 11 },
      { "weekStart": "2026-02-03", "count": 9 }
    ],
    "byDeveloper": [
      { "username": "priya-dev", "count": 18 },
      { "username": "jordan-dev", "count": 15 },
      { "username": "alex-dev", "count": 14 }
    ]
  },
  "medianCycleTime": {
    "hours": 18.5,
    "trend": -2.3,
    "trendDirection": "down"
  },
  "medianReviewTime": {
    "hours": 4.2,
    "trend": 0.8,
    "trendDirection": "up"
  }
}
```

**Metric definitions**:
- **PRs Merged**: Count of PRs with `merged_at` in the period, attributed to the PR author
- **Median Cycle Time**: Median of `merged_at - created_at` for merged PRs (trailing 7-day window)
- **Median Review Time**: Median of `first_review_at - created_at` (excludes bot reviews)

### GET /metrics/coverage

Test coverage trends per repository.

**Query parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamId` | string | Yes | Team ID |
| `repoId` | string | No | Filter to a specific repository |

**Response** `200 OK`:

```json
{
  "teamId": "clx1team123",
  "repos": [
    {
      "repoId": "clx2def456",
      "repoName": "backend-api",
      "currentCoverage": 87.3,
      "trend": [
        { "date": "2026-01-28", "coverage": 85.1, "commitSha": "abc123" },
        { "date": "2026-02-01", "coverage": 86.0, "commitSha": "def456" },
        { "date": "2026-02-05", "coverage": 87.3, "commitSha": "ghi789" }
      ]
    }
  ]
}
```

Coverage is extracted from GitHub Checks API data. Each data point corresponds to a commit that triggered CI. Coverage is stored with 1 decimal place precision.

### GET /metrics/summary

Aggregated summary of all metrics for the dashboard overview.

**Query parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `teamId` | string | Yes | -- | Team ID |
| `period` | enum | No | `30d` | Time range: `7d`, `30d`, `90d` |

**Response** `200 OK`:

```json
{
  "teamId": "clx1team123",
  "period": "30d",
  "velocity": {
    "prsMerged": 47,
    "medianCycleTimeHours": 18.5,
    "medianReviewTimeHours": 4.2
  },
  "quality": {
    "avgPrSize": 245,
    "avgReviewCommentsPerPr": 3.1,
    "mergeWithoutApprovalRate": 0.04
  },
  "activity": {
    "totalCommits": 312,
    "totalDeployments": 28,
    "activeContributors": 8
  }
}
```

### POST /metrics/aggregate

Trigger a manual metric aggregation for a team. Normally metrics are aggregated automatically every hour by the background job scheduler.

**Query parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamId` | string | Yes | Team ID |

**Response** `200 OK`:

```json
{
  "status": "completed",
  "teamId": "clx1team123",
  "snapshotsCreated": 12,
  "duration": "2.3s"
}
```

---

## Risk

All risk endpoints require authentication.

### GET /risk/current

Compute and return the current sprint risk score for a team.

**Query parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamId` | string | Yes | Team ID |

**Response** `200 OK`:

```json
{
  "score": 72,
  "level": "high",
  "explanation": "Sprint risk is 72 (high). Top factors: PR review backlog (5 PRs waiting >24h, longest: PR #142 at 52h), velocity trend (only 4 of 12 expected PRs merged with 3 days remaining), commit frequency drop (35% below sprint average today).",
  "factors": [
    {
      "name": "PR Review Backlog",
      "score": 85,
      "weight": 0.20,
      "detail": "5 PRs waiting >24h without review"
    },
    {
      "name": "Velocity Trend",
      "score": 78,
      "weight": 0.25,
      "detail": "Only 33% of expected PRs merged at sprint midpoint"
    },
    {
      "name": "Commit Frequency",
      "score": 65,
      "weight": 0.15,
      "detail": "35% below sprint average today"
    },
    {
      "name": "Cycle Time Trend",
      "score": 55,
      "weight": 0.15,
      "detail": "Cycle time 140% of 4-week average"
    },
    {
      "name": "Test Coverage Delta",
      "score": 30,
      "weight": 0.10,
      "detail": "Coverage dropped 1.2% since sprint start"
    },
    {
      "name": "Large PR Ratio",
      "score": 40,
      "weight": 0.10,
      "detail": "25% of open PRs are >500 lines"
    },
    {
      "name": "Review Load Imbalance",
      "score": 20,
      "weight": 0.05,
      "detail": "Review load ratio is 2.1:1"
    }
  ],
  "calculatedAt": "2026-02-07T12:00:00.000Z"
}
```

**Risk scoring algorithm**: The score is a weighted composite of 7 factors. Each factor produces a sub-score (0-100), and the overall score is the weighted sum capped at 100.

| Factor | Weight | Concern Threshold |
|--------|--------|-------------------|
| Velocity trend | 25% | <70% of sprint average pace |
| PR review backlog | 20% | >3 PRs waiting >24h |
| Cycle time trend | 15% | >150% of 4-week average |
| Commit frequency drop | 15% | >40% drop day-over-day |
| Test coverage delta | 10% | >3% decrease from sprint start |
| Large PR ratio | 10% | >30% of open PRs >500 lines |
| Review load imbalance | 5% | >3:1 max/min ratio |

**Risk levels**: `low` (0-30), `medium` (31-60), `high` (61-100).

### GET /risk/history

Retrieve historical risk snapshots for trend analysis.

**Query parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `teamId` | string | Yes | -- | Team ID |
| `days` | integer | No | 30 | Number of days of history (1-365) |

**Response** `200 OK`:

```json
{
  "teamId": "clx1team123",
  "snapshots": [
    {
      "id": "clx4snap001",
      "score": 72,
      "level": "high",
      "explanation": "Sprint risk is 72 (high). Top factors: ...",
      "factors": { ... },
      "calculatedAt": "2026-02-07T12:00:00.000Z"
    },
    {
      "id": "clx4snap002",
      "score": 58,
      "level": "medium",
      "explanation": "Sprint risk is 58 (medium). Top factors: ...",
      "factors": { ... },
      "calculatedAt": "2026-02-07T08:00:00.000Z"
    }
  ]
}
```

Risk scores are recalculated every 4 hours during work hours (8am-8pm in the team's configured timezone).

---

## Webhooks

### POST /webhooks/github

**Public** (no JWT auth) -- receives GitHub webhook events. Authenticated via HMAC-SHA256 signature verification.

**Required headers**:

| Header | Description |
|--------|-------------|
| `X-Hub-Signature-256` | HMAC-SHA256 signature of the request body |
| `X-GitHub-Event` | Event type (`push`, `pull_request`, `deployment`, `deployment_status`) |
| `X-GitHub-Delivery` | Unique delivery ID |

**Handled events**: `push`, `pull_request`, `deployment`, `deployment_status`

Any other event type returns `200 OK` with `"status": "ignored"`.

**Response** `200 OK` (push event):

```json
{
  "status": "processed",
  "event": "push",
  "commitsStored": 3
}
```

**Response** `200 OK` (pull_request event):

```json
{
  "status": "processed",
  "event": "pull_request",
  "action": "opened"
}
```

**Response** `401 Unauthorized` (invalid signature):

```json
{
  "type": "https://pulse.dev/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Invalid webhook signature"
}
```

**Webhook processing pipeline**:
1. Verify HMAC-SHA256 signature against the webhook secret
2. Parse the event payload
3. Normalize the data into internal schema (Commit, PullRequest, Deployment)
4. Store in PostgreSQL
5. Publish event to Redis pub/sub for real-time broadcast
6. Connected WebSocket clients receive the event within 10 seconds
