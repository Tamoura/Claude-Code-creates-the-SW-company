# Mu'aththir (muaththir)

**Holistic child development platform for intentional parents.**

Mu'aththir means "influential" or "impactful" in Arabic. The platform helps parents track and nurture their children (ages 3-16) across six interconnected dimensions, treating every child as a complete human being rather than reducing them to a single metric.

## The Six Dimensions

| Dimension | Color | What It Tracks |
|-----------|-------|----------------|
| Academic | Blue #3B82F6 | School performance, learning goals, study habits |
| Social-Emotional | Pink #EC4899 | Emotional intelligence, friendships, empathy |
| Behavioural | Amber #F59E0B | Conduct, habits, discipline, responsibility |
| Aspirational | Purple #8B5CF6 | Goals, ambitions, career interests, passions |
| Islamic | Emerald #10B981 | Quran progress, prayer, Islamic knowledge, character |
| Physical | Red #EF4444 | Health, fitness, nutrition, sleep, motor skills |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm 9+

### Setup

```bash
# 1. Create the database
createdb muaththir_dev

# 2. Set up the API
cd apps/api
cp .env.example .env       # Edit .env with your values
npm install
npx prisma migrate dev     # Run migrations
npm run db:seed             # Seed initial data

# 3. Set up the web app
cd ../web
npm install
```

### Running with Docker

```bash
cp apps/api/.env.example apps/api/.env
docker-compose up -d
```

This starts PostgreSQL (port 5435), the API (port 5005), and the web app (port 3108).

## Development Commands

### API (Fastify backend)

```bash
cd apps/api

npm run dev              # Start dev server with hot reload (port 5005)
npm run build            # Compile TypeScript
npm run start            # Start production build
npm test                 # Run tests
npm run test:coverage    # Run tests with coverage report

# Database
npm run db:migrate       # Create and apply migrations
npm run db:deploy        # Apply pending migrations (production)
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed the database
```

### Web (Next.js frontend)

```bash
cd apps/web

npm run dev              # Start dev server (port 3108)
npm run build            # Create production build
npm run start            # Serve production build (port 3108)
npm run lint             # Run ESLint
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### E2E Tests

```bash
cd e2e
npx playwright test      # Run end-to-end tests
```

## Port Assignments

| Service | Port | Notes |
|---------|------|-------|
| Web (Next.js) | 3108 | Frontend dev and production |
| API (Fastify) | 5005 | Backend REST API |
| PostgreSQL | 5432 | Default local port |
| PostgreSQL (Docker) | 5435 | Host-mapped port to avoid conflicts |

## Database

- **Engine**: PostgreSQL 15+
- **ORM**: Prisma 6.x
- **Dev database**: `muaththir_dev`
- **Connection string**: `postgresql://postgres@localhost:5432/muaththir_dev`
- **Schema**: `apps/api/prisma/schema.prisma`
- **Migrations**: `apps/api/prisma/migrations/`

See `docs/db-schema.sql` for the full SQL schema reference.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5+ |
| Backend | Fastify 5.x |
| Frontend | Next.js 14, React 18 |
| Database | PostgreSQL 15+, Prisma 6.x |
| Styling | Tailwind CSS 3 |
| Components | shadcn/ui (Radix UI) |
| Charting | Recharts 2.x |
| Validation | Zod 3.x |
| Auth | JWT (HS256) + bcrypt + HttpOnly refresh cookies |
| Image Processing | sharp |
| Testing | Jest 29, React Testing Library, Playwright |

## Architecture Overview

Mu'aththir is a monolith web application with clean module separation:

```
Browser --> Next.js Frontend (3108) --> Fastify API (5005) --> PostgreSQL
```

- **Public pages** (landing, auth) are server-side rendered
- **Dashboard** is a client-side SPA with a radar chart, observation forms, timeline, and milestone checklists
- **API** follows a modular plugin architecture with resource ownership enforcement
- **Auth** uses short-lived JWT access tokens (1h) with rotating HttpOnly refresh cookies (7d)
- **Errors** follow the RFC 7807 Problem Details format

For full architecture details, see [docs/architecture.md](docs/architecture.md).

## Project Structure

```
products/muaththir/
|-- apps/
|   |-- api/                    # Fastify 5.x backend
|   |   |-- prisma/
|   |   |   |-- schema.prisma   # Database schema
|   |   |   |-- migrations/     # Migration history
|   |   |   +-- seed.ts         # Seed script
|   |   |-- src/
|   |   |   |-- lib/            # Shared utilities (errors, types)
|   |   |   |-- plugins/        # Fastify plugins (prisma, auth, observability)
|   |   |   |-- routes/         # Route handlers (auth, health, ...)
|   |   |   |-- utils/          # Helpers (crypto, logger)
|   |   |   |-- app.ts          # App factory (plugins + routes)
|   |   |   +-- server.ts       # Entry point
|   |   +-- tests/              # API test suites
|   +-- web/                    # Next.js 14 frontend
|       |-- src/
|       +-- tests/
|-- docs/
|   |-- PRD.md                  # Product Requirements Document
|   |-- architecture.md         # System architecture
|   |-- api-schema.yml          # OpenAPI specification
|   |-- db-schema.sql           # SQL schema reference
|   +-- ADRs/                   # Architecture Decision Records
|-- e2e/                        # Playwright end-to-end tests
+-- docker-compose.yml          # Full-stack Docker setup
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/PRD.md](docs/PRD.md) | Product requirements, personas, success metrics |
| [docs/architecture.md](docs/architecture.md) | System design, data flows, security model |
| [docs/API.md](docs/API.md) | REST API endpoint reference |
| [docs/api-schema.yml](docs/api-schema.yml) | OpenAPI 3.x specification |
| [docs/db-schema.sql](docs/db-schema.sql) | Database schema (SQL) |
| [docs/ADRs/](docs/ADRs/) | Architecture Decision Records |
