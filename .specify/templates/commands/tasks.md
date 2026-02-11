---
description: Generate an actionable, dependency-ordered task list from the implementation plan, organized by user story for independent delivery.
agent: Orchestrator
handoffs:
  - label: Analyze Consistency
    command: /speckit.analyze
  - label: Implement
    command: /speckit.implement
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

Generate a traceable task list from the implementation plan. Tasks are organized by user story so each story can be implemented, tested, and delivered independently.

### Execution Steps

1. **Load design documents**:
   - Required: `products/[product]/docs/plan.md`, `products/[product]/docs/specs/[feature-name].md`
   - Optional: `products/[product]/docs/data-model.md`, `products/[product]/docs/contracts/`, `products/[product]/docs/research.md`

2. **Extract from plan**:
   - Tech stack and dependencies
   - User stories with priority
   - Key entities and relationships
   - API endpoints and contracts
   - Architectural decisions

3. **Generate task list** using `.specify/templates/tasks-template.md`:
   - **Phase 1: Setup** — Project initialization, TypeScript config, linting, port registration
   - **Phase 2: Foundation** — Database schema, server config, health endpoints, test infrastructure
   - **Phase 3+: User Stories** — Ordered by priority (P1, P2, P3)
     - Tests FIRST (TDD Red phase) — test files before implementation files
     - Implementation (TDD Green phase) — make tests pass
     - Story checkpoint — verify story works independently
   - **Phase N: Polish** — Documentation, `/speckit.analyze`, registry updates, coverage verification

4. **Task format**: `- [ ] [TaskID] [P?] [Story?] Description → file/path`
   - TaskID: T001, T002, etc.
   - [P]: Marks tasks that can run in parallel
   - [Story]: Links to user story (e.g., [US1])
   - → file/path: Target file to create/modify

5. **ConnectSW-specific tasks** (always included):
   - T003/T004: Check COMPONENT-REGISTRY.md, register ports
   - Phase N: Run `/speckit.analyze`, update COMPONENT-REGISTRY.md if new generic components created
   - Phase N: Run all quality gates (browser-first, security, testing)

6. **Requirement traceability table**:
   - Map every spec requirement (FR-xxx, NFR-xxx) to task(s) and test(s)
   - Flag any unmapped requirements as gaps

7. **Parallel execution opportunities**:
   - Mark backend vs. frontend tasks for git worktree parallelism
   - Mark independent tasks within phases with [P]
   - Note which phases can overlap

8. **Write** to `products/[product]/docs/tasks.md`

9. **Report**:
   - Total tasks, by phase
   - Parallelization opportunities
   - MVP recommendation (which phases for minimal deliverable)
   - Unmapped requirements (if any)
   - Suggested next step: `/speckit.analyze` (recommended) or `/speckit.implement`

### Integration with Orchestrator

This task list feeds directly into the orchestrator's task graph engine:
- Each task becomes a node in the execution graph
- Dependencies are encoded in phase ordering
- [P] marks enable parallel execution scheduling
- [Story] tags enable per-story delivery and testing
- The orchestrator assigns tasks to specialist agents (Backend Engineer, Frontend Engineer, etc.) based on file paths and task descriptions
