# Orchestrator Quality Enhancements

## Branch
`feature/orchestrator/quality-enhancements`

## 6 Gaps Being Addressed
1. TDD Discipline — add enforcement to prompt template + split tasks
2. Code Consistency — add 7 patterns to knowledge, populate backend experience
3. Context Management — context_chain injection for agent handoffs
4. Speed/Overhead — fast track mode for trivial/simple tasks
5. Documentation Enforcement — documentation-gate.sh + checkpoint integration
6. Parallel Safety — resource conflict detection + shared_files

## Key Files Modified
- `.claude/orchestrator/orchestrator-enhanced.md` (Steps 2.5, 4.B, 4.C, 4.D, 4.F)
- `.claude/commands/orchestrator.md` (prompt template)
- `.claude/workflows/templates/new-feature-tasks.yml` (split tasks, new fields)
- `.claude/workflows/templates/new-product-tasks.yml` (new fields, doc criteria)
- `.claude/workflows/templates/bug-fix-tasks.yml` (fast_track, context_output)
- `.claude/workflows/templates/hotfix-tasks.yml` (fast_track)
- `.claude/memory/company-knowledge.json` (7 new patterns)
- `.claude/memory/agent-experiences/backend-engineer.json` (populate experience)
- `.claude/scripts/documentation-gate.sh` (NEW)
- `.claude/scripts/post-task-update.sh` (tdd_compliant param)
- `.claude/quality-gates/multi-gate-system.md` (add doc gate)

## Implementation Order
Phase 1: Template Foundation (Gap 3 + Gap 2b/2c) — context_chain, conventions ✅
Phase 2: TDD + Knowledge (Gap 1 + Gap 2a) — TDD protocol, patterns, experience ✅
Phase 3: Independent Gates (Gap 5 + Gap 6) — doc gate, parallel safety ✅
Phase 4: Speed Optimization (Gap 4) — fast track mode ✅

## Status: COMPLETE — PR #306

## Follow-up Items Identified (separate work)
1. **spec-kit slash commands** — `/speckit.*` commands don't exist as actual
   `.claude/commands/speckit-*.md` files. Templates exist but only work through
   orchestrator injection. Need to create actual command files.
2. **spec-kit consistency gating** — only 1/5 products has ever run `/speckit.analyze`.
   Need systematic enforcement.
3. **Business Analyst agent** — no BA agent exists. PM handles requirements but
   lacks dedicated BA capabilities (process modeling, stakeholder analysis,
   requirements elicitation, gap analysis).
