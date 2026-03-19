# Dashboard Command

Generate a comprehensive in-session dashboard report.

## Gather Data

Run these commands to collect real data:

```bash
echo "=== ConnectSW Dashboard ==="
echo "Generated: $(date)"
echo ""

# 1. Product Overview
echo "## Products"
echo ""
echo "| Product | Apps | Recent Commits (7d) | Status |"
echo "|---------|------|---------------------|--------|"

REPO_ROOT="$(git rev-parse --show-toplevel)"

# Detect repo mode and build product list
if [ -d "$REPO_ROOT/products" ]; then
  PRODUCT_DIRS=("$REPO_ROOT"/products/*/)
else
  # Single-repo: treat repo root as the only product
  PRODUCT_DIRS=("$REPO_ROOT")
fi

for product_dir in "${PRODUCT_DIRS[@]}"; do
  [ -d "$product_dir" ] || continue
  product=$(basename "$product_dir")

  apps=""
  [ -d "${product_dir}apps/api" ] && apps="api"
  [ -d "${product_dir}apps/web" ] && apps="${apps:+$apps+}web"
  [ -z "$apps" ] && apps="-"

  recent=$(git log --oneline --since="7 days ago" -- "$product_dir" 2>/dev/null | wc -l | tr -d ' ')

  if [ "$recent" -gt 0 ]; then
    status="Active"
  else
    status="Idle"
  fi

  echo "| $product | $apps | $recent | $status |"
done
echo ""

# 2. Git Status
echo "## Git"
echo "Branch: $(git branch --show-current)"
echo "Worktrees: $(git worktree list 2>/dev/null | wc -l | tr -d ' ')"
echo "Uncommitted changes: $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
echo ""

# 3. Agent Activity (from audit trail)
echo "## Agent Activity"
if [ -f ".claude/audit-trail.jsonl" ]; then
  echo "Total audit entries: $(wc -l < .claude/audit-trail.jsonl | tr -d ' ')"
  echo ""
  echo "By agent:"
  for agent_file in .claude/memory/agent-experiences/*.json; do
    [ -f "$agent_file" ] || continue
    agent=$(basename "$agent_file" .json)
    count=$(grep -c "\"agent\":\"$agent\"" .claude/audit-trail.jsonl 2>/dev/null || echo "0")
    [ "$count" -gt 0 ] && echo "  $agent: $count entries"
  done
  echo ""
  echo "By product:"
  if [ -d "$REPO_ROOT/products" ]; then
    AUDIT_PRODUCT_DIRS=("$REPO_ROOT"/products/*/)
  else
    AUDIT_PRODUCT_DIRS=("$REPO_ROOT")
  fi
  for product_dir in "${AUDIT_PRODUCT_DIRS[@]}"; do
    [ -d "$product_dir" ] || continue
    product=$(basename "$product_dir")
    count=$(grep -c "\"product\":\"$product\"" .claude/audit-trail.jsonl 2>/dev/null || echo "0")
    [ "$count" -gt 0 ] && echo "  $product: $count entries"
  done
else
  echo "No audit trail data yet."
fi
echo ""

# 4. Open PRs
echo "## Open PRs"
gh pr list --state open 2>/dev/null || echo "None or unable to fetch"
echo ""

# 5. Quality Gate Status
echo "## Recent Quality Reports"
if [ -d "$REPO_ROOT/products" ]; then
  find "$REPO_ROOT"/products/*/docs/quality-reports/ -name "*.md" -mtime -7 2>/dev/null | head -5 || echo "No recent reports"
else
  find "$REPO_ROOT"/docs/quality-reports/ -name "*.md" -mtime -7 2>/dev/null | head -5 || echo "No recent reports"
fi
```

## Present Report

Format the collected data into a readable dashboard report for the CEO.
Focus on what's actionable: active products, open PRs, any failing checks.
