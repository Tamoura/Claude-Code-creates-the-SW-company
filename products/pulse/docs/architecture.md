# Pulse - System Architecture

**Version**: 1.0
**Status**: Design
**Last Updated**: 2026-02-07
**Architect**: Claude Architect

---

## 1. Executive Summary

Pulse is an AI-Powered Developer Intelligence Platform that connects to GitHub repositories and transforms raw development activity into actionable dashboards for engineering leaders. This document defines the system architecture: a monolithic Fastify API with real-time WebSocket capabilities, a Next.js web dashboard with interactive charts, a React Native mobile app for push notifications, and background job infrastructure for metric aggregation and anomaly detection.

**Key Architecture Principles**:
- **Simplicity First**: Monolithic Fastify app (not microservices) until scale demands otherwise
- **Real-Time by Default**: WebSocket-first for live activity feeds, with REST fallback
- **Progressive Loading**: Cached aggregates load instantly, real-time data hydrates via WebSocket
- **Secure by Design**: AES-256 encrypted GitHub tokens, JWT auth, RBAC on every query
- **Event-Driven Internals**: GitHub webhooks trigger a pipeline: receive, normalize, store, aggregate, broadcast, detect anomalies

---

## 2. System Architecture

### 2.1 High-Level System Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        WEB["Next.js Web Dashboard<br/>:3106"]
        MOBILE["React Native Mobile App<br/>(Expo) :8081"]
    end

    subgraph "API Layer"
        API["Fastify API Server<br/>:5003"]
        WS["WebSocket Server<br/>(fastify-websocket)<br/>:5003/api/v1/activity/ws"]
    end

    subgraph "External Services"
        GH_API["GitHub REST API<br/>(Octokit)"]
        GH_WH["GitHub Webhooks<br/>(Inbound)"]
        APNS["Apple Push Notification<br/>Service (APNs)"]
        FCM["Firebase Cloud Messaging<br/>(FCM)"]
    end

    subgraph "Data Layer"
        PG["PostgreSQL 15+<br/>Database: pulse_dev<br/>:5432"]
        REDIS["Redis 7.x<br/>Cache + Pub/Sub<br/>:6379"]
    end

    subgraph "Background Jobs"
        METRIC_JOB["Metric Aggregation<br/>(Hourly)"]
        RISK_JOB["Risk Calculation<br/>(Every 4h, 8am-8pm)"]
        ANOMALY_JOB["Anomaly Detection<br/>(Every 15min)"]
        SYNC_JOB["GitHub Sync<br/>(Every 30min)"]
        CLEANUP_JOB["Data Cleanup<br/>(Daily 2am)"]
    end

    WEB -->|REST + WebSocket| API
    WEB -->|WebSocket| WS
    MOBILE -->|REST| API
    MOBILE -->|WebSocket| WS

    API -->|Queries/Writes| PG
    API -->|Cache/Pub-Sub| REDIS
    API -->|Octokit REST| GH_API
    GH_WH -->|POST /api/v1/webhooks/github| API
    API -->|Push| APNS
    API -->|Push| FCM

    METRIC_JOB -->|Read/Write| PG
    RISK_JOB -->|Read/Write| PG
    ANOMALY_JOB -->|Read| PG
    ANOMALY_JOB -->|Publish Events| REDIS
    SYNC_JOB -->|Octokit REST| GH_API
    SYNC_JOB -->|Write| PG
    CLEANUP_JOB -->|Delete old data| PG

    REDIS -->|Subscribe| WS
```

### 2.2 Component Communication Overview

```mermaid
sequenceDiagram
    participant GH as GitHub
    participant API as Fastify API
    participant DB as PostgreSQL
    participant REDIS as Redis
    participant WS as WebSocket Server
    participant WEB as Web Dashboard
    participant JOB as Background Jobs

    GH->>API: Webhook (push/PR/deploy)
    API->>API: Verify HMAC signature
    API->>DB: Store normalized event
    API->>REDIS: PUBLISH event to channel
    REDIS->>WS: Subscriber receives event
    WS->>WEB: Broadcast to room subscribers

    Note over JOB,DB: Every 15 minutes
    JOB->>DB: Query recent events
    JOB->>JOB: Run anomaly detection rules
    JOB->>DB: Store anomaly notification
    JOB->>REDIS: PUBLISH anomaly alert
    REDIS->>WS: Forward to relevant rooms

    Note over JOB,DB: Every hour
    JOB->>DB: Read raw events
    JOB->>JOB: Compute velocity/quality metrics
    JOB->>DB: Write MetricSnapshot rows
```

---

## 3. Component Breakdown

### 3.1 Backend API (Fastify)

The backend is a single Fastify application organized into domain modules. Each module follows the Route-Handler-Service pattern.

**Directory Structure**:
```
apps/api/src/
  app.ts                    # Fastify app factory (buildApp)
  server.ts                 # Server startup (listen on :5003)
  plugins/
    prisma.ts               # PrismaClient lifecycle (from Component Registry)
    redis.ts                # Redis connection (from Component Registry)
    auth.ts                 # JWT + GitHub OAuth (adapted from Component Registry)
    observability.ts        # Correlation IDs + metrics (from Component Registry)
    websocket.ts            # fastify-websocket + room manager
    rate-limit.ts           # @fastify/rate-limit + Redis store
    cors.ts                 # @fastify/cors config
    helmet.ts               # @fastify/helmet security headers
  modules/
    auth/
      routes.ts             # POST /register, /login, GET /github, /github/callback, /refresh, etc.
      handlers.ts           # Request parsing, response formatting
      service.ts            # Business logic (bcrypt, JWT, GitHub OAuth exchange)
      schemas.ts            # Zod validation schemas
    repos/
      routes.ts             # GET /repos, /repos/available, POST /repos/:id/connect, etc.
      handlers.ts
      service.ts            # GitHub API calls, webhook registration, ingestion orchestration
      schemas.ts
      ingestion.ts          # Background ingestion job logic
    activity/
      routes.ts             # GET /activity, WS /activity/ws
      handlers.ts
      service.ts            # Activity event storage, WebSocket broadcast
      schemas.ts
      ws-handler.ts         # WebSocket connection handler, room subscriptions
    velocity/
      routes.ts             # GET /velocity, /velocity/cycle-time, /velocity/review-time
      handlers.ts
      service.ts            # Metric aggregation queries
      schemas.ts
    quality/
      routes.ts             # GET /quality, /quality/coverage
      handlers.ts
      service.ts            # Coverage tracking, PR size analysis
      schemas.ts
    risk/
      routes.ts             # GET /risk, /risk/history, /risk/factors
      handlers.ts
      service.ts            # Risk scoring algorithm, NL explanation generator
      schemas.ts
      scoring.ts            # Weighted factor scoring engine
    team/
      routes.ts             # GET /team, POST /team/invite, PATCH /team/:id/role, etc.
      handlers.ts
      service.ts            # RBAC enforcement, invitations
      schemas.ts
    notifications/
      routes.ts             # GET /notifications, PUT /preferences, POST /:id/dismiss
      handlers.ts
      service.ts            # Push notification delivery (APNs/FCM), preference management
      schemas.ts
      anomaly-detector.ts   # Anomaly detection rules engine
    health/
      routes.ts             # GET /health
      handlers.ts
    overview/
      routes.ts             # GET /overview/teams
      handlers.ts
      service.ts            # Cross-team aggregation for VP view
      schemas.ts
    settings/
      routes.ts             # GET/PUT /settings/profile
      handlers.ts
      service.ts
      schemas.ts
    webhooks/
      routes.ts             # POST /webhooks/github
      handlers.ts           # GitHub webhook signature verification
      service.ts            # Event normalization and storage
      schemas.ts
  jobs/
    scheduler.ts            # Job scheduler (setInterval-based, no external deps)
    metric-aggregation.ts   # Hourly metric computation
    risk-calculation.ts     # 4-hourly sprint risk scoring
    anomaly-detection.ts    # 15-minute anomaly checks
    github-sync.ts          # 30-minute polling failsafe
    data-cleanup.ts         # Daily data archival
  utils/
    crypto.ts               # Password hashing, encryption (from Component Registry)
    encryption.ts           # AES-256-GCM for GitHub tokens (from Component Registry)
    logger.ts               # Structured JSON logging (from Component Registry)
    errors.ts               # AppError with RFC 7807 (from Component Registry)
    pagination.ts           # Pagination helpers (from Component Registry)
    redis-rate-limit.ts     # Redis rate limit store (from Component Registry)
```

**Plugin Registration Order** (per PATTERN-009):
1. Observability (correlation IDs, request logging)
2. Prisma (database connection)
3. Redis (cache, pub/sub)
4. Auth (JWT verification, GitHub OAuth)
5. Rate Limit (Redis-backed)
6. CORS, Helmet (security headers)
7. WebSocket (real-time)
8. Module Routes (domain endpoints)

### 3.2 Frontend Web Dashboard (Next.js)

**Directory Structure**:
```
apps/web/src/
  app/
    layout.tsx              # Root layout (HTML, body, providers)
    page.tsx                # Landing page (/)
    login/page.tsx          # Login page
    signup/page.tsx         # Registration page
    forgot-password/page.tsx
    reset-password/page.tsx
    verify-email/page.tsx
    pricing/page.tsx
    docs/page.tsx
    dashboard/
      layout.tsx            # Dashboard shell (sidebar, header)
      page.tsx              # Main dashboard overview
      activity/page.tsx     # Real-time activity feed
      velocity/page.tsx     # Team velocity charts
      quality/page.tsx      # Code quality trends
      risk/
        page.tsx            # Sprint risk score
        history/page.tsx    # Risk history
      repos/
        page.tsx            # Connected repositories
        [id]/page.tsx       # Single repo detail
      team/
        page.tsx            # Team overview
        [id]/page.tsx       # Individual member
      overview/page.tsx     # Cross-team VP view
      settings/
        page.tsx            # Account settings
        notifications/page.tsx
        team/page.tsx       # Team management
  components/
    charts/
      VelocityChart.tsx     # Bar chart: PRs merged per week
      CycleTimeChart.tsx    # Line chart: median cycle time
      ReviewTimeChart.tsx   # Line + scatter: review time
      CoverageChart.tsx     # Area chart: test coverage
      RiskGauge.tsx         # Gauge: 0-100 risk score
      RiskSparkline.tsx     # Mini sparkline: 7-day risk
    dashboard/
      Sidebar.tsx           # Navigation sidebar (adapted from Component Registry)
      StatCard.tsx          # KPI metric card (from Component Registry)
      ActivityFeed.tsx      # Real-time event stream
      ActivityEvent.tsx     # Single event row
      RepoCard.tsx          # Repository status card
      RiskFactorList.tsx    # Risk factor breakdown
      TeamMemberCard.tsx    # Individual member velocity
    ui/                     # shadcn/ui components (Button, Card, Badge, etc.)
    common/
      ErrorBoundary.tsx     # Error boundary (from Component Registry)
      ProtectedRoute.tsx    # Auth guard (adapted for Next.js middleware)
      ThemeToggle.tsx       # Dark/light mode (from Component Registry)
      TimeRangeSelector.tsx # 4w/8w/12w/6m range picker
  hooks/
    useAuth.ts              # Auth state (adapted from Component Registry)
    useTheme.ts             # Theme toggle (from Component Registry)
    useWebSocket.ts         # WebSocket connection with auto-reconnect
    useActivityFeed.ts      # Activity events with filtering
    useVelocity.ts          # Velocity metrics data
    useQuality.ts           # Quality metrics data
    useRisk.ts              # Risk score data
    useTeam.ts              # Team data
    useNotifications.ts     # Notification preferences
  lib/
    api-client.ts           # HTTP client (adapted from Component Registry)
    token-manager.ts        # JWT storage (from Component Registry)
    ws-client.ts            # WebSocket client with reconnection
    chart-config.ts         # Shared Recharts theme/config
```

### 3.3 Mobile App (React Native / Expo)

**Directory Structure**:
```
apps/mobile/
  app/
    _layout.tsx             # Root layout (Expo Router)
    (auth)/
      login.tsx             # GitHub OAuth via WebView
    (tabs)/
      _layout.tsx           # Tab navigator
      index.tsx             # Dashboard summary
      activity.tsx          # Activity feed
      risk.tsx              # Sprint risk
      notifications.tsx     # Notification center
    settings.tsx            # App preferences
    repo/[id].tsx           # Repository detail
    pr/[id].tsx             # PR detail
  components/
    ActivityList.tsx
    RiskGauge.tsx
    NotificationItem.tsx
  hooks/
    useAuth.ts
    usePushNotifications.ts
    useWebSocket.ts
  lib/
    api-client.ts
    storage.ts              # SecureStore for tokens
```

---

## 4. Data Flow Diagrams

### 4.1 GitHub Webhook to Dashboard

This is the primary real-time data flow. GitHub pushes a webhook event, the API processes it, and the dashboard updates within 10 seconds.

```mermaid
flowchart LR
    A["GitHub<br/>push/PR/deploy event"] -->|"POST /api/v1/webhooks/github<br/>HMAC-SHA256 signed"| B["Webhook Handler"]
    B -->|"Verify signature"| C{"Valid?"}
    C -->|No| D["403 Forbidden"]
    C -->|Yes| E["Event Normalizer"]
    E -->|"Map to internal schema"| F["PostgreSQL<br/>(Commit/PR/Deployment)"]
    E -->|"Publish to channel"| G["Redis Pub/Sub<br/>channel: team:{id}"]
    G -->|"Subscribe"| H["WebSocket Server"]
    H -->|"Broadcast to room<br/>team:{id}, repo:{id}"| I["Connected Clients"]
    I --> J["Web Dashboard<br/>(Activity Feed updates)"]
    I --> K["Mobile App<br/>(Activity Feed updates)"]
```

### 4.2 Historical Data Ingestion

When a user connects a repository, historical data is fetched in the background.

```mermaid
flowchart TD
    A["User clicks<br/>'Start Monitoring'"] -->|"POST /repos/:id/connect"| B["Repos Service"]
    B --> C["Register GitHub Webhook<br/>(push, pull_request, deployment)"]
    B --> D["Queue Ingestion Job"]
    D --> E["Ingestion Worker"]
    E --> F["Fetch last 30 days<br/>(high priority, visible immediately)"]
    F --> G["GitHub REST API<br/>(paginated, 100/page)"]
    G --> H{"Rate limit<br/>remaining > 10%?"}
    H -->|Yes| I["Parse and normalize<br/>commits, PRs, deployments"]
    H -->|No| J["Pause until<br/>rate limit reset"]
    J --> G
    I --> K["Batch insert to PostgreSQL"]
    K --> L["Update sync progress<br/>(percentage)"]
    L --> M["Broadcast progress<br/>via WebSocket"]
    E --> N["Fetch days 31-90<br/>(low priority, background)"]
    N --> G
```

### 4.3 Metric Aggregation Pipeline

Raw events are aggregated into pre-computed snapshots for fast dashboard queries.

```mermaid
flowchart TD
    A["Scheduler triggers<br/>(hourly)"] --> B["Metric Aggregation Job"]
    B --> C["Query raw events<br/>since last aggregation"]
    C --> D["Compute Velocity Metrics"]
    D --> D1["PRs merged per week<br/>(by team, repo, developer)"]
    D --> D2["Median cycle time<br/>(trailing 7-day window)"]
    D --> D3["Median time-to-first-review<br/>(trailing 7-day window)"]
    C --> E["Compute Quality Metrics"]
    E --> E1["Test coverage trend<br/>(per repo, per commit)"]
    E --> E2["Average PR size<br/>(additions + deletions)"]
    E --> E3["Merge-without-approval rate"]
    D1 & D2 & D3 & E1 & E2 & E3 --> F["Write MetricSnapshot rows<br/>(team_id, repo_id, metric_type,<br/>value, period_start, period_end)"]
    F --> G["Invalidate Redis cache<br/>for affected team/repo"]
```

### 4.4 Sprint Risk Scoring Pipeline

```mermaid
flowchart TD
    A["Scheduler triggers<br/>(every 4h, 8am-8pm)"] --> B["Risk Calculation Job"]
    B --> C["Load sprint context<br/>(team, repos, time range)"]
    C --> D["Extract Features"]
    D --> D1["Velocity trend<br/>(PRs merged vs sprint average)"]
    D --> D2["PR review backlog<br/>(open >24h without review)"]
    D --> D3["Cycle time trend<br/>(vs 4-week average)"]
    D --> D4["Commit frequency drop<br/>(vs sprint average)"]
    D --> D5["Test coverage delta<br/>(vs sprint start)"]
    D --> D6["Large PR ratio<br/>(>500 lines)"]
    D --> D7["Review load imbalance<br/>(max/min ratio)"]
    D1 & D2 & D3 & D4 & D5 & D6 & D7 --> E["Apply Weights<br/>(25%, 20%, 15%, 15%, 10%, 10%, 5%)"]
    E --> F["Compute weighted score<br/>(0-100, capped)"]
    F --> G["Generate NL explanation<br/>(template-based, top 3 factors)"]
    G --> H["Write RiskSnapshot<br/>(score, explanation, factors JSON)"]
    H --> I{"Score increased<br/>>15 points?"}
    I -->|Yes| J["Trigger anomaly alert<br/>(push notification)"]
    I -->|No| K["Available on<br/>next dashboard load"]
```

---

## 5. WebSocket Architecture

### 5.1 Protocol Design

Pulse uses `@fastify/websocket` (which wraps the `ws` library) for real-time communication. The protocol uses JSON messages over a single WebSocket connection per client.

**Connection URL**: `wss://api.pulse.dev/api/v1/activity/ws?token=<JWT>`

**Authentication**: JWT token passed as a query parameter during the WebSocket handshake. The server validates the token before upgrading the connection. If the token is invalid or expired, the server responds with HTTP 401 and does not upgrade.

### 5.2 Room-Based Subscriptions

Each WebSocket connection can subscribe to multiple rooms. Events are broadcast only to rooms the client has joined.

**Room Types**:
| Room Pattern | Description | Example |
|-------------|-------------|---------|
| `team:{teamId}` | All activity for a team | `team:clx1abc123` |
| `repo:{repoId}` | Activity for a specific repo | `repo:clx2def456` |
| `user:{userId}` | Personal notifications | `user:clx3ghi789` |

### 5.3 Message Protocol

All WebSocket messages are JSON with a `type` field for routing.

**Client-to-Server Messages**:

```json
// Subscribe to room(s)
{
  "type": "subscribe",
  "rooms": ["team:clx1abc123", "repo:clx2def456"]
}

// Unsubscribe from room(s)
{
  "type": "unsubscribe",
  "rooms": ["repo:clx2def456"]
}

// Heartbeat (client pong)
{
  "type": "pong"
}
```

**Server-to-Client Messages**:

```json
// Activity event broadcast
{
  "type": "activity",
  "room": "team:clx1abc123",
  "data": {
    "id": "evt_abc123",
    "eventType": "pull_request.opened",
    "repoName": "backend-api",
    "repoFullName": "acme/backend-api",
    "author": {
      "username": "priya-dev",
      "avatarUrl": "https://avatars.githubusercontent.com/u/123"
    },
    "title": "Add user authentication middleware",
    "number": 142,
    "url": "https://github.com/acme/backend-api/pull/142",
    "timestamp": "2026-02-07T10:30:00Z"
  }
}

// Heartbeat (server ping)
{
  "type": "ping"
}

// Sync progress update
{
  "type": "sync_progress",
  "data": {
    "repoId": "clx2def456",
    "repoName": "backend-api",
    "progress": 67,
    "status": "syncing"
  }
}

// Anomaly alert
{
  "type": "anomaly",
  "room": "team:clx1abc123",
  "data": {
    "id": "alert_xyz789",
    "anomalyType": "stalled_pr",
    "severity": "high",
    "title": "PR #142 has been open 52 hours without review",
    "repoName": "backend-api",
    "timestamp": "2026-02-07T10:30:00Z"
  }
}

// Risk score update
{
  "type": "risk_update",
  "room": "team:clx1abc123",
  "data": {
    "score": 72,
    "previousScore": 58,
    "explanation": "Sprint risk is 72 (high). Top factors: ..."
  }
}

// Error
{
  "type": "error",
  "data": {
    "code": "INVALID_ROOM",
    "message": "Room 'team:invalid' does not exist or you lack permission"
  }
}
```

### 5.4 Heartbeat and Reconnection

- **Server Ping**: Every 30 seconds, the server sends `{"type": "ping"}`
- **Client Pong**: Client must respond with `{"type": "pong"}` within 10 seconds
- **Stale Connection Cleanup**: If no pong received within 10 seconds, the server closes the connection
- **Client Reconnection**: Client implements exponential backoff reconnection:
  - Attempt 1: immediate
  - Attempt 2: 1 second
  - Attempt 3: 2 seconds
  - Attempt 4: 4 seconds
  - Maximum: 30 seconds between attempts
- **Backfill on Reconnect**: After reconnection, client sends a `last_event_id` to request missed events:
  ```json
  {
    "type": "subscribe",
    "rooms": ["team:clx1abc123"],
    "lastEventId": "evt_abc122"
  }
  ```
  The server replays events after `lastEventId` from the database (up to 100 events, within the last 5 minutes).

### 5.5 WebSocket Server Architecture

```mermaid
flowchart TD
    A["Client connects<br/>ws://...?token=JWT"] --> B{"Validate JWT"}
    B -->|Invalid| C["HTTP 401<br/>Connection rejected"]
    B -->|Valid| D["Upgrade to WebSocket"]
    D --> E["Add to connection pool"]
    E --> F["Client sends<br/>subscribe message"]
    F --> G["Verify room access<br/>(team membership check)"]
    G -->|Denied| H["Send error message"]
    G -->|Allowed| I["Add client to room(s)"]
    I --> J["Redis subscriber<br/>listens for events"]
    J --> K["Event published to<br/>Redis channel"]
    K --> L["Iterate room members"]
    L --> M["Send JSON to each<br/>connected client"]

    N["Heartbeat Timer<br/>(30s interval)"] --> O["Send ping to all clients"]
    O --> P{"Pong received<br/>within 10s?"}
    P -->|Yes| N
    P -->|No| Q["Close connection<br/>Remove from rooms"]
```

---

## 6. Background Job Architecture

Background jobs run within the same Fastify process using `setInterval`. This keeps the architecture simple (no external job queue like BullMQ) for MVP. Each job is idempotent and uses database timestamps to track last execution.

### 6.1 Job Schedule

| Job | Frequency | Window | Duration Target | Purpose |
|-----|-----------|--------|----------------|---------|
| Metric Aggregation | Every 60 min | 24/7 | <30s | Compute velocity + quality metrics from raw events |
| Risk Calculation | Every 4 hours | 8am-8pm team TZ | <15s | Run sprint risk scoring algorithm |
| Anomaly Detection | Every 15 min | 24/7 | <10s | Check for anomalous patterns in recent data |
| GitHub Sync | Every 30 min | 24/7 | <60s | Poll GitHub for events missed by webhooks |
| Data Cleanup | Daily at 2am | 2am-3am UTC | <5min | Archive/delete data older than retention period |

### 6.2 Job Scheduler Implementation

```typescript
// jobs/scheduler.ts (simplified)
interface ScheduledJob {
  name: string;
  fn: () => Promise<void>;
  intervalMs: number;
  windowStart?: number; // hour (0-23)
  windowEnd?: number;   // hour (0-23)
  lastRun?: Date;
}

class JobScheduler {
  private jobs: Map<string, NodeJS.Timer> = new Map();

  register(job: ScheduledJob): void {
    const timer = setInterval(async () => {
      if (job.windowStart !== undefined) {
        const hour = new Date().getUTCHours();
        if (hour < job.windowStart || hour >= job.windowEnd!) return;
      }
      try {
        await job.fn();
        job.lastRun = new Date();
      } catch (err) {
        logger.error({ job: job.name, err }, 'Job failed');
      }
    }, job.intervalMs);
    this.jobs.set(job.name, timer);
  }

  shutdown(): void {
    for (const [name, timer] of this.jobs) {
      clearInterval(timer);
    }
  }
}
```

### 6.3 Job Idempotency

Each job reads a `last_processed_at` timestamp from the database to determine the window of events to process. This ensures that:
- Jobs can safely overlap (no double-counting)
- Server restarts do not cause data gaps
- Multiple instances can run the same job without conflict (using `SELECT FOR UPDATE` advisory locks)

---

## 7. Authentication and Security Architecture

### 7.1 Authentication Flow

Pulse supports two authentication methods:

**Method 1: Email/Password**
1. User registers with email + password
2. Password hashed with bcrypt (cost factor 12)
3. Email verification token sent
4. On login: JWT access token (1hr) + HttpOnly refresh token cookie (7d)

**Method 2: GitHub OAuth**
1. User clicks "Login with GitHub" or "Connect GitHub"
2. Redirect to `https://github.com/login/oauth/authorize` with scopes: `repo`, `read:org`, `read:user`
3. GitHub redirects back with authorization code
4. Backend exchanges code for access token via `POST https://github.com/login/oauth/access_token`
5. Access token encrypted with AES-256-GCM and stored in database
6. If user does not exist: create account from GitHub profile
7. Issue JWT + refresh token

```mermaid
sequenceDiagram
    participant U as User
    participant WEB as Next.js App
    participant API as Fastify API
    participant GH as GitHub

    U->>WEB: Click "Connect GitHub"
    WEB->>API: GET /api/v1/auth/github
    API->>API: Generate state + PKCE verifier
    API-->>WEB: 302 Redirect to GitHub
    WEB->>GH: github.com/login/oauth/authorize?scope=repo,read:org,read:user
    U->>GH: Authorize Pulse
    GH-->>WEB: 302 Redirect to callback with code + state
    WEB->>API: GET /api/v1/auth/github/callback?code=xxx&state=yyy
    API->>API: Verify state parameter
    API->>GH: POST github.com/login/oauth/access_token (exchange code)
    GH-->>API: { access_token, token_type, scope }
    API->>API: Encrypt access_token with AES-256-GCM
    API->>API: Create/update user, store encrypted token
    API-->>WEB: { jwt, user }
    WEB->>WEB: Store JWT in memory (TokenManager)
```

### 7.2 Token Architecture

| Token Type | Lifetime | Storage | Purpose |
|-----------|----------|---------|---------|
| JWT Access Token | 1 hour | In-memory (TokenManager) | API authentication |
| Refresh Token | 7 days | HttpOnly Secure cookie | Silent token renewal |
| GitHub OAuth Token | Until revoked | PostgreSQL (AES-256 encrypted) | GitHub API access |
| WebSocket Token | Same as JWT | Query parameter on connect | WebSocket auth |

### 7.3 RBAC Model

Three roles with hierarchical permissions:

| Permission | Admin | Member | Viewer |
|-----------|-------|--------|--------|
| View dashboards | Yes | Yes | Yes |
| View activity feed | Yes | Yes | Yes |
| Connect/disconnect repos | Yes | Yes (own) | No |
| Manage team members | Yes | No | No |
| Change team settings | Yes | No | No |
| Configure notifications | Yes | Yes (own) | Yes (own) |
| Invite members | Yes | No | No |
| Delete team | Yes | No | No |

RBAC is enforced at the service layer, not just the route layer. Every database query includes a team membership check to prevent data leakage.

### 7.4 Security Controls

| Control | Implementation |
|---------|---------------|
| Token Encryption | AES-256-GCM for GitHub tokens at rest |
| Password Hashing | bcrypt cost factor 12 |
| JWT Signing | HS256 with server secret (256-bit) |
| Webhook Verification | HMAC-SHA256 signature on all GitHub webhooks |
| Rate Limiting | Auth: 10/min/IP, API: 100/min/user, Webhooks: 1000/min |
| Input Validation | Zod schemas on all endpoints |
| Security Headers | @fastify/helmet (HSTS, CSP, X-Frame-Options) |
| CORS | Restrict to frontend origin only |
| SQL Injection | Prisma ORM (parameterized queries) |
| XSS Prevention | React auto-escaping + CSP |

---

## 8. Caching Strategy

### 8.1 Redis Cache Layers

| Cache Key Pattern | TTL | Purpose |
|-------------------|-----|---------|
| `metrics:velocity:{teamId}:{range}` | 5 min | Pre-computed velocity dashboard data |
| `metrics:quality:{teamId}:{range}` | 5 min | Pre-computed quality dashboard data |
| `metrics:risk:{teamId}` | Until next calculation | Current risk score + explanation |
| `repos:available:{userId}` | 10 min | GitHub repo list (expensive API call) |
| `repos:sync:{repoId}` | Until complete | Ingestion progress percentage |
| `ws:rooms:{roomId}` | Session | Room membership for WebSocket routing |
| `rate:{type}:{identifier}` | Window size | Rate limit counters |

### 8.2 Cache Invalidation Strategy

- **Metric caches** are invalidated when the metric aggregation job completes
- **Risk cache** is replaced when the risk calculation job runs
- **Repo list cache** is invalidated when a user connects/disconnects a repo
- **WebSocket room state** is stored in Redis to support future horizontal scaling

### 8.3 Redis Pub/Sub Channels

| Channel | Publishers | Subscribers | Message Type |
|---------|-----------|-------------|-------------|
| `events:team:{teamId}` | Webhook handler, Sync job | WebSocket server | Activity events |
| `events:repo:{repoId}` | Webhook handler, Sync job | WebSocket server | Repo-specific events |
| `alerts:team:{teamId}` | Anomaly detector | WebSocket server | Anomaly alerts |
| `sync:repo:{repoId}` | Ingestion worker | WebSocket server | Sync progress |

---

## 9. Mobile Push Notification Architecture

### 9.1 Push Notification Flow

```mermaid
flowchart TD
    A["Anomaly Detected<br/>(by anomaly detection job)"] --> B["Create Notification record<br/>in PostgreSQL"]
    B --> C["Query user preferences<br/>(category enabled? quiet hours?)"]
    C --> D{"Within<br/>quiet hours?"}
    D -->|Yes| E["Queue for delivery<br/>at quiet hours end"]
    D -->|No| F["Lookup device tokens<br/>(APNs + FCM)"]
    F --> G{"Platform?"}
    G -->|iOS| H["APNs via<br/>expo-notifications"]
    G -->|Android| I["FCM via<br/>expo-notifications"]
    H --> J["Delivered to<br/>iOS device"]
    I --> K["Delivered to<br/>Android device"]
    E --> L["Scheduler fires at<br/>quiet hours end"]
    L --> F
```

### 9.2 Device Token Management

- Mobile app registers for push notifications on startup using `expo-notifications`
- Device token (APNs token for iOS, FCM token for Android) sent to backend: `POST /api/v1/notifications/device-token`
- Token stored in `DeviceToken` table (userId, platform, token, lastUsedAt)
- Tokens refreshed on each app launch
- Stale tokens (no app launch in 30 days) are cleaned up

### 9.3 Notification Payload Structure

```json
{
  "to": "ExponentPushToken[xxx]",
  "title": "Stalled PR Alert",
  "body": "PR #142 in backend-api has been open 52 hours without review",
  "data": {
    "type": "anomaly",
    "anomalyType": "stalled_pr",
    "repoId": "clx2def456",
    "prNumber": 142,
    "deepLink": "/dashboard/repos/clx2def456?pr=142"
  },
  "sound": "default",
  "badge": 1,
  "priority": "high"
}
```

---

## 10. Deployment Architecture

### 10.1 Production Topology

```mermaid
graph TB
    subgraph "CDN (Vercel)"
        CDN["Next.js Edge<br/>Static + SSR"]
    end

    subgraph "Application Server (Render / Railway)"
        API["Fastify API<br/>+ WebSocket<br/>+ Background Jobs"]
    end

    subgraph "Managed Services"
        PG["PostgreSQL 15<br/>(Render / Neon)"]
        REDIS["Redis 7<br/>(Upstash / Render)"]
    end

    subgraph "External"
        GH["GitHub API<br/>+ Webhooks"]
        EXPO["Expo Push<br/>Service"]
    end

    CDN -->|HTTPS| API
    API -->|Connection Pool| PG
    API -->|TLS| REDIS
    API -->|REST| GH
    GH -->|Webhooks| API
    API -->|Push| EXPO
```

### 10.2 Environment Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | 256-bit secret for JWT signing |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret |
| `GITHUB_WEBHOOK_SECRET` | Yes | Secret for webhook HMAC verification |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for AES-256-GCM |
| `FRONTEND_URL` | Yes | Frontend origin for CORS + OAuth callback |
| `PORT` | No | API port (default: 5003) |
| `NODE_ENV` | No | Environment (development/production) |
| `LOG_LEVEL` | No | Logging level (default: info) |
| `EXPO_ACCESS_TOKEN` | Prod | Expo push notification token |

### 10.3 Local Development Setup

```bash
# Prerequisites: Node.js 20+, PostgreSQL 15+, Redis 7+

# Database
createdb pulse_dev

# Environment
cp .env.example .env
# Fill in GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, etc.

# Install dependencies
cd products/pulse && npm install

# Generate Prisma client and run migrations
cd apps/api && npx prisma generate && npx prisma migrate dev

# Seed test data
npx prisma db seed

# Start backend (port 5003)
cd apps/api && npm run dev

# Start frontend (port 3106)
cd apps/web && npm run dev

# Start mobile (port 8081)
cd apps/mobile && npx expo start
```

---

## 11. Technology Decisions Summary

| Decision | Choice | Rationale | ADR |
|----------|--------|-----------|-----|
| Real-time transport | `@fastify/websocket` | Native Fastify integration, lightweight, room-based pub/sub via Redis | ADR-001 |
| GitHub data strategy | Webhooks + polling hybrid | Webhooks for real-time, polling as failsafe for missed events | ADR-002 |
| Risk scoring approach | Rule-based weighted factors | Simpler, explainable, no ML infra needed for MVP; iterate with data | ADR-003 |
| Chart library | Recharts | React-native, composable, good TypeScript support, lighter than alternatives | ADR-004 |
| Caching / real-time state | Redis pub/sub + metric caching | Single Redis instance serves dual purpose; proven pattern from stablecoin-gateway | ADR-005 |
| Job scheduling | In-process setInterval | Simple, no external deps; upgrade to BullMQ if needed at scale | -- |
| Mobile framework | React Native (Expo) | Cross-platform, shared JS codebase, expo-notifications for push | -- |
| Authentication | JWT + bcrypt + GitHub OAuth | Proven ConnectSW pattern, adapted from Component Registry | -- |

---

**Created by**: Architect
**Last Updated**: 2026-02-07
**Status**: Design Complete - Pending Review
