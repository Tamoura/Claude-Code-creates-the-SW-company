# RecomEngine -- Agent Context Addendum

This document provides product-specific context for ConnectSW agents working on RecomEngine.

## Product Overview

**Name**: RecomEngine
**Tagline**: AI-Powered Product Recommendation Orchestrator for E-Commerce
**Type**: Web App (Full B2B SaaS Product)
**Status**: Architecture Complete
**PRD Version**: 2.0 (updated 2026-03-06)
**Product Directory**: `products/recomengine/`
**Frontend Port**: 3112
**Backend Port**: 5008
**Database**: PostgreSQL (database name: `recomengine_dev`)
**Redis**: Shared Redis instance (6379)

**What It Does**: RecomEngine is a B2B SaaS product recommendation orchestrator. E-commerce businesses integrate via a REST API and embeddable JavaScript SDK to display personalized product recommendations on their sites. The platform ingests real-time behavioral events (views, clicks, purchases), runs configurable recommendation algorithms (collaborative filtering, content-based, trending, frequently bought together), and provides an A/B testing framework to compare strategies. A web dashboard delivers real-time analytics on recommendation performance, CTR, and revenue attribution.

**Target Users**: Mid-market e-commerce businesses ($1M-$100M revenue), multi-tenant marketplace platforms, SaaS e-commerce providers.

**Monetization**: Usage-based pricing (to be finalized by CEO). Expected tiers based on events ingested and recommendation requests served per month.

## User Personas

| Persona | Name | Role | Primary Actions |
|---------|------|------|-----------------|
| Merchant | Elena | Growth Manager | Views analytics, configures strategies, runs A/B tests |
| Developer | Raj | Platform Engineer | Integrates API/SDK, manages tenants, uploads catalogs |
| Data Analyst | Sophie | SaaS Platform PM | Reviews performance, exports reports, provisions tenants |
| Platform Admin | Marcus | Internal Ops | Monitors health, manages tenant lifecycle |

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
| `/dashboard/settings/billing` | Deferred | Subscription billing (page skeleton with empty state) |
| `/dashboard/settings/team` | Deferred | Team management (page skeleton with empty state) |
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

**Tenant lifecycle**: Created (active) -> Suspended -> Reactivated (active) or Deleted (soft delete, data retained 30 days)

- Active: All API operations allowed.
- Suspended: SDK/API requests return 403. Dashboard read-only. Data preserved.
- Deleted: Soft delete. Data purged after 30-day retention period.

### API Key Model

Each tenant has its own set of API keys. Keys are scoped with permissions:
- **read**: Can request recommendations, query catalog, query analytics. Used in the JavaScript SDK (client-side).
- **read-write**: Can ingest events, manage catalog, manage experiments. Used in server-to-server integration.

Key format: `rk_live_` prefix for production, `rk_test_` prefix for sandbox. Keys are stored as HMAC-SHA256 hashes. Maximum 10 active keys per tenant.

### Recommendation Strategies

Four built-in strategies for MVP:

1. **Collaborative Filtering** (`collaborative`): User-user similarity via cosine similarity. Min data: 1,000 users with 5+ events.
2. **Content-Based** (`content_based`): Product similarity from catalog attributes. Works with 50+ products.
3. **Trending** (`trending`): Interaction velocity ranking (views=1, clicks=2, add-to-cart=3, purchases=5) in last 24h. Global to tenant.
4. **Frequently Bought Together** (`frequently_bought_together`): Co-occurrence analysis within 7 days. Requires productId parameter.

**Cold-start**: New user (0-4 events) -> trending fallback. New product (0 interactions) -> content-based. Response includes `meta.isFallback: true`.

### A/B Testing Statistical Model

- Assignment: Deterministic SHA-256 hash of (userId + experimentId)
- Tests: Two-proportion z-test for CTR/conversion; Welch's t-test for revenue
- Significance: alpha = 0.05
- Low confidence badge when either variant < 500 users
- Max 1 running experiment per placement per tenant

### Revenue Attribution

Last-click model. Purchase within 30 minutes of recommendation_clicked event for same user+product is attributed.

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | Node.js | 20+ | LTS |
| Language | TypeScript | 5+ | All code |
| Frontend | Next.js 14 + React 18 | 14.x / 18.x | App Router |
| Styling | Tailwind CSS | 3.x | Utility-first |
| Backend | Fastify | 4.x | Modular monolith |
| ORM | Prisma | 5.x | Type-safe DB access |
| Database | PostgreSQL | 15+ | recomengine_dev |
| Cache | Redis | 7.x | Reco cache, rate limits, counters |
| Auth | Custom JWT + bcrypt | - | 1hr access, 7d refresh, cost-12 |
| Validation | Zod | 3.x | API input validation |
| Testing | Jest + RTL + Playwright | - | Unit, component, E2E |
| SDK | Vanilla JS/TS | - | < 10KB gzipped, esbuild |

### Ports

- Frontend: 3112
- Backend: 5008
- Database: 5432
- Redis: 6379

## Design Patterns

- **Route-Handler-Service**: Routes -> handlers -> services (business logic)
- **Tenant-Scoped Queries**: Prisma middleware enforces tenantId on all queries
- **Zod at Boundaries**: All API inputs validated with Zod
- **Redis Caching**: 5-min TTL for recommendations (ADR-003)
- **Deterministic A/B Assignment**: SHA-256 hash, no assignment storage needed
- **Event Sourcing (Lite)**: Append-only events, derived analytics
- **Event Partitioning**: Monthly PostgreSQL partitions (ADR-002)

## ConnectSW Components to Reuse

| Need | Component | Source |
|------|-----------|--------|
| Auth (JWT + API Key) | Auth Plugin | `@connectsw/auth/backend` |
| API key hashing | Crypto Utils | `@connectsw/shared/utils/crypto` |
| Database connection | Prisma Plugin | `@connectsw/shared/plugins/prisma` |
| Redis connection | Redis Plugin | `@connectsw/shared/plugins/redis` |
| Structured logging | Logger | `@connectsw/shared/utils/logger` |
| Frontend auth state | useAuth hook | `@connectsw/auth/frontend` |
| Token storage | TokenManager | `@connectsw/auth/frontend` |
| Route protection | ProtectedRoute | `@connectsw/auth/frontend` |
| Error handling | AppError | `@connectsw/auth/backend` |

## Performance Budget

| Operation | Target (p95) |
|-----------|-------------|
| Recommendation API | < 100ms |
| Event ingestion (single) | < 50ms |
| Event ingestion (batch, 100) | < 200ms |
| Dashboard page load (LCP) | < 2s |
| SDK bundle load | < 100ms |
| Widget render | < 200ms |
| Analytics query (30d) | < 500ms |

## Special Considerations

- **Event Partitioning**: Monthly PostgreSQL partitions required for events table
- **SDK**: Zero external dependencies, IIFE bundle, only exposes `window.RecomEngine`
- **Revenue Attribution**: 30-minute last-click window linking recommendation clicks to purchases
- **Widget Config Propagation**: 60-second TTL ensures config changes reach SDK quickly

---

**Created by**: Product Manager
**Architecture by**: Architect
**Last Updated**: 2026-03-06
**Status**: Architecture complete, ready for implementation
