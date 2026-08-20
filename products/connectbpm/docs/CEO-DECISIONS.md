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

---

## DEC-004 — Revenue policy: cancelled instances billable when ≥1 Step completed

**Date**: 2026-08-20 · **Checkpoint**: PRD-01 · **Raised by**: Product Manager (RISK-PM-02)
**Decision**: **RATIFIED.** The PM's rule stands as written in PRD §5.3 and `FR-104`.

An administratively cancelled instance is billable if and only if at least one `Step` had already
been completed. Instances cancelled before any Step completed are never billable.

**Why this needed CEO ratification**: MET-1 asked the PM to define "completed" unambiguously, but
the cancellation case is a **pricing policy** question, not a definitional one — it has no
technically correct answer. The PM correctly declined to make it silently.

**Rationale accepted**: it is the smallest precise test that closes the invoice-avoidance hole
(cancel every instance at its last Step to zero the invoice) without opening the
charged-for-a-mistake hole.

**Binding consequences**:
- Every usage event MUST record `completedStepCountAtEvent` as the justification for its billable
  determination. This preserves the ability to apply a different rule to historical data without
  re-deriving it. This is not optional instrumentation.
- The pricing page MUST state in plain language that negative outcomes (Rejected, Denied,
  Withdrawn) are completions and are billable. A customer discovering this on an invoice is a
  billing dispute in a product sold on trustworthiness.
- Changing this rule after launch means re-billing history. Treat it as frozen.

---

## DEC-005 — Open clarifications resolved: CLR-B deferred, CLR-C provisional

**Date**: 2026-08-20 · **Checkpoint**: PRD-01
**Decision**: **Both PM recommendations accepted.**

### CLR-B — external (non-tenant) participants: DEFERRED TO PHASE 2
v1 ships **tenant-members-only**. No signed-link completion by parties outside the tenant.

- **Accepted cost**: template T02 (vendor onboarding / KYC) ships degraded — a staff member
  transcribes the external party's submission.
- **Why deferred rather than dropped**: adding an unauthenticated actor to the evidence model later
  is expensive, so the Architect MUST NOT foreclose it. The evidence model needs a place for a
  non-member actor identity even though v1 never populates it.

### CLR-C — tier price points: PROVISIONAL UNTIL K0
The **tier structure** (Sandbox / Starter / Growth / Business / Sovereign) is **normative now** and
the Architect designs against it. The **price points** (USD 299 / 899 / 2,499) are **provisional and
stay unpublished** until the K0 discovery interviews validate them.

- Instance allowances per tier (2,500 / 15,000 / 60,000 per month) ARE normative — the engine's
  quota enforcement is designed against them.

---

## DEC-006 — Proceed to ARCH-01

**Date**: 2026-08-20 · **Checkpoint**: PRD-01 — **APPROVED**
The PRD and specification are approved. Architecture proceeds.

The K0 validation gate remains deferred to **before foundation implementation** (DEC-003), not
before architecture.

---

## Orchestrator note on RISK-PM-01 severity

The PM scored RISK-PM-01 (the "unlimited free participants" promise versus per-instance billing on
fan-out templates) at **9/9 — the highest in the register**. The Orchestrator checked the magnitude
against the published tier allowances rather than accepting the rating:

| Scenario | Instances | Against Starter's 2,500/month (30,000/year) |
|----------|-----------|---------------------------------------------|
| 400-person annual attestation (T04) | 400/yr | ~1.3% of annual allowance |
| 400-person quarterly attestation | 1,600/yr | ~5% of annual allowance |
| 2,000-person monthly attestation | 24,000/yr | ~80% — but a 2,000-employee tenant sits on Growth (180,000/yr) |

**Assessment**: the *perception* problem is real and worth solving on the pricing page — "unlimited
free participants" alongside one billable instance per participant reads as a contradiction. The
*economic* problem is materially smaller than 9/9 implies at current allowances. The PM's proposed
remedy (a distinct lower-priced campaign meter) is **not required for v1**; MET-7 instrumentation
keeps the option open without losing history. Revisit if K0 interviews surface it as an objection.

**Severity re-rated: 4/9.** Mitigation retained: disclosure via AC-018, AC-031.

---

## DEC-007 — Sandbox tier allowance: 50 completed instances/month

**Date**: 2026-08-20 · **Checkpoint**: ARCH-01 · **Raised by**: Architect (gap in DEC-005)
**Decision**: **50 completed instances per month.** Ratifies the number the architecture and its
tests already assume, so no rework.

DEC-005 set allowances for Starter (2,500), Growth (15,000) and Business (60,000) but left Sandbox
unspecified, making `FR-115` / `AC-020` (a non-removable Sandbox hard cap) untestable as written.

**Binding consequences**:
- Sandbox: **50 completed instances/month**, hard-capped, non-removable, enforced by the same
  pre-start quota refusal hook as every paid tier (MET-4).
- The cap is a product constraint, not a config default. A tenant cannot raise it.
- Rationale: enough to model and run a real process end-to-end several times; far too little to run
  a business on. Keeps free-tier evidence-storage COGS negligible and makes the upgrade trigger
  arrive early.

---

## DEC-008 — Proceed to foundation build; the K0 validation gate is overridden

**Date**: 2026-08-20 · **Checkpoint**: ARCH-01 — **APPROVED**
**Decision**: **Foundation implementation begins now.**

**This overrides the K0 gate set in DEC-003.** That is recorded plainly here because the audit trail
must show it was a deliberate CEO choice, not an oversight. The Orchestrator raised the override
explicitly at the checkpoint and the CEO selected it with the consequence stated.

**What is being built ahead of its validation** — these assumptions are now carried into code:

| ID | Assumption | Still unvalidated |
|----|-----------|-------------------|
| ASM-003 | The audit-evidence wedge is what the segment buys on | Yes — no discovery interviews run |
| A6 | ~40 paying tenants in year 1 with no sales team | Yes |
| A9 | GCC auditors accept engine-produced evidence | Yes — no auditor conversation held |
| A4 | In-region hosting feasible within 18 months | Yes — no DevOps costing done |

**Orchestrator's position, stated once and then set aside**: A9 is the assumption whose failure would
be most expensive, because the evidence architecture is a day-one commitment (DEC-001) rather than a
feature that can be revised later. The CEO has weighed this and elected to build. Work proceeds at
full scope; the validation workstream remains available to run alongside the build at any time and
would de-risk A9 cheaply while the foundation is under construction.

**Build sequencing consequence**: tenancy ships before any pillar. It gates everything (BA gap G-08),
and retrofitting isolation into a running multi-tenant engine is the one mistake this product cannot
absorb.

---

## OPEN-001 — Activation threshold now collides with the Sandbox cap

**Raised**: 2026-08-20 by the Orchestrator, while correcting the DEC-007 inconsistency
**Status**: **OPEN — needs a CEO decision. Not build-blocking; blocks the analytics phase.**

DEC-007 set the Sandbox cap at **50 completed instances/month**. The activation metric — STRAT-01's
north star, carried into PRD §1.3 and the §4.1 buyer flow — is **"≥1 published process AND ≥50 real
instances in 30 days"**.

These are now the same number. A Sandbox tenant can only become *activated* by consuming **100%** of
their free allowance, so the activation event and the quota-refusal event coincide exactly.

**Consequence**: "activated tenants" degenerates into "tenants who exhausted the free tier". An
activated-but-not-yet-refused Sandbox tenant becomes unobservable, and the M6 target of 40 activated
tenants no longer measures what STRAT-01 intended it to measure.

**Options**:

| Option | Effect | Cost |
|--------|--------|------|
| Lower activation to ~20 instances in 30 days | Restores headroom between activation and the cap; keeps the cap where DEC-007 put it | Re-baselines the M6 target — 20 instances is a weaker signal of real usage |
| Raise the Sandbox cap to 100/month | Restores headroom the other way | Reverses part of DEC-007 and doubles free-tier COGS |
| Accept the collision as intended | Activation *is* the upgrade trigger; hitting the wall is the funnel working | The north-star metric stops distinguishing "got value" from "ran out" |

**Orchestrator recommendation**: lower activation to **20 instances in 30 days**. It keeps DEC-007
intact, preserves a measurable gap between "this tenant got real value" and "this tenant needs to
pay", and 20 completed instances across a published process is already a strong activation signal
for a mid-market ops team.

Neither the Architect nor the Orchestrator caught this when DEC-007 was ratified; it surfaced only
when the task breakdown forced the two numbers into the same view.

---

## OPEN-002 — Three design gaps needing a requirement owner

**Raised**: 2026-08-20 by DESIGN-01 · **Status**: OPEN, none build-blocking
**Detail**: `products/connectbpm/docs/design/` (§ noted per item)

| ID | Gap | Owner | Why it matters |
|----|-----|-------|----------------|
| U-1 | `/versions/[version]` requires a "diff against the previous version", but no requirement defines what a graph diff **is**. A coordinate-only move is not a semantic change and should not appear in a Publisher's diff — nothing says so. The pre-publish review sheet computes the same thing, so two divergent diffs would be worse than one imperfect one. | PM + Architect | Publisher trust in the publish flow |
| U-2 | `FR-021` requires a "named canvas idiom" but does not say whether an idiom may appear in the palette. DESIGN-01 placed it under a separate Patterns affordance creating only E1–E7, read as `FR-011`-compliant — but `AC-088` is an automated palette test, so this needs confirming rather than assuming. | Architect | An automated test may fail on a defensible design |
| U-3 | An interrupting `Due date` (E5) withdrawing a task from under an open performer has no specified behaviour. DESIGN-01 proposed one (explanation replaces the action bar, entered data stays visible and copyable, link to request status) but it needs a requirement, not a design doc. | PM | Data loss under a timer is a trust event on the retention surface |

---

## Orchestrator note — ADR-006 RTL transform corrected

DESIGN-01 found the RTL coordinate transform in ADR-006 to be defective. The Orchestrator verified
the claim numerically before amending rather than accepting or rejecting it on assertion. Two of the
three sub-claims hold; the "not self-inverse" claim does not. The severe one is that `nodeWidth` was
not subtracted, which corrupts relative geometry — in a worked case a 40px inter-node gap became
**−80px**, meaning nodes overlap rather than merely shift.

Corrected in place with the reasoning and the verification recorded in the ADR. This mattered because
implementation task T226 follows the ADR, not the design doc, and would have shipped an Arabic canvas
whose nodes overlap.

---

## Orchestrator note — ADR-010 verified independently

ARCH-02 resolved the ADR-004 / ADR-009 contradiction that would have shipped a job runner claiming
nothing, silently. Its pivotal claim — that BACKEND-01's proposed `SECURITY DEFINER` fix **does not
work**, because `FORCE ROW LEVEL SECURITY` binds the table owner too — was reproduced independently
by the Orchestrator on a clean PostgreSQL 16 rather than accepted on assertion:

| Configuration | `SECURITY DEFINER` function owned by the table owner |
|---|---|
| `FORCE ROW LEVEL SECURITY` | **0 rows** |
| `NO FORCE` | 2 rows |

The correction stands: the fix required a dedicated `NOLOGIN` claim role, not merely a definer
function. Had the originally proposed form shipped, it would have reproduced the same silent failure
behind more machinery — the failure mode being that timers never fire while the engine reports
healthy.

Unit suite independently confirmed at 94/94 without a database.

**Carried into P2 as an operational contract**: `db:roles` must run before the first migration, and
`RUN_JOB_RUNNER=true` must be paired with a `DATABASE_URL` pointing at `connectbpm_runner`. A
mismatch fails loudly with `permission denied`, which is the intended behaviour.
