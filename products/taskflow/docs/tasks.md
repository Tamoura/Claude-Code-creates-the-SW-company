# Tasks: TaskFlow MVP

**Product**: taskflow
**Branch**: `feature/taskflow/mvp`
**Created**: 2026-02-12
**Plan**: `products/taskflow/docs/plan.md`
**Spec**: `products/taskflow/docs/specs/mvp.md`

## Phase 1: Setup

- [x] T001 Initialize product structure → products/taskflow/package.json
- [x] T002 Configure TypeScript → products/taskflow/tsconfig.json
- [x] T003 [P] Configure backend project → apps/api/package.json
- [x] T004 [P] Configure frontend project → apps/web/package.json
- [x] T005 Register ports (3110/5007) → .claude/PORT-REGISTRY.md

## Phase 2: Foundation

- [x] T010 Create Prisma schema (User + Task) → apps/api/prisma/schema.prisma
- [x] T011 Configure Fastify server → apps/api/src/server.ts
- [x] T012 Create health endpoint → apps/api/src/routes/health/index.ts
- [x] T013 Test: health endpoint → apps/api/tests/integration/health.test.ts
- [x] T014 [P] Configure Next.js app → apps/web/src/app/layout.tsx
- [x] T015 [P] Configure Playwright → e2e/playwright.config.ts

## Phase 3: User Story 1 (P1) - Register and Login

**Independent test**: Register new user, login, verify dashboard loads with user email

### Tests First (TDD - Red)
- [x] T020 Test: register returns 201 + JWT → apps/api/tests/integration/auth.test.ts
- [x] T021 Test: login returns 200 + JWT → apps/api/tests/integration/auth.test.ts
- [x] T022 Test: login with wrong password returns 401 → apps/api/tests/integration/auth.test.ts

### Implementation (TDD - Green)
- [x] T023 [FR-007] Implement password hashing utils → apps/api/src/plugins/crypto.ts
- [x] T024 [FR-001] Implement register endpoint → apps/api/src/routes/auth/index.ts
- [x] T025 [FR-002] Implement login endpoint → apps/api/src/routes/auth/index.ts
- [x] T026 [FR-002] Implement JWT auth plugin → apps/api/src/plugins/auth.ts

### Dev-Test
- [x] T027 Dev-test: register + login endpoints (Postman-style) + DB state verification

## Phase 4: User Story 2 (P1) - Create and View Tasks

**Independent test**: Create 3 tasks, verify all 3 appear in list

### Tests First (TDD - Red)
- [x] T030 Test: create task returns 201 → apps/api/tests/integration/tasks.test.ts
- [x] T031 Test: list tasks returns user's tasks only → apps/api/tests/integration/tasks.test.ts
- [x] T032 Test: create task with empty title returns 400 → apps/api/tests/integration/tasks.test.ts

### Implementation (TDD - Green)
- [x] T033 [FR-003] Implement create task endpoint → apps/api/src/routes/tasks/index.ts
- [x] T034 [FR-003] [FR-004] Implement list tasks endpoint → apps/api/src/routes/tasks/index.ts
- [x] T035 [FR-006] Implement task validation (Zod) → apps/api/src/routes/tasks/schemas.ts

### Dev-Test
- [x] T036 Dev-test: create + list tasks + DB state verification

## Phase 5: User Story 3 (P1) - Update and Delete Tasks

**Independent test**: Create task, toggle complete, edit title, delete

### Tests First (TDD - Red)
- [x] T040 Test: update task returns 200 → apps/api/tests/integration/tasks.test.ts
- [x] T041 Test: delete task returns 200 → apps/api/tests/integration/tasks.test.ts
- [x] T042 Test: update non-existent task returns 404 → apps/api/tests/integration/tasks.test.ts

### Implementation (TDD - Green)
- [x] T043 [FR-003] Implement update task endpoint → apps/api/src/routes/tasks/index.ts
- [x] T044 [FR-003] Implement delete task endpoint → apps/api/src/routes/tasks/index.ts

### Dev-Test
- [x] T045 Dev-test: update + delete + cascade verification

## Phase 6: User Story 4 (P2) - Dashboard Statistics

### Tests First (TDD - Red)
- [x] T050 Test: stats returns correct counts → apps/api/tests/integration/tasks.test.ts

### Implementation (TDD - Green)
- [x] T051 [FR-005] Implement stats endpoint → apps/api/src/routes/tasks/index.ts

## Phase 7: Frontend

- [x] T060 [P] Create login page → apps/web/src/app/login/page.tsx
- [x] T061 [P] Create dashboard page → apps/web/src/app/dashboard/page.tsx
- [x] T062 Create task list component → apps/web/src/components/TaskList.tsx
- [x] T063 Create task form component → apps/web/src/components/TaskForm.tsx
- [x] T064 Create stat cards component → apps/web/src/components/StatCards.tsx
- [x] T065 Create API client → apps/web/src/lib/api.ts
- [x] T066 Create auth hook → apps/web/src/hooks/useAuth.ts

### Dev-Test
- [x] T067 Dev-test: all pages render, console clean, interactions work

## Phase 8: Quality

- [x] T090 Run `/speckit.analyze` for consistency check
- [x] T091 Generate dynamic tests (edge cases, boundary values)
- [x] T092 Run database state verification
- [x] T093 Verify coverage >= 80%
- [x] T094 Update PORT-REGISTRY.md with taskflow ports

## Requirement Traceability

| Spec Requirement | Task(s) | Test(s) |
|-----------------|---------|---------|
| FR-001 Register | T024 | T020 |
| FR-002 JWT Auth | T025, T026 | T021, T022 |
| FR-003 CRUD Tasks | T033, T034, T043, T044 | T030, T031, T040, T041 |
| FR-004 User Isolation | T034 | T031 |
| FR-005 Stats | T051 | T050 |
| FR-006 Validation | T035 | T032 |
| FR-007 Hash Passwords | T023 | T020 (verify hash in DB) |
| SC-003 No Orphans | T044 | T045 (cascade verify) |
