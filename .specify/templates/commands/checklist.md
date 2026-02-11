---
description: Generate a quality checklist that validates whether requirements are complete, clear, consistent, and testable. Tests specification quality, NOT implementation.
agent: QA Engineer
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

Generate a requirements-quality checklist for a feature specification. Checklists are "unit tests for requirement writing quality" — they verify the spec itself, not code.

### Execution Steps

1. **Load context**:
   - Read feature spec: `products/[product]/docs/specs/[feature-name].md`
   - Read plan (if exists): `products/[product]/docs/plan.md`
   - Read tasks (if exists): `products/[product]/docs/tasks.md`
   - Read `.specify/templates/checklist-template.md` for structure
   - Read `.specify/memory/constitution.md` for compliance items

2. **Generate checklist items** organized by quality dimensions:
   - **Completeness**: Are all required sections filled? All personas defined? All routes listed?
   - **Clarity**: Are acceptance criteria testable? Terminology consistent? No vague adjectives?
   - **Consistency**: Do user stories align with requirements? Do entities match data model?
   - **Measurability**: Are success criteria quantified? Are NFRs specific?
   - **Coverage**: Are edge cases documented? Error scenarios covered?
   - **ConnectSW Compliance**: Port registry, component reuse, stack compliance, git conventions

3. **Item format**:
   - `- [ ] CHK[NNN] Are [requirement aspect] defined/specified for [scenario]? [Traceability tag]`
   - Traceability tags: `[Spec §X.Y]`, `[Gap]`, `[Ambiguity]`, `[Constitution §N]`
   - Minimum 80% of items MUST include traceability references

4. **Prohibited in checklist items**:
   - Verification language ("Verify", "Test", "Confirm")
   - Implementation details (frameworks, algorithms)
   - Behavioral claims ("displays correctly", "works properly")
   - User action descriptions ("click", "navigate")

5. **Write** to `products/[product]/docs/checklists/[feature-name]-checklist.md`

6. **Report**: File path, item count, quality dimensions covered
