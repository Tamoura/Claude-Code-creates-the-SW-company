# Parallel Development with Git Worktrees

## Purpose
Enable multiple Claude sessions to work on different products simultaneously
without branch conflicts or working directory contention.

## Deliverables
1. `.gitattributes` - merge strategies for shared root files
2. `.claude/scripts/worktree.sh` - helper script for worktree management
3. `docs/PARALLEL-DEVELOPMENT.md` - usage documentation
4. `.githooks/post-commit` fix - centralize audit log from worktrees

## Key Decisions
- `merge=ours` for root configs (package.json, tsconfig, etc.)
- `merge=union` for PORT-REGISTRY.md (append-only)
- Worktree directory: `<repo>-worktrees/<product>/`
- Already gitignored via `*-worktrees/` pattern in .gitignore
