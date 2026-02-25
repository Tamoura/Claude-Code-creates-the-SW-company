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
      ├── Business Analyst (requirements elicitation, stakeholder analysis, gap analysis)
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
- TDD: Red-Green-Refactor (enforced by Anti-Rationalization Framework)
- No mocks in tests - real databases, real services
- 80%+ test coverage minimum
- ESLint + Prettier for formatting
- **Verification-Before-Completion**: No task marked done without evidence (5-step gate)
- **Anti-Rationalization**: 12 TDD + 5 process rationalizations with explicit counters
- **The 1% Rule**: If a check *might* apply, it MUST be run

### Ports

**IMPORTANT**: See `.claude/PORT-REGISTRY.md` for port assignments. All products must use unique ports to run simultaneously.

- Frontend apps: 3100-3199 (assigned per product)
- Backend APIs: 5000-5099 (assigned per product)
- Mobile dev servers: 8081-8099 (assigned per product)
- Databases: default ports in Docker (shared via containers)

### Documentation Standards (MANDATORY)

Documentation must NEVER be thin or skeletal. Every product and feature must have rich, comprehensive documentation that includes ALL of the following:

#### Diagram-First Principle (CEO MANDATE)

**If something can be explained with a diagram, it MUST include a diagram.** Diagrams are the primary communication tool at ConnectSW — text is supplementary. A wall of text where a diagram would suffice is a documentation defect.

All diagrams use **Mermaid syntax** (renders natively in GitHub, Command Center, and our tooling).

**When to use which diagram type:**

| Situation | Diagram Type | Mermaid Syntax |
|-----------|-------------|----------------|
| System boundaries, users, external services | C4 Context | `graph TD` (with C4 styling) |
| Apps, databases, APIs, tech stack | C4 Container | `graph TD` (with container styling) |
| Internal services, modules, plugins | C4 Component | `graph TD` (with component styling) |
| Database tables and relationships | Entity-Relationship | `erDiagram` |
| Multi-step flows (auth, payments, API calls) | Sequence Diagram | `sequenceDiagram` |
| User journeys and workflows | Flowchart | `flowchart TD` |
| Decision logic, branching paths | Flowchart | `flowchart TD` with decision nodes |
| State transitions (order status, user lifecycle) | State Diagram | `stateDiagram-v2` |
| Timeline, phases, parallel work | Gantt Chart | `gantt` |
| Class/module relationships | Class Diagram | `classDiagram` |
| Git branching strategy | Gitgraph | `gitgraph` |
| Quick concept relationships | Mindmap | `mindmap` |

**Minimum diagram requirements by document type:**

**Required in every PRD / Feature Spec:**
- **Business Context**: Why this product/feature exists, what problem it solves, who it serves, market positioning
- **User Stories**: Full user stories with personas, motivations, and acceptance criteria (Given/When/Then)
- **User Journey Flowchart**: Mermaid flowchart showing the user's path through the feature
- **Acceptance Criteria**: Explicit, testable criteria for every user story — never implied
- **C4 Diagrams**: Architecture documentation must include C4 model diagrams (Context, Container, Component, Code) using Mermaid syntax
  - **Level 1 (Context)**: System in its environment — users, external systems, boundaries
  - **Level 2 (Container)**: High-level tech choices — apps, databases, message queues, APIs
  - **Level 3 (Component)**: Internal structure of each container — services, plugins, modules
  - **Level 4 (Code)**: Class/module level detail for complex components (when warranted)
- **Data Model Diagrams**: Entity-relationship diagrams for all database schemas
- **API Contracts**: Full request/response examples, error codes, authentication requirements
- **Sequence Diagrams**: For any multi-step flows (auth flows, payment flows, etc.)
- **State Diagrams**: For any entity with lifecycle states (orders, users, subscriptions)

**Required in every Implementation Plan:**
- **Architecture section with C4 diagrams** (at minimum Level 1 and Level 2)
- **Integration points**: How this feature connects to existing systems — with a sequence diagram showing the integration flow
- **Data flow**: How data moves through the system end-to-end — with a flowchart or sequence diagram
- **ER diagram**: For any database schema changes
- **Security considerations**: Auth, authorization, data protection specifics
- **Error handling strategy**: What can go wrong and how the system recovers — with a flowchart showing error paths

**Required in every README:**
- **Business context**: What this product does and why it exists (not just tech setup)
- **Architecture overview with diagrams**: At minimum a Container-level C4 diagram
- **Getting started**: Complete setup instructions that actually work
- **API overview**: Key endpoints with examples — with a sequence diagram for complex endpoints

**Required in every ADR (Architecture Decision Record):**
- **Before/after diagrams**: Show the architecture before and after the decision
- **Alternatives considered**: Each alternative should have a diagram if the difference is structural

**Enforcement**: If a PR is submitted with thin documentation (missing user stories, no diagrams, no business context, no acceptance criteria), it MUST be rejected and sent back for documentation enrichment. Documentation is not optional — it is a first-class deliverable equal to code. A document that explains something complex without a diagram is incomplete.

### Testing

- Unit: Jest
- Integration: Jest + real DB
- E2E: Playwright
- All tests must pass before PR merge
- **Development-Oriented Testing**: Engineers dev-test during coding (not just at QA gate)
- **Dynamic Test Generation**: QA generates edge case tests from code analysis
- **Database State Verification**: Verify DB integrity, not just API responses

### Component Reuse (MANDATORY)

**Before building ANY backend plugin, service, utility, frontend hook, component, or infrastructure config**, agents MUST:

1. Read `.claude/COMPONENT-REGISTRY.md`
2. Check the "I Need To..." quick reference table
3. If a matching component exists: **copy and adapt it** — do NOT rebuild from scratch
4. If you build something new that is generic (not domain-specific): **add it to the registry**

This rule exists because ConnectSW maintains a growing library of production-tested components across products (see registry for current count). Rebuilding wastes time and introduces inconsistency.

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
- `.specify/memory/constitution.md` — Governing principles (10 articles)
- `.specify/templates/` — Spec, plan, tasks, checklist templates
- `.specify/templates/commands/` — Command definitions
- `products/[product]/docs/specs/` — Feature specifications
- `products/[product]/docs/plan.md` — Implementation plans
- `products/[product]/docs/tasks.md` — Task lists

**Workflow (New Products):**
```
CEO brief → BA analysis → /speckit.specify → /speckit.clarify → PRD → Architecture
→ /speckit.plan → /speckit.tasks → Implementation → /speckit.analyze → CEO Review
```

**Workflow (New Features):**
```
CEO brief → /speckit.specify → Design → Implementation → /speckit.analyze → CEO Review
```

**Enforcement:** Spec-kit tasks (BA-01, SPEC-01, CLARIFY-01, ANALYZE-01) are mandatory for new products. SPEC-{ID} and ANALYZE-{ID} are mandatory for new features. The orchestrator MUST NOT skip them.

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
