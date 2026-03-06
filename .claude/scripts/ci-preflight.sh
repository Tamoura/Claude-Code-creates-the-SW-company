#!/bin/bash
#
# CI Preflight Gate
# Simulates CI checks locally BEFORE pushing to prevent CI failures.
# This is a proactive gate — run before git push, not after CI fails.
#
# Usage: .claude/scripts/ci-preflight.sh [product]
#   product: optional — if given, also runs product-specific CI checks
#
# Exit codes:
#   0 = all checks pass, safe to push
#   1 = failures detected, do NOT push
#

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PRODUCT="${1:-}"
FAILURES=0
WARNINGS=0
REPORT_LINES=()

pass() { REPORT_LINES+=("  PASS: $1"); }
fail() { REPORT_LINES+=("  FAIL: $1"); FAILURES=$((FAILURES + 1)); }
warn() { REPORT_LINES+=("  WARN: $1"); WARNINGS=$((WARNINGS + 1)); }
section() { REPORT_LINES+=("" "== $1 =="); }

# ── 1. Lockfile Consistency ──────────────────────────────────────────────
section "Lockfile Consistency"

# Find all package.json files that are staged or modified
changed_pkg_files=$(git diff --cached --name-only -- '*/package.json' 'package.json' 2>/dev/null || true)

if [ -n "$changed_pkg_files" ]; then
  # Check if pnpm-lock.yaml is also staged
  lockfile_staged=$(git diff --cached --name-only -- 'pnpm-lock.yaml' '**/pnpm-lock.yaml' 2>/dev/null || true)
  if [ -z "$lockfile_staged" ]; then
    fail "package.json modified but pnpm-lock.yaml not staged. Run 'pnpm install' and stage the lockfile."
  else
    pass "Lockfile staged with package.json changes"
  fi
else
  pass "No package.json changes — lockfile check skipped"
fi

# Verify lockfile is in sync (if pnpm is available)
if command -v pnpm &>/dev/null; then
  if ! pnpm install --frozen-lockfile --dry-run 2>/dev/null; then
    fail "pnpm-lock.yaml is out of sync with package.json. Run 'pnpm install' to regenerate."
  else
    pass "pnpm-lock.yaml is in sync"
  fi
else
  warn "pnpm not available — cannot verify lockfile sync"
fi

# ── 2. GitHub Actions Validation ─────────────────────────────────────────
section "GitHub Actions Validation"

staged_workflows=$(git diff --cached --name-only -- '.github/workflows/*.yml' '.github/workflows/*.yaml' 2>/dev/null || true)

if [ -n "$staged_workflows" ]; then
  if command -v actionlint &>/dev/null; then
    # shellcheck disable=SC2086
    if actionlint $staged_workflows 2>/dev/null; then
      pass "Staged workflow files pass actionlint"
    else
      fail "actionlint found issues in staged workflow files"
    fi
  else
    warn "actionlint not installed — workflow validation skipped"
  fi

  # Check for known broken action references
  known_broken_actions=(
    "rhysd/actionlint-action@v1"
  )
  known_issues_file="$REPO_ROOT/.claude/ci/known-issues.yml"
  if [ -f "$known_issues_file" ]; then
    # Read broken actions from known-issues.yml
    while IFS= read -r line; do
      action=$(echo "$line" | sed -n 's/.*action: "\(.*\)"/\1/p')
      if [ -n "$action" ]; then
        known_broken_actions+=("$action")
      fi
    done < "$known_issues_file"
  fi

  for action in "${known_broken_actions[@]}"; do
    # shellcheck disable=SC2086
    if grep -l "$action" $staged_workflows 2>/dev/null; then
      fail "Workflow references broken action: $action (see .claude/ci/known-issues.yml for fix)"
    fi
  done
else
  pass "No workflow file changes"
fi

# Also check ALL workflow files for broken references (not just staged)
if [ -d "$REPO_ROOT/.github/workflows" ]; then
  # Check for rhysd/actionlint-action which no longer exists (only in 'uses:' lines, not comments)
  while IFS= read -r ref; do
    rel_path="${ref#"$REPO_ROOT/"}"
    warn "$rel_path references non-existent action rhysd/actionlint-action@v1"
  done < <(grep -rl "uses:.*rhysd/actionlint-action" "$REPO_ROOT/.github/workflows/" 2>/dev/null || true)
fi

# ── 3. TypeScript Compilation ────────────────────────────────────────────
section "TypeScript Compilation"

if [ -n "$PRODUCT" ] && [ -d "$REPO_ROOT/products/$PRODUCT" ]; then
  for app_dir in "$REPO_ROOT/products/$PRODUCT/apps/"*/; do
    [ -d "$app_dir" ] || continue
    app_name=$(basename "$app_dir")
    if [ -f "$app_dir/tsconfig.json" ]; then
      if (cd "$app_dir" && npx tsc --noEmit 2>/dev/null); then
        pass "$PRODUCT/$app_name: TypeScript compiles"
      else
        fail "$PRODUCT/$app_name: TypeScript compilation errors"
      fi
    fi
  done
elif [ -n "$PRODUCT" ]; then
  warn "Product '$PRODUCT' not found at products/$PRODUCT"
fi

# ── 4. Lint Check ────────────────────────────────────────────────────────
section "Lint Check"

if [ -n "$PRODUCT" ] && [ -d "$REPO_ROOT/products/$PRODUCT" ]; then
  for app_dir in "$REPO_ROOT/products/$PRODUCT/apps/"*/; do
    [ -d "$app_dir" ] || continue
    app_name=$(basename "$app_dir")
    if [ -f "$app_dir/package.json" ]; then
      if (cd "$app_dir" && npm run lint --if-present 2>/dev/null); then
        pass "$PRODUCT/$app_name: Lint passes"
      else
        fail "$PRODUCT/$app_name: Lint errors found"
      fi
    fi
  done
fi

# ── 5. Test Execution ───────────────────────────────────────────────────
section "Test Execution"

if [ -n "$PRODUCT" ] && [ -d "$REPO_ROOT/products/$PRODUCT" ]; then
  for app_dir in "$REPO_ROOT/products/$PRODUCT/apps/"*/; do
    [ -d "$app_dir" ] || continue
    app_name=$(basename "$app_dir")
    if [ -f "$app_dir/package.json" ]; then
      has_test=$(cd "$app_dir" && node -e "const p=require('./package.json'); process.exit(p.scripts?.test ? 0 : 1)" 2>/dev/null && echo "yes" || echo "no")
      if [ "$has_test" = "yes" ]; then
        if (cd "$app_dir" && npm test 2>/dev/null); then
          pass "$PRODUCT/$app_name: Tests pass"
        else
          fail "$PRODUCT/$app_name: Test failures"
        fi
      else
        warn "$PRODUCT/$app_name: No test script found"
      fi
    fi
  done
fi

# ── 6. Secrets Scan ─────────────────────────────────────────────────────
section "Secrets Scan"

if command -v gitleaks &>/dev/null; then
  if gitleaks protect --staged --no-banner --exit-code 1 2>/dev/null; then
    pass "No secrets in staged files"
  else
    fail "Secrets detected in staged files"
  fi
else
  warn "gitleaks not installed — secrets scan skipped"
fi

# ── 7. Git Safety ───────────────────────────────────────────────────────
section "Git Safety"

staged_count=$(git diff --cached --name-only | wc -l | tr -d ' ')
if [ "$staged_count" -gt 30 ]; then
  fail "$staged_count files staged (threshold: 30) — likely accidental mass commit"
elif [ "$staged_count" -gt 20 ]; then
  warn "$staged_count files staged — approaching threshold (30)"
else
  pass "$staged_count files staged (within threshold)"
fi

# Check for .env files being committed
env_files=$(git diff --cached --name-only | grep -E '\.env$|\.env\.local$|\.env\.production$' || true)
if [ -n "$env_files" ]; then
  fail "Environment files staged for commit: $env_files"
else
  pass "No .env files staged"
fi

# ── 8. Known CI Issues Check ────────────────────────────────────────────
section "Known CI Issues Check"

known_issues_file="$REPO_ROOT/.claude/ci/known-issues.yml"
if [ -f "$known_issues_file" ]; then
  pass "Known issues registry exists at .claude/ci/known-issues.yml"
  # Count active issues
  active_count=$(grep -c "^    status: active" "$known_issues_file" 2>/dev/null || echo "0")
  if [ "$active_count" -gt 0 ]; then
    warn "$active_count active known CI issues — review .claude/ci/known-issues.yml"
  fi
else
  warn "No known issues registry found — creating template"
fi

# ── Report ───────────────────────────────────────────────────────────────
echo ""
echo "================================================================"
echo "  CI PREFLIGHT GATE REPORT"
echo "================================================================"
for line in "${REPORT_LINES[@]}"; do
  echo "$line"
done
echo ""
echo "================================================================"

if [ "$FAILURES" -gt 0 ]; then
  echo "  RESULT: FAIL ($FAILURES failures, $WARNINGS warnings)"
  echo "  ACTION: Fix failures before pushing. Do NOT push to remote."
  echo "================================================================"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo "  RESULT: PASS WITH WARNINGS ($WARNINGS warnings)"
  echo "  ACTION: Safe to push, but review warnings."
  echo "================================================================"
  exit 0
else
  echo "  RESULT: PASS"
  echo "  ACTION: Safe to push."
  echo "================================================================"
  exit 0
fi
