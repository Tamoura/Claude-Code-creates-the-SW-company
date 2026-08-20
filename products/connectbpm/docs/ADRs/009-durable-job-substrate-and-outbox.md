# ADR-009: Durable Timers, Schedules and Side Effects — One PostgreSQL Job Table with `SKIP LOCKED`

**Product**: ConnectBPM · **Task**: ARCH-01 · **Date**: 2026-08-20
**Author**: Architect, ConnectSW

## Status

**Accepted, and AMENDED by ARCH-02 on 2026-08-20.** The claim loop as written below could not
run: `job` is one of ADR-004 §3's 27 tables with `ENABLE` + `FORCE ROW LEVEL SECURITY`, so a
cross-tenant `SELECT … FOR UPDATE SKIP LOCKED` matched **zero rows and reported success**. The
substrate's shape — one table, one poll, `SKIP LOCKED` as the only coordination — is unchanged
and correct. What changed is the **principal** that executes the claim: it is now a
`SECURITY DEFINER` function owned by a `NOLOGIN` role, per **ADR-010**. Three further
corrections are marked *(ARCH-02)* in place:

| # | What was wrong |
|---|----------------|
| B1 | "The claim loop" was raw SQL run by the application role. It claims nothing under RLS. Replaced by `app_claim_due_jobs()` — see below. |
| B2 | The partial index `job_due` was described as existing. It did not — Prisma cannot express an index predicate, so only the non-partial `job_run_at_id_idx` was ever created. Both partial indexes are now added by `20260820150000_job_claim_boundary`. |
| B3 | "A crashed worker's `locked_until` expires and a sweeper returns the row to `PENDING`" named a sweeper that had no way to exist under RLS either. It ships as `app_reap_expired_job_leases()`. |

## Context

The engine needs four things that outlive a request: due-date and reminder timers (E5), schedule
starts (E7), retries, and outbound side effects (webhooks, notifications). The requirements:

| # | Requirement | Source |
|---|-------------|--------|
| J1 | ≥99% of timers fire within 60 s of due time, sustained through a **50,000-timer burst** | `NFR-004`, `EC-17`, `AC-071` |
| J2 | A timer whose target token has moved is discarded as stale **by token version, never by wall-clock ordering** | `FR-057`, `EC-02`, `AC-072` |
| J3 | 100% of in-flight instances resume after a forced restart with **zero duplicate side effects** | `NFR-005`, `AC-070` |
| J4 | PostgreSQL is the **sole** source of truth; Redis holds nothing billing, evidence or correctness depends on | `FR-045` |
| J5 | Suspension pauses an instance's timers | `FR-054` |
| J6 | Durations resolve against a **per-tenant working calendar** and timezone; no weekend or holiday assumption anywhere in the engine | `FR-062`, `EC-10`, DEC-001 geography neutrality |

`PATTERN-014` (confidence high, proven in `stablecoin-gateway` and running in
`packages/webhooks/src/backend/services/delivery.service.ts:98–128`) is the company's existing
`SELECT … FOR UPDATE SKIP LOCKED` claim loop with composite-unique idempotency. This ADR evaluates it
as the substrate and adopts it.

## Decision

**One `job` table in the same PostgreSQL database, claimed with `SELECT … FOR UPDATE SKIP LOCKED`.**
No Redis queue, no external broker, no separate scheduler service.

### The table

```sql
CREATE TABLE job (
  id            uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL,
  kind          job_kind NOT NULL,       -- TIMER_DUE | TIMER_REMINDER | TIMER_ESCALATION
                                          -- | INSTANCE_SLA | SCHEDULE_TICK | OUTBOX_WEBHOOK
                                          -- | OUTBOX_NOTIFICATION | RETENTION | RECONCILE
  instance_id   uuid,
  token_id      uuid,
  token_version int,                      -- J2: the staleness discriminator
  element_id    text,
  dedupe_key    text NOT NULL,            -- PATTERN-014: composite idempotency
  payload       jsonb NOT NULL,
  run_at        timestamptz NOT NULL,
  status        job_status NOT NULL,      -- PENDING | CLAIMED | DONE | FAILED | DISCARDED
  attempts      int NOT NULL DEFAULT 0,
  locked_by     text,
  locked_until  timestamptz,
  last_error    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX job_dedupe ON job (tenant_id, dedupe_key);
CREATE INDEX job_due_pending_idx  ON job (run_at, id)    WHERE status = 'PENDING';   -- B2
CREATE INDEX job_lease_expiry_idx ON job (locked_until)  WHERE status = 'CLAIMED';   -- B2
CREATE INDEX job_tenant ON job (tenant_id, status, run_at);
```

The partial index on `status = 'PENDING'` is what keeps the poll fast as completed jobs accumulate;
`DONE` rows are archived out after 7 days.

**B2 (ARCH-02).** Both partial indexes were described here as though they existed and were
absent from the database for the first two migrations. Prisma cannot express an index predicate,
so `schema.prisma`'s `@@index([runAt, id])` produced the **non-partial** `job_run_at_id_idx` and
nothing else — the index the claim actually needs was never created, and
`scripts/check-rls.ts`'s `INDEX_EXCEPTIONS` text asserted it existed. They are created by
`20260820150000_job_claim_boundary`. The non-partial index is retained because `schema.prisma`
declares it and dropping it would be migration drift; that redundancy on a hot table is a
recorded cost, to be removed when Prisma can express the predicate.

### The claim loop — B1 (ARCH-02)

**The query below is what this ADR originally specified. It claims nothing.** `job` carries
`ENABLE` + `FORCE ROW LEVEL SECURITY` (ADR-004 §3), so run by the application role with no tenant
context it matches zero rows — and returns success while doing so:

```sql
-- DOES NOT WORK under ADR-004 §3. Kept because the failure is invisible and
-- the next person to write it must be able to recognise it.
WITH claimed AS (
  SELECT id FROM job
   WHERE status = 'PENDING' AND run_at <= now()
   ORDER BY run_at, id
   LIMIT $batch
   FOR UPDATE SKIP LOCKED
)
UPDATE job j SET status='CLAIMED', ... FROM claimed c WHERE j.id = c.id
RETURNING j.*;      -- 0 rows. No error. Timers never fire.
```

**What the runner calls instead**, per ADR-010:

```sql
SELECT job_id, tenant_id
  FROM public.app_claim_due_jobs($worker, $batch, $tenant_cap, $lease_secs);
```

`app_claim_due_jobs` is a `SECURITY DEFINER` function owned by `connectbpm_job_claimer` — a
NOLOGIN, NOBYPASSRLS role admitted to `job` by two additive policies over six columns in two
statuses. It contains the same `SELECT … FOR UPDATE SKIP LOCKED` and the same lease `UPDATE`; the
only change is **who** executes them. `EXECUTE` is granted to `connectbpm_runner` and refused to
the API role. The full width of the exception is in ADR-010 and restated in ADR-004 §3.1.

`SKIP LOCKED` means N workers never collide and no job is claimed twice — the mechanism `AC-071`
("none fires twice, none is dropped") needs. Measured with 8 concurrent workers over 400 due jobs:
**160 claimed, 160 distinct, 20 each, zero double-claims.**

**The lock must be in the same query level as the `LIMIT`.** That is what makes the limit count
only rows this worker actually took, so worker 2 skips worker 1's window and takes the next one.
A first draft of the function put the lock in a later CTE over a candidate set already fixed by
fairness; both workers then chose the same candidates and one claimed nothing — w1 = 0, w2 = 30,
correct and 1/Nth of the throughput `J1` needs. Recorded because it is a silent throughput bug,
not a visible one.

**Per-tenant fairness** is applied **inside** the claim by a window function over a 4× oversampled,
bounded scan, rather than by post-filtering a batch that has already been claimed — so no row is
locked and then discarded for fairness's sake, and the window never runs over the whole `PENDING`
backlog. One tenant's midnight burst takes at most `p_tenant_cap` slots, which means a batch under
a single-tenant burst is **deliberately smaller than `$batch`**. That is the ceiling working, and
it is the whole noisy-neighbour mitigation available inside a shared deployment (ADR-004).

**The lease reaper — B3 (ARCH-02).** `app_reap_expired_job_leases($limit)`, the second function of
the ADR-010 boundary, returns a crashed worker's rows to `PENDING` once `locked_until` has passed.
It is part of the substrate rather than of the runner, because a claim mechanism without lease
recovery fails the same silent way the claim did. `attempts` is **not** re-incremented — it was
incremented at claim time, so a crash loop stays bounded.

**Throughput for J1**: 50,000 due timers, ≥99% within 60 s ⇒ ~825 jobs/s. With batch 200 and 8 worker
loops at a ~10 ms median transition, headroom is roughly 3×. The burst test (`AC-071`) is a CI
performance gate, not an assumption.

### Staleness by token version, never by clock (J2)

Every timer job records `token_id` and the `token_version` current when it was scheduled. The handler
opens the transition transaction and takes:

```sql
SELECT * FROM token WHERE id = $token_id AND version = $token_version FOR UPDATE;
```

Zero rows ⇒ the token has moved, the task is completed or withdrawn, or the instance ended. The job is
marked `DISCARDED`, one `timer.discarded_stale` evidence entry is written, and **nothing else happens**
— no transition, no notification (`EC-02`, `AC-072`). Wall-clock ordering is never consulted, so clock
skew between workers cannot cause a wrong decision.

### Suspension (J5)

`FR-054`: suspending an instance sets its timer jobs to `status='PENDING', run_at = 'infinity'` and
records the remaining duration on the job payload. Resume recomputes `run_at` from the recorded
remainder against the working calendar — so a two-day approval suspended over a weekend does not lose
its two days, and does not fire the instant it resumes.

### Working calendar (J6)

Duration arithmetic is a pure function
`resolveDueAt(startUtc, duration, calendar, timezone) → utcInstant`, using `luxon` (MIT) for IANA zone
and DST resolution and the tenant's `WorkingCalendar` (weekend days, working hours, holiday dates) for
business-time arithmetic. Where a local time is skipped by a DST spring-forward, the next valid
instant is used (`EC-10`). **No weekend, workweek or holiday value appears anywhere in the engine, the
schema or an enum** — it is all tenant configuration, which is the mechanism by which DEC-001's
geography neutrality is actually true rather than merely asserted. `cron-parser` (MIT) computes E7
recurrence occurrences in the tenant's timezone.

### Side effects via a transactional outbox (J3)

Nothing external is ever called from inside a transaction. The transition transaction inserts
`OUTBOX_WEBHOOK` / `OUTBOX_NOTIFICATION` jobs alongside the token move, so a side effect exists **iff**
the state change committed. The drain hands webhooks to `@connectsw/webhooks` — reused whole, including
its HMAC signing, SSRF guard, circuit breaker, exponential backoff and its own
`(endpointId, eventType, resourceId)` unique constraint, which deduplicates a redelivery at the second
layer.

**Honest statement of the delivery guarantee** (this qualifies `AC-070`):

| Effect | Guarantee | Mechanism |
|--------|-----------|-----------|
| Token movement, task rows, instance state | **Exactly once** | one transaction + token-version guard |
| Evidence entry | **Exactly once** | same transaction, gap-free `seq` |
| Usage event | **Exactly once** | same transaction + unique idempotency key (ADR-007) |
| Webhook delivery | **At least once**, deduplicated at the receiver by our idempotency header and by the delivery table's unique key | HTTP has no exactly-once |
| Email / notification | **Notification row exactly once; email delivery at least once** | see below |

A worker that crashes after handing an email to the provider but before marking the job `DONE` will
retry and the provider may send twice. This is not solvable without provider-side idempotency, and we
choose **at-least-once deliberately**: for a workflow product a duplicate reminder is an annoyance
while a lost task assignment is a broken process. `AC-070`'s "no duplicated notification" is therefore
implemented and tested as **no duplicated notification record**, and the email channel is documented as
at-least-once. Where the provider supports an idempotency key (SES `MessageDeduplicationId`-style,
Postmark, SendGrid), the job's `dedupe_key` is passed through, which reduces the window in practice.
**This is flagged to the PM as a wording change to `AC-070`.**

### Deployment shape

Two processes from **one codebase and one image**: `api` (Fastify, port 5018) and `runner` (the job
loop). They are separated so an API deploy does not pause timers and so runner concurrency scales on
its own. **They also connect as different database roles** (ARCH-02): `api` as `connectbpm_app`
and `runner` as `connectbpm_runner`, because the runner is the only principal permitted to
`EXECUTE` the claim functions. A bug on the HTTP surface must not be able to lease every tenant's
timers and suppress the engine globally — see ADR-010 §4. They are **not** a microservice boundary — same repository, same schema, same models, no
network protocol between them. The runner is horizontally scalable by adding replicas, with no
coordination, because `SKIP LOCKED` is the coordination.

## Consequences

### Positive
- One durability mechanism serves timers, schedules, retries and outbound effects. There is no second
  queue to reason about, no Redis persistence question, and `FR-045` is satisfied trivially.
- Jobs are enqueued **in the same transaction** as the state change that justifies them, which is what
  makes `AC-070`'s "zero duplicate side effects" achievable for everything that is a row.
- The pattern is already proven in production in `@connectsw/webhooks` — PATTERN-014, high confidence.
  Reuse is of a proven shape, not an idea.
- Adding runner replicas requires no leader election, no partition assignment, no coordination service.

### Negative
- Polling has a floor latency (poll interval 1 s in v1) and costs a query per tick per worker. At v1
  scale this is negligible; if it ever is not, `LISTEN/NOTIFY` can wake the loop early **without
  changing the claim semantics** — recorded so it is not built pre-emptively.
- `job` is a hot table. It needs an autovacuum-aggressive setting and the `DONE`-row archival above,
  or the partial index bloats. This is an operational requirement, not a nice-to-have.
- Long-running handlers can exceed `locked_until` and be re-claimed concurrently. Mitigated by keeping
  handlers short (one transition), by a 60 s lease against a 5 s `statement_timeout`, and by every
  handler being idempotent under the token-version guard — a double-claim produces one effect.
- At-least-once email, stated plainly above.

### Neutral
- The reconciliation job (`FR-110`) and retention job (`FR-096`) run on the same substrate as
  `RECONCILE` and `RETENTION` job kinds. One scheduler, one operational surface.

## Alternatives Considered

### BullMQ / Redis-backed queue
- **Pros**: purpose-built, good tooling, high throughput, delayed jobs built in.
- **Cons**: violates `FR-045` — job state would live in Redis while instance state lives in
  PostgreSQL, so a job cannot be enqueued in the same transaction as the state change and the crash
  window `AC-070` forbids reopens. Redis persistence semantics become a correctness dependency.
- **Why rejected**: the whole design depends on side effects being transactional with state.

### An external scheduler (cloud scheduler / cron) calling an endpoint
- **Pros**: no runner process to operate.
- **Cons**: per-timer scheduling at 500,000 open timers is not what those services are for; retries and
  at-least-once semantics move outside our control; and a per-tenant working calendar cannot be
  expressed to them.
- **Why rejected**: the timer volume and the calendar requirement are both disqualifying.

### `pg_cron` / PostgreSQL-native scheduling
- **Pros**: no application scheduler at all.
- **Cons**: designed for a small number of administrative schedules, not per-instance timers; no
  per-job retry, lease or dedupe semantics; unavailable on some managed PostgreSQL offerings, which
  would constrain the Sovereign topology (`NFR-019`).
- **Why rejected**: wrong granularity, and it constrains where we can deploy.

## References
- PATTERN-014, `.claude/memory/company-knowledge.json`; `packages/webhooks/src/backend/services/delivery.service.ts:98-128` (verified)
- `FR-045`, `FR-054`–`FR-064`, `FR-096`, `FR-110`; `NFR-004`, `NFR-005`, `NFR-019`
- `EC-02`, `EC-10`, `EC-17`; `AC-070`, `AC-071`, `AC-072`
- ADR-004 (tenancy — §3.1 is the exception this ADR depends on), ADR-007 (metering), ADR-008 (evidence)
- **ADR-010** — the cross-tenant job-claim boundary; amendments B1, B2, B3 above
- `apps/api/prisma/migrations/20260820150000_job_claim_boundary/migration.sql`
- `apps/api/tests/integration/tenancy/job-claim-boundary.test.ts`
