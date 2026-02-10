#!/bin/bash
# diagnose-gate-failure.sh
# Parses gate report files, classifies failures, and outputs structured
# diagnosis JSON with routing and fix suggestions.
#
# Usage: .claude/scripts/diagnose-gate-failure.sh <gate-type> <product> <report-file>
#   gate-type: testing | smoke-test
#   product: product name
#   report-file: path to the gate report markdown file
#
# Output: JSON array of diagnosed failures, sorted by priority.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

GATE_TYPE=$1
PRODUCT=$2
REPORT_FILE=$3

if [ -z "$GATE_TYPE" ] || [ -z "$PRODUCT" ] || [ -z "$REPORT_FILE" ]; then
  echo "Usage: $0 <gate-type> <product> <report-file>"
  echo ""
  echo "  gate-type:   testing | smoke-test"
  echo "  product:     product name"
  echo "  report-file: path to the markdown gate report"
  echo ""
  echo "Example:"
  echo "  $0 testing stablecoin-gateway products/stablecoin-gateway/docs/quality-reports/testing-gate-20260210-120000.md"
  exit 1
fi

if [ ! -f "$REPORT_FILE" ]; then
  echo "Error: Report file not found: $REPORT_FILE"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "Error: jq is required but not installed."
  exit 1
fi

TAXONOMY_FILE="$REPO_ROOT/.claude/memory/metrics/failure-taxonomy.json"

if [ ! -f "$TAXONOMY_FILE" ]; then
  echo "Error: Failure taxonomy not found: $TAXONOMY_FILE"
  exit 1
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Read the report content
REPORT_CONTENT=$(cat "$REPORT_FILE")

# Extract FAIL lines from the report
FAIL_LINES=$(echo "$REPORT_CONTENT" | grep -iE "FAIL|❌" || true)

if [ -z "$FAIL_LINES" ]; then
  # No failures found — output empty diagnosis
  jq -n \
    --arg gate "$GATE_TYPE" \
    --arg product "$PRODUCT" \
    --arg ts "$TIMESTAMP" \
    '{
      gate_type: $gate,
      product: $product,
      timestamp: $ts,
      status: "no_failures_detected",
      failures: [],
      routing: [],
      fix_order: []
    }'
  exit 0
fi

# Classify each failure against taxonomy patterns
FAILURES="[]"

classify_failure() {
  local fail_line="$1"
  local fail_lower
  fail_lower=$(echo "$fail_line" | tr '[:upper:]' '[:lower:]')

  # Check each failure type's match patterns
  local matched_type=""
  local matched_priority=99

  # server-startup-failure (priority 1)
  if echo "$fail_lower" | grep -qiE "server started.*fail|port.*not responding|eaddrinuse|econnrefused|cannot find module"; then
    if [ 1 -lt "$matched_priority" ]; then
      matched_type="server-startup-failure"
      matched_priority=1
    fi
  fi

  # port-conflict (priority 2)
  if echo "$fail_lower" | grep -qiE "eaddrinuse|port.*already in use|port.*conflict"; then
    if [ 2 -lt "$matched_priority" ]; then
      matched_type="port-conflict"
      matched_priority=2
    fi
  fi

  # missing-dependency (priority 3)
  if echo "$fail_lower" | grep -qiE "cannot find module|module not found|err_module_not_found|missing dependency|peer dep"; then
    if [ 3 -lt "$matched_priority" ]; then
      matched_type="missing-dependency"
      matched_priority=3
    fi
  fi

  # build-failure (priority 4)
  if echo "$fail_lower" | grep -qiE "build.*fail|production build failed|tsc.*error|type error|compilation failed"; then
    if [ 4 -lt "$matched_priority" ]; then
      matched_type="build-failure"
      matched_priority=4
    fi
  fi

  # test-failure (priority 5)
  if echo "$fail_lower" | grep -qiE "tests.*fail|test.*failed|fail.*\.test\.|fail.*\.spec\.|expected.*received|assertionerror"; then
    if [ 5 -lt "$matched_priority" ]; then
      matched_type="test-failure"
      matched_priority=5
    fi
  fi

  # e2e-failure (priority 6)
  if echo "$fail_lower" | grep -qiE "e2e.*fail|playwright.*failed|timeout.*waiting|locator.*not found|page\.goto.*timeout"; then
    if [ 6 -lt "$matched_priority" ]; then
      matched_type="e2e-failure"
      matched_priority=6
    fi
  fi

  # console-errors (priority 7)
  if echo "$fail_lower" | grep -qiE "console errors detected|console\.error|consoleerrors.*[1-9]"; then
    if [ 7 -lt "$matched_priority" ]; then
      matched_type="console-errors"
      matched_priority=7
    fi
  fi

  # coverage-gap (priority 8)
  if echo "$fail_lower" | grep -qiE "coverage.*fail|coverage.*below"; then
    if [ 8 -lt "$matched_priority" ]; then
      matched_type="coverage-gap"
      matched_priority=8
    fi
  fi

  # lint-error (priority 9)
  if echo "$fail_lower" | grep -qiE "linting.*fail|eslint.*error|prettier.*error|lint.*failed"; then
    if [ 9 -lt "$matched_priority" ]; then
      matched_type="lint-error"
      matched_priority=9
    fi
  fi

  # placeholder-page (priority 10)
  if echo "$fail_lower" | grep -qiE "placeholder.*fail|placeholder pages|coming soon|under construction|not yet implemented"; then
    if [ 10 -lt "$matched_priority" ]; then
      matched_type="placeholder-page"
      matched_priority=10
    fi
  fi

  # e2e-missing (priority 11)
  if echo "$fail_lower" | grep -qiE "e2e test files.*fail|no e2e test files found|minimum e2e.*fail"; then
    if [ 11 -lt "$matched_priority" ]; then
      matched_type="e2e-missing"
      matched_priority=11
    fi
  fi

  # If no match, classify as generic test-failure
  if [ -z "$matched_type" ]; then
    matched_type="test-failure"
    matched_priority=5
  fi

  echo "$matched_type"
}

# Process each FAIL line
SEEN_TYPES=""

while IFS= read -r line; do
  [ -z "$line" ] && continue

  FAILURE_TYPE=$(classify_failure "$line")

  # Deduplicate: only add each failure type once
  if echo "$SEEN_TYPES" | grep -q "$FAILURE_TYPE"; then
    continue
  fi
  SEEN_TYPES="$SEEN_TYPES $FAILURE_TYPE"

  # Look up taxonomy details for this failure type
  TAXONOMY_ENTRY=$(jq --arg ft "$FAILURE_TYPE" '.failure_types[$ft]' "$TAXONOMY_FILE" 2>/dev/null)

  if [ "$TAXONOMY_ENTRY" = "null" ] || [ -z "$TAXONOMY_ENTRY" ]; then
    # Unknown type — use generic entry
    FAILURE_JSON=$(jq -n \
      --arg ft "$FAILURE_TYPE" \
      --arg line "$line" \
      '{
        type: $ft,
        priority: 99,
        route_to: "backend-engineer",
        fail_line: $line,
        common_causes: ["Unknown — manual investigation required"],
        suggested_actions: ["Review the full gate report for details"]
      }')
  else
    FAILURE_JSON=$(echo "$TAXONOMY_ENTRY" | jq \
      --arg ft "$FAILURE_TYPE" \
      --arg line "$line" \
      '{
        type: $ft,
        priority: .priority,
        route_to: .route_to,
        fail_line: $line,
        common_causes: .common_causes,
        suggested_actions: .suggested_actions
      }')
  fi

  FAILURES=$(echo "$FAILURES" | jq --argjson f "$FAILURE_JSON" '. + [$f]')
done <<< "$FAIL_LINES"

# Sort failures by priority
FAILURES=$(echo "$FAILURES" | jq 'sort_by(.priority)')

# Extract unique routing targets in priority order
ROUTING=$(echo "$FAILURES" | jq '[.[].route_to] | unique')

# Build fix order (types in priority order)
FIX_ORDER=$(echo "$FAILURES" | jq '[.[].type]')

# Build final diagnosis output
DIAGNOSIS=$(jq -n \
  --arg gate "$GATE_TYPE" \
  --arg product "$PRODUCT" \
  --arg ts "$TIMESTAMP" \
  --arg report "$REPORT_FILE" \
  --argjson failures "$FAILURES" \
  --argjson routing "$ROUTING" \
  --argjson fix_order "$FIX_ORDER" \
  '{
    gate_type: $gate,
    product: $product,
    timestamp: $ts,
    report_file: $report,
    status: "failures_diagnosed",
    failure_count: ($failures | length),
    failures: $failures,
    routing: $routing,
    fix_order: $fix_order
  }')

echo "$DIAGNOSIS"

# Append to failure history in taxonomy
HISTORY_ENTRY=$(jq -n \
  --arg gate "$GATE_TYPE" \
  --arg product "$PRODUCT" \
  --arg ts "$TIMESTAMP" \
  --argjson types "$FIX_ORDER" \
  '{
    timestamp: $ts,
    gate_type: $gate,
    product: $product,
    failure_types: $types
  }')

jq --argjson entry "$HISTORY_ENTRY" \
  '.failure_history = (.failure_history + [$entry]) | .updated_at = ($entry.timestamp)' \
  "$TAXONOMY_FILE" > "${TAXONOMY_FILE}.tmp" && mv "${TAXONOMY_FILE}.tmp" "$TAXONOMY_FILE"
