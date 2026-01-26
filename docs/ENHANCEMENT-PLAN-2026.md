# ConnectSW Enhancement Plan 2026
## Claude Code Compatible

**Created**: 2026-01-26  
**Status**: Draft for CEO Review  
**Architecture**: All enhancements work with Claude Code's Task tool invocation model

---

## Architecture Constraints

This system runs on **Claude Code**:
- Orchestrator is invoked via `/orchestrator` command
- Agents are invoked via Task tool (single invocation, not persistent)
- All state is **file-based** (YAML, JSON, Markdown)
- No persistent servers or WebSocket connections
- Communication is through files and git
- MCP tools must be actual configured MCP servers

### What Works ✅
- Task graph templates (YAML files)
- Memory system (JSON files agents read/write)
- Shell scripts agents can execute
- Pre-commit hooks (local git)
- Markdown reports and dashboards
- File-based audit trails

### What Doesn't Work ❌
- Persistent servers/daemons
- WebSocket real-time updates
- Custom MCP server implementations
- Event bus / pub-sub systems
- Running web UIs

---

## Priority 1: Critical Missing Pieces

### 1.1 Missing Task Graph Templates

**Status**: ❌ Missing 3 of 5 templates

| Template | Status | Priority |
|----------|--------|----------|
| new-product-tasks.yml | ✅ Exists | - |
| bug-fix-tasks.yml | ✅ Exists | - |
| new-feature-tasks.yml | ❌ Missing | Critical |
| release-tasks.yml | ❌ Missing | Critical |
| hotfix-tasks.yml | ❌ Missing | High |

**Implementation**: Create YAML files in `.claude/workflows/templates/`

```yaml
# .claude/workflows/templates/new-feature-tasks.yml
metadata:
  workflow_type: "new-feature"
  product: "{PRODUCT}"
  feature: "{FEATURE}"

tasks:
  - id: "DESIGN-{FEATURE_ID}"
    name: "Design {FEATURE}"
    description: "Review PRD, design API changes and UI updates needed"
    agent: "architect"
    depends_on: []
    produces:
      - name: "Feature Design"
        type: "document"
        path: "products/{PRODUCT}/docs/features/{FEATURE}.md"
    checkpoint: true
    estimated_time_minutes: 60
    
  - id: "BACKEND-{FEATURE_ID}"
    name: "Implement Backend for {FEATURE}"
    agent: "backend-engineer"
    depends_on: ["DESIGN-{FEATURE_ID}"]
    parallel_ok: true
    
  - id: "FRONTEND-{FEATURE_ID}"
    name: "Implement Frontend for {FEATURE}"
    agent: "frontend-engineer"
    depends_on: ["DESIGN-{FEATURE_ID}"]
    parallel_ok: true
    
  - id: "QA-{FEATURE_ID}"
    name: "Test {FEATURE}"
    agent: "qa-engineer"
    depends_on: ["BACKEND-{FEATURE_ID}", "FRONTEND-{FEATURE_ID}"]
    
  - id: "CHECKPOINT-{FEATURE_ID}"
    name: "Feature Complete - CEO Review"
    checkpoint: true
    depends_on: ["QA-{FEATURE_ID}"]
```

**Effort**: Low | **Files to create**: 3

---

### 1.2 Task Graph Instantiation Script

**Problem**: Orchestrator manually substitutes placeholders in templates  
**Solution**: Shell script that orchestrator can invoke

```bash
#!/bin/bash
# .claude/scripts/instantiate-task-graph.sh

TEMPLATE=$1    # e.g., "new-feature"
PRODUCT=$2     # e.g., "gpu-calculator"
PARAMS=$3      # e.g., "FEATURE=dark-mode,FEATURE_ID=DM01"

# Read template
TEMPLATE_FILE=".claude/workflows/templates/${TEMPLATE}-tasks.yml"

# Substitute placeholders
OUTPUT=$(cat "$TEMPLATE_FILE")
OUTPUT="${OUTPUT//\{PRODUCT\}/$PRODUCT}"
OUTPUT="${OUTPUT//\{TIMESTAMP\}/$(date -u +%Y-%m-%dT%H:%M:%SZ)}"

# Parse additional params
IFS=',' read -ra PAIRS <<< "$PARAMS"
for pair in "${PAIRS[@]}"; do
  KEY="${pair%%=*}"
  VALUE="${pair#*=}"
  OUTPUT="${OUTPUT//\{$KEY\}/$VALUE}"
done

# Save to product
mkdir -p "products/$PRODUCT/.claude"
echo "$OUTPUT" > "products/$PRODUCT/.claude/task-graph.yml"

echo "Task graph created: products/$PRODUCT/.claude/task-graph.yml"
```

**Usage by Orchestrator**:
```bash
.claude/scripts/instantiate-task-graph.sh new-feature gpu-calculator "FEATURE=dark-mode,FEATURE_ID=DM01"
```

**Effort**: Low | **Files**: 1

---

### 1.3 Agent Memory Reading Pattern

**Problem**: Agent instructions say "read memory" but don't specify exact commands  
**Solution**: Standardize memory reading commands in agent prompts

**Update each agent's Task invocation**:
```markdown
## FIRST: Read Your Memory (3 commands)

```bash
# 1. Your experience file
cat .claude/memory/agent-experiences/backend-engineer.json

# 2. Company patterns relevant to your role
cat .claude/memory/company-knowledge.json | jq '.patterns[] | select(.category == "backend")'

# 3. Recent decisions for this product
cat .claude/memory/decision-log.json | jq '.decisions[] | select(.product == "{PRODUCT}")' | tail -5
```

Apply learned patterns where confidence >= "high".
```

**Effort**: Low | **Files**: Update orchestrator.md

---

### 1.4 Memory Update Script

**Problem**: Agents told to "update memory" but no standard way  
**Solution**: Shell script agents invoke after completing tasks

```bash
#!/bin/bash
# .claude/scripts/update-agent-memory.sh

AGENT=$1           # e.g., "backend-engineer"
TASK_ID=$2         # e.g., "BACKEND-01"
PRODUCT=$3         # e.g., "gpu-calculator"
STATUS=$4          # "success" or "failure"
TIME_MINUTES=$5    # e.g., "90"
SUMMARY=$6         # Brief summary

MEMORY_FILE=".claude/memory/agent-experiences/${AGENT}.json"

# Create entry
ENTRY=$(cat <<EOF
{
  "task_id": "$TASK_ID",
  "product": "$PRODUCT",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "$STATUS",
  "time_minutes": $TIME_MINUTES,
  "summary": "$SUMMARY"
}
EOF
)

# Append to task_history in memory file
jq --argjson entry "$ENTRY" '.task_history += [$entry]' "$MEMORY_FILE" > "${MEMORY_FILE}.tmp"
mv "${MEMORY_FILE}.tmp" "$MEMORY_FILE"

echo "Memory updated for $AGENT"
```

**Usage by agents at task completion**:
```bash
.claude/scripts/update-agent-memory.sh backend-engineer BACKEND-01 gpu-calculator success 90 "Implemented pricing API"
```

**Effort**: Low | **Files**: 1

---

## Priority 2: Quality & Testing

### 2.1 Quality Gates Runner Enhancement

**Current**: `.claude/quality-gates/executor.sh` exists but limited  
**Enhancement**: Add more detailed output and failure handling

```bash
#!/bin/bash
# .claude/quality-gates/executor.sh (enhanced)

GATE=$1       # security | performance | testing | production
PRODUCT=$2

REPORT_DIR="products/$PRODUCT/docs/quality-reports"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/${GATE}-$(date +%Y%m%d-%H%M%S).md"

case $GATE in
  security)
    echo "# Security Gate Report" > "$REPORT_FILE"
    echo "**Product**: $PRODUCT" >> "$REPORT_FILE"
    echo "**Date**: $(date)" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Run npm audit
    echo "## Dependency Audit" >> "$REPORT_FILE"
    cd "products/$PRODUCT/apps/api" && npm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities' >> "$REPORT_FILE"
    
    # Check for secrets
    echo "## Secret Scanning" >> "$REPORT_FILE"
    grep -r "API_KEY\|SECRET\|PASSWORD" products/$PRODUCT --include="*.ts" --include="*.tsx" | grep -v ".env" >> "$REPORT_FILE" || echo "No secrets found" >> "$REPORT_FILE"
    
    echo "Security gate complete. Report: $REPORT_FILE"
    ;;
    
  testing)
    echo "# Testing Gate Report" > "$REPORT_FILE"
    cd "products/$PRODUCT"
    
    # Run tests with coverage
    npm run test -- --coverage --json > test-results.json 2>&1
    
    # Parse results
    PASSED=$(jq '.numPassedTests' test-results.json)
    FAILED=$(jq '.numFailedTests' test-results.json)
    COVERAGE=$(jq '.coverageMap.total.lines.pct' test-results.json 2>/dev/null || echo "N/A")
    
    echo "## Results" >> "$REPORT_FILE"
    echo "- Passed: $PASSED" >> "$REPORT_FILE"
    echo "- Failed: $FAILED" >> "$REPORT_FILE"
    echo "- Coverage: $COVERAGE%" >> "$REPORT_FILE"
    
    if [ "$FAILED" -gt 0 ]; then
      echo "FAIL"
      exit 1
    fi
    echo "PASS"
    ;;
esac
```

**Effort**: Medium | **Files**: 1

---

### 2.2 Testing Gate Checklist Script

**Problem**: QA engineer manually checks various things  
**Solution**: Automated checklist that returns PASS/FAIL

```bash
#!/bin/bash
# .claude/scripts/testing-gate-checklist.sh

PRODUCT=$1
PASSED=0
FAILED=0

check() {
  NAME=$1
  CMD=$2
  
  if eval "$CMD" > /dev/null 2>&1; then
    echo "✅ $NAME"
    ((PASSED++))
  else
    echo "❌ $NAME"
    ((FAILED++))
  fi
}

echo "=== Testing Gate: $PRODUCT ==="
echo ""

cd "products/$PRODUCT"

# Unit tests
check "Unit tests pass" "npm run test:run"

# E2E tests  
check "E2E tests pass" "npm run test:e2e"

# Coverage
check "Coverage >= 80%" "npm run test -- --coverage | grep -E 'All files.*[8-9][0-9]|100'"

# Dev server starts
check "Dev server starts" "timeout 10 npm run dev &>/dev/null & sleep 5 && curl -s http://localhost:3100 > /dev/null"

# No console errors (check for console.error in code)
check "No console.error in production code" "! grep -r 'console.error' apps/*/src --include='*.ts' --include='*.tsx' | grep -v test | grep -v '.d.ts'"

# Linting
check "Linting passes" "npm run lint"

echo ""
echo "=== Results ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ "$FAILED" -gt 0 ]; then
  echo ""
  echo "TESTING GATE: FAIL"
  exit 1
else
  echo ""
  echo "TESTING GATE: PASS"
  exit 0
fi
```

**Usage by QA agent**:
```bash
.claude/scripts/testing-gate-checklist.sh gpu-calculator
```

**Effort**: Low | **Files**: 1

---

## Priority 3: Task Graph Execution

### 3.1 Task Graph Status Script

**Problem**: Orchestrator manually parses task graph YAML  
**Solution**: Script to query task graph status

```bash
#!/bin/bash
# .claude/scripts/task-graph-status.sh

PRODUCT=$1
GRAPH_FILE="products/$PRODUCT/.claude/task-graph.yml"

if [ ! -f "$GRAPH_FILE" ]; then
  echo "No active task graph for $PRODUCT"
  exit 1
fi

echo "=== Task Graph: $PRODUCT ==="
echo ""

# Count by status (using yq or simple parsing)
PENDING=$(grep -c "status: \"pending\"" "$GRAPH_FILE" || echo 0)
IN_PROGRESS=$(grep -c "status: \"in_progress\"" "$GRAPH_FILE" || echo 0)
COMPLETED=$(grep -c "status: \"completed\"" "$GRAPH_FILE" || echo 0)
FAILED=$(grep -c "status: \"failed\"" "$GRAPH_FILE" || echo 0)

TOTAL=$((PENDING + IN_PROGRESS + COMPLETED + FAILED))

echo "Total tasks: $TOTAL"
echo "✅ Completed: $COMPLETED"
echo "🔄 In Progress: $IN_PROGRESS"
echo "⏳ Pending: $PENDING"
echo "❌ Failed: $FAILED"
echo ""
echo "Progress: $((COMPLETED * 100 / TOTAL))%"
```

**Effort**: Low | **Files**: 1

---

### 3.2 Get Ready Tasks Script

**Problem**: Orchestrator calculates ready tasks manually  
**Solution**: Script that returns ready tasks as JSON

```bash
#!/bin/bash
# .claude/scripts/get-ready-tasks.sh

PRODUCT=$1
GRAPH_FILE="products/$PRODUCT/.claude/task-graph.yml"

# This would ideally use yq or a YAML parser
# For now, output guidance for orchestrator

echo "Ready tasks analysis for $PRODUCT"
echo ""
echo "Tasks with status='pending' where all depends_on tasks are 'completed':"
echo ""
echo "Run this TypeScript for accurate results:"
echo "npx tsx .claude/engine/task-graph-executor.ts $PRODUCT --ready-only"
```

**Effort**: Low (use existing task-graph-executor.ts)

---

## Priority 4: Dashboard as Markdown Report

### 4.1 Dashboard Generator Script

**Problem**: Dashboard documented as web UI (not Claude Code compatible)  
**Solution**: Generate markdown dashboard that orchestrator returns to CEO

```bash
#!/bin/bash
# .claude/scripts/generate-dashboard.sh

OUTPUT=".claude/dashboard/latest-report.md"

echo "# ConnectSW Dashboard" > "$OUTPUT"
echo "**Generated**: $(date)" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Active products
echo "## 🏗️ Products" >> "$OUTPUT"
for product_dir in products/*/; do
  product=$(basename "$product_dir")
  
  # Check for task graph
  if [ -f "$product_dir/.claude/task-graph.yml" ]; then
    status="🔄 Active"
  else
    status="⏸️ Idle"
  fi
  
  echo "- **$product**: $status" >> "$OUTPUT"
done
echo "" >> "$OUTPUT"

# Git status
echo "## 📊 Git Status" >> "$OUTPUT"
echo "\`\`\`" >> "$OUTPUT"
git branch --show-current >> "$OUTPUT"
git log --oneline -5 >> "$OUTPUT"
echo "\`\`\`" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Open PRs
echo "## 🔀 Open Pull Requests" >> "$OUTPUT"
gh pr list --state open 2>/dev/null >> "$OUTPUT" || echo "Unable to fetch PRs" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Recent activity
echo "## 📈 Recent Agent Activity" >> "$OUTPUT"
for agent_file in .claude/memory/agent-experiences/*.json; do
  agent=$(basename "$agent_file" .json)
  last_task=$(jq -r '.task_history[-1] // empty' "$agent_file" 2>/dev/null)
  if [ -n "$last_task" ]; then
    echo "- **$agent**: $(echo $last_task | jq -r '.summary // .task_id')" >> "$OUTPUT"
  fi
done

echo ""
echo "Dashboard generated: $OUTPUT"
cat "$OUTPUT"
```

**Usage**: Orchestrator runs this and returns output to CEO

**Effort**: Low | **Files**: 1

---

## Priority 5: Agent Onboarding (As Instructions)

### 5.1 New Agent Checklist Document

**Problem**: No guide for setting up new agent types  
**Solution**: Markdown checklist (not a "system")

```markdown
# .claude/docs/AGENT-ONBOARDING.md

## Adding a New Agent Type

### 1. Create Agent Instructions
Create `.claude/agents/[new-agent].md` with:
- Role description
- Responsibilities
- Memory reading instructions
- Code patterns and examples
- Commit message format
- Working with other agents

### 2. Create Memory File
Create `.claude/memory/agent-experiences/[new-agent].json`:
```json
{
  "agent": "[new-agent]",
  "version": "1.0.0",
  "updated_at": "ISO-8601",
  "learned_patterns": [],
  "task_history": [],
  "common_mistakes": [],
  "preferred_approaches": [],
  "performance_metrics": {
    "tasks_completed": 0,
    "success_rate": 1.0
  }
}
```

### 3. Add to Capability Matrix
Update `.claude/agents/capability-matrix.yml` (if exists)

### 4. Update Orchestrator
Add agent to available agents table in `.claude/commands/orchestrator.md`

### 5. Create Sample Task Graph Entry
Add example task using this agent to relevant templates
```

**Effort**: Low | **Files**: 1

---

## Priority 6: Audit Trail

### 6.1 Audit Log Script

**Problem**: No audit trail of actions  
**Solution**: Append-only JSON log file

```bash
#!/bin/bash
# .claude/scripts/audit-log.sh

ACTION=$1      # e.g., "TASK_STARTED", "TASK_COMPLETED", "CHECKPOINT", "CEO_APPROVAL"
ACTOR=$2       # e.g., "orchestrator", "backend-engineer", "ceo"
TARGET=$3      # e.g., "gpu-calculator/BACKEND-01"
DETAILS=$4     # Additional details

LOG_FILE=".claude/audit/$(date +%Y-%m).jsonl"
mkdir -p .claude/audit

ENTRY=$(cat <<EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","action":"$ACTION","actor":"$ACTOR","target":"$TARGET","details":"$DETAILS"}
EOF
)

echo "$ENTRY" >> "$LOG_FILE"
echo "Audit logged: $ACTION by $ACTOR"
```

**Usage**:
```bash
.claude/scripts/audit-log.sh "TASK_COMPLETED" "backend-engineer" "gpu-calculator/BACKEND-01" "Implemented pricing API"
```

**Effort**: Low | **Files**: 1

---

## Priority 7: Risk Calculator Enhancement

### 7.1 Risk Calculator CLI

**Current**: TypeScript file exists but needs CLI interface  
**Enhancement**: Make it callable from shell

```bash
#!/bin/bash
# .claude/scripts/calculate-risk.sh

PRODUCT=$1
TASK_ID=$2

# Call the TypeScript risk calculator
npx tsx .claude/checkpointing/risk-calculator.ts "$PRODUCT" "$TASK_ID"
```

**Output**:
```
Risk Score: 0.45
Level: LOW
Action: AUTO_APPROVE
Reason: Standard feature implementation, low complexity, experienced agent
```

**Effort**: Low | **Files**: 1

---

## Implementation Summary

### Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `.claude/workflows/templates/new-feature-tasks.yml` | Feature workflow | Critical |
| `.claude/workflows/templates/release-tasks.yml` | Release workflow | Critical |
| `.claude/workflows/templates/hotfix-tasks.yml` | Hotfix workflow | High |
| `.claude/scripts/instantiate-task-graph.sh` | Create task graph from template | High |
| `.claude/scripts/update-agent-memory.sh` | Update agent memory after task | High |
| `.claude/scripts/testing-gate-checklist.sh` | Automated testing checklist | High |
| `.claude/scripts/task-graph-status.sh` | Get task graph status | Medium |
| `.claude/scripts/generate-dashboard.sh` | Generate markdown dashboard | Medium |
| `.claude/scripts/audit-log.sh` | Append to audit trail | Medium |
| `.claude/scripts/calculate-risk.sh` | CLI for risk calculator | Low |
| `.claude/docs/AGENT-ONBOARDING.md` | Guide for new agents | Low |

### Files to Update

| File | Change |
|------|--------|
| `.claude/commands/orchestrator.md` | Add memory reading commands |
| `.claude/quality-gates/executor.sh` | Enhanced output |
| `.claude/agents/*.md` | Standardize memory commands |

---

## What I Removed from Previous Plan

These don't work with Claude Code's invocation model:

| Item | Why Removed |
|------|-------------|
| Dashboard Web UI | Claude Code can't run persistent servers |
| WebSocket updates | No persistent connections |
| Event-driven architecture | No background processes |
| MCP server implementations | MCP servers are external, not in-repo |
| Agent onboarding "system" | Made it a checklist instead |
| Real-time notifications | Made it checkpoint-based instead |

---

## Next Steps

1. **Implement Critical templates** (new-feature, release, hotfix)
2. **Add shell scripts** for orchestrator to use
3. **Update agent prompts** with standardized memory commands
4. **Test workflow** end-to-end with Task tool

All enhancements are **file-based** and **Claude Code compatible**.

---

*Ready for CEO review and prioritization.*
