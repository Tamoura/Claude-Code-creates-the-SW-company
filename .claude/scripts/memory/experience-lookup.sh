#!/bin/bash
# experience-lookup.sh
# Searches agent experience memory for entries matching task keywords.
# Returns the top 3 most relevant experiences for prompt injection.
#
# Usage: .claude/scripts/memory/experience-lookup.sh <agent_name> "<task_keywords>"
#
# Arguments:
#   agent_name    - Agent name matching filename in agent-experiences/ (e.g., "backend-engineer")
#   task_keywords - Space-separated keywords to search for (e.g., "prisma migration postgresql")
#
# Output: Top 3 matching experiences in concise prompt-injectable format.
# Exit codes: 0 on success, 1 on error.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# --- Argument validation ---

AGENT_NAME="${1:-}"
TASK_KEYWORDS="${2:-}"

if [ -z "$AGENT_NAME" ] || [ -z "$TASK_KEYWORDS" ]; then
  echo "Usage: $0 <agent_name> \"<task_keywords>\""
  echo ""
  echo "Arguments:"
  echo "  agent_name    - Agent name (e.g., backend-engineer, architect, qa-engineer)"
  echo "  task_keywords - Space-separated keywords to match (e.g., \"prisma migration postgresql\")"
  echo ""
  echo "Examples:"
  echo "  $0 backend-engineer \"prisma migration postgresql\""
  echo "  $0 architect \"vite nextjs framework\""
  echo "  $0 qa-engineer \"playwright e2e browser\""
  echo ""
  echo "Output: Top 3 most relevant experiences in concise format for agent prompt injection."
  exit 1
fi

MEMORY_FILE="$REPO_ROOT/.claude/memory/agent-experiences/${AGENT_NAME}.json"

if [ ! -f "$MEMORY_FILE" ]; then
  echo "Error: No experience file found for agent '${AGENT_NAME}'."
  echo "Expected path: ${MEMORY_FILE}"
  echo ""
  echo "Available agents:"
  for f in "$REPO_ROOT/.claude/memory/agent-experiences/"*.json; do
    [ -f "$f" ] && basename "$f" .json
  done
  exit 1
fi

# --- Keyword normalization ---
# Convert to lowercase array for matching
KEYWORDS_LOWER=$(echo "$TASK_KEYWORDS" | tr '[:upper:]' '[:lower:]')
read -ra KEYWORD_ARRAY <<< "$KEYWORDS_LOWER"

if [ ${#KEYWORD_ARRAY[@]} -eq 0 ]; then
  echo "Error: No valid keywords provided."
  exit 1
fi

# --- Search implementation ---

# Prefer jq for structured JSON parsing; fall back to grep-based approach
if command -v jq &> /dev/null; then
  # =====================
  # jq-based search
  # =====================

  # Build a jq filter that scores each entry by how many keywords match.
  # We pass keywords as a single JSON array to jq.
  KEYWORDS_JSON=$(printf '%s\n' "${KEYWORD_ARRAY[@]}" | jq -R . | jq -s .)

  # --- Task history matches ---
  # Note: uses `. as $k | $text | index($k)` instead of `$text | contains(.)`
  # to work around a jq 1.7 scoping bug with contains inside map/select.
  TASK_MATCHES=$(jq -r --argjson kw "$KEYWORDS_JSON" '
    [.task_history[]? |
      . as $entry |
      # Build a searchable text blob from all relevant fields
      (
        (.summary // "") + " " +
        (.product // "") + " " +
        (.task_id // "") + " " +
        (.task_type // "") + " " +
        ((.challenges // []) | join(" ")) + " " +
        ((.solutions // []) | join(" "))
      ) | ascii_downcase as $text |
      # Count keyword matches
      ($kw | map(select(. as $k | $text | index($k))) | length) as $score |
      select($score > 0) |
      {
        type: "task",
        score: $score,
        task_id: $entry.task_id,
        product: $entry.product,
        status: $entry.status,
        summary: $entry.summary,
        time_minutes: ($entry.time_minutes // $entry.actual_minutes // 0)
      }
    ] | sort_by(-.score)[:3][] |
    "TASK [" + .task_id + "] (" + .product + ", " + .status + ", " + (.time_minutes | tostring) + "min): " + .summary
  ' "$MEMORY_FILE" 2>/dev/null || echo "")

  # --- Learned patterns matches ---
  PATTERN_MATCHES=$(jq -r --argjson kw "$KEYWORDS_JSON" '
    [.learned_patterns[]? |
      . as $entry |
      (
        (.description // "") + " " +
        (.notes // "") + " " +
        (.pattern // "") + " " +
        (.pattern_id // "") + " " +
        ((.products_applied // []) | join(" "))
      ) | ascii_downcase as $text |
      ($kw | map(select(. as $k | $text | index($k))) | length) as $score |
      select($score > 0) |
      {
        type: "pattern",
        score: $score,
        id: ($entry.pattern_id // "N/A"),
        desc: ($entry.description // $entry.pattern // ""),
        notes: ($entry.notes // ""),
        confidence: ($entry.confidence // "high")
      }
    ] | sort_by(-.score)[:3][] |
    "PATTERN [" + .id + "] (" + .confidence + "): " + .desc +
    (if .notes != "" then " -- " + .notes else "" end)
  ' "$MEMORY_FILE" 2>/dev/null || echo "")

  # --- Common mistakes matches ---
  MISTAKE_MATCHES=$(jq -r --argjson kw "$KEYWORDS_JSON" '
    [.common_mistakes[]? |
      . as $entry |
      # Handle both string and object formats
      (if type == "string" then . else
        (.mistake // "") + " " + (.prevention // "") + " " + (.impact // "")
      end) | ascii_downcase as $text |
      ($kw | map(select(. as $k | $text | index($k))) | length) as $score |
      select($score > 0) |
      {
        type: "mistake",
        score: $score,
        text: (if $entry | type == "string" then $entry
               else "AVOID: " + ($entry.mistake // "") + " -> " + ($entry.prevention // "")
               end)
      }
    ] | sort_by(-.score)[:3][] |
    "MISTAKE: " + .text
  ' "$MEMORY_FILE" 2>/dev/null || echo "")

  # --- Preferred approaches matches ---
  APPROACH_MATCHES=$(jq -r --argjson kw "$KEYWORDS_JSON" '
    [.preferred_approaches[]? |
      . as $entry |
      (if type == "string" then . else
        (.scenario // "") + " " + (.approach // "") + " " + (.reason // "")
      end) | ascii_downcase as $text |
      ($kw | map(select(. as $k | $text | index($k))) | length) as $score |
      select($score > 0) |
      {
        type: "approach",
        score: $score,
        text: (if $entry | type == "string" then $entry
               else ($entry.scenario // "") + ": " + ($entry.approach // "") + " (" + ($entry.reason // "") + ")"
               end)
      }
    ] | sort_by(-.score)[:3][] |
    "APPROACH: " + .text
  ' "$MEMORY_FILE" 2>/dev/null || echo "")

  # --- Combine and rank all results, output top 3 ---
  # Collect all non-empty lines, score them by keyword density, take top 3
  ALL_MATCHES=""
  [ -n "$TASK_MATCHES" ] && ALL_MATCHES="${ALL_MATCHES}${TASK_MATCHES}"$'\n'
  [ -n "$PATTERN_MATCHES" ] && ALL_MATCHES="${ALL_MATCHES}${PATTERN_MATCHES}"$'\n'
  [ -n "$MISTAKE_MATCHES" ] && ALL_MATCHES="${ALL_MATCHES}${MISTAKE_MATCHES}"$'\n'
  [ -n "$APPROACH_MATCHES" ] && ALL_MATCHES="${ALL_MATCHES}${APPROACH_MATCHES}"$'\n'

  # Remove trailing newlines and empty lines
  ALL_MATCHES=$(echo "$ALL_MATCHES" | sed '/^$/d')

  if [ -z "$ALL_MATCHES" ]; then
    echo "No matching experiences found for keywords: $TASK_KEYWORDS"
    echo "Agent '$AGENT_NAME' has no history matching these terms."
    exit 0
  fi

  # Score each line by counting how many keywords appear in it, sort descending, take top 3
  RANKED=$(echo "$ALL_MATCHES" | while IFS= read -r line; do
    line_lower=$(echo "$line" | tr '[:upper:]' '[:lower:]')
    score=0
    for kw in "${KEYWORD_ARRAY[@]}"; do
      if echo "$line_lower" | grep -qF "$kw"; then
        score=$((score + 1))
      fi
    done
    printf "%d\t%s\n" "$score" "$line"
  done | sort -t$'\t' -k1,1 -rn | head -3 | cut -f2-)

  echo "=== Experience Lookup: ${AGENT_NAME} ==="
  echo "Keywords: ${TASK_KEYWORDS}"
  echo "---"
  COUNT=0
  echo "$RANKED" | while IFS= read -r line; do
    [ -z "$line" ] && continue
    COUNT=$((COUNT + 1))
    echo "${COUNT}. ${line}"
  done
  echo "---"

else
  # =====================
  # grep/sed fallback (no jq)
  # =====================
  echo "=== Experience Lookup: ${AGENT_NAME} (grep fallback) ==="
  echo "Keywords: ${TASK_KEYWORDS}"
  echo "---"

  # Build a grep pattern that matches any keyword (case-insensitive)
  GREP_PATTERN=$(IFS='|'; echo "${KEYWORD_ARRAY[*]}")

  # Search through the entire JSON file for lines containing keywords
  MATCHES=$(grep -iE "$GREP_PATTERN" "$MEMORY_FILE" 2>/dev/null || true)

  if [ -z "$MATCHES" ]; then
    echo "No matching experiences found for keywords: $TASK_KEYWORDS"
    echo "Agent '$AGENT_NAME' has no history matching these terms."
    exit 0
  fi

  # Extract summary lines (most informative), then other meaningful lines
  SUMMARIES=$(echo "$MATCHES" | grep -i '"summary"' | sed 's/.*"summary"[[:space:]]*:[[:space:]]*"//' | sed 's/"[[:space:]]*,\?[[:space:]]*$//' | head -3)
  DESCRIPTIONS=$(echo "$MATCHES" | grep -i '"description"' | sed 's/.*"description"[[:space:]]*:[[:space:]]*"//' | sed 's/"[[:space:]]*,\?[[:space:]]*$//' | head -3)
  MISTAKES=$(echo "$MATCHES" | grep -iE '"(mistake|prevention)"' | sed 's/.*"[^"]*"[[:space:]]*:[[:space:]]*"//' | sed 's/"[[:space:]]*,\?[[:space:]]*$//' | head -3)
  APPROACHES=$(echo "$MATCHES" | grep -iE '"(approach|scenario)"' | sed 's/.*"[^"]*"[[:space:]]*:[[:space:]]*"//' | sed 's/"[[:space:]]*,\?[[:space:]]*$//' | head -3)

  COUNT=0

  # Output summaries first (task history)
  if [ -n "$SUMMARIES" ]; then
    while IFS= read -r line && [ $COUNT -lt 3 ]; do
      [ -z "$line" ] && continue
      COUNT=$((COUNT + 1))
      echo "${COUNT}. TASK: ${line}"
    done <<< "$SUMMARIES"
  fi

  # Then patterns/descriptions
  if [ -n "$DESCRIPTIONS" ] && [ $COUNT -lt 3 ]; then
    while IFS= read -r line && [ $COUNT -lt 3 ]; do
      [ -z "$line" ] && continue
      COUNT=$((COUNT + 1))
      echo "${COUNT}. PATTERN: ${line}"
    done <<< "$DESCRIPTIONS"
  fi

  # Then mistakes
  if [ -n "$MISTAKES" ] && [ $COUNT -lt 3 ]; then
    while IFS= read -r line && [ $COUNT -lt 3 ]; do
      [ -z "$line" ] && continue
      COUNT=$((COUNT + 1))
      echo "${COUNT}. MISTAKE: ${line}"
    done <<< "$MISTAKES"
  fi

  # Then approaches
  if [ -n "$APPROACHES" ] && [ $COUNT -lt 3 ]; then
    while IFS= read -r line && [ $COUNT -lt 3 ]; do
      [ -z "$line" ] && continue
      COUNT=$((COUNT + 1))
      echo "${COUNT}. APPROACH: ${line}"
    done <<< "$APPROACHES"
  fi

  if [ $COUNT -eq 0 ]; then
    echo "No structured matches found. Raw keyword matches exist but could not be parsed."
    echo "Install jq for better results: sudo apt install jq"
  fi

  echo "---"
  echo "Note: Install jq for structured JSON search with relevance scoring."
fi
