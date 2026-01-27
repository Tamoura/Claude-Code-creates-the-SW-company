#!/bin/bash
# audit-log.sh
# Append-only audit trail for all system actions
# Usage: ./audit-log.sh <action> <actor> <target> [details]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ACTION=$1
ACTOR=$2
TARGET=$3
DETAILS=${4:-""}

if [ -z "$ACTION" ] || [ -z "$ACTOR" ] || [ -z "$TARGET" ]; then
  echo "Usage: $0 <action> <actor> <target> [details]"
  echo ""
  echo "Actions:"
  echo "  TASK_STARTED     - Task execution started"
  echo "  TASK_COMPLETED   - Task completed successfully"
  echo "  TASK_FAILED      - Task failed"
  echo "  CHECKPOINT       - CEO checkpoint reached"
  echo "  CEO_APPROVED     - CEO approved checkpoint"
  echo "  CEO_REJECTED     - CEO rejected checkpoint"
  echo "  WORKFLOW_STARTED - New workflow started"
  echo "  WORKFLOW_ENDED   - Workflow completed"
  echo "  AGENT_INVOKED    - Agent was invoked"
  echo "  ERROR            - Error occurred"
  echo ""
  echo "Actors:"
  echo "  orchestrator, ceo, backend-engineer, frontend-engineer, etc."
  echo ""
  echo "Example:"
  echo "  $0 TASK_COMPLETED backend-engineer gpu-calculator/BACKEND-01 \"Implemented pricing API\""
  exit 1
fi

# Create audit directory
AUDIT_DIR="$REPO_ROOT/.claude/audit"
mkdir -p "$AUDIT_DIR"

# Log file is per-month for manageable size
LOG_FILE="$AUDIT_DIR/$(date +%Y-%m).jsonl"

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Create JSON entry (append-only)
ENTRY="{\"timestamp\":\"$TIMESTAMP\",\"action\":\"$ACTION\",\"actor\":\"$ACTOR\",\"target\":\"$TARGET\""

if [ -n "$DETAILS" ]; then
  # Escape quotes in details
  DETAILS_ESCAPED=$(echo "$DETAILS" | sed 's/"/\\"/g')
  ENTRY="$ENTRY,\"details\":\"$DETAILS_ESCAPED\""
fi

ENTRY="$ENTRY}"

# Append to log (atomic write)
echo "$ENTRY" >> "$LOG_FILE"

echo "✅ Audit logged"
echo "   Action: $ACTION"
echo "   Actor: $ACTOR"
echo "   Target: $TARGET"
if [ -n "$DETAILS" ]; then
  echo "   Details: $DETAILS"
fi
echo "   Log: $LOG_FILE"
