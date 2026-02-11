# ConnectSW - AI Software Company

## Company Overview

ConnectSW is an AI-first software company where Claude Code agents handle all execution under CEO direction via an Orchestrator agent.

## How This Company Works

### For the CEO

You interact ONLY with the Orchestrator. Simply state what you want:
- "New product: [idea]"
- "Add feature: [description] to [product]"
- "Fix bug: [description]"
- "Ship [product] to production"
- "Status update"

The Orchestrator handles everything else.

### Agent Hierarchy

```
CEO
 └── Orchestrator (routes all work)
      ├── Product Manager (specs, requirements)
      ├── Product Strategist (market analysis, roadmap)
      ├── Architect (system design)
      ├── Backend Engineer (API, business logic)
      ├── Frontend Engineer (UI, UX)
      ├── Mobile Developer (iOS, Android, React Native)
      ├── Data Engineer (schemas, migrations, pipelines)
      ├── Performance Engineer (optimization, load testing)
      ├── QA Engineer (testing, quality gates)
      ├── Security Engineer (AppSec, DevSecOps)
      ├── DevOps Engineer (CI/CD, infrastructure)
      ├── UI/UX Designer (design systems, accessibility)
      ├── Technical Writer (documentation)
      ├── Support Engineer (issues, bugs)
      ├── Innovation Specialist (R&D, emerging tech)
      └── Code Reviewer (audits, security assessment)
```

## Standards

### Git

- All work on branches, never direct to main
- PRs required for all changes
- Squash merge for features
- Conventional commits format

### Git Safety Rules (MANDATORY)

These rules exist because a bad branch base once deleted 600+ files. Follow them exactly.

1. **Verify base branch before creating a new branch.** Before `git checkout -b`, confirm you are on the correct parent branch — the one the PR will target. Run `git branch --show-current` and verify it matches the intended PR base. If you are on `foundation/X` but the PR targets `feature/Y`, switch first.

2. **Never use `git add .` or `git add -A`.** Always stage specific files by name. Broad adds pick up untracked files from branch divergence and cause mass deletions.

3. **Verify staged files before every commit.** Run `git diff --cached --name-only | wc -l` and `git diff --cached --stat` before committing. If more than ~20 files are staged, stop and investigate — something is likely wrong.

4. **Verify after every commit.** Run `git show --stat` to confirm only the intended files were included. If unexpected files appear, revert immediately with `git reset HEAD~1` before the damage propagates.

5. **A pre-commit hook enforces these rules.** It blocks commits with >30 files or >5000 deleted lines. Do not bypass it unless you have verified every staged file. Hooks live in `.githooks/` (version-controlled). After cloning, run: `git config core.hooksPath .githooks`

### Branch Naming

```
feature/[product]/[feature-id]   # New features
fix/[product]/[issue-id]         # Bug fixes
arch/[product]                   # Architecture work
foundation/[product]             # Initial setup
release/[product]/v[X.Y.Z]       # Releases
```

### Code

- TypeScript for all JavaScript code
- TDD: Red-Green-Refactor
- No mocks in tests - real databases, real services
- 80%+ test coverage minimum
- ESLint + Prettier for formatting

### Ports

**IMPORTANT**: See `.claude/PORT-REGISTRY.md` for port assignments. All products must use unique ports to run simultaneously.

- Frontend apps: 3100-3199 (assigned per product)
- Backend APIs: 5000-5099 (assigned per product)
- Mobile dev servers: 8081-8099 (assigned per product)
- Databases: default ports in Docker (shared via containers)

### Testing

- Unit: Jest
- Integration: Jest + real DB
- E2E: Playwright
- All tests must pass before PR merge

### Component Reuse (MANDATORY)

**Before building ANY backend plugin, service, utility, frontend hook, component, or infrastructure config**, agents MUST:

1. Read `.claude/COMPONENT-REGISTRY.md`
2. Check the "I Need To..." quick reference table
3. If a matching component exists: **copy and adapt it** — do NOT rebuild from scratch
4. If you build something new that is generic (not domain-specific): **add it to the registry**

This rule exists because ConnectSW has 25+ production-tested components across products. Rebuilding wastes time and introduces inconsistency.

**Key registries:**
- `.claude/COMPONENT-REGISTRY.md` — Reusable code components
- `.claude/PORT-REGISTRY.md` — Port assignments

### Specification-Driven Development (spec-kit)

ConnectSW uses [GitHub's spec-kit](https://github.com/github/spec-kit) methodology for specification-driven development. All product and feature work follows a structured spec → plan → tasks → implement pipeline.

**Commands:**

| Command | Agent | Purpose |
|---------|-------|---------|
| `/speckit.specify` | Product Manager | Create structured feature specs from CEO briefs |
| `/speckit.clarify` | Product Manager | Resolve ambiguities in specs (up to 5 questions) |
| `/speckit.plan` | Architect | Create traceable implementation plans from specs |
| `/speckit.tasks` | Orchestrator | Generate dependency-ordered task lists from plans |
| `/speckit.analyze` | QA Engineer | Validate spec/plan/tasks consistency (quality gate) |
| `/speckit.checklist` | QA Engineer | Generate requirements-quality checklists |
| `/speckit.constitution` | Orchestrator | Update governing principles |
| `/speckit.implement` | Orchestrator | Execute tasks via specialist agents |

**Key files:**
- `.specify/memory/constitution.md` — Governing principles (9 articles)
- `.specify/templates/` — Spec, plan, tasks, checklist templates
- `.specify/templates/commands/` — Command definitions
- `products/[product]/docs/specs/` — Feature specifications
- `products/[product]/docs/plan.md` — Implementation plans
- `products/[product]/docs/tasks.md` — Task lists

**Workflow:**
```
CEO brief → /speckit.specify → /speckit.clarify → /speckit.plan → /speckit.tasks → /speckit.analyze → Implementation
```

## Directory Structure

```
/products/[name]/        # Individual products
/packages/               # Shared cross-product packages (future)
/docs/                   # Company documentation
/notes/                  # CEO briefs, decisions
/.claude/                # Agent definitions, workflows
/.specify/               # Spec-kit constitution, templates, commands
```

## Product Structure

Each product follows this structure:

```
products/[name]/
├── apps/
│   ├── api/             # Backend service
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── web/             # Frontend app
│       ├── src/
│       ├── tests/
│       └── package.json
├── packages/            # Product-specific shared code
├── e2e/                 # End-to-end tests
├── docs/
│   ├── PRD.md          # Product Requirements
│   ├── API.md          # API documentation
│   ├── ADRs/           # Architecture decisions
│   ├── specs/          # Feature specifications (spec-kit)
│   ├── plan.md         # Implementation plan (spec-kit)
│   ├── tasks.md        # Task list (spec-kit)
│   └── quality-reports/ # Spec consistency & gate reports
├── package.json        # Monorepo root
└── README.md
```

## Technology Stack

### Default Stack (can be overridden per product)

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5+
- **Backend**: Fastify
- **Frontend**: Next.js 14+ with React 18+
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Testing**: Jest, React Testing Library, Playwright
- **CI/CD**: GitHub Actions

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: feat, fix, refactor, test, docs, chore, ci

Example:
```
feat(auth): add email verification endpoint

Implements PRO-03 email verification with token generation
and expiration handling.

Closes #42
```

## Invoking the Orchestrator

Use the `/orchestrator` command followed by your request:

```
/orchestrator New product: task management app for teams
/orchestrator Add dark mode to stablecoin-gateway
/orchestrator Fix the login bug in deal-flow-platform
/orchestrator Status update on all products
/orchestrator Ship stablecoin-gateway to production
```

### Example Requests

| What You Want | Command |
|---------------|---------|
| Create new product | `/orchestrator New product: [idea]` |
| Add feature | `/orchestrator Add [feature] to [product]` |
| Fix bug | `/orchestrator Fix [description] in [product]` |
| Deploy | `/orchestrator Ship [product] to production` |
| Status | `/orchestrator Status update` |

## How the Orchestrator Works

The Orchestrator manages all work. It will:

1. Break down your requests into tasks
2. Assign tasks to appropriate specialist agents
3. Coordinate parallel work using git worktrees
4. **Run Testing Gate** (via QA Engineer) before any checkpoint
5. Pause at checkpoints for your approval
6. Handle errors with 3 retries before escalating

### Checkpoints (Orchestrator pauses for CEO approval)

- PRD complete
- Architecture complete
- Foundation complete (after Testing Gate PASS)
- Feature complete (after Testing Gate PASS)
- Pre-deployment to production (after Testing Gate PASS)
- Any blocker or decision needed
- After 3 failed retries on any task

### Quality Gates

Before any checkpoint where you'll review the product, the Orchestrator automatically runs:

1. **Spec Consistency Gate** — `/speckit.analyze` validates spec/plan/tasks alignment
2. **Browser-First Gate** — Product works in a real browser
3. **Testing Gate** — Unit tests, E2E tests, visual verification all pass
4. Only proceeds to checkpoint if ALL gates report PASS
5. If FAIL, routes to appropriate agent for fix, then re-runs gates
