# ConnectBPM

Evidence-native Business Process Management. Customers design workflows in a
visual designer, publish them as immutable process definitions, run instances
against an owned workflow engine, complete human tasks through forms and a task
inbox, and monitor performance through analytics — with an immutable, exportable
evidence record emitted by default.

> **Read before writing code**
> - `.claude/addendum.md` — stack, ports, mandatory reuse, verified tenancy finding
> - `docs/CEO-DECISIONS.md` — **binding**, DEC-001..DEC-008
> - `docs/architecture.md` and `docs/ADRs/` — the design this scaffold implements
> - `.specify/memory/constitution.md` — Articles III (TDD), IV (TypeScript), V (stack), XIII (CI), XIV (clean/secure code)

## Ports

| Surface | Port | Source |
|---------|------|--------|
| Web (Next.js) | **3123** | `.claude/PORT-REGISTRY.md` |
| API (Fastify) | **5018** | `.claude/PORT-REGISTRY.md` |
| PostgreSQL (local docker) | 5438 | unique to this product |
| Redis (local docker) | 6388 | unique to this product |

## Quick start

```bash
cp .env.example .env                 # then edit the secrets
pnpm install                         # from the repo root
pnpm --filter connectbpm docker:infra   # PostgreSQL + Redis
pnpm --filter @connectbpm/api db:roles  # ADR-004 §3 + ADR-010 — BEFORE the first migration
pnpm --filter connectbpm db:migrate
pnpm --filter connectbpm dev            # api :5018 + web :3123
```

### Database roles — do not skip `db:roles` (ADR-004 §3)

Row-level security is invisible to a privileged role. `FORCE ROW LEVEL
SECURITY` extends the policy to the table OWNER, but nothing extends it to a
superuser or to a role holding `BYPASSRLS`, so the second isolation layer exists
only if the connection the API uses is neither.

| Role | Used by | Posture |
|------|---------|---------|
| `connectbpm_migrator` | `prisma migrate`, owns the schema | NOSUPERUSER, NOBYPASSRLS — RLS applies to the owner too |
| `connectbpm_app` | the API | NOSUPERUSER, NOBYPASSRLS, DML only, no `CREATE`. **Cannot** call the job-claim functions |
| `connectbpm_runner` | the job runner (ADR-009) | as `connectbpm_app`, plus `EXECUTE` on the two ADR-010 claim functions — the only role that has it |
| `connectbpm_reconciler` | the nightly reconciliation (ADR-007) | as `connectbpm_app` |
| `connectbpm_job_claimer` | **nothing connects as it** — NOLOGIN | Owns the two claim functions. The single principal named by the only cross-tenant policy in the schema (ADR-010) |

`DATABASE_URL` names `connectbpm_app`. Pointing it at `postgres` makes the whole
isolation suite pass while the isolation does nothing — which is why the suite
asserts `rolsuper = false` and `rolbypassrls = false` before anything else.

**The runner is a different role from the API on purpose** (ADR-010). It is the
only principal that may lease jobs across tenants; if the API role could, a bug
on the HTTP surface could mark every tenant's timers `CLAIMED` and stop the
engine for everyone. Point the runner process's `DATABASE_URL` at
`connectbpm_runner`.

### The one cross-tenant reach in this product (ADR-010)

ADR-004 §3 puts `FORCE ROW LEVEL SECURITY` on all 27 tenant-scoped tables,
including `job`. ADR-009's runner has to claim due jobs **across** tenants in one
poll. Under `FORCE`, that claim matched zero rows **and reported success** — no
error, no log, timers silently never firing. The resolution is a bounded
exception, and this is its entire width:

| Dimension | Width |
|-----------|-------|
| Principal | `connectbpm_job_claimer`, NOLOGIN, NOBYPASSRLS |
| Reachable how | only by calling `app_claim_due_jobs()` or `app_reap_expired_job_leases()` |
| Tables | `job` only |
| Rows | `status IN ('PENDING','CLAIMED')` |
| Columns readable | `id, tenant_id, run_at, status, attempts, locked_until` — **not `payload`** |
| Columns writable | `status, locked_by, locked_until, attempts, updated_at` — **not `tenant_id`** |
| What crosses | `(job_id, tenant_id)`. Everything else happens inside `withTenant(tenantId)`. |

`gate:rls` check E asserts every one of those against the live database, and
`tests/integration/tenancy/job-claim-boundary.test.ts` asserts that a claim
actually reaches **both** tenants — because a runner that claims nothing looks
exactly like a runner with nothing to do.

Verify: `curl http://localhost:5018/health`

## Layout

```
apps/api/            Fastify + Prisma. Also the job runner (ADR-009), same image.
  prisma/schema.prisma   32 models, copied verbatim from docs/db-schema.prisma
  scripts/               the two product CI gates (see below)
  src/config/            the ONLY place process.env is read
  src/lib/               errors, response envelope, error mapping
  src/plugins/           infrastructure wiring
  tests/                 unit + integration, real PostgreSQL and Redis
apps/web/            Next.js 14 App Router + Tailwind + @xyflow/react
e2e/                 Playwright — chromium, chromium-rtl, mobile
```

## The two product gates

Generic CI (lint, typecheck, tests, 80% coverage, security audit, traceability)
runs in `.github/workflows/connectbpm-ci.yml`. Two gates are specific to this
product's architecture and are **build failures, not review opinions**.

### `pnpm gate:rls` — tenant isolation · ADR-004, NFR-008, AC-051

A cross-tenant leak is the one existential bug here. The gate asserts:

| Check | State |
|-------|-------|
| A — every model carries `tenantId` unless on the reviewed 5-model global allowlist | **enforcing, passing** |
| B — every `@@index` on a tenant-scoped model leads with `tenantId` | **enforcing, passing** (3 reviewed exceptions, each with a written reason in `scripts/check-rls.ts`) |
| C — every tenant-scoped table has `ENABLE` + `FORCE` RLS and a policy | **enforcing, passing** since `20260820125500_row_level_security` |
| D — the same assertion against a live database (`--live`) | **enforcing, passing**. `pnpm gate:rls:live` |
| E — the ADR-010 job-claim boundary is exactly as narrow as the ADR says | **enforcing, passing**. Static form always; owner, NOLOGIN/NOBYPASSRLS posture, pinned `search_path`, column grants, table reach and `EXECUTE` grants under `--live` |

Checks C and D were red by design until the tenancy task landed the RLS
migration; they are green now. The isolation guarantee is only real if the
connection also lacks `BYPASSRLS` and superuser — see the roles below, and
`tests/integration/tenancy/rls-enforcement.test.ts`, which asserts the role
posture before it asserts anything about policies.

### `pnpm gate:metering` — metering boundary · DEC-002 MET-2/MET-3, AC-012/AC-013

DEC-002 is irreversible and retroactive metering is impossible. The gate is
**fully enforcing today**; it finds nothing only because the metering path is not
written yet, and `tests/unit/gates/` proves it by feeding it planted violations.

- No `UsageService` import from `@connectsw/billing` outside `src/services/soft-limits/`
- No `usageEvent.create|createMany|upsert` outside `src/metering/usage-ledger.ts`
- No raw SQL `INSERT INTO usage_event` outside that module
- No `usageEvent.update|delete` anywhere — the ledger is append-only (MET-5)
- No `eval`, `new Function`, `vm2`, `isolated-vm`, `filtrex`, `expression-eval`,
  `jse-eval` or `safe-eval` anywhere (NFR-009, ADR-002)

## Conventions this scaffold sets

These propagate. Follow them rather than inventing a second way.

| Area | Rule |
|------|------|
| Config | `process.env` is read only in `src/config/index.ts`. Add to the Zod schema, then use `getConfig()`. Bad config crashes at boot, never at first use. |
| Errors | Routes **throw** an `AppError` subclass. They never build a reply. Mapping lives in `src/lib/map-error.ts` — pure, testable without an app. |
| Isolation | A cross-tenant read is `NotFoundError` (404), never 403. Existence is not disclosed (FR-003, AC-052). |
| Responses | `sendOk(reply, data)` / `sendError(reply, payload)`. One envelope. |
| Data access | `withTenant(ctx, fn)` returning a branded `TenantScopedClient` is the only entry point. `fastify.prisma` is raw and is for migrations, health and the runner only. A repository that takes a `PrismaClient` **does not compile** — `tests/type-fixtures/brand-forgery.ts` asserts it with `@ts-expect-error`, and eslint bans `as TenantScopedClient` outside `src/tenancy/`. The brand is over `Prisma.TransactionClient`, not `PrismaClient`: inside a transaction `$transaction`, `$connect` and `$extends` do not exist. |
| Background work | A background process must be tested against **two** tenants, asserting it reaches both — never merely that it runs without error. Under RLS a process that reaches nothing returns an empty result and looks healthy; that is how ARCH-02's bug hid. `tests/db.ts` `seedDueJob` exists for job-shaped processes. |
| Cross-tenant reach | There is exactly one, and it is `app_claim_due_jobs` / `app_reap_expired_job_leases` (ADR-010). Anything else that needs to see more than one tenant loops over tenant ids and enters `withTenant` per tenant, like the nightly reconciliation. Widening the boundary fails `gate:rls` check E. |
| Metering | `recordBillableCompletion(tx: TransitionTx, …)` is the only usage-event writer, and `TransitionTx` is constructible only inside the Transition Coordinator. |
| Transactions | Nothing external is called inside a transaction. Side effects go to the outbox in the same transaction, drained by the runner. |
| App wiring | `buildApp()` is the only way an app instance exists — tests build the same object the server does. |
| Tests | Real PostgreSQL and real Redis. No mocks of the database, the cache, or the store. Two tenants in every isolation fixture. |
| Correlation | `X-Request-ID` is minted by `genReqId` (before the logger's child exists) and echoed on the response. `requestId` and `tenantId` on every log line; never a `/// @pii` field. |
| Redis | Cache and soft counters only. Never a value correctness depends on. Keys are `bpm:{tenantId}:…`. |
| RTL | Logical Tailwind utilities and `dir="rtl"`. **Never `scaleX(-1)`** — it mirrors Arabic glyphs. Lint enforces this. |
| E2E | One directory per story under `e2e/tests/stories/<story-id>/`. |

## Commands

```bash
pnpm --filter connectbpm dev            # api + web
pnpm --filter connectbpm test           # unit + integration, both apps
pnpm --filter connectbpm lint
pnpm --filter connectbpm typecheck
pnpm --filter connectbpm gates          # both product gates
pnpm --filter @connectbpm/api gate:rls:live   # check D, against a real database
pnpm --filter @connectbpm/api db:roles        # (re-)provision the five DB roles
pnpm --filter connectbpm test:e2e
pnpm --filter connectbpm docker:infra   # PostgreSQL + Redis only
docker compose --profile runner up -d   # add the job runner (ADR-009)
```

## Architecture notes worth knowing before you start

- **PostgreSQL is the sole source of truth** for state, evidence and meters.
  Redis holds nothing correctness depends on (ADR-004, ADR-007, ADR-009).
- **`api` and `runner` ship from one image**, distinguished by `RUN_JOB_RUNNER`.
  This is not a microservice boundary.
- **Published definition versions are immutable**; a running instance stays
  pinned to the version it started on, for life (ADR-008).
- **Customer-authored logic is untrusted input.** Conditions are parsed at
  publish time into a pinned AST and evaluated by a total budgeted tree-walker.
  There is no `eval` path, at any depth (ADR-002).
- **`@connectsw/billing`'s `UsageService` is forbidden** in the instance-metering
  path. The import is a build failure (AC-013).
