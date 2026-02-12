# RecomEngine -- Agent Context Addendum

This document provides product-specific context for ConnectSW agents working on RecomEngine.

## Product Overview

**Name**: RecomEngine
**Tagline**: AI-Powered Product Recommendation Orchestrator for E-Commerce
**Type**: Web App (Full B2B SaaS Product)
**Status**: Architecture Complete
**Product Directory**: `products/recomengine/`
**Frontend Port**: 3112
**Backend Port**: 5008
**Database**: PostgreSQL (database name: `recomengine_dev`)
**Redis**: Shared Redis instance (6379)

**What It Does**: RecomEngine is a B2B SaaS product recommendation orchestrator. E-commerce businesses integrate via a REST API and embeddable JavaScript SDK to display personalized product recommendations on their sites. The platform ingests real-time behavioral events (views, clicks, purchases), runs configurable recommendation algorithms (collaborative filtering, content-based, trending, frequently bought together), and provides an A/B testing framework to compare strategies. A web dashboard delivers real-time analytics on recommendation performance, CTR, and revenue attribution.

**Target Users**: Mid-market e-commerce businesses ($1M-$100M revenue), multi-tenant marketplace platforms, SaaS e-commerce providers.

**Monetization**: Usage-based pricing (to be finalized by CEO). Expected tiers based on events ingested and recommendation requests served per month.

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| `/` | MVP | Landing page (marketing, features, pricing) |
| `/signup` | MVP | Admin registration |
| `/login` | MVP | Admin login |
| `/forgot-password` | MVP | Password reset request |
| `/reset-password` | MVP | Password reset with token |
| `/dashboard` | MVP | Main dashboard (KPI overview across all tenants) |
| `/dashboard/tenants` | MVP | Tenant list (create, manage, suspend) |
| `/dashboard/tenants/:id` | MVP | Tenant detail (config, API keys, usage) |
| `/dashboard/tenants/:id/analytics` | MVP | Per-tenant analytics |
| `/dashboard/tenants/:id/catalog` | MVP | Per-tenant catalog browser |
| `/dashboard/tenants/:id/events` | MVP | Per-tenant event stream viewer |
| `/dashboard/tenants/:id/experiments` | MVP | Per-tenant experiment list |
| `/dashboard/tenants/:id/experiments/new` | MVP | Create new A/B experiment |
| `/dashboard/tenants/:id/experiments/:expId` | MVP | Experiment detail and results |
| `/dashboard/tenants/:id/widgets` | MVP | Widget config and preview |
| `/dashboard/tenants/:id/api-keys` | MVP | API key management |
| `/dashboard/settings` | MVP | Account settings |
| `/dashboard/settings/billing` | Phase 2 | Subscription billing (Coming Soon) |
| `/dashboard/settings/team` | Phase 2 | Team management (Coming Soon) |
| `/docs` | MVP | API documentation |
| `/docs/quickstart` | MVP | Quick start guide |
| `/docs/sdk` | MVP | JavaScript SDK reference |
| `/docs/api-reference` | MVP | REST API reference |
| `/docs/events` | MVP | Event schema guide |
| `/docs/experiments` | MVP | A/B testing guide |
| `/pricing` | MVP | Pricing page |

## Business Logic

### Multi-Tenant Architecture

RecomEngine is fundamentally multi-tenant. Every data record (events, catalog items, recommendations, experiments, analytics) is scoped by `tenantId`. A single admin account can manage multiple tenants.

**Tenant lifecycle**:
```
Created (active) --> Suspended --> Reactivated (active)
                 --> Deleted (soft delete, data retained 30 days)
```

- Active: All API operations allowed.
- Suspended: SDK/API requests return 403. Dashboard read-only. Data preserved.
- Deleted: Soft delete. Data purged after 30-day retention period.

### API Key Model

Each tenant has its own set of API keys. Keys are scoped with permissions:
- **read**: Can request recommendations, query catalog, query analytics. Used in the JavaScript SDK (client-side).
- **read-write**: Can ingest events, manage catalog, manage experiments. Used in server-to-server integration.

Key format: `rk_live_` prefix for production, `rk_test_` prefix for sandbox. Keys are stored as HMAC-SHA256 hashes using the ConnectSW Crypto Utils pattern.

Maximum 10 active keys per tenant.

### Event Ingestion Rules

Events are the core data input. All recommendation quality depends on event volume and accuracy.

**Supported event types**:
| Event Type | Required Fields | Description |
|------------|----------------|-------------|
| `product_viewed` | userId, productId | User viewed a product detail page |
| `product_clicked` | userId, productId | User clicked a product from a listing |
| `add_to_cart` | userId, productId | User added product to cart |
| `remove_from_cart` | userId, productId | User removed product from cart |
| `purchase` | userId, productId, metadata.price | User completed a purchase |
| `recommendation_clicked` | userId, productId, metadata.placementId | User clicked a recommendation (auto-tracked by SDK) |
| `recommendation_impressed` | userId, productId, metadata.placementId | Recommendation was displayed to user (auto-tracked by SDK) |

**Validation rules**:
- `userId`: Required, string, 1-256 characters. This is the merchant's user identifier (not a RecomEngine user).
- `productId`: Required, string, 1-256 characters. Must exist in the tenant's catalog (warning logged if missing, event still accepted).
- `timestamp`: ISO 8601 format. If omitted, server time is used. Events with timestamps >24 hours in the past are accepted but flagged.
- `metadata`: Optional JSON object, max 4KB. Validated as valid JSON.
- `sessionId`: Optional string for session-level analysis.

**Deduplication**: Events are deduplicated on (tenantId + userId + eventType + productId + timestamp). Duplicate submissions return 200 without creating a new record.

**Batch ingestion**: POST `/api/v1/events/batch` accepts an array of up to 100 events. Response includes count of accepted and rejected events with per-event error details.

### Recommendation Strategies

Four built-in strategies for MVP:

1. **Collaborative Filtering** (`collaborative`):
   - Finds users with similar behavior patterns (user-user similarity via cosine similarity on interaction vectors).
   - Recommends products that similar users interacted with but the target user has not.
   - Minimum data: 1,000 unique users with 5+ events each.
   - Model retrain: incremental every 15 minutes, full daily.

2. **Content-Based** (`content_based`):
   - Computes product similarity from catalog attributes (category, description keywords, price range).
   - Recommends products similar to ones the user has viewed or purchased.
   - Works well for small catalogs (50+ products) and new users with 1+ event.

3. **Trending** (`trending`):
   - Ranks products by interaction velocity (weighted: views=1, clicks=2, add-to-cart=3, purchases=5) in the last 24 hours.
   - Global to the tenant (not personalized per user).
   - Default fallback for cold-start users (0 events).

4. **Frequently Bought Together** (`frequently_bought_together`):
   - Co-occurrence analysis: products purchased in the same session or by the same user within 7 days.
   - Requires a `productId` parameter in the request (context-dependent).
   - Minimum data: 100 purchase events with 2+ items per session.

**Cold-start handling**:
- New user (0-4 events): trending strategy fallback.
- New product (0 interactions): content-based using catalog attributes.
- Response includes `meta.strategy` and `meta.isFallback: true` when fallback is used.

### A/B Testing Statistical Model

- **Assignment**: Deterministic hash of `userId + experimentId` (SHA-256, mod traffic split). Ensures consistent variant assignment across sessions.
- **Metrics**: CTR (clicks / impressions), conversion rate (purchases / unique users), revenue per visitor (attributed revenue / unique users).
- **Statistical test**: Two-proportion z-test for CTR and conversion rate; Welch's t-test for revenue per visitor.
- **Significance threshold**: alpha = 0.05 (95% confidence).
- **Minimum sample size warning**: If either variant has <500 users, dashboard displays "low confidence" badge.
- **Experiment states**: `draft` -> `running` -> `paused` | `completed`. Only `running` experiments affect traffic.
- **Constraint**: Maximum 1 running experiment per placement per tenant.

### Analytics Aggregation

Analytics are pre-aggregated for dashboard performance:
- **Real-time counters**: Redis-backed counters for impressions, clicks, conversions (updated on event ingestion).
- **Daily aggregates**: PostgreSQL materialized views computed nightly for historical reporting.
- **Revenue attribution**: A purchase event within 30 minutes of a `recommendation_clicked` event for the same user and product is attributed to the recommendation.
- **Data retention**: Real-time counters: 7 days. Daily aggregates: 1 year. Raw events: 90 days (then archived to daily summaries).

### Widget Configuration

Widget appearance is configurable per tenant per placement:
- `layout`: `grid` (default), `carousel`, `list`
- `columns`: 2-6 (default 4)
- `showPrice`: boolean (default true)
- `showRating`: boolean (default false, Phase 2)
- `ctaText`: string (default "View Product")
- `maxItems`: 4-20 (default 8)
- `theme.primaryColor`: hex color (default "#2563EB")
- `theme.fontFamily`: string (default inherits from host page)

Widget config changes propagate to the SDK within 60 seconds (config cached with short TTL).

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | Node.js | 20+ | LTS |
| Language | TypeScript | 5+ | All code |
| Frontend | Next.js 14 + React 18 | 14.x / 18.x | App Router, SSR for landing/docs pages |
| Styling | Tailwind CSS | 3.x | Utility-first |
| Backend | Fastify | 4.x | Monolith with module separation |
| ORM | Prisma | 5.x | Type-safe DB access |
| Database | PostgreSQL | 15+ | Database name: `recomengine_dev` |
| Cache | Redis | 7.x | Recommendation cache, rate limits, real-time counters |
| Auth | Custom JWT + bcrypt | - | 1hr access, 7d refresh, cost-12 bcrypt |
| Validation | Zod | 3.x | API input validation |
| Testing | Jest + RTL + Playwright | - | Unit, component, E2E |
| Linting | ESLint + Prettier | - | Company standard |
| SDK | Vanilla JS/TS | - | No framework dependency, <10KB gzipped |

### Libraries

| Package | Purpose |
|---------|---------|
| `fastify` | API server framework |
| `@prisma/client` | Database ORM |
| `ioredis` | Redis client (caching, rate limiting, counters) |
| `bcrypt` | Password hashing |
| `zod` | Schema validation |
| `date-fns` | Date calculations |
| `@fastify/cors` | CORS for SDK requests |
| `@fastify/helmet` | Security headers |
| `@fastify/rate-limit` | Rate limiting |
| `@fastify/cookie` | Cookie handling (refresh tokens) |
| `@fastify/jwt` | JWT token handling |
| `esbuild` | SDK bundling (<10KB output) |

### Ports

- **Frontend (Dashboard)**: 3112 (http://localhost:3112)
- **Backend (API)**: 5008 (http://localhost:5008)
- **Database**: 5432 (shared PostgreSQL instance)
- **Redis**: 6379 (shared Redis instance)

## Technical Architecture

> Full details: `products/recomengine/docs/architecture.md`
> API contract: `products/recomengine/docs/api-schema.yml` (OpenAPI 3.0)
> Database DDL: `products/recomengine/docs/db-schema.sql`
> ADRs: `products/recomengine/docs/ADRs/`

### Architecture Style

**Modular monolith** (see [ADR-001](../docs/ADRs/001-monolith-architecture.md)). Single Fastify process with 10 domain modules, shared PostgreSQL database, and Redis cache. No microservices for MVP. Module boundaries are designed for future extraction if scaling demands it.

### System Design

```
Browser (Dashboard) -> Next.js (3112) -> Fastify API (5008) -> PostgreSQL
                                              |                    |
                                          +---+---+           Partitioned
                                          |       |           event tables
                                        Redis   CDN
                                        cache   (SDK)
                                          |
Merchant Site -> JS SDK -> Fastify API (5008) -> Recommendation Engine
                              |                         |
                          Event Store           Algorithm Modules
                                              (collab, content, trending, fbt)
```

### Backend Module Structure

```
apps/api/src/modules/
  auth/          - Registration, login, JWT, password reset
  tenants/       - CRUD, configuration, lifecycle management
  api-keys/      - Generation, revocation, permission management
  events/        - Ingestion (single + batch), validation, deduplication
  catalog/       - Product CRUD, batch upload, search
  recommendations/ - Strategy execution, cold-start fallback, caching
  experiments/   - A/B test CRUD, assignment, results computation
  analytics/     - KPI aggregation, time-series, export
  widgets/       - Configuration, preview rendering
  health/        - Readiness/liveness checks
```

Each module has: `routes.ts`, `handlers.ts`, `service.ts`, `schemas.ts`

### SDK Architecture

```
sdk/
  src/
    index.ts          - Entry point, auto-initialization
    api.ts            - HTTP client for recommendation API
    tracker.ts        - Event tracking (impressions, clicks)
    renderer.ts       - Widget rendering (grid, carousel, list)
    config.ts         - Configuration loading and caching
    assignment.ts     - A/B test variant assignment (hash-based)
  dist/
    recomengine.v1.js - Bundled, minified SDK (<10KB gzipped)
  esbuild.config.ts   - Build configuration
```

The SDK uses an IIFE (Immediately Invoked Function Expression) to avoid global namespace pollution. Only `window.RecomEngine` is exposed.

### API Surface

All endpoints versioned under `/api/v1/`. Full OpenAPI 3.0 spec in `docs/api-schema.yml`.

| Group | Endpoints | Auth | Description |
|-------|-----------|------|-------------|
| Auth | POST /signup, /login, /logout, /forgot-password, /reset-password | None / JWT | Admin authentication |
| Tenants | GET/POST /tenants, GET/PUT/DELETE /tenants/:id | JWT | Tenant lifecycle |
| API Keys | GET/POST /tenants/:id/api-keys, DELETE /tenants/:id/api-keys/:keyId | JWT | Key provisioning |
| Events | POST /events, POST /events/batch | API Key (write) | Behavioral event ingestion |
| Catalog | GET/POST /catalog, POST /catalog/batch, GET/PUT/DELETE /catalog/:productId | API Key | Product catalog CRUD |
| Recommendations | GET /recommendations | API Key (read) | Personalized recommendations |
| Experiments | CRUD /tenants/:id/experiments, GET .../results | JWT | A/B testing |
| Analytics | GET .../overview, .../timeseries, .../top-products, .../export | JWT | Dashboard analytics |
| Widgets | CRUD /tenants/:id/widgets | JWT / API Key (read) | Widget configuration |
| Health | GET /health, GET /ready | None | Liveness and readiness |

### Database Schema

Full DDL in `docs/db-schema.sql`. Key tables:

| Table | Notes |
|-------|-------|
| `admins` | Platform administrators (email, bcrypt password, role) |
| `tenants` | Customer orgs with JSONB config (owner_id FK to admins) |
| `api_keys` | HMAC-SHA256 hashed keys with read/read_write permissions |
| `catalog_items` | Product catalog per tenant (UNIQUE on tenant_id + product_id) |
| `events` | **Partitioned by month** on `created_at` (see ADR-002) |
| `experiments` | A/B tests with unique running constraint per placement |
| `experiment_results` | Aggregated metrics per variant (control/variant) |
| `analytics_daily` | Pre-aggregated daily stats per tenant |
| `widget_configs` | Widget appearance config per tenant per placement |
| `revenue_attributions` | Links recommendation clicks to purchases (30-min window) |

Materialized views: `analytics_summary` (KPI totals), `top_recommended_products` (click/impression rankings).

### Design Patterns

- **Route-Handler-Service**: Routes define endpoints, handlers parse requests, services contain business logic. Services are testable independently.
- **Tenant-Scoped Queries**: Every database query includes `tenantId` in the WHERE clause. Prisma middleware enforces this automatically.
- **Zod at Boundaries**: All API inputs validated with Zod before reaching handlers.
- **Redis Caching**: Recommendations cached with 5-min TTL; cache miss triggers synchronous computation. See [ADR-003](../docs/ADRs/003-recommendation-caching.md).
- **Deterministic A/B Assignment**: SHA-256 hash of userId + experimentId ensures consistent variant assignment without storing assignments in the database.
- **Event Sourcing (Lite)**: Raw events are immutable and append-only. Analytics are derived from events via aggregation.
- **Event Partitioning**: Monthly PostgreSQL range partitions for events table. See [ADR-002](../docs/ADRs/002-event-storage-strategy.md).

### Data Models (Key Entities)

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| Admin | email, passwordHash, role | has many Tenants |
| Tenant | name, status, config (JSON), ownerId | belongs to Admin, has many ApiKeys, Events, CatalogItems, Experiments |
| ApiKey | keyHash, keyPrefix, permissions, tenantId, lastUsedAt | belongs to Tenant |
| CatalogItem | productId, name, category, price, imageUrl, attributes (JSON), available | belongs to Tenant |
| Event | eventType, userId, productId, sessionId, metadata (JSON), timestamp, tenantId | belongs to Tenant (partitioned by month) |
| Experiment | name, controlStrategy, variantStrategy, trafficSplit, metric, status, tenantId | belongs to Tenant |
| ExperimentResult | experimentId, variant, impressions, clicks, conversions, revenue, sampleSize | belongs to Experiment |
| AnalyticsDaily | tenantId, date, impressions, clicks, conversions, revenue, placementId, strategy | belongs to Tenant |
| WidgetConfig | tenantId, placementId, layout, columns, theme (JSON), maxItems | belongs to Tenant |
| RevenueAttribution | tenantId, userId, productId, clickEventId, purchaseEventId, revenue | belongs to Tenant |

### Caching Strategy

Redis key patterns (see [ADR-003](../docs/ADRs/003-recommendation-caching.md) for full details):

| Key | TTL | Purpose |
|-----|-----|---------|
| `reco:{tenantId}:{userId}:{strategy}` | 5 min | Per-user recommendations |
| `reco:trending:{tenantId}` | 15 min | Trending products |
| `reco:fbt:{tenantId}:{productId}` | 30 min | Frequently bought together |
| `reco:counter:{tenantId}:{date}:{metric}` | 48 hr | Real-time analytics counters |
| `reco:widget:{tenantId}:{placementId}` | 60 sec | Widget config |
| `reco:catalog:{tenantId}:available` | 10 min | Available product set |
| `reco:ratelimit:{apiKeyPrefix}:{window}` | Per window | Rate limit tracking |

### Security

- JWT access tokens (1hr) + HttpOnly refresh token cookies (7d) for dashboard auth
- API key authentication for SDK and server-to-server requests (HMAC-SHA256 hashed storage)
- bcrypt cost factor 12 for admin passwords
- Rate limiting: 1,000 reads/min, 500 writes/min per API key (distributed via Redis)
- Tenant data isolation enforced at query level (Prisma middleware)
- Input validation (Zod) on all endpoints
- Security headers via @fastify/helmet
- CORS configured per tenant (allowable origins stored in tenant config)
- SDK served over HTTPS only; no third-party requests
- RFC 7807 error responses on all endpoints
- CSRF protection via SameSite cookies + custom header (double-submit cookie pattern)

### Performance Budget

| Operation | Target (p95) |
|-----------|-------------|
| Recommendation API response | <100ms |
| Event ingestion (single) | <50ms |
| Event ingestion (batch, 100) | <200ms |
| Dashboard page load (LCP) | <2s |
| SDK bundle load | <100ms |
| Widget render | <200ms |
| Analytics query (30d) | <500ms |

### Key ADRs

| ADR | Decision | Rationale |
|-----|----------|-----------|
| [ADR-001](../docs/ADRs/001-monolith-architecture.md) | Modular monolith | Simplicity for MVP; module boundaries allow future extraction |
| [ADR-002](../docs/ADRs/002-event-storage-strategy.md) | PostgreSQL partitioned tables | No additional dependency; native partitioning sufficient for MVP scale |
| [ADR-003](../docs/ADRs/003-recommendation-caching.md) | Redis with 5-min TTL | Shared cache across instances; meets <100ms target |

### ConnectSW Components to Reuse

| Need | Component | Source |
|------|-----------|--------|
| Auth (JWT + API Key) | Auth Plugin | `@connectsw/shared` or `stablecoin-gateway/apps/api/src/plugins/auth.ts` |
| API key hashing | Crypto Utils | `@connectsw/shared` or `stablecoin-gateway/apps/api/src/utils/crypto.ts` |
| Database connection | Prisma Plugin | `@connectsw/shared` or `stablecoin-gateway/apps/api/src/plugins/prisma.ts` |
| Redis connection | Redis Plugin | `@connectsw/shared` or `stablecoin-gateway/apps/api/src/plugins/redis.ts` |
| Rate limiting | Redis Rate Limit Store | `stablecoin-gateway/apps/api/src/utils/redis-rate-limit-store.ts` |
| Structured logging | Logger | `@connectsw/shared` or `stablecoin-gateway/apps/api/src/utils/logger.ts` |
| Request metrics | Observability Plugin | `stablecoin-gateway/apps/api/src/plugins/observability.ts` |
| Error handling | Error Classes | `invoiceforge/apps/api/src/lib/errors.ts` |
| Pagination | Pagination Helper | `invoiceforge/apps/api/src/lib/pagination.ts` |
| Input validation | Zod patterns | `stablecoin-gateway/apps/api/src/utils/validation.ts` |
| Frontend auth | useAuth hook | `stablecoin-gateway/apps/web/src/hooks/useAuth.tsx` |
| Token storage | Token Manager | `stablecoin-gateway/apps/web/src/lib/token-manager.ts` |
| API client base | API Client | `stablecoin-gateway/apps/web/src/lib/api-client.ts` |
| Theme toggle | useTheme + ThemeToggle | `stablecoin-gateway/apps/web/src/hooks/useTheme.ts` |
| KPI cards | StatCard | `stablecoin-gateway/apps/web/src/components/dashboard/StatCard.tsx` |
| Data tables | TransactionsTable pattern | `stablecoin-gateway/apps/web/src/components/dashboard/TransactionsTable.tsx` |
| Navigation | Sidebar pattern | `stablecoin-gateway/apps/web/src/components/dashboard/Sidebar.tsx` |
| Error boundary | ErrorBoundary | `stablecoin-gateway/apps/web/src/components/ErrorBoundary.tsx` |
| Route protection | ProtectedRoute | `stablecoin-gateway/apps/web/src/components/ProtectedRoute.tsx` |
| Docker | Dockerfile + docker-compose | `stablecoin-gateway/` |
| CI/CD | GitHub Actions | `.github/workflows/test-stablecoin-gateway.yml` |
| E2E tests | Playwright config + auth fixture | `stablecoin-gateway/apps/web/` |

## Special Considerations

### Event Storage Strategy

Events are the highest-volume data in the system. PostgreSQL table partitioning by month is required:
- `events_2026_01`, `events_2026_02`, etc.
- Partition pruning ensures queries only scan relevant months
- Old partitions can be detached and archived independently

### Recommendation Caching

Pre-computed recommendations are stored in Redis with the key pattern:
- `reco:{tenantId}:{userId}:{strategy}` -> JSON array of product IDs with scores
- TTL: 5 minutes (configurable per tenant)
- Cache miss triggers synchronous computation (acceptable for <100ms target)
- Cache invalidation: on catalog change (item removed/unavailable) or strategy config change

### SDK Build and Distribution

The JavaScript SDK must be:
- Built with esbuild for minimal bundle size
- Distributed via CDN (versioned URL: `/v1/recomengine.js`)
- Self-initializing: reads `data-api-key` attribute from its own script tag
- Compatible with: Chrome 80+, Firefox 78+, Safari 13+, Edge 80+
- No external dependencies (zero npm packages in the SDK bundle)

### Revenue Attribution Logic

Revenue attribution connects purchases to recommendation clicks:
1. User clicks a recommendation (`recommendation_clicked` event with productId)
2. User purchases the same product within 30 minutes (`purchase` event with same productId)
3. The purchase revenue (from `metadata.price`) is attributed to the recommendation
4. Attribution is stored as a separate record linking the click event to the purchase event
5. Dashboard sums attributed revenue per time period

This is a last-click attribution model. A purchase can only be attributed to one recommendation click.

---

**Created by**: Product Manager
**Architecture by**: Architect
**Last Updated**: 2026-02-12
**Status**: Architecture complete, ready for implementation
