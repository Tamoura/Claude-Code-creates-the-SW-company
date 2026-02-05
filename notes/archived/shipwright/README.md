# Shipwright

AI-powered orchestrator that coordinates specialist agents to build complete software products from natural language descriptions.

## Architecture

```
products/shipwright/
  apps/
    api/    # Fastify backend (port 5007)
    web/    # Vite + React SPA (port 3111)
```

**Backend**: Fastify API with SSE streaming, orchestrating 5 specialist agents (PM, Architect, Backend, Frontend, QA) via OpenRouter.

**Frontend**: React SPA with three-panel layout - pipeline sidebar, chat panel, and file viewer with ZIP export.

## Quick Start

```bash
# Install dependencies
cd apps/api && npm install
cd apps/web && npm install
cd ../.. && npm install

# Set up environment
cp .env.example .env
# Edit .env and add your OPEN_ROUTER_API_KEY

# Run both services
npm run dev
```

- Frontend: http://localhost:3111
- Backend: http://localhost:5007

## Development

```bash
# Run tests
npm test

# Run API tests only
npm run test:api

# Run web tests only
npm run test:web
```

## How It Works

1. User enters a prompt (e.g., "Build a todo app with React")
2. Orchestrator breaks it into tasks and assigns to specialist agents
3. Agents execute sequentially: PM → Architect → Backend → Frontend → QA
4. Each agent's output streams via SSE to the chat panel
5. Generated code files appear in the file viewer
6. Download the complete project as a ZIP

## Tech Stack

- **Backend**: Fastify, Vercel AI SDK, OpenRouter
- **Frontend**: React, Tailwind CSS, Vite
- **Testing**: Vitest (86 tests)
