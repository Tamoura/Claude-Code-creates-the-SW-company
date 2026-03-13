# Plan Task Command

Create task planning documentation with selective expert analysis based on task type. Generates structured per-task documentation folders with implementation plans, status tracking, and decision logs.

## Usage

```
/plan-task <product> <task-description>
```

Examples:
```
/plan-task stablecoin-gateway add user role management with RBAC
/plan-task portal fix dashboard chart rendering on mobile
/plan-task api-gateway implement rate limiting per API key
```

## Arguments

- **product**: Product name (folder under `products/` or current product in single-repo mode)
- **task-description**: Natural language description of the task

## Your Task

### Step 1: Parse Task Description

If no arguments provided, ask the user:
- What product is this for?
- Describe the task in one sentence.

Generate a kebab-case task name from the description:
- "add user role management" → `add-user-role-management`
- "fix dashboard chart on mobile" → `fix-dashboard-chart-mobile`
- "implement rate limiting" → `implement-rate-limiting`

### Step 2: Determine Task Domain

Classify the task to select which expert agents to consult. Use judgment — do NOT consult all experts blindly.

**Expert Selection Matrix:**

| Task Domain | Expert Agents to Consult |
|-------------|--------------------------|
| Frontend UI | `tailwind-expert` + `nextjs-expert` |
| Backend API | `fastify-expert` + `prisma-expert` |
| Database / Schema | `prisma-expert` |
| Authentication | `nextjs-expert` + `fastify-expert` |
| Full-stack feature | `nextjs-expert` + `fastify-expert` + `prisma-expert` + `tailwind-expert` |
| Styling / Responsive | `tailwind-expert` |
| Performance | Relevant stack expert(s) |
| Bug fix (frontend) | `nextjs-expert` (+ `tailwind-expert` if visual) |
| Bug fix (backend) | `fastify-expert` (+ `prisma-expert` if data-related) |

**Rules:**
- Maximum 3 experts per task (attention budget)
- If unsure, start with the most likely 1-2 and note gaps
- Some tasks need zero experts (pure config, docs, etc.)

### Step 3: Consult Selected Experts

For each selected expert, spawn a subagent with this prompt template:

```
You are the [Expert Name] for ConnectSW.

Read your agent definition: .claude/agents/[expert-name].md

Task context:
- Product: [product]
- Task: [task-description]

Provide analysis covering:
1. **Recommended approach** — How to implement this using [technology] best practices
2. **Patterns to use** — Specific code patterns from your expertise
3. **Anti-patterns to avoid** — What NOT to do for this specific task
4. **Security considerations** — Any security implications
5. **Testing guidance** — How to test the [technology] aspects
6. **Estimated complexity** — Simple / Medium / Complex

Keep your response focused and actionable. Maximum 500 words.
```

### Step 4: Create Task Documentation

Resolve the product path using `.claude/scripts/resolve-product.sh` or infer from arguments.

Create the following folder structure:

```
<product-root>/docs/tasks/<task-name>/
├── plan.md              # Implementation plan
├── status.md            # Progress tracking
├── decisions.md         # Design decision log
└── implementation-notes.md  # Full expert analyses
```

#### plan.md

```markdown
# Task: <Task Description>

**Task ID**: <TASK-NAME>
**Product**: <product>
**Created**: <date>
**Status**: Planning

## Goal

<1-2 sentence description of what success looks like>

## Expert Analysis Summary

| Expert | Recommendation | Complexity |
|--------|---------------|------------|
| [Expert 1] | [One-line summary] | [Simple/Medium/Complex] |
| [Expert 2] | [One-line summary] | [Simple/Medium/Complex] |

## Implementation Steps

1. [ ] **Step 1**: <description>
   - Files: `<file paths>`
   - Tests: `<test file paths>`

2. [ ] **Step 2**: <description>
   - Files: `<file paths>`
   - Tests: `<test file paths>`

[...]

## Anti-Patterns (from expert analysis)

- ❌ <Anti-pattern 1 and why>
- ❌ <Anti-pattern 2 and why>

## Security Considerations

- <Security note 1>
- <Security note 2>

## Testing Strategy

- Unit tests: <what to test>
- Integration tests: <what to test>
- E2E tests: <what to test>

## Acceptance Criteria

- [ ] <Criterion 1>
- [ ] <Criterion 2>
- [ ] All tests pass
- [ ] Visual verification in browser (if applicable)
```

#### status.md

```markdown
# Status: <Task Description>

**Current Phase**: Planning
**Assigned Agent**: TBD
**Last Updated**: <date>

## Progress

| Step | Status | Notes |
|------|--------|-------|
| Planning | ✅ Complete | Expert analysis done |
| Implementation | ⬜ Not started | |
| Testing | ⬜ Not started | |
| Review | ⬜ Not started | |

## Blockers

None

## Notes

- Created via /plan-task command
```

#### decisions.md

```markdown
# Decisions: <Task Description>

## Decision Log

### DEC-001: <Decision Title>
- **Date**: <date>
- **Context**: <why this decision was needed>
- **Options considered**:
  1. <Option A> — <pros/cons>
  2. <Option B> — <pros/cons>
- **Decision**: <chosen option>
- **Rationale**: <why>

## Pending Decisions

- [ ] <Decision that needs to be made>
```

#### implementation-notes.md

```markdown
# Implementation Notes: <Task Description>

## Expert Analyses

### <Expert 1 Name>
<Full expert analysis output>

### <Expert 2 Name>
<Full expert analysis output>

## Additional Research

<Any extra findings from codebase exploration>

## Related Files

- `<file path>` — <what it does and how it relates>
- `<file path>` — <what it does and how it relates>
```

### Step 5: Report Summary

After creating the documentation, report:

```
## Task Plan Created

📁 <product-root>/docs/tasks/<task-name>/
├── plan.md           — <N> implementation steps
├── status.md         — Tracking initialized
├── decisions.md      — <N> pending decisions
└── implementation-notes.md — <N> expert analyses

**Experts consulted**: [list]
**Estimated complexity**: [Simple/Medium/Complex]
**Next action**: Assign to [recommended agent] or run /execute-task
```

## Key Principles

- **Be selective** — Consult only relevant experts (quality over quantity)
- **Auto-generate task names** — Don't ask the user for a slug
- **Preserve full expert feedback** — implementation-notes.md keeps everything
- **Keep plans actionable** — Include specific file paths, not vague descriptions
- **Handle edge cases**:
  - If task folder already exists, append a number suffix
  - If task is too vague, ask one clarifying question before proceeding
  - If no experts are relevant, skip expert consultation and note "No domain experts required"
