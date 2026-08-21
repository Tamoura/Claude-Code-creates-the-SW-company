#!/bin/bash
# smoke-test-gate.test.sh
# Tests for the smoke-test-gate.sh script itself
#
# Usage: .claude/tests/smoke-test-gate.test.sh

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SMOKE_SCRIPT="$REPO_ROOT/.claude/scripts/smoke-test-gate.sh"

PASSED=0
FAILED=0

assert_exit_code() {
  local test_name=$1
  local expected=$2
  local actual=$3

  if [ "$actual" -eq "$expected" ]; then
    echo "  ✅ $test_name"
    PASSED=$((PASSED + 1))
  else
    echo "  ❌ $test_name (expected exit $expected, got $actual)"
    FAILED=$((FAILED + 1))
  fi
}

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           SMOKE TEST GATE — SELF TESTS                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Missing argument
echo "Test 1: Missing argument shows usage"
EXIT_CODE=0
"$SMOKE_SCRIPT" > /tmp/smoke-test-1.out 2>&1 || EXIT_CODE=$?
assert_exit_code "Exits with code 1 on missing argument" 1 "$EXIT_CODE"
if grep -q "Usage:" /tmp/smoke-test-1.out; then
  echo "  ✅ Shows usage message"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ Missing usage message"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 2: Non-existent product
echo "Test 2: Non-existent product"
EXIT_CODE=0
"$SMOKE_SCRIPT" "nonexistent-product-xyz" > /tmp/smoke-test-2.out 2>&1 || EXIT_CODE=$?
assert_exit_code "Exits with code 1 for non-existent product" 1 "$EXIT_CODE"
if grep -q "not found" /tmp/smoke-test-2.out; then
  echo "  ✅ Shows 'not found' error"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ Missing 'not found' error"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: Script is executable
echo "Test 3: Script permissions"
if [ -x "$SMOKE_SCRIPT" ]; then
  echo "  ✅ Script is executable"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ Script is not executable"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Placeholder detection pattern
echo "Test 4: Placeholder detection pattern"
TMPDIR_TEST=$(mktemp -d)
mkdir -p "$TMPDIR_TEST/pages" "$TMPDIR_TEST/components"
cat > "$TMPDIR_TEST/pages/Bad.tsx" << 'EOF'
export default function Bad() { return <div>Coming Soon</div>; }
EOF
cat > "$TMPDIR_TEST/pages/Good.tsx" << 'EOF'
export default function Good() { return <div>Real Content</div>; }
EOF
PLACEHOLDER_COUNT=$(grep -rlE "Coming Soon|Placeholder|Under Construction|Not yet implemented" \
  "$TMPDIR_TEST/pages" "$TMPDIR_TEST/components" 2>/dev/null | wc -l | tr -d ' ')
rm -rf "$TMPDIR_TEST"
if [ "$PLACEHOLDER_COUNT" = "1" ]; then
  echo "  ✅ Correctly detects 1 placeholder file"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ Expected 1 placeholder, found $PLACEHOLDER_COUNT"
  FAILED=$((FAILED + 1))
fi
echo ""

# Test 5: Script contains all required checks
echo "Test 5: Script contains all required checks"
CHECKS_FOUND=0
for pattern in "Server Startup" "Health Check" "Frontend Load" "Placeholder" "Playwright" "Production Build"; do
  if grep -q "$pattern" "$SMOKE_SCRIPT"; then
    CHECKS_FOUND=$((CHECKS_FOUND + 1))
  else
    echo "  ❌ Missing check: $pattern"
    FAILED=$((FAILED + 1))
  fi
done
if [ "$CHECKS_FOUND" -eq 6 ]; then
  echo "  ✅ All 6 checks present in script"
  PASSED=$((PASSED + 1))
fi
echo ""

# Test 6: Cleanup trap exists
echo "Test 6: Cleanup trap"
if grep -q "trap cleanup EXIT" "$SMOKE_SCRIPT"; then
  echo "  ✅ Cleanup trap registered"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ No cleanup trap found"
  FAILED=$((FAILED + 1))
fi
echo ""

# Results
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    SELF TEST RESULTS                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo ""

rm -f /tmp/smoke-test-1.out /tmp/smoke-test-2.out

if [ $FAILED -gt 0 ]; then
  echo "Some self-tests failed."
  exit 1
else
  echo "All self-tests passed."
  exit 0
fi
