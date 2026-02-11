---
description: Create a technical implementation plan from a feature specification, using ConnectSW's default stack and component registry.
agent: Architect
handoffs:
  - label: Create Tasks
    command: /speckit.tasks
  - label: Create Checklist
    command: /speckit.checklist
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

You are creating an implementation plan that translates a feature specification into technical design artifacts. This replaces ad-hoc architecture work with a structured, traceable approach.

### Execution Steps

1. **Load context**:
   - Read the feature spec: `products/[product]/docs/specs/[feature-name].md`
   - Read `.specify/memory/constitution.md` — governing principles
   - Read `.specify/templates/plan-template.md` — plan structure
   - Read `.claude/COMPONENT-REGISTRY.md` — reusable components
   - Read `products/[product]/.claude/addendum.md` — product tech context
   - Read `.claude/PORT-REGISTRY.md` — port assignments
   - Verify NO `[NEEDS CLARIFICATION]` markers remain in spec (if any, ERROR → run `/speckit.clarify` first)

2. **Constitution Check (Gate)**:
   - Verify spec exists and is approved (Article I)
   - Verify COMPONENT-REGISTRY.md was checked (Article II)
   - Verify TDD plan will be included (Article III)
   - Verify TypeScript configuration (Article IV)
   - Verify stack matches default or ADR exists (Article V)
   - Verify ports assigned (Article VII)
   - **If ANY gate fails: ERROR — resolve before proceeding**

3. **Phase 0: Research**:
   - Extract unknowns from the spec
   - Research open source solutions (GitHub, npm) per Architect agent guidelines
   - Document findings in `products/[product]/docs/research.md`
   - Resolve all technical unknowns before Phase 1

4. **Phase 1: Design & Contracts**:
   - Create `products/[product]/docs/data-model.md` from spec entities
   - Create API contracts in `products/[product]/docs/contracts/`
   - Map spec requirements to API endpoints
   - Identify which existing ConnectSW components to reuse
   - Document new components that should be added to registry after implementation

5. **Fill the plan template**:
   - Write to `products/[product]/docs/plan.md`
   - Fill Technical Context with ConnectSW defaults
   - Complete Constitution Check table
   - Fill Component Reuse Plan
   - Define project structure (following ConnectSW conventions)
   - Fill Complexity Tracking table

6. **Report completion**:
   - Plan file path
   - Generated artifacts (data-model.md, contracts/, research.md)
   - Components to be reused (from registry)
   - New components to be created (for registry)
   - Constitution compliance status
   - Suggested next step: `/speckit.tasks`

### ConnectSW Integration

This command maps to the **Architecture Phase** in the new-product/new-feature workflow:
- Replaces free-form architecture design with structured, spec-traced planning
- Produces the same outputs (ADRs, API contracts, data models) in a traceable format
- Constitution check ensures compliance before any implementation begins
- Component reuse check prevents reinventing existing ConnectSW solutions
