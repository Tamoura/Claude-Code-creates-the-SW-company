# StudyFlow — Product Addendum (Agent Context)

> Read this first. It is the single source of product-specific context for all agents.

## What StudyFlow Is

A **web app** that helps **university students** (1) discover & choose subjects/courses,
(2) set study goals per subject, and (3) track progress toward those goals.

## Fixed Constraints (do not re-litigate)

- **Platform:** Web only (Next.js). No mobile app in MVP.
- **No AI in MVP.** Pure CRUD. Do not add LLM/ML features. AI is Phase 2.
- **MVP = full loop:** choose subjects → set goals → track. All three are in scope.
- **Stack:** Fastify + Prisma + PostgreSQL (api), Next.js + Tailwind (web). TS strict, Zod.
- **Ports:** web `3122`, api `5017`. DB: local Postgres `studyflow_dev`.

## Core Domain (MVP)

- **Student** — the user (auth: email/password to start).
- **Subject/Course** — a unit a student can choose (name, code, credits, workload,
  prerequisites, description, term). Seed catalog + manual add.
- **Enrollment/Selection** — a student's chosen subjects for a term.
- **Goal** — a measurable study goal tied to a chosen subject (title, metric, target,
  due date, status).
- **ProgressEntry** — a log entry against a goal (date, value/note), drives streaks
  and completion %.

## Out of Scope (MVP)

AI recommendations · native mobile · university SIS/LMS integration · social features ·
payments/billing.

## Directory

```
products/studyflow/
├── apps/api/         # Fastify + Prisma (to be scaffolded in Foundation phase)
├── apps/web/         # Next.js + Tailwind (Foundation phase)
├── e2e/              # Playwright (Foundation phase)
├── docs/             # PRD, business-analysis, specs/, ADRs/, plan, tasks
└── .claude/          # task-graph.yml, addendum.md, deliverables/, scratch/
```

## Inception Pipeline Status

BA-01 → SPEC-01 → CLARIFY-01 → PRD-01 (**CEO checkpoint**) → ARCH-01 (checkpoint) →
TASKS-01 → Foundation build.

Currently driving toward the **PRD checkpoint**.
