#!/bin/bash
# sync-backlog-to-github.sh
# Syncs backlog.yml → GitHub Issues + Projects
# Usage: ./sync-backlog-to-github.sh <product>
#
# Mapping:
#   Epic    → GitHub Issue with 'epic' label
#   Feature → GitHub Issue with 'feature' label, linked to Epic
#   Story   → GitHub Issue with 'story' label + points, linked to Feature
#   Bug     → GitHub Issue with 'bug' label + severity
#   Sprint  → Referenced in issue body
#
# Idempotent: uses issue title + product prefix to find existing issues

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT="${1:-}"

if [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <product>"
  echo ""
  echo "Syncs products/<product>/docs/backlog.yml to GitHub Issues."
  echo ""
  echo "Example: $0 stablecoin-gateway"
  exit 1
fi

BACKLOG_FILE="$REPO_ROOT/products/$PRODUCT/docs/backlog.yml"

if [ ! -f "$BACKLOG_FILE" ]; then
  echo "Error: Backlog not found: $BACKLOG_FILE"
  echo "Run: .claude/scripts/manage-backlog.sh init $PRODUCT"
  exit 1
fi

# Check gh CLI availability
if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI (gh) not installed."
  echo "Install: https://cli.github.com/"
  exit 1
fi

# Get repo info
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null)
if [ -z "$REPO" ]; then
  echo "Error: Not in a GitHub repository or not authenticated."
  echo "Run: gh auth login"
  exit 1
fi

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SYNC BACKLOG → GITHUB: $PRODUCT"
echo "║  Repository: $REPO"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

CREATED=0
UPDATED=0
SKIPPED=0

# Ensure labels exist
ensure_label() {
  local name=$1
  local color=$2
  local description=$3

  if ! gh label list --repo "$REPO" | grep -q "^$name"; then
    gh label create "$name" --color "$color" --description "$description" --repo "$REPO" 2>/dev/null || true
    echo "  Created label: $name"
  fi
}

ensure_label "epic" "7057ff" "Epic-level backlog item"
ensure_label "feature" "0075ca" "Feature-level backlog item"
ensure_label "story" "008672" "User story"
ensure_label "bug" "d73a4a" "Bug report"
ensure_label "backlog" "e4e669" "Backlog item"
ensure_label "product:$PRODUCT" "fbca04" "Product: $PRODUCT"

# Map status to label
status_label() {
  case "$1" in
    draft)       echo "backlog" ;;
    ready)       echo "ready" ;;
    in_progress) echo "" ;;  # No extra label, use GitHub project column
    done)        echo "" ;;
    *)           echo "" ;;
  esac
}

# Find existing issue by title prefix
find_issue() {
  local title_prefix="$1"
  gh issue list --repo "$REPO" --search "\"$title_prefix\" in:title" --json number,title -q ".[0].number" 2>/dev/null || echo ""
}

# Create or update an issue
sync_issue() {
  local item_id="$1"
  local title="$2"
  local body="$3"
  local labels="$4"
  local status="$5"

  local full_title="[$PRODUCT] $item_id: $title"

  # Check if issue exists
  local existing_num
  existing_num=$(find_issue "[$PRODUCT] $item_id")

  if [ -n "$existing_num" ]; then
    # Update existing issue
    local state="open"
    [ "$status" = "done" ] && state="closed"

    gh issue edit "$existing_num" --repo "$REPO" \
      --title "$full_title" \
      --body "$body" \
      --add-label "$labels" 2>/dev/null || true

    if [ "$state" = "closed" ]; then
      gh issue close "$existing_num" --repo "$REPO" 2>/dev/null || true
    elif [ "$state" = "open" ]; then
      gh issue reopen "$existing_num" --repo "$REPO" 2>/dev/null || true
    fi

    echo "  Updated #$existing_num: $full_title"
    UPDATED=$((UPDATED + 1))
  else
    # Create new issue
    local state_flag=""
    # Always create as open, close after if done

    local new_num
    new_num=$(gh issue create --repo "$REPO" \
      --title "$full_title" \
      --body "$body" \
      --label "$labels" 2>/dev/null | grep -oE '[0-9]+$' || echo "")

    if [ -n "$new_num" ] && [ "$status" = "done" ]; then
      gh issue close "$new_num" --repo "$REPO" 2>/dev/null || true
    fi

    if [ -n "$new_num" ]; then
      echo "  Created #$new_num: $full_title"
      CREATED=$((CREATED + 1))
    else
      echo "  Failed to create: $full_title"
      SKIPPED=$((SKIPPED + 1))
    fi
  fi
}

# ============================================================================
# Parse and sync epics
# ============================================================================
echo "Syncing epics..."

# Simple YAML parser using grep/awk (sufficient for our structured format)
# For each epic, extract id, title, status, description
EPIC_IDS=$(grep -E '^\s+- id: EPIC-' "$BACKLOG_FILE" | sed 's/.*id: //' | tr -d ' ')

for epic_id in $EPIC_IDS; do
  # Extract epic data (look for the block after this ID)
  EPIC_BLOCK=$(awk "/id: $epic_id/{found=1} found{print} found && /^  - id: EPIC-/ && !/id: $epic_id/{exit}" "$BACKLOG_FILE")
  EPIC_TITLE=$(echo "$EPIC_BLOCK" | grep 'title:' | head -1 | sed 's/.*title: *"\?\([^"]*\)"\?/\1/')
  EPIC_STATUS=$(echo "$EPIC_BLOCK" | grep 'status:' | head -1 | sed 's/.*status: *//')
  EPIC_DESC=$(echo "$EPIC_BLOCK" | grep 'description:' | head -1 | sed 's/.*description: *"\?\([^"]*\)"\?/\1/')

  BODY="## Epic: $EPIC_TITLE

**Product**: $PRODUCT
**Status**: $EPIC_STATUS

### Description
$EPIC_DESC

---
*Synced from backlog.yml by sync-backlog-to-github.sh*"

  sync_issue "$epic_id" "$EPIC_TITLE" "$BODY" "epic,product:$PRODUCT" "$EPIC_STATUS"
done

echo ""

# ============================================================================
# Parse and sync stories
# ============================================================================
echo "Syncing stories..."

STORY_IDS=$(grep -E '^\s+- id: STORY-' "$BACKLOG_FILE" | sed 's/.*id: //' | tr -d ' ')

for story_id in $STORY_IDS; do
  STORY_BLOCK=$(awk "/id: $story_id/{found=1} found{print} found && /^          - id: STORY-/ && !/id: $story_id/{exit}" "$BACKLOG_FILE")
  STORY_TITLE=$(echo "$STORY_BLOCK" | grep 'title:' | head -1 | sed 's/.*title: *"\?\([^"]*\)"\?/\1/')
  STORY_STATUS=$(echo "$STORY_BLOCK" | grep 'status:' | head -1 | sed 's/.*status: *//')
  STORY_POINTS=$(echo "$STORY_BLOCK" | grep 'points:' | head -1 | sed 's/.*points: *//')
  STORY_SPRINT=$(echo "$STORY_BLOCK" | grep 'sprint:' | head -1 | sed 's/.*sprint: *//')

  BODY="## User Story: $STORY_TITLE

**Product**: $PRODUCT
**Status**: $STORY_STATUS
**Story Points**: ${STORY_POINTS:-?}
**Sprint**: ${STORY_SPRINT:-unassigned}

---
*Synced from backlog.yml by sync-backlog-to-github.sh*"

  sync_issue "$story_id" "$STORY_TITLE" "$BODY" "story,product:$PRODUCT" "$STORY_STATUS"
done

echo ""

# ============================================================================
# Parse and sync bugs
# ============================================================================
echo "Syncing bugs..."

BUG_IDS=$(grep -E '^\s+- id: BUG-' "$BACKLOG_FILE" | sed 's/.*id: //' | tr -d ' ')

for bug_id in $BUG_IDS; do
  BUG_BLOCK=$(awk "/id: $bug_id/{found=1} found{print} found && /^  - id: BUG-/ && !/id: $bug_id/{exit}" "$BACKLOG_FILE")
  BUG_TITLE=$(echo "$BUG_BLOCK" | grep 'title:' | head -1 | sed 's/.*title: *"\?\([^"]*\)"\?/\1/')
  BUG_STATUS=$(echo "$BUG_BLOCK" | grep 'status:' | head -1 | sed 's/.*status: *//')
  BUG_SEVERITY=$(echo "$BUG_BLOCK" | grep 'severity:' | head -1 | sed 's/.*severity: *//')
  BUG_LINKED=$(echo "$BUG_BLOCK" | grep 'linked_story:' | head -1 | sed 's/.*linked_story: *//')

  BODY="## Bug: $BUG_TITLE

**Product**: $PRODUCT
**Status**: $BUG_STATUS
**Severity**: ${BUG_SEVERITY:-medium}
**Linked Story**: ${BUG_LINKED:-none}

---
*Synced from backlog.yml by sync-backlog-to-github.sh*"

  # Map bug status to done/not-done
  BUG_DONE_STATUS="$BUG_STATUS"
  [ "$BUG_STATUS" = "closed" ] && BUG_DONE_STATUS="done"

  sync_issue "$bug_id" "$BUG_TITLE" "$BODY" "bug,product:$PRODUCT" "$BUG_DONE_STATUS"
done

echo ""

# ============================================================================
# RESULTS
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    SYNC RESULTS                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Created: $CREATED"
echo "  Updated: $UPDATED"
echo "  Skipped: $SKIPPED"
echo ""
echo "View issues: gh issue list --repo $REPO --label product:$PRODUCT"
