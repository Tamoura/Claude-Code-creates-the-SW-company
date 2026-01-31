#!/bin/bash
# backfill-history.sh
# One-time script to parse git log and populate agent memory
# and audit trail with historical data from actual commits.
#
# Usage: .claude/scripts/backfill-history.sh [product]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT=${1:-"stablecoin-gateway"}
AUDIT_FILE="$REPO_ROOT/.claude/audit-trail.jsonl"
MEMORY_DIR="$REPO_ROOT/.claude/memory/agent-experiences"

echo "Backfilling history for product: $PRODUCT"
echo "Reading git log..."

# Parse commits that touch the product directory
COUNT=0
git -C "$REPO_ROOT" log --oneline --no-merges -- "products/$PRODUCT/" 2>/dev/null | while IFS= read -r line; do
  COMMIT_HASH=$(echo "$line" | cut -d' ' -f1)
  COMMIT_MSG=$(echo "$line" | cut -d' ' -f2-)
  COMMIT_DATE=$(git -C "$REPO_ROOT" log -1 --format="%aI" "$COMMIT_HASH" 2>/dev/null)

  # Determine agent from commit message prefix
  AGENT="backend-engineer"
  case "$COMMIT_MSG" in
    feat\(security\)*|fix\(security\)*)  AGENT="security-engineer" ;;
    test*|chore\(test\)*)                 AGENT="qa-engineer" ;;
    docs*|chore\(docs\)*)                 AGENT="technical-writer" ;;
    ci*|chore\(ci\)*)                     AGENT="devops-engineer" ;;
    feat\(ui\)*|feat\(frontend\)*)        AGENT="frontend-engineer" ;;
    refactor*|feat*|fix*)                 AGENT="backend-engineer" ;;
    arch*|design*)                        AGENT="architect" ;;
  esac

  # Count files changed
  FILES_CHANGED=$(git -C "$REPO_ROOT" diff-tree --no-commit-id --name-only -r "$COMMIT_HASH" -- "products/$PRODUCT/" 2>/dev/null | wc -l | tr -d ' ')

  # Append to audit trail
  ENTRY=$(cat <<JSONEOF
{"timestamp":"$COMMIT_DATE","type":"backfill","agent":"$AGENT","task_id":"commit-$COMMIT_HASH","product":"$PRODUCT","status":"success","time_minutes":0,"summary":"$COMMIT_MSG","branch":"backfill","commit":"$COMMIT_HASH","files_changed":$FILES_CHANGED}
JSONEOF
)
  echo "$ENTRY" >> "$AUDIT_FILE"
  COUNT=$((COUNT + 1))
done

echo ""
echo "Backfill complete."
echo "Audit trail entries added: check $AUDIT_FILE"

# Summarize by agent
echo ""
echo "Activity by agent (from git history):"
if [ -f "$AUDIT_FILE" ]; then
  for agent_file in "$MEMORY_DIR"/*.json; do
    if [ -f "$agent_file" ]; then
      agent=$(basename "$agent_file" .json)
      count=$(grep -c "\"agent\":\"$agent\"" "$AUDIT_FILE" 2>/dev/null || echo "0")
      echo "  $agent: $count entries"
    fi
  done
fi
