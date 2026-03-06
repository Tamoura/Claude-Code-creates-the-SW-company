# RecomEngine -- System Architecture

**Version**: 1.0
**Status**: Draft
**Last Updated**: 2026-02-12
**Author**: Architect

---

## 1. Architecture Overview

RecomEngine is a B2B SaaS product recommendation orchestrator for e-commerce. The system follows a **modular monolith** architecture: a single deployable unit with clean internal module boundaries, shared database, and Redis cache. This approach optimizes for developer velocity and operational simplicity during the MVP phase while preserving the option to extract modules into separate services in the future.

### 1.1 System Context Diagram

```mermaid
C4Context
    title RecomEngine -- System Context

    Person(admin, "Admin / Growth Manager", "Manages tenants, experiments, analytics")
    Person(developer, "Platform Developer", "Integrates SDK and REST API")
    Person(shopper, "End-User Shopper", "Browses merchant site with recommendations")

    System(recomengine, "RecomEngine", "B2B SaaS Recommendation Orchestrator")

    System_Ext(merchant_site, "Merchant Website", "E-commerce storefront")
    System_Ext(cdn, "CDN", "SDK distribution (Cloudflare)")

    Rel(admin, recomengine, "Manages tenants, reviews analytics", "HTTPS / Dashboard")
    Rel(developer, recomengine, "Integrates SDK, calls REST API", "HTTPS / REST")
    Rel(shopper, merchant_site, "Browses products")
    Rel(merchant_site, recomengine, "Fetches recommendations, sends events", "HTTPS / SDK + API")
    Rel(recomengine, cdn, "Publishes SDK bundle", "HTTPS")
    Rel(merchant_site, cdn, "Loads SDK", "HTTPS")
```

### 1.2 Container Diagram

```mermaid
C4Container
    title RecomEngine -- Container Diagram

    Person(admin, "Admin")
    Person(merchant_site, "Merchant Site")

    Container_Boundary(recomengine, "RecomEngine") {
        Container(web, "Dashboard (Next.js)", "React 18, Tailwind CSS", "Admin dashboard for analytics, tenants, experiments. Port 3112")
        Container(api, "API Server (Fastify)", "TypeScript, Fastify 4", "REST API, event ingestion, recommendations. Port 5008")
        Container(sdk, "JavaScript SDK", "Vanilla TS, <10KB", "Embeddable widget, event tracking, recommendation rendering")
        ContainerDb(postgres, "PostgreSQL 15", "Database", "Tenants, catalog, events (partitioned), experiments, analytics")
        ContainerDb(redis, "Redis 7", "Cache + Rate Limiter", "Recommendation cache, rate limits, real-time counters, session blacklist")
    }

    Rel(admin, web, "Manages platform", "HTTPS")
    Rel(web, api, "REST calls", "HTTPS / JSON")
    Rel(merchant_site, sdk, "Loads SDK", "HTTPS / CDN")
    Rel(sdk, api, "Events, recommendations", "HTTPS / JSON")
    Rel(api, postgres, "Reads/writes", "TCP / Prisma")
    Rel(api, redis, "Cache, rate limit, counters", "TCP / ioredis")
```

---

## 2. Component Architecture

### 2.1 Backend Module Map

The API server is organized into 10 domain modules plus shared infrastructure (plugins, utilities). Each module follows the Route-Handler-Service pattern.

```mermaid
graph TB
    subgraph "Fastify API Server (Port 5008)"
        subgraph "Shared Infrastructure"
            AUTH[Auth Plugin<br/>JWT + API Key]
            PRISMA[Prisma Plugin<br/>DB Connection]
            REDIS[Redis Plugin<br/>Cache + Rate Limit]
            OBS[Observability Plugin<br/>Metrics + Correlation IDs]
            RATE[Rate Limiter<br/>Redis-backed per-key]
            LOG[Logger<br/>Structured + PII redaction]
            ERR[Error Handler<br/>RFC 7807 errors]
        end

        subgraph "Domain Modules"
            M_AUTH[auth/<br/>Registration, Login, JWT, Password Reset]
            M_TENANT[tenants/<br/>CRUD, Config, Lifecycle]
            M_APIKEY[api-keys/<br/>Generation, Revocation, Permissions]
            M_EVENT[events/<br/>Ingestion, Validation, Deduplication]
            M_CATALOG[catalog/<br/>Product CRUD, Batch Upload, Search]
            M_RECO[recommendations/<br/>Strategy Execution, Caching, Cold Start]
            M_EXP[experiments/<br/>A/B Test CRUD, Assignment, Results]
            M_ANALYTICS[analytics/<br/>KPI Aggregation, Time-Series, Export]
            M_WIDGET[widgets/<br/>Configuration, Preview]
            M_HEALTH[health/<br/>Readiness, Liveness]
        end
    end

    AUTH --> M_AUTH
    AUTH --> M_TENANT
    AUTH --> M_APIKEY
    AUTH --> M_EVENT
    AUTH --> M_CATALOG
    AUTH --> M_RECO
    AUTH --> M_EXP
    AUTH --> M_ANALYTICS
    AUTH --> M_WIDGET

    PRISMA --> M_TENANT
    PRISMA --> M_APIKEY
    PRISMA --> M_EVENT
    PRISMA --> M_CATALOG
    PRISMA --> M_RECO
    PRISMA --> M_EXP
    PRISMA --> M_ANALYTICS
    PRISMA --> M_WIDGET

    REDIS --> M_EVENT
    REDIS --> M_RECO
    REDIS --> M_ANALYTICS
    REDIS --> RATE
```

### 2.2 Module Details

| Module | Routes File | Auth Required | Auth Type | Description |
|--------|-------------|---------------|-----------|-------------|
| `auth/` | `routes.ts` | No (public) | None | Signup, login, logout, forgot/reset password |
| `tenants/` | `routes.ts` | Yes | JWT (Admin) | Tenant CRUD, config, lifecycle (activate/suspend/delete) |
| `api-keys/` | `routes.ts` | Yes | JWT (Admin) | API key generation, revocation, listing per tenant |
| `events/` | `routes.ts` | Yes | API Key (write) | Single and batch event ingestion with validation + dedup |
| `catalog/` | `routes.ts` | Yes | API Key (read-write) | Product CRUD, batch upload, search with pagination |
| `recommendations/` | `routes.ts` | Yes | API Key (read) | Fetch recommendations with strategy selection + A/B routing |
| `experiments/` | `routes.ts` | Yes | JWT (Admin) | Experiment CRUD, status transitions, results computation |
| `analytics/` | `routes.ts` | Yes | JWT (Admin) | KPI overview, time-series, top products, CSV export |
| `widgets/` | `routes.ts` | Yes | JWT (Admin) or API Key (read) | Widget config CRUD, preview rendering |
| `health/` | `routes.ts` | No (public) | None | `/health` (liveness) and `/ready` (readiness) |

### 2.3 Module File Structure

Each domain module follows a consistent structure:

```
modules/{module}/
  routes.ts     -- Fastify route definitions with schema validation
  handlers.ts   -- Request parsing, response formatting
  service.ts    -- Business logic (testable independently)
  schemas.ts    -- Zod schemas for request/response validation
```

### 2.4 Frontend Architecture (Dashboard)

```mermaid
graph TB
    subgraph "Next.js Dashboard (Port 3112)"
        subgraph "Pages (App Router)"
            LANDING["/ -- Landing Page (SSR)"]
            LOGIN["/login -- Auth Pages"]
            DASH["/dashboard -- Dashboard Layout"]
            TENANTS["/dashboard/tenants -- Tenant Management"]
            TENANT_DETAIL["/dashboard/tenants/:id -- Tenant Detail"]
            ANALYTICS["/dashboard/tenants/:id/analytics -- Analytics"]
            EXPERIMENTS["/dashboard/tenants/:id/experiments -- Experiments"]
            WIDGETS["/dashboard/tenants/:id/widgets -- Widget Config"]
            SETTINGS["/dashboard/settings -- Account Settings"]
        end

        subgraph "Shared Components"
            SIDEBAR[Sidebar -- Navigation]
            STATCARD[StatCard -- KPI Display]
            DATATABLE[DataTable -- Paginated Tables]
            ERRBOUND[ErrorBoundary -- Error Handling]
            PROTECTED[ProtectedRoute -- Auth Guard]
            THEME[ThemeToggle -- Dark/Light Mode]
        end

        subgraph "Libraries"
            APICLIENT[API Client -- HTTP + Auth]
            TOKENMGR[Token Manager -- In-Memory JWT]
            USEAUTH[useAuth -- Auth State Hook]
        end
    end

    DASH --> SIDEBAR
    ANALYTICS --> STATCARD
    TENANTS --> DATATABLE
    APICLIENT --> TOKENMGR
    USEAUTH --> APICLIENT
```

### 2.5 SDK Architecture

```mermaid
graph LR
    subgraph "RecomEngine SDK (<10KB gzipped)"
        ENTRY[index.ts<br/>Auto-init from script tag]
        API[api.ts<br/>HTTP client for API]
        TRACKER[tracker.ts<br/>Impression + click tracking]
        RENDERER[renderer.ts<br/>Grid, carousel, list layouts]
        CONFIG[config.ts<br/>Widget config loading + caching]
        ASSIGN[assignment.ts<br/>A/B test variant hashing]
    end

    SCRIPT["&lt;script&gt; tag on merchant site"] --> ENTRY
    ENTRY --> CONFIG
    ENTRY --> API
    API --> RENDERER
    RENDERER --> TRACKER
    ENTRY --> ASSIGN

    API -->|"GET /recommendations"| BACKEND["Fastify API (5008)"]
    TRACKER -->|"POST /events"| BACKEND
    CONFIG -->|"GET /widgets/:id"| BACKEND
```

**SDK Design Principles:**
- IIFE wrapper: only `window.RecomEngine` is exposed globally
- Zero npm dependencies in the bundle
- Built with esbuild for tree-shaking and minification
- Graceful degradation: widget hides if API is unreachable; no errors thrown
- Intersection Observer for viewport-based impression tracking
- Shadow DOM (optional) for style isolation from host page

---

## 3. Data Flow Diagrams

### 3.1 Event Ingestion Flow

```mermaid
sequenceDiagram
    participant SDK as JS SDK / Server
    participant API as Fastify API
    participant AUTH as Auth Plugin
    participant VALID as Zod Validator
    participant DEDUP as Dedup Check
    participant DB as PostgreSQL
    participant REDIS as Redis
    participant COUNTER as Analytics Counter

    SDK->>API: POST /api/v1/events {eventType, userId, productId, ...}
    API->>AUTH: Validate API Key (HMAC-SHA256 lookup)
    AUTH-->>API: tenantId + permissions
    API->>VALID: Validate event schema (Zod)
    VALID-->>API: Validated event
    API->>DEDUP: Check (tenantId + userId + eventType + productId + timestamp)
    alt Duplicate
        DEDUP-->>API: Already exists
        API-->>SDK: 200 OK (idempotent)
    else New event
        DEDUP-->>API: Not found
        API->>DB: INSERT INTO events (partitioned table)
        API->>REDIS: INCR analytics counters
        API->>COUNTER: Update real-time counters (impressions, clicks, conversions)
        API-->>SDK: 202 Accepted
    end

    Note over API: Target: <50ms p95
```

### 3.2 Recommendation Request Flow

```mermaid
sequenceDiagram
    participant CLIENT as SDK / API Client
    participant API as Fastify API
    participant AUTH as Auth Plugin
    participant CACHE as Redis Cache
    participant EXP as Experiment Module
    participant RECO as Recommendation Engine
    participant DB as PostgreSQL

    CLIENT->>API: GET /api/v1/recommendations?userId=...&limit=8
    API->>AUTH: Validate API Key
    AUTH-->>API: tenantId + permissions (read)

    API->>EXP: Check active experiments for tenant
    alt Experiment running
        EXP->>EXP: Hash(userId + experimentId) % 100
        EXP-->>API: Assigned strategy (control or variant)
    else No experiment
        EXP-->>API: Use tenant default strategy
    end

    API->>CACHE: GET reco:{tenantId}:{userId}:{strategy}
    alt Cache hit
        CACHE-->>API: Cached recommendations
    else Cache miss
        API->>RECO: Compute recommendations
        RECO->>DB: Query user events + catalog
        DB-->>RECO: User history + product data
        RECO->>RECO: Execute strategy (collaborative / content / trending / fbt)
        RECO-->>API: Ranked product list with scores
        API->>CACHE: SET reco:{tenantId}:{userId}:{strategy} (TTL: 5min)
    end

    API->>DB: Filter out unavailable products, already purchased
    API-->>CLIENT: 200 OK {data: [{productId, name, imageUrl, price, score, reason}]}

    Note over API: Target: <100ms p95
```

### 3.3 A/B Test Assignment Flow

```mermaid
sequenceDiagram
    participant CLIENT as SDK / API Client
    participant API as Fastify API
    participant EXP as Experiment Module
    participant DB as PostgreSQL

    CLIENT->>API: GET /api/v1/recommendations?userId=user-123
    API->>EXP: Get active experiments for tenant + placement
    EXP->>DB: SELECT * FROM experiments WHERE tenantId = ? AND status = 'running'
    DB-->>EXP: Experiment {id: exp-1, control: collaborative, variant: content_based, trafficSplit: 70}

    EXP->>EXP: hash = SHA256(userId + experimentId)
    EXP->>EXP: bucket = hash_to_int(hash) % 100
    alt bucket < trafficSplit (0-69)
        EXP-->>API: Control strategy: "collaborative"
    else bucket >= trafficSplit (70-99)
        EXP-->>API: Variant strategy: "content_based"
    end

    Note over EXP: Deterministic: same user always gets same variant
    Note over EXP: No DB write needed for assignment
```

### 3.4 Analytics Aggregation Flow

```mermaid
sequenceDiagram
    participant EVENT as Event Ingestion
    participant REDIS as Redis Counters
    participant CRON as Nightly Aggregation Job
    participant DB as PostgreSQL
    participant DASH as Dashboard

    Note over EVENT, REDIS: Real-time path (event arrives)
    EVENT->>REDIS: INCR reco:counter:{tenantId}:{date}:impressions
    EVENT->>REDIS: INCR reco:counter:{tenantId}:{date}:clicks
    EVENT->>REDIS: INCR reco:counter:{tenantId}:{date}:conversions
    EVENT->>REDIS: INCRBY reco:counter:{tenantId}:{date}:revenue {amount}

    Note over CRON, DB: Nightly aggregation (02:00 UTC)
    CRON->>REDIS: GET all counters for yesterday
    CRON->>DB: UPSERT INTO analytics_daily (tenantId, date, impressions, clicks, conversions, revenue)
    CRON->>DB: REFRESH MATERIALIZED VIEW analytics_summary

    Note over DASH, DB: Dashboard query path
    DASH->>DB: SELECT from analytics_daily WHERE tenantId = ? AND date BETWEEN ? AND ?
    DB-->>DASH: Time-series data
    DASH->>REDIS: GET today's real-time counters
    REDIS-->>DASH: Live counters for current day
```

---

## 4. Data Architecture

### 4.1 Entity Relationship Diagram

```mermaid
erDiagram
    Admin ||--o{ Tenant : owns
    Tenant ||--o{ ApiKey : has
    Tenant ||--o{ CatalogItem : contains
    Tenant ||--o{ Event : records
    Tenant ||--o{ Experiment : runs
    Tenant ||--o{ AnalyticsDaily : aggregates
    Tenant ||--o{ WidgetConfig : configures
    Experiment ||--o{ ExperimentResult : produces

    Admin {
        string id PK
        string email UK
        string passwordHash
        string role
        datetime createdAt
        datetime updatedAt
    }

    Tenant {
        string id PK
        string name
        string status
        json config
        string ownerId FK
        datetime createdAt
        datetime updatedAt
    }

    ApiKey {
        string id PK
        string keyHash UK
        string keyPrefix
        string permissions
        string tenantId FK
        datetime lastUsedAt
        datetime createdAt
    }

    CatalogItem {
        string id PK
        string tenantId FK
        string productId
        string name
        string category
        decimal price
        string imageUrl
        json attributes
        boolean available
        datetime createdAt
        datetime updatedAt
    }

    Event {
        string id PK
        string tenantId FK
        string eventType
        string userId
        string productId
        string sessionId
        json metadata
        datetime timestamp
        datetime createdAt
    }

    Experiment {
        string id PK
        string tenantId FK
        string name
        string controlStrategy
        string variantStrategy
        int trafficSplit
        string metric
        string status
        string placementId
        datetime startedAt
        datetime completedAt
        datetime createdAt
        datetime updatedAt
    }

    ExperimentResult {
        string id PK
        string experimentId FK
        string variant
        int impressions
        int clicks
        int conversions
        decimal revenue
        int sampleSize
        datetime computedAt
    }

    AnalyticsDaily {
        string id PK
        string tenantId FK
        date date
        int impressions
        int clicks
        int conversions
        decimal revenue
        string placementId
        string strategy
    }

    WidgetConfig {
        string id PK
        string tenantId FK
        string placementId UK
        string layout
        int columns
        json theme
        int maxItems
        boolean showPrice
        string ctaText
        datetime createdAt
        datetime updatedAt
    }
```

### 4.2 Event Storage Strategy

Events are the highest-volume table. PostgreSQL native range partitioning by month is used:

- **Partition key**: `created_at` (timestamp of record insertion)
- **Partition interval**: Monthly (`events_2026_01`, `events_2026_02`, ...)
- **Partition pruning**: PostgreSQL query planner automatically skips irrelevant partitions
- **Retention**: Raw events retained for 90 days; older partitions detached and archived
- **Indexes per partition**: `(tenant_id, timestamp)`, `(tenant_id, user_id, event_type)`, `(tenant_id, product_id)`

See [ADR-002: Event Storage Strategy](ADRs/002-event-storage-strategy.md) for full rationale.

### 4.3 Data Isolation

All data tables include a `tenant_id` column. Tenant isolation is enforced at two levels:

1. **Application level**: A Prisma middleware automatically injects `tenant_id` into all WHERE clauses. Every service method receives `tenantId` from the authenticated context.
2. **Index level**: All query-critical indexes are prefixed with `tenant_id` to ensure efficient per-tenant queries.

Future enhancement: PostgreSQL Row-Level Security (RLS) for defense-in-depth (Phase 2).

---

## 5. Caching Strategy

### 5.1 Redis Key Patterns

| Key Pattern | Value | TTL | Purpose |
|-------------|-------|-----|---------|
| `reco:{tenantId}:{userId}:{strategy}` | JSON array of `{productId, score}` | 5 min | Pre-computed recommendations |
| `reco:trending:{tenantId}` | JSON array of `{productId, velocity}` | 15 min | Trending products (global per tenant) |
| `reco:fbt:{tenantId}:{productId}` | JSON array of `{productId, cooccurrence}` | 30 min | Frequently bought together |
| `reco:counter:{tenantId}:{date}:impressions` | Integer | 48 hours | Real-time impression count |
| `reco:counter:{tenantId}:{date}:clicks` | Integer | 48 hours | Real-time click count |
| `reco:counter:{tenantId}:{date}:conversions` | Integer | 48 hours | Real-time conversion count |
| `reco:counter:{tenantId}:{date}:revenue` | Integer (cents) | 48 hours | Real-time revenue (in cents) |
| `reco:widget:{tenantId}:{placementId}` | JSON widget config | 60 sec | Widget configuration cache |
| `reco:catalog:{tenantId}:available` | Set of productIds | 10 min | Available products for filtering |
| `reco:ratelimit:{apiKeyPrefix}:{window}` | Counter | Per window | Rate limit tracking |
| `reco:dedup:{tenantId}:{hash}` | `1` | 24 hours | Event deduplication bloom filter fallback |
| `jti:blacklist:{jti}` | `1` | Matches token expiry | Revoked JWT tracking |

### 5.2 Cache Invalidation Rules

| Trigger | Action |
|---------|--------|
| Catalog item updated/deleted | Delete `reco:catalog:{tenantId}:available`; delete all `reco:{tenantId}:*` keys for affected strategy |
| Widget config saved | Delete `reco:widget:{tenantId}:{placementId}` |
| Tenant config changed (default strategy) | Delete all `reco:{tenantId}:*` keys |
| Experiment started/stopped | No cache invalidation needed (strategy resolved at request time) |
| Nightly aggregation completes | Delete `reco:counter:{tenantId}:{yesterday}:*` after persisting to DB |

### 5.3 Cache Miss Strategy

On cache miss for recommendations:
1. Compute recommendations synchronously (target: <80ms for computation alone)
2. Write result to Redis with TTL
3. Return result to client

This synchronous fallback is acceptable because:
- Collaborative filtering uses a pre-computed similarity matrix (refreshed every 15 minutes)
- Content-based uses pre-indexed catalog attributes
- Trending reads from materialized counters
- Only frequently_bought_together requires a live DB query

---

## 6. Security Architecture

### 6.1 Authentication Model

```mermaid
graph TB
    subgraph "Dashboard Auth (JWT)"
        SIGNUP[POST /signup] --> BCRYPT[bcrypt hash, cost 12]
        LOGIN[POST /login] --> VERIFY[Verify password]
        VERIFY --> JWT[Issue JWT access token, 1hr]
        VERIFY --> REFRESH[Set HttpOnly refresh cookie, 7d]
        JWT --> HEADER[Authorization: Bearer {token}]
        HEADER --> VALIDATE[Validate + decode JWT]
        VALIDATE --> ADMIN_ROUTES[Admin-only routes: tenants, experiments, analytics]
    end

    subgraph "API Auth (API Key)"
        APIKEY[API Key: rk_live_...]
        APIKEY --> HMAC[HMAC-SHA256 hash]
        HMAC --> LOOKUP[Lookup keyHash in DB]
        LOOKUP --> PERMS{Check permissions}
        PERMS -->|read| READ_ROUTES[Recommendations, catalog queries, widget config]
        PERMS -->|read-write| WRITE_ROUTES[Events, catalog CRUD, everything]
    end
```

### 6.2 Security Layers

| Layer | Mechanism | Implementation |
|-------|-----------|----------------|
| Transport | TLS 1.2+ | Enforced at load balancer / reverse proxy |
| Authentication | JWT + API Key dual auth | Auth Plugin (ConnectSW shared) |
| Authorization | Permission-based (read / read-write) | `requirePermission()` decorator |
| Rate Limiting | Per-API-key distributed limits | Redis Rate Limit Store (1000 read/min, 500 write/min) |
| Input Validation | Schema-first validation | Zod schemas on all endpoints |
| Data Isolation | Tenant-scoped queries | Prisma middleware injects `tenantId` |
| Password Storage | bcrypt cost factor 12 | ConnectSW Crypto Utils |
| API Key Storage | HMAC-SHA256 hashing | ConnectSW Crypto Utils (API_KEY_HMAC_SECRET) |
| Security Headers | Helmet defaults | @fastify/helmet |
| CORS | Per-tenant origin whitelist | @fastify/cors with dynamic origin lookup |
| CSRF | SameSite cookies + custom header | Double-submit cookie pattern for dashboard |
| SDK Isolation | IIFE scope, optional Shadow DOM | No global pollution beyond `window.RecomEngine` |

### 6.3 API Key Lifecycle

```
Generate (admin action)
  --> Full key shown ONCE (rk_live_abc123...)
  --> Key stored as HMAC-SHA256 hash
  --> Prefix stored for identification (rk_live_abc)
  --> On API request: compute HMAC of provided key, lookup hash
  --> lastUsedAt updated on each successful auth
  --> Revoke: soft delete (keyHash retained for audit trail)
```

---

## 7. Deployment Architecture

### 7.1 Local Development

```mermaid
graph LR
    subgraph "Developer Machine"
        WEB[Next.js Dev Server<br/>Port 3112]
        API[Fastify Dev Server<br/>Port 5008]
    end

    subgraph "Docker Compose"
        PG[(PostgreSQL 15<br/>Port 5432<br/>DB: recomengine_dev)]
        REDIS[(Redis 7<br/>Port 6379)]
    end

    WEB -->|REST API calls| API
    API -->|Prisma| PG
    API -->|ioredis| REDIS
```

### 7.2 Production Architecture

```mermaid
graph TB
    subgraph "Edge Layer"
        CDN[CDN / Cloudflare<br/>SDK distribution + static assets]
        LB[Load Balancer<br/>TLS termination, health checks]
    end

    subgraph "Application Layer"
        API1[API Instance 1<br/>Fastify, Port 5008]
        API2[API Instance 2<br/>Fastify, Port 5008]
        APIN[API Instance N<br/>Fastify, Port 5008]
        WEB1[Web Instance 1<br/>Next.js, Port 3112]
    end

    subgraph "Data Layer"
        PG_PRIMARY[(PostgreSQL Primary<br/>Partitioned events)]
        PG_REPLICA[(PostgreSQL Replica<br/>Read-only analytics)]
        REDIS_PRIMARY[(Redis Primary<br/>Cache + rate limits)]
        REDIS_REPLICA[(Redis Replica<br/>Read-only cache)]
    end

    CDN --> LB
    LB --> API1
    LB --> API2
    LB --> APIN
    LB --> WEB1

    API1 --> PG_PRIMARY
    API1 --> REDIS_PRIMARY
    API2 --> PG_PRIMARY
    API2 --> REDIS_PRIMARY
    APIN --> PG_PRIMARY
    APIN --> REDIS_PRIMARY

    API1 -.->|Read queries| PG_REPLICA
    API2 -.->|Read queries| PG_REPLICA
    API1 -.->|Cache reads| REDIS_REPLICA
```

**Scaling Strategy:**
- API layer is stateless; scale horizontally by adding instances behind the load balancer
- PostgreSQL read replicas for analytics queries (heavy reads)
- Redis replica for cache reads (recommendation serving)
- SDK served entirely from CDN (no API server load for SDK delivery)

### 7.3 Infrastructure Requirements

| Component | Development | Production (MVP Launch) |
|-----------|------------|------------------------|
| API Instances | 1 | 2 (auto-scaling to 4) |
| Web Instances | 1 | 1 |
| PostgreSQL | Single (Docker) | Primary + 1 Replica (managed, e.g., RDS) |
| Redis | Single (Docker) | Primary + 1 Replica (managed, e.g., ElastiCache) |
| CDN | None (local SDK file) | Cloudflare |
| Monitoring | Console logging | Structured logs + metrics endpoint |

---

## 8. Observability

### 8.1 Logging

All structured logging via the ConnectSW Logger utility:

- **Format**: JSON in production, human-readable in development
- **Levels**: error, warn, info, debug (configurable via `LOG_LEVEL`)
- **PII redaction**: Automatic redaction of password, token, apiKey, authorization fields
- **Correlation ID**: Every request gets a unique `X-Request-ID` header (generated by Observability Plugin)

### 8.2 Metrics

Exposed via `GET /internal/metrics` (protected by `INTERNAL_API_KEY`):

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total requests by method, path, status |
| `http_request_duration_ms` | Histogram | p50, p95, p99 latency |
| `recommendation_cache_hit_ratio` | Gauge | Cache hits / total recommendation requests |
| `event_ingestion_throughput` | Counter | Events ingested per second |
| `recommendation_latency_ms` | Histogram | Recommendation computation time (excludes cache hits) |
| `active_experiments` | Gauge | Currently running experiments |
| `error_rate` | Gauge | 5xx errors / total requests (rolling 5 min window) |

### 8.3 Health Checks

| Endpoint | Type | Checks |
|----------|------|--------|
| `GET /health` | Liveness | Process is running, can accept HTTP |
| `GET /ready` | Readiness | PostgreSQL connected, Redis connected, Prisma ready |

---

## 9. Technology Decisions

| Decision | Choice | Rationale | ADR |
|----------|--------|-----------|-----|
| Architecture style | Modular monolith | Simplicity for MVP; module boundaries allow future extraction | [ADR-001](ADRs/001-monolith-architecture.md) |
| Event storage | PostgreSQL partitioned tables | No additional dependency; native partitioning is sufficient for MVP scale | [ADR-002](ADRs/002-event-storage-strategy.md) |
| Recommendation caching | Redis with 5-min TTL | <100ms p95 target; in-memory cache for hot data | [ADR-003](ADRs/003-recommendation-caching.md) |
| Backend framework | Fastify 4 | ConnectSW standard; plugin architecture; high performance | Company standard |
| ORM | Prisma 5 | ConnectSW standard; type-safe; migration tooling | Company standard |
| Frontend | Next.js 14 + React 18 | ConnectSW standard; SSR for landing pages; App Router | Company standard |
| Styling | Tailwind CSS | ConnectSW standard; utility-first; rapid UI development | Company standard |
| SDK bundler | esbuild | Fastest build; smallest output; tree-shaking | Performance requirement |
| Auth | JWT + HMAC API Keys | ConnectSW Auth Plugin (production-tested) | Company standard |
| Rate limiting | Redis-backed per-key | ConnectSW Redis Rate Limit Store (distributed) | Company standard |

---

## 10. Reused ConnectSW Components

| Component | Source | Adaptation Needed |
|-----------|--------|-------------------|
| Auth Plugin | `@connectsw/shared` or `stablecoin-gateway` | Change permissions from `read/write/refund` to `read/read-write`; add tenant context |
| Prisma Plugin | `@connectsw/shared` or `stablecoin-gateway` | None (copy as-is) |
| Redis Plugin | `@connectsw/shared` or `stablecoin-gateway` | None (copy as-is) |
| Observability Plugin | `stablecoin-gateway` | None (copy as-is) |
| Logger | `@connectsw/shared` or `stablecoin-gateway` | None (copy as-is) |
| Crypto Utils | `@connectsw/shared` or `stablecoin-gateway` | Change key prefix from `sk_live_` to `rk_live_` |
| Redis Rate Limit Store | `stablecoin-gateway` | None (copy as-is) |
| Error Classes | `invoiceforge` | None (copy as-is) |
| Pagination Helper | `invoiceforge` | None (copy as-is) |
| Token Manager | `stablecoin-gateway` (frontend) | None (copy as-is) |
| useAuth hook | `stablecoin-gateway` (frontend) | Update API client import |
| StatCard | `stablecoin-gateway` (frontend) | None (copy as-is) |
| ErrorBoundary | `stablecoin-gateway` (frontend) | None (copy as-is) |
| ProtectedRoute | `stablecoin-gateway` (frontend) | None (copy as-is) |

---

## 11. Performance Budget

| Operation | Target (p95) | Strategy |
|-----------|-------------|----------|
| Recommendation API response | <100ms | Redis cache (5-min TTL); pre-computed similarity matrix |
| Event ingestion (single) | <50ms | Async counter updates; lightweight validation |
| Event ingestion (batch, 100) | <200ms | Bulk INSERT; parallel validation |
| Dashboard page load (LCP) | <2s | SSR for initial render; lazy-load charts |
| SDK bundle load | <100ms | <10KB gzipped; CDN delivery; async loading |
| Widget render (after API response) | <200ms | Minimal DOM operations; no framework overhead |
| Analytics query (30-day range) | <500ms | Materialized views; partitioned event tables |

---

## 12. Future Considerations (Post-MVP)

1. **Worker Extraction**: If recommendation computation exceeds in-process time budgets, extract to a dedicated worker service communicating via Redis pub/sub or a job queue.
2. **Read Replicas**: Route analytics and recommendation read queries to PostgreSQL replicas to reduce primary load.
3. **Row-Level Security**: Add PostgreSQL RLS policies for defense-in-depth tenant isolation.
4. **Streaming Pipeline**: If event ingestion exceeds PostgreSQL write capacity, introduce a Kafka/Redis Streams buffer.
5. **ML Model Service**: Replace in-process recommendation algorithms with a Python-based model service for advanced ML (embeddings, deep learning).
6. **Multi-Region**: Deploy API instances in multiple regions with regional Redis caches for global <100ms latency.

---

## 13. Traceability Matrix

### User Story to Functional Requirement to Endpoint to Table

| US/Feature | FR IDs | API Endpoint(s) | DB Table(s) | Module |
|------------|--------|-----------------|-------------|--------|
| **F-001: Tenant Management** | FR-001, FR-002, FR-003, FR-004, FR-005 | `POST /api/v1/tenants`, `GET /api/v1/tenants`, `GET /api/v1/tenants/:id`, `PUT /api/v1/tenants/:id`, `DELETE /api/v1/tenants/:id` | `tenants`, `admins` | `tenants/` |
| **F-002: API Key Provisioning** | FR-006, FR-007, FR-008, FR-009, FR-010 | `POST /api/v1/tenants/:id/api-keys`, `GET /api/v1/tenants/:id/api-keys`, `DELETE /api/v1/tenants/:id/api-keys/:keyId` | `api_keys` | `api-keys/` |
| **F-003: Event Ingestion** | FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017 | `POST /api/v1/events`, `POST /api/v1/events/batch` | `events` (partitioned) | `events/` |
| **F-004: Catalog Management** | FR-018, FR-019, FR-020, FR-021, FR-022, FR-023 | `POST /api/v1/catalog`, `POST /api/v1/catalog/batch`, `GET /api/v1/catalog`, `GET /api/v1/catalog/:productId`, `PUT /api/v1/catalog/:productId`, `DELETE /api/v1/catalog/:productId` | `catalog_items` | `catalog/` |
| **F-005: Recommendation Engine** | FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-031, FR-032 | `GET /api/v1/recommendations` | `events`, `catalog_items`, Redis cache | `recommendations/` |
| **F-006: Configurable Strategies** | FR-026, FR-027, FR-028, FR-029 | `GET /api/v1/recommendations?strategy=...` | `events`, `catalog_items` | `recommendations/` |
| **F-007: JavaScript SDK** | FR-033, FR-034, FR-035, FR-036, FR-037, FR-038, FR-039, FR-040, FR-041 | `GET /api/v1/recommendations`, `POST /api/v1/events`, `GET /api/v1/tenants/:id/widgets/:wid` | `events`, `widget_configs` | `sdk/` (client-side) |
| **F-008: A/B Testing** | FR-042, FR-043, FR-044, FR-045, FR-046, FR-047, FR-048 | `POST /api/v1/tenants/:id/experiments`, `GET /api/v1/tenants/:id/experiments`, `GET /api/v1/tenants/:id/experiments/:expId`, `PUT /api/v1/tenants/:id/experiments/:expId`, `DELETE /api/v1/tenants/:id/experiments/:expId`, `GET /api/v1/tenants/:id/experiments/:expId/results` | `experiments`, `experiment_results` | `experiments/` |
| **F-009: Analytics Dashboard** | FR-049, FR-050, FR-051, FR-052, FR-053, FR-054, FR-055, FR-056 | `GET /api/v1/tenants/:id/analytics/overview`, `GET /api/v1/tenants/:id/analytics/timeseries`, `GET /api/v1/tenants/:id/analytics/top-products`, `GET /api/v1/tenants/:id/analytics/export` | `analytics_daily`, `analytics_summary` (mat. view), `top_recommended_products` (mat. view), Redis counters | `analytics/` |
| **F-010: REST API** | FR-057, FR-058, FR-059, FR-060, FR-061, FR-062 | All endpoints (versioned under `/api/v1/`) | All tables | All modules |
| **F-011: Experiment Results API** | FR-045 | `GET /api/v1/tenants/:id/experiments/:expId/results` | `experiment_results`, `events` | `experiments/` |
| **F-012: Widget Customization** | FR-035 (SDK rendering) | `POST /api/v1/tenants/:id/widgets`, `GET /api/v1/tenants/:id/widgets`, `GET /api/v1/tenants/:id/widgets/:wid`, `PUT /api/v1/tenants/:id/widgets/:wid`, `DELETE /api/v1/tenants/:id/widgets/:wid` | `widget_configs` | `widgets/` |
| **Auth (cross-cutting)** | NFR-014, NFR-015 | `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password` | `admins` | `auth/` |
| **Health (cross-cutting)** | NFR-017 | `GET /health`, `GET /ready` | N/A (checks DB + Redis connectivity) | `health/` |

### Non-Functional Requirement to Implementation

| NFR ID | Requirement | Implementation |
|--------|-------------|----------------|
| NFR-001 | Recommendations <100ms p95 | Redis cache (5-min TTL), pre-computed similarity matrix |
| NFR-002 | Event ingestion <50ms p95 | Async Redis counter updates, lightweight Zod validation |
| NFR-003 | Batch ingestion (100) <200ms p95 | Bulk INSERT, parallel validation |
| NFR-004 | Dashboard LCP <2s | SSR for initial render, lazy-loaded charts |
| NFR-005 | SDK <10KB gzipped | esbuild bundling, zero npm dependencies |
| NFR-006 | Widget render <200ms | Minimal DOM operations, no framework in SDK |
| NFR-007 | Analytics query <500ms (100M events) | Materialized views, partitioned event tables, pre-aggregated `analytics_daily` |
| NFR-008 | TLS 1.2+ | Enforced at load balancer / reverse proxy |
| NFR-009 | API key HMAC-SHA256 storage | ConnectSW Crypto Utils, `api_keys.key_hash` column |
| NFR-010 | Tenant data isolation | Prisma middleware injects `tenant_id` in all WHERE clauses |
| NFR-011 | Rate limiting (1000 read, 500 write/min) | Redis Rate Limit Store, `@fastify/rate-limit` |
| NFR-012 | CSRF protection | SameSite cookies + custom header (double-submit cookie) |
| NFR-013 | SDK no third-party requests | IIFE scope, zero external dependencies |
| NFR-014 | JWT 1hr access + 7d refresh | `@fastify/jwt`, HttpOnly cookie for refresh |
| NFR-015 | bcrypt cost 12 | ConnectSW Crypto Utils |
| NFR-016 | Zod validation on all inputs | `schemas.ts` per module with Zod schemas |
| NFR-017 | 99.9% uptime SLA | Multiple API instances, health checks, auto-restart |
| NFR-018 | At-least-once event delivery | Idempotent dedup on `(tenant_id, user_id, event_type, product_id, timestamp)` |
| NFR-019 | Daily DB backups (30d retention) | Managed PostgreSQL backup policy |
| NFR-020 | Cached results on model failure | Redis cache returns stale data; graceful degradation |
| NFR-021 | SDK silent failure | `try/catch` around all SDK API calls; widget hidden on error |
| NFR-022 | 1,000 concurrent tenants | Stateless API, connection pooling, tenant-scoped queries |
| NFR-023 | 10,000 events/sec aggregate | Partitioned events table, bulk INSERT, Redis counters |
| NFR-024 | 5,000 recommendations/sec | Redis cache (>95% hit rate), horizontal API scaling |
| NFR-025 | 1B+ events, 10M+ catalog items | Monthly partitions, detach/archive old partitions |
| NFR-026 | Horizontal scaling | Stateless Fastify API behind load balancer |
| NFR-027 | WCAG 2.1 AA (dashboard) | Semantic HTML, ARIA labels, keyboard navigation |
| NFR-028 | Keyboard navigation | Tab order, focus management, keyboard shortcuts |
| NFR-029 | Color contrast >= 4.5:1 | Tailwind color palette validated against WCAG |
| NFR-030 | Screen reader compatible | ARIA labels on charts and data tables |
| NFR-031 | Correlation ID logging | Observability Plugin generates `X-Request-ID` |
| NFR-032 | Metrics (latency, throughput, errors) | `GET /internal/metrics` endpoint |
| NFR-033 | Alerting thresholds | Configurable via monitoring integration (Phase 2) |
| NFR-034 | 90-day log retention | Structured JSON logging to external aggregator |

### Endpoint Inventory (34 endpoints)

| # | Method | Path | Auth | Module | FR(s) |
|---|--------|------|------|--------|-------|
| 1 | POST | `/api/v1/auth/signup` | None | auth | NFR-014 |
| 2 | POST | `/api/v1/auth/login` | None | auth | NFR-014 |
| 3 | POST | `/api/v1/auth/logout` | JWT | auth | NFR-014 |
| 4 | POST | `/api/v1/auth/forgot-password` | None | auth | NFR-014 |
| 5 | POST | `/api/v1/auth/reset-password` | None | auth | NFR-014 |
| 6 | GET | `/api/v1/tenants` | JWT | tenants | FR-005 |
| 7 | POST | `/api/v1/tenants` | JWT | tenants | FR-001 |
| 8 | GET | `/api/v1/tenants/:id` | JWT | tenants | FR-001 |
| 9 | PUT | `/api/v1/tenants/:id` | JWT | tenants | FR-003, FR-004 |
| 10 | DELETE | `/api/v1/tenants/:id` | JWT | tenants | FR-003 |
| 11 | GET | `/api/v1/tenants/:id/api-keys` | JWT | api-keys | FR-006 |
| 12 | POST | `/api/v1/tenants/:id/api-keys` | JWT | api-keys | FR-006, FR-007, FR-010 |
| 13 | DELETE | `/api/v1/tenants/:id/api-keys/:keyId` | JWT | api-keys | FR-008 |
| 14 | POST | `/api/v1/events` | API Key (write) | events | FR-011, FR-013, FR-014, FR-015, FR-016 |
| 15 | POST | `/api/v1/events/batch` | API Key (write) | events | FR-012, FR-013, FR-014, FR-015, FR-016 |
| 16 | GET | `/api/v1/catalog` | API Key | catalog | FR-023 |
| 17 | POST | `/api/v1/catalog` | API Key (write) | catalog | FR-018, FR-020 |
| 18 | POST | `/api/v1/catalog/batch` | API Key (write) | catalog | FR-019, FR-020 |
| 19 | GET | `/api/v1/catalog/:productId` | API Key | catalog | FR-023 |
| 20 | PUT | `/api/v1/catalog/:productId` | API Key (write) | catalog | FR-021 |
| 21 | DELETE | `/api/v1/catalog/:productId` | API Key (write) | catalog | FR-022 |
| 22 | GET | `/api/v1/recommendations` | API Key (read) | recommendations | FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-031, FR-032 |
| 23 | GET | `/api/v1/tenants/:id/experiments` | JWT | experiments | FR-042 |
| 24 | POST | `/api/v1/tenants/:id/experiments` | JWT | experiments | FR-042, FR-043 |
| 25 | GET | `/api/v1/tenants/:id/experiments/:expId` | JWT | experiments | FR-042 |
| 26 | PUT | `/api/v1/tenants/:id/experiments/:expId` | JWT | experiments | FR-046, FR-047 |
| 27 | DELETE | `/api/v1/tenants/:id/experiments/:expId` | JWT | experiments | FR-048 |
| 28 | GET | `/api/v1/tenants/:id/experiments/:expId/results` | JWT | experiments | FR-045 |
| 29 | GET | `/api/v1/tenants/:id/analytics/overview` | JWT | analytics | FR-049, FR-052 |
| 30 | GET | `/api/v1/tenants/:id/analytics/timeseries` | JWT | analytics | FR-050, FR-052 |
| 31 | GET | `/api/v1/tenants/:id/analytics/top-products` | JWT | analytics | FR-051 |
| 32 | GET | `/api/v1/tenants/:id/analytics/export` | JWT | analytics | FR-056 |
| 33 | GET | `/health` | None | health | NFR-017 |
| 34 | GET | `/ready` | None | health | NFR-017 |

### Tenant State Machine

```mermaid
stateDiagram-v2
    [*] --> active : POST /tenants
    active --> suspended : PUT /tenants/:id {status: suspended}
    suspended --> active : PUT /tenants/:id {status: active}
    active --> deleted : DELETE /tenants/:id
    suspended --> deleted : DELETE /tenants/:id
    deleted --> [*] : 30-day retention, then purge

    note right of active
        All API operations allowed.
        SDK/API requests served normally.
    end note

    note right of suspended
        SDK/API requests return 403.
        Dashboard read-only.
        Data preserved.
    end note

    note right of deleted
        Soft delete. Data retained 30 days.
        All API keys revoked immediately.
    end note
```

### Experiment State Machine

```mermaid
stateDiagram-v2
    [*] --> draft : POST /experiments
    draft --> running : PUT {status: running}
    running --> paused : PUT {status: paused}
    running --> completed : PUT {status: completed}
    paused --> running : PUT {status: running}
    paused --> completed : PUT {status: completed}
    draft --> [*] : DELETE
    completed --> [*] : DELETE (after 90d)

    note right of running
        Traffic split active.
        Results computed in real-time.
        Only 1 running per placement.
    end note
```

### Revenue Attribution Flow

```mermaid
sequenceDiagram
    participant USER as Shopper
    participant SDK as JS SDK
    participant API as Fastify API
    participant DB as PostgreSQL

    USER->>SDK: Clicks recommendation (productId: P1)
    SDK->>API: POST /events {type: recommendation_clicked, userId: U1, productId: P1}
    API->>DB: INSERT event (click_event_id = E1, timestamp = T1)

    Note over USER: User browses, adds to cart...

    USER->>SDK: Completes purchase (productId: P1)
    SDK->>API: POST /events {type: purchase, userId: U1, productId: P1, metadata: {price: 49.99}}
    API->>DB: INSERT event (purchase_event_id = E2, timestamp = T2)

    API->>API: Check: T2 - T1 <= 30 minutes?
    alt Within attribution window
        API->>DB: INSERT revenue_attribution {userId: U1, productId: P1, click: E1, purchase: E2, revenue: 49.99}
    else Outside window
        Note over API: No attribution (purchase too late)
    end
```

---

**End of Architecture Document**
