#!/bin/bash
# post-task-update.sh
# Mandatory post-task hook that updates memory, and appends to audit trail.
# Called automatically after every agent task completion.
#
# Usage: .claude/scripts/post-task-update.sh <agent> <task_id> <product> <status> <time_minutes> "<summary>" [pattern]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

AGENT=$1
TASK_ID=$2
PRODUCT=$3
STATUS=$4
TIME_MINUTES=$5
SUMMARY=$6
PATTERN=$7

if [ -z "$AGENT" ] || [ -z "$TASK_ID" ] || [ -z "$PRODUCT" ] || [ -z "$STATUS" ] || [ -z "$TIME_MINUTES" ] || [ -z "$SUMMARY" ]; then
  echo "Usage: $0 <agent> <task_id> <product> <status> <time_minutes> \"<summary>\" [pattern]"
  echo ""
  echo "Example:"
  echo "  $0 backend-engineer BACKEND-01 stablecoin-gateway success 30 \"Implemented payment endpoint\" \"fastify-plugin-pattern\""
  exit 1
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
AUDIT_FILE="$REPO_ROOT/.claude/audit-trail.jsonl"

# 1. Append to audit trail (always succeeds, append-only)
AUDIT_ENTRY=$(cat <<JSONEOF
{"timestamp":"$TIMESTAMP","type":"task_complete","agent":"$AGENT","task_id":"$TASK_ID","product":"$PRODUCT","status":"$STATUS","time_minutes":$TIME_MINUTES,"summary":"$SUMMARY","branch":"$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || echo 'unknown')","commit":"$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo 'unknown')"}
JSONEOF
)
echo "$AUDIT_ENTRY" >> "$AUDIT_FILE"
echo "Audit trail updated."

# 2. Update agent memory (delegate to existing script)
if [ -f "$SCRIPT_DIR/update-agent-memory.sh" ]; then
  bash "$SCRIPT_DIR/update-agent-memory.sh" "$AGENT" "$TASK_ID" "$PRODUCT" "$STATUS" "$TIME_MINUTES" "$SUMMARY" "$PATTERN" 2>/dev/null || true
  echo "Agent memory updated."
else
  echo "Warning: update-agent-memory.sh not found, skipping memory update."
fi

# 3. Update task status if script exists
if [ -f "$SCRIPT_DIR/update-task-status.sh" ]; then
  bash "$SCRIPT_DIR/update-task-status.sh" "$PRODUCT" "$TASK_ID" "$STATUS" 2>/dev/null || true
fi

# 4. Aggregate metrics (updates agent-performance.json)
if [ -f "$SCRIPT_DIR/aggregate-metrics.sh" ]; then
  bash "$SCRIPT_DIR/aggregate-metrics.sh" 2>/dev/null || true
  echo "Metrics aggregated."
fi

echo "Post-task update complete for $AGENT/$TASK_ID ($STATUS)"
