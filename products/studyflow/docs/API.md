# StudyFlow — API Contract (v1)

**Product:** StudyFlow
**Author:** Architect (ConnectSW)
**Date:** 2026-06-17
**Task:** ARCH-01
**Base URL:** `http://localhost:5017` (api port 5017)
**Prefix:** all endpoints under `/v1`
**Auth:** httpOnly session cookie (`sf_session`), established by `/v1/auth/login` or `/v1/auth/signup`.
**Validation:** all request bodies/queries/params validated with Zod (TS strict). Schemas below are Zod-style pseudocode.
**Errors:** RFC 7807 problem+json via `AppError`. Shape:
```json
{ "type": "about:blank", "title": "Forbidden", "status": 403, "detail": "…", "errors": { "field": "msg" } }
```

> **Traceability:** every endpoint cites the FR / US it implements. Conventions per `architecture.md §12`.

---

## Conventions

- **Auth required?** "Yes" ⇒ valid `sf_session` cookie required; missing/invalid ⇒ **401**.
- **Ownership:** all student-data endpoints are scoped to the authenticated student (BR-004). Accessing another student's resource ⇒ **403** (or **404** to avoid enumeration).
- **List envelope:** `{ "data": [...], "pagination": { "page", "limit", "total", "totalPages", "hasMore" } }`.
- **Dates:** ISO-8601 (`YYYY-MM-DD` for `date`, full ISO for `datetime`).
- **Common status codes:** `400` validation, `401` unauthenticated, `403` forbidden/ownership, `404` not found, `409` conflict, `422` semantic validation, `201` created, `204` no content.

---

## 1. Auth — `US-01` (FR-001, FR-002, FR-003)

### `POST /v1/auth/signup` — Register (FR-001, C-11)
- **Auth:** No
- **Request:**
  ```ts
  z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(8),                 // FR-001 policy
  })
  ```
- **Response 201:** `{ student: { id, email, activeTerm }, }` + `Set-Cookie: sf_session=…; HttpOnly; Secure; SameSite=Lax`
- **Status:** `201` created+signed-in (US-01 AC-1) · `400` invalid · `409`→returned as **generic 400/409 non-enumerating** message (US-01 AC-2, NFR-007) · No email verification (C-11).

### `POST /v1/auth/login` — Sign in (FR-002)
- **Auth:** No
- **Request:** `z.object({ email: z.string().email().toLowerCase(), password: z.string() })`
- **Response 200:** `{ student: { id, email, activeTerm } }` + session cookie.
- **Status:** `200` ok (US-01 AC-3) · `401` generic "email or password invalid" (non-enumerating, NFR-007).

### `POST /v1/auth/logout` — Sign out
- **Auth:** Yes · **Response 204** (session row deleted, cookie cleared).

### `GET /v1/auth/me` — Current session (helper)
- **Auth:** Yes · **Response 200:** `{ student: { id, email, activeTerm } }` · `401` if no session (FR-003, US-01 AC-4).

---

## 2. Catalog — `US-02`, `US-03` (FR-004, FR-005, FR-006)

### `GET /v1/subjects` — Browse/search catalog (FR-004, FR-005)
- **Auth:** Yes
- **Query:**
  ```ts
  z.object({
    q: z.string().optional(),                    // name or code search (FR-005)
    credits: z.coerce.number().int().optional(), // filter
    term: z.string().optional(),                 // filter
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  ```
- **Response 200:** list envelope of `Subject` `{ id, code, name, credits, workload, term, prerequisites, description, isSeed }`.
- **Empty result:** `200` with `data: []` (frontend renders empty state — US-02 AC-4, NFR-009).

### `GET /v1/subjects/:id` — Subject detail (FR-004)
- **Auth:** Yes · **Response 200:** full `Subject` (US-02 AC-3) · `404` if not found.

### `GET /v1/subjects/compare` — Compare 2–4 subjects (FR-006, US-03)
- **Auth:** Yes
- **Query:** `z.object({ ids: z.array(z.string().uuid()).min(2).max(4) })` (CSV or repeated param)
- **Response 200:** `{ subjects: Subject[] }` aligned by attribute (US-03 AC-1).
- **Status:** `400` if <2 or >4 ids (US-03 AC-2).

---

## 3. Subjects (manual add / edit / delete) — `US-05`, `US-11` (FR-009, FR-010)

### `POST /v1/subjects` — Manual add (FR-009, US-05)
- **Auth:** Yes
- **Request:**
  ```ts
  z.object({
    name: z.string().min(1),                     // required (US-05 AC-1)
    code: z.string().optional(),
    credits: z.number().int().optional(),
    workload: z.string().optional(),
    prerequisites: z.string().optional(),
    description: z.string().optional(),
    term: z.string().optional(),                 // defaults to student.activeTerm
  })
  ```
- **Behaviour:** creates a student-owned `Subject` (`isSeed=false`, `ownerStudentId=studentId`) **and auto-creates a Selection** for the active term (US-05 AC-1).
- **Response 201:** `{ subject, selection }`.

### `PATCH /v1/subjects/:id` — Edit owned subject (FR-010, US-11)
- **Auth:** Yes · **Request:** partial of manual-add schema.
- **Status:** `200` if owned (US-05 AC-2) · **`403` if `isSeed=true`** (read-only, BR-005, US-05 AC-3) · `404` if not owner.

### `DELETE /v1/subjects/:id` — Delete owned subject (FR-010, US-11)
- **Auth:** Yes · **Status:** `204` if owned & deletable · `403` if seed (BR-005) · `409` if it has an active selection with goals (defer to C-7 flow).

---

## 4. Selections — `US-04`, `US-13` (FR-007, FR-008, FR-025)

### `GET /v1/selections` — My subjects (current term) (US-04, US-10)
- **Auth:** Yes · **Response 200:** `{ data: [{ id, term, prereqWarningAck, subject: Subject, goalCount }] }` scoped to active term (C-5).

### `POST /v1/selections` — Add subject to plan (FR-007, FR-025, US-04/US-13)
- **Auth:** Yes
- **Request:**
  ```ts
  z.object({
    subjectId: z.string().uuid(),
    prereqWarningAck: z.boolean().optional(),    // BR-007 / FR-025 (US-13 AC-3)
  })
  ```
- **Behaviour:** creates a `Selection` for the active term. Computes unmet prerequisites (advisory).
- **Response 201:** `{ selection, prerequisiteWarning?: { unmet: string[] } }` — warning is **advisory, non-blocking** (BR-007, FR-025, US-13 AC-1). If unmet prereqs exist and `prereqWarningAck` not sent, return `201` with `prerequisiteWarning` populated; frontend prompts ack and re-submits (US-13 AC-3).
- **Status:** `201` · `409` duplicate subject+term (FR-007, US-04 AC-2) · `404` subject not found.

### `DELETE /v1/selections/:id` — Remove from plan (FR-008, US-04/US-11)
- **Auth:** Yes
- **Behaviour:** if the selection has goals ⇒ **blocked** (C-7): respond `409` with the dependent goals listed; student must delete goals first (US-04 AC-3).
- **Status:** `204` if no goals · **`409`** `{ detail, dependentGoals: [{id,title}] }` if goals exist (C-7) · `403/404` if not owner.

---

## 5. Goals — `US-06`, `US-11` (FR-011, FR-012, FR-013, FR-022, FR-023)

### `GET /v1/goals` — List my goals (US-08/US-10)
- **Auth:** Yes · **Query:** `{ selectionId?, status?, page?, limit? }`
- **Response 200:** list envelope of `Goal` enriched with derived metrics: `{ id, selectionId, title, metricType, target, cadence, dueDate, status, completionPct, streak }`.

### `GET /v1/goals/:id` — Goal detail (US-08)
- **Auth:** Yes · **Response 200:** `Goal` + `{ completionPct, streak, atRisk, progressEntries: [...] }` · `403/404` if not owner.

### `POST /v1/goals` — Create goal (FR-011, FR-012, FR-013, US-06)
- **Auth:** Yes
- **Request:**
  ```ts
  z.object({
    selectionId: z.string().uuid(),              // bind to selected subject (BR-001)
    title: z.string().min(1),
    metricType: z.enum(['numeric','boolean','percentage']),  // C-3, FR-012
    target: z.number().positive(),               // interpreted per metricType
    cadence: z.enum(['daily','weekly']).default('daily'),    // C-9
    dueDate: z.string().date().refine(d => d > today),       // future-only (BR-006, FR-013)
  })
  ```
- **Behaviour:** verifies `selectionId` belongs to the student (BR-001); rejects if not selected (US-06 AC-4). Creates goal with status `active` (US-06 AC-1).
- **Status:** `201` · `400/422` past due date (BR-006, US-06 AC-3) · `403/404` selection not owned (BR-001, US-06 AC-4).

### `PATCH /v1/goals/:id` — Edit goal (FR-022, US-11)
- **Auth:** Yes · **Request:** partial of create schema (no selectionId change).
- **Behaviour:** edits persist; derived metrics + status recomputed (US-11 AC-1; may reopen `completed`→`active`, PRD §7).
- **Status:** `200` · `403/404` ownership (FR-023, US-11 AC-4).

### `POST /v1/goals/:id/abandon` — Abandon goal (lifecycle, PRD §7)
- **Auth:** Yes · **Response 200** status→`abandoned`.

### `DELETE /v1/goals/:id` — Delete goal (FR-022, US-11)
- **Auth:** Yes · **Behaviour:** cascade-deletes its `ProgressEntry` rows; parent `Selection` unaffected (US-11 AC-2).
- **Status:** `204` · `403/404` ownership.

---

## 6. Progress — `US-07`, `US-08`, `US-11` (FR-014, FR-015, FR-016, FR-017, FR-018, FR-022)

### `POST /v1/goals/:goalId/progress` — Log progress (FR-014, FR-015, US-07)
- **Auth:** Yes
- **Request:**
  ```ts
  z.object({
    value: z.number(),                           // metric-appropriate (boolean: 0|1)
    entryDate: z.string().date().default(today).refine(d => d <= today), // C-8, FR-015
    note: z.string().max(2000).optional(),
  })
  ```
- **Behaviour:** creates `ProgressEntry` bound to goal (BR-002); recomputes completion %, streak, status (BR-003, FR-016/017/018). See `architecture.md §9` sequence.
- **Response 201:** `{ progressEntry, goal: { completionPct, streak, status } }` (US-07 AC-2).
- **Status:** `201` · `400/422` future date (C-8, US-07 AC-3) · `403/404` goal not owned.

### `GET /v1/goals/:goalId/progress` — List progress entries (US-08)
- **Auth:** Yes · **Response 200:** `{ data: ProgressEntry[] }` ordered by `entryDate desc`.

### `PATCH /v1/progress/:id` — Edit entry (FR-022, US-07/US-11)
- **Auth:** Yes · **Request:** partial of log schema (`value`, `entryDate≤today`, `note`).
- **Behaviour:** recomputes goal metrics (US-07 AC-4) · **Status:** `200` · `403/404` ownership.

### `DELETE /v1/progress/:id` — Delete entry (FR-022, US-11)
- **Auth:** Yes · **Behaviour:** recomputes goal metrics · **Status:** `204` · `403/404` ownership.

---

## 7. Reminders — `US-09` (FR-019, FR-020)

### `GET /v1/reminders` — In-app reminder feed (FR-019, C-4)
- **Auth:** Yes
- **Behaviour:** computed on read (no scheduler in MVP). Returns reminders for goals **due within the reminder window** and **streaks at risk**; **excludes** `completed`/`abandoned` goals (US-09 AC-4).
- **Response 200:**
  ```json
  { "data": [
    { "goalId": "…", "title": "…", "kind": "due_soon|streak_at_risk|at_risk",
      "dueDate": "…", "completionPct": 30, "message": "…" }
  ] }
  ```
- A reminder auto-clears once qualifying progress is logged (FR-020, US-09 AC-3) — i.e. it simply
  stops appearing on the next `GET /v1/reminders` after the progress entry recomputes metrics.

---

## 8. Dashboard — `US-10` (FR-021)

### `GET /v1/dashboard` — Unified dashboard (FR-021)
- **Auth:** Yes
- **Response 200:**
  ```json
  {
    "activeTerm": "2026-S1",
    "selections": [ { "id", "subject": { … }, "goalCount", "avgCompletionPct" } ],
    "activeGoals": [ { "id", "title", "completionPct", "streak", "status", "dueDate" } ],
    "aggregate": { "totalGoals", "completedGoals", "overallCompletionPct" },
    "reminders": [ … ]                            // mirrors /v1/reminders (US-10 AC-4)
  }
  ```
- **Empty state:** a new student gets all-empty arrays; frontend renders the guiding first-run empty state (US-10 AC-2, NFR-009).

---

## 9. Export — `US-12` (FR-024, C-10)

### `GET /v1/export` — Export my data as JSON (FR-024)
- **Auth:** Yes
- **Behaviour:** returns the requesting student's `subjects (owned)`, `selections`, `goals`, `progressEntries` — scoped to the requester (BR-004, US-12 AC-2).
- **Response 200:** `Content-Type: application/json`, `Content-Disposition: attachment; filename="studyflow-export.json"`
  ```json
  { "exportedAt": "…", "student": { "id", "email" },
    "subjects": [...], "selections": [...], "goals": [...], "progressEntries": [...] }
  ```

---

## 10. Health (ops, no auth) — NFR-008

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /health` | No | Liveness (from `@connectsw/observability healthPlugin`). |
| `GET /health/ready` | No | Readiness incl. DB check; `503` if Postgres unreachable. |
| `GET /internal/metrics` | Internal key | p50/p95/p99 latency, error rate (`metricsPlugin`). |

---

## 11. Endpoint → FR/US matrix (summary)

| # | Method & Path | Auth | FR(s) | US |
|---|---------------|------|-------|----|
| 1 | POST /v1/auth/signup | No | FR-001 | US-01 |
| 2 | POST /v1/auth/login | No | FR-002 | US-01 |
| 3 | POST /v1/auth/logout | Yes | FR-002 | US-01 |
| 4 | GET /v1/auth/me | Yes | FR-003 | US-01 |
| 5 | GET /v1/subjects | Yes | FR-004, FR-005 | US-02 |
| 6 | GET /v1/subjects/:id | Yes | FR-004 | US-02 |
| 7 | GET /v1/subjects/compare | Yes | FR-006 | US-03 |
| 8 | POST /v1/subjects | Yes | FR-009 | US-05 |
| 9 | PATCH /v1/subjects/:id | Yes | FR-010, FR-022 | US-05, US-11 |
| 10 | DELETE /v1/subjects/:id | Yes | FR-010, FR-022 | US-05, US-11 |
| 11 | GET /v1/selections | Yes | FR-007, FR-021 | US-04, US-10 |
| 12 | POST /v1/selections | Yes | FR-007, FR-025 | US-04, US-13 |
| 13 | DELETE /v1/selections/:id | Yes | FR-008 | US-04, US-11 |
| 14 | GET /v1/goals | Yes | FR-016, FR-017 | US-08 |
| 15 | GET /v1/goals/:id | Yes | FR-016, FR-018 | US-08 |
| 16 | POST /v1/goals | Yes | FR-011, FR-012, FR-013 | US-06 |
| 17 | PATCH /v1/goals/:id | Yes | FR-022, FR-023 | US-11 |
| 18 | POST /v1/goals/:id/abandon | Yes | FR-022 | US-11 |
| 19 | DELETE /v1/goals/:id | Yes | FR-022, FR-023 | US-11 |
| 20 | POST /v1/goals/:goalId/progress | Yes | FR-014, FR-015, FR-016, FR-017, FR-018 | US-07, US-08 |
| 21 | GET /v1/goals/:goalId/progress | Yes | FR-014 | US-07 |
| 22 | PATCH /v1/progress/:id | Yes | FR-022 | US-07, US-11 |
| 23 | DELETE /v1/progress/:id | Yes | FR-022 | US-11 |
| 24 | GET /v1/reminders | Yes | FR-019, FR-020 | US-09 |
| 25 | GET /v1/dashboard | Yes | FR-021 | US-10 |
| 26 | GET /v1/export | Yes | FR-024 | US-12 |

**26 endpoints** (24 student-data + 2 public auth; health endpoints excluded from count). Every
FR-001…FR-025 is implemented by at least one endpoint (FR-003 by the `sessionAuth` plugin across all
authed routes; FR-023 by repository ownership scoping across all mutations).
