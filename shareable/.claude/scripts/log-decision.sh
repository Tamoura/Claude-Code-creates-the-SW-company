#!/bin/bash
# log-decision.sh
# Appends a decision entry to decision-log.json.
#
# Usage: .claude/scripts/log-decision.sh <decision-id> <category> <title> "<rationale>" "<alternatives>" [product] [decided-by]
#   category: architecture | technology | process | design | security
#   alternatives: comma-separated list of rejected alternatives
#
# Example:
#   ./log-decision.sh DEC-001 architecture "Use Fastify over Express" \
#     "Better TypeScript support and plugin system" "Express,Koa" all architect

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DECISION_LOG="$REPO_ROOT/.claude/memory/decision-log.json"

DECISION_ID=$1
CATEGORY=$2
TITLE=$3
RATIONALE=$4
ALTERNATIVES=$5
PRODUCT=${6:-"all"}
DECIDED_BY=${7:-"orchestrator"}

if [ -z "$DECISION_ID" ] || [ -z "$CATEGORY" ] || [ -z "$TITLE" ] || [ -z "$RATIONALE" ]; then
  echo "Usage: $0 <decision-id> <category> <title> \"<rationale>\" \"<alternatives>\" [product] [decided-by]"
  echo ""
  echo "  category:     architecture | technology | process | design | security"
  echo "  alternatives:  comma-separated rejected alternatives"
  echo "  product:       product name or 'all' (default: all)"
  echo "  decided-by:    agent role (default: orchestrator)"
  echo ""
  echo "Example:"
  echo "  $0 DEC-001 architecture \"Use Fastify over Express\" \\"
  echo "    \"Better TypeScript support\" \"Express,Koa\" all architect"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "Warning: jq not installed, skipping decision logging."
  exit 0
fi

# Validate category
case "$CATEGORY" in
  architecture|technology|process|design|security) ;;
  *)
    echo "Error: Unknown category '$CATEGORY'. Use: architecture|technology|process|design|security"
    exit 1
    ;;
esac

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Convert comma-separated alternatives to JSON array
if [ -n "$ALTERNATIVES" ]; then
  ALT_JSON=$(echo "$ALTERNATIVES" | jq -R 'split(",") | map(gsub("^\\s+|\\s+$"; ""))' 2>/dev/null || echo '[]')
else
  ALT_JSON="[]"
fi

# Build decision entry
DECISION=$(jq -n \
  --arg id "$DECISION_ID" \
  --arg ts "$TIMESTAMP" \
  --arg cat "$CATEGORY" \
  --arg title "$TITLE" \
  --arg rationale "$RATIONALE" \
  --argjson alts "$ALT_JSON" \
  --arg product "$PRODUCT" \
  --arg decided "$DECIDED_BY" \
  '{
    id: $id,
    timestamp: $ts,
    category: $cat,
    title: $title,
    rationale: $rationale,
    alternatives_considered: $alts,
    product: $product,
    decided_by: $decided
  }')

# Read current log and append
CURRENT=$(cat "$DECISION_LOG" 2>/dev/null || echo '{"version":"1.0.0","decisions":[]}')

UPDATED=$(echo "$CURRENT" | jq \
  --argjson dec "$DECISION" \
  --arg ts "$TIMESTAMP" \
  '.decisions += [$dec] | .updated_at = $ts')

echo "$UPDATED" | jq '.' > "$DECISION_LOG"

echo "Decision logged: $DECISION_ID - $TITLE"
