# ADR-004: Goal/Progress Data Model & Completion Computation

## Status
Accepted — 2026-06-17 (ARCH-01)

## Context
The motivating feedback loop (BN-008, US-08) depends on **correct, deterministic** derived metrics:
completion % (BR-003), streaks (C-9), and the at-risk flag (C-6). RSK-005 flags calculation bugs as
a top trust risk; NFR-002 mandates TDD against a real PostgreSQL. Goals come in three metric types
(C-3: `numeric`, `boolean`, `percentage`) and a per-goal streak cadence (C-9: daily default,
weekly option). Reminders (FR-019) and the dashboard (FR-021) must read goal status cheaply.

## Decision
1. **Derived metrics are computed, not stored** as separate columns. A **pure `metrics` service**
   takes `(goal, progressEntries[])` and returns `{ completionPct, streak, nextStatus, atRisk }`.
   No I/O — fully unit-testable, plus integration-tested on real Postgres (NFR-002).
2. **`Goal.status` IS persisted** as a cached lifecycle state (`draft|active|at_risk|completed|abandoned`),
   recomputed and written on **every relevant write** (progress add/edit/delete, goal edit). This makes
   reminders and dashboard filters cheap (query by status) while keeping a single source of truth for
   completion % (always derived from entries).
3. **Completion % (BR-003), capped at 100%:**
   - `numeric`: `min(100, round(sum(values) / target * 100))`
   - `percentage`: `min(100, latestValue)` (target implicitly 100)
   - `boolean`: `100` if any qualifying entry (`value ≥ 1`), else `0`
4. **Streak (C-9):** bucket entries by cadence period (day/week); streak = consecutive most-recent
   periods each with ≥1 qualifying entry; resets on a missed period.
5. **Lifecycle transitions:** completion ≥ 100% ⇒ `completed` (BR-003); due ≤ 7d AND completion < 50%
   ⇒ `at_risk` (C-6); editing down from 100% reopens to `active` (PRD §7).
6. **Integrity:** `Goal.selectionId` NOT NULL (BR-001); `ProgressEntry.goalId` NOT NULL (BR-002);
   `onDelete: Cascade` Goal→ProgressEntry (US-11 AC-2). Future entries rejected by Zod (C-8).
   Removing a selection with goals is **blocked** at the service layer (C-7).

## Consequences

### Positive
- No completion-%/streak drift: the number is always re-derived from entries (kills a whole bug class, RSK-005).
- Pure metric function = exhaustive, fast, deterministic tests (NFR-002).
- Cached `status` keeps reminders/dashboard queries simple and indexable.

### Negative
- `status` can theoretically drift if a write path forgets to recompute → mitigated by funnelling
  ALL goal/progress writes through the service which always recomputes (enforced by the layering contract).
- Recompute reads all entries for the goal on each write (cheap: term-scoped, small per-goal sets).

### Neutral
- Per-goal `cadence` enum is stored on Goal; weekly vs daily is a small, explicit field.
- The entries-as-source design is exactly what Phase-2 AI needs as training/feature data (see ADR-005).

## Alternatives Considered

### Store completion %/streak as columns, update incrementally
- Pros: cheapest reads.
- Cons: classic denormalization-drift bug surface; edits/deletes of entries require careful reversal math.
- Rejected: violates the correctness priority (RSK-005, NFR-002); only `status` is cached, and always full-recomputed.

### Compute everything on read including status (no stored status)
- Pros: zero drift even for status.
- Cons: reminders/dashboard must recompute status for every goal on every list query (N goals × entries) — hurts NFR-001.
- Rejected: cache status (recomputed on write) is the better trade; completion % stays fully derived.

## References
- BR-001, BR-002, BR-003, C-3, C-6, C-7, C-8, C-9 · FR-011..018, FR-022 · NFR-002 · RSK-005
- `architecture.md` §4 (metrics service), §5.2, §9 (sequence) · PRD §7 (lifecycle)
