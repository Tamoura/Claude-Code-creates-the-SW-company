# Orchestrator Metrics Integration (Phases 4-6)

## What
Wire together the empty metrics JSON stubs so the orchestrator
system actually tracks agent performance, quality gate results,
and architectural decisions.

## Files Created
- `.claude/scripts/aggregate-metrics.sh` — reads agent experience
  files, computes per-agent stats, writes `agent-performance.json`
- `.claude/scripts/update-gate-metrics.sh` — records pass/fail for
  quality gates in `gate-metrics.json`
- `.claude/scripts/log-decision.sh` — appends architectural/tech
  decisions to `decision-log.json`

## Files Modified
- `.claude/scripts/post-task-update.sh` — step 4 calls
  `aggregate-metrics.sh` after every task completion
- `.claude/scripts/testing-gate-checklist.sh` — records gate result
  before final exit
- `.claude/scripts/generate-dashboard.sh` — 3 new sections:
  Agent Performance, Quality Gates, Recent Decisions

## Testing
All scripts tested manually and produce correct output.
`generate-dashboard.sh` renders all new sections in the report.

## Additional Fixes (same branch)
- Created 5 missing agent experience files (code-reviewer,
  innovation-specialist, product-strategist, ui-ux-designer,
  mobile-developer)
- Renamed mobile brief from mobile-engineer.md to
  mobile-developer.md (naming mismatch)
- Created /code-reviewer command for lightweight ad-hoc reviews

## Verification
- 67/67 orchestrator-referenced files now exist
- 14/14 agents have experience files
- 14/14 agents have correctly-named briefs
- 7/7 commands exist (orchestrator, audit, status, dashboard,
  execute-task, check-system, code-reviewer)

## Dependencies
- `jq` required (graceful fallback if missing)
- `bc` used for decimal arithmetic
