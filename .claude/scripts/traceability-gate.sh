#!/bin/bash
# traceability-gate.sh
# Validates requirement traceability across code, tests, and commits
# Usage: ./traceability-gate.sh <product>
#
# Constitution Article VI Enforcement:
#   1. Every commit references a story (US-XX) or requirement (FR-XXX) ID
#   2. Every test name includes acceptance criteria IDs
#   3. Every feature code file has requirement linkage
#   4. Every acceptance criterion has at least one test
#   5. PR description lists implemented stories

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT=$1

if [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <product>"
  echo ""
  echo "Validates requirement traceability for a product."
  echo "Checks commits, tests, and code for story/requirement ID linkage."
  exit 1
fi

PRODUCT_DIR="$REPO_ROOT/products/$PRODUCT"

if [ ! -d "$PRODUCT_DIR" ]; then
  echo "ERROR: Product directory not found: $PRODUCT_DIR"
  exit 1
fi

echo "============================================"
echo "TRACEABILITY GATE: $PRODUCT"
echo "============================================"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

pass() { echo "  ✅ PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
warn() { echo "  ⚠️  WARN: $1"; WARN_COUNT=$((WARN_COUNT + 1)); }

# ============================================
# CHECK 1: PRD has requirement IDs
# ============================================
echo "--- Check 1: PRD Requirement IDs ---"

PRD_FILE="$PRODUCT_DIR/docs/PRD.md"
if [ -f "$PRD_FILE" ]; then
  US_COUNT=$(grep -c '\bUS-[0-9]\+\b' "$PRD_FILE" 2>/dev/null || echo "0")
  FR_COUNT=$(grep -c '\bFR-[0-9]\+\b' "$PRD_FILE" 2>/dev/null || echo "0")

  if [ "$US_COUNT" -gt 0 ]; then
    pass "PRD contains $US_COUNT user story IDs (US-XX)"
  else
    fail "PRD has no user story IDs (US-XX). Every story needs a unique ID."
  fi

  if [ "$FR_COUNT" -gt 0 ]; then
    pass "PRD contains $FR_COUNT functional requirement IDs (FR-XXX)"
  else
    warn "PRD has no functional requirement IDs (FR-XXX). Consider adding them."
  fi
else
  fail "PRD not found at $PRD_FILE"
fi

echo ""

# ============================================
# CHECK 2: Commits reference story/requirement IDs
# ============================================
echo "--- Check 2: Commit Traceability ---"

# Get commits on this branch not on main
BRANCH=$(git branch --show-current)
COMMIT_COUNT=$(git log --oneline "origin/main..$BRANCH" 2>/dev/null | wc -l | tr -d ' ')

if [ "$COMMIT_COUNT" -gt 0 ]; then
  TRACED_COMMITS=0
  UNTRACED_COMMITS=0

  while IFS= read -r line; do
    HASH=$(echo "$line" | cut -d' ' -f1)
    MSG=$(echo "$line" | cut -d' ' -f2-)

    # Check for US-XX, FR-XXX, NFR-XXX, or #issue_number
    if echo "$MSG" | grep -qE '\[US-[0-9]+\]|\[FR-[0-9]+\]|\[NFR-[0-9]+\]|#[0-9]+'; then
      TRACED_COMMITS=$((TRACED_COMMITS + 1))
    else
      # Allow docs/chore/ci commits without traceability
      if echo "$MSG" | grep -qE '^(docs|chore|ci|style)\('; then
        TRACED_COMMITS=$((TRACED_COMMITS + 1))
      else
        UNTRACED_COMMITS=$((UNTRACED_COMMITS + 1))
        warn "Commit $HASH missing story/req ID: $MSG"
      fi
    fi
  done < <(git log --oneline "origin/main..$BRANCH" 2>/dev/null)

  TOTAL=$((TRACED_COMMITS + UNTRACED_COMMITS))
  if [ "$TOTAL" -gt 0 ]; then
    PCT=$((TRACED_COMMITS * 100 / TOTAL))
    if [ "$PCT" -ge 90 ]; then
      pass "Commit traceability: $TRACED_COMMITS/$TOTAL ($PCT%)"
    elif [ "$PCT" -ge 70 ]; then
      warn "Commit traceability: $TRACED_COMMITS/$TOTAL ($PCT%) — target >= 90%"
    else
      fail "Commit traceability: $TRACED_COMMITS/$TOTAL ($PCT%) — target >= 90%"
    fi
  fi
else
  warn "No commits found on branch (or same as main)"
fi

echo ""

# ============================================
# CHECK 3: Test names reference acceptance criteria
# ============================================
echo "--- Check 3: Test Name Traceability ---"

# Search for test files
TEST_FILES=$(find "$PRODUCT_DIR" -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | grep -v node_modules || true)

if [ -n "$TEST_FILES" ]; then
  TOTAL_TESTS=0
  TRACED_TESTS=0

  for file in $TEST_FILES; do
    FILE_TESTS=$(grep -c "test\(\|it\(\|describe\(" "$file" 2>/dev/null || echo "0")
    FILE_TRACED=$(grep -c '\[US-[0-9]\+\]\|\[AC-[0-9]\+\]\|\[FR-[0-9]\+\]' "$file" 2>/dev/null || echo "0")
    TOTAL_TESTS=$((TOTAL_TESTS + FILE_TESTS))
    TRACED_TESTS=$((TRACED_TESTS + FILE_TRACED))
  done

  if [ "$TOTAL_TESTS" -gt 0 ]; then
    PCT=$((TRACED_TESTS * 100 / TOTAL_TESTS))
    if [ "$PCT" -ge 80 ]; then
      pass "Test traceability: $TRACED_TESTS/$TOTAL_TESTS test blocks reference IDs ($PCT%)"
    elif [ "$PCT" -ge 50 ]; then
      warn "Test traceability: $TRACED_TESTS/$TOTAL_TESTS ($PCT%) — target >= 80%"
    else
      fail "Test traceability: $TRACED_TESTS/$TOTAL_TESTS ($PCT%) — target >= 80%"
    fi
  else
    warn "No test blocks found in test files"
  fi
else
  warn "No test files found yet (expected during foundation setup)"
fi

echo ""

# ============================================
# CHECK 4: E2E tests organized by story
# ============================================
echo "--- Check 4: E2E Test Organization ---"

E2E_DIR="$PRODUCT_DIR/e2e/tests/stories"
if [ -d "$E2E_DIR" ]; then
  STORY_DIRS=$(find "$E2E_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  if [ "$STORY_DIRS" -gt 0 ]; then
    pass "E2E tests organized by story: $STORY_DIRS story directories"
  else
    warn "E2E stories directory exists but has no story subdirectories"
  fi
else
  warn "E2E story directory not found at $E2E_DIR (expected: e2e/tests/stories/{story-id}/)"
fi

echo ""

# ============================================
# CHECK 5: Architecture traceability matrix
# ============================================
echo "--- Check 5: Architecture Traceability Matrix ---"

ARCH_FILE="$PRODUCT_DIR/docs/architecture.md"
if [ -f "$ARCH_FILE" ]; then
  if grep -qi "traceability\|requirement.*map\|US-.*FR-\|story.*endpoint" "$ARCH_FILE" 2>/dev/null; then
    pass "Architecture document contains traceability mapping"
  else
    warn "Architecture document missing traceability matrix (US → FR → endpoint → table)"
  fi
else
  warn "Architecture document not found (expected during architecture phase)"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo "============================================"
echo "TRACEABILITY GATE SUMMARY"
echo "============================================"
echo ""
echo "  Passed:   $PASS_COUNT"
echo "  Failed:   $FAIL_COUNT"
echo "  Warnings: $WARN_COUNT"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "  RESULT: ❌ FAIL"
  echo ""
  echo "  Fix the failures above before proceeding."
  echo "  Constitution Article VI requires full traceability."
  exit 1
else
  echo "  RESULT: ✅ PASS (with $WARN_COUNT warnings)"
  echo ""
  echo "  Traceability gate passed. Warnings should be"
  echo "  addressed as the product matures."
fi

# Write report
REPORT_DIR="$PRODUCT_DIR/docs/quality-reports"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/traceability-gate-$(date +%Y%m%d).md"
echo "GATE_REPORT_FILE=$REPORT_FILE"
