# ConnectBPM - Agent Addendum (refined by PM after PRD-01; technical sections filled by the Architect after ARCH-01)

## Product Overview

**Name**: ConnectBPM
**Type**: Web app (full-stack, multi-tenant SaaS — sold to external customers)
**Status**: Inception
**Description**: Commercial Business Process Management suite. Customers design their own
business workflows in a visual designer, publish them as executable process definitions,
run instances against a workflow engine, complete human tasks via forms and a task inbox,
and monitor performance through process analytics.

**Commercial framing**: This is a product we SELL. Multi-tenant, subscription-tiered,
self-serve onboarding. Tenant isolation and per-tenant limits are first-class concerns,
not afterthoughts.

## Core Capability Pillars (CEO brief)

| Pillar | Description |
|--------|-------------|
| Visual Process Designer | Drag-and-drop canvas where a customer models their workflow |
| Workflow Engine | Executes published process definitions; tokens, state, transitions, timers |
| Forms | Customer-defined data capture attached to user tasks (form builder + renderer) |
| Task Inbox | Where a customer's end users see and complete assigned work |
| Process Analytics | Cycle time, bottlenecks, throughput, SLA breaches per process |

## Ports (registered)

| App | Port |
|-----|------|
| Web (Next.js) | 3123 |
| API (Fastify) | 5018 |

## Default Tech Stack (Constitution Article V — deviations need an ADR)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ / React 18+ (port 3123) |
| Backend | Fastify / TypeScript (port 5018) |
| Database | PostgreSQL 15+ |
| ORM | Prisma |
| Cache / queue backing | Redis |
| Styling | Tailwind CSS + shadcn/ui |
| Testing | Jest, React Testing Library, Playwright |
| CI/CD | GitHub Actions |

## Mandatory Reuse (Constitution Article II — check before building)

| Need | Package |
|------|---------|
| Auth (JWT + API keys, sessions, password reset) | `@connectsw/auth` |
| Subscriptions, tier gating, usage metering | `@connectsw/billing` |
| Webhooks (process events out to customer systems) | `@connectsw/webhooks` |
| Email + in-app notifications (task assigned, SLA breach) | `@connectsw/notifications` |
| Audit trail (who changed which process definition) | `@connectsw/audit` |
| Logger, crypto, Prisma/Redis plugins | `@connectsw/shared` |
| UI primitives, DashboardLayout, Sidebar, DataTable | `@connectsw/ui` |
| Health, metrics, correlation IDs | `@connectsw/observability` |
| Product scaffold generation | `@connectsw/saas-kit` |

## BINDING CEO DECISIONS (read `docs/CEO-DECISIONS.md` in full before any work)

| ID | Decision | Consequence |
|----|----------|-------------|
| DEC-001 | Wedge: **evidence-native core, GCC go-to-market** | Evidence record is a day-one architectural commitment. Arabic/RTL in v1. Product stays geography-neutral — locale/jurisdiction/templates are configuration, never structure. In-region hosting is not v1 but MUST NOT be foreclosed. |
| DEC-002 | Pricing: **completed process instances only, no seats, unlimited free participants** | IRREVERSIBLE. Seven metering requirements (MET-1..MET-7) on the engine. Billable event is instance *completion*. Meter increments in the same DB transaction as the state transition, idempotent and replay-safe. `@connectsw/billing` UsageService (Redis counters keyed to userId) does NOT satisfy this. |
| DEC-003 | Sequencing: **PRD + architecture now**, K0 validation gate before implementation | Design proceeds. Four assumptions carried unvalidated (A4, A6, A9, ASM-003). Orchestrator re-raises K0 before foundation build. |

## CRITICAL FINDING — shared packages have NO tenancy (verified)

`packages/` contains zero tenancy. Verified by the Orchestrator, not assumed:
- `grep -ril "tenantid\|tenant_id" packages/` → **0 files**
- No `Tenant`, `Organization`, `Workspace`, or `Account` model in any package schema
- `@connectsw/billing` keys `Subscription` and `UsageRecord` to `userId`

The "Mandatory Reuse" table below is therefore **optimistic**. Correct classification:

| Package | Reality |
|---------|---------|
| `@connectsw/auth` | **EXTEND** — no tenant dimension |
| `@connectsw/billing` | **EXTEND** — user-keyed; Redis usage path cannot meet DEC-002 MET-2/MET-3 |
| `@connectsw/audit` | **EXTEND** — no tenant dimension |
| `@connectsw/webhooks` | **REUSE code / EXTEND schema** — `WebhookEndpoint` is keyed to `userId` (ARCH-01 correction) |
| `@connectsw/notifications` | **REUSE code / EXTEND schema** — `Notification` is keyed to `userId` (ARCH-01 correction) |
| Tenancy itself | **BUILD** (BA gap G-08, ~3 sprints). Gates every pillar. |

## Architecture — RESOLVED in ARCH-01 (2026-08-20)

All six open questions are closed. Binding artifacts: `docs/architecture.md`,
`docs/api-contract.yaml`, `docs/db-schema.prisma`, `docs/ADRs/001`-`009`, PRD §10.5.

| Question | Resolution | ADR |
|----------|-----------|-----|
| Process notation | **SCOPE-AMD-001 RATIFIED** — E1..E7 with E7 `Schedule`; bulk start as a capability, NOT `multiInstanceLoopCharacteristics`. Plus `InstanceBatch`, E1+E7 coexistence, `ScheduleOccurrence`. ASM-005 → 15/15. | ADR-001 |
| Engine: adopt vs build | **BUILD** a token interpreter over PostgreSQL. Camunda 8/Zeebe, Temporal, Flowable all evaluated and rejected — every third-party engine keeps state in its own store, so `MET-2` is architecturally unavailable. | ADR-005 |
| Canvas library | **`@xyflow/react` (React Flow, MIT)**. bpmn-js rejected — non-removable watermark linking to a competitor, full-BPMN palette against `FR-011`, no RTL mirroring. | ADR-006 |
| Durable execution and timers | **One `job` table, `SELECT FOR UPDATE SKIP LOCKED`** (PATTERN-014). No Redis queue — `FR-045`. Serves timers, schedules, retries and the transactional outbox. | ADR-009 |
| Multi-tenancy isolation | **Shared schema + `tenantId` + MANDATORY PostgreSQL RLS.** Deployment topology is the sovereignty lever (`NFR-019`). | ADR-004 |
| Forms/definition versioning + instance migration | Published versions **immutable** (repository check + DB trigger); instances pinned for life; checksum = `SHA-256(JCS(graph + ASTs + forms))`. Migration designed, not built; not foreclosed because every **evidence entry** carries `definitionVersionId`. | ADR-008, schema |
| Expression evaluation *(delegated by DEC)* | **Owned restricted grammar**, parsed at publish to a pinned AST, evaluated by a total budgeted tree-walker. No `eval`/`Function`/VM/isolate anywhere. Fuzzed with `fast-check` in CI. | ADR-002 |
| `credit-os` overlap *(delegated by DEC)* | **Harvest five patterns, share zero code/schema/package.** Re-evaluate at month 24 or on three named triggers; `FR-065` keeps convergence cheap. | ADR-003 |

## Confirmed Tech Stack (Article V — no deviation)

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 App Router · React 18 · Tailwind · shadcn/ui · **`@xyflow/react`** (designer canvas) · port 3123 |
| Backend | Fastify · TypeScript strict · Prisma · Zod · port 5018 |
| Database | PostgreSQL 15+ — **sole source of truth** for state, evidence and meters; RLS enabled and forced |
| Cache | Redis — cache and soft counters only; never a value correctness depends on |
| Processes | `api` and `runner` from one image. NOT a microservice boundary |
| Testing | Jest + real PostgreSQL and real Redis (no mocks), Playwright, `fast-check` for the grammar |

## Libraries — use these, avoid these

**Use**: `@xyflow/react` (MIT) · `elkjs` (EPL-2.0, template auto-layout only) · `cron-parser` (MIT,
E7 recurrence) · `luxon` (MIT, IANA/DST) · `zod` · `fast-check` (MIT).

**Never**: `filtrex`, `expression-eval`, `jse-eval`, `safe-eval`, `vm2`, `isolated-vm`, `new Function`,
`eval` — any path from customer input to a callable violates `NFR-009` **absolutely**.
`@connectsw/billing`'s `UsageService` — **forbidden in the instance-metering path; the import is a
build failure (`AC-013`)**. `bpmn-js` — watermark licence.

## Design Patterns (binding for implementers)

1. **`withTenant(ctx, fn)` is the only data-access entry point.** Repositories accept
   `TenantScopedClient` (a branded type), never a raw `PrismaClient`. An unscoped query does not
   compile. RLS is the second layer beneath it.
2. **The Transition Coordinator is the only path for a state change.** Target ≤ 200 LOC so
   `NFR-018`'s 100% branch coverage is meaningful.
3. **Element executors are pure**: `(token, element, snapshot) → Effect[]`, no database access. The
   coordinator applies effects. This is what makes no-mock testing possible.
4. **`recordBillableCompletion(tx: TransitionTx, …)` is the only usage-event writer**, and
   `TransitionTx` is constructible only inside the coordinator.
5. **Nothing external is called inside a transaction.** Side effects go to the outbox in the same
   transaction and are drained by the runner.
6. **Idempotency keys are derived from immutable identifiers only** — never a clock, a random value or
   an attempt counter.
7. **Staleness is decided by token version, never by wall clock.**
8. **RTL is a coordinate projection on the canvas, never `transform: scaleX(-1)`** (which would mirror
   Arabic text). Stored coordinates stay canonical and direction-independent.
9. **Storage rule**: if a query filters or traverses it, it is an indexed column; if it is evolving
   configuration shape, it is JSONB with a Zod schema at the boundary.
10. **Every index on a tenant-scoped table leads with `tenantId`.**

## Key Data Models

28 models in `docs/db-schema.prisma`. The load-bearing ones: `Tenant` · `Membership` ·
`WorkingCalendar` (the geography-neutrality mechanism) · `ProcessDefinition(Version)` (immutable when
published) · `FormSchema` (stable machine keys) · `ProcessInstance` (+ `evidenceSeq` for gap-free
sequencing) · `Token` (+ `version` for stale-timer detection) · `Task` · `EvidenceEntry` (hash-chained,
append-only, erasure-safe) · `UsageEvent` (append-only billable ledger, unique idempotency key) ·
`QuotaReservation` + `QuotaCounter` (admission) · `UsageCounter` + `UsageDistinctActor` (MET-7
secondary dimensions) · `Job` (timers, schedules, outbox) · `InstanceBatch` + `ScheduleOccurrence`
(ADR-001 amendments).

## Performance Requirements (design targets)

| Target | Requirement | Design response |
|--------|-------------|-----------------|
| Engine transition p95 ≤ 500 ms | `NFR-001` | One transaction, indexed lookups, no external calls inside it |
| Timers ≥99% within 60 s through a 50,000 burst | `NFR-004` | ~825 claims/s needed; batch 200 × 8 workers ≈ 3× headroom; partial index on `status='PENDING'` |
| 100% crash resume, zero duplicate side effects | `NFR-005` | All state in PostgreSQL; jobs are rows; outbox |
| Single-task view interactive ≤ 2.0 s on 4G / 375 px | `NFR-003` | No canvas on that route; version-pinned form only |
| v1 scale: 200 tenants, 100k completions/month, 500k open timers | `NFR-014` | Single well-indexed PostgreSQL is comfortable. First lever is read replicas for analytics; second is monthly partitioning of `evidence_entry` and `usage_event`. **Neither is v1 work.** |

## Special Considerations

1. **Tenant isolation is a security boundary.** Every query is tenant-scoped. This is the
   single highest-risk area of the product — a leak across tenants is an existential bug.
2. **Customer-authored logic executes on our infrastructure.** Expressions, conditions, and
   scripts in customer process definitions are untrusted input. Sandboxing is mandatory.
3. **Versioning.** Published process definitions are immutable; running instances stay pinned
   to the version they started on.
4. **Correctness over features.** A workflow engine that loses or duplicates work is worthless.
   Idempotency and exactly-once semantics on state transitions are non-negotiable.

---

*Created by*: Orchestrator (seed) · *Product sections*: Product Manager (PRD-01) · *Technical sections*: Architect (ARCH-01)
*Last Updated*: 2026-08-20 (ARCH-01)
