# BA-01 — Business Analyst Deliverable Pointer

**Full report**: [`products/connectbpm/docs/business-analysis.md`](../../docs/business-analysis.md) (1,082 lines)
**Research notes**: `products/connectbpm/.claude/scratch/BA-01-research-notes.md`
**Status**: success | **Date**: 2026-08-20

## Executive Summary (20 lines)

The BPM market is USD 17.5–26.7B in 2026 at 9–18% CAGR and is barbelled: USD 20/month trigger
automation (Zapier, n8n, Power Automate) that cannot hold long-running human work, versus
USD 400K+/year enterprise suites (Pega, Appian, Nintex) taking 12–18 months to value. The
compliance-touched mid-market sits in that gap on email and spreadsheets.

**Wedge (Q1)**: audit-grade, human-in-the-loop process execution — every instance emits an
immutable, version-pinned, exportable evidence record by default. Expensive for a stateless
competitor to retrofit; cheap for us (`@connectsw/audit`, PATTERN-014).
**Buyer (Q2)**: the operations leader at a 100–2,000 employee company. IT is a veto-holding
gatekeeper, not the buyer. Motion is product-led self-serve; KPI-C8 (sales-touch ≤ 20%) falsifies it.
**Notation (Q3)**: no BPMN authoring in MVP — it repels the non-technical buyer. Build the engine
on a strict *subset of BPMN execution semantics* (6 elements) so BPMN interchange is a Phase-2
mapping layer, not a re-architecture.
**Segment (Q4)**: mid-market, compliance-touched verticals. SME is the fastest-growing BPM segment
and fails implementations at 22% vs enterprise 38%. Enterprise is out of scope for v1.
**Pricing (Q5)**: tiered, metered on *process instances started* + named designer seats. Task
performers free (BR-009). Seven hard engine metering requirements (M-1 to M-7) follow.
**MVP (Q6)**: three complete pillars — designer, engine, forms+inbox as one — plus the audit trail.
Analytics minimal (4 numbers). **No customer script execution in v1** (BR-005), which removes
RSK-002 from the critical path.

**Critical finding**: `packages/` contains **zero tenancy** — no Tenant/Organization model, no
`tenantId` anywhere, and `@connectsw/billing` keys Subscription to a User with a non-transactional
Redis usage counter. Tenancy is a BUILD (G-08, 3 sprints) and gates everything; auth/billing/audit
reuse is PARTIAL, not full. Engine metering needs a DB-transactional replay-safe meter (G-10).

**Recommendation: GO** at the Q6 MVP boundary. ~32 sprint-units P0, 16-week calendar baseline.
Conditions: validate ASM-003 (the wedge) before messaging freezes; ship tenancy before any pillar.

## Verification evidence
- All 5 Mermaid diagrams parsed with the real `mermaid.parse()` (mindmap, 2 flowcharts, 2 quadrantCharts) — 5/5 PASS.
- Ambiguous-language grep (`should|might|could|maybe|possibly|perhaps`) — 0 matches.
- IDs: 20 BN, 10 BR, 8 ASM, 10 RSK, 24 G-, 24 KPI, 34 US, 7 M- ; 8 competitors; all 6 questions answered.
