# Product Registry

**Purpose**: the single source of truth for what this company builds — tier,
stack, ports, CI and docs. The Orchestrator reads this file before routing any
work; a product that is not here does not exist as far as the agents are
concerned.

## Maturity tiers

| Tier | Meaning |
|------|---------|
| **Concept** | Idea documented, no production code yet |
| **Prototype** | Code exists, not feature-complete or production-viable |
| **Development** | Active development, feature-incomplete |
| **Active** | Feature-complete, production-ready, maintained |
| **Archived** | Deprecated, no longer maintained |
| **Demo** | Reference implementation shipped with the framework |

## Roster

### `taskflow`

| Field | Value |
|-------|-------|
| **Description** | Task tracker — the worked example that ships with the agent system |
| **Tier** | Demo |
| **Stack** | Fastify 5 + Next.js 14 + PostgreSQL 16 + Prisma 6 |
| **Frontend** | 3100 |
| **Backend** | 5000 |
| **CI** | `.github/workflows/taskflow-ci.yml` |
| **PRD** | `products/taskflow/docs/PRD.md` |
| **Specs** | `products/taskflow/docs/specs/001-task-crud/spec.md` |
| **Has Backend** | Yes |
| **Has Mobile** | No |
| **Notes** | Read this before building your first product — it is the shape every other product is expected to take |

<!-- Add your products below. Keep the table shape identical: the dashboard and
     several scripts parse these fields. -->

## Adding a product

1. `/orchestrator New product: <what it does>` — the Orchestrator runs the full
   pipeline (BA → spec → clarify → PRD → architecture → plan → tasks).
2. Claim ports in `.claude/PORT-REGISTRY.md`.
3. Add the row above with tier `Concept` and move it up as the product matures.
4. Copy `.github/workflows/taskflow-ci.yml` as the starting CI for the product.

## Portfolio view

```bash
.claude/scripts/generate-dashboard.sh     # roll-up across every registered product
```
