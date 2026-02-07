#!/bin/bash
# update-gate-metrics.sh
# Records gate results in gate-metrics.json.
#
# Usage: .claude/scripts/update-gate-metrics.sh <gate-type> <product> <result> [details]
#   gate-type: security | performance | testing | production
#   result: pass | fail
#   details: optional JSON string with specifics
#
# Called automatically by testing-gate-checklist.sh after gate run.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

GATE_METRICS="$REPO_ROOT/.claude/memory/metrics/gate-metrics.json"

GATE_TYPE=$1
PRODUCT=$2
RESULT=$3
DETAILS=$4

if [ -z "$GATE_TYPE" ] || [ -z "$PRODUCT" ] || [ -z "$RESULT" ]; then
  echo "Usage: $0 <gate-type> <product> <result> [details]"
  echo ""
  echo "  gate-type: security | performance | testing | production"
  echo "  result:    pass | fail"
  echo "  details:   optional JSON string"
  echo ""
  echo "Example:"
  echo "  $0 testing stablecoin-gateway pass '{\"passed\":10,\"failed\":0}'"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "Warning: jq not installed, skipping gate metrics update."
  exit 0
fi

# Map gate-type to JSON key
case "$GATE_TYPE" in
  security)    GATE_KEY="security_gate" ;;
  performance) GATE_KEY="performance_gate" ;;
  testing)     GATE_KEY="testing_gate" ;;
  production)  GATE_KEY="production_gate" ;;
  *)
    echo "Error: Unknown gate type '$GATE_TYPE'. Use: security|performance|testing|production"
    exit 1
    ;;
esac

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Read current metrics
CURRENT=$(cat "$GATE_METRICS" 2>/dev/null || echo '{}')

# Increment runs
CURRENT=$(echo "$CURRENT" | jq --arg key "$GATE_KEY" \
  '.[$key].runs = ((.[$key].runs // 0) + 1)' 2>/dev/null)

# Increment passes or failures
if [ "$RESULT" = "pass" ]; then
  CURRENT=$(echo "$CURRENT" | jq --arg key "$GATE_KEY" \
    '.[$key].passes = ((.[$key].passes // 0) + 1)' 2>/dev/null)
else
  CURRENT=$(echo "$CURRENT" | jq --arg key "$GATE_KEY" \
    '.[$key].failures = ((.[$key].failures // 0) + 1)' 2>/dev/null)

  # Append to issues_caught if details provided and result is fail
  if [ -n "$DETAILS" ]; then
    CURRENT=$(echo "$CURRENT" | jq --arg key "$GATE_KEY" \
      --arg ts "$TIMESTAMP" --arg prod "$PRODUCT" --argjson det "$DETAILS" \
      '.[$key].issues_caught = ((.[$key].issues_caught // []) + [{
        "timestamp": $ts,
        "product": $prod,
        "details": $det
      }])' 2>/dev/null)
  fi
fi

# Recompute failure_rate
RUNS=$(echo "$CURRENT" | jq --arg key "$GATE_KEY" '.[$key].runs // 0' 2>/dev/null)
FAILURES=$(echo "$CURRENT" | jq --arg key "$GATE_KEY" '.[$key].failures // 0' 2>/dev/null)

if [ "$RUNS" -gt 0 ]; then
  FAILURE_RATE=$(echo "scale=2; $FAILURES / $RUNS" | bc 2>/dev/null || echo "0")
else
  FAILURE_RATE="0"
fi

CURRENT=$(echo "$CURRENT" | jq --arg key "$GATE_KEY" --argjson fr "$FAILURE_RATE" \
  '.[$key].failure_rate = $fr' 2>/dev/null)

# Update total_issues_prevented (sum of all gate failures)
TOTAL_FAILURES=$(echo "$CURRENT" | jq \
  '(.security_gate.failures // 0) + (.performance_gate.failures // 0) + (.testing_gate.failures // 0) + (.production_gate.failures // 0)' 2>/dev/null || echo "0")

CURRENT=$(echo "$CURRENT" | jq --argjson tf "$TOTAL_FAILURES" \
  '.total_issues_prevented = $tf' 2>/dev/null)

# Update timestamp
CURRENT=$(echo "$CURRENT" | jq --arg ts "$TIMESTAMP" \
  '.updated_at = $ts' 2>/dev/null)

# Write back
echo "$CURRENT" | jq '.' > "$GATE_METRICS"

echo "Gate metrics updated: $GATE_TYPE ($RESULT) for $PRODUCT"
