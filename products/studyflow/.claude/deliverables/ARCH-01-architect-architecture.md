# ARCH-01 — Architecture Deliverable (Architect)

**Product:** StudyFlow · **Task:** ARCH-01 · **Date:** 2026-06-17 · **Status:** Complete (Architecture checkpoint)

## Summary

StudyFlow's MVP architecture is a **modular monolith**: one Fastify API (port **5017**) + one Next.js
web app (port **3122**) over a single PostgreSQL DB (`studyflow_dev`), **no AI and no external
dependencies**. The API is layered route → schema (Zod) → handler → service → repository, with a pure
**`metrics` service** owning completion %, streaks, and at-risk (built TDD-first on real Postgres for
correctness, NFR-002). Auth is **email/password with DB-backed opaque sessions** (httpOnly cookie,
bcrypt) per C-1 — not JWT. The 5-entity model (+`Session`) enforces BR-001/BR-002 via NOT-NULL FKs
and the locked clarifications via Zod refinements and service rules. The clean attributable model is
the Phase-2 AI seam (additive read-side, no write-model change).

## Counts

- **Mermaid diagrams: 5, distinct types** — C4 Context, C4 Container, C4 Component, ER (implementation), Sequence (request lifecycle).
- **API endpoints: 26** (24 student-data + 2 public auth; health endpoints excluded).
- **ADRs: 6** (001 modular monolith, 002 session auth, 003 catalog sourcing, 004 goal/progress model, 005 no-AI seam, 006 API versioning/validation).

## FR coverage

**FR-001 … FR-025 — all covered, no gaps.** Per-FR confirmation in `architecture.md §11` and the
endpoint matrix in `API.md §11`. (FR-003 = sessionAuth plugin across all authed routes; FR-016/017/018
= metrics service consumed by goal/dashboard/reminder; FR-023 = repository ownership scoping.)

## Components reused from registry

- `@connectsw/shared/utils/crypto` (bcrypt), `/utils/logger`, `/plugins/prisma`
- `AppError` (RFC 7807) + generic Zod validate/pagination helpers
- `@connectsw/observability` (health, metrics, correlation plugins)
- `@connectsw/ui` (Button, Card, Input, Badge, Skeleton, StatCard, DataTable, ErrorBoundary, DashboardLayout, Sidebar)
- `@connectsw/auth/frontend` useAuth/ProtectedRoute — **adapted** to session-cookie variant
- `@connectsw/notifications` — **adapt (optional)** as reminders upgrade path (MVP computes reminders on read)
- Playwright config + auth fixture, GitHub Actions quality-gate workflow, Docker (multi-stage + compose) — all adapted

**Built new (justified, architecture §8):** session auth layer (C-1 needs sessions; registry auth is
JWT+API-key), `metrics` service, two-class subject model (BR-005), seed catalog (C-2).

## Files written

| Artifact | Path |
|----------|------|
| System architecture (5 diagrams) | `products/studyflow/docs/architecture.md` |
| API contract (26 endpoints) | `products/studyflow/docs/API.md` |
| Implementation plan (M0–M4, audit) | `products/studyflow/docs/plan.md` |
| ADR-001 Modular monolith | `products/studyflow/docs/ADRs/ADR-001-modular-monolith.md` |
| ADR-002 Session auth | `products/studyflow/docs/ADRs/ADR-002-session-auth.md` |
| ADR-003 Subject catalog sourcing | `products/studyflow/docs/ADRs/ADR-003-subject-catalog-sourcing.md` |
| ADR-004 Goal/progress model & completion | `products/studyflow/docs/ADRs/ADR-004-goal-progress-completion-model.md` |
| ADR-005 No-AI boundary & Phase-2 seam | `products/studyflow/docs/ADRs/ADR-005-no-ai-boundary-phase2-seam.md` |
| ADR-006 API versioning & validation | `products/studyflow/docs/ADRs/ADR-006-api-versioning-validation.md` |
| This deliverable summary | `products/studyflow/.claude/deliverables/ARCH-01-architect-architecture.md` |

## Conventions established (for Backend / Frontend / DevOps)

- **Versioning:** all routes under `/v1`; health endpoints unversioned.
- **Layering:** route → schema (Zod) → handler → service → repository → Prisma. **Prisma only in repositories.**
- **Error model:** all errors are `AppError` subclasses → single Fastify handler → RFC 7807 problem+json (`type/title/status/detail/errors`).
- **Validation:** Zod on every body/query/param via shared validate helpers.
- **Auth:** DB-backed opaque session, httpOnly Secure SameSite=Lax cookie (`sf_session`); `sessionAuth` pre-handler attaches `request.studentId`; 401 on missing/invalid.
- **Ownership:** every student-data query scoped to `studentId` in the repository + re-checked in service; cross-student ⇒ 403/404.
- **Derived metrics:** computed on read by pure `metrics` service; `Goal.status` cached and recomputed on every relevant write.
- **Naming:** `[name].routes.ts` / `.schema.ts` / `.service.ts` / `.repository.ts` / `[name].ts` plugins; `use[Name].ts` hooks; `[Name].tsx` components. PKs are `uuid`.
- **Pagination:** list endpoints return `{ data, pagination }`; `limit ≤ 100`.
- **Ports/infra:** web 3122 / api 5017 / DB `studyflow_dev`; **Postgres only (no Redis in MVP)**; observability health/metrics enabled.
- **Testing:** TDD; metrics + repos on real Postgres; Playwright E2E; ≥ 80% coverage.

## Decisions needing CEO/DevOps awareness

1. **Port mismatch resolved:** PRD §10/§12 + BA say web 3122/api 5017; addendum + ARCH-01 task lock **3122/5017** (authoritative). DevOps to register 3122/5017 in `PORT-REGISTRY.md`; PRD refs to be corrected at next doc-sync.
2. **Sessions over JWT** (ADR-002) — deliberate deviation from the JWT-oriented `@connectsw/auth` package, per C-1.
3. **Reminders computed on read** in MVP (no scheduler/Redis); `@connectsw/notifications` is the documented upgrade path.

## Next step

Input to **TASKS-01** (`/speckit.tasks`): plan.md (M0→M4 build order) + API.md (26 endpoints) +
architecture module map. Critical-path build-first: **metrics service** and **session auth layer**.
