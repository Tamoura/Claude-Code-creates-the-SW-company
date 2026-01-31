# Agent Infrastructure Enhancement

## Branch: enhance/agent-infrastructure

## Problem
The ConnectSW agentic company has extensive design docs but
significant gaps between design and execution:

1. TypeScript infra files can't run (no tsx at root)
2. State is stale (deleted products listed, zeros everywhere)
3. Feedback loop broken (agents never update memory)
4. Quality gates optional (|| true in CI)
5. MCP tools planned but not built (deferred)

## Phases

- Phase 0: Fix foundation (package.json, state.yml, TS files, gate scripts)
- Phase 1: Close feedback loop (post-task hooks, audit trail, backfill)
- Phase 2: Enforce quality gates in CI/CD
- Phase 3: Improve CEO developer experience
- Phase 4: Make agents learn (real patterns from stablecoin-gateway)
- Phase 5: Observability (audit trail viewer, timestamped reports)

## Key Decisions

- Bash for new infra scripts, fix existing TS but don't add more
- JSONL append-only audit trail over JSON mutation
- Filesystem scanning over state.yml for truth
- CI enforcement over script-based gates

## Products That Actually Exist
- stablecoin-gateway (most active, backend-only)
- meetingmind
- quantum-computing-usecases
- basic-calculator
- gpu-calculator
- it4it-dashboard
- itil-dashboard
- tech-management-helper

## Active Products (with real development)
- stablecoin-gateway (50+ commits, active audit branch)
