# ConnectBPM — CEO Decisions Log

Decisions made by the CEO at the Phase 0 checkpoint. These are **binding constraints** on
all downstream specification, architecture, and implementation work. An agent that wants to
deviate must escalate to the Orchestrator — not decide unilaterally.

---

## DEC-001 — Market Wedge: evidence-native core, GCC go-to-market

**Date**: 2026-08-20
**Inputs**: BA-01 Q1/Q4 (compliance mid-market, geography-agnostic) vs. STRAT-01 WD-2∩WD-3 (GCC Arabic-first, in-region)
**Decision**: **Both.** Build the product **geography-neutral** around the audit-evidence core;
aim the **first go-to-market and template library at the GCC**.

### Binding consequences

| Consequence | Requirement |
|-------------|-------------|
| Evidence architecture | Day-one architectural commitment, NOT a Phase-2 feature. Every process instance emits an immutable, version-pinned, exportable evidence record by default. |
| Arabic / RTL | In v1 scope. Follow `.claude/protocols/i18n.md`. Proven precedent: `connectin`, `muaththir`. |
| Geography neutrality | No GCC assumption may be hard-coded into the data model, engine, or schema. Locale, jurisdiction, and regulatory templates are **configuration**, not structure. |
| In-region hosting | NOT in v1. The architecture MUST NOT foreclose it — deployment topology must permit a future in-region/sovereign deployment without re-architecture (STRAT A4 is unvalidated). |
| Regulatory templates | GCC-oriented template library in v1, but as data, not code. |

**Rejected**: a pure geography-agnostic play (STRAT's evidence that a horizontal entrant loses to
bundled Power Automate is accepted) and a GCC-only product (would foreclose the wider market).

---

## DEC-002 — Pricing Metric: completed process instances only, no seats

**Date**: 2026-08-20
**Inputs**: BA-01 Q5 (instances started + named designer seats) vs. STRAT-01 §7 (completed instances, never seats)
**Decision**: **Completed process instances only. No seat metering of any kind. Unlimited free participants on every tier.**

**Rationale accepted**: per-seat pricing loses a direct USD 15/user comparison with Power Automate
Premium and suppresses the participation that creates switching cost.

### Binding consequences — this is IRREVERSIBLE

Retroactive metering is impossible. The engine MUST instrument these from day one:

| ID | Requirement |
|----|-------------|
| MET-1 | The billable event is instance **completion**, not instance start. Definition of "completed" (including terminated, cancelled, and error-terminal states) MUST be specified unambiguously in the PRD — it is the revenue definition. |
| MET-2 | The meter increments inside the **same DB transaction** as the instance state transition, with an idempotency key. |
| MET-3 | Exactly-once accounting on an at-least-once execution substrate — replay-safe (STRAT M12). |
| MET-4 | Pre-start quota refusal hook: tier limits enforced **before** instance creation (STRAT M13). |
| MET-5 | The meter is immutable and reconcilable against the audit trail. |
| MET-6 | Per-tenant sandbox CPU/memory metering — this is COGS **and** the security boundary (STRAT M7). |
| MET-7 | All secondary dimensions instrumented day one even if not billed in v1. Adding a meter later cannot recover history. |

**Explicitly NOT required**: designer-vs-participant role separation for billing (STRAT M3). With no
seat metering there is no free-participant entitlement to leak. Role separation is still required
for **authorization**, which is a different concern.

**Note for the PRD**: `@connectsw/billing`'s `UsageService` is a Redis-counter path keyed to `userId`.
It does **not** satisfy MET-2 or MET-3 and MUST NOT be used for instance metering as-is.

---

## DEC-003 — Sequencing: proceed to PRD and architecture now

**Date**: 2026-08-20
**Inputs**: STRAT-01 kill criterion K0 (month-3 gate: named GCC design partner + 10/15 discovery interviews)
**Decision**: **Proceed to the PRD and architecture checkpoints now.** These are design artifacts,
cheap relative to a build, and they make the validation conversations concrete.

**The K0 gate is deferred, not cancelled.** It applies **before foundation implementation begins**.
The Orchestrator MUST re-raise it at the pre-implementation checkpoint. Unvalidated assumptions
carried into design: STRAT A4 (in-region hosting feasible), A6 (40 paying tenants without a sales
team), A9 (GCC auditors accept engine-produced evidence), and BA ASM-003 (the wedge itself).

---

## Conflicts resolved by these decisions

| Conflict | BA-01 said | STRAT-01 said | Resolution |
|----------|-----------|---------------|------------|
| Geography | Geography-agnostic | GCC-only | DEC-001: neutral core, GCC GTM |
| Pricing metric | Instances started + designer seats | Completed instances, no seats | DEC-002: completed instances, no seats |
| Arabic/RTL in v1 | Not raised | Day one | DEC-001: in v1 |
| Build before validation | GO at MVP boundary | Gate at month 3 | DEC-003: design now, gate before build |

## Conflicts NOT resolved here — delegated to ARCH-01

| Conflict | Detail | Owner |
|----------|--------|-------|
| Expression evaluation | BA-01 BR-005: no customer script execution at all in v1, using a restricted non-Turing-complete grammar (removes the sandbox from the critical path). STRAT-01 Now horizon lists "expression sandboxing". These are reconcilable — a restricted grammar still needs safe evaluation — but the Architect MUST decide the mechanism and record it as an ADR. Note DEC-002 MET-6 still requires per-tenant resource metering regardless. | Architect |
| `credit-os` overlap | ConnectBPM owns the generic engine; `credit-os` keeps credit domain semantics. Harvest patterns, do not fork code. No migration before month 24. Requires an ADR. | Architect |
| Process notation | BA-01 Q3: no BPMN authoring in MVP; build the engine on a strict subset of BPMN execution semantics (6 elements, each with a documented 1:1 BPMN mapping). STRAT did not contest this. Architect confirms or overrides with an ADR. | Architect |
