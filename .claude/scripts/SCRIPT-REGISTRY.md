# Script Registry

**Version**: 1.1.0
**Created**: 2026-02-25
**Updated**: 2026-03-01

All ConnectSW scripts organized by namespace. Use this registry to find the right script — do not browse the scripts directory.

---

## Quick Reference: "I Need To..."

| I Need To... | Script | Namespace |
|--------------|--------|-----------|
| Create a task graph from template | `instantiate-task-graph.sh` | task-graph |
| Check task graph status | `task-graph-status.sh` | task-graph |
| Update a task's status | `update-task-status.sh` | task-graph |
| Run the full testing gate | `testing-gate-checklist.sh` | quality |
| Run smoke/browser tests | `smoke-test-gate.sh` | quality |
| Run spec consistency check | `spec-consistency-gate.sh` | quality |
| Run traceability check | `traceability-gate.sh` | quality |
| Run coverage gate (80% threshold) | `coverage-gate.sh` | quality |
| Run documentation check | `documentation-gate.sh` | quality |
| Diagnose a gate failure | `diagnose-gate-failure.sh` | quality |
| Update gate pass/fail metrics | `update-gate-metrics.sh` | quality |
| Update agent memory after task | `post-task-update.sh` | memory |
| Update agent experience file | `update-agent-memory.sh` | memory |
| Log a decision to decision log | `log-decision.sh` | memory |
| Extract patterns from codebase | `extract-patterns.sh` | memory |
| Backfill history from past work | `backfill-history.sh` | memory |
| Generate company dashboard | `generate-dashboard.sh` | reporting |
| Generate company state snapshot | `generate-state.sh` | reporting |
| Aggregate performance metrics | `aggregate-metrics.sh` | reporting |
| View audit trail entries | `view-audit-trail.sh` | reporting |
| Log an audit trail entry | `audit-log.sh` | reporting |
| Verify spec-kit pipeline before implementation | `speckit-preflight.sh` | quality |
| Create sprint milestone + GitHub Issues from PRD | `create-sprint.sh` | backlog |
| Manage agile backlog | `manage-backlog.sh` | backlog |
| Sync backlog to GitHub issues | `sync-backlog-to-github.sh` | backlog |
| Set up a new ConnectSW repo | `setup-connectsw.sh` | infra |
| Set up branch protection | `setup-branch-protection.sh` | infra |
| Manage git worktrees | `worktree.sh` | infra |
| Run pre-commit checks | `pre-commit.sh` | infra |

---

## Namespaces

### `task-graph` — Task Graph Management
Scripts for creating, monitoring, and updating task graphs.

| Script | Purpose | Args |
|--------|---------|------|
| `instantiate-task-graph.sh` | Create task graph from workflow template | `<template> <product> "<params>"` |
| `task-graph-status.sh` | Display current task graph state | `<product>` |
| `update-task-status.sh` | Update a task's status | `<product> <task_id> <status>` |

### `quality` — Quality Gates
All quality gate scripts. Run before CEO checkpoints.

| Script | Purpose | Args |
|--------|---------|------|
| `testing-gate-checklist.sh` | Full testing gate (unit + E2E + smoke) | `<product>` |
| `smoke-test-gate.sh` | Browser smoke test gate | `<product>` |
| `spec-consistency-gate.sh` | Spec/plan/tasks alignment check | `<product>` |
| `traceability-gate.sh` | Requirement traceability check | `<product>` |
| `documentation-gate.sh` | Documentation completeness check | `<product>` |
| `speckit-preflight.sh` | Verify spec-kit pipeline before implementation | `<product> [--strict]` |
| `coverage-gate.sh` | Enforce 80% test coverage threshold | `<product> [threshold_percent]` |
| `diagnose-gate-failure.sh` | Diagnose why a gate failed | `<gate-type> <product> <report_file>` |
| `update-gate-metrics.sh` | Record gate pass/fail results | `<product> <gate> <result>` |

### `memory` — Knowledge & Memory
Scripts for managing the agent memory system.

| Script | Purpose | Args |
|--------|---------|------|
| `post-task-update.sh` | Update memory + audit trail after task completion | `<agent> <task_id> <product> <status> <minutes> "<summary>" "[pattern]"` |
| `update-agent-memory.sh` | Update agent experience file | `<agent> <task_id> <product> <status> <minutes> "<summary>"` |
| `log-decision.sh` | Log an architectural decision | `<product> "<title>" "<rationale>"` |
| `extract-patterns.sh` | Extract reusable patterns from code | `<product>` |
| `backfill-history.sh` | Populate memory from past git history | `<product>` |

### `reporting` — Dashboards & Metrics
Scripts for generating reports, dashboards, and aggregating metrics.

| Script | Purpose | Args |
|--------|---------|------|
| `generate-dashboard.sh` | Compile full company status dashboard | (none) |
| `generate-state.sh` | Snapshot current company state | (none) |
| `aggregate-metrics.sh` | Aggregate performance/cost metrics | (none) |
| `view-audit-trail.sh` | View recent audit trail entries | `[count]` |
| `audit-log.sh` | Log a single audit trail entry | `<action> <actor> <target> "<details>"` |

### `backlog` — Agile Backlog Management
Scripts for sprint and backlog management.

| Script | Purpose | Args |
|--------|---------|------|
| `create-sprint.sh` | Create GitHub milestone + issues per user story from PRD | `<product> <sprint-number> [sprint-name]` |
| `manage-backlog.sh` | CRUD for backlog items, sprint management | `<action> <product> [args...]` |
| `sync-backlog-to-github.sh` | Sync backlog items to GitHub issues | `<product>` |

### `infra` — Infrastructure & Setup
Scripts for repository setup, git configuration, and infrastructure.

| Script | Purpose | Args |
|--------|---------|------|
| `setup-connectsw.sh` | Initialize a new ConnectSW repository | (none) |
| `setup-branch-protection.sh` | Configure GitHub branch protection | (none) |
| `worktree.sh` | Create/manage git worktrees for parallel work | `<action> [args...]` |
| `pre-commit.sh` | Pre-commit validation checks | (auto-invoked by git hook) |

---

## Agent Script Access

Each agent namespace indicates which scripts an agent should know about:

| Agent Role | Primary Namespaces |
|-----------|-------------------|
| Orchestrator | All namespaces — runs `speckit-preflight.sh` before spawning implementation agents |
| Backend/Frontend/Mobile Engineer | `quality` (`coverage-gate.sh`, testing gate) |
| QA Engineer | `quality`, `reporting` |
| Architect | `task-graph`, `memory` (log-decision) |
| DevOps Engineer | `infra`, `quality` |
| Product Manager | `backlog` (`create-sprint.sh`, `manage-backlog.sh`) |
| All agents | `memory` (post-task-update — mandatory) |

This mapping supports progressive disclosure: agents only need to know about scripts relevant to their role.
