# Getting Started

Your first hour in a fresh fork. By the end of it you will have run the demo
product, watched a quality gate fail on purpose, and asked the Orchestrator to
build something.

## 1. Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Node.js | 20+ | Runtime for every product |
| pnpm | 10+ | Workspace package manager (`npm i -g pnpm`) |
| Docker | any recent | PostgreSQL for development and integration tests |
| git | 2.9+ | `core.hooksPath` support, which the enforcement hooks need |
| [Claude Code](https://claude.com/claude-code) | latest | Runs the agents |

## 2. Fork and clone

Fork on GitHub — you want your own history, not a clone of someone else's — then:

```bash
git clone git@github.com:<you>/<your-company>.git
cd <your-company>
pnpm install
git config core.hooksPath .githooks
```

The last line matters. Without it the traceability, secret-scanning and
preflight hooks never run, and half the constitution becomes advisory.

## 3. Make it your company

```bash
tools/rename-company.sh "Northwind"        # or --dry-run first
```

This renames the company across agent definitions, protocols and package scopes,
and resets `.claude/orchestrator/state.yml` so your company starts empty.
Afterwards, set your own name as CEO in that file.

## 4. Run the demo product

```bash
cd products/taskflow
pnpm setup     # PostgreSQL on 5433, schema push, seed data
pnpm dev       # API on :5000, web on :3100
```

Open http://localhost:3100 and add a task. Then read the trail that produced it:

```
docs/specs/001-task-crud/spec.md   →  what and why, with US/FR/AC ids
docs/plan.md                       →  architecture, constitution check, diagrams
docs/tasks.md                      →  27 tasks, each pointing at a file
apps/api/tests/integration/        →  every acceptance criterion, asserted
apps/api/src/services/             →  the rules those tests cover
```

That trail is what the agents are expected to produce for every feature. It is
also the fastest way to judge whether this framework is worth adopting.

## 5. Watch enforcement work

Break a rule on purpose:

```bash
cd products/taskflow
echo "// stray change" >> apps/api/src/app.ts
git add apps/api/src/app.ts
git commit -m "feat(api): tweak something"
```

The `commit-msg` hook rejects it: a `feat` commit must name the requirement it
serves (Article VI). Commit it properly and it passes:

```bash
git commit -m "feat(api): tweak something [US-01]"
```

Then undo the experiment: `git reset --hard HEAD~1`.

Run the gates directly whenever you want:

```bash
.claude/quality-gates/executor.sh testing taskflow
.claude/scripts/ci-preflight.sh
```

## 6. Talk to the Orchestrator

Open Claude Code in the repository root and state what you want. You talk only
to the Orchestrator; it routes everything else.

```
/orchestrator New product: a link-in-bio page builder for photographers
```

It will run the pipeline — business analysis, spec, clarification, PRD,
architecture, plan, tasks — and stop at checkpoints for your approval. Expect to
answer questions: the Product Manager will come back with ambiguities rather
than guessing, which is the behaviour you want.

Smaller asks work the same way:

```
/orchestrator Add task due-date reminders to taskflow
/orchestrator Fix the empty state flashing on first paint in taskflow
/orchestrator Status update
```

## 7. Before you go further

Read `.specify/memory/constitution.md` end to end. It is short, it is binding,
and every agent cites it. If an article does not match how your team works,
amend it now — a constitution nobody believes in gets rationalised away by the
first agent under deadline pressure.

## Where to next

| You want to | Read |
|-------------|------|
| Change agents, rules, stack or gates | [CUSTOMIZING.md](CUSTOMIZING.md) |
| Add the agent system to an existing repository | [INSTALLATION.md](INSTALLATION.md) |
| Run several agents at once | [PARALLEL-DEVELOPMENT.md](PARALLEL-DEVELOPMENT.md) |
| Understand the working practices behind the design | [CLAUDE-CODE-100X-PLAYBOOK.md](CLAUDE-CODE-100X-PLAYBOOK.md) |

## Troubleshooting

**`pnpm setup` fails to connect to PostgreSQL.** Check `docker ps` — the demo
publishes 5433, not 5432, to avoid clashing with a system PostgreSQL. If 5433 is
taken, change the port in `products/taskflow/docker-compose.yml` and the
`DATABASE_URL` in `apps/api/.env`.

**Integration tests fail with connection errors.** They need the database
running; they never mock it (Article III). `pnpm db:up` first.

**Hooks do not fire.** `git config core.hooksPath` should print `.githooks`. In a
worktree, set it again inside the worktree.

**The web app says the API is not reachable.** Start the API
(`pnpm --filter @taskflow/api dev`) — the page renders a readable message
instead of a stack trace by design.
