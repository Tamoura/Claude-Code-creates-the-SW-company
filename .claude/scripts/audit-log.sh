#!/bin/bash
# audit-log.sh
# Append-only audit trail for all system actions
# Usage: ./audit-log.sh <action> <actor> <target> [details] [story_ids] [requirement_ids]
#
# Constitution Article VI: Audit entries include traceability fields
# to enable queries like "show all work for US-01" or "is FR-003 done?"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ACTION=$1
ACTOR=$2
TARGET=$3
DETAILS=${4:-""}
STORY_IDS=${5:-""}
REQUIREMENT_IDS=${6:-""}

if [ -z "$ACTION" ] || [ -z "$ACTOR" ] || [ -z "$TARGET" ]; then
  echo "Usage: $0 <action> <actor> <target> [details] [story_ids] [requirement_ids]"
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
  echo "Traceability (Constitution Article VI):"
  echo "  story_ids:       Comma-separated user story IDs (e.g., 'US-01,US-02')"
  echo "  requirement_ids: Comma-separated requirement IDs (e.g., 'FR-001,FR-002')"
  echo ""
  echo "Examples:"
  echo "  $0 TASK_COMPLETED backend-engineer archforge/BACKEND-01 \"Implemented auth API\" \"US-01\" \"FR-001,FR-002,FR-003\""
  echo "  $0 TASK_STARTED frontend-engineer archforge/FRONTEND-01 \"Starting canvas implementation\" \"US-04\" \"FR-007\""
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

# Traceability fields (Constitution Article VI)
if [ -n "$STORY_IDS" ]; then
  # Convert comma-separated to JSON array: "US-01,US-02" → ["US-01","US-02"]
  STORY_JSON=$(echo "$STORY_IDS" | sed 's/,/","/g' | sed 's/^/["/' | sed 's/$/"]/')
  ENTRY="$ENTRY,\"story_ids\":$STORY_JSON"
fi

if [ -n "$REQUIREMENT_IDS" ]; then
  REQ_JSON=$(echo "$REQUIREMENT_IDS" | sed 's/,/","/g' | sed 's/^/["/' | sed 's/$/"]/')
  ENTRY="$ENTRY,\"requirement_ids\":$REQ_JSON"
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
if [ -n "$STORY_IDS" ]; then
  echo "   Stories: $STORY_IDS"
fi
if [ -n "$REQUIREMENT_IDS" ]; then
  echo "   Requirements: $REQUIREMENT_IDS"
fi
echo "   Log: $LOG_FILE"
