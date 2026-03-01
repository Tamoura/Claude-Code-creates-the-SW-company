#!/bin/bash
# speckit-preflight.sh
# Verifies spec-kit pipeline completeness before implementation starts
# Usage: ./speckit-preflight.sh <product> [--strict]
#
# Checks:
#   1. PRD exists with US-XX user story IDs
#   2. Feature specs exist in docs/specs/
#   3. Implementation plan exists (docs/plan.md) with US-XX references
#   4. Task list exists (docs/tasks.md) with story_ids fields
#
# Returns:
#   0 = pre-flight PASS (proceed with implementation)
#   1 = pre-flight FAIL (spec-kit steps not complete)
#
# Use --strict to fail on any missing artifact (hard gate)
# Default mode: warn on missing but only fail if PRD + user stories missing

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT="${1:-}"
STRICT="${2:-}"

if [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <product> [--strict]"
  exit 1
fi

PRODUCT_DIR="$REPO_ROOT/products/$PRODUCT"
DOCS_DIR="$PRODUCT_DIR/docs"

echo "================================================"
echo "SPEC-KIT PRE-FLIGHT: $PRODUCT"
echo "================================================"
echo ""

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

pass() { echo "  PASS: $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
fail() { echo "  FAIL: $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
warn() { echo "  WARN: $1"; WARN_COUNT=$((WARN_COUNT + 1)); }

# Check 1: PRD exists
echo "--- Check 1: Product Requirements Document ---"
if [ -f "$DOCS_DIR/PRD.md" ]; then
  US_COUNT=$(grep -cE '\bUS-[0-9]+\b' "$DOCS_DIR/PRD.md" 2>/dev/null || echo "0")
  if [ "$US_COUNT" -gt 0 ]; then
    pass "PRD.md found with $US_COUNT user story references"
  else
    fail "PRD.md exists but has NO user story IDs (US-XX). Run /speckit.specify first."
  fi
else
  fail "PRD.md not found. Run /speckit.specify before implementation."
fi

# Check 2: Feature specs
echo ""
echo "--- Check 2: Feature Specifications ---"
SPECS_DIR="$DOCS_DIR/specs"
if [ -d "$SPECS_DIR" ]; then
  SPEC_COUNT=$(find "$SPECS_DIR" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$SPEC_COUNT" -gt 0 ]; then
    pass "Found $SPEC_COUNT feature spec(s) in docs/specs/"
  else
    warn "docs/specs/ directory exists but is empty. Add feature specs."
  fi
else
  if [ "$STRICT" = "--strict" ]; then
    fail "docs/specs/ directory missing. Run /speckit.specify for each feature."
  else
    warn "docs/specs/ directory missing. Run /speckit.specify for each feature."
  fi
fi

# Check 3: Implementation plan
echo ""
echo "--- Check 3: Implementation Plan ---"
if [ -f "$DOCS_DIR/plan.md" ]; then
  PLAN_US_COUNT=$(grep -cE '\bUS-[0-9]+\b' "$DOCS_DIR/plan.md" 2>/dev/null || echo "0")
  if [ "$PLAN_US_COUNT" -gt 0 ]; then
    pass "plan.md found with $PLAN_US_COUNT user story references"
  else
    warn "plan.md exists but has no story ID references. Run /speckit.plan."
  fi
else
  if [ "$STRICT" = "--strict" ]; then
    fail "plan.md not found. Run /speckit.plan before implementation."
  else
    warn "plan.md not found. Run /speckit.plan before implementation."
  fi
fi

# Check 4: Task list
echo ""
echo "--- Check 4: Task List ---"
if [ -f "$DOCS_DIR/tasks.md" ]; then
  TASK_COUNT=$(grep -cE '^\s*-\s*\[' "$DOCS_DIR/tasks.md" 2>/dev/null || echo "0")
  STORY_REFS=$(grep -cE '\bUS-[0-9]+\b' "$DOCS_DIR/tasks.md" 2>/dev/null || echo "0")
  if [ "$TASK_COUNT" -gt 0 ]; then
    pass "tasks.md found with $TASK_COUNT tasks ($STORY_REFS story references)"
  else
    warn "tasks.md exists but has no task items. Run /speckit.tasks."
  fi
else
  if [ "$STRICT" = "--strict" ]; then
    fail "tasks.md not found. Run /speckit.tasks before implementation."
  else
    warn "tasks.md not found. Run /speckit.tasks before implementation."
  fi
fi

# Check 5: Architecture
echo ""
echo "--- Check 5: Architecture Document ---"
if [ -f "$DOCS_DIR/architecture.md" ] || ls "$DOCS_DIR"/ADRs/*.md 2>/dev/null | head -1 > /dev/null; then
  pass "Architecture documentation found"
else
  if [ "$STRICT" = "--strict" ]; then
    fail "No architecture.md or ADRs found. Architecture must be defined before implementation."
  else
    warn "No architecture.md or ADRs found. Consider running /speckit.plan."
  fi
fi

# Summary
echo ""
echo "================================================"
echo "PRE-FLIGHT SUMMARY: $PRODUCT"
echo "================================================"
echo "  Passed:   $PASS_COUNT"
echo "  Failed:   $FAIL_COUNT"
echo "  Warnings: $WARN_COUNT"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "  RESULT: FAIL -- spec-kit pipeline incomplete"
  echo ""
  echo "  The orchestrator MUST complete spec-kit steps before"
  echo "  spawning implementation agents."
  echo ""
  echo "  Required pipeline:"
  echo "    1. /speckit.specify -> Creates PRD with US-XX IDs"
  echo "    2. /speckit.clarify -> Resolves ambiguities"
  echo "    3. /speckit.plan   -> Creates implementation plan"
  echo "    4. /speckit.tasks  -> Generates task list"
  echo "    5. /speckit.analyze -> Validates consistency"
  echo ""
  exit 1
else
  echo "  RESULT: PASS (with $WARN_COUNT warnings)"
  echo ""
  echo "  Spec-kit pipeline complete. Safe to spawn implementation agents."
fi
