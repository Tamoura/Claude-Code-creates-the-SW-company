# Tasks: [FEATURE NAME]

**Product**: [PRODUCT_NAME]
**Branch**: `feature/[product]/[feature-id]`
**Created**: [DATE]
**Plan**: [Link to plan.md]
**Spec**: [Link to spec.md]

## Format

`- [ ] [TaskID] [P?] [Story?] Description → file/path`

- **TaskID**: T001, T002, etc.
- **[P]**: Can run in parallel with other [P] tasks in same phase
- **[Story]**: Links to user story (e.g., [US1], [US2])
- **→ file/path**: Target file to create/modify

## Phase 1: Setup

- [ ] T001 Initialize product structure → products/[product]/package.json
- [ ] T002 Configure TypeScript → products/[product]/tsconfig.json
- [ ] T003 Configure ESLint + Prettier → products/[product]/.eslintrc.js
- [ ] T004 Register ports in PORT-REGISTRY.md → .claude/PORT-REGISTRY.md

## Phase 2: Foundation

Core infrastructure that MUST be complete before ANY user story.

- [ ] T010 [P] Create database schema → apps/api/prisma/schema.prisma
- [ ] T011 [P] Configure Fastify server → apps/api/src/server.ts
- [ ] T012 Create health endpoint → apps/api/src/routes/health.ts
- [ ] T013 Test: health endpoint → apps/api/tests/integration/health.test.ts
- [ ] T014 [P] Configure Next.js app → apps/web/src/app/layout.tsx
- [ ] T015 [P] Configure Playwright → e2e/playwright.config.ts

## Phase 3: User Story 1 (P1) - [Story Title]

**Independent test**: [How to verify this story works standalone]

### Tests First (TDD - Red)
- [ ] T020 Test: [acceptance scenario 1] → apps/api/tests/[test-file]
- [ ] T021 Test: [acceptance scenario 2] → apps/web/tests/[test-file]
- [ ] T022 E2E: [user journey] → e2e/tests/[feature]/[test-file]

### Implementation (TDD - Green)
- [ ] T023 [FR-001] Implement [backend capability] → apps/api/src/routes/[file]
- [ ] T024 [FR-002] Implement [frontend component] → apps/web/src/components/[file]

### Checkpoint
- [ ] T025 Verify: all Phase 3 tests pass
- [ ] T026 Verify: story can be tested independently

## Phase 4: User Story 2 (P2) - [Story Title]

[Same pattern as Phase 3]

## Phase N: Polish

- [ ] T090 Update API documentation → products/[product]/docs/API.md
- [ ] T091 Run `/speckit.analyze` for consistency check
- [ ] T092 Add new reusable components to COMPONENT-REGISTRY.md
- [ ] T093 Verify coverage >= 80%
- [ ] T094 Run all quality gates

## Execution Strategy

- **MVP-first**: Complete Phase 3 (Story 1) for a deliverable increment
- **Incremental**: Add stories sequentially (Phase 4, 5, ...)
- **Parallel**: Tasks marked [P] within a phase can run concurrently
- **Backend/Frontend parallel**: Use git worktrees for simultaneous agent work

## Requirement Traceability

| Spec Requirement | Task(s) | Test(s) |
|-----------------|---------|---------|
| FR-001 | T023 | T020 |
| FR-002 | T024 | T021 |
| SC-001 | T025 | T022 |
