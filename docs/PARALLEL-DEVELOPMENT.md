# Parallel Product Development

Run multiple Claude sessions on different products simultaneously using git worktrees.

## Quick Start

```bash
# Create a worktree for a product
.claude/scripts/worktree.sh create stablecoin-gateway

# Work in it
cd "$(git rev-parse --show-toplevel)-worktrees/stablecoin-gateway"
cd products/stablecoin-gateway && npm install

# When done, remove the worktree (branch is kept)
.claude/scripts/worktree.sh remove stablecoin-gateway
```

## How It Works

Git worktrees let you check out multiple branches simultaneously in separate directories. Each worktree shares the same `.git` database, so commits, branches, and hooks are all synchronized.

**Directory layout after creating worktrees:**

```
~/Desktop/Projects/
  Claude Code creates the SW company/              # main repo (any branch)
  Claude Code creates the SW company-worktrees/
    stablecoin-gateway/                             # worktree on its own branch
    invoiceforge/                                   # worktree on its own branch
```

Each worktree:
- Has its own branch checked out
- Can run its own dev servers (ports don't conflict - see PORT-REGISTRY.md)
- Inherits git hooks from `.githooks/`
- Can commit, push, and create PRs independently

## Commands

| Command | What It Does |
|---------|-------------|
| `worktree.sh create <product> [branch]` | Creates worktree; defaults to `feature/<product>/dev` branch |
| `worktree.sh list` | Shows all active worktrees |
| `worktree.sh remove <product>` | Removes worktree (keeps the branch) |
| `worktree.sh path <product>` | Prints the worktree path (for scripting) |

## When to Use Worktrees vs. Branch Switching

| Scenario | Use |
|----------|-----|
| Two sessions working on different products at the same time | **Worktrees** |
| One session, switching between products sequentially | **Branch switching** (simpler) |
| Running dev servers for two products simultaneously | **Worktrees** |
| Quick fix on one product while another is mid-feature | **Worktrees** |

## Merge Strategy for Shared Files

The `.gitattributes` file defines merge strategies so parallel PRs don't conflict on files neither changed intentionally:

| File | Strategy | What Happens on Conflict |
|------|----------|--------------------------|
| `package.json` | `merge=ours` | Keeps main's version |
| `package-lock.json` | `merge=ours` | Keeps main's version |
| `tsconfig.json` | `merge=ours` | Keeps main's version |
| `.eslintrc.js` | `merge=ours` | Keeps main's version |
| `.prettierrc` | `merge=ours` | Keeps main's version |
| `.claude/PORT-REGISTRY.md` | `merge=union` | Keeps lines from both sides |

**Important**: If your PR intentionally modifies a `merge=ours` file (e.g., adds a script to root `package.json`), that change may be silently dropped if another PR merges first. Re-apply the change after merge.

## Reverting Everything

```bash
# 1. Remove all worktrees
.claude/scripts/worktree.sh list
.claude/scripts/worktree.sh remove <product>  # for each active worktree

# 2. Remove .gitattributes to revert merge strategies
rm .gitattributes

# 3. Remove the worktree script and this doc
rm .claude/scripts/worktree.sh docs/PARALLEL-DEVELOPMENT.md
```

All changes are fully reversible with zero side effects.
