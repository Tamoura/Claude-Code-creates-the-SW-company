#!/bin/bash
# task-graph-status.sh
# Query task graph status for a product
# Usage: ./task-graph-status.sh <product> [--json]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT=$1
FORMAT=${2:-"text"}

if [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <product> [--json]"
  echo ""
  echo "Example: $0 gpu-calculator"
  echo "         $0 gpu-calculator --json"
  exit 1
fi

GRAPH_FILE="$REPO_ROOT/products/$PRODUCT/.claude/task-graph.yml"

if [ ! -f "$GRAPH_FILE" ]; then
  if [ "$FORMAT" = "--json" ]; then
    echo '{"error": "No active task graph", "product": "'$PRODUCT'"}'
  else
    echo "No active task graph for $PRODUCT"
  fi
  exit 1
fi

# Count tasks by status
PENDING=$(grep -c 'status: "pending"' "$GRAPH_FILE" 2>/dev/null || echo "0")
IN_PROGRESS=$(grep -c 'status: "in_progress"' "$GRAPH_FILE" 2>/dev/null || echo "0")
COMPLETED=$(grep -c 'status: "completed"' "$GRAPH_FILE" 2>/dev/null || echo "0")
FAILED=$(grep -c 'status: "failed"' "$GRAPH_FILE" 2>/dev/null || echo "0")
BLOCKED=$(grep -c 'status: "blocked"' "$GRAPH_FILE" 2>/dev/null || echo "0")

TOTAL=$((PENDING + IN_PROGRESS + COMPLETED + FAILED + BLOCKED))

if [ "$TOTAL" -eq 0 ]; then
  TOTAL=1  # Avoid division by zero
fi

PROGRESS=$((COMPLETED * 100 / TOTAL))

# Get workflow type
WORKFLOW_TYPE=$(grep "workflow_type:" "$GRAPH_FILE" | head -1 | sed 's/.*: "\(.*\)"/\1/' || echo "unknown")

# Get ready tasks (pending with all dependencies complete)
# This is a simplified check - actual implementation would parse YAML properly
READY_TASKS=""
if [ "$PENDING" -gt 0 ]; then
  READY_TASKS="(run 'npx tsx .claude/engine/task-graph-executor.ts $PRODUCT --ready' for details)"
fi

if [ "$FORMAT" = "--json" ]; then
  cat << EOF
{
  "product": "$PRODUCT",
  "workflow_type": "$WORKFLOW_TYPE",
  "total_tasks": $TOTAL,
  "completed": $COMPLETED,
  "in_progress": $IN_PROGRESS,
  "pending": $PENDING,
  "failed": $FAILED,
  "blocked": $BLOCKED,
  "progress_percent": $PROGRESS
}
EOF
else
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║           TASK GRAPH STATUS: $PRODUCT"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Workflow Type: $WORKFLOW_TYPE"
  echo ""
  echo "┌──────────────────────────────────────────────────────────────┐"
  echo "│ Task Status                                                  │"
  echo "└──────────────────────────────────────────────────────────────┘"
  echo ""
  printf "  ✅ Completed:    %3d\n" "$COMPLETED"
  printf "  🔄 In Progress:  %3d\n" "$IN_PROGRESS"
  printf "  ⏳ Pending:      %3d\n" "$PENDING"
  printf "  ❌ Failed:       %3d\n" "$FAILED"
  printf "  🚫 Blocked:      %3d\n" "$BLOCKED"
  echo "  ─────────────────────"
  printf "  📊 Total:        %3d\n" "$TOTAL"
  echo ""
  
  # Progress bar
  FILLED=$((PROGRESS / 5))
  EMPTY=$((20 - FILLED))
  PROGRESS_BAR=""
  for ((i=0; i<FILLED; i++)); do PROGRESS_BAR+="█"; done
  for ((i=0; i<EMPTY; i++)); do PROGRESS_BAR+="░"; done
  
  echo "┌──────────────────────────────────────────────────────────────┐"
  echo "│ Progress                                                     │"
  echo "└──────────────────────────────────────────────────────────────┘"
  echo ""
  echo "  [$PROGRESS_BAR] $PROGRESS%"
  echo ""
  
  # Status summary
  if [ "$FAILED" -gt 0 ]; then
    echo "⚠️  Status: NEEDS ATTENTION - $FAILED task(s) failed"
  elif [ "$BLOCKED" -gt 0 ]; then
    echo "⏸️  Status: BLOCKED - Waiting for resolution"
  elif [ "$IN_PROGRESS" -gt 0 ]; then
    echo "🔄 Status: IN PROGRESS - $IN_PROGRESS task(s) running"
  elif [ "$PENDING" -gt 0 ]; then
    echo "⏳ Status: READY - Tasks available to start"
  else
    echo "✅ Status: COMPLETE - All tasks finished"
  fi
  
  echo ""
  echo "Graph file: $GRAPH_FILE"
fi
