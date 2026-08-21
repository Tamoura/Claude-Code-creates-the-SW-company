#!/usr/bin/env bash
#
# publish.sh — push the generated public copy to its standalone repository.
#
#   tools/shareable/publish.sh git@github.com:you/ai-software-company.git
#   tools/shareable/publish.sh https://github.com/you/ai-software-company.git
#
# The target repository must already exist and be empty — create it on GitHub
# without a README, .gitignore or licence, since this tree brings its own.
#
# The push happens from a working clone in `.shareable-publish/` (git-ignored),
# never from `shareable/` itself: a nested .git there would turn the generated
# tree into an embedded repository in this repo's own index.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUT_DIR="$REPO_ROOT/shareable"
WORK_DIR="$REPO_ROOT/.shareable-publish"

REMOTE="${1:-}"
if [ -z "$REMOTE" ]; then
  echo "Usage: tools/shareable/publish.sh <git-remote-url>" >&2
  exit 2
fi

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info() { printf "${CYAN}==>${NC} %s\n" "$*"; }

# Never publish a stale or unverified tree.
info "rebuilding and verifying"
"$SCRIPT_DIR/make-shareable.sh" >/dev/null
"$SCRIPT_DIR/make-shareable.sh" --verify

if [ ! -d "$WORK_DIR/.git" ]; then
  info "preparing working clone at .shareable-publish/"
  rm -rf "$WORK_DIR"
  mkdir -p "$WORK_DIR"
  git -C "$WORK_DIR" init -q -b main
  git -C "$WORK_DIR" remote add origin "$REMOTE"
  # Pick up anything already on the remote so this is a fast-forward.
  git -C "$WORK_DIR" fetch -q origin main 2>/dev/null && \
    git -C "$WORK_DIR" reset -q --hard origin/main || true
else
  git -C "$WORK_DIR" remote set-url origin "$REMOTE"
fi

# Mirror the generated tree into the working clone: drop everything except .git,
# then copy the fresh build over it, so deletions propagate too.
info "syncing generated tree"
find "$WORK_DIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$OUT_DIR"/. "$WORK_DIR"/

cd "$WORK_DIR"
git add -A

if git diff --cached --quiet; then
  info "nothing to publish — the public copy is already up to date"
  exit 0
fi

CHANGED="$(git diff --cached --name-only | wc -l | tr -d ' ')"
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  git commit -q -m "chore: refresh from upstream ($CHANGED files changed)"
else
  git commit -q -m "Initial commit"
fi

info "pushing to $REMOTE"
for attempt in 1 2 3 4; do
  if git push -u origin main; then
    printf "\n${GREEN}Published.${NC} %s files on main.\n" "$(git ls-files | wc -l | tr -d ' ')"
    exit 0
  fi
  delay=$((2 ** attempt))
  echo "push failed, retrying in ${delay}s..." >&2
  sleep "$delay"
done

echo "push failed after 4 attempts" >&2
exit 1
