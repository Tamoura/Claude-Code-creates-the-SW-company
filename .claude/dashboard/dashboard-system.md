# Observability Dashboard System

**Phase 2 Enhancement**: CEO-facing metrics, insights, and real-time status.

## Purpose

Give CEO instant visibility into:
- What's happening right now
- How agents are performing
- Where money is being spent
- Product health and progress
- Potential issues before they become problems

## Access

```bash
# View dashboard
/orchestrator dashboard

# Or specific views
/orchestrator dashboard status       # Current status
/orchestrator dashboard performance  # Agent performance
/orchestrator dashboard costs        # Cost breakdown
/orchestrator dashboard products     # Per-product view
```

## Dashboard Views

### 1. Executive Summary (Default)

```markdown
# ConnectSW Dashboard
**Updated**: 2026-01-26 14:30:00

## 🚀 Active Work
- **3 agents** currently working
- **2 tasks** in queue (avg wait: 12min)
- **4 products** in development

## 📊 Today's Activity
- Tasks completed: 15 / 20 planned (75%)
- Success rate: 93% (14/15)
- Avg task time: 85min

## 💰 Resource Usage
- Cost: $80 / $100 daily limit (80%) ⚠️
- Tokens: 1.6M / 2M (80%) ⚠️
- Projected EOD: $95

## 🏗️ Products
┌────────────────────────────────┬──────────┬───────────┐
│ Product                        │ Phase    │ Health    │
├────────────────────────────────┼──────────┼───────────┤
│ stablecoin-gateway             │ Active   │ 🟢 Healthy│
│ connectin                      │ Active   │ 🟢 OnTrack│
│ connectgrc                     │ Dev      │ 🔵 InDev  │
│ quantum-computing-usecases     │ Prototype│ 🔵 Planned│
└────────────────────────────────┴──────────┴───────────┘

## ⚠️ Alerts
- Approaching daily token limit (80%)
- Approaching daily cost limit (80%)

## 📈 Trends (vs yesterday)
- Tasks completed: +20% ↑
- Success rate: -5% ↓
- Avg time per task: -10% ↑ (faster!)
- Cost per task: +5% ↑
```

### 2. Current Status View

```markdown
# Current Status
**Updated**: 2026-01-26 14:30:00

## 🤖 Active Agents (3/5 slots)

### Backend Engineer #1
- Product: analytics-dashboard
- Task: BACKEND-05 - Implement pricing API
- Started: 14:00 (30 min ago)
- Estimated completion: 14:45 (15 min)
- Progress: 65% (based on estimated time)

### Frontend Engineer #1
- Product: connectin
- Task: FRONTEND-12 - Profile page layout
- Started: 14:15 (15 min ago)
- Estimated completion: 15:00 (30 min)
- Progress: 33%

### QA Engineer #1
- Product: stablecoin-gateway
- Task: QA-03 - Testing gate for feature X
- Started: 14:20 (10 min ago)
- Estimated completion: 14:50 (20 min)
- Progress: 50%

## 📋 Queue (2 tasks)

1. **HIGH** - Backend Engineer for connectgrc
   - Task: Implement auth middleware
   - Waiting: 12 min
   - Expected start: 14:45 (when Backend #1 finishes)

2. **NORMAL** - Technical Writer for analytics-dashboard
   - Task: Update API documentation
   - Waiting: 8 min
   - Expected start: 15:00

## ⏸️ Blocked Tasks (0)
No tasks currently blocked.

## ✅ Recently Completed (last hour)
- 14:15 - Frontend Engineer: Calculator page layout (45 min)
- 14:00 - Architect: API contract for analytics (90 min)
- 13:45 - DevOps: CI pipeline for connectgrc (60 min)
```

### 3. Performance View

```markdown
# Agent Performance
**Period**: Last 7 days

## 📊 Overview
- Total tasks: 125
- Success rate: 94% (118/125)
- Failed tasks: 7
- Avg time per task: 82 min

## 🏆 Top Performers

### Backend Engineer
- Tasks: 28
- Success rate: 100% ⭐
- Avg time: 75 min
- Estimate accuracy: 92%
- Learned patterns: 8

### Frontend Engineer
- Tasks: 22
- Success rate: 91%
- Avg time: 90 min (10% slower than estimate)
- Estimate accuracy: 82%
- Common issues: Tailwind CSS (3x), E2E test flakiness (2x)

### QA Engineer
- Tasks: 35
- Success rate: 97%
- Avg time: 42 min
- Testing gates: 28 (passed 1st try: 24/28 = 86%)
- Bugs found: 12

### Architect
- Tasks: 8
- Success rate: 100% ⭐
- Avg time: 165 min
- CEO revisions requested: 1/8 (13%)

## 📉 Areas for Improvement

### Frontend Engineer
**Issue**: E2E tests failing more often than other agents
- Failed tasks: 2/22 (9%)
- Root causes: Tailwind config (3x), test flakiness (2x)
- Recommendation: Add CSS checklist to memory

### DevOps Engineer
**Issue**: Tasks taking longer than estimated
- Avg estimate: 75 min
- Avg actual: 105 min (40% over)
- Recommendation: Adjust estimates for DevOps tasks

## 🎯 Accuracy Trends
```
Estimate Accuracy by Agent:
Backend     ████████████████████░ 92%
QA          █████████████████████ 98%
Architect   ███████████████████░░ 88%
Frontend    ████████████████░░░░░ 82%
DevOps      ██████████████░░░░░░░ 71%
```

### 4. Cost Breakdown View

```markdown
# Cost Analysis
**Period**: Today (2026-01-26)

## 💰 Daily Summary
- Total cost: $80.00 / $100.00 (80%)
- Tokens used: 1,600,000 / 2,000,000 (80%)
- Tasks completed: 15
- Cost per task: $5.33

## 📊 By Model
┌────────┬───────┬─────────┬──────────┬──────────┐
│ Model  │ Tasks │ Tokens  │ Cost     │ Avg/Task │
├────────┼───────┼─────────┼──────────┼──────────┤
│ Haiku  │ 3     │ 180K    │ $0.50    │ $0.17    │
│ Sonnet │ 11    │ 1,320K  │ $66.00   │ $6.00    │
│ Opus   │ 1     │ 100K    │ $13.50   │ $13.50   │
└────────┴───────┴─────────┴──────────┴──────────┘

## 🏢 By Product
┌──────────────────────┬───────┬─────────┬──────────┬─────────┐
│ Product              │ Tasks │ Tokens  │ Cost     │ % Total │
├──────────────────────┼───────┼─────────┼──────────┼─────────┤
│ connectin            │ 6     │ 720K    │ $36.00   │ 45%     │
│ connectgrc           │ 5     │ 560K    │ $28.00   │ 35%     │
│ stablecoin-gateway   │ 2     │ 160K    │ $8.00    │ 10%     │
│ ai-fluency           │ 2     │ 160K    │ $8.00    │ 10%     │
└──────────────────────┴───────┴─────────┴──────────┴─────────┘

## 🤖 By Agent Type
┌───────────────────┬───────┬─────────┬──────────┐
│ Agent             │ Tasks │ Tokens  │ Cost     │
├───────────────────┼───────┼─────────┼──────────┤
│ Backend Engineer  │ 5     │ 400K    │ $20.00   │
│ Frontend Engineer │ 4     │ 360K    │ $18.00   │
│ Architect         │ 2     │ 300K    │ $18.00   │
│ QA Engineer       │ 3     │ 180K    │ $9.00    │
│ DevOps            │ 1     │ 360K    │ $15.00   │
└───────────────────┴───────┴─────────┴──────────┘

## 📈 Cost Trend (Last 7 Days)
```
$100 ┤
 $90 ┤           ╭─●
 $80 ┤         ╭─╯
 $70 ┤    ●──╯
 $60 ┤  ╭─╯
 $50 ┤╭─╯
 $40 ┼●
     └────────────────────
     Mon Tue Wed Thu Fri Sat Today
```

## 💡 Cost Optimization Opportunities
- 3 tasks used Sonnet but could have used Haiku (save $15/day)
- Consider increasing Haiku usage for simple tasks
- Analytics-dashboard using 45% of budget (review if appropriate)

## 📊 Projected Monthly Cost
- Current daily avg: $85
- Projected month: $2,550
- Budget: $3,000
- Status: ✅ On track
```

### 5. Product Health View

```markdown
# Product Health Dashboard
**Updated**: 2026-01-26 14:30:00

## 📦 stablecoin-gateway
**Status**: 🟢 Active | **Health**: Healthy

- **Phase**: Active development
- **Test status**: ✅ All tests passing
- **Recent activity**:
  - Security audit completed
  - Dashboard UI rebuilt
- **Resource usage**: 40% of company total

## 📦 connectin
**Status**: 🟢 Active | **Health**: On Track

- **Phase**: Active development
- **Recent activity**:
  - Profile and feed features complete
- **Resource usage**: 30% of company total

## 📦 connectgrc
**Status**: 🔵 Development | **Health**: In Progress

- **Phase**: Development
- **Resource usage**: 10%

## 📦 quantum-computing-usecases
**Status**: 🔵 Planned | **Health**: Not Started

- **Phase**: Planning
- **Resource usage**: 0%

## 🔍 Overall Health
- Products active: 2
- Products planned: 2
- Blockers: 0
- CEO approvals pending: 0
```

### 6. Task Graph View

```markdown
# Task Graphs
**All Active Products**

## analytics-dashboard

### Current Task Graph Progress
```
PRD-01     ✅ Completed (Product Manager, 2h ago)
  ↓
ARCH-01    ✅ Completed (Architect, 30min ago)
  ↓
DEVOPS-01  🔄 In Progress (DevOps Engineer, started 15min ago)
BACKEND-01 🔄 In Progress (Backend Engineer, started 30min ago)
FRONTEND-01 ⏳ Pending (waiting for slot)
  ↓
QA-01      ⏳ Pending (depends on FRONTEND-01)
  ↓
QA-02      ⏳ Pending (depends on QA-01)
  ↓
CHECKPOINT ⏳ Pending (CEO review after Testing Gate)
```

**Status**: 2/10 tasks complete (20%)
**ETA**: Foundation complete in 2 hours

## connectin

### Active Tasks
```
FRONTEND-12 🔄 In Progress (Frontend Engineer, fixing E2E tests)
QA-05       ⏳ Blocked (waiting for FRONTEND-12 fix)
```

**Status**: 45/48 tasks complete (94%)
**ETA**: Sprint 2.3 complete in 1 day

## 🎯 Critical Path Analysis

**Longest path**: analytics-dashboard foundation (4 hours remaining)
**Bottleneck**: Frontend Engineer (2 tasks waiting, 1 running)
**Recommendation**: Frontend tasks will start when current task finishes
```

## Data Sources

Dashboard pulls from:

```
.claude/
├── memory/
│   ├── metrics/
│   │   ├── agent-performance.json    # Agent stats
│   │   ├── resource-metrics.json     # Resource usage
│   │   └── cost-metrics.json         # Cost tracking
│   └── agent-experiences/            # Task history
├── orchestrator/
│   └── state.yml                     # Active work, queue
└── workflows/
    └── [product]/.claude/
        └── task-graph.yml            # Task progress

products/[name]/.claude/
├── task-graph.yml                    # Product tasks
└── state.yml                         # Product state

Git data:
- Recent commits
- Open PRs
- Branch status
```

## Implementation

### Command Handler

```markdown
When CEO types: /orchestrator dashboard

Orchestrator:
1. Read all metrics files
2. Read all active task graphs
3. Read git status for all products
4. Compile dashboard view
5. Format for terminal display
6. Return to CEO

Uses cached data (updated every 30 seconds) for speed.
```

### Auto-Refresh

```markdown
Option 1: Static snapshot (default)
- Dashboard shows data from time of generation
- CEO can re-run command for latest data

Option 2: Watch mode (future)
- /orchestrator dashboard --watch
- Auto-refreshes every 30 seconds
- Shows live updates
```

## Benefits

### Instant Visibility

**Before Phase 2**:
```
CEO: "What's happening?"
→ Parse YAML files manually
→ Read git logs
→ Check PRs one by one
→ 15 minutes to understand status
```

**After Phase 2**:
```
CEO: "/orchestrator dashboard"
→ Instant comprehensive view
→ 5 seconds to understand everything
```

### Proactive Management

**Before**:
- Don't know about issues until they escalate
- Costs surprise you at month-end
- Agent performance opaque

**After**:
- See issues as they develop
- Real-time cost tracking with alerts
- Agent performance visible and improving

### Data-Driven Decisions

```
Dashboard shows:
- Frontend Engineer 40% over time estimates
- E2E tests failing frequently

CEO action:
- Review with Orchestrator
- Add CSS checklist to frontend memory
- Adjust estimates for future tasks
- Monitor improvement

Result:
- Next sprint: Frontend on time, tests passing
```

## Future Enhancements

- **Web UI**: Beautiful web dashboard (beyond terminal)
- **Historical charts**: Trends over weeks/months
- **Predictive analytics**: "Project will be late" warnings
- **Custom views**: CEO can configure what they want to see
- **Alerts integration**: Push notifications for critical events
- **Export reports**: PDF/CSV for stakeholders
