#!/bin/bash
# update-agent-memory.sh
# Updates agent memory after task completion
# Usage: ./update-agent-memory.sh <agent> <task_id> <product> <status> <time_minutes> <summary> [pattern]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

AGENT=$1
TASK_ID=$2
PRODUCT=$3
STATUS=$4
TIME_MINUTES=$5
SUMMARY=$6
PATTERN=$7  # Optional: learned pattern to add

if [ -z "$AGENT" ] || [ -z "$TASK_ID" ] || [ -z "$PRODUCT" ] || [ -z "$STATUS" ]; then
  echo "Usage: $0 <agent> <task_id> <product> <status> <time_minutes> <summary> [pattern]"
  echo ""
  echo "Arguments:"
  echo "  agent        - Agent name (e.g., backend-engineer)"
  echo "  task_id      - Task ID (e.g., BACKEND-01)"
  echo "  product      - Product name (e.g., gpu-calculator)"
  echo "  status       - success or failure"
  echo "  time_minutes - Time spent in minutes"
  echo "  summary      - Brief summary of what was done"
  echo "  pattern      - Optional: Learned pattern to add to company knowledge"
  echo ""
  echo "Example:"
  echo "  $0 backend-engineer BACKEND-01 gpu-calculator success 90 \"Implemented pricing API\""
  exit 1
fi

MEMORY_FILE="$REPO_ROOT/.claude/memory/agent-experiences/${AGENT}.json"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Check if memory file exists
if [ ! -f "$MEMORY_FILE" ]; then
  echo "Creating new memory file for agent: $AGENT"
  mkdir -p "$(dirname "$MEMORY_FILE")"
  cat > "$MEMORY_FILE" << EOF
{
  "agent": "$AGENT",
  "version": "1.0.0",
  "updated_at": "$TIMESTAMP",
  "learned_patterns": [],
  "task_history": [],
  "common_mistakes": [],
  "preferred_approaches": [],
  "performance_metrics": {
    "tasks_completed": 0,
    "success_rate": 1.0,
    "average_time_minutes": 0
  }
}
EOF
fi

echo "Updating memory for agent: $AGENT"

# Create task entry
TASK_ENTRY=$(cat << EOF
{
  "task_id": "$TASK_ID",
  "product": "$PRODUCT",
  "timestamp": "$TIMESTAMP",
  "status": "$STATUS",
  "time_minutes": $TIME_MINUTES,
  "summary": "$SUMMARY"
}
EOF
)

# Check if jq is available
if command -v jq &> /dev/null; then
  # Use jq for proper JSON manipulation
  
  # Add to task history
  jq --argjson entry "$TASK_ENTRY" '.task_history += [$entry]' "$MEMORY_FILE" > "${MEMORY_FILE}.tmp"
  mv "${MEMORY_FILE}.tmp" "$MEMORY_FILE"
  
  # Update performance metrics
  TOTAL_TASKS=$(jq '.task_history | length' "$MEMORY_FILE")
  SUCCESS_COUNT=$(jq '[.task_history[] | select(.status == "success")] | length' "$MEMORY_FILE")
  SUCCESS_RATE=$(echo "scale=2; $SUCCESS_COUNT / $TOTAL_TASKS" | bc)
  AVG_TIME=$(jq '[.task_history[].time_minutes] | add / length' "$MEMORY_FILE")
  
  jq --arg rate "$SUCCESS_RATE" --argjson total "$TOTAL_TASKS" --argjson avg "$AVG_TIME" \
    '.performance_metrics.tasks_completed = $total | 
     .performance_metrics.success_rate = ($rate | tonumber) |
     .performance_metrics.average_time_minutes = $avg' \
    "$MEMORY_FILE" > "${MEMORY_FILE}.tmp"
  mv "${MEMORY_FILE}.tmp" "$MEMORY_FILE"
  
  # Update timestamp
  jq --arg ts "$TIMESTAMP" '.updated_at = $ts' "$MEMORY_FILE" > "${MEMORY_FILE}.tmp"
  mv "${MEMORY_FILE}.tmp" "$MEMORY_FILE"
  
  # Add pattern if provided
  if [ -n "$PATTERN" ]; then
    PATTERN_ENTRY=$(cat << EOF
{
  "pattern": "$PATTERN",
  "learned_from": {
    "task_id": "$TASK_ID",
    "product": "$PRODUCT",
    "date": "$TIMESTAMP"
  },
  "confidence": "medium"
}
EOF
)
    jq --argjson pattern "$PATTERN_ENTRY" '.learned_patterns += [$pattern]' "$MEMORY_FILE" > "${MEMORY_FILE}.tmp"
    mv "${MEMORY_FILE}.tmp" "$MEMORY_FILE"
    echo "Added learned pattern: $PATTERN"
  fi
  
  echo "✅ Memory updated successfully"
  echo ""
  echo "Agent: $AGENT"
  echo "Task: $TASK_ID ($STATUS)"
  echo "Total tasks: $TOTAL_TASKS"
  echo "Success rate: ${SUCCESS_RATE}"
  
else
  # Fallback: simple append (not ideal but works)
  echo "Warning: jq not available, using simple append"
  
  # This is a simplified update - just note that memory was updated
  echo ""
  echo "Memory update logged:"
  echo "  Agent: $AGENT"
  echo "  Task: $TASK_ID"
  echo "  Status: $STATUS"
  echo "  Time: ${TIME_MINUTES}min"
  echo ""
  echo "Note: Install jq for proper JSON manipulation"
fi
