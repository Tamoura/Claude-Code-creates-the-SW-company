# ADR-005: No-AI MVP Boundary & the Phase-2 Seam

## Status
Accepted — 2026-06-17 (ARCH-01)

## Context
The addendum, brief, and Constitution lock **AI to Phase 2** (RSK-008 guards against scope creep).
The MVP is pure CRUD. Yet the strategic rationale (PRD §1, BA §1) is that the MVP's clean structured
dataset (subjects → selections → goals → progress) is the **moat and substrate** for Phase-2 AI
(subject recommendations, auto-goal generation, smart nudges). The architecture must therefore add
**zero AI in the MVP** while leaving an obvious, low-cost seam so Phase 2 does not require reshaping
the write-side schema.

## Decision
1. **Hard MVP boundary:** no LLM/ML code, no AI provider dependency, no embeddings, no AI columns in
   the schema. Reminders and at-risk are deterministic rules (C-4, C-6), not predictions.
2. **Design the data model AI-ready by being clean, not by adding AI fields:**
   - Every Goal binds to a Selection (BR-001) and every ProgressEntry to a Goal (BR-002) → fully
     attributable training signal (which subjects → which goals → which outcomes).
   - `ProgressEntry` is an append-style time series (date, value) per goal → natural feature source
     for completion-prediction / nudge timing later.
   - Stable enums (`metricType`, `cadence`, `status`) give labelled outcomes (completed vs abandoned).
3. **Reserve the seam as a future read-side consumer, not a write-side change:** Phase-2 AI features
   (recommendations, auto-goal) will be **new modules** that *read* the existing tables and write to
   *new, additive* tables (e.g. `Recommendation`, `SuggestedGoal`) — never altering the 5-entity
   write model. The modular-monolith boundaries (ADR-001) make adding an `ai` module mechanical.
4. **Instrumentation now:** capture the events that gate the Phase-2 decision (activation, goals/user,
   D30, goal-completion rate) via the existing data — no AI needed to measure AI-readiness.

## Consequences

### Positive
- MVP ships with zero AI risk/cost; KPIs (PRD §3) gate the Phase-2 investment objectively.
- Phase 2 is additive (new read-side module + additive tables) → no migration of core data.
- The clean attributable model maximises future model quality (the actual moat).

### Negative
- Some Phase-2-friendly denormalizations are deliberately deferred (kept clean for MVP). Acceptable.

### Neutral
- `@connectsw/observability` includes `aiInstrumentation`; it stays **unused** in MVP, ready for Phase 2.

## Alternatives Considered

### Add lightweight heuristic "recommendations" in MVP
- Pros: a taste of the Phase-2 value.
- Cons: scope creep (RSK-008); risks shipping a weak heuristic that sets wrong expectations; brief locks AI to Phase 2.
- Rejected: gate AI on MVP KPIs first.

### Pre-build AI tables/columns now
- Pros: "ready" schema.
- Cons: speculative schema for unbuilt features (YAGNI); adds migration/maintenance for no MVP value.
- Rejected: keep the write model minimal; add additively in Phase 2.

## References
- Addendum (No AI in MVP) · spec §5 · PRD §1, §4.2 · BA §1, RSK-008 · Constitution Art. XI
- `architecture.md` §1, §4 · ADR-001 (module seam), ADR-004 (entries as signal)
