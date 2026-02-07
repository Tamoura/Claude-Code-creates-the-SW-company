# Parallel Execution Protocol

This document describes how to execute multiple agent tasks in parallel. The primary strategy uses the Task tool with `run_in_background: true`. Git worktrees are a documented fallback for rare edge cases.

## When to Use Parallel Execution

Use parallel execution when:
- Multiple tasks have the same dependencies (all depend on the same completed task)
- Tasks have `parallel_ok: true` in the task graph
- Tasks don't modify the same files
- You want faster completion

Examples of parallelizable work:
- Backend API + Frontend UI (after architecture is complete)
- Multiple independent features
- Documentation + Testing setup (after code is complete)

## Strategy A: Task Tool with `run_in_background` (PRIMARY)

This is the default parallel execution strategy. The orchestrator launches multiple sub-agents simultaneously using Claude Code's Task tool.

### How It Works

```
1. Orchestrator identifies ready tasks where parallel_ok = true
2. Launch all independent tasks in a single message:

   Task(
     subagent_type: "general-purpose",
     run_in_background: true,
     prompt: "[compact sub-agent prompt with inline brief]",
     description: "Backend: implement user API"
   )

   Task(
     subagent_type: "general-purpose",
     run_in_background: true,
     prompt: "[compact sub-agent prompt with inline brief]",
     description: "Frontend: build user dashboard"
   )

3. Monitor progress with TaskOutput(task_id, block: false)
4. Collect results with TaskOutput(task_id, block: true)
5. Update task graph with results
6. Continue to next group of tasks
```

### Advantages
- No CEO intervention required (fully automated)
- No worktree setup or cleanup
- Sub-agents work on the same codebase
- Orchestrator monitors all tasks from a single session
- Results collected programmatically

### Conflict Prevention
- Backend works on `apps/api/`, Frontend on `apps/web/`, DevOps on `.github/` and root configs
- Shared code convention: if tasks need shared types, one task creates them first (via dependency)
- Package.json coordination: only one task modifies root package.json

### Error Recovery
- If a background task fails, the orchestrator retries it (up to 3 times)
- Other parallel tasks continue independently
- Failed task details are available via TaskOutput

## Strategy B: Sequential Execution (FALLBACK)

When parallelism isn't possible (resource conflicts, shared files, tight dependencies):

```
1. Orchestrator spawns Backend Engineer sub-agent
2. Wait for completion
3. Orchestrator spawns Frontend Engineer sub-agent
4. Wait for completion
5. Continue...
```

**When to use**: Tasks modify overlapping files, or dependency chain requires strict ordering.

## Strategy C: Git Worktrees (RARE — for extreme parallelism)

For 4+ agents working on large codebases where Task tool parallelism is insufficient, use git worktrees. This requires CEO to open multiple Claude Code sessions.

### When to Use
- 4+ agents need true filesystem isolation
- Tasks modify shared configuration files
- Large codebase where agents may interfere with each other's builds

### Setup

```bash
# Create worktrees for parallel agents
git worktree add ../worktrees/backend-work -b feature/{product}/backend-{task-id}
git worktree add ../worktrees/frontend-work -b feature/{product}/frontend-{task-id}
git worktree add ../worktrees/devops-work -b feature/{product}/devops-{task-id}
```

### CEO Instructions

Tell the CEO to open separate Claude Code sessions in each worktree and run `/execute-task {product} {TASK-ID}`.

### Merge via PR (Never merge directly to main)

```bash
# Push branches and create PRs
git push -u origin feature/{product}/backend-{task-id}
gh pr create --title "feat({product}): backend foundation" --body "Implements BACKEND-01"

# Merge PRs
gh pr merge --merge --delete-branch <PR-number>

# Clean up worktrees
git worktree remove ../worktrees/backend-work
```

### Worktree Commands

```bash
git worktree list          # List all worktrees
git worktree remove <path> # Remove a worktree (after merging)
git worktree prune         # Prune stale references
```

## Performance Comparison

| Scenario | Sequential | Task Tool Parallel | Worktree Parallel |
|----------|-----------|-------------------|-------------------|
| 3 tasks x 2h each | 6h | ~2.5h | ~2h |
| 2 tasks x 3h each | 6h | ~3.5h | ~3h |
| 4 tasks x 1.5h each | 6h | ~2h | ~1.5h |

Note: Task tool parallel has slight overhead from shared filesystem; worktrees have overhead from setup/merge.

## Decision Matrix

| Condition | Strategy |
|-----------|----------|
| 2-3 independent tasks, no file conflicts | **A: Task tool** (default) |
| Tasks share files or have tight dependencies | **B: Sequential** |
| 4+ agents, large codebase, file conflicts | **C: Worktrees** |
| CEO requests simplicity | **B: Sequential** |
