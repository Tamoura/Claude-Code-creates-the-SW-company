# Pulse - AI-Powered Developer Intelligence Platform

Pulse gives engineering leaders real-time visibility into team health, code quality trends, deployment velocity, and sprint risks. It connects to GitHub repositories and transforms raw development activity into actionable insights delivered through a web dashboard, real-time activity feeds, and mobile push notifications.

## Architecture Overview

```
Browser (Next.js :3106) --> Fastify API (:5003) --> PostgreSQL (:5432)
                                |                        |
                        +-------+-------+           Redis (:6379)
                        |       |       |
                     GitHub   WebSocket  Push Notifications
                      API     Broadcast  (APNs / FCM)

Mobile App (Expo :8081) --> Fastify API (:5003) --> WebSocket
```

**Backend**: Monolithic Fastify app with module-based organization (TypeScript)
**Frontend**: Next.js 14 with React 18, Tailwind CSS, Recharts for data visualization
**Mobile**: React Native (Expo) for iOS and Android
**Database**: PostgreSQL 15+ with Prisma ORM
**Real-time**: `@fastify/websocket` with room-based pub/sub via Redis
**Auth**: JWT (1hr access tokens) + bcrypt + GitHub OAuth

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- A GitHub OAuth App (for GitHub integration features)

## Quick Start

### 1. Clone and install dependencies

```bash
cd products/pulse
npm install
cd apps/api && npm install
cd ../web && npm install
cd ../..
```

### 2. Set up the database

```bash
createdb pulse_dev
```

### 3. Configure environment variables

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` and fill in the required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `postgresql://postgres@localhost:5432/pulse_dev` |
| `REDIS_URL` | Yes | `redis://localhost:6379` |
| `JWT_SECRET` | Yes | 256-bit secret for JWT signing |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret |
| `GITHUB_WEBHOOK_SECRET` | Yes | Secret for webhook HMAC verification |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for AES-256-GCM token encryption |
| `FRONTEND_URL` | Yes | `http://localhost:3106` |
| `PORT` | No | API port (default: 5003) |
| `NODE_ENV` | No | `development` or `production` |
| `LOG_LEVEL` | No | Logging level (default: `info`) |

### 4. Generate Prisma client and run migrations

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
```

### 5. Seed test data (optional)

```bash
cd apps/api
npm run db:seed
```

### 6. Start the development servers

From the product root (`products/pulse/`):

```bash
# Start both API and web simultaneously
npm run dev

# Or start them separately:
npm run dev:api   # Backend on port 5003
npm run dev:web   # Frontend on port 3106
```

For mobile development:

```bash
cd apps/mobile
npx expo start    # Starts on port 8081
```

## Project Structure

```
products/pulse/
  apps/
    api/                    # Fastify backend (port 5003)
      src/
        app.ts              # App factory
        server.ts           # Server entry point
        plugins/            # Fastify plugins (prisma, redis, auth, websocket)
        modules/
          auth/             # Registration, login, JWT, GitHub OAuth
          repos/            # Repository CRUD, ingestion, webhooks
          activity/         # Activity feed (REST + WebSocket)
          metrics/          # Velocity and quality metrics
          risk/             # AI sprint risk scoring
          webhooks/         # GitHub webhook receiver
          health/           # Health check
        jobs/               # Background job scheduler
        utils/              # Crypto, logger, errors, pagination
        lib/                # Shared error classes
      prisma/
        schema.prisma       # Database schema (15 tables)
        migrations/         # Database migrations
      tests/                # Jest test suites
    web/                    # Next.js frontend (port 3106)
      src/
        app/                # App Router pages
        components/         # React components (charts, dashboard, UI)
        hooks/              # Custom hooks (useAuth, useWebSocket, etc.)
        lib/                # API client, token manager, WebSocket client
    mobile/                 # React Native / Expo app (port 8081)
  docs/
    PRD.md                  # Product Requirements Document
    architecture.md         # System architecture
    api-schema.yml          # OpenAPI 3.0 specification
    db-schema.sql           # Database DDL
    ADRs/                   # Architecture Decision Records
    security/               # Threat model, security review
  e2e/                      # Playwright end-to-end tests
```

## Available Scripts

### Product root (`products/pulse/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API and web concurrently |
| `npm run dev:api` | Start API server only |
| `npm run dev:web` | Start web frontend only |
| `npm test` | Run all tests (API + web) |
| `npm run test:api` | Run API tests only |
| `npm run test:web` | Run web tests only |
| `npm run test:e2e` | Run Playwright E2E tests |

### API (`products/pulse/apps/api/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm test` | Run Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:seed` | Seed test data |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type check without emitting |

## Ports

| Service | Port | URL |
|---------|------|-----|
| Backend API | 5003 | http://localhost:5003 |
| Frontend Web | 3106 | http://localhost:3106 |
| Mobile (Expo) | 8081 | http://localhost:8081 |
| PostgreSQL | 5432 | (shared instance) |
| Redis | 6379 | (shared instance) |

## API Endpoints

All REST endpoints are prefixed with `/api/v1/`. See [docs/API.md](docs/API.md) for full documentation with request/response examples.

| Module | Prefix | Endpoints |
|--------|--------|-----------|
| Health | `/` | `GET /health` |
| Auth | `/api/v1/auth` | register, login, GitHub OAuth, callback |
| Repos | `/api/v1/repos` | list, available, connect, disconnect, sync status |
| Activity | `/api/v1/activity` | REST feed + WebSocket stream |
| Metrics | `/api/v1/metrics` | velocity, coverage, summary, aggregation |
| Risk | `/api/v1/risk` | current score, history |
| Webhooks | `/api/v1/webhooks` | GitHub webhook receiver |

## WebSocket

Real-time activity streaming is available at:

```
ws://localhost:5003/api/v1/activity/stream?token=<JWT>
```

See [docs/WEBSOCKET.md](docs/WEBSOCKET.md) for the full protocol specification including authentication, room subscriptions, and message types.

## Key Documents

| Document | Description |
|----------|-------------|
| [Product Requirements](docs/PRD.md) | Full PRD with user stories and acceptance criteria |
| [API Documentation](docs/API.md) | REST endpoint reference with examples |
| [WebSocket Protocol](docs/WEBSOCKET.md) | Real-time protocol specification |
| [Development Guide](docs/DEVELOPMENT.md) | Local setup, testing, and contribution guide |
| [Architecture](docs/architecture.md) | System design with diagrams |
| [OpenAPI Spec](docs/api-schema.yml) | Machine-readable API specification |
| [ADRs](docs/ADRs/) | Architecture Decision Records |
| [Security](docs/security/) | Threat model and security review |

## Architecture Decision Records

| ADR | Decision |
|-----|----------|
| [ADR-001](docs/ADRs/ADR-001-websocket-library.md) | `@fastify/websocket` for real-time (native WebSocket) |
| [ADR-002](docs/ADRs/ADR-002-github-data-ingestion.md) | Webhooks + polling hybrid for GitHub data |
| [ADR-003](docs/ADRs/ADR-003-sprint-risk-scoring.md) | Rule-based weighted scoring for sprint risk |
| [ADR-004](docs/ADRs/ADR-004-chart-library.md) | Recharts for dashboard charts |
| [ADR-005](docs/ADRs/ADR-005-realtime-caching-strategy.md) | Single Redis for cache + pub/sub + rate limiting |

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5+ |
| Backend | Fastify 4.x |
| Frontend | Next.js 14 + React 18 |
| Mobile | React Native (Expo) |
| Database | PostgreSQL 15+ |
| ORM | Prisma 5.x |
| Cache / Pub-Sub | Redis 7.x |
| Real-time | @fastify/websocket |
| Charts | Recharts |
| Auth | JWT + bcrypt + GitHub OAuth |
| Validation | Zod |
| Testing | Jest, React Testing Library, Playwright |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
