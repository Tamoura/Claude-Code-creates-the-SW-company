# System Health Check Command

Run this command to validate the ConnectSW system is properly configured.

## System Validation

### 1. Check Required Tools

```bash
echo "=== Required Tools ==="

for tool in jq yq git node npm; do
  if command -v "$tool" &> /dev/null; then
    version=$("$tool" --version 2>/dev/null | head -1)
    echo "OK $tool: $version"
  else
    echo "MISSING $tool"
  fi
done

if command -v gh &> /dev/null; then
  echo "OK gh: $(gh --version | head -1)"
  gh auth status &> /dev/null && echo "OK gh authenticated" || echo "WARN gh not authenticated"
else
  echo "WARN gh missing (optional)"
fi
```

### 2. Check Infrastructure Files

```bash
echo ""
echo "=== Infrastructure ==="

# Core files that must exist
core_files=(
  ".claude/CLAUDE.md"
  ".claude/orchestrator/state.yml"
  ".claude/orchestrator/orchestrator-enhanced.md"
  ".claude/memory/company-knowledge.json"
  ".claude/engine/task-graph-executor.ts"
  ".claude/protocols/message-router.ts"
  ".claude/audit-trail.jsonl"
)

for file in "${core_files[@]}"; do
  if [ -f "$file" ]; then
    echo "OK $file"
  else
    echo "MISSING $file"
  fi
done
```

### 3. Check Scripts Are Executable

```bash
echo ""
echo "=== Scripts ==="

scripts=(
  ".claude/scripts/post-task-update.sh"
  ".claude/scripts/update-agent-memory.sh"
  ".claude/scripts/backfill-history.sh"
  ".claude/scripts/testing-gate-checklist.sh"
  ".claude/scripts/generate-dashboard.sh"
  ".claude/scripts/setup-branch-protection.sh"
  ".claude/quality-gates/executor.sh"
)

for script in "${scripts[@]}"; do
  if [ -f "$script" ]; then
    if [ -x "$script" ]; then
      echo "OK $script"
    else
      echo "WARN $script (not executable)"
    fi
  else
    echo "MISSING $script"
  fi
done
```

### 4. Check TypeScript Infrastructure

```bash
echo ""
echo "=== TypeScript Infrastructure ==="

# Verify tsx is available
if npx tsx --version &> /dev/null 2>&1; then
  echo "OK tsx available"
else
  echo "MISSING tsx - run: npm install"
fi

# Test each TS file can at least parse
ts_files=(
  ".claude/engine/task-graph-executor.ts"
  ".claude/protocols/message-router.ts"
  ".claude/monitoring/agent-health.ts"
  ".claude/checkpointing/risk-calculator.ts"
)

for ts_file in "${ts_files[@]}"; do
  if [ -f "$ts_file" ]; then
    if npx tsx --eval "import('$(pwd)/$ts_file')" &> /dev/null 2>&1; then
      echo "OK $ts_file (parseable)"
    else
      echo "WARN $ts_file (parse error)"
    fi
  else
    echo "MISSING $ts_file"
  fi
done
```

### 5. Check Products (Filesystem Scan)

```bash
echo ""
echo "=== Products (from filesystem) ==="

if [ -d "products" ]; then
  for product_dir in products/*/; do
    [ -d "$product_dir" ] || continue
    product=$(basename "$product_dir")

    has_api="no"
    has_web="no"
    has_addendum="no"
    has_tests="no"
    recent_commits=0

    [ -d "${product_dir}apps/api" ] && has_api="yes"
    [ -d "${product_dir}apps/web" ] && has_web="yes"
    [ -f "${product_dir}.claude/addendum.md" ] && has_addendum="yes"

    # Check for test files
    test_count=$(find "$product_dir" -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l | tr -d ' ')
    [ "$test_count" -gt 0 ] && has_tests="$test_count files"

    # Recent activity
    recent_commits=$(git log --oneline --since="30 days ago" -- "$product_dir" 2>/dev/null | wc -l | tr -d ' ')

    echo "$product: api=$has_api web=$has_web tests=$has_tests commits(30d)=$recent_commits"
  done
else
  echo "MISSING products directory"
fi
```

### 6. Check Agent Memory

```bash
echo ""
echo "=== Agent Memory ==="

for agent_file in .claude/memory/agent-experiences/*.json; do
  [ -f "$agent_file" ] || continue
  agent=$(basename "$agent_file" .json)

  if command -v jq &> /dev/null; then
    tasks=$(jq '.task_history | length' "$agent_file" 2>/dev/null || echo "0")
    patterns=$(jq '.learned_patterns | length' "$agent_file" 2>/dev/null || echo "0")
    echo "$agent: tasks=$tasks patterns=$patterns"
  else
    echo "$agent: (install jq for details)"
  fi
done

# Audit trail
if [ -f ".claude/audit-trail.jsonl" ]; then
  entries=$(wc -l < .claude/audit-trail.jsonl | tr -d ' ')
  echo ""
  echo "Audit trail: $entries entries"
fi
```

### 7. Check CI/CD

```bash
echo ""
echo "=== CI/CD ==="

for wf in .github/workflows/*.yml; do
  [ -f "$wf" ] || continue
  echo "OK $(basename "$wf")"
done

# Check for || true in workflows (bad pattern)
if grep -r '|| true' .github/workflows/ 2>/dev/null | grep -v '#'; then
  echo "WARN: Found '|| true' in workflows (bypasses failures)"
fi
```

### 8. Git Status

```bash
echo ""
echo "=== Git ==="
echo "Branch: $(git branch --show-current)"
echo "Status: $(git status --porcelain | wc -l | tr -d ' ') uncommitted changes"
echo "Worktrees: $(git worktree list 2>/dev/null | wc -l | tr -d ' ')"
echo ""
echo "Recent commits:"
git log --oneline -5
```

### 9. Summary

After running the checks, present:
- Count of OK, WARN, and MISSING items
- Any critical issues that need fixing
- Quick fix commands for common problems

## Quick Fixes

```bash
# Install missing tools (macOS)
brew install jq yq gh

# Fix script permissions
chmod +x .claude/scripts/*.sh .claude/quality-gates/*.sh

# Install root dependencies (adds tsx)
npm install

# Activate git hooks
git config core.hooksPath .githooks
```
