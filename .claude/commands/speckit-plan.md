---
description: Create a traceable implementation plan from a feature specification
---

# /speckit.plan

Create a traceable implementation plan that maps specification requirements to technical tasks.

## Setup

1. Read the spec-kit constitution: `.specify/memory/constitution.md`
2. Read the plan command template: `.specify/templates/commands/plan.md`
3. Read the plan template: `.specify/templates/plan-template.md`
4. Read the specification being planned (path provided in input)
5. Read product addendum: `products/{PRODUCT}/.claude/addendum.md`
6. Check `.claude/COMPONENT-REGISTRY.md` for reusable components

## Your Role

You are the **Architect** executing this command. Follow the plan command template exactly.

## Input

$ARGUMENTS

## Execution

1. Parse the input to identify the specification file and product.
2. Follow the plan command template (`.specify/templates/commands/plan.md`) step by step.
3. Use the plan template (`.specify/templates/plan-template.md`) as the output structure.
4. Map every user story (US-XX) and requirement (FR-XXX) to implementation tasks.
5. Include architecture decisions with C4 diagrams (at minimum Level 1 and Level 2).
6. Include ER diagrams for any database schema changes.
7. Include sequence diagrams for multi-step flows.
8. Identify components to reuse from the Component Registry.
9. Output the plan to: `products/{PRODUCT}/docs/plan.md`

## Quality Checks

Before completing:
- [ ] Every US-XX and FR-XXX from the spec has a corresponding implementation task
- [ ] C4 Context and Container diagrams included (Mermaid syntax)
- [ ] ER diagram included for schema changes
- [ ] Traceability matrix: US-XX -> FR-XXX -> endpoint/component -> DB table
- [ ] Integration points documented with sequence diagrams
- [ ] Security considerations section filled
- [ ] Error handling strategy with flowchart
- [ ] Component reuse identified from registry

## Next Steps

After plan is complete:
- Hand off to Orchestrator for `/speckit.tasks` (task list generation)
