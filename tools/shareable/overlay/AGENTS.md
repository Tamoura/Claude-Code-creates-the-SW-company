# ConnectSW — Repository Guide for Agents

<!-- Identical to CLAUDE.md. Claude Code reads CLAUDE.md; several other coding
     agents read AGENTS.md. Keep the two in sync when you edit either. -->

This repository is an AI-native software company: specialist agents build, test
and ship products under CEO direction, routed by an Orchestrator and governed by
a written constitution.

**If you are an agent starting a task, read in this order:**

1. `.specify/memory/constitution.md` — 14 articles. Binding, not advisory.
2. `.claude/CLAUDE.md` — how the company works: hierarchy, checkpoints, gates.
3. `.claude/PRODUCT-REGISTRY.md` — what exists. If it is not registered, it does not exist.
4. `.claude/COMPONENT-REGISTRY.md` — what is already built. Article II: reuse before you build.
5. The protocol in `.claude/protocols/` that matches your task.

## The one rule that catches most mistakes

Before writing code, do Phase 0 — Mandatory Context Discovery (see
`.claude/CLAUDE.md`): read the target area, confirm the stack in use, check the
component registry, and report what you found. Most bad agent output comes from
skipping this and inventing a pattern the repository already has.

## Repository layout

```
.claude/          Agents, commands, protocols, scripts, registries, quality gates
.specify/         Constitution and spec-kit templates
.githooks/        Commit traceability, pre-commit and pre-push enforcement
packages/         Shared packages every product imports
products/         One directory per product
  taskflow/       Demo product — read this to see what "done" looks like
docs/             Playbooks and architecture decision records
tools/            Repository tooling
```

## Working conventions

| Rule | Where it comes from |
|------|--------------------|
| Every product and feature starts from a spec | Article I |
| Check `.claude/COMPONENT-REGISTRY.md` before building | Article II |
| Tests first, against real dependencies, ≥80% coverage | Article III |
| TypeScript strict everywhere; Zod at every boundary | Article IV |
| Fastify + Prisma + PostgreSQL + Next.js + Tailwind unless an ADR says otherwise | Article V |
| Commits name their requirement: `feat(tasks): add filter [US-02][FR-006]` | Article VI |
| Ports come from `.claude/PORT-REGISTRY.md` | Article VII |
| Never `git add .` — stage named files | Article VIII |
| If it can be a diagram, it must be a diagram | Article IX |
| Gates pass before a checkpoint, no exceptions | Articles X, XI |

## Invoking the company

```
/orchestrator New product: <idea>
/orchestrator Add <feature> to <product>
/orchestrator Fix <description> in <product>
/orchestrator Ship <product> to production
/orchestrator Status update
```

The CEO talks only to the Orchestrator. The Orchestrator routes to specialists,
enforces the gates, and pauses at checkpoints for approval.

## First run in a fresh fork

```bash
pnpm install
git config core.hooksPath .githooks
cd products/taskflow && pnpm setup && pnpm dev
```

Then read `products/taskflow/docs/specs/001-task-crud/spec.md` and follow it
through `plan.md`, `tasks.md`, the tests, and the code. That trail is the
shape every feature in this repository is expected to take.
