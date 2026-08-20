# ADR-009: Durable Timers, Schedules and Side Effects — One PostgreSQL Job Table with `SKIP LOCKED`

**Product**: ConnectBPM · **Task**: ARCH-01 · **Date**: 2026-08-20
**Author**: Architect, ConnectSW

## Status

Accepted.

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
CREATE INDEX job_due ON job (run_at, id) WHERE status = 'PENDING';
CREATE INDEX job_tenant ON job (tenant_id, status, run_at);
```

The partial index on `status = 'PENDING'` is what keeps the poll fast as completed jobs accumulate;
`DONE` rows are archived out after 7 days.

### The claim loop

```sql
WITH claimed AS (
  SELECT id FROM job
   WHERE status = 'PENDING' AND run_at <= now()
   ORDER BY run_at, id
   LIMIT $batch
   FOR UPDATE SKIP LOCKED
)
UPDATE job j SET status='CLAIMED', locked_by=$worker, locked_until=now()+interval '60 seconds',
                 attempts=attempts+1
  FROM claimed c WHERE j.id = c.id
RETURNING j.*;
```

`SKIP LOCKED` means N workers never collide and no job is claimed twice — the mechanism `AC-071`
("none fires twice, none is dropped") needs. A crashed worker's `locked_until` expires and a sweeper
returns the row to `PENDING`, which is why every handler must be idempotent (below).

**Per-tenant fairness**: the batch is post-filtered to at most `ceil(batch/4)` jobs per tenant, so one
tenant's midnight burst cannot monopolise a batch. Cheap, and it is the whole noisy-neighbour
mitigation available inside a shared deployment (ADR-004).

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
its own. They are **not** a microservice boundary — same repository, same schema, same models, no
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
- ADR-004 (tenancy), ADR-007 (metering), ADR-008 (evidence)
