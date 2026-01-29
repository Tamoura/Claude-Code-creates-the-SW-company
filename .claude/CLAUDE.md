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
      ├── Architect (system design)
      ├── Backend Engineer (API, database)
      ├── Frontend Engineer (UI, UX)
      ├── QA Engineer (testing, quality)
      ├── DevOps Engineer (CI/CD, infrastructure)
      ├── Technical Writer (documentation)
      └── Support Engineer (issues, bugs)
```

## Standards

### Git

- All work on branches, never direct to main
- PRs required for all changes
- Squash merge for features
- Conventional commits format

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

## Directory Structure

```
/products/[name]/        # Individual products
/shared/                 # Cross-product code
/infrastructure/         # IaC, Docker configs
/docs/                   # Company documentation
/notes/                  # CEO briefs, decisions
/.claude/                # Agent definitions, workflows
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
│   └── ADRs/           # Architecture decisions
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

## Working with the Orchestrator

The Orchestrator manages all work. It will:

1. Break down your requests into tasks
2. Assign tasks to appropriate agents
3. Coordinate parallel work using git worktrees
4. Pause at checkpoints for your approval
5. Handle errors with 3 retries before escalating

### Checkpoints (Orchestrator pauses for CEO approval)

- PRD complete
- Architecture complete
- Sprint/feature complete (PR ready)
- Pre-deployment to production
- Any blocker or decision needed
- After 3 failed retries on any task
