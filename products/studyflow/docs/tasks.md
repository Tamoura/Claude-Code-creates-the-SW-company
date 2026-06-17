# StudyFlow — Implementation Tasks (TASKS-01)

Derived from `plan.md` + `architecture.md` + `API.md`. Dependency-ordered.
Traceability: every task cites US/FR IDs. IDs stable from spec.

## Phase 3 — Foundation (this cycle → prototype running in browser)

### DEVOPS-01 — Scaffold + infra (owner: DevOps)
- [ ] `apps/api` Fastify+TS scaffold (package.json, tsconfig, src/app.ts, src/server.ts) booting on **5017** with `/v1/health` → FR-003 infra
- [ ] `apps/web` Next.js+Tailwind scaffold booting on **3122**
- [ ] Prisma schema for all 5 entities + Session (per ER diagram), initial migration into `studyflow_dev`
- [ ] Seed script: small static subject catalog (C-2)
- [ ] `.env` files (api → `studyflow_dev`, web → API URL), `.env.example`, gitignored
- [ ] `docker-compose.yml`, `.github/workflows/studyflow-ci.yml`
- [ ] Verify: both apps boot; `/v1/health` returns ok; web renders

### BACKEND-01 — API (owner: Backend, TDD, real Postgres `studyflow_test`)
- [ ] Auth: signup/login/logout/me — session cookie, bcrypt (US-01, FR-001..005; C-1)
- [ ] Subjects/catalog: list/search/get + manual add (US-02,05; FR-006..009; C-2)
- [ ] Selections: add/list/remove (block remove when goals exist) (US-04,11; FR-010..012; C-7)
- [ ] Goals: CRUD, metric enum numeric|boolean|percentage (US-06,11; FR-013..015; C-3)
- [ ] Progress: log entries, no future dates (US-07; FR-016; C-8)
- [ ] Metrics service: completion %, streaks, at-risk (US-08; FR-017,018; C-6,C-9)
- [ ] Dashboard aggregate (US-10; FR-019..021)
- [ ] JSON export (US-12; FR-022; C-10)
- [ ] Ownership scoping on every resource (FR-023)

### FRONTEND-01 — UI (owner: Frontend, depends on API contract)
- [ ] Auth pages (signup/login) + protected layout (US-01)
- [ ] Subject catalog browse/search + add-to-plan + manual add (US-02,03,04,05)
- [ ] My subjects view + remove (US-11)
- [ ] Goal create/edit per subject (US-06,11)
- [ ] Progress logging UI (US-07)
- [ ] Dashboard: subjects, goals, completion %, streaks, at-risk badges (US-08,10)

### QA-01 — Playwright E2E (owner: QA) — ≥3 spec files organized by story
### Gates — Security, Code Review, Spec-Consistency → Foundation checkpoint

## Phase 2 (later, not this cycle)
AI subject recommendations · native mobile · SIS/LMS integration · email reminders.
