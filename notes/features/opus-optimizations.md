# Opus 4.6 Optimizations - Feature Notes

## Branch
`feature/orchestrator/opus-optimizations`

## Summary
Three high-impact improvements to the orchestrator system for Opus 4.6:

1. **Parallel Sub-Agent Spawning** — Task tool with `run_in_background: true`
2. **Compact Agent Briefs** — 50-80 line briefs inlined into prompts
3. **Pre-Filtered Memory Injection** — Orchestrator reads memory once, injects relevant patterns

## Changes Made

### Phase 1: Compact Agent Briefs
- Created `.claude/agents/briefs/` directory with 14 briefs
- Each brief: 43-65 lines (all under 100)
- Briefs cover: backend-engineer, frontend-engineer, qa-engineer, architect, code-reviewer, devops-engineer, product-manager, security-engineer, product-strategist, technical-writer, support-engineer, innovation-specialist, ui-ux-designer, mobile-engineer
- Original agent files preserved in `.claude/agents/` as deep-dive reference

### Phase 2: Orchestrator Rewrite
- **orchestrator-enhanced.md**:
  - Added Step 3.5: Load & Index Memory (pre-filtering by agent role/category)
  - Rewrote Step 4: PARALLEL-AWARE execution with Strategy A/B/C
  - New compact sub-agent prompt template (inline brief + pre-filtered patterns)
  - Updated Agent Memory Integration section
  - Added `3b. Compact Agent Briefs` to Available Systems
- **orchestrator.md** (command file):
  - Replaced old 5-file-read prompt template with compact Opus 4.6 version
  - Updated parallel execution section with Strategy A (Task tool) as primary
- **parallel-execution.md**:
  - Task tool with `run_in_background` as Strategy A (PRIMARY)
  - Sequential as Strategy B (FALLBACK)
  - Git worktrees as Strategy C (RARE)
  - Added Decision Matrix for strategy selection

## Context Savings Estimate
- Old prompt: ~300-700 lines of agent file + 200 lines company-knowledge.json = ~500-900 lines per sub-agent
- New prompt: ~50-80 line brief + 10-20 lines pre-filtered patterns = ~60-100 lines per sub-agent
- **~80% reduction in context consumed per sub-agent spawn**

## Verification Checklist
- [x] All 14 briefs exist in `.claude/agents/briefs/`
- [x] All briefs under 100 lines
- [x] orchestrator-enhanced.md contains Step 3.5, updated Step 4, new prompt template
- [x] orchestrator.md references compact prompt template
- [x] parallel-execution.md documents Task tool as primary strategy
- [x] Original agent files in `.claude/agents/` preserved (not deleted)
