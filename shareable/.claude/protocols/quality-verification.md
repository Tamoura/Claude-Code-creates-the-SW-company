# Quality Verification Protocol

**Version**: 2.0.0
**Created**: 2026-03-12
**Consolidates**: `anti-rationalization.md` + `verification-before-completion.md` + `verification-before-planning.md`
**Inspired by**: [obra/superpowers](https://github.com/obra/superpowers)

This protocol covers three phases: **Before Planning**, **During Implementation**, and **Before Completion**. Constitution Articles II and XI mandate all three.

---

## Part 1: The 1% Rule

**If there is even a 1% chance that a protocol, quality gate, or verification step applies to the current task, it MUST be invoked.**

The cost of running an unnecessary check is minutes. The cost of skipping a necessary one is hours.

---

## Part 2: Verification Before Planning (Article II)

Before including ANY capability in a plan or task list, verify it isn't already implemented.

### When to Apply

| Workflow | Required? |
|----------|-----------|
| `/speckit.plan`, `/speckit.tasks`, Orchestrator Step 2.7 | YES |
| `/speckit.specify` | NO (specs define what, not status) |
| Trivial tasks, greenfield products | NO |

### Five-Step Planning Gate

1. **Inventory** planned capabilities with spec requirement IDs
2. **Query** the codebase (GitNexus, Grep, file system) for each capability
3. **Classify** each: `NOT_IMPLEMENTED` / `PARTIALLY_IMPLEMENTED` / `FULLY_IMPLEMENTED` / `NEEDS_UPGRADE`
4. **Document** findings in an Implementation Audit table (required in plan output)
5. **Proceed** with verified scope only — exclude fully implemented items

```markdown
## Implementation Audit

| # | Capability | Spec Req | Status | Evidence | Action |
|---|-----------|----------|--------|----------|--------|
| 1 | Structured logging | NFR-002 | FULLY_IMPLEMENTED | src/plugins/logger.ts | EXCLUDE |
| 2 | CSRF protection | NFR-007 | NOT_IMPLEMENTED | No middleware found | INCLUDE |
| 3 | Webhook retry | FR-012 | PARTIALLY_IMPLEMENTED | Delivery exists, no DLQ | INCLUDE (DLQ only) |
```

The orchestrator MUST reject plans lacking this audit table.

---

## Part 3: Anti-Rationalization During Implementation (Article XI)

Agents systematically rationalize skipping quality processes. These are the explicit counters.

### TDD Anti-Rationalizations

| # | Rationalization | Counter | Rule |
|---|----------------|---------|------|
| 1 | "Too simple to test" | Simple code has highest ROI for tests — 30 seconds to write, catches regressions forever | If it has logic (even an `if`), test it |
| 2 | "I'll add tests after" | You won't. Tests after implementation are weaker — they test what code does, not what it should do | Test first. Always |
| 3 | "Existing tests cover this" | Prove it. Name the specific test. Show its output | Cite test by name + file path, run it |
| 4 | "Just a refactor" | Run existing tests before and after. If no tests exist, write them first | Full suite must pass before and after |
| 5 | "Just test setup/config" | Config changes can break the entire suite | Run full suite after any test infra change |
| 6 | "UI/styling only" | Styling bugs are #1 source of CEO demo failures | Every component: render test. Every page: E2E test |
| 7 | "Blocked by dependency" | Write the test with a TODO, or wait | Never skip a test due to a blocker |
| 8 | "Test framework not set up" | Setting up tests IS the first task | Test infra before any feature code |
| 9 | "One-time script/migration" | Migrations run in production. Hard to roll back | Migrations need forward + verify tests |
| 10 | "Need to prototype first" | Write minimal test for core behavior, then prototype | Even prototypes get a core test |
| 11 | "Deadline is tight" | TDD reduces debugging by 54%. Skipping costs 10x later | Reduce scope, not quality |
| 12 | "Just glue code" | Integration is where most bugs live | Integration code always needs an integration test |

### Process Anti-Rationalizations

| # | Rationalization | Counter | Rule |
|---|----------------|---------|------|
| P1 | "Don't need to check registry" | 60+ components. 30-second check prevents hours of rebuilding | Check registry. Always. (Article II) |
| P2 | "I'll add the diagram later" | "Later" means never. Draw it now | Diagrams are first-class deliverables (Article IX) |
| P3 | "Spec is clear enough" | Ambiguous specs = #1 cause of rework | Resolve via `/speckit.clarify` (Article I) |
| P4 | "I'll update traceability later" | Add IDs as you write — 5 seconds per artifact | IDs at creation time (Article VI) |
| P5 | "Change is too small for a PR" | Small changes cause big outages | No direct commits to main (Article VIII) |
| P6 | "Spec wouldn't ask if it existed" | Specs are from requirements, not codebase audits | Run planning gate first (Article II) |

### For Engineer Agents — Pre-Implementation Checklist

1. Did I write the test first?
2. Am I rationalizing skipping the test?
3. Did I check the Component Registry?
4. Did I verify this isn't already implemented?
5. Does my commit include traceability IDs?
6. Would this benefit from a diagram? (1% Rule)

### Escalation

If an agent believes a task is an exception: document the reasoning, include it in the handoff. QA Engineer evaluates. Only the CEO can override a TDD requirement.

---

## Part 4: Verification Before Completion (Article XI)

No agent may mark a task as complete without verifiable evidence.

### Step 0: Context Health Check

Before verifying, check your own context health:
- **<= 15 files read**: proceed normally
- **> 15 files**: re-read original task objective before continuing
- **Degradation signals** (re-reading files, losing track of requirements): write progress to `scratch/{TASK-ID}-handoff.md` and spawn a sub-agent with clean context

### Five-Step Completion Gate

1. **Identify** — What specific command proves this works?
2. **Execute** — Run it. Do not predict the output.
3. **Read** — Examine actual output carefully. Did it exit 0? All tests pass? Correct status codes?
4. **Compare** — Does output match ALL acceptance criteria from the spec?
5. **Claim** — Include evidence: command run, output, test counts, manual verification, discrepancies.

### Required Evidence by Task Type

| Task Type | Must Show |
|-----------|-----------|
| Backend API | Tests pass + real HTTP request + response matches contract + error cases + DB state |
| Frontend UI | Tests pass + dev server runs + page loads + visual check + build succeeds |
| Database | Migration runs + status clean + FK constraints intact + rollback tested |
| E2E Tests | Tests pass + all browsers + screenshots + coverage of all acceptance criteria |
| Documentation | Diagrams render + links resolve + all sections present + matches implementation |

### Handoff Format

```markdown
## Task Completion: [TASK-ID] — [Task Name]

### What Was Done
[Brief description]

### Verification Evidence
**Tests**: `npm test` → 8 passed, 0 failed, 92% coverage
**Manual**: POST /api/v1/users → 201 Created; 400 invalid email; 409 duplicate
**Build**: `npm run build` → Compiled successfully

### Spec Traceability
- Implements: [US-01][FR-003]
- Tests: [US-01][AC-1], [US-01][AC-2]

### Notes for Next Agent
[Context needed]
```

### Enforcement

- **Orchestrator**: Reject completions without "Verification Evidence" section
- **QA Engineer**: Check all completed tasks have evidence during Testing Gate
- **Agent self-check**: "If someone re-ran my steps now, would they get the same results?"

---

## How the Three Parts Work Together

```
Planning Phase:                    Implementation Phase:              Completion Phase:
┌──────────────────────┐          ┌──────────────────────┐          ┌──────────────────────┐
│  Part 2: Planning    │          │  Part 3: Anti-       │          │  Part 4: Completion  │
│  Verification Gate   │ ──────→  │  Rationalization     │ ──────→  │  Verification Gate   │
│                      │          │  (continuous)        │          │                      │
│  "Is this already    │          │  "Am I skipping      │          │  "Can I prove this   │
│   implemented?"      │          │   quality steps?"    │          │   actually works?"   │
└──────────────────────┘          └──────────────────────┘          └──────────────────────┘
```

Together with quality gates at the milestone level, these create defense in depth.
