#!/bin/bash
# coverage-gate.sh
# Enforces 80% test coverage gate for a product
# Usage: ./coverage-gate.sh <product> [threshold_percent]

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT="${1:-}"
THRESHOLD="${2:-80}"

if [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <product> [threshold_percent]"
  exit 1
fi

PRODUCT_DIR="$REPO_ROOT/products/$PRODUCT"
echo "================================================"
echo "COVERAGE GATE: $PRODUCT (threshold: $THRESHOLD%)"
echo "================================================"
echo ""

GATE_PASS=true

run_coverage() {
  local app_dir="$1"
  local app_name="$2"

  if [ ! -d "$app_dir" ]; then
    return
  fi

  echo "--- $app_name ---"
  cd "$app_dir"

  # Run coverage
  if pnpm test --coverage --passWithNoTests 2>/tmp/cov-$app_name.txt; then
    COV=$(grep -E "All files|Statements" /tmp/cov-$app_name.txt | grep -oE "[0-9]+\.[0-9]+" | head -1 || echo "0")
    COV_INT=${COV%.*}

    if [ "${COV_INT:-0}" -ge "$THRESHOLD" ]; then
      echo "  Coverage: ${COV}% (>= $THRESHOLD%)"
    else
      echo "  Coverage: ${COV}% (< $THRESHOLD% required)"
      GATE_PASS=false
    fi
  else
    echo "  WARNING: Tests failed or no coverage data"
    GATE_PASS=false
  fi

  cd "$REPO_ROOT"
}

run_coverage "$PRODUCT_DIR/apps/api" "API"
run_coverage "$PRODUCT_DIR/apps/web" "Web"

echo ""
if [ "$GATE_PASS" = true ]; then
  echo "  RESULT: PASS -- Coverage >= $THRESHOLD%"
  exit 0
else
  echo "  RESULT: FAIL -- Coverage below $THRESHOLD%"
  echo ""
  echo "  Increase test coverage before merging."
  exit 1
fi
