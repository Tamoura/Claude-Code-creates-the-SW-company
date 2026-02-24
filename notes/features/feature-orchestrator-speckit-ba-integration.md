# Spec-Kit Integration + Business Analyst Agent

## Branch
`feature/orchestrator/speckit-ba-integration`

## Context
Follow-up to PR #306 (quality enhancements). Three gaps identified:
1. Spec-kit 70% implemented — templates exist but orchestrator never invokes them
2. No Business Analyst agent — PM handles requirements without dedicated BA capabilities
3. Quality enforcement — spec consistency gate was aspirational, now mandatory

## Changes Made

### Phase 1: BA Agent (2 new files)
- `.claude/agents/business-analyst.md` — Full agent definition (~260 lines)
- `.claude/agents/briefs/business-analyst.md` — Compact brief (~55 lines)

### Phase 2: Spec-Kit Slash Commands (5 new files)
- `.claude/commands/speckit-specify.md` — Wraps specify template
- `.claude/commands/speckit-clarify.md` — Wraps clarify template
- `.claude/commands/speckit-plan.md` — Wraps plan template
- `.claude/commands/speckit-tasks.md` — Wraps tasks template
- `.claude/commands/speckit-analyze.md` — Wraps analyze template

### Phase 3: Task Graph Templates (2 modified files)
- `new-product-tasks.yml` v3.0.0 — Added BA-01, SPEC-01, CLARIFY-01, ANALYZE-01
- `new-feature-tasks.yml` v3.0.0 — Added SPEC-{ID}, ANALYZE-{ID}

### Phase 4: Orchestrator + Governance (5 modified files)
- `orchestrator-enhanced.md` — Agent routing table, spec-kit mandatory note, Gate 0
- `orchestrator.md` command — BA agent row, spec-kit commands table
- `.claude/CLAUDE.md` (both copies) — BA in hierarchy, updated workflow
- `constitution.md` v1.2.0 — Article I requires BA analysis for new products

## New Quality Pipeline

### New Products
```
CEO Brief → BA-01 → SPEC-01 → CLARIFY-01 → PRD-01 → ARCH-01
→ [DEVOPS-01 || BACKEND-01 || FRONTEND-01] → QA-01 → QA-02 → DOCS-01
→ ANALYZE-01 → CHECKPOINT-FOUNDATION
```

### New Features
```
CEO Brief → SPEC-{ID} → DESIGN-{ID}
→ [BACKEND-TESTS || FRONTEND-TESTS] → [BACKEND-IMPL || FRONTEND-IMPL]
→ QA-{ID} → DOCS-{ID} → GATE-TESTING-{ID} → ANALYZE-{ID} → CHECKPOINT
```
