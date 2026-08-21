#!/usr/bin/env bash
#
# rename-company.sh — make this fork yours.
#
#   tools/rename-company.sh "Northwind"        # rename and reset company state
#   tools/rename-company.sh "Northwind" --dry-run
#   tools/rename-company.sh --check            # show what still says ConnectSW
#
# Renames the company across agent definitions, protocols, registries, package
# scopes and docs, then resets the state files that describe a running company
# (orchestrator state, memory seeds) so your history starts empty rather than
# inheriting someone else's.
#
# What it does NOT touch: the demo product (products/taskflow), the constitution
# text, or anything under .git.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

OLD_NAME="ConnectSW"
OLD_SCOPE="connectsw"
NEW_NAME=""
DRY_RUN=false
CHECK_ONLY=false

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --check) CHECK_ONLY=true; shift ;;
    -h|--help) sed -n '3,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "unknown flag: $1" >&2; exit 2 ;;
    *) NEW_NAME="$1"; shift ;;
  esac
done

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

# Files that mention the old name, excluding git internals, dependencies, and
# this script — which carries the old name in OLD_NAME and would rename itself.
targets() {
  grep -rIl -e "$OLD_NAME" -e "$OLD_SCOPE" . \
    --exclude=rename-company.sh \
    --exclude-dir=.git \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=dist \
    --exclude-dir=coverage \
    2>/dev/null || true
}

if [ "$CHECK_ONLY" = true ]; then
  printf "${CYAN}Files still mentioning %s:${NC}\n" "$OLD_NAME"
  targets | sed 's|^\./||' | sort
  printf "\n%s files\n" "$(targets | wc -l | tr -d ' ')"
  exit 0
fi

if [ -z "$NEW_NAME" ]; then
  echo "Usage: tools/rename-company.sh \"YourCompany\" [--dry-run]" >&2
  exit 2
fi

# Package scopes must be a valid npm scope: lowercase, no spaces.
NEW_SCOPE="$(printf '%s' "$NEW_NAME" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]-')"
if [ -z "$NEW_SCOPE" ]; then
  echo "error: \"$NEW_NAME\" has no usable characters for a package scope" >&2
  exit 2
fi

printf "${CYAN}Renaming${NC} %s → %s   (package scope: @%s → @%s)\n\n" \
  "$OLD_NAME" "$NEW_NAME" "$OLD_SCOPE" "$NEW_SCOPE"

FILES="$(targets)"
COUNT="$(printf '%s\n' "$FILES" | grep -c . || true)"

if [ "$DRY_RUN" = true ]; then
  printf "${YELLOW}Dry run${NC} — %s files would change:\n" "$COUNT"
  printf '%s\n' "$FILES" | sed 's|^\./|  |'
  exit 0
fi

printf '%s\n' "$FILES" | while IFS= read -r file; do
  [ -n "$file" ] || continue
  sed -i.bak -e "s/@$OLD_SCOPE\//@$NEW_SCOPE\//g" -e "s/$OLD_SCOPE/$NEW_SCOPE/g" -e "s/$OLD_NAME/$NEW_NAME/g" "$file"
  rm -f "$file.bak"
done

printf "${GREEN}  ok${NC} %s files updated\n" "$COUNT"

# Reset the files that describe a *running* company. A fork should start with an
# empty history, not inherit one.
STATE=".claude/orchestrator/state.yml"
if [ -f "$STATE" ]; then
  sed -i.bak \
    -e "s/^  name: \".*\"/  name: \"$NEW_NAME\"/" \
    -e "s/^  founded: \".*\"/  founded: \"$(date +%Y-%m-%d)\"/" \
    -e "s/^  ceo: \".*\"/  ceo: \"Founder\"/" \
    "$STATE"
  rm -f "$STATE.bak"
  printf "${GREEN}  ok${NC} %s reset\n" "$STATE"
fi

: > .claude/audit-trail.jsonl 2>/dev/null || true

printf "\n${GREEN}Done.${NC} Next:\n"
cat <<EOF

  1. Review the diff:            git diff --stat
  2. Enable the hooks:           git config core.hooksPath .githooks
  3. Set your CEO name in        .claude/orchestrator/state.yml
  4. Read the constitution and amend it to match how you work:
                                 .specify/memory/constitution.md
  5. Keep or delete the demo:    products/taskflow

If you keep the demo, leave its ports registered in .claude/PORT-REGISTRY.md so
your first product does not claim 3100/5000.
EOF
