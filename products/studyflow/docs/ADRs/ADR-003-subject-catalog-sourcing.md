# ADR-003: Subject Catalog — Static Seed + Manual Add

## Status
Accepted — 2026-06-17 (ARCH-01)

## Context
Discovery is half the core loop (BN-002), but MVP scope explicitly **excludes SIS/LMS integration**
(spec §5). Clarification **C-2** decides the catalog is a small static seed (~20–40 subjects from one
representative faculty) shipped as a seed script, with students filling gaps via manual add (US-05,
FR-009). BR-005 requires a **two-class** subject model: seed subjects are read-only; manually-added
subjects are owned and editable by their creator. RSK-002 (catalog too small) is mitigated by
first-class manual add.

## Decision
- Ship a curated **seed catalog** (one faculty, ~20–40 subjects) via a Prisma seed script. Seed rows
  have `isSeed=true`, `ownerStudentId=null`.
- Allow **manual subject add** (`POST /v1/subjects`): creates a row with `isSeed=false`,
  `ownerStudentId=studentId`, and **auto-selects** it for the active term (US-05 AC-1).
- Enforce read-only on seed subjects at the **service layer**: any PATCH/DELETE on `isSeed=true`
  ⇒ **403** (BR-005, US-05 AC-3). Owned subjects are editable/deletable (US-05 AC-2).
- Search/filter (FR-005) operates over both seed and the student's owned subjects via indexed
  `ILIKE`/equality filters.

## Consequences

### Positive
- Day-one non-empty discovery with zero external dependency (validates ASM-001).
- Manual add removes dead-ends and gives a measurable signal (manual-add rate, RSK-002).
- The two-class model is a single `isSeed` boolean + nullable `ownerStudentId` — minimal schema cost.

### Negative
- Seed data quality is a curation effort (owned by Data Engineer / PM); a poor seed weakens perceived value.
- Owned subjects are private to the creator (no shared community catalog in MVP) — by design.

### Neutral
- The seed/owned split is the natural seam for a future SIS/LMS catalog import (Phase 3) that would
  populate more `isSeed`-style read-only rows.

## Alternatives Considered

### Live SIS/LMS catalog integration
- Pros: authoritative, complete.
- Cons: out of MVP scope; high integration cost; per-institution variability.
- Rejected: spec §5 excludes it.

### No seed (manual-add only)
- Pros: simplest.
- Cons: empty product on day one → weak discovery, poor activation.
- Rejected: contradicts BN-002 and the discovery value prop.

## References
- C-2, BR-005, FR-009, FR-010, US-05 · BA ASM-001, RSK-002 · `architecture.md` §5, §8
