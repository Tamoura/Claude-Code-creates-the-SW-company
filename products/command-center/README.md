# ConnectSW Command Center

Company management dashboard for monitoring products, agents, components, and activity.

## Quick Start

```bash
# Install dependencies
cd apps/api && npm install
cd ../web && npm install
cd ../..

# Start development
npm run dev
```

- API: http://localhost:5009
- Web: http://localhost:3113

## Features

- **Executive Overview** — Product count, phases, health, recent activity
- **Products** — All products with status, ports, CI, docs
- **Agent Hub** — 16 agents with capabilities and performance metrics
- **Component Library** — 8 shared packages, 60+ components
- **Activity Feed** — Audit trail, git commits, task completions
- **Infrastructure** — Port map, Docker services, CI/CD pipelines

## Architecture

- **Backend**: Fastify — reads filesystem data (no database needed)
- **Frontend**: React + Vite + Tailwind CSS — uses `@connectsw/ui`
- **Data sources**: `.claude/`, `products/`, `.specify/`, `.github/`, git
