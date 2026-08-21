# Task Graph Engine

The Task Graph Engine automates task dependency resolution, parallel execution, and workflow management for the Orchestrator.

## Purpose

Eliminate manual dependency tracking and worktree management by automatically:
- Detecting which tasks are ready to run
- Identifying parallelization opportunities
- Managing task state transitions
- Coordinating agent assignments

## How It Works

### 1. Task Graph Loading

When Orchestrator receives a request (new product, feature, etc.), it:

1. Determines the workflow type (new-product, new-feature, bug-fix, release)
2. Loads the corresponding task graph template
3. Customizes it for the specific product
4. Saves to `products/[product]/.claude/task-graph.yml`

### 2. Automatic Execution Loop

```
┌─────────────────────────────────────┐
│ Orchestrator Execution Loop         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Load Task Graph                  │
│    - Read products/[product]/       │
│      .claude/task-graph.yml         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 2. Analyze Graph State              │
│    - Which tasks are complete?      │
│    - Which are in progress?         │
│    - Which are ready to start?      │
│    - Any failed/blocked?            │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. Get Ready Tasks                  │
│    get_ready_tasks() →              │
│    Tasks where:                     │
│    - status = pending               │
│    - All depends_on tasks complete  │
│    - No checkpoint blocking         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. Identify Parallel Opportunities  │
│    get_parallel_tasks() →           │
│    Tasks with:                      │
│    - Same dependency set            │
│    - parallel_ok = true             │
│    - No resource conflicts          │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 5. Invoke Agents (Parallel)         │
│    - One Task tool call per agent   │
│    - All in same message (parallel) │
│    - Update status = in_progress    │
│    - Record started_at timestamp    │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 6. Receive Agent Messages           │
│    - Parse AgentMessage protocol    │
│    - Extract status, artifacts      │
│    - Update task graph              │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 7. Update Task Status                │
│    - Mark completed/failed          │
│    - Record result artifacts        │
│    - Unlock dependent tasks         │
│    - Save updated graph             │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 8. Check for Checkpoint              │
│    If completed task has            │
│    checkpoint=true:                 │
│    - Pause execution                │
│    - Report to CEO                  │
│    - Wait for approval              │
│    Else:                            │
│    - Continue to step 1             │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 9. Check for Completion              │
│    All tasks complete?              │
│    - Yes → Final report to CEO      │
│    - No → Back to step 1            │
└─────────────────────────────────────┘
```

## Graph Operations

### get_ready_tasks()

Returns tasks that can start now.

```yaml
Algorithm:
  for each task in graph:
    if task.status != "pending":
      skip

    all_deps_complete = true
    for each dep_id in task.depends_on:
      dep_task = find_task(dep_id)
      if dep_task.status != "completed":
        all_deps_complete = false
        break

    if all_deps_complete:
      if no_checkpoint_blocking(task):
        add task to ready_list

  return ready_list sorted by priority
```

### get_parallel_tasks(ready_tasks)

From ready tasks, find which can run together.

```yaml
Algorithm:
  parallel_groups = []

  # Group tasks by their dependency set
  dependency_groups = group_by(ready_tasks, "depends_on")

  for group in dependency_groups:
    parallelizable = filter(group, where: parallel_ok == true)

    if count(parallelizable) > 1:
      # Multiple tasks can run in parallel
      parallel_groups.add(parallelizable)
    else:
      # Run sequentially
      for task in group:
        parallel_groups.add([task])

  return parallel_groups
```

### calculate_critical_path()

Find the longest dependency chain (bottleneck).

```yaml
Algorithm:
  function longest_path(task):
    if task.depends_on is empty:
      return task.estimated_time_minutes

    max_dep_time = 0
    for dep_id in task.depends_on:
      dep_task = find_task(dep_id)
      dep_time = longest_path(dep_task)
      if dep_time > max_dep_time:
        max_dep_time = dep_time

    return max_dep_time + task.estimated_time_minutes

  # Find all terminal tasks (no one depends on them)
  terminal_tasks = filter(tasks, where: not_depended_on_by_anyone)

  critical_path = []
  max_time = 0

  for task in terminal_tasks:
    path_time = longest_path(task)
    if path_time > max_time:
      max_time = path_time
      critical_path = reconstruct_path(task)

  return critical_path, max_time
```

### validate_graph()

Check for errors before execution.

```yaml
Validation Rules:
  1. No Circular Dependencies
     - Use topological sort
     - If impossible → circular dependency exists

  2. All Referenced Tasks Exist
     - Every task in depends_on must exist in graph

  3. All Consumed Artifacts Are Produced
     - For each task.consumes item:
       - Find task with consumes.required_from_task ID
       - Verify that task produces the artifact

  4. Checkpoint Tasks Don't Have Parallel Siblings
     - If task.checkpoint = true
     - No sibling with parallel_ok = true

  5. Agent IDs Are Valid
     - task.agent must be in approved agent list

  6. Status Transitions Are Valid
     - pending → ready → in_progress → completed
     - pending → ready → in_progress → failed
     - completed/failed are terminal
```

## Integration with Orchestrator

### Orchestrator Usage Pattern

```markdown
# When CEO requests work:

1. Orchestrator reads request
2. Determines workflow type
3. Loads task graph template from `.claude/workflows/[type]-tasks.yml`
4. Instantiates graph for product
5. Validates graph
6. Enters execution loop:

   Loop:
     a. Get ready tasks
     b. Get parallel groups
     c. For each parallel group:
        - Invoke all agents in single message (parallel)
        - Update task statuses to in_progress
     d. Wait for agent responses
     e. Process agent messages:
        - Update task statuses
        - Record artifacts
        - Handle errors (retry logic)
     f. Check for checkpoints
     g. If checkpoint: pause and report to CEO
     h. If all complete: final report
     i. Else: continue loop

7. Archive completed graph to `.claude/orchestrator/history/[product]/[timestamp].yml`
```

### Example Orchestrator Code Flow

```markdown
## Orchestrator handling "New product: analytics-dashboard"

Step 1: Load Template
  Read: .claude/workflows/new-product-tasks.yml
  Substitute: {PRODUCT} = "analytics-dashboard"
  Save to: products/analytics-dashboard/.claude/task-graph.yml

Step 2: Validate
  Run: validate_graph()
  Result: ✓ Valid (no circular dependencies, all refs exist)

Step 3: Start Execution Loop

  Iteration 1:
    get_ready_tasks() → [PRD-01]
    get_parallel_tasks([PRD-01]) → [[PRD-01]]

    Invoke Product Manager:
      Task(prompt: "Create PRD for analytics-dashboard...")

    Update graph: PRD-01.status = in_progress

    Receive message: {message_type: task_complete, task_id: PRD-01, ...}

    Update graph:
      PRD-01.status = completed
      PRD-01.completed_at = timestamp
      PRD-01.result.artifacts = [PRD.md, addendum.md]

    PRD-01.checkpoint = true → PAUSE
    Report to CEO: "PRD complete, review at products/analytics-dashboard/docs/PRD.md"

    [CEO approves]

  Iteration 2:
    get_ready_tasks() → [ARCH-01]
    get_parallel_tasks([ARCH-01]) → [[ARCH-01]]

    Invoke Architect...
    [similar flow]

  Iteration 3:
    get_ready_tasks() → [DEVOPS-01, BACKEND-01, FRONTEND-01]
    get_parallel_tasks([...]) → [[DEVOPS-01, BACKEND-01, FRONTEND-01]]

    # ALL THREE CAN RUN IN PARALLEL!
    Invoke in SINGLE message:
      Task(prompt: "DevOps: Setup CI/CD...")
      Task(prompt: "Backend: Implement foundation...")
      Task(prompt: "Frontend: Setup Next.js...")

    Update graph:
      DEVOPS-01.status = in_progress
      BACKEND-01.status = in_progress
      FRONTEND-01.status = in_progress

    # Agents work in parallel

    Receive 3 messages (in any order):
      {task_id: BACKEND-01, status: success}
      {task_id: FRONTEND-01, status: success}
      {task_id: DEVOPS-01, status: success}

    Update graph: all → completed

  Iteration 4:
    get_ready_tasks() → [QA-01]
    # QA-01 depends on FRONTEND-01, which just completed
    ...continues...
```

## Task Graph Templates

Store reusable workflows:

```
.claude/workflows/
├── new-product-tasks.yml      # Full product bootstrap
├── new-feature-tasks.yml      # Add feature to existing product
├── bug-fix-tasks.yml          # Bug fix workflow
├── release-tasks.yml          # Release preparation
└── hotfix-tasks.yml           # Emergency production fix
```

Templates use placeholders:

```yaml
# new-feature-tasks.yml

metadata:
  product: "{PRODUCT}"
  feature: "{FEATURE}"

tasks:
  - id: "FEATURE-{FEATURE_ID}-01"
    name: "Design {FEATURE} API"
    agent: "backend-engineer"
    ...
```

Orchestrator substitutes placeholders when instantiating.

## State Persistence

```
products/[product]/.claude/
├── task-graph.yml              # Active task graph
├── task-graph-history/
│   ├── 2025-01-26-foundation.yml
│   ├── 2025-01-27-feature-auth.yml
│   └── ...
└── state.yml                   # Product state (legacy, being phased out)
```

Task graph is source of truth for:
- What work needs to be done
- What's in progress
- What's complete
- Dependencies between work items
- Who's assigned to what

## Benefits Over Manual Management

| Aspect | Before (Manual) | After (Task Graph Engine) |
|--------|----------------|---------------------------|
| **Parallelization** | Orchestrator manually creates worktrees | Automatic detection and parallel invocation |
| **Dependency Tracking** | Orchestrator tracks in state.yml | Graph structure enforces dependencies |
| **Ready Task Detection** | Manual check each time | Instant query: get_ready_tasks() |
| **Progress Visibility** | Parse state.yml, git status | Graph shows all task statuses |
| **Error Handling** | Orchestrator remembers to retry | Graph tracks retry_count per task |
| **Checkpoints** | Hardcoded in orchestrator logic | Declarative checkpoint field |
| **Workflow Reuse** | Copy-paste orchestrator prompts | Template instantiation |
| **Bottleneck Analysis** | Unknown | Critical path calculation |

## Agent Integration

Agents don't need to know about the graph. They:

1. Receive task instructions from Orchestrator
2. Do their work
3. Report back using AgentMessage protocol
4. Orchestrator updates graph based on message

The graph is an Orchestrator implementation detail.

## Future Enhancements

- **Dynamic Graph Modification**: Add tasks during execution (e.g., bug found → add fix task)
- **Learning**: Track actual vs estimated time, improve estimates
- **Resource Constraints**: Limit concurrent agents (cost control)
- **Visualization**: Generate Mermaid diagrams of graph state
- **Rollback**: Undo completed tasks if later tasks fail
