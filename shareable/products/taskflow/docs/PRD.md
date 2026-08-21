# TaskFlow — Product Requirements

**Tier**: Demo · **Stack**: Fastify + Next.js + PostgreSQL · **Ports**: web 3100, API 5000

## Why this product exists

TaskFlow is the worked example that ships with the agent system. It is
deliberately small — one aggregate, five endpoints, one page — because its job
is not to be a product but to show what the process produces: a spec with
numbered requirements, a plan that checks itself against the constitution, a
task list that maps to files, tests written before the code, and gates that
have to pass before any of it counts as done.

Read it in this order:

1. [specs/001-task-crud/spec.md](specs/001-task-crud/spec.md) — what and why, with `US`/`FR`/`AC` ids
2. [plan.md](plan.md) — architecture, constitution check, diagrams
3. [tasks.md](tasks.md) — the dependency-ordered task list
4. [API.md](API.md) — the resulting contract
5. `apps/api/tests/integration/tasks.test.ts` — every `AC` id, asserted

## Scope

In: projects, tasks, status lifecycle, listing with filters, a board page.
Out: auth, multi-tenancy, real-time updates, attachments, recurring tasks.

## Success criteria

| Criterion | Measure |
|-----------|---------|
| Runnable in one command | `pnpm setup && pnpm dev` on a clean clone |
| Fully traceable | Every acceptance criterion has a test naming its id |
| Gate-clean | Testing, Browser and Security gates pass unmodified |
| Honest coverage | ≥ 80% on the API with no database mocks |
