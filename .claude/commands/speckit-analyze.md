---
description: Validate consistency across specification, plan, and task list (quality gate)
---

# /speckit.analyze

Validate specification-plan-tasks consistency as a mandatory quality gate before CEO checkpoints.

## Setup

1. Read the spec-kit constitution: `.specify/memory/constitution.md`
2. Read the analyze command template: `.specify/templates/commands/analyze.md`
3. Read the specification: `products/{PRODUCT}/docs/specs/{FEATURE_ID}.md` (or all specs)
4. Read the implementation plan: `products/{PRODUCT}/docs/plan.md`
5. Read the task list: `products/{PRODUCT}/docs/tasks.md`
6. Read the PRD: `products/{PRODUCT}/docs/PRD.md`

## Your Role

You are the **QA Engineer** executing this command. Follow the analyze command template exactly.

## Input

$ARGUMENTS

## Execution

1. Parse the input to identify the product and documents to analyze.
2. Follow the analyze command template (`.specify/templates/commands/analyze.md`) step by step.
3. Perform these consistency checks:

### Spec-to-Plan Alignment
- Every US-XX in the spec has a corresponding section in the plan
- Every FR-XXX in the spec is addressed by at least one plan task
- No plan tasks exist without a spec requirement (orphan tasks)

### Plan-to-Tasks Alignment
- Every plan section maps to at least one task in the task list
- Task dependencies are valid (no circular deps, no missing deps)
- Agent assignments match the task type (backend tasks → backend-engineer, etc.)

### Requirement Coverage
- Every acceptance criterion (AC-X) has at least one test task
- Coverage percentage: (covered criteria / total criteria) * 100
- Target: >= 90% coverage

### Traceability Chain
- BN-XXX (business needs) → US-XX (user stories) → FR-XXX (requirements) → Tasks → Tests
- No broken links in the chain
- No orphaned requirements (defined but never implemented)

### Constitution Compliance
- Article I: Spec exists before implementation
- Article III: TDD ordering in tasks (tests before impl)
- Article VI: Traceability IDs present
- Article IX: Diagrams present in docs

4. Generate the consistency report at: `products/{PRODUCT}/docs/quality-reports/spec-consistency.md`

## Report Format

```markdown
# Spec Consistency Report: {PRODUCT}

**Date**: {TIMESTAMP}
**Analyzer**: QA Engineer (speckit.analyze)
**Overall**: PASS | FAIL

## Summary
| Check | Status | Score |
|-------|--------|-------|
| Spec-to-Plan Alignment | PASS/FAIL | X/Y requirements covered |
| Plan-to-Tasks Alignment | PASS/FAIL | X/Y tasks traced |
| Requirement Coverage | PASS/FAIL | XX% |
| Traceability Chain | PASS/FAIL | X broken links |
| Constitution Compliance | PASS/FAIL | X/11 articles checked |

## Detailed Findings
[Per-check details with specific IDs that fail]

## Traceability Matrix
| US-XX | FR-XXX | Plan Section | Task ID | Test Task | Status |
|-------|--------|-------------|---------|-----------|--------|

## Recommendations
[Ordered list of fixes needed to achieve PASS]
```

## Gate Rules

- **PASS**: All checks pass, coverage >= 90%, no broken traceability links
- **FAIL**: Any check fails — report must include specific fix instructions
- This gate is MANDATORY before any CEO checkpoint (Constitution Article X)
- The orchestrator MUST NOT proceed to checkpoint if this gate reports FAIL

## Next Steps

After analysis is complete:
- If PASS → orchestrator proceeds to CEO checkpoint
- If FAIL → route fixes to appropriate agents, then re-run `/speckit.analyze`
