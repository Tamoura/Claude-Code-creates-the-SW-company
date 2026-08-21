---
description: Create a feature specification from a natural language description, adapted for ConnectSW's orchestrator workflow.
agent: Product Manager
handoffs:
  - label: Clarify Requirements
    command: /speckit.clarify
  - label: Build Technical Plan
    command: /speckit.plan
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

You are creating a feature specification for a ConnectSW product. This command replaces ad-hoc PRD writing with a structured, template-driven approach.

### Execution Steps

1. **Identify the product**: Determine which product under `products/` this feature belongs to. If the product doesn't exist yet, this should be run as part of the new-product workflow.

2. **Load context**:
   - Read `.specify/memory/constitution.md` — understand governing principles
   - Read `.specify/templates/spec-template.md` — understand required sections
   - Read `.claude/COMPONENT-REGISTRY.md` — identify reusable components
   - Read `products/[product]/.claude/addendum.md` (if exists) — product-specific context
   - Read `products/[product]/docs/PRD.md` (if exists) — existing requirements

3. **Generate the specification** (MUST be comprehensive — thin specs are rejected):
   - Focus on **WHAT** and **WHY**, not **HOW**
   - Do NOT include technology choices (those belong in `/speckit.plan`)
   - Fill ALL sections from the spec template — no empty sections allowed
   - **Business Context is MANDATORY**: Problem statement, target personas, business value, strategic alignment
   - **C4 Context Diagram (Level 1) is MANDATORY**: System in its environment using Mermaid C4 syntax
   - **User Stories are MANDATORY**: Full "As a / I want / So that" with persona and motivation
   - **Acceptance Criteria are MANDATORY**: Given/When/Then for every user story (min 2 per story, including error cases)
   - **Data Model diagram is MANDATORY**: ER diagram for all entities using Mermaid
   - **Edge Cases table is MANDATORY**: Minimum 5 edge cases with expected behavior
   - Use `[NEEDS CLARIFICATION]` for uncertain areas (max 3)
   - Check COMPONENT-REGISTRY.md and fill the Component Reuse Check table
   - Include measurable success criteria with specific numbers

4. **ConnectSW-specific additions**:
   - Reference the product's existing PRD if extending an existing product
   - List all page routes this feature adds/modifies (for the Site Map)
   - Note any cross-product dependencies
   - Flag if this feature creates new reusable components

5. **Write the specification** to: `products/[product]/docs/specs/[feature-name].md`
   - Also update `products/[product]/docs/PRD.md` if this is a new feature for an existing product

6. **Validate**:
   - All template sections filled (no empty placeholders)
   - Every user story has acceptance criteria
   - Every requirement has an ID (FR-001, NFR-001, etc.)
   - Component Reuse Check table is complete
   - No ambiguous language ("should", "might") — use MUST/SHOULD per RFC 2119
   - Max 3 `[NEEDS CLARIFICATION]` markers (if more, run `/speckit.clarify` first)

7. **Report completion**:
   - Spec file path
   - Number of user stories
   - Number of requirements
   - Number of `[NEEDS CLARIFICATION]` markers (if any)
   - Components identified for reuse
   - Suggested next step: `/speckit.clarify` (if markers exist) or `/speckit.plan`

## Integration with ConnectSW Workflow

This command is invoked during:
- **New Product (Phase 1.3)**: Product Manager creates structured specs instead of free-form PRD
- **New Feature (Phase 1.1)**: Feature specs created before planning begins
- **CEO request**: "Add [feature] to [product]" triggers this before implementation

The specification becomes the contract between Product Manager and Architect. All subsequent planning, task generation, and implementation trace back to spec requirements.
