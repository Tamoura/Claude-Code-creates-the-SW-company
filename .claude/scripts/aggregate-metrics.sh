#!/bin/bash
# aggregate-metrics.sh
# Reads agent experience files, computes aggregate stats,
# writes results to agent-performance.json.
#
# Usage: .claude/scripts/aggregate-metrics.sh
# Called automatically by post-task-update.sh (step 4).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

EXPERIENCES_DIR="$REPO_ROOT/.claude/memory/agent-experiences"
PERFORMANCE_FILE="$REPO_ROOT/.claude/memory/metrics/agent-performance.json"

if ! command -v jq &> /dev/null; then
  echo "Warning: jq not installed, skipping metrics aggregation."
  exit 0
fi

if [ ! -d "$EXPERIENCES_DIR" ]; then
  echo "Warning: No agent-experiences directory found."
  exit 0
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Read existing performance file to preserve schema-specific fields
EXISTING=$(cat "$PERFORMANCE_FILE" 2>/dev/null || echo '{}')

# Build agents object by iterating experience files
AGENTS_JSON="{}"
INSIGHTS="[]"
MAX_TASKS=0
MAX_TASKS_AGENT=""

for agent_file in "$EXPERIENCES_DIR"/*.json; do
  [ -f "$agent_file" ] || continue
  agent=$(basename "$agent_file" .json)

  # Count tasks from task_history
  TASK_COUNT=$(jq '.task_history | length' "$agent_file" 2>/dev/null || echo "0")

  if [ "$TASK_COUNT" -eq 0 ]; then
    # Preserve existing entry with zeros
    EXISTING_AGENT=$(echo "$EXISTING" | jq --arg a "$agent" '.agents[$a] // {}' 2>/dev/null || echo '{}')
    AGENTS_JSON=$(echo "$AGENTS_JSON" | jq --arg a "$agent" --argjson v "$EXISTING_AGENT" '.[$a] = $v' 2>/dev/null || echo "$AGENTS_JSON")
    continue
  fi

  # Compute success count
  SUCCESS_COUNT=$(jq '[.task_history[] | select(.status == "success")] | length' "$agent_file" 2>/dev/null || echo "0")

  # Compute success rate
  if [ "$TASK_COUNT" -gt 0 ]; then
    SUCCESS_RATE=$(echo "scale=2; $SUCCESS_COUNT / $TASK_COUNT" | bc 2>/dev/null || echo "0")
  else
    SUCCESS_RATE="0"
  fi

  # Compute average time
  AVG_TIME=$(jq '[.task_history[].time_minutes // 0] | if length > 0 then (add / length | . * 100 | round / 100) else 0 end' "$agent_file" 2>/dev/null || echo "0")

  # Get existing agent entry to preserve schema-specific fields
  EXISTING_AGENT=$(echo "$EXISTING" | jq --arg a "$agent" '.agents[$a] // {}' 2>/dev/null || echo '{}')

  # Merge computed values into existing agent entry
  AGENT_ENTRY=$(echo "$EXISTING_AGENT" | jq \
    --argjson tc "$TASK_COUNT" \
    --argjson sr "$SUCCESS_RATE" \
    --argjson at "$AVG_TIME" \
    '.tasks_completed = $tc | .success_rate = $sr | .avg_time_minutes = $at' 2>/dev/null)

  AGENTS_JSON=$(echo "$AGENTS_JSON" | jq --arg a "$agent" --argjson v "$AGENT_ENTRY" '.[$a] = $v' 2>/dev/null)

  # Track highest task count for insights
  if [ "$TASK_COUNT" -gt "$MAX_TASKS" ]; then
    MAX_TASKS=$TASK_COUNT
    MAX_TASKS_AGENT=$agent
  fi
done

# Build insights
if [ -n "$MAX_TASKS_AGENT" ] && [ "$MAX_TASKS" -gt 0 ]; then
  INSIGHTS=$(echo "[]" | jq \
    --arg agent "$MAX_TASKS_AGENT" \
    --argjson count "$MAX_TASKS" \
    '. + ["\($agent) has highest task count (\($count) tasks)"]' 2>/dev/null || echo '[]')
fi

# Count total tasks across all agents
TOTAL_TASKS=$(echo "$AGENTS_JSON" | jq '[.[].tasks_completed // 0] | add // 0' 2>/dev/null || echo "0")
if [ "$TOTAL_TASKS" -gt 0 ]; then
  INSIGHTS=$(echo "$INSIGHTS" | jq \
    --argjson total "$TOTAL_TASKS" \
    '. + ["\($total) total tasks completed across all agents"]' 2>/dev/null || echo "$INSIGHTS")
fi

# Write final output
jq -n \
  --arg ts "$TIMESTAMP" \
  --argjson agents "$AGENTS_JSON" \
  --argjson insights "$INSIGHTS" \
  '{
    version: "1.0.0",
    period: "2025-01-26 onwards",
    updated_at: $ts,
    agents: $agents,
    insights: $insights
  }' > "$PERFORMANCE_FILE"

echo "Agent performance metrics aggregated ($TOTAL_TASKS total tasks)."
