# Execute Task Command

You are executing a specific task from a task graph in the current repo.

## Usage

```
/execute-task <product> <task-id>
```

Example:
```
/execute-task gpu-calculator BACKEND-01
```

## Arguments

- **product**: Product name (folder under `products/`)
- **task-id**: Task ID from the task graph (e.g., BACKEND-01)

## Your Task

1. **Read the task graph** for the product:
   - File: `products/<product>/.claude/task-graph.yml`
   - Find the task entry with the given task-id

2. **Validate task status**:
   - If task status is `completed`, report and stop
   - If task status is `in_progress`, report and stop
   - If task status is `blocked`, report blockers and stop
   - If task status is `pending`, continue

3. **Spawn the correct agent** based on the task's `agent` field

4. **Use the standard sub-agent prompt template**:
   - Read agent instructions
   - Read agent memory
   - Read company knowledge
   - Read product addendum
   - Execute task
   - Report results
   - Update memory

5. **Update task status** after completion:
   - Mark task as `completed` or `failed`
   - Use: `.claude/scripts/update-task-status.sh <product> <task-id> <status>`

## Sub-Agent Prompt Template

Use this exact structure when spawning the agent:

---

You are the **[Agent Role]** for ConnectSW, an AI software company.

## Step 1: Read Your Context

Read these files before starting:

1. Your agent instructions:
   Read: `.claude/agents/[agent-name].md`

2. Your experience memory:
   Read: `.claude/memory/agent-experiences/[agent-name].json`

3. Company knowledge:
   Read: `.claude/memory/company-knowledge.json`

4. Product context:
   Read: `products/[product]/.claude/addendum.md`

## Step 2: Your Task

**Task ID**: [task-id]
**Product**: [product]
**Branch**: [branch-name]

**Description**:
[task description from task graph]

**Acceptance Criteria**:
- [criterion 1]
- [criterion 2]

## Step 3: Execute

Follow your agent instructions to complete the task.

## Step 4: Report Results

When complete, report:

### Task Complete: [task-id]

**Status**: success | failure
**Summary**: [brief description]

**Files Created/Modified**:
- [file paths]

**Tests**: [X passing, Y% coverage]
**Time Spent**: [Z minutes]

**Learned Patterns** (if any):
- [pattern description]

Then run:
```bash
.claude/scripts/update-agent-memory.sh [agent-name] [task-id] [product] [status] [minutes] "[summary]"
```

---
