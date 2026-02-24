#!/bin/bash
# spec-consistency-gate.sh
# Validates that spec consistency has been checked and passed
# Usage: ./spec-consistency-gate.sh <product>
#
# This script performs deterministic checks that complement the
# LLM-based /speckit.analyze command:
# 1. Verifies the spec consistency report exists
# 2. Verifies it shows PASS
# 3. Checks that required spec artifacts exist
# 4. Validates basic traceability linkage counts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT=$1

if [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <product>"
  echo ""
  echo "Validates spec consistency for a product."
  echo "Checks that /speckit.analyze has been run and key artifacts exist."
  exit 1
fi

PRODUCT_DIR="$REPO_ROOT/products/$PRODUCT"

if [ ! -d "$PRODUCT_DIR" ]; then
  echo "ERROR: Product directory not found: $PRODUCT_DIR"
  exit 1
fi

echo "============================================"
echo "SPEC CONSISTENCY GATE: $PRODUCT"
echo "============================================"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

pass() { echo "  ✅ PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
warn() { echo "  ⚠️  WARN: $1"; WARN_COUNT=$((WARN_COUNT + 1)); }

# ============================================
# CHECK 1: Spec consistency report exists
# ============================================
echo "--- Check 1: Spec Consistency Report ---"

REPORT_PATTERN="$PRODUCT_DIR/docs/quality-reports/spec-consistency*.md"
REPORT_FILE=$(ls -t $REPORT_PATTERN 2>/dev/null | head -1)

if [ -n "$REPORT_FILE" ] && [ -f "$REPORT_FILE" ]; then
  pass "Spec consistency report found: $(basename "$REPORT_FILE")"

  # Check for PASS result
  if grep -qi "overall.*pass\|result.*pass\|PASS" "$REPORT_FILE" 2>/dev/null; then
    pass "Report shows PASS result"
  elif grep -qi "overall.*fail\|result.*fail\|FAIL" "$REPORT_FILE" 2>/dev/null; then
    fail "Report shows FAIL result — run /speckit.analyze to diagnose"
  else
    warn "Cannot determine PASS/FAIL from report — review manually"
  fi

  # Check report age (warn if older than 7 days)
  REPORT_AGE_DAYS=$(( ( $(date +%s) - $(stat -f%m "$REPORT_FILE" 2>/dev/null || stat -c%Y "$REPORT_FILE" 2>/dev/null || echo "0") ) / 86400 ))
  if [ "$REPORT_AGE_DAYS" -gt 7 ]; then
    warn "Report is ${REPORT_AGE_DAYS} days old — consider re-running /speckit.analyze"
  fi
else
  fail "No spec consistency report found — run /speckit.analyze first"
fi

echo ""

# ============================================
# CHECK 2: Required spec artifacts exist
# ============================================
echo "--- Check 2: Required Spec Artifacts ---"

# PRD
if [ -f "$PRODUCT_DIR/docs/PRD.md" ]; then
  pass "PRD exists"
else
  fail "PRD not found at docs/PRD.md"
fi

# Architecture
if [ -f "$PRODUCT_DIR/docs/architecture.md" ]; then
  pass "Architecture document exists"
else
  warn "Architecture document not found (expected during architecture phase)"
fi

# Specs directory with at least one spec
SPEC_COUNT=$(find "$PRODUCT_DIR/docs/specs" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SPEC_COUNT" -gt 0 ]; then
  pass "Feature specifications found: $SPEC_COUNT spec files"
else
  warn "No feature specs in docs/specs/ — run /speckit.specify"
fi

echo ""

# ============================================
# CHECK 3: Requirement ID coverage
# ============================================
echo "--- Check 3: Requirement ID Coverage ---"

if [ -f "$PRODUCT_DIR/docs/PRD.md" ]; then
  # Count unique user story IDs in PRD
  US_IDS=$(grep -oE '\bUS-[0-9]+\b' "$PRODUCT_DIR/docs/PRD.md" 2>/dev/null | sort -u | wc -l | tr -d ' ')
  FR_IDS=$(grep -oE '\bFR-[0-9]+\b' "$PRODUCT_DIR/docs/PRD.md" 2>/dev/null | sort -u | wc -l | tr -d ' ')

  echo "  PRD defines: $US_IDS unique user stories, $FR_IDS unique requirements"

  # Check if those IDs appear in test files
  TEST_FILES=$(find "$PRODUCT_DIR" -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | grep -v node_modules || true)
  if [ -n "$TEST_FILES" ]; then
    TESTED_US=$(echo "$TEST_FILES" | xargs grep -ohE '\[US-[0-9]+\]' 2>/dev/null | sort -u | wc -l | tr -d ' ')
    if [ "$US_IDS" -gt 0 ]; then
      COVERAGE_PCT=$((TESTED_US * 100 / US_IDS))
      if [ "$COVERAGE_PCT" -ge 90 ]; then
        pass "Requirement coverage: $TESTED_US/$US_IDS user stories referenced in tests ($COVERAGE_PCT%)"
      elif [ "$COVERAGE_PCT" -ge 50 ]; then
        warn "Requirement coverage: $TESTED_US/$US_IDS ($COVERAGE_PCT%) — target >= 90%"
      else
        fail "Requirement coverage: $TESTED_US/$US_IDS ($COVERAGE_PCT%) — target >= 90%"
      fi
    fi
  else
    warn "No test files found yet"
  fi
else
  warn "Cannot check coverage without PRD"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo "============================================"
echo "SPEC CONSISTENCY GATE SUMMARY"
echo "============================================"
echo ""
echo "  Passed:   $PASS_COUNT"
echo "  Failed:   $FAIL_COUNT"
echo "  Warnings: $WARN_COUNT"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  GATE_RESULT="FAIL"
  echo "  RESULT: ❌ FAIL"
  echo ""
  echo "  Fix the failures above before proceeding."
  echo "  Run /speckit.analyze to generate the consistency report."
else
  GATE_RESULT="PASS"
  echo "  RESULT: ✅ PASS (with $WARN_COUNT warnings)"
fi

# Write report
REPORT_DIR="$PRODUCT_DIR/docs/quality-reports"
mkdir -p "$REPORT_DIR"
GATE_REPORT_FILE="$REPORT_DIR/spec-consistency-gate-$(date +%Y%m%d).md"

cat > "$GATE_REPORT_FILE" << REPORTEOF
# Spec Consistency Gate Report: $PRODUCT

**Date**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Product**: $PRODUCT
**Result**: $GATE_RESULT

## Summary

| Metric | Value |
|--------|-------|
| Passed | $PASS_COUNT |
| Failed | $FAIL_COUNT |
| Warnings | $WARN_COUNT |

## Checks Performed

1. Spec consistency report existence and PASS status
2. Required artifacts (PRD, architecture, specs)
3. Requirement ID coverage in tests

## Note

This gate performs deterministic checks complementing the
LLM-based /speckit.analyze command. For full spec-plan-tasks
alignment analysis, run /speckit.analyze separately.
REPORTEOF

echo ""
echo "GATE_REPORT_FILE=$GATE_REPORT_FILE"

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
