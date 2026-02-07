# ConnectSW

An AI-first software company where Claude Code agents handle all execution under CEO direction.

## Overview

ConnectSW is a software company where the CEO provides vision and direction while an Orchestrator agent coordinates 14 specialist agents to handle everything from product requirements to deployment.

## Product Portfolio

| Product | Description | Status | Ports |
|---------|-------------|--------|-------|
| **stablecoin-gateway** | Institutional stablecoin payment gateway with security-audited API | Active | 3104 / 5001 |
| **quantum-computing-usecases** | Quantum computing use case explorer | Planned | 3105 |

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
│   ├── stablecoin-gateway/      #   Stablecoin payment gateway
│   └── quantum-computing-usecases/ # Quantum use case explorer
├── docs/                        # Company documentation
│   └── INSTALLATION.md          #   Setup guide
├── notes/                       # CEO briefs, decisions
├── .claude/                     # Agent system
│   ├── orchestrator/            #   Orchestrator state
│   ├── agents/                  #   Agent definitions
│   ├── commands/                #   Slash commands
│   ├── memory/                  #   Agent learning & metrics
│   ├── workflows/               #   Multi-agent processes
│   ├── quality-gates/           #   4-stage quality system
│   ├── dashboard/               #   Observability dashboard
│   └── advanced-features/       #   Knowledge graph, A/B testing
└── .github/                     # CI/CD workflows
```

## Technology Stack

- **Runtime**: Node.js 20+ / TypeScript 5+
- **Backend**: Fastify + Prisma + PostgreSQL
- **Frontend**: Next.js 14+ / React 18+ / Tailwind CSS
- **Testing**: Jest, React Testing Library, Playwright
- **CI/CD**: GitHub Actions

## Development Standards

- **TDD**: Red-Green-Refactor for all code
- **No Mocks**: Real databases, real APIs in tests
- **Git Flow**: Feature branches, PRs, squash merge
- **Coverage**: 80%+ minimum
- **Ports**: 3100+ for frontend, 5000+ for backend (see `.claude/PORT-REGISTRY.md`)

## License

Proprietary - ConnectSW
