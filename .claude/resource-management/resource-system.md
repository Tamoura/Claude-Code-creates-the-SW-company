# Resource Management System

**Phase 2 Enhancement**: Control costs, prevent resource contention, ensure predictable performance.

## Purpose

Manage finite resources (agent concurrency, tokens, costs) to:
- Stay within budget
- Prevent resource exhaustion
- Ensure fair scheduling across products
- Provide predictable performance

## Architecture

```
CEO Request
    ↓
Orchestrator receives task
    ↓
Check Resource Limits
    ├→ Can we run this now?
    ├→ Token budget available?
    ├→ Cost limit not exceeded?
    └→ Agent slot available?
    ↓
Yes → Execute immediately
No  → Add to queue
    ↓
Queue Manager
    ├→ Priority-based scheduling
    ├→ Fair allocation across products
    └→ Starvation prevention
    ↓
Agent invoked when resources available
    ↓
Track usage
    ├→ Tokens used
    ├→ Cost incurred
    ├→ Time taken
    └→ Update agent memory
```

## Key Components

### 1. Agent Concurrency Control

**Problem**: Too many agents running = high costs, potential rate limits

**Solution**: Limit concurrent agents

```yaml
max_concurrent:
  total: 5                    # Max 5 agents at once
  per_type:
    backend-engineer: 2       # Max 2 backend engineers in parallel
    frontend-engineer: 2      # Max 2 frontend engineers in parallel
```

**How it works**:
```
Task graph has 5 ready tasks:
- 3 backend tasks
- 2 frontend tasks

Resource manager:
1. Check: Can run 2 backend + 2 frontend = 4 total
2. OK, within limits (5 total, 2 per type)
3. Invoke 4 agents in parallel
4. Last backend task waits in queue
5. When one finishes, last task starts
```

### 2. Token Budgets

**Problem**: Runaway token usage = unexpected costs

**Solution**: Budget per agent type

```yaml
token_budgets:
  architect: 150000       # Architects get more (complex analysis)
  backend-engineer: 80000 # Standard implementation budget
  qa-engineer: 60000      # Testing more straightforward
```

**How it works**:
```
Architect task starts:
1. Check budget: 150,000 tokens available
2. Invoke with max_tokens parameter
3. Task uses 120,000 tokens
4. Track actual usage in memory
5. If task needed more, could get 1.5x budget (multiplier)
6. If consistently over budget, adjust estimates
```

### 3. Priority Queue

**Problem**: All tasks treated equally, critical work waits

**Solution**: Priority-based scheduling

```yaml
priority_levels:
  critical:   # Production issues
    max_wait_time_minutes: 0
    preempt_lower: true       # Can interrupt normal tasks

  high:       # New products, major features
    max_wait_time_minutes: 15

  normal:     # Standard work
    max_wait_time_minutes: 60

  low:        # Nice-to-haves
    max_wait_time_minutes: 240
```

**Scheduling algorithm**:
```
Priority score = (
  priority_weight * 0.5 +     # 50% based on priority level
  wait_time_weight * 0.3 +    # 30% based on how long waiting
  blocking_weight * 0.2       # 20% based on blocking other tasks
)

Where:
- priority_weight: critical=1.0, high=0.75, normal=0.5, low=0.25
- wait_time_weight: (minutes_waiting / max_wait_time)
- blocking_weight: (num_tasks_blocked / total_tasks)
```

**Example**:
```
Queue has 3 tasks:
1. Normal priority, waiting 45 mins, blocks 2 tasks
2. High priority, waiting 5 mins, blocks 0 tasks
3. Low priority, waiting 120 mins, blocks 1 task

Scores:
1. (0.5 * 0.5) + (45/60 * 0.3) + (2/10 * 0.2) = 0.25 + 0.225 + 0.04 = 0.515
2. (0.75 * 0.5) + (5/15 * 0.3) + (0/10 * 0.2) = 0.375 + 0.1 + 0 = 0.475
3. (0.25 * 0.5) + (120/240 * 0.3) + (1/10 * 0.2) = 0.125 + 0.15 + 0.02 = 0.295

Task 1 runs first (highest score, despite being normal priority)
```

### 4. Cost Control

**Problem**: Unpredictable costs

**Solution**: Daily limits + alerts

```yaml
daily_limits:
  max_tokens_total: 2000000     # 2M tokens/day
  max_cost_usd: 100             # $100/day
  alert_at_percent: 80          # Alert at 80%
```

**Cost tracking**:
```json
{
  "date": "2026-01-26",
  "tokens_used": 1600000,
  "cost_usd": 80,
  "limits": {
    "tokens": 2000000,
    "cost": 100
  },
  "percent_used": {
    "tokens": 80,
    "cost": 80
  },
  "alerts_triggered": [
    {
      "time": "14:30",
      "message": "Approaching daily token limit (80%)"
    }
  ]
}
```

### 5. Auto Model Selection

**Problem**: Using expensive models when cheap ones sufficient

**Solution**: Automatic model selection based on task

```yaml
rules:
  - condition: "task.priority == critical"
    model: "opus"              # Use best model for emergencies

  - condition: "task.estimated_minutes < 30"
    model: "haiku"             # Use cheap model for quick tasks

  - condition: "default"
    model: "sonnet"            # Standard model for most work
```

**Cost comparison**:
```
Task: "Fix typo in README" (5 minutes)
- Using Opus: 100K tokens * $15/M = $1.50
- Using Haiku: 100K tokens * $0.25/M = $0.025
Savings: $1.48 (98%)

Task: "Design complex distributed system" (2 hours, critical)
- Using Opus: Worth the cost for quality
- Using Haiku: Would produce inferior design
Decision: Use Opus
```

## Integration with Orchestrator

### Before Invoking Agent

```markdown
Orchestrator checks:

1. **Concurrency check**:
   Can we start another backend-engineer task?
   - Currently running: 1 backend
   - Limit: 2 backend
   - Answer: YES, can start

2. **Cost check**:
   Are we within daily limits?
   - Tokens used today: 1.2M
   - Limit: 2M
   - Answer: YES, 600K tokens remaining

3. **Queue check**:
   Any higher priority tasks waiting?
   - Queue: 2 normal tasks, 0 high/critical
   - Current task: normal
   - Answer: OK to proceed

4. **Model selection**:
   Which model should this task use?
   - Task: backend implementation
   - Estimated time: 90 minutes
   - Priority: normal
   - Model: sonnet (standard choice)

5. **Token budget**:
   How many tokens can this agent use?
   - Agent type: backend-engineer
   - Budget: 80,000 tokens
   - Multiplier: 1.5x if needed
   - Max: 120,000 tokens

Decision: INVOKE AGENT
```

### If Resources Not Available

```markdown
Add to queue:

{
  "task_id": "TASK-042",
  "product": "analytics-dashboard",
  "agent": "backend-engineer",
  "priority": "normal",
  "queued_at": "2026-01-26T14:30:00Z",
  "estimated_tokens": 80000,
  "reason_queued": "Max backend engineers (2) already running",
  "expected_start": "2026-01-26T15:00:00Z"  # When current task finishes
}

Queue manager:
- Monitors running agents
- When slot opens, starts highest priority queued task
- Notifies CEO if task waits > max_wait_time
```

### After Agent Completes

```markdown
Update resources:

1. Release agent slot:
   - backend-engineer: 2/2 → 1/2 (one slot free)

2. Record usage:
   - Tokens used: 75,000
   - Cost: $2.25
   - Time: 85 minutes
   - Update daily totals

3. Update agent memory:
   - Estimated: 80,000 tokens, 90 minutes
   - Actual: 75,000 tokens, 85 minutes
   - Accuracy: Good! (close to estimate)

4. Check queue:
   - Any backend tasks waiting? YES (1 task)
   - Start next task immediately

5. Check alerts:
   - Daily usage now 1,275,000 tokens
   - Still OK (63% of limit)
```

## Monitoring Dashboard Integration

Resource metrics feed into CEO dashboard:

```markdown
## Resource Usage

**Today (2026-01-26)**

### Agents
- Active: 3/5 (60% utilization)
- Queue: 2 tasks waiting
- Avg wait time: 12 minutes

### Costs
- Tokens used: 1,600,000 / 2,000,000 (80%) ⚠️
- Cost: $80 / $100 (80%) ⚠️
- Projected EOD: $95

### Models
- Haiku: 5 tasks, $1.50
- Sonnet: 18 tasks, $72.50
- Opus: 2 tasks (critical), $6.00

### By Product
- gpu-calculator: 35% of tokens
- it4it-dashboard: 45% of tokens
- tech-management-helper: 20% of tokens
```

## Benefits

### Cost Predictability

**Before Phase 2**:
```
Month 1: $500 (unexpected)
Month 2: $1,200 (way over!)
Month 3: $300 (finally under control?)
```

**After Phase 2**:
```
Month 1: $2,000 (planned: $2,000) ✅
Month 2: $2,100 (planned: $2,000, +5% acceptable) ✅
Month 3: $1,950 (planned: $2,000) ✅

Predictable!
```

### Resource Efficiency

```
Before: Run 10 agents simultaneously
- Cost: $50/day
- 5 agents waiting for others (wasted)
- Rate limits hit

After: Limit to 5 concurrent agents
- Cost: $40/day (-20%)
- All agents productive
- No rate limit issues
- Better quality (agents not rushed)
```

### Fair Allocation

```
Before: First-come-first-served
- Product A hogs all resources
- Product B waits hours

After: Priority-based with fairness
- Critical work preempts normal
- But low priority eventually runs (starvation prevention)
- Products share resources fairly
```

## Configuration

CEO can adjust limits in `.claude/resource-management/resource-limits.yml`:

```yaml
# Increase daily budget
daily_limits:
  max_cost_usd: 200           # Was 100, now 200

# Give priority to specific product
products:
  urgent-project:
    priority: "critical"
    max_concurrent_agents: 8  # More agents for this product
    token_budget_daily: 1000000

# Adjust model selection
auto_model_selection:
  rules:
    - condition: "task.product == urgent-project"
      model: "opus"           # Always use best model
```

## Emergency Controls

### Circuit Breaker

If costs spiral out of control:

```yaml
circuit_breaker:
  trip_conditions:
    - "cost_daily_usd > daily_limits.max_cost_usd"

  when_tripped:
    action: "pause_all"
    notify: "ceo"
    allow_override: true
```

**What happens**:
```
1. Cost hits $100 (daily limit)
2. Circuit breaker trips
3. All new work paused
4. CEO notified: "Daily cost limit reached"
5. CEO can:
   - Approve higher limit for today
   - Let work resume tomorrow
   - Investigate why costs are high
```

### Manual Override

CEO can manually control:

```yaml
manual_override:
  pause_all_agents: true              # Stop everything
  priority_override:
    critical-product: "critical"      # Boost specific product
```

## Metrics & Optimization

Track in `.claude/memory/metrics/resource-metrics.json`:

```json
{
  "agent_utilization": {
    "backend-engineer": 0.75,         # 75% busy (good!)
    "frontend-engineer": 0.80,        # 80% busy (good!)
    "qa-engineer": 0.45,              # 45% busy (underutilized?)
    "architect": 0.30                 # 30% busy (expected for architect)
  },
  "cost_efficiency": {
    "cost_per_task": 4.50,            # $4.50 average per task
    "tokens_per_task": 90000,         # 90K tokens average
    "tasks_per_dollar": 0.22          # 0.22 tasks per dollar
  },
  "queue_performance": {
    "avg_wait_time_minutes": 18,
    "max_wait_time_minutes": 45,
    "tasks_that_waited": 0.35         # 35% of tasks waited
  },
  "recommendations": [
    "Consider reducing QA agent limit (underutilized)",
    "Backend engineers at good utilization",
    "Queue wait times acceptable"
  ]
}
```

## Future Enhancements

- **Dynamic pricing**: Adjust limits based on actual costs
- **Spot instances**: Use cheaper compute when available
- **Batch processing**: Group similar tasks for efficiency
- **Caching**: Reuse results for similar tasks
- **Load prediction**: Forecast resource needs
