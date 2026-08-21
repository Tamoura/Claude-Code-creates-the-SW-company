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

# ============================================================================
# Estimation History: compute per-agent, per-task-type duration statistics
# ============================================================================

ESTIMATION_FILE="$REPO_ROOT/.claude/memory/metrics/estimation-history.json"
ESTIMATION_AGENTS="{}"

for agent_file in "$EXPERIENCES_DIR"/*.json; do
  [ -f "$agent_file" ] || continue
  agent=$(basename "$agent_file" .json)

  TASK_COUNT=$(jq '.task_history | length' "$agent_file" 2>/dev/null || echo "0")
  [ "$TASK_COUNT" -eq 0 ] && continue

  # Group tasks by ID prefix (e.g., PRD, ARCH, BACKEND, FRONTEND, QA, etc.)
  # Extract prefix from task_id: everything before the dash-number suffix
  TASK_TYPES=$(jq -r '[.task_history[].task_id // "UNKNOWN"] | map(sub("-[0-9]+$"; "")) | unique | .[]' "$agent_file" 2>/dev/null || true)

  AGENT_TYPES="{}"

  for task_type in $TASK_TYPES; do
    [ -z "$task_type" ] && continue

    # Extract all durations for this task type (only successful tasks with time > 0)
    DURATIONS=$(jq --arg tt "$task_type" \
      '[.task_history[] | select(.task_id != null and (.task_id | startswith($tt)) and .status == "success" and (.time_minutes // 0) > 0) | .time_minutes]' \
      "$agent_file" 2>/dev/null || echo "[]")

    SAMPLE_COUNT=$(echo "$DURATIONS" | jq 'length' 2>/dev/null || echo "0")

    [ "$SAMPLE_COUNT" -eq 0 ] && continue

    # Compute statistics using jq
    STATS=$(echo "$DURATIONS" | jq '
      sort as $s |
      (length) as $n |
      (add / $n) as $mean |
      {
        sample_count: $n,
        mean: ($mean * 100 | round / 100),
        min: $s[0],
        max: $s[$n - 1],
        median: (if $n == 1 then $s[0]
                 elif $n % 2 == 1 then $s[$n / 2 | floor]
                 else ($s[$n / 2 - 1] + $s[$n / 2]) / 2
                 end),
        p25: $s[([($n * 0.25 | floor), 0] | max)],
        p75: $s[([($n * 0.75 | floor), ($n - 1)] | min)],
        p90: $s[([($n * 0.90 | floor), ($n - 1)] | min)],
        stddev: (if $n <= 1 then 0
                 else ([.[] | (. - $mean) * (. - $mean)] | add / ($n - 1)) | sqrt | . * 100 | round / 100
                 end)
      }' 2>/dev/null)

    if [ -n "$STATS" ] && [ "$STATS" != "null" ]; then
      AGENT_TYPES=$(echo "$AGENT_TYPES" | jq --arg tt "$task_type" --argjson s "$STATS" '.[$tt] = $s' 2>/dev/null)
    fi
  done

  # Only add agent if they have task type stats
  HAS_TYPES=$(echo "$AGENT_TYPES" | jq 'length > 0' 2>/dev/null || echo "false")
  if [ "$HAS_TYPES" = "true" ]; then
    ESTIMATION_AGENTS=$(echo "$ESTIMATION_AGENTS" | jq --arg a "$agent" --argjson t "$AGENT_TYPES" '.[$a] = $t' 2>/dev/null)
  fi
done

# Write estimation history
jq -n \
  --arg ts "$TIMESTAMP" \
  --argjson agents "$ESTIMATION_AGENTS" \
  '{
    version: "1.0.0",
    updated_at: $ts,
    description: "Per-agent, per-task-type duration statistics. Used by orchestrator Step 3.7.",
    agents: $agents
  }' > "$ESTIMATION_FILE"

AGENT_COUNT=$(echo "$ESTIMATION_AGENTS" | jq 'length' 2>/dev/null || echo "0")
echo "Estimation history updated ($AGENT_COUNT agents with duration data)."
