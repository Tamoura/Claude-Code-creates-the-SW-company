# Global Agent Commands

## Summary

Created 6 global Claude Code commands in `~/.claude/commands/` that allow using the ConnectSW agent system in any cloned repository.

## Files Created

All files in `~/.claude/commands/`:

| File | Purpose |
|------|---------|
| `orchestrator.md` | Route CEO requests to specialist agents in any repo |
| `audit.md` | Full 11-dimension code audit on any codebase |
| `code-reviewer.md` | Lightweight code review for any repo |
| `status.md` | Quick git/repo status scan |
| `check-system.md` | Validate agent system health and $CONNECTSW_SOURCE |
| `execute-task.md` | Execute tasks from task graphs in any repo |

## Design Decisions

1. **Single source of truth**: All commands read agent briefs from `$CONNECTSW_SOURCE` (default: `/Users/tamer/Desktop/Projects/Claude Code creates the SW company`). No copies of briefs.

2. **Repo-agnostic**: No `products/` directory assumption. Commands detect project type from `package.json`, `Cargo.toml`, `go.mod`, etc.

3. **Smart output**: Reports save to `docs/` if it exists, otherwise `.claude/output/`.

4. **No conflicts**: When inside the ConnectSW repo, repo-local `.claude/commands/` take precedence over global `~/.claude/commands/`. This is built-in Claude Code behavior.

5. **Stateless mode**: Global orchestrator doesn't depend on `state.yml` or task graph scripts. Lightweight coordination.

6. **Standards enforced everywhere**: Git safety rules, conventional commits, TDD — all apply regardless of which repo you're in.

## How It Works

```
User in any repo → /orchestrator "review this code"
  → Global orchestrator.md activates
  → Reads agent brief from $CONNECTSW_SOURCE/.claude/agents/briefs/code-reviewer.md
  → Agent works on CURRENT repo's files
  → Output saved to current repo's docs/ or .claude/output/
```

## Pre-existing Global Commands (not modified)

- `connectsw.md` — Bootstrap ConnectSW agent system into a new repo
- `generate-tests.md` — Generate test suites

## Verification

1. `cd /some/other/repo && claude` — `/orchestrator`, `/audit`, `/code-reviewer`, `/status` should appear
2. `/status` in external repo — shows that repo's git status
3. `/check-system` — validates $CONNECTSW_SOURCE and all briefs accessible
4. In ConnectSW repo — repo-local commands take precedence
