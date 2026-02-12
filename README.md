# ConnectSW

**An AI-native software company where 17 specialist Claude Code agents build, test, and ship production software — directed by a single CEO.**

ConnectSW is not a framework, library, or boilerplate. It is a fully operational software company running inside a git repository. The CEO gives natural language commands. The Orchestrator breaks them into tasks. Specialist agents — Product Manager, Architect, Backend Engineer, Frontend Engineer, QA Engineer, and 12 others — execute those tasks across a multi-product portfolio.

The result: **3 products in production, 60+ reusable components, 6 CI/CD pipelines, and a self-improving agent memory system** — all built by AI agents, governed by a 9-article constitution, and verified through 6 quality gates.

---

## How It Works

```
CEO: "New product: invoice generator for freelancers"
 │
 └── Orchestrator
      ├── Product Manager    →  /speckit.specify  →  Structured feature spec
      ├── Product Manager    →  /speckit.clarify   →  Resolve 5 ambiguities
      ├── Architect          →  /speckit.plan      →  Implementation plan + API contracts
      ├── Orchestrator       →  /speckit.tasks     →  52 dependency-ordered tasks
      ├── QA Engineer        →  /speckit.analyze   →  Spec consistency: PASS
      ├── Backend Engineer   →  TDD + dev-test     →  12 API endpoints (all green)
      ├── Frontend Engineer  →  TDD + dev-test     →  8 pages (all verified)
      ├── QA Engineer        →  Dynamic tests      →  47 tests (6 edge case bugs caught)
      ├── QA Engineer        →  DB verification    →  Schema intact, 0 orphans
      ├── DevOps Engineer    →  Docker + CI/CD     →  Multi-stage build, GitHub Actions
      └── CEO                →  "Ship it"          →  Production
```

**Every step is traceable.** Every spec requirement maps to tasks, tasks map to tests, tests verify the spec. The constitution governs what agents can and cannot do. Quality gates block bad code. The memory system helps agents learn from past work.

---

## Product Portfolio

| Product | What It Does | Stack | Status |
|---------|-------------|-------|--------|
| **stablecoin-gateway** | Institutional stablecoin payment gateway with security-audited API, SDK, and merchant demo | Fastify + Next.js + PostgreSQL + Redis | Production |
| **pulse** | AI-powered developer intelligence platform with GitHub analytics, team health scoring, and mobile app | Fastify + Next.js + Expo Mobile | Production |
| **invoiceforge** | AI invoice/proposal generator for freelancers with Stripe billing integration | Fastify + Vite + PostgreSQL | Production |
| **muaththir** | Influential content platform with analytics | Fastify + Next.js + PostgreSQL | Development |
| **quantum-computing-usecases** | Interactive quantum computing use case explorer | Vite + React | Prototype |

**Total codebase**: 854 TypeScript files, 12.9M across 7 products.

---

## The Agent System

17 specialist agents, each with a deep-dive definition (200-300 lines), experience memory, and role-specific tools.

```
CEO
 └── Orchestrator (task graph engine, parallel execution, risk-based checkpoints)
      │
      ├── Strategy & Requirements
      │   ├── Product Manager ........... Specs via /speckit.specify, clarify ambiguities
      │   ├── Product Strategist ........ Market analysis, competitive research, roadmaps
      │   └── Innovation Specialist ..... Emerging tech R&D, proof-of-concepts
      │
      ├── Design & Architecture
      │   ├── Architect ................. System design via /speckit.plan, ADRs, API contracts
      │   └── UI/UX Designer ............ Design systems, accessibility, user research
      │
      ├── Implementation
      │   ├── Backend Engineer .......... Fastify APIs, Prisma, TDD + dev-test protocol
      │   ├── Frontend Engineer ......... Next.js/React, TDD + dev-test protocol
      │   ├── Mobile Developer .......... React Native (Expo), cross-platform
      │   └── Data Engineer ............. Schemas, migrations, data pipelines
      │
      ├── Quality & Security
      │   ├── QA Engineer ............... Dynamic test generation, DB verification, E2E
      │   ├── Security Engineer ......... AppSec, DevSecOps, compliance audits
      │   ├── Performance Engineer ...... Optimization, load testing, Lighthouse
      │   └── Code Reviewer ............. Architecture audits, security assessment
      │
      └── Operations
          ├── DevOps Engineer ........... CI/CD, Docker, infrastructure-as-code
          ├── Technical Writer .......... API docs, user guides, ADRs
          └── Support Engineer .......... Bug triage, production support
```

### What Makes These Agents Different

Each agent has:

- **Experience memory** — learned patterns, common mistakes, preferred approaches (persisted across sessions)
- **Company knowledge** — shared patterns from all products (60+ cataloged)
- **Product context** — product-specific addendum with tech stack, business logic, design patterns
- **Spec-kit integration** — structured workflows replacing ad-hoc processes
- **Development-Oriented Testing** — real-time validation during coding, not just at QA gate

---

## Specification-Driven Development

ConnectSW uses [GitHub's spec-kit](https://github.com/github/spec-kit) methodology, adapted with a 9-article constitution governing all work.

### The Pipeline

```
CEO brief
  → /speckit.specify    Product Manager creates structured spec (user stories, requirements, acceptance criteria)
  → /speckit.clarify    Product Manager resolves up to 5 ambiguities with CEO
  → /speckit.plan       Architect creates traceable implementation plan (constitution check gate)
  → /speckit.tasks      Orchestrator generates dependency-ordered task list (TDD-enforced)
  → /speckit.analyze    QA Engineer validates spec/plan/tasks consistency (quality gate)
  → /speckit.implement  Orchestrator delegates to specialist agents
```

### The Constitution

9 articles that govern all specification-to-implementation work:

| Article | Principle | Enforcement |
|---------|-----------|-------------|
| I | Spec-First Development | No code without a spec |
| II | Component Reuse Before Creation | 60+ components in registry |
| III | Test-Driven Development | Tests first, no mocks, real DBs |
| IV | TypeScript Everywhere | Strict mode, Zod validation |
| V | Default Technology Stack | Fastify + Next.js + PostgreSQL + Prisma |
| VI | Specification Traceability | Every task traces to a spec requirement |
| VII | Port Registry Compliance | Unique ports, no conflicts |
| VIII | Git Safety | Specific staging, pre-commit hooks, no `git add .` |
| IX | Quality Gates | 6 gates from spec consistency to production readiness |

---

## Quality Gate System

6 gates catch issues at the earliest, cheapest stage — from specification consistency down to production readiness.

```
Spec → Gate -1 → Gate 0 → Gate 1 → Gate 2 → Gate 3 → Gate 4 → CEO
        │          │         │         │         │         │
    Spec/Plan   Browser   Security  Perform-  Testing   Prod
    Consistent? Works?    Issues?   ance OK?  All Pass? Ready?
```

| Gate | Name | When | Powered By |
|------|------|------|------------|
| -1 | Spec Consistency | After task generation | `/speckit.analyze` |
| 0 | Browser-First | Before code-level gates | Playwright headless |
| 1 | Security | Before PR creation | npm audit, secret scanning |
| 2 | Performance | Before staging | Lighthouse, bundle analysis |
| 3 | Testing | Before CEO checkpoint | Unit + Dynamic + E2E + DB Verification |
| 4 | Production Readiness | Before deploy | Monitoring, SSL, rollback plan |

### Testing Gate — Enhanced

The testing gate incorporates techniques from [FullStack-Agent](https://arxiv.org/abs/2602.03798) research:

- **Dynamic Test Generation**: QA analyzes code and generates edge case tests (boundary values, state transitions, concurrent operations) — not just spec-derived tests
- **Database State Verification**: Validates schema integrity, orphan detection, audit trail completeness, and sensitive data handling — not just API response correctness
- **Development-Oriented Testing**: Backend and Frontend Engineers validate their work in real-time during coding (54% fewer debugging iterations per FullStack-Agent ablation study)

---

## Component Reuse System

60+ production-tested, cataloged components across all products. Before building anything, agents check the registry.

| Category | Count | Examples |
|----------|-------|----------|
| Backend Services | 11 | Auth Plugin (JWT + API key), Webhook Delivery, Circuit Breaker, Audit Log, Email Service |
| Frontend Components | 20+ | ErrorBoundary, ProtectedRoute, StatCard, Sidebar, ThemeToggle, TokenManager |
| Infrastructure | 10+ | Multi-stage Dockerfile, docker-compose, Playwright config, GitHub Actions workflows |
| Database Models | 5+ | User, ApiKey, WebhookEndpoint, AuditLog (Prisma base models) |

---

## Agent Memory & Learning

Agents learn from experience and share knowledge across products.

```
.claude/memory/
├── agent-experiences/           Per-agent: learned patterns, mistakes, timing
├── company-knowledge.json       Cross-product: patterns, anti-patterns, gotchas
├── decision-log.json            Technology decisions with rationale
└── metrics/                     Gate pass rates, estimation history, test effectiveness
```

### Repository Back-Translation

Inspired by [FullStack-Agent](https://arxiv.org/abs/2602.03798) research: production codebases are analyzed and reverse-engineered into step-by-step development trajectories. These trajectories teach agents how similar products were built, enabling faster bootstrapping of new products.

---

## Repository Structure

```
.
├── products/                        7 product codebases
│   ├── stablecoin-gateway/            Production: Full-stack + SDK + merchant demo
│   ├── pulse/                         Production: Full-stack + mobile (Expo)
│   ├── invoiceforge/                  Production: Full-stack + AI + Stripe
│   ├── muaththir/                     Development: Full-stack content platform
│   ├── quantum-computing-usecases/    Prototype: Frontend-only explorer
│   ├── deal-flow-platform/            Early: Deal management
│   └── meetingmind/                   Early: Meeting intelligence
│
├── packages/shared/                 @connectsw/shared cross-product utilities
│
├── .claude/                         Agent operating system
│   ├── agents/                        17 specialist definitions (200-300 lines each)
│   ├── orchestrator/                  Task graph engine, state management
│   ├── workflows/                     new-product, new-feature, bug-fix, release
│   ├── quality-gates/                 6-gate system + DB state verification
│   ├── protocols/                     Dev-test, back-translation, dynamic tests
│   ├── memory/                        Agent experience, company knowledge, metrics
│   ├── engine/                        Task graph execution, parallel scheduling
│   ├── commands/                      /orchestrator, /audit, /dashboard, /status
│   ├── scripts/                       18 utility scripts
│   ├── standards/                     Testing standards, API specs
│   ├── COMPONENT-REGISTRY.md          60+ reusable components catalog
│   └── PORT-REGISTRY.md              Port allocation system
│
├── .specify/                        Spec-kit integration
│   ├── memory/constitution.md         9-article governance document
│   └── templates/                     Spec, plan, tasks, checklist templates
│       └── commands/                  8 slash command definitions
│
├── .github/workflows/               6 CI/CD pipelines
├── .githooks/                       Pre-commit safety hooks
├── docs/                            Company documentation
└── notes/                           CEO briefs, strategy, research
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ / TypeScript 5+ (strict) |
| Backend | Fastify + Prisma + PostgreSQL 15+ + Redis 7+ |
| Frontend | Next.js 14+ / Vite + React 18+ / Tailwind CSS |
| Mobile | React Native (Expo) |
| Testing | Jest / Vitest + Playwright |
| Validation | Zod |
| CI/CD | GitHub Actions |
| Containers | Docker (multi-stage builds) |

---

## Getting Started

```bash
# Clone and setup
git clone <repo-url>
cd Claude-Code-creates-the-SW-company
git config core.hooksPath .githooks

# Start infrastructure
docker compose up -d

# Run any product
cd products/stablecoin-gateway && npm install && npm run dev

# Run tests
npm test && npm run test:e2e
```

### Port Assignments

| Product | Frontend | Backend | Mobile |
|---------|----------|---------|--------|
| stablecoin-gateway | 3104 | 5001 | — |
| pulse | 3106 | 5003 | 8081 |
| invoiceforge | 3109 | 5004 | — |
| muaththir | 3108 | 5005 | — |
| quantum-computing-usecases | 3105 | — | — |

All products run simultaneously with no port conflicts.

### CEO Commands

| Command | Purpose |
|---------|---------|
| `/orchestrator New product: [idea]` | Create a new product from idea to production |
| `/orchestrator Add [feature] to [product]` | Add a feature with full spec-kit pipeline |
| `/orchestrator Fix [description] in [product]` | Fix a bug with root cause analysis |
| `/orchestrator Ship [product] to production` | Deploy through all quality gates |
| `/orchestrator Status update` | Status across all products |
| `/audit [product]` | Full code audit |
| `/dashboard` | Executive dashboard |

---

## Development Standards

| Standard | Rule |
|----------|------|
| TDD | Red-Green-Refactor. Tests written before implementation. |
| No Mocks | Real databases, real APIs, real file systems in tests. |
| Dev-Test | Engineers validate in real-time during coding, not just at QA gate. |
| Coverage | 80%+ minimum across all products. |
| Git Safety | Specific file staging, pre-commit hooks block >30 files or >5000 deletions. |
| Conventional Commits | `feat(scope): description`, `fix(scope): description` |
| Component Reuse | Check registry before building. Add to registry after building. |
| Spec Traceability | Every task maps to a spec requirement. Every test maps to acceptance criteria. |

---

## Research Foundations

ConnectSW incorporates techniques from recent AI software engineering research:

| Technique | Source | How We Use It |
|-----------|--------|---------------|
| Specification-Driven Development | [GitHub spec-kit](https://github.com/github/spec-kit) | Spec → Plan → Tasks → Implement pipeline with constitution governance |
| Development-Oriented Testing | [FullStack-Agent](https://arxiv.org/abs/2602.03798) (2026) | Real-time API/browser testing during coding (54% fewer iterations) |
| Dynamic Test Generation | FullStack-Agent | QA generates edge case tests from code analysis, not just specs |
| Database State Verification | FullStack-Agent FullStack-Bench | Verify DB integrity beyond API response correctness |
| Repository Back-Translation | FullStack-Agent | Learn from production codebases to bootstrap new products faster |

---

## License

Proprietary - ConnectSW
