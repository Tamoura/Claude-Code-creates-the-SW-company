#!/bin/bash
# manage-backlog.sh
# CLI for agile backlog operations
# Usage: ./manage-backlog.sh <command> <product> [args...]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

COMMAND="${1:-}"
PRODUCT="${2:-}"

usage() {
  echo "Usage: $0 <command> <product> [args...]"
  echo ""
  echo "Commands:"
  echo "  sprint <product>                    View current sprint"
  echo "  board <product>                     View kanban board"
  echo "  add-story <product> <feat-id> <title> [points]  Add a user story"
  echo "  add-bug <product> <title> <severity> [story-id] Add a bug"
  echo "  update <product> <item-id> <status> Update item status"
  echo "  velocity <product>                  Sprint velocity report"
  echo "  summary <product>                   Quick summary"
  echo "  init <product>                      Initialize backlog from template"
  echo ""
  echo "Examples:"
  echo "  $0 sprint stablecoin-gateway"
  echo "  $0 board stablecoin-gateway"
  echo "  $0 add-story stablecoin-gateway FEAT-001 'As a user, I can...' 5"
  echo "  $0 update stablecoin-gateway STORY-001 done"
  echo "  $0 velocity stablecoin-gateway"
  exit 1
}

[ -z "$COMMAND" ] && usage

BACKLOG_FILE=""
if [ -n "$PRODUCT" ]; then
  BACKLOG_FILE="$REPO_ROOT/products/$PRODUCT/docs/backlog.yml"
fi

require_backlog() {
  if [ -z "$PRODUCT" ]; then
    echo "Error: Product name required"
    usage
  fi
  if [ ! -f "$BACKLOG_FILE" ]; then
    echo "Error: Backlog not found: $BACKLOG_FILE"
    echo "Run: $0 init $PRODUCT"
    exit 1
  fi
}

# ============================================================================
# COMMANDS
# ============================================================================

cmd_init() {
  if [ -z "$PRODUCT" ]; then
    echo "Error: Product name required"
    usage
  fi

  TEMPLATE="$REPO_ROOT/.claude/workflows/templates/backlog-template.yml"
  if [ ! -f "$TEMPLATE" ]; then
    echo "Error: Template not found: $TEMPLATE"
    exit 1
  fi

  PRODUCT_DIR="$REPO_ROOT/products/$PRODUCT"
  if [ ! -d "$PRODUCT_DIR" ]; then
    echo "Error: Product directory not found: $PRODUCT_DIR"
    exit 1
  fi

  mkdir -p "$PRODUCT_DIR/docs"

  if [ -f "$BACKLOG_FILE" ]; then
    echo "Backlog already exists: $BACKLOG_FILE"
    echo "Use other commands to manage it."
    exit 0
  fi

  TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  SPRINT_START=$(date -u +%Y-%m-%d)
  SPRINT_END=$(date -u -v+14d +%Y-%m-%d 2>/dev/null || date -u -d "+14 days" +%Y-%m-%d 2>/dev/null || echo "TBD")

  OUTPUT=$(cat "$TEMPLATE")
  OUTPUT="${OUTPUT//\{PRODUCT\}/$PRODUCT}"
  OUTPUT="${OUTPUT//\{TIMESTAMP\}/$TIMESTAMP}"
  OUTPUT="${OUTPUT//\{SPRINT_START\}/$SPRINT_START}"
  OUTPUT="${OUTPUT//\{SPRINT_END\}/$SPRINT_END}"

  echo "$OUTPUT" > "$BACKLOG_FILE"
  echo "Backlog initialized: $BACKLOG_FILE"
}

cmd_sprint() {
  require_backlog

  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  CURRENT SPRINT: $PRODUCT"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  # Find active sprint
  ACTIVE_SPRINT=$(grep -A 10 'status: active' "$BACKLOG_FILE" | head -10)

  if [ -z "$ACTIVE_SPRINT" ]; then
    echo "  No active sprint found."
    return
  fi

  SPRINT_NAME=$(echo "$ACTIVE_SPRINT" | grep 'name:' | head -1 | sed 's/.*name: *"\?\([^"]*\)"\?/\1/')
  SPRINT_START=$(echo "$ACTIVE_SPRINT" | grep 'start_date:' | head -1 | sed 's/.*start_date: *"\?\([^"]*\)"\?/\1/')
  SPRINT_END=$(echo "$ACTIVE_SPRINT" | grep 'end_date:' | head -1 | sed 's/.*end_date: *"\?\([^"]*\)"\?/\1/')
  SPRINT_VELOCITY=$(echo "$ACTIVE_SPRINT" | grep 'velocity:' | head -1 | sed 's/.*velocity: *//')

  echo "  Name:     $SPRINT_NAME"
  echo "  Period:   $SPRINT_START → $SPRINT_END"
  echo "  Velocity: ${SPRINT_VELOCITY:-0} points"
  echo ""

  # Count stories by status
  TOTAL=$(grep -c 'id: STORY-' "$BACKLOG_FILE" 2>/dev/null || echo "0")
  DONE=$(grep -B1 'status: done' "$BACKLOG_FILE" | grep -c 'id: STORY-' 2>/dev/null || echo "0")
  IN_PROGRESS=$(grep -B1 'status: in_progress' "$BACKLOG_FILE" | grep -c 'id: STORY-' 2>/dev/null || echo "0")
  DRAFT=$(grep -B1 'status: draft' "$BACKLOG_FILE" | grep -c 'id: STORY-' 2>/dev/null || echo "0")

  echo "  Stories:  $TOTAL total"
  echo "    Done:        $DONE"
  echo "    In Progress: $IN_PROGRESS"
  echo "    Draft:       $DRAFT"
}

cmd_board() {
  require_backlog

  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  KANBAN BOARD: $PRODUCT"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  for status in "draft" "ready" "in_progress" "done"; do
    case $status in
      draft)       label="BACKLOG" ;;
      ready)       label="READY" ;;
      in_progress) label="IN PROGRESS" ;;
      done)        label="DONE" ;;
    esac

    echo "┌────────────────────────────────────┐"
    echo "│ $label"
    echo "├────────────────────────────────────┤"

    # Extract items with this status (stories, bugs, tasks)
    FOUND=false

    # Stories
    grep -B2 "status: $status" "$BACKLOG_FILE" 2>/dev/null | grep 'title:' | while read -r line; do
      title=$(echo "$line" | sed 's/.*title: *"\?\([^"]*\)"\?/\1/')
      echo "│  $title"
      FOUND=true
    done

    if [ "$FOUND" = false ]; then
      echo "│  (empty)"
    fi

    echo "└────────────────────────────────────┘"
    echo ""
  done
}

cmd_add_story() {
  require_backlog

  FEAT_ID="${3:-}"
  TITLE="${4:-}"
  POINTS="${5:-3}"

  if [ -z "$FEAT_ID" ] || [ -z "$TITLE" ]; then
    echo "Usage: $0 add-story <product> <feature-id> <title> [points]"
    exit 1
  fi

  # Generate next story ID
  LAST_STORY=$(grep -oE 'STORY-[0-9]+' "$BACKLOG_FILE" | sort -t- -k2 -n | tail -1)
  if [ -n "$LAST_STORY" ]; then
    LAST_NUM=$(echo "$LAST_STORY" | grep -oE '[0-9]+')
    NEXT_NUM=$((LAST_NUM + 1))
  else
    NEXT_NUM=1
  fi
  STORY_ID=$(printf "STORY-%03d" "$NEXT_NUM")

  # Generate next task ID
  LAST_TASK=$(grep -oE 'TASK-[0-9]+' "$BACKLOG_FILE" | sort -t- -k2 -n | tail -1)
  if [ -n "$LAST_TASK" ]; then
    TASK_NUM=$(($(echo "$LAST_TASK" | grep -oE '[0-9]+') + 1))
  else
    TASK_NUM=1
  fi
  TASK_ID=$(printf "TASK-%03d" "$TASK_NUM")

  TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Append story under the feature (simplified — appends at end of stories list)
  # For production use, a YAML parser would be better
  cat >> "$BACKLOG_FILE" << EOF

# Added $TIMESTAMP
# Story $STORY_ID under $FEAT_ID
#   - id: $STORY_ID
#     title: "$TITLE"
#     status: draft
#     points: $POINTS
#     tasks:
#       - id: $TASK_ID
#         title: "Implement: $TITLE"
#         assignee: backend-engineer
#         status: draft
EOF

  # Update timestamp
  sed -i '' "s/^updated_at: .*/updated_at: \"$TIMESTAMP\"/" "$BACKLOG_FILE" 2>/dev/null || \
    sed -i "s/^updated_at: .*/updated_at: \"$TIMESTAMP\"/" "$BACKLOG_FILE"

  echo "Added story: $STORY_ID — $TITLE (${POINTS} points)"
  echo "Under feature: $FEAT_ID"
  echo "Task created: $TASK_ID"
}

cmd_add_bug() {
  require_backlog

  TITLE="${3:-}"
  SEVERITY="${4:-medium}"
  LINKED_STORY="${5:-}"

  if [ -z "$TITLE" ]; then
    echo "Usage: $0 add-bug <product> <title> <severity> [linked-story-id]"
    exit 1
  fi

  # Generate next bug ID
  LAST_BUG=$(grep -oE 'BUG-[0-9]+' "$BACKLOG_FILE" | sort -t- -k2 -n | tail -1)
  if [ -n "$LAST_BUG" ]; then
    NEXT_NUM=$(($(echo "$LAST_BUG" | grep -oE '[0-9]+') + 1))
  else
    NEXT_NUM=1
  fi
  BUG_ID=$(printf "BUG-%03d" "$NEXT_NUM")

  TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Append bug to bugs section
  cat >> "$BACKLOG_FILE" << EOF

# Bug added $TIMESTAMP
#  - id: $BUG_ID
#    title: "$TITLE"
#    severity: $SEVERITY
#    status: open
#    linked_story: ${LINKED_STORY:-none}
#    assignee: backend-engineer
EOF

  sed -i '' "s/^updated_at: .*/updated_at: \"$TIMESTAMP\"/" "$BACKLOG_FILE" 2>/dev/null || \
    sed -i "s/^updated_at: .*/updated_at: \"$TIMESTAMP\"/" "$BACKLOG_FILE"

  echo "Added bug: $BUG_ID — $TITLE (severity: $SEVERITY)"
  [ -n "$LINKED_STORY" ] && echo "Linked to: $LINKED_STORY"
}

cmd_update() {
  require_backlog

  ITEM_ID="${3:-}"
  NEW_STATUS="${4:-}"

  if [ -z "$ITEM_ID" ] || [ -z "$NEW_STATUS" ]; then
    echo "Usage: $0 update <product> <item-id> <status>"
    echo "Status: draft | ready | in_progress | done"
    exit 1
  fi

  # Validate status
  case "$NEW_STATUS" in
    draft|ready|in_progress|done|open|closed) ;;
    *)
      echo "Error: Invalid status '$NEW_STATUS'"
      echo "Valid: draft, ready, in_progress, done, open, closed"
      exit 1
      ;;
  esac

  # Find the item and update its status
  if grep -q "id: $ITEM_ID" "$BACKLOG_FILE"; then
    # Use awk to find the id line and update the next status line
    awk -v id="$ITEM_ID" -v new_status="$NEW_STATUS" '
      /id:/ && $0 ~ id { found=1 }
      found && /status:/ { sub(/status: *[a-z_]+/, "status: " new_status); found=0 }
      { print }
    ' "$BACKLOG_FILE" > "$BACKLOG_FILE.tmp" && mv "$BACKLOG_FILE.tmp" "$BACKLOG_FILE"

    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    sed -i '' "s/^updated_at: .*/updated_at: \"$TIMESTAMP\"/" "$BACKLOG_FILE" 2>/dev/null || \
      sed -i "s/^updated_at: .*/updated_at: \"$TIMESTAMP\"/" "$BACKLOG_FILE"

    echo "Updated $ITEM_ID → $NEW_STATUS"
  else
    echo "Error: Item $ITEM_ID not found in backlog"
    exit 1
  fi
}

cmd_velocity() {
  require_backlog

  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  VELOCITY REPORT: $PRODUCT"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  # Extract sprint data
  SPRINT_COUNT=0
  TOTAL_VELOCITY=0

  while IFS= read -r line; do
    if echo "$line" | grep -q 'velocity:'; then
      VEL=$(echo "$line" | grep -oE '[0-9]+')
      if [ -n "$VEL" ] && [ "$VEL" -gt 0 ]; then
        TOTAL_VELOCITY=$((TOTAL_VELOCITY + VEL))
        SPRINT_COUNT=$((SPRINT_COUNT + 1))
      fi
    fi
  done < "$BACKLOG_FILE"

  if [ "$SPRINT_COUNT" -gt 0 ]; then
    AVG_VELOCITY=$((TOTAL_VELOCITY / SPRINT_COUNT))
    echo "  Completed Sprints: $SPRINT_COUNT"
    echo "  Total Points:      $TOTAL_VELOCITY"
    echo "  Avg Velocity:      $AVG_VELOCITY points/sprint"
  else
    echo "  No completed sprints with velocity data yet."
  fi

  echo ""

  # Show sprint history
  echo "  Sprint History:"
  grep -B5 'velocity:' "$BACKLOG_FILE" 2>/dev/null | grep -E 'name:|velocity:|status:' | while read -r line; do
    echo "    $line"
  done
}

cmd_summary() {
  require_backlog

  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  BACKLOG SUMMARY: $PRODUCT"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  EPICS=$(grep -c 'id: EPIC-' "$BACKLOG_FILE" 2>/dev/null || echo "0")
  FEATURES=$(grep -c 'id: FEAT-' "$BACKLOG_FILE" 2>/dev/null || echo "0")
  STORIES=$(grep -c 'id: STORY-' "$BACKLOG_FILE" 2>/dev/null || echo "0")
  TASKS=$(grep -c 'id: TASK-' "$BACKLOG_FILE" 2>/dev/null || echo "0")
  TESTS=$(grep -c 'id: TEST-' "$BACKLOG_FILE" 2>/dev/null || echo "0")
  BUGS=$(grep -c 'id: BUG-' "$BACKLOG_FILE" 2>/dev/null || echo "0")
  SPRINTS=$(grep -c 'id: [0-9]' "$BACKLOG_FILE" 2>/dev/null || echo "0")

  echo "  Epics:    $EPICS"
  echo "  Features: $FEATURES"
  echo "  Stories:  $STORIES"
  echo "  Tasks:    $TASKS"
  echo "  Tests:    $TESTS"
  echo "  Bugs:     $BUGS"
  echo "  Sprints:  $SPRINTS"
}

# ============================================================================
# DISPATCH
# ============================================================================

case "$COMMAND" in
  init)      cmd_init ;;
  sprint)    cmd_sprint ;;
  board)     cmd_board ;;
  add-story) cmd_add_story "$@" ;;
  add-bug)   cmd_add_bug "$@" ;;
  update)    cmd_update "$@" ;;
  velocity)  cmd_velocity ;;
  summary)   cmd_summary ;;
  *)
    echo "Unknown command: $COMMAND"
    usage
    ;;
esac
