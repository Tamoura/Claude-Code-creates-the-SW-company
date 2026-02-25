# ConnectIn

**AI-native, Arabic-first professional networking platform**

ConnectIn is a professional networking platform built for the 300M+ Arabic speakers worldwide. Unlike LinkedIn -- which bolts Arabic support onto a 2003-era English-first architecture -- ConnectIn is designed Arabic-first with AI deeply integrated into every feature, from profile optimization to intelligent matching and bilingual content generation.

## Business Context

| Dimension | Detail |
|-----------|--------|
| **Target Market** | Arab tech professionals globally + MENA-based recruiters |
| **TAM** | $65.64B global professional networking market (2025) |
| **SAM** | ~$4.5B (MENA tech professionals + global AI-native segment) |
| **Problem** | No professional networking platform is built Arabic-first |
| **Differentiation** | AI-native, Arabic-first, privacy-first, open-source |

## Architecture Overview

```mermaid
graph TD
    subgraph Client["Frontend (Port 3111)"]
        WEB["Next.js 14<br/>React 18 + Tailwind CSS<br/>RTL-first design system"]
    end

    subgraph API_CONTAINER["Backend (Port 5007)"]
        API["Fastify 4 + TypeScript<br/>RESTful API + WebSocket"]
        WORKER["BullMQ Worker<br/>Background jobs"]
    end

    subgraph Data["Data Layer"]
        PG["PostgreSQL 15+<br/>+ pgvector"]
        REDIS["Redis 7<br/>Cache + Sessions<br/>+ Job Queue"]
    end

    subgraph External["External Services"]
        CLAUDE["Claude API"]
        OAUTH["Google / GitHub OAuth"]
        EMAIL["Email (Resend)"]
        R2["Cloudflare R2"]
    end

    WEB -->|"REST + JWT"| API
    API -->|"Prisma ORM"| PG
    API -->|"ioredis"| REDIS
    API --> WORKER
    WORKER --> REDIS
    API --> CLAUDE
    API --> OAUTH
    WORKER --> EMAIL
    API --> R2

    style WEB fill:#2ECC71,color:#fff
    style API fill:#3498DB,color:#fff
    style WORKER fill:#8E44AD,color:#fff
    style PG fill:#9B59B6,color:#fff
    style REDIS fill:#E74C3C,color:#fff
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 20 | Server runtime |
| **Language** | TypeScript 5 | Type safety end-to-end |
| **Backend** | Fastify 4 | Async-first API framework |
| **Frontend** | Next.js 14 (App Router) | SSR, React Server Components |
| **Database** | PostgreSQL 15 + pgvector | Primary data store + vector search |
| **ORM** | Prisma 5 | Type-safe database access |
| **Cache** | Redis 7 | Sessions, rate limiting, job queue |
| **Job Queue** | BullMQ | Background task processing |
| **Styling** | Tailwind CSS | Utility-first CSS with RTL support |
| **i18n** | react-i18next | Arabic/English localization |
| **AI** | Claude API (Anthropic) | Profile optimization, content generation |
| **Testing** | Jest, RTL, Playwright | Unit, integration, E2E |
| **CI/CD** | GitHub Actions | Automated testing and builds |

## Getting Started

### Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org/))
- **Docker** and Docker Compose ([download](https://docs.docker.com/get-docker/))
- **Git**

### Quick Start (Docker)

The fastest way to start the full stack:

```bash
# From the repository root
cd products/connectin

# Copy environment variables
cp .env.example .env

# Start all services (API, web, PostgreSQL, Redis)
docker compose up -d

# View logs
docker compose logs -f
```

- **Frontend**: http://localhost:3111
- **Backend API**: http://localhost:5007
- **API Health**: http://localhost:5007/health

### Local Development (Recommended)

For development with hot-reloading:

```bash
cd products/connectin

# Start only infrastructure (PostgreSQL + Redis)
docker compose up -d db redis

# Install dependencies
cd apps/api && npm install && cd ../web && npm install && cd ../..

# Run database migrations
cd apps/api && npx prisma migrate dev && cd ../..

# Seed test data (optional)
cd apps/api && npx tsx scripts/seed.ts && cd ../..

# Start both API and web with hot-reload
npm run dev
```

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both API and web servers (hot-reload) |
| `npm run dev:api` | Start API server only |
| `npm run dev:web` | Start web frontend only |
| `npm test` | Run all tests |
| `npm run test:api` | Run API tests |
| `npm run test:web` | Run web tests |
| `npm run build` | Build both applications |
| `npm run lint` | Lint both applications |
| `npm run typecheck` | Type-check both applications |
| `npm run docker:up` | Start full stack via Docker |
| `npm run docker:down` | Stop Docker services |
| `npm run docker:infra` | Start only PostgreSQL + Redis |
| `npm run docker:logs` | Follow Docker logs |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:seed` | Seed test data |

## Port Assignments

| Service | Port | URL |
|---------|------|-----|
| Frontend (Next.js) | 3111 | http://localhost:3111 |
| Backend (Fastify) | 5007 | http://localhost:5007 |
| PostgreSQL | 5433 (host) / 5432 (container) | `postgresql://postgres:postgres@localhost:5433/connectin_dev` |
| Redis | 6380 (host) / 6379 (container) | `redis://localhost:6380` |

> **Note**: Docker maps PostgreSQL to host port 5433 and Redis to 6380 to avoid conflicts with other ConnectSW products. For local development without Docker, the standard ports 5432 and 6379 are used.

## Environment Variables

See [`.env.example`](.env.example) for all available configuration. Key variables:

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `PORT` / `API_PORT` | No | `5007` | API server port |
| `CORS_ORIGIN` | No | `http://localhost:3111` | Allowed CORS origin |
| `NEXT_PUBLIC_API_URL` | Yes | - | API URL for the frontend |

## Feature Availability

### Backend (All Phases 1-3 Complete — 557 API Tests)

| Phase | Feature | Status |
|-------|---------|:------:|
| 1 | Reactions System (6 types) | DONE |
| 1 | Hashtags & @Mentions | DONE |
| 1 | Shares/Reposts | DONE |
| 1 | Profile Strength Meter | DONE |
| 1 | Block/Report Users | DONE |
| 1 | Cover/Banner Image | DONE |
| 1 | Endorsement System | DONE |
| 1 | Open-to-Work Badge | DONE |
| 1 | Follow (Non-Connection) | DONE |
| 1 | Image/Video Uploads | DONE |
| 2 | People You May Know (AI) | DONE |
| 2 | AI Job Match Score | DONE |
| 2 | Who Viewed Your Profile | DONE |
| 2 | Saves/Bookmarks | DONE |
| 2 | Polls | DONE |
| 2 | Content Analytics | DONE |
| 2 | Easy Apply (1-Click) | DONE |
| 2 | Custom URL / Vanity Slug | DONE |
| 2 | Mutual Connections | DONE |
| 2 | Connection Degrees | DONE |
| 3 | Company/Organization Pages | DONE |
| 3 | Recommendations (Testimonials) | DONE |
| 3 | Certifications/Licenses | DONE |
| 3 | Resume AI Optimizer | DONE |
| 3 | Job Alerts | DONE |
| 3 | Salary Insights | DONE |
| 3 | Group Messaging | DONE |
| 3 | File Sharing in Messages | DONE |
| 3 | Advanced Search | DONE |
| 3 | AI Integration (Claude API) | DONE |

### Frontend (636 Web Tests)

| Feature | Status | Notes |
|---------|:------:|-------|
| Auth (login, register, OAuth) | DONE | |
| Feed (posts, comments) | DONE | |
| Profile (CRUD, experience, education) | DONE | |
| Jobs (search, apply) | DONE | |
| Messaging (1:1 real-time) | DONE | |
| Notifications | DONE | |
| Search | DONE | |
| Saves/Bookmarks | DONE | PR #313 |
| Custom URL/Slug | DONE | PR #313 |
| Easy Apply | DONE | PR #313 |
| Who Viewed Profile | DONE | PR #313 |
| Reactions UI | In Progress | branch: feature/connectin/phase1-frontend |
| Follow Button | In Progress | branch: feature/connectin/phase1-frontend |
| Block/Report UI | In Progress | branch: feature/connectin/phase1-frontend |
| Endorsement UI | In Progress | branch: feature/connectin/phase1-frontend |

## API Endpoints

All routes are versioned under `/api/v1/`. Key modules:

| Module | Base Path | Description |
|--------|-----------|-------------|
| Health | `/health` | Service health check |
| Auth | `/api/v1/auth/*` | Registration, login, OAuth, email verification |
| Profile | `/api/v1/profiles/*` | Profile CRUD, experience, education, skills, slug |
| Connection | `/api/v1/connections/*` | Connection request lifecycle |
| Feed | `/api/v1/feed/*` | Posts, reactions, comments, reposts, hashtags |
| Jobs | `/api/v1/jobs/*` | Job posting, search, applications, easy apply, alerts |
| Messaging | `/api/v1/conversations/*` | Real-time 1:1 and group messaging |
| Search | `/api/v1/search/*`, `/api/v1/search/advanced/*` | Full-text + boolean search (people, posts, jobs) |
| AI | `/api/v1/ai/*` | Profile optimization, job matching |
| Social | `/api/v1/follows/*`, `/api/v1/blocks/*`, `/api/v1/endorsements/*` | Follow, block, endorse |
| Bookmarks | `/api/v1/bookmarks/*` | Save/unsave posts and jobs |
| Organizations | `/api/v1/organizations/*` | Company pages |
| Groups | `/api/v1/groups/*` | Group communities |
| Events | `/api/v1/events/*` | Professional events |
| Articles | `/api/v1/articles/*` | Long-form content |
| Recommendations | `/api/v1/recommendations/*` | Professional testimonials |
| Certifications | `/api/v1/certifications/*` | Credentials and licenses |
| Salary | `/api/v1/salary-insights/*` | Salary benchmarking |
| Polls | `/api/v1/polls/*` | Post polls |

See [docs/API.md](docs/API.md) for full API documentation.

## Project Structure

```
products/connectin/
├── apps/
│   ├── api/                    # Fastify backend
│   │   ├── src/                # Source code
│   │   ├── tests/              # API tests (Jest)
│   │   ├── prisma/             # Database schema & migrations
│   │   ├── Dockerfile          # Multi-stage production build
│   │   └── package.json
│   └── web/                    # Next.js frontend
│       ├── src/                # Source code
│       ├── tests/              # Frontend tests (RTL)
│       ├── Dockerfile          # Multi-stage production build
│       └── package.json
├── e2e/                        # Playwright E2E tests
├── packages/                   # Shared product code
├── docs/                       # Documentation
│   ├── PRD.md                  # Product requirements
│   ├── API.md                  # API documentation
│   ├── architecture.md         # System architecture
│   ├── ADRs/                   # Architecture Decision Records
│   ├── security/               # Security architecture
│   ├── design/                 # Design system specs
│   └── specs/                  # Feature specifications
├── docker-compose.yml          # Local development stack
├── .env.example                # Environment variable template
├── package.json                # Monorepo root with workspace scripts
└── README.md                   # This file
```

## Documentation

| Document | Description |
|----------|-------------|
| [PRD](docs/PRD.md) | Product requirements, user stories, acceptance criteria |
| [Architecture](docs/architecture.md) | C4 diagrams, database schema, API design |
| [API](docs/API.md) | Full API reference with examples |
| [Security](docs/security/SECURITY-ARCHITECTURE.md) | Authentication, authorization, data protection |
| [Design System](docs/design/DESIGN-SYSTEM.md) | RTL-first component specifications |
| [ADR-001](docs/ADRs/ADR-001-tech-stack.md) | Tech stack decision |
| [ADR-002](docs/ADRs/ADR-002-arabic-first-architecture.md) | Arabic-first architecture |
| [ADR-003](docs/ADRs/ADR-003-ai-integration.md) | AI integration approach |

## CI/CD Pipeline

```mermaid
flowchart LR
    PUSH[Push / PR] --> LINT[Lint &<br/>Type Check]
    LINT --> TEST_API[API Tests<br/>+ PostgreSQL<br/>+ Redis]
    LINT --> TEST_WEB[Web Tests]
    TEST_API --> BUILD[Docker Build]
    TEST_WEB --> BUILD
    BUILD --> GATE{Quality<br/>Gate}
    GATE -->|Pass| DEPLOY[Deploy]
    GATE -->|Fail| BLOCK[Block Merge]

    style GATE fill:#F39C12,color:#fff
    style BLOCK fill:#E74C3C,color:#fff
    style DEPLOY fill:#2ECC71,color:#fff
```

The CI pipeline runs on every push and pull request that touches `products/connectin/`:

1. **Lint & Type Check** -- ESLint + TypeScript compiler for both API and web
2. **API Tests** -- Jest with real PostgreSQL and Redis services
3. **Web Tests** -- Jest with React Testing Library
4. **Security Audit** -- `npm audit` for critical vulnerabilities (advisory)
5. **Docker Build** -- Verifies both Dockerfiles build successfully
6. **Quality Gate** -- All core jobs must pass before merge

## License

Proprietary -- ConnectSW. All rights reserved.
