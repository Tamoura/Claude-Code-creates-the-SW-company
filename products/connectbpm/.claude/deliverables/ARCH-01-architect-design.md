# ARCH-01 — System Architecture · Architect Deliverable

**Product**: connectbpm · **Task**: ARCH-01 · **Date**: 2026-08-20
**Branch**: `claude/bpm-workflow-product-9p2fxy` · **Status**: complete, awaiting CEO checkpoint

> Pointer + executive summary. The binding artifacts are the files listed below; where this summary
> and an ADR differ, **the ADR governs**.

## Artifacts

| Artifact | Path | Size |
|----------|------|------|
| System architecture — C4 L1/L2/L3, data flows, security, error handling | `products/connectbpm/docs/architecture.md` | 10 diagrams |
| API contract — OpenAPI 3.0, the complete inventory | `products/connectbpm/docs/api-contract.yaml` | 67 paths, **87 operations**, 76 schemas |
| Data model — design artifact, valid Prisma | `products/connectbpm/docs/db-schema.prisma` | **28 models** |
| ADR-001 Process notation and SCOPE-AMD-001 | `docs/ADRs/001-process-notation-and-scope-amd-001.md` | |
| ADR-002 Expression evaluation | `docs/ADRs/002-expression-evaluation.md` | |
| ADR-003 The `credit-os` boundary | `docs/ADRs/003-credit-os-boundary.md` | |
| ADR-004 Multi-tenancy isolation | `docs/ADRs/004-multi-tenancy-isolation.md` | |
| ADR-005 Engine build vs adopt | `docs/ADRs/005-workflow-engine-build-vs-adopt.md` | |
| ADR-006 Designer canvas library | `docs/ADRs/006-designer-canvas-library.md` | |
| ADR-007 Transactional usage ledger and quota | `docs/ADRs/007-transactional-usage-ledger-and-quota.md` | |
| ADR-008 Evidence hash chain and erasure | `docs/ADRs/008-evidence-hash-chain-and-erasure.md` | |
| ADR-009 Durable job substrate and outbox | `docs/ADRs/009-durable-job-substrate-and-outbox.md` | |
| PRD §10.5 Technical Architecture | `products/connectbpm/docs/PRD.md` §10.5 | placeholder filled |

**No `apps/` scaffolding and no implementation code** — DEC-003 holds the build behind K0.

## The four delegated decisions

| ADR | Decision | Decisive reason |
|-----|----------|-----------------|
| **001** | **SCOPE-AMD-001 RATIFIED** + 3 amendments (`InstanceBatch` entity, E1+E7 coexistence, `ScheduleOccurrence` idempotency ledger). `multiInstanceLoopCharacteristics` rejected. ASM-005 → **15/15**. | Multi-instance fan-out makes 400 attestations **one** billable completion — a different revenue model, not a different notation. DEC-002 is irreversible. |
| **002** | Owned restricted grammar, parsed **at publish time** to a pinned AST, evaluated by a total budgeted tree-walker. | Every candidate library compiles to a runtime JS function (`filtrex` — flat `NFR-009` violation), is unmaintained and not a sandbox (`expression-eval`), or is a far larger language than `FR-022` allows (CEL). |
| **003** | Harvest **five patterns**, share **zero** code/schema/package. Re-evaluate at month 24 or on three named triggers. | `credit-os` is a **stage machine**; ConnectBPM is a **token engine**. Its constraint is its value there. |
| **004** | Shared schema + `tenantId` + **mandatory** PostgreSQL RLS; **deployment topology** is the sovereignty lever. | Schema-per-tenant breaks the durable job substrate — one indexed poll becomes 200, risking `NFR-004` for isolation RLS already gives. |

## The metering mechanism, in three sentences

A crash between the state transition and the meter increment **cannot occur**, because the token move,
the evidence entry and the usage-event insert are statements in **one PostgreSQL transaction** — the
crash loses all three or commits all three. On redelivery the idempotency key is recomputed from
immutable identifiers only — `sha256(instanceId ‖ tokenId ‖ fromElementId ‖ transitionId ‖ purpose)`,
no clock, no random, no attempt counter — so `UNIQUE(tenantId, idempotencyKey)` rejects the second
insert and the token-version guard matches zero rows, making the replay an empty transaction that
returns the first result. The nightly three-way reconciliation then asserts the invariant daily rather
than trusting it, with exact agreement required and a deliberately injected divergence caught in CI.

Enforced structurally: `recordBillableCompletion(tx: TransitionTx, …)` is the only writer, and
`TransitionTx` is a branded type constructible only inside the coordinator. That is what makes
`AC-012` real — a lint rule alone cannot decide it.

## Reuse — the honest position

| Package | Position |
|---------|----------|
| `shared`, `observability`, `ui`, `saas-kit` | **REUSE as-is** (`ui` re-verified in RTL) |
| `webhooks`, `notifications` | **REUSE code / EXTEND schema** — *correction to SPEC-01, which lists both as REUSE; their schemas are user-keyed too* |
| `auth` | **EXTEND** — `User` stays global; `Membership` is new |
| `billing` | **PARTIAL** — `Subscription` re-keyed to `tenantId`; **`UsageService` FORBIDDEN in metering (`AC-013`)** |
| `audit` | **EXTEND substantially** — administrative audit only; the evidence chain is separate |
| Tenancy, engine, definitions, canvas, grammar, forms, inbox, ledger, evidence trail | **BUILD** |

**The platform is bought; the product is built.**

## Rejected after evaluation

**Engines** — Camunda 8/Zeebe (Camunda License 1.0, production licence required since 8.6; and `MET-2`
is architecturally unavailable because Zeebe's state is its own store reached by at-least-once
exporters); Temporal (MIT, but durable execution for *code*, not customer-authored graphs, and a second
state store); Flowable (Apache-2.0, right shape, wrong runtime — JVM, plus a competing history model
and the full BPMN element surface against `FR-011`); n8n (source-available licence restricting
service offerings, wrong category); small Node BPMN engines (bus factor on the revenue path).

**Canvas** — bpmn-js (its licence requires a **non-removable watermark linking to bpmn.io**, i.e. a
competitor's brand on our primary authoring surface; it authors full BPMN; no RTL mirroring); JointJS+
(commercial per developer); mxGraph (archived).

## Ten things I believe are wrong, unachievable or missing

Full detail in `docs/architecture.md` §10. Four need someone else's decision:

1. **The Sandbox tier has no instance allowance.** DEC-005 gives three numbers for five tiers, yet
   `FR-115`/`AC-020` require a non-removable Sandbox hard cap — untestable as written. **CEO number
   needed**; designing against a proposed 50/month meanwhile.
2. **`AC-070`'s "no duplicated notification"** is unachievable at the email-provider boundary. We
   guarantee no duplicate notification *record* and choose at-least-once email deliberately. **PM reword.**
3. **`NFR-002`** cannot gate the Foundation checkpoint (it needs real untrained users). The gate should
   assert instrumentation, not the value. **PM/QA reword.**
4. **`AC-012`/`AC-051`** are satisfiable only with the branded-type mechanism, not by lint — so the
   mechanism is **not optional**. **QA to note at `/speckit.analyze`.**

Also corrected: SPEC-01's `ScheduleSubscription.lastOccurrenceAt` is not crash-safe for `FR-060`
(ADR-001 A3 replaces it); `MET-6`'s word "sandbox" is read as expression-evaluation resource
accounting, since `NFR-009` forbids the isolate it implies.

## Verification performed

| Check | Tool | Result |
|-------|------|--------|
| Mermaid diagrams parse | real `mermaid.parse()` v11 | **17/17 PASS** across ADRs + architecture.md (2 genuine failures found and fixed: a `;` inside a sequence-diagram message) |
| PRD diagrams still parse after the §10.5 edit | same | 12/12 PASS |
| Prisma schema valid | `prisma validate` | **valid** |
| OpenAPI 3.0 valid | `@redocly/cli lint` | **valid**, 0 errors (1 genuine structural error found and fixed), 43 style warnings |
| Tenancy finding re-verified | `grep -ril "tenantid\|tenant_id" packages/` | **0 files** — confirmed independently |
| `UsageService` unusable for MET-2/3 | read `packages/billing/src/backend/services/usage.service.ts` | confirmed: Redis `INCRBY` keyed to `userId`, non-transactional |
| PATTERN-014 real | read `packages/webhooks/src/backend/services/delivery.service.ts:98-128` | confirmed: real `FOR UPDATE SKIP LOCKED` + composite unique |
| `credit-os` shape | read `apps/api/prisma/schema.prisma:198-266`, `kernel/tenant-context.ts`, ADR-004 | confirmed: stage machine, not a token engine |

---
*ARCH-01 · Architect, ConnectSW · 2026-08-20*
