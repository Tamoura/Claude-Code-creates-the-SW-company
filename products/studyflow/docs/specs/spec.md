# StudyFlow — Feature Specification

**Product:** StudyFlow
**Author:** Product Manager (ConnectSW)
**Date:** 2026-06-17
**Task:** SPEC-01 / CLARIFY-01
**Methodology:** spec-kit (`/speckit.specify` + `/speckit.clarify`)
**Source:** `products/studyflow/notes/ceo-brief.md`, `products/studyflow/.claude/addendum.md`, `BA-01-business-analyst-analysis.md`
**Status:** Complete — input for PRD-01 / ARCH-01
**Spec ID prefix:** `SF`

> Governs: this spec is the single source of testable requirements for the StudyFlow MVP.
> All downstream plans, tasks, and code MUST trace to a requirement here (US-XX / FR-XXX).

---

## 1. Overview

StudyFlow is a **web application** (Next.js) that helps **university students** close the loop
between *deciding what to study* and *following through on study goals*. The MVP delivers a single
integrated loop — **choose subjects → set measurable goals per subject → track progress** — as
**pure CRUD with no AI**. AI (subject recommendations, auto-goal generation) is an explicit Phase 2
and is out of scope here.

### 1.1 Scope summary

| In scope (MVP) | Out of scope (MVP) |
|----------------|--------------------|
| Email/password auth | AI/ML recommendations (Phase 2) |
| Subject catalog browse/search/compare | Native mobile app (responsive web only) |
| Personal subject selection per term | University SIS/LMS integration |
| Manual subject add | Social / collaboration features |
| Subject-bound measurable goals | Payments / billing |
| Progress logging, completion %, streaks | OAuth/SSO (fast-follow, not MVP) |
| In-app reminders | Email reminders (optional, post-MVP) |
| Unified dashboard | Multi-term planning (single active term in MVP) |
| Data export (Could) | |

### 1.2 Canonical domain entities

`Student`, `Subject`, `Selection`, `Goal`, `ProgressEntry` (carried from BA §4 / addendum).

### 1.3 Core business rules (carried from BA §4.2)

| ID | Rule |
|----|------|
| BR-001 | A goal MUST belong to exactly one Subject the student has **selected**. |
| BR-002 | A progress entry MUST belong to exactly one Goal. |
| BR-003 | Completion % = aggregate of progress values against the goal target, capped at 100%. |
| BR-004 | A student can only view/modify their own data. |
| BR-005 | Seed-catalog subjects are read-only; manually-added subjects are owned/editable by their creator. |
| BR-006 | A goal's due date MUST NOT be in the past at creation time. |
| BR-007 | Selecting a subject with unmet prerequisites is allowed but MUST be flagged (advisory, not blocking). |

---

## 2. User Stories & Acceptance Criteria

> IDs `US-01…US-13` carried forward from BA §11.3 (stable). MoSCoW priority shown.
> Acceptance criteria are in Given/When/Then form with stable IDs (`AC-n`).

### US-01 — Account registration & sign-in (Must)
> As a student, I want to register and sign in securely, so that my subjects, goals, and progress are private to me.

- **AC-1:** Given a new visitor on the signup page, when they submit a valid unique email and a password meeting the policy, then an account is created and they are signed in and redirected to the dashboard.
- **AC-2:** Given an email already registered, when the visitor attempts to sign up with it, then registration is rejected with a non-enumerating error ("email or password invalid / already in use") and no new account is created.
- **AC-3:** Given a registered user, when they submit correct credentials on sign-in, then a session is established; when credentials are incorrect, then access is denied with a generic error.
- **AC-4:** Given an unauthenticated request to any student-data route, when it is made, then it is rejected with 401 and no data is returned (BR-004).

### US-02 — Browse & search the subject catalog (Must)
> As a student, I want to browse and search the subject catalog by key attributes, so that I can find candidate subjects quickly.

- **AC-1:** Given the catalog page, when it loads, then seeded subjects are listed showing code, name, credits, workload, and term.
- **AC-2:** Given a search/filter input, when the student types a query (name or code) or filters by credits/term, then the list updates to matching subjects only.
- **AC-3:** Given a subject in the list, when the student opens it, then full details (description, prerequisites, credits, workload, term) are shown.
- **AC-4:** Given an empty result set, when no subject matches, then an empty-state message is shown (never a blank page or error).

### US-03 — Compare subjects side-by-side (Should)
> As a student, I want to compare selected candidate subjects side-by-side, so that I can decide based on credits, workload, and prerequisites.

- **AC-1:** Given the catalog, when the student marks 2–4 subjects for comparison, then a comparison view shows them in columns aligned by attribute (credits, workload, prerequisites, term).
- **AC-2:** Given a comparison view, when fewer than 2 subjects are marked, then the compare action is unavailable/disabled with guidance.
- **AC-3:** Given a comparison view, when the student removes a subject, then the column disappears and remaining columns reflow.

### US-04 — Add a subject to my term plan (Must)
> As a student, I want to add a subject to my plan for the current term, so that I can set goals against it.

- **AC-1:** Given a catalog subject the student has not selected, when they add it to the plan, then a Selection is created for the current term and the subject appears in "My Subjects".
- **AC-2:** Given a subject already selected for the term, when the student tries to add it again, then it is rejected (no duplicate Selection for the same subject+term).
- **AC-3:** Given a selected subject, when the student removes it from the plan AND it has no goals, then the Selection is deleted; when it has goals, then the student is warned and removal cascades or is blocked per BR-001 (see Clarifications C-7).

### US-05 — Manually add a subject not in the catalog (Must)
> As a student, I want to add a subject that is missing from the seed catalog, so that discovery never dead-ends.

- **AC-1:** Given the catalog, when the student submits a manual subject (name required; code, credits, workload, prerequisites, term optional), then a student-owned Subject is created and auto-selected for the current term.
- **AC-2:** Given a manually-added (owned) subject, when the student edits or deletes it, then the change succeeds (BR-005).
- **AC-3:** Given a seed-catalog subject, when the student attempts to edit/delete it, then the action is rejected as read-only (BR-005).

### US-06 — Set a measurable goal for a chosen subject (Must)
> As a student, I want to set one or more measurable goals on a chosen subject, so that my study effort has a concrete target.

- **AC-1:** Given a selected subject, when the student creates a goal with a title, a metric type, a target, and a due date, then the goal is created with status `active` and bound to that Selection's subject (BR-001).
- **AC-2:** Given the goal form, when the student picks a metric type, then the target input adapts: `numeric` (integer/decimal target), `boolean` (done/not-done), `percentage` (0–100) — see Clarifications C-3.
- **AC-3:** Given a due date in the past, when the student submits, then the goal is rejected with a validation error (BR-006).
- **AC-4:** Given a goal-create attempt against a subject the student has NOT selected, when submitted, then it is rejected (BR-001).

### US-07 — Log progress entries against a goal (Must)
> As a student, I want to log progress entries against a goal, so that my effort is recorded over the term.

- **AC-1:** Given an active goal, when the student logs a progress entry (date defaulting to today, a value appropriate to the metric type, optional note), then a ProgressEntry is created bound to that goal (BR-002).
- **AC-2:** Given a progress entry with a value, when saved, then the goal's completion % and streak are recomputed (BR-003).
- **AC-3:** Given an entry date in the future, when submitted, then it is rejected with a validation error (see Clarifications C-8).
- **AC-4:** Given a progress entry, when the student edits or deletes it, then completion % and streak are recomputed accordingly (US-11).

### US-08 — See completion % and streaks (Must)
> As a student, I want to see completion percentage and streaks for my goals, so that I stay motivated and aware of progress.

- **AC-1:** Given a goal with progress entries, when the student views it, then completion % is shown = capped aggregate of progress values vs. target (BR-003), never exceeding 100%.
- **AC-2:** Given a goal, when completion % reaches 100%, then the goal status transitions to `completed` (see goal lifecycle, PRD §7).
- **AC-3:** Given a goal with a daily/weekly cadence, when consecutive periods have at least one entry, then a current streak count is shown; when a period is missed, then the streak resets (cadence per Clarifications C-9).
- **AC-4:** Given a goal whose due date is near and completion is low, when viewed, then it is flagged `at-risk` (threshold per Clarifications C-6).

### US-09 — Reminders for due dates and lapsing streaks (Should)
> As a student, I want reminders about upcoming due dates and lapsing streaks, so that I keep the habit loop going.

- **AC-1:** Given a goal due within the reminder window, when the student opens the app, then an in-app reminder/notification surfaces it (in-app only for MVP — Clarifications C-4).
- **AC-2:** Given a goal with an active streak and no entry in the current period, when the period nears its end, then an in-app "streak at risk" nudge is shown.
- **AC-3:** Given a reminder, when the student acts on it (logs progress), then the reminder is dismissed/cleared.
- **AC-4:** Given a completed or abandoned goal, when reminders are generated, then no reminders are produced for it.

### US-10 — Unified dashboard (Must)
> As a student, I want a dashboard summarising my subjects, active goals, and overall progress, so that everything is in one place.

- **AC-1:** Given a signed-in student, when they open the dashboard, then it shows current-term selected subjects, active goals with completion %, and aggregate progress.
- **AC-2:** Given a student with no subjects yet, when they open the dashboard, then a first-run empty state guides them to browse the catalog (no blank/error page).
- **AC-3:** Given a dashboard, when the student clicks a subject or goal, then they navigate to its detail view.
- **AC-4:** Given active reminders (US-09), when the dashboard loads, then due/at-risk items are surfaced.

### US-11 — Edit/delete subjects, goals, and progress entries (Must)
> As a student, I want full CRUD over my subjects, goals, and progress entries, so that I can correct my plan as it changes.

- **AC-1:** Given an owned subject / a goal / a progress entry, when the student edits it, then changes persist and any derived metrics recompute.
- **AC-2:** Given a goal, when the student deletes it, then its progress entries are deleted too (cascade), and the parent Selection is unaffected.
- **AC-3:** Given a seed-catalog subject, when deletion is attempted, then it is rejected (BR-005).
- **AC-4:** Given any edit/delete attempt on another student's data, when made, then it is rejected with 403/404 (BR-004).

### US-12 — Export my data (Could)
> As a student, I want to export my data, so that I own and can reuse it.

- **AC-1:** Given a signed-in student, when they request an export, then a machine-readable file (JSON; CSV optional) of their subjects, selections, goals, and progress entries is produced.
- **AC-2:** Given an export, when generated, then it contains only the requesting student's data (BR-004).

### US-13 — Prerequisite warning on selection (Should)
> As a student, I want to be warned when I select a subject with unmet prerequisites, so that I decide knowingly.

- **AC-1:** Given a subject with listed prerequisites the student has not selected/completed, when they add it to the plan, then an advisory warning is shown but the selection still succeeds (BR-007).
- **AC-2:** Given a subject with no prerequisites or all met, when added, then no warning is shown.
- **AC-3:** Given the advisory warning, when the student acknowledges it, then the acknowledgement is recorded (for metrics) and selection completes.

---

## 3. Functional Requirements

> Each FR traces to a User Story. Format: `FR-NNN` (zero-padded, sequential).

### Authentication & authorization
| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-001 | The system MUST allow a student to register with a unique email and password (policy: min 8 chars). | US-01 |
| FR-002 | The system MUST authenticate a student via email/password and establish a session. | US-01 |
| FR-003 | The system MUST reject all unauthenticated access to student-data routes (401) and scope every query to the authenticated student (BR-004). | US-01, US-11 |

### Subject catalog & discovery
| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-004 | The system MUST display a catalog of subjects with code, name, credits, workload, term, prerequisites, and description. | US-02 |
| FR-005 | The system MUST support search by name/code and filtering by credits/term, returning an empty state when no match. | US-02 |
| FR-006 | The system MUST let a student select 2–4 subjects and view them side-by-side aligned by attribute. | US-03 |

### Selection & manual add
| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-007 | The system MUST let a student add a catalog subject to a Selection for the current term, preventing duplicate selection of the same subject+term. | US-04 |
| FR-008 | The system MUST let a student remove a subject from their plan, handling the goal-dependency case per BR-001 / C-7. | US-04, US-11 |
| FR-009 | The system MUST let a student create a manually-added, student-owned Subject (name required) and auto-select it for the current term. | US-05 |
| FR-010 | The system MUST treat seed-catalog subjects as read-only and student-owned subjects as editable/deletable (BR-005). | US-05, US-11 |

### Goals
| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-011 | The system MUST let a student create a goal on a selected subject with title, metric type, target, and due date, bound to that subject (BR-001). | US-06 |
| FR-012 | The system MUST support three goal metric types — `numeric`, `boolean`, `percentage` — with the target input adapting per type (C-3). | US-06 |
| FR-013 | The system MUST reject goal creation with a past due date (BR-006) and goal creation against a non-selected subject (BR-001). | US-06 |

### Progress & derived metrics
| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-014 | The system MUST let a student log a ProgressEntry bound to one goal with date, metric-appropriate value, and optional note (BR-002). | US-07 |
| FR-015 | The system MUST reject progress entries dated in the future (C-8). | US-07 |
| FR-016 | The system MUST compute completion % as the capped (≤100%) aggregate of progress values against the goal target (BR-003). | US-08 |
| FR-017 | The system MUST compute and display a streak count based on the goal's cadence (C-9), resetting on a missed period. | US-08 |
| FR-018 | The system MUST flag a goal `at-risk` when due date is near and completion is below threshold (C-6), and transition to `completed` at 100% (BR-003). | US-08 |

### Reminders
| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-019 | The system MUST surface in-app reminders for goals due within the reminder window and for streaks at risk; no reminders for completed/abandoned goals (C-4). | US-09 |
| FR-020 | The system MUST clear/dismiss a reminder once the student logs qualifying progress. | US-09 |

### Dashboard
| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-021 | The system MUST present a dashboard summarising current-term subjects, active goals with completion %, aggregate progress, and surfaced reminders, with a guiding empty state for new users. | US-10 |

### CRUD & lifecycle
| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-022 | The system MUST support edit/delete of owned subjects, goals, and progress entries, recomputing derived metrics and cascading goal→progress deletion. | US-11 |
| FR-023 | The system MUST enforce ownership on every mutation, rejecting cross-student access with 403/404 (BR-004). | US-11 |

### Export & advisory
| ID | Requirement | Traces to |
|----|-------------|-----------|
| FR-024 | The system SHOULD let a student export their own data (subjects, selections, goals, progress) as JSON (CSV optional), scoped to the requester (BR-004). | US-12 |
| FR-025 | The system MUST show an advisory (non-blocking) warning when selecting a subject with unmet prerequisites and record acknowledgement (BR-007). | US-13 |

---

## 4. Non-Functional Requirements

### Performance
| ID | Requirement |
|----|-------------|
| NFR-001 | Catalog list and dashboard MUST render meaningful content (LCP) within **2.5s** on a mid-range device over 4G; API list endpoints MUST respond p95 **< 400ms** at MVP data volumes. |
| NFR-002 | Completion %/streak computation MUST be correct and deterministic, covered by TDD against a **real** PostgreSQL instance (no mocks — Constitution Art. III). |

### Accessibility
| ID | Requirement |
|----|-------------|
| NFR-003 | All pages MUST meet **WCAG 2.1 AA**: keyboard operability, visible focus, color-contrast ≥ 4.5:1 (text), form labels/ARIA, and semantic landmarks. |
| NFR-004 | All interactive flows (signup, select, goal-create, progress-log) MUST be completable via keyboard only and announced correctly to screen readers. |

### Security & privacy
| ID | Requirement |
|----|-------------|
| NFR-005 | Passwords MUST be hashed with a modern adaptive algorithm (bcrypt/argon2); plaintext storage is prohibited. |
| NFR-006 | Every data access MUST be authorization-scoped to the owning student (BR-004); inputs validated with **Zod**; OWASP Top 10 basics enforced (no SQLi via Prisma params, output encoding, CSRF protection on session auth). |
| NFR-007 | Auth errors MUST be non-enumerating (no "email not found" vs "wrong password" distinction). |

### Reliability, quality & UX baseline
| ID | Requirement |
|----|-------------|
| NFR-008 | Test coverage MUST be ≥ **80%** with unit + integration + E2E (Playwright) per Constitution Art. III/X. |
| NFR-009 | Every route MUST render a real page (MVP content or a designed empty/skeleton state) — **no 404s on navigable links and no "Coming Soon" placeholders**. |
| NFR-010 | The web app MUST be responsive and usable on a mobile browser down to 360px width (web-only MVP covers on-the-go logging — ASM-005). |

---

## 5. Out of Scope (MVP)

Mirrors the non-goals (CEO brief §"Explicit Non-Goals", addendum §"Out of Scope"):

- **AI/ML** — subject recommendations, auto-goal generation, any LLM feature (→ Phase 2).
- **Native mobile app** — responsive web only.
- **University SIS/LMS integration** — manual entry + static seed catalog only.
- **OAuth/SSO** — email/password only at launch (OAuth is a fast-follow, not MVP).
- **Email/push reminder delivery** — in-app reminders only in MVP.
- **Social/collaboration** — sharing, study groups, advisor visibility.
- **Payments/billing.**
- **Multi-term planning** — a single active term in MVP (multi-term is a later phase).

---

## 6. Clarifications & Assumptions

> CLARIFY-01. The CEO has decided platform (web), AI (Phase 2), and scope (full loop).
> For the remaining open questions, reasonable documented assumptions are taken (rather than
> blocking). Each is an explicit decision the Architect/CEO may override at the next checkpoint.

| ID | Open question | Assumption taken | Impact / rationale |
|----|---------------|------------------|--------------------|
| C-1 | Auth method | **Email + password** with bcrypt/argon2 hashing; session-based auth. No OAuth in MVP (fast-follow). | Matches addendum & ASM-004; lowest-friction to build; OAuth gated on signup-funnel drop-off. |
| C-2 | Seed catalog sourcing | **Small static seed set** curated from **one representative faculty** (~20–40 subjects), shipped as a migration/seed script; students fill gaps via manual add (US-05). | Validates ASM-001; avoids SIS integration; keeps discovery non-empty on day one. |
| C-3 | Goal metric types | **Three types: `numeric` (count toward a target, e.g. "12 chapters"), `boolean` (done / not done), `percentage` (0–100%).** Stored as an enum on Goal with a typed target value. | Bounds the goal form & completion math (BR-003); avoids open-ended metrics that break tracking. |
| C-4 | Reminder delivery channel | **In-app only** for MVP (notification surfaced on app open / dashboard). Email reminders are an optional post-MVP add (no email provider dependency in MVP). | De-risks MVP (no transactional email infra); still closes the habit loop for active users. |
| C-5 | Term scope | **Single active term** per student in MVP; Selections, goals, and dashboard scope to that term. | Multi-term is deferred; simplifies the data model and dashboard. |
| C-6 | "At-risk" definition | A goal is `at-risk` when **due date is within 7 days AND completion < 50%** (configurable constant). | Makes US-08 AC-4 / FR-018 testable without AI. |
| C-7 | Removing a selected subject that has goals | **Block removal** with a confirmation that lists dependent goals; the student must delete goals first (preserves BR-001 integrity; no silent cascade of goals). | Avoids accidental loss of goal history; clear UX. |
| C-8 | Future-dated progress entries | **Rejected** — progress entries may not be dated in the future (date ≤ today). | Keeps streak/completion math honest. |
| C-9 | Streak cadence | Streak cadence is **per-goal, defaulting to daily**, with a weekly option; a streak increments per period that has ≥1 qualifying entry and resets on a missed period. | Makes streaks deterministic & testable (NFR-002). |
| C-10 | Data export format | **JSON** (machine-readable, complete) for MVP; CSV is optional/nice-to-have. | US-12 is "Could"; JSON satisfies data-ownership with least effort. |
| C-11 | Email verification at signup | **Not required** in MVP (account active immediately); revisit with OAuth fast-follow. | Reduces signup friction (ASM-004); acceptable for non-sensitive MVP data. |

---

## 7. Traceability (US ↔ FR ↔ BN)

| US | BN | FRs | MoSCoW |
|----|----|-----|--------|
| US-01 | BN-001 | FR-001, FR-002, FR-003 | Must |
| US-02 | BN-002 | FR-004, FR-005 | Must |
| US-03 | BN-003 | FR-006 | Should |
| US-04 | BN-004 | FR-007, FR-008 | Must |
| US-05 | BN-005 | FR-009, FR-010 | Must |
| US-06 | BN-006 | FR-011, FR-012, FR-013 | Must |
| US-07 | BN-007 | FR-014, FR-015 | Must |
| US-08 | BN-008 | FR-016, FR-017, FR-018 | Must |
| US-09 | BN-009 | FR-019, FR-020 | Should |
| US-10 | BN-010 | FR-021 | Must |
| US-11 | BN-011 | FR-022, FR-023 | Must |
| US-12 | BN-012 | FR-024 | Could |
| US-13 | BN-013 | FR-025 | Should |

**Coverage check:** every US maps to ≥1 FR; every BN-001…BN-013 is covered by exactly one US (1:1, per BA §11.3). No orphan FRs.

---

## 8. Component Reuse Check (Constitution Art. II)

| Capability | Reuse candidate | Action |
|-----------|-----------------|--------|
| Email/password auth + session | Check `.claude/COMPONENT-REGISTRY.md` for an auth package before building. | Architect to confirm in plan. |
| Zod validation schemas, Fastify CRUD scaffolding | ConnectSW default-stack patterns. | Reuse standard patterns. |
| Empty-state / skeleton UI components | Check registry for shared UI primitives. | Architect to confirm. |

> The Architect MUST complete this table against `.claude/COMPONENT-REGISTRY.md` during `/speckit.plan`.

---

## Appendix — Conventions established (for the Architect)

- **ID schemes:** User stories `US-01…US-13` (zero-padded two-digit, stable from BA). Functional requirements `FR-001…FR-025` (zero-padded three-digit, sequential). Non-functional `NFR-001…`. Business needs `BN-001…013` and business rules `BR-001…007` carried verbatim from BA. Clarifications `C-1…C-11`.
- **Requirement verb convention:** MUST / SHOULD / MAY per RFC-2119, aligned to MoSCoW (Must→MUST, Should→SHOULD, Could→MAY).
- **Acceptance criteria:** Given/When/Then, `AC-n` per story.
- **Traceability rule:** every artifact downstream MUST cite a US and/or FR ID.
