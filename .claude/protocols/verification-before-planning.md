# Verification-Before-Planning Protocol

**Purpose**: Prevent agents from planning, specifying, or creating tasks for features already implemented in the codebase. Every plan item and task MUST be verified as not-yet-implemented before being included.

---

## The Core Problem

Agents plan based on specifications and requirements documents without checking what already exists in the code. Common failure modes:

- "The spec says we need structured logging" → but structured logging is already implemented
- "Add CI/CD pipeline" → but GitHub Actions workflows already exist
- "Implement rate limiting" → but @fastify/rate-limit is already configured
- "Add correlation IDs to requests" → but the correlation-id plugin is already registered

These phantom tasks waste agent execution time, inflate estimates, and exhaust CEO attention reviewing work that was never needed.

---

## When This Protocol Applies

| Workflow Stage | Required? | Rationale |
|---|---|---|
| `/speckit.plan` | YES | Plans list capabilities to build |
| `/speckit.tasks` | YES | Tasks allocate agent time |
| Orchestrator Step 2.7 | YES | Before task graph instantiation |
| `/speckit.specify` | NO | Specs define what, not implementation status |
| Trivial tasks (typo, config) | NO | Progressive disclosure: skip for Trivial |
| Greenfield products | NO | Nothing exists yet to check |

---

## The Five-Step Verification Gate

Before including ANY capability, feature, or requirement as a plan item or task, agents MUST complete these steps.

### Step 1: Inventory Planned Capabilities

List every distinct capability the plan or task list intends to create or implement.

```
INVENTORY: What capabilities does this plan/task list propose?

For each item, state:
- Capability name (e.g., "structured logging", "rate limiting", "CSRF protection")
- Which spec requirement drives it (e.g., FR-003, NFR-002)
- Expected location (e.g., "API middleware", "Fastify plugin", "React hook")
```

### Step 2: Query the Codebase

For EACH capability in the inventory, run at least one verification query. Use the most specific tool available.

```
QUERY: For each capability, run at least one of:

1. GitNexus (preferred — when index exists):
   gitnexus_query({ query: "<capability name>" })
   gitnexus_cypher({ query: "MATCH (f:Function) WHERE f.name CONTAINS '<keyword>' RETURN f.name, f.filePath" })

2. Grep (always available):
   Grep for implementation markers: function names, class names, route paths, plugin registrations

3. File system (for infrastructure):
   Check for config files: .github/workflows/, Dockerfile, prisma/schema.prisma, etc.

Record what you found for each capability.
```

### Step 3: Classify Each Capability

Based on query results, classify each capability:

| Status | Meaning | Action |
|--------|---------|--------|
| `NOT_IMPLEMENTED` | No code found | Include in plan/tasks |
| `PARTIALLY_IMPLEMENTED` | Some code exists, gaps remain | Plan ONLY the gaps — cite what exists |
| `FULLY_IMPLEMENTED` | Working code with tests | EXCLUDE from plan/tasks |
| `NEEDS_UPGRADE` | Exists but outdated/inadequate | Plan upgrade — cite current state |

### Step 4: Produce the Implementation Audit

Document findings in a structured table. This table MUST appear in the plan output.

```markdown
## Implementation Audit

| # | Capability | Spec Req | Status | Evidence | Action |
|---|-----------|----------|--------|----------|--------|
| 1 | Structured logging | NFR-002 | FULLY_IMPLEMENTED | src/plugins/logger.ts — Pino with JSON, request context | EXCLUDE |
| 2 | Rate limiting | NFR-005 | FULLY_IMPLEMENTED | src/plugins/rate-limit.ts — @fastify/rate-limit configured | EXCLUDE |
| 3 | CSRF protection | NFR-007 | NOT_IMPLEMENTED | No CSRF middleware found | INCLUDE |
| 4 | Webhook retry | FR-012 | PARTIALLY_IMPLEMENTED | Delivery exists in services/webhook-delivery.service.ts but no DLQ | INCLUDE (DLQ only) |
```

### Step 5: Proceed with Verified Scope

Only capabilities classified as NOT_IMPLEMENTED, PARTIALLY_IMPLEMENTED (gaps only), or NEEDS_UPGRADE may proceed into the plan or task list.

```
VERIFIED SCOPE: X of Y capabilities pass through to planning.
- Excluded (already implemented): [list]
- Included (new work needed): [list]
- Reduced scope (gaps only): [list]
```

---

## Integration with Progressive Disclosure

| Task Complexity | Verification Depth |
|---|---|
| Trivial | SKIP — no planning involved |
| Simple | Grep-only check for the single capability |
| Standard | GitNexus query + Grep for all capabilities |
| Complex | Full 5-step gate with GitNexus + Cypher + file system scan |

---

## Enforcement

The orchestrator MUST reject plans or task lists that lack an Implementation Audit table. The `/speckit.analyze` command includes an "Already Implemented" detection pass that flags plan items with no corresponding audit evidence.

If an agent is unsure whether something is implemented: check. The cost of a false positive (checking something that is genuinely new) is seconds. The cost of a false negative (planning work that already exists) is hours.
