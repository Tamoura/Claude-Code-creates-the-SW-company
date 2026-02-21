# Feature: `--update` mode for `/connectsw` command

## Problem
Repos that already set up ConnectSW have no way to pull framework updates
(new agents, updated workflows, improved command center) without risking
product data loss. Only options are fresh install or `--force` (full overwrite).

## Solution
Add `--update` flag that syncs framework files while preserving all products
and accumulated state (state.yml, PORT-REGISTRY, knowledge, decisions, etc.).

## Key Decisions
- `--update` reads company name from existing `state.yml` (no positional arg needed)
- `--update --force` is an error (mutual exclusion)
- Backup created at `.claude.bak.YYYYMMDD-HHMMSS` before any changes
- `generate-state.sh` hardcodes ConnectSW metadata; we restore original
  `founded` and `ceo` values from backup after it runs

## What Gets Updated vs Preserved

| Updated (overwritten from source) | Preserved (untouched) |
|---|---|
| .claude/agents/, agents/briefs/ | products/*/ (except command-center) |
| .claude/commands/, workflows/, scripts/ | .claude/orchestrator/state.yml |
| .claude/orchestrator/ (except state.yml) | .claude/PORT-REGISTRY.md |
| .claude/engine/, protocols/, standards/ | .claude/memory/company-knowledge.json |
| .claude/quality-gates/, templates/ | .claude/memory/decision-log.json |
| .claude/CLAUDE.md, COMPONENT-REGISTRY.md | .claude/memory/agent-experiences/ |
| .specify/, .github/, .githooks/ | .claude/memory/metrics/ |
| products/command-center/ | .claude/audit-trail.jsonl |
| docs/, packages/ | notes/ |

## Files Modified
- `.claude/scripts/setup-connectsw.sh` — Main implementation
- `~/.claude/commands/connectsw.md` — Command documentation
