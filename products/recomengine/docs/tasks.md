# Tasks: MVP Recommendation Platform

**Product**: RecomEngine
**Branch**: `feature/recomengine/mvp`
**Created**: 2026-02-12
**Plan**: `products/recomengine/docs/plan.md`
**Spec**: `products/recomengine/docs/specs/mvp-recommendation-platform.md`

## Format

`- [ ] [TaskID] [P?] [Story?] Description -> file/path`

## Phase 1: Foundation

- [ ] T001 Initialize API package.json and tsconfig -> apps/api/package.json
- [ ] T002 [P] Initialize Web package.json and tsconfig -> apps/web/package.json
- [ ] T003 [P] Initialize SDK package.json and tsconfig -> apps/sdk/package.json
- [ ] T004 Configure ESLint + Prettier -> .eslintrc.js, .prettierrc
- [ ] T005 Create Prisma schema from db-schema.sql -> apps/api/prisma/schema.prisma
- [ ] T006 [P] Copy Logger utility -> apps/api/src/utils/logger.ts
- [ ] T007 [P] Copy Crypto Utils (adapt prefix rk_live_) -> apps/api/src/utils/crypto.ts
- [ ] T008 [P] Copy Error Classes -> apps/api/src/utils/errors.ts
- [ ] T009 [P] Copy Pagination Helper -> apps/api/src/utils/pagination.ts
- [ ] T010 [P] Create Zod validation helpers -> apps/api/src/utils/validation.ts
- [ ] T011 Copy Prisma Plugin -> apps/api/src/plugins/prisma.ts
- [ ] T012 [P] Copy Redis Plugin -> apps/api/src/plugins/redis.ts
- [ ] T013 [P] Copy Observability Plugin -> apps/api/src/plugins/observability.ts
- [ ] T014 [P] Copy Redis Rate Limit Store -> apps/api/src/utils/redis-rate-limit-store.ts
- [ ] T015 Adapt Auth Plugin (read/read_write perms, tenant context) -> apps/api/src/plugins/auth.ts
- [ ] T016 Configure Fastify server with plugin registration -> apps/api/src/server.ts
- [ ] T017 [FR-027] Implement health/ready endpoints -> apps/api/src/modules/health/
- [ ] T018 Test: health endpoint -> apps/api/tests/integration/health.test.ts
- [ ] T019 [P] Configure Next.js app with Tailwind -> apps/web/src/app/layout.tsx
- [ ] T020 [P] Copy frontend shared components (TokenManager, useAuth, StatCard, ErrorBoundary, ProtectedRoute, ThemeToggle, Sidebar) -> apps/web/src/
- [ ] T021 Create Docker Compose (PostgreSQL + Redis) -> docker-compose.yml
- [ ] T022 Update PORT-REGISTRY.md -> .claude/PORT-REGISTRY.md

## Phase 2: Auth & Tenant Management [US1]

### Tests First (TDD - Red)
- [ ] T030 Test: admin signup and login -> apps/api/tests/integration/auth.test.ts
- [ ] T031 [P] Test: tenant CRUD and lifecycle -> apps/api/tests/integration/tenants.test.ts
- [ ] T032 [P] Test: API key generation and permission enforcement -> apps/api/tests/integration/api-keys.test.ts

### Implementation (TDD - Green)
- [ ] T033 [FR-001][FR-002] Implement auth module (signup, login, logout, password reset) -> apps/api/src/modules/auth/
- [ ] T034 [FR-003][FR-004] Implement tenants module (CRUD, config, lifecycle) -> apps/api/src/modules/tenants/
- [ ] T035 [FR-005][FR-006] Implement api-keys module (generate, revoke, list) -> apps/api/src/modules/api-keys/

### Checkpoint
- [ ] T036 Verify: all Phase 2 tests pass
- [ ] T037 Verify: US1 can be tested independently (signup -> create tenant -> generate key -> authenticate)

## Phase 3: Data Ingestion [US2]

### Tests First (TDD - Red)
- [ ] T040 Test: single event ingestion and validation -> apps/api/tests/integration/events.test.ts
- [ ] T041 [P] Test: batch event ingestion -> apps/api/tests/integration/events-batch.test.ts
- [ ] T042 [P] Test: event deduplication -> apps/api/tests/integration/events-dedup.test.ts
- [ ] T043 [P] Test: catalog CRUD and batch upload -> apps/api/tests/integration/catalog.test.ts

### Implementation (TDD - Green)
- [ ] T044 [FR-007][FR-008][FR-009][FR-010] Implement events module (single, batch, validation, dedup) -> apps/api/src/modules/events/
- [ ] T045 [FR-011][FR-012] Implement catalog module (CRUD, batch, search) -> apps/api/src/modules/catalog/

### Checkpoint
- [ ] T046 Verify: all Phase 3 tests pass
- [ ] T047 Verify: US2 can be tested independently (upload catalog -> send events -> verify persistence)

## Phase 4: Recommendation Engine [US3]

### Tests First (TDD - Red)
- [ ] T050 Test: collaborative filtering -> apps/api/tests/unit/strategies/collaborative.test.ts
- [ ] T051 [P] Test: content-based filtering -> apps/api/tests/unit/strategies/content-based.test.ts
- [ ] T052 [P] Test: trending strategy -> apps/api/tests/unit/strategies/trending.test.ts
- [ ] T053 [P] Test: frequently bought together -> apps/api/tests/unit/strategies/fbt.test.ts
- [ ] T054 Test: cold-start fallback -> apps/api/tests/unit/strategies/cold-start.test.ts
- [ ] T055 Test: recommendation API endpoint -> apps/api/tests/integration/recommendations.test.ts
- [ ] T056 Test: Redis caching behavior -> apps/api/tests/integration/recommendations-cache.test.ts

### Implementation (TDD - Green)
- [ ] T057 [FR-014] Implement collaborative filtering strategy -> apps/api/src/modules/recommendations/strategies/collaborative.ts
- [ ] T058 [P][FR-014] Implement content-based strategy -> apps/api/src/modules/recommendations/strategies/content-based.ts
- [ ] T059 [P][FR-014] Implement trending strategy -> apps/api/src/modules/recommendations/strategies/trending.ts
- [ ] T060 [P][FR-014] Implement frequently-bought-together strategy -> apps/api/src/modules/recommendations/strategies/fbt.ts
- [ ] T061 [FR-015] Implement cold-start fallback logic -> apps/api/src/modules/recommendations/service.ts
- [ ] T062 [FR-013][FR-016] Implement recommendations routes + handler -> apps/api/src/modules/recommendations/
- [ ] T063 Implement Redis caching layer -> apps/api/src/modules/recommendations/cache.ts

### Checkpoint
- [ ] T064 Verify: all Phase 4 tests pass
- [ ] T065 Verify: US3 works end-to-end (seed data -> request recommendations -> get ranked products)

## Phase 5: A/B Testing [US4]

### Tests First (TDD - Red)
- [ ] T070 Test: experiment CRUD and status transitions -> apps/api/tests/integration/experiments.test.ts
- [ ] T071 [P] Test: deterministic user assignment -> apps/api/tests/unit/experiment-assignment.test.ts
- [ ] T072 [P] Test: experiment results computation -> apps/api/tests/unit/experiment-results.test.ts

### Implementation (TDD - Green)
- [ ] T073 [FR-017][FR-019] Implement experiments module (CRUD, status transitions) -> apps/api/src/modules/experiments/
- [ ] T074 [FR-017] Implement deterministic assignment (hash-based) -> apps/api/src/modules/experiments/assignment.ts
- [ ] T075 [FR-018] Implement results computation (z-test, t-test, p-value) -> apps/api/src/modules/experiments/statistics.ts
- [ ] T076 Integrate experiment routing into recommendation flow -> apps/api/src/modules/recommendations/service.ts

### Checkpoint
- [ ] T077 Verify: all Phase 5 tests pass
- [ ] T078 Verify: US4 works (create experiment -> get recommendations -> verify variant assignment -> check results)

## Phase 6: Analytics & Dashboard [US5]

### Tests First (TDD - Red)
- [ ] T080 Test: analytics overview API -> apps/api/tests/integration/analytics.test.ts
- [ ] T081 [P] Test: analytics timeseries API -> apps/api/tests/integration/analytics-timeseries.test.ts
- [ ] T082 [P] Test: CSV export -> apps/api/tests/integration/analytics-export.test.ts
- [ ] T083 [P] Test: revenue attribution -> apps/api/tests/integration/revenue-attribution.test.ts

### Implementation (TDD - Green)
- [ ] T084 [FR-020] Implement analytics module (overview, timeseries, top products) -> apps/api/src/modules/analytics/
- [ ] T085 [FR-021] Implement CSV export endpoint -> apps/api/src/modules/analytics/export.ts
- [ ] T086 [FR-024] Implement revenue attribution logic -> apps/api/src/modules/analytics/attribution.ts
- [ ] T087 Implement Redis real-time counters (update on event ingestion) -> apps/api/src/modules/events/counters.ts
- [ ] T088 Build dashboard: login page -> apps/web/src/app/login/page.tsx
- [ ] T089 [P] Build dashboard: tenant list page -> apps/web/src/app/dashboard/tenants/page.tsx
- [ ] T090 [P] Build dashboard: tenant detail page -> apps/web/src/app/dashboard/tenants/[id]/page.tsx
- [ ] T091 Build dashboard: analytics page with KPI cards + charts -> apps/web/src/app/dashboard/tenants/[id]/analytics/page.tsx
- [ ] T092 [P] Build dashboard: experiment list + detail pages -> apps/web/src/app/dashboard/tenants/[id]/experiments/
- [ ] T093 Build API client for frontend -> apps/web/src/lib/api-client.ts

### Checkpoint
- [ ] T094 Verify: all Phase 6 tests pass
- [ ] T095 Verify: US5 works (login -> navigate to analytics -> see KPI cards -> export CSV)

## Phase 7: SDK & Widgets [US6, US7]

### Tests First (TDD - Red)
- [ ] T100 Test: widget config CRUD -> apps/api/tests/integration/widgets.test.ts
- [ ] T101 [P] Test: SDK initialization and rendering -> apps/sdk/tests/sdk.test.ts
- [ ] T102 [P] Test: SDK event tracking -> apps/sdk/tests/tracker.test.ts

### Implementation (TDD - Green)
- [ ] T103 [FR-023] Implement widgets module (CRUD) -> apps/api/src/modules/widgets/
- [ ] T104 [FR-022] Build SDK entry point and API client -> apps/sdk/src/index.ts, apps/sdk/src/api.ts
- [ ] T105 [FR-022] Build SDK tracker (impressions, clicks) -> apps/sdk/src/tracker.ts
- [ ] T106 [FR-022] Build SDK renderer (grid, carousel, list) -> apps/sdk/src/renderer.ts
- [ ] T107 Build SDK config loader -> apps/sdk/src/config.ts
- [ ] T108 Build SDK A/B assignment -> apps/sdk/src/assignment.ts
- [ ] T109 Configure esbuild for <10KB bundle -> apps/sdk/esbuild.config.ts

### Checkpoint
- [ ] T110 Verify: all Phase 7 tests pass
- [ ] T111 Verify: SDK bundle is <10KB gzipped
- [ ] T112 Verify: US6 works (load SDK on test page -> see recommendations -> click -> verify events tracked)

## Phase 8: Polish & Quality Gates

- [ ] T120 Run full test suite, verify >= 80% coverage
- [ ] T121 Run npm audit for security vulnerabilities
- [ ] T122 Run /speckit.analyze for spec consistency
- [ ] T123 Update COMPONENT-REGISTRY.md with new reusable components
- [ ] T124 Verify all API endpoints match OpenAPI spec
- [ ] T125 Final commit and push

## Execution Strategy

- **MVP-first**: Phase 1-2 creates a usable auth + tenant system
- **Incremental**: Each phase adds a testable capability
- **Parallel**: Tasks marked [P] within a phase can run concurrently
- **Backend-first**: API endpoints before dashboard UI (dashboard consumes API)

## Requirement Traceability

| Spec Requirement | Task(s) | Test(s) |
|-----------------|---------|---------|
| FR-001, FR-002 | T033 | T030 |
| FR-003, FR-004 | T034 | T031 |
| FR-005, FR-006 | T035 | T032 |
| FR-007, FR-008, FR-009, FR-010 | T044 | T040, T041, T042 |
| FR-011, FR-012 | T045 | T043 |
| FR-013, FR-014, FR-015, FR-016 | T057-T063 | T050-T056 |
| FR-017, FR-018, FR-019 | T073-T076 | T070-T072 |
| FR-020, FR-021 | T084, T085 | T080-T082 |
| FR-022 | T104-T109 | T101, T102 |
| FR-023 | T103 | T100 |
| FR-024 | T086 | T083 |
| FR-025, FR-026, FR-027 | T016, T008, T009 | All integration tests |
| NFR-001 | T063 | T056 |
| NFR-002, NFR-003 | T044 | T040, T041 |
| NFR-005 | T109 | T111 |
| NFR-006 | T007, T015 | T032 |
| NFR-007 | T014, T015 | T030 |
| NFR-010 | T010 | All integration tests |
| NFR-011 | T006, T013 | T018 |
