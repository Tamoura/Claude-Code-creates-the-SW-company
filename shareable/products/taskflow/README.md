# TaskFlow

The demo product. A task tracker in ~700 lines, built by the agent system and
traceable end to end: every route, rule and test names the requirement it
serves.

## Run it

```bash
pnpm install                 # from the repository root
cd products/taskflow
pnpm setup                   # starts PostgreSQL (5433), pushes the schema, seeds data
pnpm dev                     # API on :5000, web on :3100
```

Open http://localhost:3100.

## Test it

```bash
pnpm --filter @taskflow/api test           # integration tests against real PostgreSQL
pnpm --filter @taskflow/api test:coverage  # enforces the 80% threshold
pnpm --filter @taskflow/web test           # React Testing Library
pnpm --filter @taskflow/e2e test           # Playwright, needs both apps running
```

The API suite needs the database up (`pnpm db:up`). It never mocks it —
Article III forbids mocking dependencies you can run for real.

## Read it

| File | What it shows |
|------|---------------|
| `docs/specs/001-task-crud/spec.md` | The spec every other artifact traces back to |
| `docs/plan.md` | Constitution check, C4 diagrams, layering decision |
| `docs/tasks.md` | The task list the agents executed, in dependency order |
| `docs/ADRs/ADR-001-layered-api.md` | Why routes, services and repositories are separate |
| `apps/api/src/services/task.service.ts` | Where the business rules live, one per requirement |
| `apps/api/tests/integration/tasks.test.ts` | Every API acceptance criterion, asserted against a real database |
| `apps/api/tests/unit/errors.test.ts` | The error hierarchy every failure response is built from |

## Layout

```
apps/api/     Fastify 5 + Prisma 6 — routes → services → repositories
apps/web/     Next.js 14 App Router + Tailwind
e2e/          Playwright regression suite
docs/         PRD, spec, plan, tasks, ADRs, API reference
```
