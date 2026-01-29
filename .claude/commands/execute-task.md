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

When complete, create an AgentMessage in JSON format for automatic task graph and memory updates:

```json
{
  "metadata": {
    "from": "[agent-name]",
    "to": "orchestrator",
    "timestamp": "[ISO-8601 timestamp]",
    "message_type": "task_complete",
    "product": "[product]",
    "task_id": "[task-id]"
  },
  "payload": {
    "status": "success",
    "summary": "[brief description of what was accomplished]",
    "artifacts": [
      {
        "path": "[file path]",
        "type": "file",
        "description": "[what this file does]"
      }
    ],
    "context": {
      "decisions_made": ["[decision 1]", "[decision 2]"],
      "assumptions": ["[assumption 1]"],
      "notes": ["[important note]"]
    },
    "metrics": {
      "time_spent_minutes": 45,
      "files_changed": 5,
      "tests_added": 12,
      "tests_passing": true,
      "coverage_percent": 85
    }
  }
}
```

Then route the message for automatic processing:
```bash
npx tsx .claude/protocols/message-router.ts '[JSON message above]'
```

**Benefits of AgentMessage format**:
- ✅ Automatic task graph status updates
- ✅ Automatic agent memory updates
- ✅ Structured data for analytics
- ✅ Easy integration with orchestrator
- ✅ Checkpoint creation when needed

**Alternative (Legacy)**: If you prefer manual updates:
```bash
.claude/scripts/update-agent-memory.sh [agent-name] [task-id] [product] [status] [minutes] "[summary]"
```

---
