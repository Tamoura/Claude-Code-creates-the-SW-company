# CEO Brief — ConnectBPM

**Date**: 2026-08-20
**From**: CEO
**To**: Orchestrator
**Workflow**: new-product
**Product**: `connectbpm`

## Verbatim Brief

> "create new product for BPM suite to sell to customers to be able to create their workflows, use orchestrator"

## Orchestrator Interpretation

| Aspect | Interpretation |
|--------|----------------|
| Product type | Commercial multi-tenant SaaS — sold to external customers, not an internal tool |
| Customer | Companies that buy the platform |
| End users | Our customers' staff: process designers, task performers, process owners, IT admins |
| Core promise | Customers create, run, and monitor **their own** workflows without engineering help |
| Capability pillars | Visual process designer · workflow engine · forms · task inbox · process analytics |

## Scope of This Engagement

Inception phase only — CEO brief through architecture:

| Task | Agent | Deliverable |
|------|-------|-------------|
| BA-01 | Business Analyst | `docs/business-analysis.md` |
| STRAT-01 | Product Strategist | `docs/strategy/OPPORTUNITY-connectbpm.md` |
| SPEC-01 | Product Manager | `docs/specs/connectbpm-foundation.md` |
| CLARIFY-01 | Product Manager | Ambiguities resolved in the spec |
| PRD-01 | Product Manager | `docs/PRD.md` — **CEO checkpoint** |
| ARCH-01 | Architect | `docs/architecture.md` + ADRs — **CEO checkpoint** |

Implementation (foundation build) is a separate, later engagement gated on CEO approval of the architecture.

## Allocated Resources

| Resource | Value |
|----------|-------|
| Product slug | `connectbpm` |
| Web port | 3123 |
| API port | 5018 |
| Branch | `claude/bpm-workflow-product-9p2fxy` |

## Key Decisions Deferred to Specialists

1. Process notation — BPMN 2.0 compliance vs. simplified proprietary model (BA-01 recommends, ARCH-01 decides)
2. Engine — adopt existing vs. build token-based executor on Postgres (ARCH-01, ADR)
3. Differentiation wedge — AI-native authoring vs. Arabic/MENA-first vs. vertical (STRAT-01 recommends, CEO approves)
4. Pricing metric — determines what the engine must meter (STRAT-01 recommends, PRD-01 codifies as a requirement)
5. MVP boundary — which of the five pillars ship complete in v1 (BA-01 + STRAT-01 recommend, CEO approves at PRD checkpoint)
