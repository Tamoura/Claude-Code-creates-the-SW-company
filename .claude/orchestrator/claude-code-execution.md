# Claude Code Execution Guide

This document describes how the Orchestrator executes workflows using Claude Code's native capabilities.

## Claude Code Capabilities

Claude Code can:
- Read and write files
- Execute shell commands
- Spawn sub-agents using the Task tool
- Interact with git (commit, branch, push, PR)
- Run tests and build tools

Claude Code **cannot** (directly):
- Run multiple things in true parallel (see workaround below)
- Execute long-running processes in background and continue
- Access external services without explicit configuration

## Execution Flow

### Step 1: Assess State

Before any work, check current state:

```bash
# Git status
git status
git branch -a
git worktree list

# GitHub status
gh pr list
gh issue list --state open

# Company state
cat .claude/orchestrator/state.yml

# Product state (if exists)
cat products/{product}/.claude/task-graph.yml 2>/dev/null || echo "No active task graph"
```

### Step 2: Load or Create Task Graph

For new work:

```bash
# Instantiate task graph from template
.claude/scripts/instantiate-task-graph.sh {workflow-type} {product} "DESCRIPTION={description}"
```

For existing work:
- Read the existing task graph: `products/{product}/.claude/task-graph.yml`

### Step 3: Execute Tasks

For each task in the graph (in dependency order):

#### 3a. Check if Task is Ready

A task is ready when:
- Status is `pending`
- All tasks in `depends_on` have status `completed`
- No checkpoint is blocking

#### 3b. Spawn Sub-Agent

Use Claude Code's Task tool with this prompt structure:

```
You are the {Agent Role} for ConnectSW, an AI software company.

## Step 1: Read Your Context

Read these files before starting:

1. Your agent instructions:
   Read: .claude/agents/{agent-name}.md

2. Your experience memory:
   Read: .claude/memory/agent-experiences/{agent-name}.json

3. Company knowledge:
   Read: .claude/memory/company-knowledge.json

4. Product context:
   Read: products/{product}/.claude/addendum.md

## Step 2: Your Task

**Task ID**: {task-id}
**Product**: {product}
**Branch**: {branch-name}

**Description**:
{task-description-from-graph}

**Acceptance Criteria**:
{acceptance-criteria-from-graph}

## Step 3: Execute

Follow your agent instructions to complete the task.

## Step 4: Report Results

When complete, report:

### Task Complete: {task-id}

**Status**: success | failure
**Summary**: {brief description}

**Files Created/Modified**:
- {file paths}

**Tests**: {X passing, Y% coverage}
**Time Spent**: {Z minutes}

**Learned Patterns** (if any):
- {pattern description}

Then run:
```bash
.claude/scripts/update-agent-memory.sh {agent-name} {task-id} {product} {status} {minutes} "{summary}"
```
```

#### 3c. Handle Response

When sub-agent completes:

1. **Parse the response** - Extract status, artifacts, time spent
2. **Update task graph** - Mark task as `completed` or `failed`
   - Prefer using: `.claude/scripts/update-task-status.sh {product} {task-id} {status}`
3. **Update agent memory** - If not done by sub-agent, run the script
4. **Check for checkpoint** - If task has `checkpoint: true`, pause for CEO

### Step 4: Handle Checkpoints

When reaching a checkpoint:

1. **Run testing gate** (if code-related checkpoint):
   ```bash
   .claude/scripts/testing-gate-checklist.sh {product}
   ```

2. **Report to CEO**:
   ```markdown
   ## Checkpoint: {checkpoint-name}

   **Product**: {product}
   **Phase**: {phase}

   ### Completed
   - {completed tasks with artifacts}

   ### Ready for Review
   - {what CEO should review}
   - {links to files/PRs}

   ### Next Steps (after approval)
   - {what happens next}

   ---
   **Please review and approve to continue.**
   ```

3. **Wait for CEO approval** before continuing

### Step 5: Handle Parallel Tasks

When multiple tasks can run in parallel:

**Option A: Sequential (Default)**

Run tasks one at a time. Simpler but slower.

**Option B: Parallel with Worktrees**

If CEO wants speed, follow the parallel execution protocol:

```bash
# Create worktrees
git worktree add ../worktrees/backend-work -b feature/{product}/backend
git worktree add ../worktrees/frontend-work -b feature/{product}/frontend
```

Then provide instructions for CEO to open additional Claude Code sessions.

See: `.claude/protocols/parallel-execution.md`

## Task Status Updates

After each task completes, update the task graph. Prefer the script:

```bash
.claude/scripts/update-task-status.sh {product} {task-id} completed
```

Manual YAML update (if needed):

```yaml
# In products/{product}/.claude/task-graph.yml
tasks:
  - id: "TASK-01"
    status: "completed"  # was "pending" or "in_progress"
    completed_at: "2026-01-26T12:00:00Z"
    result:
      artifacts:
        - path: "src/feature.ts"
          type: "file"
      metrics:
        time_spent_minutes: 90
        tests_added: 5
```

## Error Handling

### Task Failure

1. Increment retry count
2. If retry_count < 3:
   - Analyze the error
   - Adjust approach
   - Retry the task
3. If retry_count >= 3:
   - Mark task as `failed`
   - Escalate to CEO with:
     - What was attempted
     - Error messages
     - Suggested solutions

### Sub-Agent Timeout

If a sub-agent doesn't respond:
1. Check if process is still running
2. If stuck, consider breaking task into smaller pieces
3. If repeated, report to CEO

## Best Practices

### For Orchestrator

1. **Always read state first** - Don't assume, check
2. **Use scripts** - Don't manually edit JSON/YAML
3. **Small iterations** - Better to checkpoint often than run too long
4. **Clear handoffs** - Each sub-agent gets full context

### For Sub-Agents

1. **Read memory first** - Learn from past experience
2. **Follow agent instructions** - They contain important patterns
3. **Report clearly** - Status, artifacts, time spent
4. **Update memory** - Run the script after completion

### For Parallel Work

1. **Use worktrees** - Don't try to work in same directory
2. **Clear boundaries** - Each agent works on different files
3. **Merge carefully** - Resolve conflicts after parallel work

## Quick Reference

| Action | Command |
|--------|---------|
| Create task graph | `.claude/scripts/instantiate-task-graph.sh {type} {product} "{params}"` |
| Check task status | `cat products/{product}/.claude/task-graph.yml` |
| Update agent memory | `.claude/scripts/update-agent-memory.sh {agent} {task} {product} {status} {mins} "{summary}"` |
| Run testing gate | `.claude/scripts/testing-gate-checklist.sh {product}` |
| Check system health | `/check-system` |
| List worktrees | `git worktree list` |

## Examples

### Example: New Product Workflow

```
CEO: "/orchestrator New product: task manager app"

Orchestrator:
1. Check state ✓
2. Instantiate task graph: new-product for task-manager
3. Ready tasks: [PRD-01]
4. Spawn Product Manager sub-agent
5. PM completes, reports success
6. Update task graph: PRD-01 = completed
7. Checkpoint! Report to CEO: "PRD ready for review"
8. [CEO approves]
9. Ready tasks: [ARCH-01]
10. Spawn Architect sub-agent
11. Continue...
```

### Example: Parallel Execution

```
CEO: "/orchestrator Continue task-manager development"

Orchestrator:
1. Check state ✓
2. Read task graph: ARCH-01 completed, checkpoints passed
3. Ready tasks: [BACKEND-01, FRONTEND-01, DEVOPS-01] (all parallel_ok)
4. Ask CEO: "Run parallel (faster) or sequential (simpler)?"
5. [CEO chooses parallel]
6. Create worktrees
7. Provide instructions for additional sessions
8. [Wait for CEO to confirm all complete]
9. Merge branches, clean up worktrees
10. Continue with next tasks
```
