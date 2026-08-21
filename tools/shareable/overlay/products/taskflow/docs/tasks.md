# Tasks: Task Lifecycle

**Product**: taskflow
**Plan**: [plan.md](plan.md) · **Spec**: [specs/001-task-crud/spec.md](specs/001-task-crud/spec.md)

`- [x] [TaskID] [P?] [Story?] Description → file/path`

## Phase 1: Setup

- [x] T001 Product workspace and scripts → products/taskflow/package.json
- [x] T002 [P] API TypeScript config (strict) → apps/api/tsconfig.json
- [x] T003 [P] Local PostgreSQL on 5433 → docker-compose.yml
- [x] T004 Register ports 3100 / 5000 → .claude/PORT-REGISTRY.md

## Phase 2: Data (Data Engineer)

- [x] T005 [US1][US3] Task and Project models with cascade → apps/api/prisma/schema.prisma
- [x] T006 [US3] Indexes for the filtered list → apps/api/prisma/schema.prisma
- [x] T007 Seed one project and three tasks → apps/api/prisma/seed.ts

## Phase 3: API tests first (QA Engineer — Article III)

- [x] T008 [US1] Creation tests: happy path, blank title, unknown project → apps/api/tests/integration/tasks.test.ts
- [x] T009 [US2] Lifecycle tests: filter, patch, reopen, delete twice → apps/api/tests/integration/tasks.test.ts
- [x] T010 [US3] Cascade test → apps/api/tests/integration/tasks.test.ts
- [x] T011 [NFR-002] Health test → apps/api/tests/integration/tasks.test.ts
- [x] T011a [US-03][FR-008] Project tests: create, duplicate, blank, list → apps/api/tests/integration/tasks.test.ts
- [x] T011b [NFR-001] Error hierarchy unit tests → apps/api/tests/unit/errors.test.ts

## Phase 4: API implementation (Backend Engineer)

- [x] T012 [P] Zod schemas for every boundary → apps/api/src/schemas/task.schema.ts
- [x] T013 [P] AppError hierarchy + problem+json → apps/api/src/lib/errors.ts
- [x] T014 Prisma plugin with lifecycle handling → apps/api/src/plugins/prisma.ts
- [x] T015 [US1][US3] Repository → apps/api/src/repositories/task.repository.ts
- [x] T016 [US1][US2] Service rules FR-001, FR-004, FR-005 → apps/api/src/services/task.service.ts
- [x] T017 [US1][US2] Routes under /api/v1 → apps/api/src/routes/task.routes.ts
- [x] T018 [NFR-002] Health route → apps/api/src/routes/health.routes.ts
- [x] T019 App assembly: helmet, CORS, plugin order → apps/api/src/app.ts
- [x] T019a [NFR-001] Single problem+json error boundary → apps/api/src/lib/error-handler.ts

## Phase 5: Web (Frontend Engineer)

- [x] T020 [P] API client with problem+json handling → apps/web/lib/api.ts
- [x] T021 [US4] Server-rendered board page → apps/web/app/page.tsx
- [x] T022 [US4][US5] Task list component + tests → apps/web/components/TaskList.tsx
- [x] T023 [US5][FR-011] Board state, errors surfaced inline → apps/web/components/TaskBoard.tsx

## Phase 6: Gates (QA + Security + DevOps)

- [x] T024 [US4][US5] Browser regression suite → e2e/tests/tasks.spec.ts
- [x] T025 [NFR-003] Coverage threshold at 80% → apps/api/jest.config.ts
- [x] T026 [NFR-004] Secrets from the environment only → apps/api/.env.example
- [x] T027 CI: typecheck, unit, integration, e2e → .github/workflows/taskflow-ci.yml
