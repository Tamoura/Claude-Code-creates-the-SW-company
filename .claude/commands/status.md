# Quick Status

Provide a concise status overview by scanning the filesystem and git directly.

## Gather Data

```bash
echo "=== ConnectSW Quick Status ==="
echo ""

# Current branch and recent work
echo "Branch: $(git branch --show-current)"
echo "Last commit: $(git log -1 --format='%h %s (%ar)')"
echo ""

# Products with recent activity
echo "=== Products ==="
for product_dir in products/*/; do
  [ -d "$product_dir" ] || continue
  product=$(basename "$product_dir")

  # Count recent commits (last 7 days)
  recent=$(git log --oneline --since="7 days ago" -- "$product_dir" 2>/dev/null | wc -l | tr -d ' ')

  # Detect app types
  apps=""
  [ -d "${product_dir}apps/api" ] && apps="api"
  [ -d "${product_dir}apps/web" ] && apps="${apps:+$apps,}web"
  [ -z "$apps" ] && apps="-"

  if [ "$recent" -gt 0 ]; then
    echo "  $product ($apps) - $recent commits this week"
  else
    echo "  $product ($apps) - idle"
  fi
done
echo ""

# Open PRs
echo "=== Open PRs ==="
gh pr list --state open 2>/dev/null || echo "  (unable to fetch or none)"
echo ""

# CI status for recent PRs
echo "=== CI Status ==="
gh pr list --state open --json number,title,statusCheckRollup --jq '.[] | "\(.number): \(.title) - checks: \(.statusCheckRollup | map(.conclusion) | join(","))"' 2>/dev/null || echo "  (unable to fetch)"
echo ""

# Audit trail summary (last 5 entries)
echo "=== Recent Activity (audit trail) ==="
if [ -f ".claude/audit-trail.jsonl" ]; then
  tail -5 .claude/audit-trail.jsonl | while IFS= read -r line; do
    ts=$(echo "$line" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4 | cut -dT -f1)
    agent=$(echo "$line" | grep -o '"agent":"[^"]*"' | cut -d'"' -f4)
    summary=$(echo "$line" | grep -o '"summary":"[^"]*"' | cut -d'"' -f4 | cut -c1-60)
    echo "  $ts $agent: $summary"
  done
else
  echo "  No audit trail yet"
fi
```

## Format Response

Present the status in a clear, concise format. Highlight:
- Which products are active (have recent commits)
- Any open PRs and their CI status
- Recent audit trail activity
- Any issues that need attention
