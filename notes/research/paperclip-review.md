# Review: paperclipai/paperclip

**Repository:** https://github.com/paperclipai/paperclip
**Stars:** 55.2k | **License:** MIT
**Stack:** Node.js 20+, TypeScript, PostgreSQL, React, Express, Drizzle ORM
**Reviewed:** 2026-04-17

## Summary

Paperclip is a self-hosted control plane for orchestrating teams of AI agents into functional companies. Unlike agency-agents (a collection of standalone personas), Paperclip is infrastructure: org charts, task systems, budgets, approval gates, and agent coordination. It launched March 2026 and hit 55k stars in six weeks.

The tagline: "If an agent is an employee, Paperclip is the company."

## Architecture

```
Board (Human)
  └── Company
       ├── Initiatives (strategic goals)
       │    └── Projects
       │         └── Milestones
       │              └── Issues (tasks)
       │                   └── Sub-issues
       ├── Org Chart (agent hierarchy with reporting lines)
       ├── Budgets (per-agent, per-project, per-company)
       └── Agents (external, invoked via adapters)
```

### Key Design Decisions

1. **Agents run elsewhere** — Paperclip is a control plane, not a runtime. It supports Claude Code, OpenClaw, Codex, Cursor, HTTP webhooks, or bash scripts via adapters.
2. **Tasks are the only communication channel** — No side messaging. Delegation = creating a task. Coordination = task comments.
3. **Single-assignee invariant** — Each task has exactly one owner, preventing ambiguous responsibility.
4. **Heartbeat-based scheduling** — Paperclip controls when agents wake, not what they do.
5. **Atomic task checkout** — Prevents duplicate work and runaway execution.
6. **Full org visibility** — Every agent can see the entire org chart, all tasks, all agents.

### Execution Model

- **Invocation**: Adapters implement `invoke()`, `status()`, `cancel()`
- **Recovery**: On crash, preserves ownership, retries once, then escalates visibly
- **Budgets**: Three tiers — dashboards, soft alerts at thresholds, hard ceilings that auto-pause agents
- **Governance**: Board member can pause agents, modify budgets, override decisions at any level

## What They Do Well

### 1. Separation of Control Plane from Agent Runtime
This is architecturally sound. By treating agents as opaque callables, Paperclip avoids vendor lock-in and can orchestrate heterogeneous agent types. ConnectSW's orchestrator is tightly coupled to Claude Code agents.

### 2. Cost Tracking as a First-Class Concern
Per-agent budgets, per-task cost attribution, automatic throttling at budget ceilings. This is production-grade financial governance that ConnectSW currently lacks.

### 3. Persistent State + Task History
PostgreSQL-backed state means task chains, decisions, and cost history survive across sessions. ConnectSW agents operate within ephemeral context windows with no durable cross-session state.

### 4. Progressive Deployment Model
From embedded PGlite locally to authenticated cloud deployment, with Tailscale and LAN options in between. Well-thought-out deployment gradient.

### 5. Company Templates
Reusable company definitions with secret scrubbing — spin up a new company from a template. Interesting for productized agency offerings.

## Weaknesses and Gaps

### 1. No Agent Intelligence Layer
Paperclip is deliberately "unopinionated about agent runtime." It coordinates but doesn't improve agents. No equivalent of ConnectSW's context engineering, progressive disclosure, anti-rationalization, or quality gates. Agents are black boxes.

### 2. No Specification or Quality Framework
No spec-first development, no TDD requirements, no traceability from tasks to requirements, no CI enforcement. Tasks exist but nothing validates their quality.

### 3. No Context Management
No mechanism to manage what agents know or how much context they receive. No equivalent of Context Hub, context compression, or progressive disclosure.

### 4. V1 Single-Board-Member Limitation
Only one human overseer per company in V1. Multi-stakeholder governance isn't supported yet.

### 5. Young and Fast-Moving
Launched March 2026. The spec is clear but the implementation is still catching up. Plugin system is nascent. Breaking changes likely.

## Head-to-Head: Paperclip vs ConnectSW

| Dimension | Paperclip | ConnectSW |
|-----------|-----------|-----------|
| **Agent coordination** | Task-based with org hierarchy | Orchestrator with message routing |
| **Agent runtime** | External (any provider) | Claude Code (tightly integrated) |
| **State persistence** | PostgreSQL, survives sessions | Ephemeral context windows |
| **Cost tracking** | Built-in budgets + auto-throttle | None |
| **Quality gates** | None | Constitution, 5 gate types, CI |
| **Context engineering** | None | Progressive disclosure, compression, Context Hub |
| **Spec-first process** | None | spec-kit with 6 commands |
| **Traceability** | Task → Initiative chain | US-XX/FR-XXX requirement tracing |
| **Deployment** | Self-hosted server + DB | In-process CLI agents |
| **UI** | React dashboard | CLI/terminal |
| **Maturity** | 6 weeks old, 55k stars | Months of iteration, battle-tested |

## Quick Wins for ConnectSW

### 1. Cost Tracking (High priority, Medium effort)
Paperclip's per-agent budget model is something we should adopt. Track token usage and API costs per agent invocation, per task, per product. Add budget alerts. This is our biggest gap that Paperclip solves well.

**Action:** Add token/cost instrumentation to the Orchestrator's agent dispatch. Accumulate per-task and per-product cost summaries. No UI needed initially — log to a cost ledger file.

### 2. Task Persistence Across Sessions (High priority, Medium effort)
Paperclip's PostgreSQL-backed task state survives agent crashes and session boundaries. Our tasks.md files approximate this but lack structured state management.

**Action:** Formalize tasks.md as a structured state file (or lightweight SQLite) that the Orchestrator reads on startup to resume work. Include task status, assignee, cost-to-date, and parent initiative.

### 3. Single-Assignee Task Invariant (Low effort, Immediate)
Paperclip enforces exactly one owner per task. We should adopt this as an explicit rule in the Orchestrator — no task should be "shared" between agents.

**Action:** Add to Constitution Article I or Orchestrator protocol: "Every task has exactly one assignee agent. Shared ownership is prohibited."

### 4. Atomic Task Checkout Pattern (Low effort, Immediate)
Paperclip prevents two agents from claiming the same task simultaneously. Relevant when we run parallel agents.

**Action:** Add to `parallel-execution.md` protocol: before an agent starts a task, it must mark it `in_progress` with its agent ID. No other agent may claim a task already in progress.

### 5. Crash Recovery Semantics (Medium effort)
Paperclip's "preserve ownership, retry once, escalate visibly" is a clean pattern. Currently if a ConnectSW agent dies mid-task, the Orchestrator has no defined recovery behavior.

**Action:** Add a recovery protocol: on agent failure, preserve task ownership, retry once, then escalate to Orchestrator with the failure context. Never silently drop a task.

### 6. Agent Adapter Concept (Low priority, Future)
Paperclip's adapter model (process, HTTP, OpenClaw) is interesting for when we might want non-Claude agents. Not urgent but worth noting for architecture evolution.

## Verdict

**Paperclip is the infrastructure layer that ConnectSW's process layer needs to sit on top of.** They solve coordination and governance; we solve quality and intelligence. They're complementary, not competitive.

The biggest lesson: **Paperclip treats AI companies as real companies** — with budgets, org charts, persistent state, and crash recovery. ConnectSW treats them as development processes — with specs, quality gates, and traceability. The ideal system has both.

### Priority Actions

| Action | Effort | Impact |
|--------|--------|--------|
| Add cost tracking per agent/task | Medium | High — financial visibility |
| Formalize task persistence across sessions | Medium | High — work continuity |
| Single-assignee invariant in Constitution | Trivial | Medium — clarity |
| Atomic task checkout in parallel protocol | Small | Medium — prevents conflicts |
| Crash recovery protocol | Medium | Medium — reliability |
