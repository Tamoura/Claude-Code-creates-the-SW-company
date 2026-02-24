---
description: Generate a dependency-ordered task list from an implementation plan
---

# /speckit.tasks

Generate a dependency-ordered task list suitable for the orchestrator's task graph engine.

## Setup

1. Read the spec-kit constitution: `.specify/memory/constitution.md`
2. Read the tasks command template: `.specify/templates/commands/tasks.md`
3. Read the tasks template: `.specify/templates/tasks-template.md`
4. Read the implementation plan: `products/{PRODUCT}/docs/plan.md`
5. Read the specification: `products/{PRODUCT}/docs/specs/{FEATURE_ID}.md`

## Your Role

You are the **Orchestrator** executing this command. Follow the tasks command template exactly.

## Input

$ARGUMENTS

## Execution

1. Parse the input to identify the product and plan file.
2. Follow the tasks command template (`.specify/templates/commands/tasks.md`) step by step.
3. Use the tasks template (`.specify/templates/tasks-template.md`) as the output structure.
4. Break the plan into agent-assignable tasks with clear dependencies.
5. For each task, specify:
   - Task ID, name, description
   - Assigned agent role
   - Dependencies (depends_on)
   - Story IDs and requirement IDs (from spec)
   - Acceptance criteria
   - Produces (output artifacts)
   - Whether it can run in parallel
6. Enforce TDD ordering: test tasks before implementation tasks.
7. Output to: `products/{PRODUCT}/docs/tasks.md`

## Quality Checks

Before completing:
- [ ] Every implementation task from the plan has a corresponding task entry
- [ ] Dependencies form a valid DAG (no circular dependencies)
- [ ] Every task has story_ids and requirement_ids from the spec
- [ ] Test tasks are ordered before implementation tasks (TDD)
- [ ] Parallel-safe tasks are marked with `parallel_ok: true`
- [ ] Checkpoint tasks are placed at appropriate milestones
- [ ] All consumed artifacts trace to a producing task

## Next Steps

After task list is complete:
- Run `/speckit.analyze` to validate consistency across spec, plan, and tasks
- Hand off to Orchestrator for execution via task graph engine
