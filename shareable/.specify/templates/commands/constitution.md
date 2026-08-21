---
description: Create or update the ConnectSW project constitution, ensuring all dependent templates and agent definitions stay in sync.
agent: Orchestrator
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

You are updating the project constitution at `.specify/memory/constitution.md`. This file governs all specification-to-implementation workflows at ConnectSW.

### Execution Steps

1. **Load the existing constitution** at `.specify/memory/constitution.md`
   - Identify all Articles and their rules

2. **Collect/derive values** for updates:
   - If user input supplies changes, incorporate them
   - Otherwise infer from repo context (CLAUDE.md, existing standards, agent definitions)
   - Update `LAST_AMENDED_DATE` to today if changes are made
   - Increment `CONSTITUTION_VERSION` per semver:
     - MAJOR: Backward-incompatible principle removal or redefinition
     - MINOR: New principle/section added or materially expanded
     - PATCH: Clarifications, wording, typo fixes

3. **Draft the updated constitution**:
   - Replace placeholders with concrete text
   - Ensure each Article has: name, rules (bulleted), rationale
   - Ensure Governance section lists amendment procedure

4. **Consistency propagation**:
   - Read `.specify/templates/plan-template.md` — ensure Constitution Check table matches articles
   - Read `.specify/templates/spec-template.md` — ensure required sections align
   - Read `.specify/templates/tasks-template.md` — ensure ConnectSW-specific tasks align
   - Read `.specify/templates/checklist-template.md` — ensure compliance items match articles
   - Read `.claude/CLAUDE.md` — ensure standards section is consistent
   - Read agent definitions in `.claude/agents/` — update if constitution changes affect agent rules

5. **Write** updated constitution back to `.specify/memory/constitution.md`

6. **Report**:
   - Version change (old → new)
   - Modified articles
   - Templates updated
   - Agent definitions requiring updates
   - Suggested commit message
