# ConnectSW

An AI-first software company powered by Claude Code agents.

## Overview

ConnectSW is a software company where the CEO provides vision and direction while Claude Code agents handle all execution - from product requirements to deployment.

## How It Works

```
┌─────────┐
│   CEO   │  You give direction
└────┬────┘
     │
     ▼
┌─────────────────────────────────────────┐
│           ORCHESTRATOR AGENT            │
│                                         │
│  Interprets requests, coordinates work  │
└────┬────────┬────────┬────────┬────────┘
     │        │        │        │
     ▼        ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Product │ │Backend │ │Frontend│ │   QA   │
│Manager │ │Engineer│ │Engineer│ │Engineer│
└────────┘ └────────┘ └────────┘ └────────┘
```

## Quick Start

### As CEO, You Can Say:

```
"New product: task management app for remote teams"
"Add user authentication to [product]"
"There's a bug in the login page"
"Ship [product] to production"
"Status update"
```

The Orchestrator handles everything else.

## Repository Structure

```
.
├── .claude/              # Agent definitions and workflows
│   ├── orchestrator/     # Orchestrator agent
│   ├── agents/           # Specialist agents
│   ├── workflows/        # Multi-agent processes
│   └── templates/        # Reusable templates
├── products/             # Your products
├── shared/               # Cross-product code
├── infrastructure/       # IaC and Docker
├── docs/                 # Company documentation
└── notes/                # CEO briefs and decisions
```

## Agents

| Agent | Role |
|-------|------|
| **Orchestrator** | Routes work, coordinates agents |
| **Product Manager** | Creates PRDs, defines requirements |
| **Architect** | System design, technical decisions |
| **Backend Engineer** | APIs, database, server logic |
| **Frontend Engineer** | UI, user experience |
| **QA Engineer** | Testing, quality assurance |
| **DevOps Engineer** | CI/CD, deployment |
| **Technical Writer** | Documentation |
| **Support Engineer** | Bug triage, production support |

## Checkpoints

The Orchestrator pauses for your approval at:

- PRD complete
- Architecture complete
- Feature/sprint complete (PR ready)
- Pre-production deployment
- Any decision needed
- After 3 failed retries

## Development Standards

- **TDD**: Red-Green-Refactor for all code
- **No Mocks**: Real databases, real APIs in tests
- **Git Flow**: Feature branches, PRs, squash merge
- **Documentation**: Code, APIs, and user guides

## Getting Started

1. Start Claude Code in this directory
2. Claude will load as the Orchestrator
3. Tell it what you want to build
4. Review and approve at checkpoints

## Commands Reference

```bash
# Local development (per product)
cd products/[product]
npm install
npm run dev
npm test

# Database
npm run db:migrate
npm run db:studio
```

## License

Proprietary - ConnectSW
