# ADR-001: Modular Monolith over Microservices for the MVP

## Status
Accepted — 2026-06-17 (ARCH-01)

## Context
StudyFlow MVP is pure CRUD over a 5-entity domain (Student, Subject, Selection, Goal,
ProgressEntry) with no external integrations (no AI, no email/OAuth/SIS — spec §5). It is built and
operated by a small agent team on the ConnectSW default stack (Fastify + Prisma + PostgreSQL +
Next.js). NFRs emphasise correctness of derived metrics (NFR-002), p95 < 400ms (NFR-001), and
80%+ coverage (NFR-008) — not independent scaling of subsystems.

## Decision
Build the API as a **single Fastify process organised as a modular monolith**: one deployable, one
PostgreSQL database, internally partitioned into cohesive modules (`auth`, `catalog`, `selection`,
`goal`, `progress`, `metrics`, `reminder`, `dashboard`, `export`). Each module follows the same
**route → schema → handler → service → repository** layering. The Next.js web app is a second
container. No service mesh, no message broker, no Redis in the MVP.

## Consequences

### Positive
- Lowest operational overhead — one API + one DB to run, test, and deploy.
- In-process transactions keep BR-001/BR-002 integrity and metric recomputation simple and atomic.
- Fast, deterministic integration tests against a single real Postgres (NFR-002, NFR-008).
- Clear module boundaries + the layering contract preserve maintainability and make future
  extraction (if ever needed) mechanical.

### Negative
- Cannot scale a single module independently (acceptable at MVP volumes; vertical/replica scaling suffices).
- A code-level coupling discipline is required (enforced by the "Prisma only in repositories" rule).

### Neutral
- Module boundaries are logical, not network boundaries; refactoring to services later is possible but explicitly not a goal.

## Alternatives Considered

### Microservices (per-domain services)
- Pros: independent scaling/deploy; strong isolation.
- Cons: massive operational + testing overhead, distributed transactions for goal/progress integrity, network latency — all unjustified for a 5-entity CRUD MVP.
- Rejected: over-engineering (Constitution Art. XI; quality-verification anti-rationalization).

### Serverless functions
- Pros: scale-to-zero.
- Cons: cold starts hurt NFR-001 LCP; Prisma connection management and session auth become awkward; weaker local TDD story.
- Rejected: poor fit for stateful session auth + real-DB TDD.

## References
- `architecture.md` §1, §3, §4 · Constitution Art. V (default stack), Art. XI (anti-rationalization)
- BA §8.1 (technical feasibility — "simple-to-moderate, pure CRUD")
