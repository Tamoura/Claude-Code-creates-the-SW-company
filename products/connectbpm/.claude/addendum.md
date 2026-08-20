# ConnectBPM - Agent Addendum (SEED — refined by PM after PRD-01)

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
| Tenancy itself | **BUILD** (BA gap G-08, ~3 sprints). Gates every pillar. |

## Open Architecture Questions (resolve in ARCH-01 via ADRs)

1. Process notation: BPMN 2.0 standard vs. simplified proprietary flow model.
2. Engine: adopt an existing engine vs. build a token-based executor on Postgres.
3. Canvas library for the designer (bpmn-js / React Flow / custom).
4. Durable execution and timers: Postgres-backed job table vs. Redis queue vs. external.
5. Multi-tenancy isolation model: shared schema + tenant_id vs. schema-per-tenant.
6. Form definition storage and versioning; process definition versioning + running-instance migration.

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

*Created by*: Orchestrator (seed)
*Last Updated*: 2026-08-20
