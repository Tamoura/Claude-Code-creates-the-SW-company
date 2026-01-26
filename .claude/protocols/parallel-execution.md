# Parallel Execution Protocol

This document describes how to execute multiple agent tasks in parallel using git worktrees.

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

## Option A: Sequential Execution (Simpler)

If parallel execution isn't critical, run tasks sequentially in the same session:

```
1. Orchestrator spawns Backend Engineer sub-agent
2. Wait for completion
3. Orchestrator spawns Frontend Engineer sub-agent
4. Wait for completion
5. Continue...
```

**Pros**: Simple, no extra setup
**Cons**: Slower, one task at a time

## Option B: True Parallel with Git Worktrees (Faster)

For true parallel execution, use git worktrees to create separate working directories.

### Step 1: Create Worktrees

From the main repository root:

```bash
# Create worktrees for parallel agents
git worktree add ../worktrees/backend-work -b feature/{product}/backend-{task-id}
git worktree add ../worktrees/frontend-work -b feature/{product}/frontend-{task-id}
git worktree add ../worktrees/devops-work -b feature/{product}/devops-{task-id}
```

### Step 2: Provide Instructions to CEO

Tell the CEO:

```markdown
## Parallel Execution Required

The following tasks can run in parallel for faster completion:

1. **Backend Task** (BACKEND-01)
   - Open a new Claude Code session
   - Navigate to: `../worktrees/backend-work`
   - Run: `/orchestrator Execute task BACKEND-01`

2. **Frontend Task** (FRONTEND-01)
   - Open another Claude Code session
   - Navigate to: `../worktrees/frontend-work`
   - Run: `/orchestrator Execute task FRONTEND-01`

3. **DevOps Task** (DEVOPS-01)
   - Open another Claude Code session
   - Navigate to: `../worktrees/devops-work`
   - Run: `/orchestrator Execute task DEVOPS-01`

**Once all three are complete**, return here and let me know so I can merge the work.
```

### Step 3: Merge Completed Work

After all parallel tasks complete:

```bash
# Return to main repository
cd /path/to/main/repo

# Merge each branch
git checkout main
git merge feature/{product}/backend-{task-id} --no-ff -m "feat({product}): implement backend foundation"
git merge feature/{product}/frontend-{task-id} --no-ff -m "feat({product}): implement frontend foundation"
git merge feature/{product}/devops-{task-id} --no-ff -m "ci({product}): setup CI/CD pipeline"

# If conflicts occur, resolve them
# git mergetool
# git commit

# Clean up worktrees
git worktree remove ../worktrees/backend-work
git worktree remove ../worktrees/frontend-work
git worktree remove ../worktrees/devops-work

# Delete merged branches
git branch -d feature/{product}/backend-{task-id}
git branch -d feature/{product}/frontend-{task-id}
git branch -d feature/{product}/devops-{task-id}
```

### Step 4: Update Task Graph

After merging:

```bash
# Update task graph status
# Mark all parallel tasks as completed
.claude/scripts/update-task-status.sh {product} BACKEND-01 completed
.claude/scripts/update-task-status.sh {product} FRONTEND-01 completed
.claude/scripts/update-task-status.sh {product} DEVOPS-01 completed
```

## Conflict Prevention

To minimize merge conflicts:

1. **Clear file boundaries**: Backend works on `apps/api/`, Frontend on `apps/web/`, DevOps on `.github/` and root configs
2. **Shared code convention**: If tasks need shared types, one task creates them first, others depend on that task
3. **Package.json coordination**: Only one task modifies root package.json; others modify their app's package.json

## Worktree Management Commands

```bash
# List all worktrees
git worktree list

# Remove a worktree (after merging)
git worktree remove <path>

# Prune stale worktree references
git worktree prune

# Move a worktree
git worktree move <old-path> <new-path>
```

## Error Recovery

If a parallel task fails:

1. **In the failed worktree**: Debug and fix the issue
2. **Retry the task**: Run the agent again in that worktree
3. **If still failing after 3 retries**: 
   - Escalate to CEO
   - Other parallel tasks can continue independently
   - Failed task's branch remains for debugging

If merging fails:

1. **Identify conflicting files**: `git status`
2. **Resolve conflicts manually** or use merge tool
3. **Test the merged result**: Run tests in main repo
4. **Commit the merge**: `git commit`

## Performance Comparison

| Scenario | Sequential Time | Parallel Time | Savings |
|----------|-----------------|---------------|---------|
| 3 tasks × 2 hours each | 6 hours | 2 hours | 67% |
| 2 tasks × 3 hours each | 6 hours | 3 hours | 50% |
| 4 tasks × 1.5 hours each | 6 hours | 1.5 hours | 75% |

## Orchestrator Implementation

When the Orchestrator detects parallelizable tasks:

```markdown
1. Check task graph for tasks with same depends_on and parallel_ok: true

2. If found, create worktrees:
   ```bash
   for task in parallel_tasks:
     git worktree add ../worktrees/{agent}-work -b feature/{product}/{task-id}
   ```

3. Report to CEO with parallel execution instructions

4. Wait for CEO to confirm all parallel tasks complete

5. Merge branches and clean up worktrees

6. Continue with next tasks in graph
```

## Single-Session Alternative

If CEO prefers not to open multiple sessions, Orchestrator can simulate parallelism:

```markdown
1. Start Backend task → Wait for completion
2. Start Frontend task → Wait for completion  
3. Start DevOps task → Wait for completion

Total time: Sequential (sum of all tasks)
But: Simpler workflow, no worktree management
```

The Orchestrator should offer this as an option:

```markdown
## Parallel Tasks Ready

Tasks BACKEND-01, FRONTEND-01, and DEVOPS-01 can run in parallel.

**Option A (Faster)**: Open 3 Claude Code sessions in separate worktrees
- Estimated time: 2 hours (parallel)

**Option B (Simpler)**: Run sequentially in this session
- Estimated time: 6 hours (sequential)

Which approach would you prefer?
```
