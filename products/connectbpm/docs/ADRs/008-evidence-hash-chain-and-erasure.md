# ADR-008: The Evidence Record — RFC 8785 Hash Chain, and Erasure That Keeps It Verifiable

**Product**: ConnectBPM · **Task**: ARCH-01 · **Date**: 2026-08-20
**Author**: Architect, ConnectSW

## Status

Accepted.

## Context

DEC-001 makes the evidence record a **day-one architectural commitment, not a feature**: every
instance emits an immutable, version-pinned, exportable evidence record by default, on every tier
including the free Sandbox (`FR-086`, `AC-035`), and it cannot be disabled by any tenant, role or
configuration — no such control exists in the API, the UI or the schema (`FR-100`, `AC-036`).

Two acceptance criteria set the bar that ordinary audit logging does not clear:

- **`AC-041`**: an export must verify when an **independent script that imports no application code**
  recomputes the hash chain from the exported material alone. This is the operational form of
  *"verifiable by someone who does not trust us"* — STRAT A9, the assumption the whole compliance
  wedge rests on.
- **`AC-046`**: after a personal-data erasure, the payloads are irreversibly gone, the entries remain
  as tombstones naming what was removed by whom under which policy, **and the hash chain still
  verifies end to end**.

Those two look contradictory. Resolving them is the substance of this ADR.

## Decision

### 1. Canonicalisation: RFC 8785 (JSON Canonicalization Scheme)

"Recompute the hash" is meaningless without a byte-exact serialisation rule. We adopt **RFC 8785
(JCS)**: lexicographic key ordering by UTF-16 code unit, no insignificant whitespace, ECMAScript
number serialisation, UTF-8 output. It is chosen precisely because it is a published specification an
independent verifier can implement in any language in an afternoon — which is what `AC-041` is really
asking for. A bespoke canonicalisation would make the export verifiable only by us, which is the
opposite of the point.

### 2. The chain commits to the payload **hash**, not the payload

```
payloadHash = SHA-256( JCS(payload) )

entryHash   = SHA-256( prevHash ‖ tenantId ‖ instanceId ‖ seq ‖ eventType
                     ‖ occurredAtUtc(RFC 3339, µs) ‖ actorId ‖ actorRole
                     ‖ definitionVersionId ‖ payloadHash )

seq = 1 : prevHash = SHA-256("connectbpm.evidence.v1" ‖ tenantId ‖ instanceId)   // genesis
```

**This one decision is what makes erasure and verifiability compatible.** Because the chain commits
to `payloadHash` rather than to `payload`, the payload can be destroyed while `payloadHash` and
`entryHash` remain — and the chain still verifies end to end, exactly as `AC-046` requires.
`‖` is length-prefixed concatenation of UTF-8 bytes, so no field boundary is ambiguous.

Both `payloadHash` and `entryHash` are stored; `prevHash` is stored denormalised so verification is a
single ordered scan with no self-join.

### 3. Sequence numbers: monotonic, gap-free, allocated inside the transaction

`AC-038` requires a per-instance sequence "strictly monotonic with no gaps". A PostgreSQL sequence
cannot deliver that — sequence values are consumed by rolled-back transactions. Instead:

```sql
UPDATE process_instance SET evidence_seq = evidence_seq + 1 WHERE id = $1 RETURNING evidence_seq;
```

inside the transition transaction. A rollback returns the counter with it, so a gap is impossible; the
row lock also serialises evidence writes per instance, which is what "strictly monotonic" means. This
is the same transaction that moves the token and writes the meter (ADR-007) — one transaction, three
guarantees.

### 4. Append-only, enforced twice

- **In code**: the evidence recorder exposes `append()` and nothing else; no `update` or `delete`
  method exists to be called.
- **In the database**: a `BEFORE UPDATE OR DELETE` trigger on `evidence_entry` raises an exception,
  except for the single erasure path, which is a `SECURITY DEFINER` function that may null payload
  columns and **may not touch** `seq`, `payloadHash`, `prevHash`, `entryHash`, `eventType`,
  `occurredAtUtc`, `actorId` or `definitionVersionId`.
- A refused attempt is **itself recorded as an evidence entry** (`FR-089`, `AC-039`).

### 5. The sixteen event classes (`FR-087`, `AC-037`)

`eventType` is a closed TypeScript union, and a CI test asserts that every member has at least one
producing call site and at least one test:

`instance.started` · `instance.suspended` · `instance.resumed` · `instance.cancelled` ·
`instance.terminal` · `token.moved` · `task.created` · `task.assigned` · `task.reassigned` ·
`task.claimed` · `task.completed` · `task.withdrawn` · `decision.evaluated` · `timer.fired` ·
`timer.discarded_stale` · `form.data_delta` · `quota.start_refused` · `definition.published` ·
`evidence.exported` · `evidence.mutation_refused` · `erasure.applied` · `staff.access`

(The list exceeds sixteen because `FR-087`'s classes decompose; the requirement is coverage of all
sixteen classes, which this satisfies with room.)

### 6. Actor identity, including the actor v1 never has (DEC-005 / CLR-B)

`FR-088` requires actor identity and the actor's role **at the time of the action**. Roles change, so
`actorRole` is denormalised onto the entry and never joined at read time.

DEC-005 defers external participants to Phase 2 but requires that the evidence model **not foreclose**
a non-member actor. The entry therefore carries a **polymorphic actor**, populated in v1 only by the
`MEMBER` and `SYSTEM` variants:

```
actorKind    : MEMBER | SYSTEM | SCHEDULE | SUPPORT | EXTERNAL_PARTY   // EXTERNAL_PARTY unused in v1
actorId      : uuid?            // membership id for MEMBER; null for SYSTEM
actorRole    : string           // role at the time of the action
actorRef     : jsonb?           // Phase 2: signed-link subject, verified email, identity assertion
actorLocale  : string           // EC-12: the actor's locale at the time
```

`EXTERNAL_PARTY` exists in the enum and in the export schema from day one and is never written in v1.
This is the cheap half of an expensive retrofit: adding a variant to a closed enum after 100 million
rows exist, and after exports have shipped with a fixed schema, is the case DEC-005 warned about.

### 7. Export and independent verification (`FR-092`–`FR-095`)

A JSON export is a self-describing object:

```jsonc
{
  "connectbpmEvidenceExport": "1.0",
  "algorithm": { "hash": "SHA-256", "canonicalisation": "RFC 8785 (JCS)",
                 "genesis": "SHA-256(\"connectbpm.evidence.v1\" || tenantId || instanceId)",
                 "entryPreimage": "prevHash||tenantId||instanceId||seq||eventType||occurredAtUtc||actorId||actorRole||definitionVersionId||payloadHash" },
  "tenant": { "id": "…", "name": "…", "timezone": "…" },
  "filters": { … },                       // FR-094: exactly what was asked for
  "versionsCovered": [ { "definitionId": "…", "version": 1, "checksum": "…" }, … ],  // FR-093 / AC-042
  "retentionGaps": [ { "from": "2026-01-01", "to": "2026-03-31",
                       "policy": "evidenceRetentionDays=90", "deletedAt": "2026-04-01" } ], // FR-095 / AC-045
  "instances": [ { "instanceId": "…", "definitionVersionId": "…",
                   "entries": [ { "seq": 1, "eventType": "…", "payload": { … },
                                  "payloadHash": "…", "prevHash": "…", "entryHash": "…",
                                  "erased": false }, … ] } ],
  "generatedAt": "…", "requestedBy": "…", "artifactHash": "…"
}
```

The verifier's whole algorithm: for each instance, recompute genesis, then for each entry recompute
`payloadHash` from `payload` (skipping entries marked `erased`, whose `payloadHash` is trusted as
given and is what the chain commits to), recompute `entryHash`, compare, and report the **first**
divergent `seq` (`FR-091`, `AC-040`). A reference verifier in ~60 lines of dependency-free Node ships
in the repository under `tools/verify-evidence/` **and is executed in CI against a generated export**,
importing no application code — that is the literal test `AC-041` describes.

CSV export (`FR-092`) is the flat entry list with the same columns; the JSON form is the verifiable
artefact and the CSV states so in a header comment.

### 8. Erasure (`FR-097`, `AC-046`) and retention (`FR-096`, `AC-024`, `AC-045`)

Erasure sets `payload = null`, `payloadErasedAt`, `payloadErasedBy`, `payloadErasurePolicy`, and
`payloadFieldsRemoved: string[]` (machine keys only — never values), then **appends** an
`erasure.applied` entry naming what was removed, by whom and under which policy. Because the chain
committed to `payloadHash`, verification is unaffected. Instance variables and attachments referenced
by the erased fields are destroyed in the same transaction.

Retention deletes payloads by policy on a schedule, not by hiding rows in the UI (`FR-096`). Usage
events survive retention (ADR-007), and an export spanning a deleted period is produced **with the
gap stated** — a silently short export is a defect (`AC-045`).

### 9. Locale independence (`FR-149`, `EC-12`, `AC-066`)

Payloads store the **stable machine key** for every form field alongside the stored value; display
labels are resolved at render/export time from the pinned form schema in the requested locale. Stored
values are byte-identical across locales, which is what makes the hash stable and the export
comparable.

### 10. Relationship to `@connectsw/audit`

`@connectsw/audit`'s `AuditLog` is a standalone, user-scoped, unrelated, unsequenced, unhashed table
(verified: `packages/audit/src/prisma/audit.prisma`). It is **kept, extended with `tenantId`, and used
for platform/administrative audit** — sign-ins, role changes, plan changes, staff access (`FR-009`,
`AC-054`). It is **not** the evidence chain. Two records with different guarantees, deliberately: the
evidence chain is per-instance, hash-linked, exportable and immutable; the audit log is per-tenant,
administrative and queryable.

## Consequences

### Positive
- Erasure and verifiability coexist, from one design choice (commit to the hash, not the payload).
- The verification algorithm is publishable, which is the actual product claim behind the wedge.
- Gap-free sequencing falls out of the same transaction as the token move and the meter — one
  transaction, three guarantees, one reconciliation.
- The `EXTERNAL_PARTY` slot makes the Phase 2 signed-link participant an additive change.

### Negative
- **Chained hashes serialise evidence writes per instance.** Two concurrent transitions on the same
  instance (legal after an E4 Split) contend on the instance row. Accepted: instances are small
  concurrency domains, contention is per-instance not per-tenant, and the alternative — a per-instance
  Merkle tree with unordered leaves — trades a simple verifier for a complex one, and the verifier's
  simplicity is the point.
- Storage: one row per state change per instance, ~30–80 entries for a typical instance. At `NFR-014`
  scale that is ~5M rows/month. `evidence_entry` is therefore range-partitioned by month from day one
  — cheap now, painful to retrofit — with retention dropping whole partitions where policy allows.
- The reference verifier is a public artefact and a compatibility commitment: the preimage format is
  frozen at `connectbpmEvidenceExport 1.0`, and any change is a new export version that verifies old
  exports too.

### Neutral
- No external timestamping authority, no blockchain anchoring in v1. The chain proves internal
  consistency and detects tampering after the fact; it does not prove to a hostile third party that we
  did not rewrite the whole chain. If a design partner requires that, the additive answer is publishing
  periodic chain-head digests to an external notary — a Phase 2 addition that needs no schema change,
  recorded here so it is not built early.

## References
- DEC-001 (evidence as a day-one commitment), DEC-005 / CLR-B (non-member actor slot)
- `FR-086`–`FR-100`, `FR-149`; `NFR-007`; `EC-12`, `EC-14`, `EC-18`; `AC-035`–`AC-048`, `AC-066`
- STRAT-01 A9 ("GCC auditors accept engine-produced evidence" — unvalidated, K0)
- RFC 8785 (JSON Canonicalization Scheme); `packages/audit/src/prisma/audit.prisma` (verified)
