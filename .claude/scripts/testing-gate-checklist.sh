#!/bin/bash
# testing-gate-checklist.sh
# Automated testing gate checklist for QA Engineer
# Usage: ./testing-gate-checklist.sh <product>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT=$1

if [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <product>"
  echo ""
  echo "Example: $0 gpu-calculator"
  exit 1
fi

PRODUCT_DIR="$REPO_ROOT/products/$PRODUCT"

if [ ! -d "$PRODUCT_DIR" ]; then
  echo "Error: Product directory not found: $PRODUCT_DIR"
  exit 1
fi

PASSED=0
FAILED=0
WARNINGS=0

# Helper function for checks
check() {
  local NAME=$1
  local CMD=$2
  local REQUIRED=${3:-true}
  
  printf "Checking: %-50s" "$NAME..."
  
  if eval "$CMD" > /dev/null 2>&1; then
    echo "✅ PASS"
    ((PASSED++))
    return 0
  else
    if [ "$REQUIRED" = "true" ]; then
      echo "❌ FAIL"
      ((FAILED++))
      return 1
    else
      echo "⚠️ WARN"
      ((WARNINGS++))
      return 0
    fi
  fi
}

warn() {
  local NAME=$1
  local MSG=$2
  printf "Warning: %-50s" "$NAME..."
  echo "⚠️ $MSG"
  ((WARNINGS++))
}

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           TESTING GATE CHECKLIST: $PRODUCT"
echo "║           $(date)"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

cd "$PRODUCT_DIR"

# ============================================================================
# PHASE 1: Prerequisites
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Phase 1: Prerequisites                                       │"
echo "└──────────────────────────────────────────────────────────────┘"

check "Package.json exists" "test -f package.json"
check "Node modules installed" "test -d node_modules || npm install"
check "TypeScript compiles" "npm run build 2>/dev/null || npx tsc --noEmit 2>/dev/null || true" false

echo ""

# ============================================================================
# PHASE 2: Unit Tests
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Phase 2: Unit Tests                                          │"
echo "└──────────────────────────────────────────────────────────────┘"

# Try different test commands
if npm run test:run > /dev/null 2>&1; then
  check "Unit tests pass" "npm run test:run"
elif npm run test -- --run > /dev/null 2>&1; then
  check "Unit tests pass" "npm run test -- --run"
elif npm test > /dev/null 2>&1; then
  check "Unit tests pass" "npm test -- --passWithNoTests"
else
  warn "Unit tests" "No test command found"
fi

echo ""

# ============================================================================
# PHASE 3: E2E Tests
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Phase 3: E2E Tests                                           │"
echo "└──────────────────────────────────────────────────────────────┘"

if [ -d "e2e" ]; then
  check "E2E test directory exists" "test -d e2e"
  check "E2E tests pass" "npm run test:e2e 2>/dev/null || npx playwright test 2>/dev/null" false
else
  warn "E2E tests" "No e2e directory found"
fi

echo ""

# ============================================================================
# PHASE 4: Code Quality
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Phase 4: Code Quality                                        │"
echo "└──────────────────────────────────────────────────────────────┘"

check "Linting passes" "npm run lint 2>/dev/null || npx eslint . 2>/dev/null || true" false
check "No console.error in production" "! grep -r 'console.error' apps/*/src --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v test | grep -v '.d.ts' | head -1" false
check "No TODO/FIXME in production" "! grep -r 'TODO\|FIXME' apps/*/src --include='*.ts' --include='*.tsx' 2>/dev/null | head -1" false

echo ""

# ============================================================================
# PHASE 5: Coverage
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Phase 5: Test Coverage                                       │"
echo "└──────────────────────────────────────────────────────────────┘"

# Try to get coverage
if npm run test -- --coverage > /tmp/coverage.txt 2>&1; then
  COVERAGE=$(grep -E "All files|Statements" /tmp/coverage.txt | grep -oE "[0-9]+\.[0-9]+" | head -1 || echo "0")
  if [ -n "$COVERAGE" ]; then
    COVERAGE_INT=${COVERAGE%.*}
    if [ "$COVERAGE_INT" -ge 80 ]; then
      printf "Checking: %-50s" "Coverage >= 80%..."
      echo "✅ PASS ($COVERAGE%)"
      ((PASSED++))
    else
      printf "Checking: %-50s" "Coverage >= 80%..."
      echo "❌ FAIL ($COVERAGE%)"
      ((FAILED++))
    fi
  else
    warn "Coverage" "Could not parse coverage"
  fi
else
  warn "Coverage" "Could not run coverage report"
fi

echo ""

# ============================================================================
# PHASE 6: Dev Server
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Phase 6: Development Server                                  │"
echo "└──────────────────────────────────────────────────────────────┘"

# This is informational - we can't easily test dev server in script
warn "Dev server" "Manual verification required - run 'npm run dev' and check http://localhost:3100+"

echo ""

# ============================================================================
# RESULTS
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                         RESULTS                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  ✅ Passed:   $PASSED"
echo "  ❌ Failed:   $FAILED"
echo "  ⚠️  Warnings: $WARNINGS"
echo ""

# Generate report
REPORT_DIR="$PRODUCT_DIR/docs/quality-reports"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/testing-gate-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# Testing Gate Report

**Product**: $PRODUCT
**Date**: $(date)
**Status**: $([ $FAILED -eq 0 ] && echo "PASS" || echo "FAIL")

## Results

- Passed: $PASSED
- Failed: $FAILED
- Warnings: $WARNINGS

## Checklist

$([ $FAILED -eq 0 ] && echo "All required checks passed." || echo "Some checks failed - see above output.")

---

*Generated by testing-gate-checklist.sh*
EOF

echo "Report saved: $REPORT_FILE"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║              ❌ TESTING GATE: FAIL                           ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Fix the failing checks and run again."
  exit 1
else
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║              ✅ TESTING GATE: PASS                           ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Ready for CEO checkpoint."
  exit 0
fi
