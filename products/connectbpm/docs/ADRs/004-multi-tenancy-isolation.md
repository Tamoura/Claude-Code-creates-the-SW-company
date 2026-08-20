# ADR-004: Multi-Tenancy — Shared Schema, Mandatory Row-Level Security, Deployment as the Sovereignty Lever

**Product**: ConnectBPM · **Task**: ARCH-01 · **Date**: 2026-08-20
**Author**: Architect, ConnectSW
**Deciders**: Architect (delegated by CEO-DECISIONS.md)

## Status

Accepted.

## Context

This is the product's highest-severity risk class. A cross-tenant leak is **existential** — STRAT-01
kill criterion **K6**, `NFR-008` (zero incidents), `RSK-001`. It is also the decision most likely to
be made once and never revisited, because every other design sits on top of it.

Four constraints bound the choice:

| Constraint | Source | Effect |
|-----------|--------|--------|
| Zero cross-tenant exposure; a two-tenant isolation suite is a **merge blocker** on every build; a new endpoint absent from the suite fails the build | `NFR-008`, `AC-049`, `AC-050` | Isolation must be *enumerable and testable*, not per-route discipline |
| Cross-tenant reads return **404, never 403** — existence is not disclosed | `FR-003`, `AC-052` | Enforcement must happen where "not found" and "not yours" become the same answer: the data-access boundary |
| The topology **must not foreclose** a future single-tenant / in-region / sovereign deployment of the same codebase, without re-architecture | `NFR-019`, DEC-001, STRAT A4 | No decision may assume one global database forever |
| `packages/` has **zero tenancy** — verified: `grep -ril "tenantid\|tenant_id" packages/` → 0 files | Orchestrator + re-verified in ARCH-01 | There is nothing to inherit; this is built |

### The options

```mermaid
flowchart TB
    Q{"Isolation model"}
    Q --> A["Shared schema + tenantId"]
    Q --> B["Schema per tenant"]
    Q --> C["Database per tenant"]
    A --> A1["One timer_job table<br/>one SKIP LOCKED poll"]
    A --> A2["One migration"]
    A --> A3["Leak risk = a missing<br/>WHERE clause"]
    B --> B1["200 tenants x ~28 tables<br/>= ~5,600 tables"]
    B --> B2["Timer runner must poll<br/>N schemas — DISQUALIFYING"]
    B --> B3["Migration is an N-way<br/>fan-out job"]
    C --> C1["Strongest isolation"]
    C --> C2["N connection pools;<br/>self-serve signup provisions<br/>a database"]
    C --> C3["Cost per free Sandbox<br/>tenant is a database"]
    style A fill:#1e5f3f,color:#fff
    style B2 fill:#8b2e2e,color:#fff
```

## Decision

**Shared schema, `tenantId` on every tenant-scoped row, PostgreSQL Row-Level Security as a mandatory
second layer, and the deployment topology — not the schema — as the lever for sovereignty.**

### 1. Every tenant-scoped row carries a non-null `tenantId`

Including rows that are reachable only through a parent (`Token`, `InstanceVariable`, `FormSchema`).
Denormalising `tenantId` onto child tables is deliberate: it means the RLS predicate and the index
prefix are uniform, and no isolation guarantee depends on a join being written correctly.

**Every index on a tenant-scoped table leads with `tenantId`.** `@@index([tenantId, status, dueAt])`,
never `@@index([status, dueAt])`. This is both a correctness shape and the query plan we want.

### 2. Layer one — the data-access boundary, enforced by the type system

`AC-051` requires that a data-access method written without a tenant predicate "does not compile or
does not pass the access-layer test". A lint rule cannot deliver "does not compile". A **branded
type** can:

```ts
// Only the tenancy layer can construct this. There is no public constructor.
declare const TenantScopedBrand: unique symbol;
export type TenantScopedClient = PrismaClient & { readonly [TenantScopedBrand]: true };

// The ONLY way to obtain one:
export async function withTenant<T>(
  ctx: TenantContext,
  fn: (db: TenantScopedClient) => Promise<T>,
): Promise<T>;
```

Repository functions accept `TenantScopedClient`, never `PrismaClient`. A developer who reaches for
the raw client to write an unscoped query gets a **type error**, not a code review comment.
`withTenant` opens a transaction, sets the RLS variable (below), and hands over a client extended
with a Prisma `$extends` `query` hook that injects `where: { tenantId: ctx.tenantId }` into every
model operation on a tenant-scoped model, and **throws on any model operation it does not recognise**
— so a newly added model is scoped by default and a new unregistered model fails loudly rather than
silently leaking.

Cross-tenant reads therefore produce an empty result, which the API layer renders as **404**
(`FR-003`, `AC-052`), identical in shape to a genuinely absent row.

### 3. Layer two — PostgreSQL Row-Level Security, mandatory, not optional

`credit-os` ADR-004 lists RLS as "an available future hardening layer". For ConnectBPM it is **not
optional**, because unlike `credit-os` we run many tenants in one database from day one.

```sql
ALTER TABLE process_instance ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_instance FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON process_instance
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

- `withTenant` issues `SET LOCAL app.tenant_id = $1` as the first statement of its transaction.
  `SET LOCAL` is **transaction-scoped**, so it is safe behind PgBouncer in transaction pooling mode
  and cannot leak into a recycled connection.
- The application connects as a role that is **neither superuser nor `BYPASSRLS`**. Migrations and
  the reconciliation job use a separate, explicitly privileged role.
- `FORCE ROW LEVEL SECURITY` ensures the policy applies even to the table owner.
- Consequence, accepted deliberately: **every tenant-scoped read happens inside a transaction.**
  Read paths use `BEGIN READ ONLY`. The cost is roughly two extra round trips per request; against
  `NFR-001`'s 500 ms p95 for a transition and a co-located database this is single-digit
  milliseconds. It is the price of an isolation guarantee that survives a bug in our own code.

Global, non-tenant tables (`Template`, `User`) have no policy and are explicitly enumerated in one
file; adding a table to that list is a reviewed, deliberate act.

### 4. Layer three — the enumerating isolation suite (`AC-049`, `AC-050`)

Two provisioned tenants, populated. The suite **enumerates endpoints from the generated OpenAPI
document**, not from a hand-maintained list, and requests every one as a member of A using B's
identifiers. Every response must be 404 and no response body may contain any value originating in B.
Because the source is the OpenAPI document (which CI already requires to match the router — API9), a
new endpoint is covered automatically and an endpoint missing from the document fails the build.
This is what makes `AC-050` real rather than aspirational.

### 5. Storage and side channels

- **Attachments** (`AC-055`, `NFR-011`): object keys are `t/{tenantId}/{instanceId}/{objectId}`, and
  the storage credential presented per request is scoped to the `t/{tenantId}/` prefix, so the read is
  refused **at the storage layer** and not only at the API. Signed URLs are short-lived (≤ 5 min),
  single-object, and bound to the tenant prefix.
- **Webhooks** (`AC-056`): `WebhookEndpoint` takes an additive `tenantId`; the dispatcher selects
  endpoints by `tenantId` from inside `withTenant`, so a delivery to another tenant's endpoint is not
  merely improbable, it is unqueryable.
- **Redis** (`FR-045`): keys are prefixed `bpm:{tenantId}:…`. Redis holds cache and soft counters
  only and **never** a value that billing, evidence or execution correctness depends on.
- **Search, analytics, reconciliation** (`AC-057`): every aggregate query runs inside `withTenant`.
  The nightly reconciliation is the one job that iterates tenants — it does so by looping over tenant
  ids and entering `withTenant` per tenant, never by a single cross-tenant `GROUP BY`.
- **Logs**: `tenantId` and `X-Request-ID` on every log line; PII fields are on the
  `@connectsw/shared` logger's redaction list and never logged.

### 6. `NFR-019` — how this does not foreclose sovereignty

The lever is the **deployment topology**, and it works precisely *because* `tenantId` is universal:

| Topology | Who it is for | What changes |
|----------|--------------|--------------|
| **Shared** (v1) | Sandbox / Starter / Growth / Business | One deployment, one database, many `tenantId` values |
| **Dedicated** | Business with a data-residency requirement | Same image, same schema, same migrations; its own database; a small tenant set |
| **Sovereign / in-region** | The Sovereign tier; STRAT A4 | Same image, same schema; one `tenantId` in its own database in-region; tenant routing at the edge by workspace slug |

**No schema change, no query change, no code fork** — a sovereign deployment is a configuration and a
DNS decision. This is the same conclusion `credit-os` ADR-004 reached from the opposite direction
(it runs one tenant and keeps `tenantId` so it can become many); ConnectBPM runs many and keeps the
topology open so it can become one. Both work only because the column is unconditional.

A tenant's home topology is recorded on the `Tenant` row (`residency`, `deploymentRef`) so that
routing and support tooling are data-driven from day one — this costs two columns now and is
unpleasant to retrofit.

### 7. What this means for the shared packages

| Package | Position | Change required |
|---------|----------|-----------------|
| `@connectsw/auth` | **EXTEND** | `User` stays global (one identity, several workspaces — `FR-006`, `EC-20`). `Membership(tenantId, userId, roles[])` is new and is ours. `ApiKey` takes `tenantId` (an API key belongs to a workspace, not a person). |
| `@connectsw/billing` | **EXTEND** | `Subscription` re-keyed `userId → tenantId`. `UsageService` **not used** for instance metering (ADR-007). |
| `@connectsw/audit` | **EXTEND, substantially** | `AuditLog` becomes tenant-scoped; the evidence chain is a new model (ADR-008). |
| `@connectsw/webhooks` | **REUSE the code, EXTEND the schema** | `WebhookEndpoint.userId → tenantId`. The delivery service, HMAC signing, SSRF guard, circuit breaker and retry logic are used as-is. |
| `@connectsw/notifications` | **REUSE the code, EXTEND the schema** | `Notification` takes `tenantId` (a notification is about work in one workspace). |

## Consequences

### Positive
- One `timer_job` table, one `SELECT … FOR UPDATE SKIP LOCKED` poll, one migration, one connection
  pool. The engine's durability substrate (ADR-009) is only simple in this model.
- Two **independent** layers must both fail to produce a leak: an application bug is contained by RLS;
  an RLS misconfiguration is contained by the injected predicate. `NFR-008` is defended in depth.
- `AC-051` becomes literally true — the unscoped call does not compile.
- Sovereignty stays open at the cost of two columns, satisfying `NFR-019` and STRAT A4 without
  building anything for it now.

### Negative
- **Every tenant-scoped read runs in a transaction.** Extra round trips, and long-running read
  transactions can hold `xmin` back and affect vacuum if abused. Mitigation: read transactions are
  `READ ONLY`, a `statement_timeout` of 5 s applies to API transactions (30 s for jobs), and no HTTP
  handler may hold a transaction across an external call.
- Noisy neighbours are real. One tenant's 50,000-timer midnight burst shares a database with everyone
  else. Mitigations in v1: batch-size caps, per-tenant fairness in the job claim query
  (`ORDER BY due_at` with a per-tenant claim ceiling per batch), and per-tenant `statement_timeout`.
  Full resource isolation is what the Dedicated topology is for, and it is a tier, not a fix.
- RLS is invisible in tests that run as a privileged role. **The isolation suite must run as the
  application role**, and a CI check asserts that the application role has neither `BYPASSRLS` nor
  superuser. Without that check the second layer silently does nothing.
- A new tenant-scoped table added without a policy is a hole. Mitigation: a CI query compares
  `information_schema.tables` against `pg_policies` and fails on any tenant-scoped table without
  `ENABLE`+`FORCE`+a policy. This gate is required from the first migration.

### Neutral
- `User` and `Template` are deliberately global. Cross-tenant *identity* is a feature (`FR-006`);
  cross-tenant *data* is the failure. The distinction is enforced by the enumerated global-table list.

## Alternatives Considered

### Schema per tenant
- **Pros**: strong isolation with one database; a leak requires a wrong `search_path`, not a missing
  predicate; per-tenant restore is easy.
- **Cons, decisive**: the durable job substrate breaks. The timer runner's whole design is one indexed
  poll over one `job` table; with 200 schemas it becomes 200 polls per tick, or a dispatcher that
  reintroduces exactly the coordination we avoided. Add ~5,600 tables at v1 scale, a Prisma client
  that has no first-class per-schema multi-tenancy, migrations as an N-way fan-out with partial-failure
  states, and a self-serve signup that performs DDL on the request path.
- **Why rejected**: it makes `NFR-004` (50,000-timer burst, ≥99% within 60 s) hard for a benefit RLS
  already provides.

### Database per tenant
- **Pros**: the strongest isolation available; the natural shape of data residency.
- **Cons**: N connection pools; self-serve signup provisions a database; a free Sandbox tenant costs a
  database; cross-tenant operational work (reconciliation, support) becomes fan-out; and 200 databases
  at v1 scale is an operations product we are not staffed to run.
- **Why rejected as the default, retained as a tier**: this *is* the Dedicated/Sovereign topology.
  Choosing it for everyone would price the free tier out of existence.

### Shared schema with `tenantId` and application-level scoping only (no RLS)
- **Pros**: simplest; no transaction requirement on reads; the `credit-os` v1 position.
- **Cons**: a single forgotten predicate anywhere in ~28 tables and hundreds of queries is an
  existential incident. `credit-os` can accept this because one tenant exists; ConnectBPM cannot.
- **Why rejected**: K6 is a kill criterion. One layer is not defence in depth.

## References
- `FR-001`, `FR-002`, `FR-003`, `FR-006`, `FR-009`, `FR-045`, `FR-098`, `FR-112`
- `NFR-008`, `NFR-011`, `NFR-019`; `EC-20`; `AC-049`–`AC-057`; `RSK-001`; STRAT-01 K6, A4
- `credit-os` ADR-004 — the harvested pattern (ADR-003 H1)
- PostgreSQL RLS: `CREATE POLICY`, `FORCE ROW LEVEL SECURITY`, `SET LOCAL`
