# Implementation Plan: MVP Recommendation Platform

**Product**: RecomEngine
**Branch**: `feature/recomengine/mvp`
**Created**: 2026-02-12
**Spec**: `products/recomengine/docs/specs/mvp-recommendation-platform.md`

## Summary

Build a complete B2B SaaS product recommendation platform with multi-tenant architecture, real-time event ingestion, 4 recommendation strategies (collaborative, content-based, trending, frequently bought together), A/B testing framework, analytics dashboard, and embeddable JavaScript SDK. The system uses a modular monolith architecture with Fastify API, Next.js dashboard, PostgreSQL (partitioned events), and Redis (caching + rate limiting).

## Technical Context

- **Language/Version**: TypeScript 5+ / Node.js 20+
- **Backend**: Fastify 4 + Prisma 5 + PostgreSQL 15
- **Frontend**: Next.js 14 / React 18 / Tailwind CSS 3
- **SDK**: Vanilla TypeScript, esbuild, <10KB gzipped
- **Testing**: Jest + Playwright
- **Primary Dependencies**: ioredis, bcrypt, zod, date-fns, @fastify/jwt, @fastify/cors, @fastify/helmet, @fastify/rate-limit, @fastify/cookie
- **Target Platform**: Web
- **Assigned Ports**: Frontend 3112 / Backend 5008

## Constitution Check

**Gate: Before Phase 0**

| Article | Requirement | Status |
|---------|------------|--------|
| I. Spec-First | Specification exists and is approved | PASS |
| II. Component Reuse | COMPONENT-REGISTRY.md checked, 19 components identified for reuse | PASS |
| III. TDD | Test plan defined per user story | PASS |
| IV. TypeScript | TypeScript 5+ strict mode | PASS |
| V. Default Stack | Fastify + Prisma + PostgreSQL + Next.js + Tailwind (matches default) | PASS |
| VII. Port Registry | Ports 3112/5008 registered in PORT-REGISTRY.md | PASS |

## Component Reuse Plan

| Need | Existing Component | Source | Action |
|------|-------------------|--------|--------|
| Auth (JWT + API Key) | Auth Plugin | stablecoin-gateway | Adapt: permissions to read/read_write, add tenant context |
| API key hashing | Crypto Utils | @connectsw/shared | Adapt: prefix rk_live_/rk_test_ |
| DB connection | Prisma Plugin | @connectsw/shared | Copy as-is |
| Redis connection | Redis Plugin | @connectsw/shared | Copy as-is |
| Rate limiting | Redis Rate Limit Store | stablecoin-gateway | Copy as-is |
| Logging | Logger | @connectsw/shared | Copy as-is |
| Metrics | Observability Plugin | stablecoin-gateway | Copy as-is |
| Errors | Error Classes | invoiceforge | Copy as-is |
| Pagination | Pagination Helper | invoiceforge | Copy as-is |
| Frontend auth | useAuth + Token Manager | stablecoin-gateway | Adapt: API client import |
| KPI cards | StatCard | stablecoin-gateway | Copy as-is |
| Navigation | Sidebar | stablecoin-gateway | Adapt: RecomEngine routes |
| Error boundary | ErrorBoundary | stablecoin-gateway | Copy as-is |
| Route guard | ProtectedRoute | stablecoin-gateway | Copy as-is |
| Theme | useTheme + ThemeToggle | stablecoin-gateway | Adapt: storage key |
| Docker | Dockerfile + compose | stablecoin-gateway | Adapt: ports, DB name |
| CI/CD | GitHub Actions | stablecoin-gateway | Adapt: paths |
| E2E | Playwright config | stablecoin-gateway | Adapt: URL, port |
| Recommendation engine | None | — | Build new |
| A/B assignment | None | — | Build new |
| JavaScript SDK | None | — | Build new |
| Analytics aggregation | None | — | Build new |

## Project Structure

```
products/recomengine/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── plugins/          # auth, prisma, redis, observability, rate-limit
│   │   │   ├── modules/
│   │   │   │   ├── auth/         # signup, login, logout, password reset
│   │   │   │   ├── tenants/      # CRUD, config, lifecycle
│   │   │   │   ├── api-keys/     # generation, revocation
│   │   │   │   ├── events/       # ingestion, validation, dedup
│   │   │   │   ├── catalog/      # CRUD, batch, search
│   │   │   │   ├── recommendations/ # strategy execution, caching
│   │   │   │   ├── experiments/  # A/B CRUD, assignment, results
│   │   │   │   ├── analytics/    # KPI, timeseries, export
│   │   │   │   ├── widgets/      # config CRUD
│   │   │   │   └── health/       # liveness, readiness
│   │   │   ├── utils/            # logger, crypto, validation, errors, pagination
│   │   │   └── server.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/              # Next.js App Router pages
│   │   │   ├── components/       # React components
│   │   │   ├── hooks/            # Custom hooks
│   │   │   └── lib/              # API client, token manager
│   │   ├── tests/
│   │   └── package.json
│   └── sdk/
│       ├── src/
│       │   ├── index.ts          # Entry, auto-init
│       │   ├── api.ts            # HTTP client
│       │   ├── tracker.ts        # Impression + click tracking
│       │   ├── renderer.ts       # Widget rendering
│       │   ├── config.ts         # Config loading
│       │   └── assignment.ts     # A/B test hashing
│       ├── dist/
│       └── package.json
├── e2e/
│   ├── tests/
│   └── playwright.config.ts
├── docker-compose.yml
└── docs/
```

## Implementation Phases

### Phase 1: Foundation (Setup + Infrastructure)

1. Initialize monorepo structure (package.json, tsconfig, eslint, prettier)
2. Set up Prisma schema matching db-schema.sql
3. Copy & adapt shared plugins (auth, prisma, redis, observability, rate-limit)
4. Copy & adapt shared utils (logger, crypto, errors, pagination, validation)
5. Configure Fastify server with plugin registration order
6. Implement health/ready endpoints
7. Set up Next.js app with Tailwind, copy shared frontend components
8. Set up Docker Compose (PostgreSQL + Redis)
9. Register ports in PORT-REGISTRY.md

### Phase 2: Core Auth & Tenant Management [US1]

1. Implement auth module (signup, login, logout, forgot/reset password)
2. Implement tenant module (CRUD, status lifecycle, config)
3. Implement api-keys module (generate, revoke, list)
4. Tests: auth flows, tenant CRUD, API key lifecycle, permission enforcement

### Phase 3: Data Ingestion [US2]

1. Implement events module (single + batch ingestion, validation, dedup)
2. Implement catalog module (CRUD, batch upload, search)
3. Set up event partitioning (monthly PostgreSQL partitions)
4. Tests: event ingestion, dedup, batch processing, catalog CRUD

### Phase 4: Recommendation Engine [US3]

1. Implement collaborative filtering strategy
2. Implement content-based strategy
3. Implement trending strategy
4. Implement frequently-bought-together strategy
5. Implement cold-start fallback logic
6. Implement Redis caching layer
7. Tests: each strategy, cold-start, caching, performance

### Phase 5: A/B Testing [US4]

1. Implement experiments module (CRUD, status transitions)
2. Implement deterministic user assignment (hash-based)
3. Implement results computation (p-value, confidence intervals)
4. Integrate experiment routing into recommendation flow
5. Tests: experiment lifecycle, consistent assignment, statistics

### Phase 6: Analytics & Dashboard [US5]

1. Implement analytics module (overview, timeseries, top products, CSV export)
2. Implement Redis real-time counters (updated on event ingestion)
3. Implement revenue attribution logic
4. Build dashboard pages: login, tenant list, tenant detail, analytics
5. Build KPI cards, time-series chart, top products table
6. Tests: analytics aggregation, dashboard rendering, CSV export

### Phase 7: SDK & Widgets [US6, US7]

1. Implement widget config module (CRUD)
2. Build JavaScript SDK (api, tracker, renderer, config, assignment)
3. Bundle with esbuild (<10KB target)
4. Tests: SDK initialization, rendering, event tracking, graceful degradation

### Phase 8: Polish & Quality Gates

1. Run full test suite, verify >= 80% coverage
2. Run security audit (npm audit, dependency check)
3. Run /speckit.analyze for spec consistency
4. Update COMPONENT-REGISTRY.md with new reusable components
5. Final commit and push

## Complexity Tracking

| Decision | Violation of Simplicity? | Justification | Simpler Alternative Rejected |
|----------|------------------------|---------------|------------------------------|
| 4 recommendation strategies | No | Each strategy is a pure function; complexity is in variety not depth | Single strategy — rejected because different tenants have different data volumes |
| PostgreSQL event partitioning | No | Native PostgreSQL feature; prevents table bloat | Single table — rejected because 100M events/month would degrade query performance |
| Redis caching | No | Required to meet <100ms p95 target | No cache — rejected because DB-only would exceed latency budget |
| A/B test statistics | No | Standard z-test/t-test; well-understood math | No statistics — rejected because merchants need confidence in results |
