# ConnectSW

**An AI-native software company that lives in a git repository.** Specialist
Claude Code agents write the specs, design the architecture, build the code,
test it and ship it — routed by an Orchestrator, governed by a written
constitution, and blocked by quality gates when the work is not good enough.

Fork it, run one setup command, and you have a company: 23 agents, 20 slash
commands, 13 protocols, 33 enforcement scripts, 10 shared packages, and a demo
product whose every line traces back to a numbered requirement.

```
CEO: "New product: invoice generator for freelancers"
 │
 └── Orchestrator
      ├── Business Analyst   →  BA report          →  Stakeholders, gaps, feasibility
      ├── Product Manager    →  /speckit.specify   →  Structured spec with US/FR/AC ids
      ├── Product Manager    →  /speckit.clarify   →  Ambiguities resolved
      ├── Architect          →  /speckit.plan      →  Plan, C4 diagrams, API contracts
      ├── Orchestrator       →  /speckit.tasks     →  Dependency-ordered task list
      ├── QA Engineer        →  /speckit.analyze   →  Spec consistency: PASS
      ├── Backend Engineer   →  TDD                →  Endpoints, tests first
      ├── Frontend Engineer  →  TDD                →  Pages, tests first
      ├── QA Engineer        →  Gates              →  Browser, Testing, Security
      ├── DevOps Engineer    →  CI/CD              →  Pipeline, Docker, deploy
      └── CEO                →  "Ship it"          →  Production
```

Every arrow in that diagram is a real agent definition in `.claude/agents/`, and
every gate is a script that can fail your build.

---

## Why this exists

An agent can write a feature in ten minutes. The hard part was never the typing
— it is that nothing stops an agent from skipping the spec, mocking the database
until the tests go green, reinventing a component that already exists, or
declaring victory without opening a browser.

This repository is the answer to that: a written constitution that agents must
follow, registries they must check, gates they must pass, and hooks that refuse
the commit when they don't. The agents are fast. The process is what makes them
trustworthy.

---

## Quick start

```bash
# 1. Fork this repository on GitHub, then clone your fork
git clone git@github.com:<you>/<your-company>.git && cd <your-company>

# 2. Install and enable the enforcement hooks
pnpm install
git config core.hooksPath .githooks

# 3. Make it yours — renames ConnectSW everywhere and resets company state
tools/rename-company.sh "YourCompany"

# 4. Run the demo product to see the whole pipeline's output
cd products/taskflow && pnpm setup && pnpm dev   # web :3100, API :5000
```

Then open Claude Code in the repository and talk to the Orchestrator:

```
/orchestrator New product: a link-in-bio page builder for photographers
```

Full walkthrough: [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md).

---

## What you get

### The constitution — `.specify/memory/constitution.md`

14 binding articles. Not style advice: agents cite them, gates enforce them, and
hooks reject commits that break them.

| Article | Rule |
|---------|------|
| I | Spec-first — every product and feature starts from a written spec |
| II | Component reuse — check the registry before building anything |
| III | TDD with real dependencies, ≥80% coverage, no database mocks |
| IV | TypeScript strict everywhere, Zod at every runtime boundary |
| V | Default stack: Fastify + Prisma + PostgreSQL + Next.js + Tailwind |
| VI | Traceability — every artifact names its requirement (`US-XX`, `FR-XXX`) |
| VII | Port registry — one product, one pair of ports |
| VIII | Git safety — never `git add .`, verify what you staged |
| IX | Diagram-first — if it can be a diagram, it must be a diagram |
| X | Quality gates — Browser, Security, Performance, Testing, Production |
| XI | Anti-rationalization — evidence, not "it should work" |
| XII | Context engineering — progressive disclosure, attention-aware prompts |
| XIII | CI enforcement — lint, test, coverage, security, traceability |
| XIV | Clean and secure code — shared ESLint config, OWASP-mapped rules |

### 23 agents — `.claude/agents/`

Each is a full role definition (200–300 lines) with its own responsibilities,
tools, quality bar and experience memory.

```
CEO
 └── Orchestrator .................. Routes work, enforces gates, runs parallel worktrees
      │
      ├── Strategy & Requirements
      │   ├── Business Analyst ..... Stakeholder maps, gap analysis, feasibility
      │   ├── Product Manager ...... Specs and clarifications via spec-kit
      │   ├── Product Strategist ... Market analysis, roadmaps
      │   └── Innovation Specialist  Emerging tech, prototypes
      │
      ├── Design & Architecture
      │   ├── Architect ............ System design, ADRs, API contracts
      │   └── UI/UX Designer ....... Design systems, accessibility
      │
      ├── Implementation
      │   ├── Backend Engineer ..... Fastify, Prisma, TDD
      │   ├── Frontend Engineer .... Next.js, React, TDD
      │   ├── AI/ML Engineer ....... Prompts, model routing, evals
      │   ├── Mobile Developer ..... React Native / Expo
      │   └── Data Engineer ........ Schemas, migrations, pipelines
      │
      ├── Quality & Security
      │   ├── QA Engineer .......... Test strategy, E2E, the Testing Gate
      │   ├── Security Engineer .... Threat models, OWASP, secrets
      │   ├── Code Reviewer ........ Production audits, merge gate
      │   └── Performance Engineer   Core Web Vitals, load testing
      │
      ├── Operations
      │   ├── DevOps Engineer ...... CI/CD, Docker, deploys
      │   └── Support Engineer ..... Triage, hotfixes
      │
      ├── Documentation
      │   └── Technical Writer ..... READMEs, API docs, ADRs
      │
      └── Framework experts ........ Fastify, Next.js, Prisma, Tailwind
```

Every agent also has a short brief in `.claude/agents/briefs/` — the Orchestrator
loads the brief for simple tasks and the full definition for complex ones.

### Quality gates — `.claude/quality-gates/`

| Gate | Blocks on |
|------|-----------|
| **Browser-First** | The feature has not been driven in a real browser |
| **Testing** | Tests missing, failing, or below the coverage threshold |
| **Security** | Secrets in source, SAST findings, dependency CVEs |
| **Performance** | Core Web Vitals or bundle budgets exceeded |
| **Production Readiness** | Health checks, migrations or rollback plan missing |
| **Spec Consistency** | Spec, plan and tasks disagree with each other |

```bash
.claude/quality-gates/executor.sh testing taskflow
.claude/quality-gates/executor.sh security taskflow
```

### Enforcement that actually runs

Documentation nobody enforces is a wish. These run whether or not the agent
cooperates:

- **`.githooks/commit-msg`** — rejects a `feat`/`fix` commit with no `[US-XX]` or `[FR-XXX]` id
- **`.githooks/pre-commit`** — blocks secrets and staged junk before they enter history
- **`.githooks/pre-push`** — runs the preflight checks CI would fail on
- **`.claude/scripts/ci-preflight.sh`** — the same checks, on demand
- **`.claude/scripts/traceability-gate.sh`** — every acceptance criterion has a test naming it
- **`.github/workflows/`** — lint, typecheck, integration tests against real PostgreSQL, coverage, security scanning

### Spec-driven development — `.specify/`

The [spec-kit](https://github.com/github/spec-kit) workflow, wired to the agents
that run each step:

| Command | Agent | Produces |
|---------|-------|----------|
| `/speckit.specify` | Product Manager | A spec with numbered user stories and requirements |
| `/speckit.clarify` | Product Manager | Ambiguities resolved before code is written |
| `/speckit.plan` | Architect | Implementation plan, C4 diagrams, constitution check |
| `/speckit.tasks` | Orchestrator | Dependency-ordered task list mapped to files |
| `/speckit.analyze` | QA Engineer | Consistency check across spec, plan and tasks |
| `/speckit.implement` | Orchestrator | Execution across specialist agents |

### Context engineering — `.claude/protocols/`

Context windows degrade through attention dilution long before they hit a token
limit. Agents load what the task needs and nothing more:

| Task complexity | Context loaded | ~Tokens |
|-----------------|----------------|---------|
| Trivial (typo, config) | Role + task + constraints | ~500 |
| Simple (single bug) | + patterns, experience, API docs | ~2,200 |
| Standard (multi-file feature) | + full brief, registries, TDD protocol | ~5,500 |
| Complex (new product) | Everything expanded | ~9,000 |

Also in `.claude/protocols/`: context compression for long sessions, direct
delivery (specialists write files instead of narrating), clean code, secure
coding, regression testing, CI preflight, parallel execution, i18n, and proof
recording.

### Shared packages — `packages/`

`auth` · `billing` · `notifications` · `webhooks` · `audit` · `observability` ·
`ui` · `shared` · `eslint-config` — plus `saas-kit`, a generator that scaffolds a
new product already wired to them. Article II makes checking these mandatory
before an agent writes anything new.

### The demo product — `products/taskflow/`

A task tracker, deliberately small, built by the pipeline it demonstrates. It is
the fastest way to see what "done" means here:

| Artifact | What it shows |
|----------|---------------|
| `docs/specs/001-task-crud/spec.md` | 5 user stories, 11 requirements, 26 acceptance criteria |
| `docs/plan.md` | Constitution check, C4 diagrams, layering rationale |
| `docs/tasks.md` | 29 tasks in dependency order, each pointing at a file |
| `docs/ADRs/ADR-001-layered-api.md` | A decision recorded with its trade-offs |
| `apps/api/tests/` | 29 tests — every API acceptance criterion, against real PostgreSQL |
| `apps/web/__tests__/` | Component tests |
| `e2e/tests/stories/` | Playwright regression suite, organised by story |

```bash
cd products/taskflow
pnpm setup      # PostgreSQL on 5433, schema, seed data
pnpm dev        # web :3100, API :5000
pnpm test       # API integration + web unit tests
```

---

## Repository layout

```
.claude/
  agents/           23 role definitions + short briefs
  commands/         20 slash commands (/orchestrator, /audit, /security-scan, …)
  protocols/        13 protocols — context engineering, TDD, secure coding, i18n
  scripts/          33 scripts — gates, preflight, dashboards, memory, worktrees
  workflows/        new-product, new-feature, bug-fix, release, sunset, prototype
  quality-gates/    Gate definitions and the executor
  templates/        PRD, ADR, sprint plan, product brief
  memory/           Company knowledge, decision log, per-agent experience
  standards/        API, testing and standardisation baselines
  *-REGISTRY.md     Products, ports, components
.specify/
  memory/           The constitution
  templates/        Spec-kit templates and command definitions
.githooks/          commit-msg, pre-commit, pre-push, post-commit
.github/workflows/  CI, security scanning, code review gate
packages/           Shared packages
products/taskflow/  The demo product
docs/               Playbooks, parallel development, ADRs
```

---

## Making it your own

The company ships with opinions. Change them — that is what forking is for.

| To change | Edit |
|-----------|------|
| Company name | `tools/rename-company.sh "YourCompany"` |
| The rules | `.specify/memory/constitution.md` — it is meant to be amended |
| The tech stack | Article V, then `packages/` and the demo product |
| An agent's behaviour | `.claude/agents/<role>.md` and its brief |
| Add an agent | Copy an existing definition; `/create-expert` scaffolds framework experts |
| Add a gate | `.claude/quality-gates/` + a script in `.claude/scripts/` |
| Loosen enforcement | `.githooks/` — but know which article you are dropping |

Details in [docs/CUSTOMIZING.md](docs/CUSTOMIZING.md).

---

## Using it without Claude Code

The enforcement layer is bash, markdown and YAML — no proprietary runtime. Hooks,
gates, preflight scripts and CI run under any agent or none. What is
Claude-Code-specific is the agent-invocation surface: `.claude/agents/` and the
slash commands in `.claude/commands/`. Other tools can read the same role
definitions as plain prompts; `AGENTS.md` mirrors `CLAUDE.md` for agents that
look for that filename.

---

## Requirements

- Node.js 20+ and pnpm 10+
- Docker (for PostgreSQL in local development and integration tests)
- git 2.9+ (for `core.hooksPath`)
- [Claude Code](https://claude.com/claude-code) to run the agents

---

## Documentation

| Guide | For |
|-------|-----|
| [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) | First hour in a fresh fork |
| [docs/CUSTOMIZING.md](docs/CUSTOMIZING.md) | Adapting agents, rules, stack and gates |
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Installing the agent system into an existing repository |
| [docs/PARALLEL-DEVELOPMENT.md](docs/PARALLEL-DEVELOPMENT.md) | Running agents concurrently in git worktrees |
| [docs/CLAUDE-CODE-100X-PLAYBOOK.md](docs/CLAUDE-CODE-100X-PLAYBOOK.md) | The working practices behind the design |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributing back |

---

## A note on the examples

Product names other than `taskflow` that appear in agent definitions and
protocol docs — `riskdesk`, `contentiq`, `postpilot` and friends — are
illustrative. `taskflow` is the only product that actually ships here.

---

## License

MIT — see [LICENSE](LICENSE).
