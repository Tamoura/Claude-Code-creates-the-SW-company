# 12-Factor Compliance — Agent Standard

**Branch**: `feature/12-factor-compliance`
**Started**: 2026-07-25
**Ask (CEO)**: add https://12factor.net to the audit agents — first Factor XI (Logs), then
all twelve — universally, then propagate to the agents inside the SW company.

## Scope

Documentation/prompt change only. No product code, so no Red-Green-Refactor cycle —
these files are agent instructions, not executable behaviour.

Already done outside this repo (global, applies to any codebase):
- `~/.claude/commands/connectsw-audit.md` — 12-Factor Compliance Agent (Step 2 #7),
  full twelve-factor Pass/Partial/Fail table in Section 11, dimension cap rules,
  `12-FACTOR: X/12` line in the run summary.
- `~/.claude/commands/connectsw-code-reviewer.md` — comparison table mentions all twelve.
- Both had a stale `$CONNECTSW_SOURCE` default (`~/Desktop/...`); repo actually lives at
  `~/Dev/Projects/Claude Code creates the SW company`. Fixed — the brief was never loading.

## In this repo

| File | Change |
|------|--------|
| `.claude/agents/code-reviewer.md` | Phase 4 — expand "12-Factor App (config, backing services, port binding, etc.)" into the full twelve-factor rubric with fail signals + dimension caps |
| `.claude/agents/briefs/code-reviewer.md` | Make the twelve factors an explicit evaluation target, not a passing mention |
| `.claude/agents/architect.md` | Design-time factors: III Config, IV Backing services, VI Processes, VIII Concurrency, X Dev/prod parity |
| `.claude/agents/devops-engineer.md` | Deploy-time factors: V Build/release/run, IX Disposability, X Parity, XI Logs, XII Admin processes |
| `.claude/agents/backend-engineer.md` | Implementation-time factors: III, VI, VII, IX, XI, XII |
| `.claude/agents/briefs/*.md` (same four) | One-line evaluation target mirroring the agent file |

## Decisions

- 12-Factor is **one framework**, not a new audit dimension. Each factor routes into the
  dimension it damages (Config→Security, Processes/Concurrency→Architecture,
  Build-release-run/Disposability→DevOps, Logs→Observability, Parity→Runability) and caps
  it at 6-7/10 on a Fail. Keeps overall scores comparable to past audits.
- **N/A is a valid verdict.** Libraries, CLIs and static sites must not be failed on
  VII/VIII. N/A factors are excluded from the compliance percentage.
- Factor XI keeps six sub-controls (XI.1-XI.6) because that is where the CEO started and
  it is the factor most often violated in practice.

## Open / not done

- The Constitution (`.specify/memory/constitution.md`, 14 articles) has no 12-Factor
  article. Arguably belongs there as the single source of truth — **not added**, needs a
  CEO call since it changes governance, not just agent prompts.
- Project-local `.claude/commands/audit.md` copies in `way2quran.com` and
  `way2quran-mobile` still carry the older wording. Separate PRs.
