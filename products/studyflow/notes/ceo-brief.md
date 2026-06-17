# StudyFlow — CEO Brief

**Date:** 2026-06-17
**Requested by:** CEO (Tamer)
**Workflow:** new-product
**Branch:** `foundation/studyflow`

## The Idea

StudyFlow helps **university students** discover and choose the subjects/courses
they should study, and set and track **study goals** for those subjects.

## CEO Scoping Decisions (locked at inception)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Platform** | Web app (Next.js) | Fastest path on default stack; works on laptop + mobile browser |
| **AI scope** | **None in MVP** | Pure CRUD MVP. AI (subject recommendations, auto goal generation) is an explicit Phase 2. |
| **MVP focus** | Both, tightly integrated | Full loop: choose subjects → set goals per subject → track progress |

## Core Value Proposition

A single place where a student can:
1. **Discover & choose subjects** — browse/compare subjects/courses (prerequisites,
   workload, credits, fit) and add them to their plan.
2. **Set study goals** — define measurable goals per chosen subject (e.g. "finish
   3 chapters/week", "grade target A").
3. **Track progress** — log progress toward goals, see streaks/completion, get
   reminders.

## Explicit Non-Goals (MVP)

- No AI / ML recommendations (deferred to Phase 2).
- No native mobile app (responsive web only for now).
- No LMS/university SIS integration in MVP (manual subject entry + a seed catalog).
- No social/collaboration features in MVP.

## Tech Stack (ConnectSW defaults — Constitution Article V)

- Backend: Fastify + Prisma + PostgreSQL
- Frontend: Next.js + Tailwind
- Validation: Zod · TypeScript strict · TDD with real dependencies

## Ports (PORT-REGISTRY)

- Web: **3122**
- API: **5017**

## Target Checkpoint This Cycle

Reach **PRD complete** (BA → spec → clarify → PRD), then pause for CEO review
before architecture.
