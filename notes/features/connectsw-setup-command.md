# Feature: `/connectsw` Setup Command

## Purpose
Bootstrap the entire ConnectSW AI agent system into any git repo by running `/connectsw <company-name>`.

## Files
- `~/.claude/commands/connectsw.md` — Global slash command (works in any repo)
- `.claude/scripts/setup-connectsw.sh` — Setup script (~200 lines)

## Architecture Decisions
- Uses `rsync --ignore-existing` for safe non-destructive copy (overridable with `--force`)
- Skips product-specific state: `state.yml`, `settings.local.json`, `audit-trail.jsonl`, `PHASE-*-ENHANCEMENTS.md`
- Skips product-specific CI workflows (only copies GitHub templates)
- Fresh `company-knowledge.json`, `decision-log.json`, PORT/COMPONENT registries
- Global find/sed replaces "ConnectSW" with company name across all copied files
- macOS `sed -i ''` with Linux fallback `sed -i`

## 22 .claude/ Directories Copied
agents, commands, engine, workflows, protocols, quality-gates, scripts, skills,
standards, templates, advanced-features, architecture, resource-management,
dashboard, monitoring, checkpointing, security, mcp-tools, audit, checklists, tests
+ orchestrator (excluding state.yml)

## Also Copied
- `.specify/` (spec-kit templates + constitution)
- `.github/ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`, `dependabot.yml`
- `.githooks/` (pre-commit, post-commit safety hooks)
- `.claude/CLAUDE.md`
- `.claude/memory/memory-system.md`, `relevance-scoring.md`

## Verification Checklist
- [ ] Creates all 22+ directories under `.claude/`
- [ ] Fresh state.yml with company name and today's date
- [ ] "ConnectSW" replaced with company name in all files
- [ ] `.githooks/` exists and hooks path configured
- [ ] `.specify/` exists with templates
- [ ] Empty memory files (no carried-over patterns)
- [ ] No product-specific data (no state.yml content, no CI workflows)
- [ ] Idempotent — running twice doesn't duplicate or break
