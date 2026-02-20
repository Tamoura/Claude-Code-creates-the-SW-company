---
description: Validate consistency across spec, plan, and tasks. Non-destructive audit that identifies gaps, ambiguities, and constitution violations.
agent: QA Engineer
triggers:
  - Before any CEO checkpoint
  - After task generation
  - As part of quality gates
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

This is a **read-only consistency audit**. It validates alignment across specification artifacts without modifying any files. It serves as a "Specification Consistency Gate" in the ConnectSW quality gate system.

### Execution Steps

1. **Locate artifacts** for the product:
   - `products/[product]/docs/specs/[feature-name].md` (specification)
   - `products/[product]/docs/plan.md` (implementation plan)
   - `products/[product]/docs/tasks.md` (task list)
   - `products/[product]/docs/data-model.md` (data model, optional)
   - `products/[product]/docs/contracts/` (API contracts, optional)
   - `.specify/memory/constitution.md` (constitution)
   - `.claude/COMPONENT-REGISTRY.md` (component registry)

2. **Build semantic models** from each artifact:
   - Requirements inventory (from spec)
   - Task coverage map (from tasks)
   - Constitution rules (from constitution)

3. **Run six detection passes**:

   | Pass | What It Checks |
   |------|---------------|
   | **Duplication** | Same requirement addressed by multiple non-complementary tasks |
   | **Ambiguity** | Vague terms ("robust", "intuitive"), missing quantification |
   | **Underspecification** | Requirements without acceptance criteria or tests |
   | **Constitution Alignment** | Violations of ConnectSW principles (TDD, reuse, TypeScript, etc.) |
   | **Coverage Gaps** | Spec requirements with no corresponding tasks or tests |
   | **Inconsistency** | Conflicts between spec, plan, and tasks (e.g., different entity names) |

4. **Assign severity** to each finding:
   - **CRITICAL**: Missing requirement coverage, constitution violation, spec-plan conflict
   - **HIGH**: Ambiguous acceptance criteria, missing test for requirement
   - **MEDIUM**: Terminology inconsistency, minor coverage gap
   - **LOW**: Style issues, documentation gaps

5. **Produce report** (Markdown format):

   ```markdown
   ## Specification Consistency Report

   **Product**: [product]
   **Date**: [date]
   **Status**: PASS / FAIL (FAIL if any CRITICAL findings)

   ### Findings

   | # | Severity | Category | Finding | Affected Artifacts |
   |---|----------|----------|---------|-------------------|
   | 1 | CRITICAL | Coverage Gap | FR-003 has no corresponding task | spec.md, tasks.md |
   | 2 | HIGH | Constitution | TDD order violated: T023 (impl) before T020 (test) | tasks.md |

   ### Coverage Summary

   | Spec Requirement | Plan Reference | Task(s) | Test(s) | Status |
   |-----------------|---------------|---------|---------|--------|
   | FR-001 | Phase 1 Design | T023 | T020 | Covered |
   | FR-002 | Phase 1 Design | T024 | T021 | Covered |
   | FR-003 | Not found | None | None | GAP |

   ### Constitution Alignment

   | Article | Requirement | Status |
   |---------|------------|--------|
   | I. Spec-First | Spec exists | PASS |
   | II. Component Reuse | Registry checked | PASS |
   | III. TDD | Tests before impl | FAIL (T023 before T020) |

   ### Metrics
   - Requirements: X total, Y covered, Z gaps
   - Tasks: X total, Y mapped to requirements, Z orphan
   - Constitution compliance: X/10 articles satisfied
   ```

6. **Suggest next actions** based on findings:
   - If CRITICAL: "Fix these issues before proceeding to implementation"
   - If HIGH only: "Recommended fixes before implementation"
   - If MEDIUM/LOW only: "Minor improvements, safe to proceed"
   - If clean: "All artifacts consistent. Ready for implementation."

7. **Write report** to `products/[product]/docs/quality-reports/spec-consistency-[date].md`

### ConnectSW Quality Gate Integration

This command serves as **Gate 0.5: Specification Consistency Gate** in the multi-gate system:

```
Spec → /speckit.analyze → Browser Gate → Security Gate → Performance Gate → Testing Gate → Production Gate → CEO
```

- Runs BEFORE browser-first gate (catches specification issues before code exists)
- Runs AFTER task generation (validates the full spec→plan→tasks chain)
- Required before any CEO checkpoint (mandatory in orchestrator workflow)
- Non-destructive: reads only, suggests fixes but doesn't modify files
- Findings feed into the QA Engineer's testing gate report
