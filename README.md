# ConnectSW

An AI-first software company where Claude Code agents handle all execution under CEO direction.

## Overview

ConnectSW is a software company where the CEO provides vision and direction while an Orchestrator agent coordinates 17 specialist agents to handle everything from product requirements to deployment.

## Product Portfolio

| Product | Description | Status | Phase | Ports |
|---------|-------------|--------|-------|-------|
| **stablecoin-gateway** | Institutional stablecoin payment gateway with security-audited API | Active | Production | 3104 / 5001 |
| **pulse** | AI-powered developer intelligence platform (GitHub analytics + team health) | Active | Development | 3106 / 5003 / 8081 |
| **invoiceforge** | AI-powered invoice/proposal generator for freelancers | Active | Production | 3109 / 5004 |
| **quantum-computing-usecases** | Quantum computing use case explorer | Active | Prototype | 3105 |
| **muaththir** | Influential/impactful content platform | Planned | Inception | 3108 / 5005 |

## Getting Started

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for setup instructions.

### Quick Start

```bash
# Start a product
cd products/stablecoin-gateway
npm install
npm run dev

# Run tests
npm test
```

### CEO Commands

| Command | Purpose |
|---------|---------|
| `/orchestrator New product: [idea]` | Create a new product |
| `/orchestrator Add [feature] to [product]` | Add a feature |
| `/orchestrator Fix [description] in [product]` | Fix a bug |
| `/orchestrator Ship [product] to production` | Deploy |
| `/orchestrator Status update` | Check status |
| `/audit [product]` | Run code audit |
| `/status` | Quick status |
| `/dashboard` | View dashboard |

## Agent System

```
CEO
 └── Orchestrator (routes all work)
      ├── Product Manager        # Specs, requirements
      ├── Product Strategist     # Market research, roadmaps
      ├── UI/UX Designer         # User research, design systems
      ├── Innovation Specialist  # Technology exploration, R&D
      ├── Architect              # System design, API contracts
      ├── Backend Engineer       # APIs, database, server logic
      ├── Frontend Engineer      # UI implementation, components
      ├── Mobile Developer       # iOS, Android, React Native
      ├── Data Engineer          # Schemas, migrations, pipelines
      ├── Performance Engineer   # Optimization, load testing
      ├── Security Engineer      # DevSecOps, compliance
      ├── QA Engineer            # Testing, quality assurance
      ├── DevOps Engineer        # CI/CD, infrastructure
      ├── Technical Writer       # Documentation, user guides
      ├── Support Engineer       # Bug triage, production support
      └── Code Reviewer          # Audits, security assessment
```

## Directory Structure

```
.
├── products/                    # Product codebases
│   ├── stablecoin-gateway/      #   Stablecoin payment gateway (full-stack)
│   ├── pulse/                   #   Developer intelligence platform (full-stack + mobile)
│   ├── invoiceforge/            #   AI invoice generator (full-stack)
│   ├── quantum-computing-usecases/ # Quantum use case explorer (frontend only)
│   └── muaththir/               #   Content platform (PRD only, no code yet)
├── docs/                        # Company documentation
│   ├── INSTALLATION.md          #   Setup guide
│   └── PARALLEL-DEVELOPMENT.md  #   Git worktree guide
├── notes/                       # CEO briefs, decisions, strategy
│   ├── ceo/                     #   CEO meeting notes
│   ├── features/                #   Feature/fix briefs
│   ├── strategy/                #   Strategic planning docs
│   ├── innovation/              #   Product ideation
│   ├── research/                #   Market research
│   └── archived/                #   Archived product notes
├── .claude/                     # Agent system
│   ├── orchestrator/            #   Orchestrator state & config
│   ├── agents/                  #   17 specialist agent definitions
│   ├── commands/                #   Slash commands
│   ├── engine/                  #   Task graph engine
│   ├── memory/                  #   Agent learning & metrics
│   ├── workflows/               #   Multi-agent processes
│   ├── quality-gates/           #   4-stage quality system
│   ├── dashboard/               #   Observability dashboard
│   ├── protocols/               #   Agent message routing
│   ├── monitoring/              #   Agent health checks
│   ├── resource-management/     #   Budget & cost tracking
│   ├── security/                #   Secret management
│   ├── scripts/                 #   18 utility scripts
│   └── advanced-features/       #   Knowledge graph, A/B testing
└── .github/                     # CI/CD workflows
```

## Technology Stack

- **Runtime**: Node.js 20+ / TypeScript 5+
- **Backend**: Fastify + Prisma + PostgreSQL + Redis
- **Frontend**: Next.js 14+ / Vite + React 18+ / Tailwind CSS
- **Mobile**: React Native (Expo)
- **Testing**: Jest, React Testing Library, Playwright
- **CI/CD**: GitHub Actions
- **Infrastructure**: Docker (multi-stage builds), docker-compose

## Development Standards

- **TDD**: Red-Green-Refactor for all code
- **No Mocks**: Real databases, real APIs in tests
- **Git Flow**: Feature branches, PRs, squash merge
- **Coverage**: 80%+ minimum
- **Ports**: 3100+ for frontend, 5000+ for backend (see `.claude/PORT-REGISTRY.md`)
- **Components**: Check `.claude/COMPONENT-REGISTRY.md` before building anything new

## License

Proprietary - ConnectSW
