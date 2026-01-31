#!/bin/bash
# view-audit-trail.sh
# Reads audit-trail.jsonl and produces a summary.
#
# Usage: .claude/scripts/view-audit-trail.sh [days] [product]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DAYS=${1:-7}
PRODUCT_FILTER=$2
AUDIT_FILE="$REPO_ROOT/.claude/audit-trail.jsonl"

if [ ! -f "$AUDIT_FILE" ]; then
  echo "No audit trail found at: $AUDIT_FILE"
  echo "Run backfill-history.sh or post-task-update.sh to populate."
  exit 0
fi

TOTAL=$(wc -l < "$AUDIT_FILE" | tr -d ' ')
echo "=== Audit Trail Summary ==="
echo "Total entries: $TOTAL"
echo "Filter: last $DAYS days${PRODUCT_FILTER:+ | product=$PRODUCT_FILTER}"
echo ""

# Filter by date (approximate: grep for recent date prefixes)
CUTOFF_DATE=$(date -v-${DAYS}d +%Y-%m-%d 2>/dev/null || date -d "$DAYS days ago" +%Y-%m-%d 2>/dev/null || echo "1970-01-01")

# Activity by product
echo "=== Activity by Product ==="
if command -v jq &> /dev/null; then
  jq -r '.product' "$AUDIT_FILE" 2>/dev/null | sort | uniq -c | sort -rn | while read count product; do
    echo "  $product: $count entries"
  done
else
  grep -o '"product":"[^"]*"' "$AUDIT_FILE" | cut -d'"' -f4 | sort | uniq -c | sort -rn | while read count product; do
    echo "  $product: $count entries"
  done
fi
echo ""

# Activity by agent
echo "=== Activity by Agent ==="
if command -v jq &> /dev/null; then
  jq -r '.agent' "$AUDIT_FILE" 2>/dev/null | sort | uniq -c | sort -rn | while read count agent; do
    echo "  $agent: $count entries"
  done
else
  grep -o '"agent":"[^"]*"' "$AUDIT_FILE" | cut -d'"' -f4 | sort | uniq -c | sort -rn | while read count agent; do
    echo "  $agent: $count entries"
  done
fi
echo ""

# Activity by type
echo "=== Activity by Type ==="
grep -o '"type":"[^"]*"' "$AUDIT_FILE" | cut -d'"' -f4 | sort | uniq -c | sort -rn | while read count type; do
  echo "  $type: $count entries"
done
echo ""

# Recent entries
echo "=== Recent Entries (last 10) ==="
tail -10 "$AUDIT_FILE" | while IFS= read -r line; do
  ts=$(echo "$line" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4 | cut -dT -f1)
  type=$(echo "$line" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
  agent=$(echo "$line" | grep -o '"agent":"[^"]*"' | cut -d'"' -f4)
  product=$(echo "$line" | grep -o '"product":"[^"]*"' | cut -d'"' -f4)
  summary=$(echo "$line" | grep -o '"summary":"[^"]*"' | cut -d'"' -f4 | cut -c1-50)
  printf "  %s %-10s %-20s %-15s %s\n" "$ts" "$type" "$agent" "$product" "$summary"
done

# Status distribution (if present)
echo ""
echo "=== Status Distribution ==="
grep -o '"status":"[^"]*"' "$AUDIT_FILE" | cut -d'"' -f4 | sort | uniq -c | sort -rn | while read count status; do
  echo "  $status: $count"
done
