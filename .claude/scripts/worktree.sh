#!/bin/bash
# worktree.sh - Manage git worktrees for parallel product development
#
# Usage:
#   ./worktree.sh create <product> [branch]   Create a worktree for a product
#   ./worktree.sh list                        List active worktrees
#   ./worktree.sh remove <product>            Remove a worktree (keeps branch)
#   ./worktree.sh path <product>              Print worktree path
#
# Worktrees are created in <repo>-worktrees/<product>/
# Each gets its own branch checkout sharing the same .git database.
# Hooks are inherited automatically from the main repo.

set -euo pipefail

# Resolve the main repo root (works from worktrees too)
GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null)"
if [ "$GIT_COMMON_DIR" = ".git" ]; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
else
  # We're in a worktree; common dir is <main-repo>/.git
  REPO_ROOT="$(dirname "$GIT_COMMON_DIR")"
fi

WORKTREE_BASE="${REPO_ROOT}-worktrees"

usage() {
  echo "Usage: $(basename "$0") <command> [args]"
  echo ""
  echo "Commands:"
  echo "  create <product> [branch]  Create worktree (default branch: feature/<product>/dev)"
  echo "  list                       List active worktrees"
  echo "  remove <product>           Remove worktree (keeps branch)"
  echo "  path <product>             Print worktree path"
  exit 1
}

cmd_create() {
  local product="${1:-}"
  local branch="${2:-}"

  if [ -z "$product" ]; then
    echo "Error: product name required"
    echo "Usage: $(basename "$0") create <product> [branch]"
    exit 1
  fi

  local worktree_path="${WORKTREE_BASE}/${product}"

  if [ -d "$worktree_path" ]; then
    echo "Error: worktree already exists at ${worktree_path}"
    echo "Use '$(basename "$0") remove ${product}' first, or work in the existing one."
    exit 1
  fi

  # Default branch name if not provided
  if [ -z "$branch" ]; then
    branch="feature/${product}/dev"
  fi

  # Check if branch already exists
  if git show-ref --verify --quiet "refs/heads/${branch}" 2>/dev/null; then
    echo "Checking out existing branch: ${branch}"
    git worktree add "$worktree_path" "$branch"
  else
    echo "Creating new branch: ${branch}"
    git worktree add -b "$branch" "$worktree_path"
  fi

  echo ""
  echo "Worktree created:"
  echo "  Path:   ${worktree_path}"
  echo "  Branch: ${branch}"
  echo ""
  echo "Next steps:"
  echo "  cd \"${worktree_path}\""
  echo "  # Install deps for the product you're working on:"
  echo "  cd products/${product} && npm install"
}

cmd_list() {
  echo "Active worktrees:"
  echo ""
  git worktree list
}

cmd_remove() {
  local product="${1:-}"

  if [ -z "$product" ]; then
    echo "Error: product name required"
    echo "Usage: $(basename "$0") remove <product>"
    exit 1
  fi

  local worktree_path="${WORKTREE_BASE}/${product}"

  if [ ! -d "$worktree_path" ]; then
    echo "Error: no worktree found at ${worktree_path}"
    exit 1
  fi

  # Get branch name before removing
  local branch
  branch="$(git -C "$worktree_path" branch --show-current 2>/dev/null || echo "unknown")"

  git worktree remove "$worktree_path" --force

  echo "Worktree removed: ${worktree_path}"
  echo "Branch '${branch}' is still available (not deleted)."

  # Clean up empty parent directory
  if [ -d "$WORKTREE_BASE" ] && [ -z "$(ls -A "$WORKTREE_BASE" 2>/dev/null)" ]; then
    rmdir "$WORKTREE_BASE"
    echo "Cleaned up empty worktree base directory."
  fi
}

cmd_path() {
  local product="${1:-}"

  if [ -z "$product" ]; then
    echo "Error: product name required"
    echo "Usage: $(basename "$0") path <product>"
    exit 1
  fi

  local worktree_path="${WORKTREE_BASE}/${product}"

  if [ ! -d "$worktree_path" ]; then
    echo "Error: no worktree found at ${worktree_path}" >&2
    exit 1
  fi

  echo "$worktree_path"
}

# Main dispatch
command="${1:-}"
shift || true

case "$command" in
  create)  cmd_create "$@" ;;
  list)    cmd_list ;;
  remove)  cmd_remove "$@" ;;
  path)    cmd_path "$@" ;;
  *)       usage ;;
esac
