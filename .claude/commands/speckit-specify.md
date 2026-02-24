---
description: Create a structured feature specification from a CEO brief or natural language description
---

# /speckit.specify

Create a structured feature specification using spec-kit methodology.

## Setup

1. Read the spec-kit constitution: `.specify/memory/constitution.md`
2. Read the specify command template: `.specify/templates/commands/specify.md`
3. Read the spec template: `.specify/templates/spec-template.md`
4. If a product exists, read: `products/{PRODUCT}/.claude/addendum.md`

## Your Role

You are the **Product Manager** executing this command. Follow the specify command template exactly.

## Input

$ARGUMENTS

## Execution

1. Parse the input to identify the product name, feature scope, and any constraints.
2. Follow the specify command template (`.specify/templates/commands/specify.md`) step by step.
3. Use the spec template (`.specify/templates/spec-template.md`) as the output structure.
4. Check `.claude/COMPONENT-REGISTRY.md` and fill the Component Reuse Check table.
5. Output the specification to: `products/{PRODUCT}/docs/specs/{FEATURE_ID}.md`
6. Mark any uncertain areas with `[NEEDS CLARIFICATION]` tags.

## Quality Checks

Before completing:
- [ ] All sections of the spec template are filled
- [ ] User stories have unique IDs (US-XX) with Given/When/Then acceptance criteria
- [ ] Contains at least 1 C4 context diagram and 1 ER diagram (Mermaid syntax)
- [ ] Edge cases table has at least 5 entries
- [ ] Component Reuse Check table is filled
- [ ] No ambiguous language without `[NEEDS CLARIFICATION]` markers

## Next Steps

After specification is complete:
- If `[NEEDS CLARIFICATION]` tags exist → run `/speckit.clarify`
- If specification is clean → hand off to Architect for `/speckit.plan`
