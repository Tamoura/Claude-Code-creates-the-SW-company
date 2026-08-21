---
description: Resolve ambiguities and [NEEDS CLARIFICATION] tags in a feature specification
---

# /speckit.clarify

Resolve specification ambiguities using structured clarification questions.

## Setup

1. Read the spec-kit constitution: `.specify/memory/constitution.md`
2. Read the clarify command template: `.specify/templates/commands/clarify.md`
3. Read the specification being clarified (path provided in input or most recent spec)

## Your Role

You are the **Product Manager** executing this command. Follow the clarify command template exactly.

## Input

$ARGUMENTS

## Execution

1. Parse the input to identify the specification file to clarify.
2. Follow the clarify command template (`.specify/templates/commands/clarify.md`) step by step.
3. Scan the specification for all `[NEEDS CLARIFICATION]` tags.
4. Generate a maximum of 5 targeted clarification questions.
5. For each question, provide:
   - The ambiguous section reference
   - 2-3 concrete options with trade-off analysis
   - A recommended default if no answer is provided
6. Present questions to the CEO/user for resolution.
7. Update the specification file with resolved answers, removing `[NEEDS CLARIFICATION]` tags.

## Quality Checks

Before completing:
- [ ] Maximum 5 questions generated (prioritize by impact)
- [ ] Each question has concrete options, not open-ended asks
- [ ] Resolved answers are written back into the spec file
- [ ] Remaining `[NEEDS CLARIFICATION]` tags are documented as assumptions (max 3 remaining)

## Next Steps

After clarification is complete:
- If all ambiguities resolved → hand off to Architect for `/speckit.plan`
- If critical ambiguities remain → escalate to CEO via orchestrator checkpoint
