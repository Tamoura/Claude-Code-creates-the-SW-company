#!/bin/bash
# generate-dashboard.sh
# Generates a markdown dashboard report for CEO
# Usage: ./generate-dashboard.sh [output-file]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

REPORT_DIR="$REPO_ROOT/.claude/dashboard/reports"
mkdir -p "$REPORT_DIR"
DATED_FILE="$REPORT_DIR/$(date +%Y-%m-%d).md"
LATEST_FILE="$REPO_ROOT/.claude/dashboard/latest-report.md"
OUTPUT_FILE=${1:-"$DATED_FILE"}

# Start report
cat > "$OUTPUT_FILE" << EOF
# ConnectSW Dashboard

**Generated**: $(date)
**Branch**: $(git branch --show-current 2>/dev/null || echo "N/A")

---

EOF

# ============================================================================
# Products Overview
# ============================================================================
cat >> "$OUTPUT_FILE" << EOF
## 🏗️ Products

| Product | Status | Progress | Active Task |
|---------|--------|----------|-------------|
EOF

for product_dir in "$REPO_ROOT"/products/*/; do
  if [ -d "$product_dir" ]; then
    product=$(basename "$product_dir")
    
    # Check for task graph
    if [ -f "$product_dir/.claude/task-graph.yml" ]; then
      COMPLETED=$(grep -c 'status: "completed"' "$product_dir/.claude/task-graph.yml" 2>/dev/null || echo "0")
      TOTAL=$(grep -c '  - id:' "$product_dir/.claude/task-graph.yml" 2>/dev/null || echo "1")
      PROGRESS=$((COMPLETED * 100 / TOTAL))
      
      IN_PROGRESS=$(grep -B5 'status: "in_progress"' "$product_dir/.claude/task-graph.yml" 2>/dev/null | grep "name:" | head -1 | sed 's/.*name: "\(.*\)"/\1/' || echo "-")
      
      status="🔄 Active"
    else
      status="⏸️ Idle"
      PROGRESS="-"
      IN_PROGRESS="-"
    fi
    
    echo "| $product | $status | $PROGRESS% | $IN_PROGRESS |" >> "$OUTPUT_FILE"
  fi
done

cat >> "$OUTPUT_FILE" << EOF

---

## 📊 Git Status

\`\`\`
EOF

# Git info
echo "Branch: $(git branch --show-current 2>/dev/null || echo 'N/A')" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "Recent commits:" >> "$OUTPUT_FILE"
git log --oneline -5 2>/dev/null >> "$OUTPUT_FILE" || echo "Unable to get git log" >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << EOF
\`\`\`

---

## 🔀 Open Pull Requests

EOF

if command -v gh &> /dev/null; then
  gh pr list --state open 2>/dev/null >> "$OUTPUT_FILE" || echo "No PRs or unable to fetch" >> "$OUTPUT_FILE"
else
  echo "*GitHub CLI not installed - unable to fetch PRs*" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << EOF

---

## 📈 Agent Activity (Recent)

| Agent | Last Task | Status | Product |
|-------|-----------|--------|---------|
EOF

# Read agent memories for recent activity
for agent_file in "$REPO_ROOT"/.claude/memory/agent-experiences/*.json; do
  if [ -f "$agent_file" ]; then
    agent=$(basename "$agent_file" .json)
    
    if command -v jq &> /dev/null; then
      last_task=$(jq -r '.task_history[-1] // empty' "$agent_file" 2>/dev/null)
      if [ -n "$last_task" ] && [ "$last_task" != "null" ]; then
        task_id=$(echo "$last_task" | jq -r '.task_id // "-"')
        status=$(echo "$last_task" | jq -r '.status // "-"')
        product=$(echo "$last_task" | jq -r '.product // "-"')
        echo "| $agent | $task_id | $status | $product |" >> "$OUTPUT_FILE"
      else
        echo "| $agent | - | idle | - |" >> "$OUTPUT_FILE"
      fi
    else
      echo "| $agent | - | - | - |" >> "$OUTPUT_FILE"
    fi
  fi
done

cat >> "$OUTPUT_FILE" << EOF

---

## 💰 Resource Usage

EOF

# Check for cost metrics
COST_METRICS="$REPO_ROOT/.claude/memory/metrics/cost-metrics.json"
if [ -f "$COST_METRICS" ] && command -v jq &> /dev/null; then
  DAILY=$(jq -r '.daily_cost // 0' "$COST_METRICS")
  WEEKLY=$(jq -r '.weekly_cost // 0' "$COST_METRICS")
  
  cat >> "$OUTPUT_FILE" << EOF
- Daily cost: \$${DAILY}
- Weekly cost: \$${WEEKLY}
EOF
else
  echo "*Cost tracking not available*" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << EOF

---

## ⚠️ Alerts

EOF

# Check for any issues
ALERTS=0

# Check for failed tasks in any product
for product_dir in "$REPO_ROOT"/products/*/; do
  if [ -f "$product_dir/.claude/task-graph.yml" ]; then
    FAILED=$(grep -c 'status: "failed"' "$product_dir/.claude/task-graph.yml" 2>/dev/null || echo "0")
    if [ "$FAILED" -gt 0 ]; then
      product=$(basename "$product_dir")
      echo "- ❌ $product has $FAILED failed task(s)" >> "$OUTPUT_FILE"
      ((ALERTS++))
    fi
  fi
done

# Check for blocked tasks
for product_dir in "$REPO_ROOT"/products/*/; do
  if [ -f "$product_dir/.claude/task-graph.yml" ]; then
    BLOCKED=$(grep -c 'status: "blocked"' "$product_dir/.claude/task-graph.yml" 2>/dev/null || echo "0")
    if [ "$BLOCKED" -gt 0 ]; then
      product=$(basename "$product_dir")
      echo "- 🚫 $product has $BLOCKED blocked task(s)" >> "$OUTPUT_FILE"
      ((ALERTS++))
    fi
  fi
done

if [ "$ALERTS" -eq 0 ]; then
  echo "✅ No alerts - all systems operational" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << EOF

---

## 📋 Audit Trail (Recent)

EOF

# Show recent audit trail entries
AUDIT_FILE="$REPO_ROOT/.claude/audit-trail.jsonl"
if [ -f "$AUDIT_FILE" ]; then
  echo "| Date | Type | Agent | Product | Summary |" >> "$OUTPUT_FILE"
  echo "|------|------|-------|---------|---------|" >> "$OUTPUT_FILE"
  tail -10 "$AUDIT_FILE" | while IFS= read -r line; do
    ts=$(echo "$line" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4 | cut -dT -f1)
    type=$(echo "$line" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
    agent=$(echo "$line" | grep -o '"agent":"[^"]*"' | cut -d'"' -f4)
    product_name=$(echo "$line" | grep -o '"product":"[^"]*"' | cut -d'"' -f4)
    summary=$(echo "$line" | grep -o '"summary":"[^"]*"' | cut -d'"' -f4 | cut -c1-40)
    echo "| $ts | $type | $agent | $product_name | $summary |" >> "$OUTPUT_FILE"
  done
else
  echo "*No audit trail data yet*" >> "$OUTPUT_FILE"
fi

cat >> "$OUTPUT_FILE" << EOF

---

*Dashboard generated by generate-dashboard.sh*
*For detailed status, use: ./task-graph-status.sh <product>*
*Report archive: .claude/dashboard/reports/*
EOF

# Also copy to latest-report.md for quick access
cp "$OUTPUT_FILE" "$LATEST_FILE" 2>/dev/null || true

echo "Dashboard generated: $OUTPUT_FILE"
echo ""
cat "$OUTPUT_FILE"
