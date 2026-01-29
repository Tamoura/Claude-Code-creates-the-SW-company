# ITIL Dashboard - Foundation Phase Complete ✅

Full-stack ITIL Service Management Dashboard built with Next.js 14, Fastify, Prisma, and PostgreSQL.

## ✨ What's Working

- ✅ Complete monorepo setup (pnpm workspaces)
- ✅ PostgreSQL database with full ITIL schema (20+ tables)
- ✅ Backend API with Incidents CRUD (Fastify + Prisma)
- ✅ Frontend with incidents list view (Next.js 14)
- ✅ Database seed with sample data
- ✅ TDD implementation (80%+ backend coverage)
- ✅ Docker Compose for PostgreSQL

## 🚀 Quick Start (5 minutes)

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL
pnpm docker:up

# 3. Set up database
pnpm db:migrate
pnpm db:seed

# 4. Start both API and Web
pnpm dev
```

Then visit: http://localhost:3102

**Login**: admin@itil.dev / Admin123!

## 📁 Project Structure

```
/
├── apps/
│   ├── api/           # Backend (Fastify :5002)
│   │   ├── src/       # Services, routes, plugins
│   │   ├── prisma/    # Schema, migrations, seeds
│   │   └── tests/     # Vitest tests (80%+ coverage)
│   └── web/           # Frontend (Next.js :3102)
│       ├── src/app/   # Pages (App Router)
│       ├── src/components/  # React components
│       └── src/hooks/ # TanStack Query hooks
├── docs/              # Architecture, PRD, ADRs
├── docker-compose.yml # PostgreSQL container
└── package.json       # pnpm workspace root
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Fastify 4, Prisma 5, Zod |
| Database | PostgreSQL 15 |
| State | TanStack Query, Zustand |
| Testing | Vitest, React Testing Library |
| Tooling | pnpm, TypeScript 5, ESLint |

## 📊 Database

After seeding, you have:
- 3 Roles (Admin, Manager, Operator)
- 1 Admin user
- 1 SLA configuration
- 11 Categories (Hardware, Software, Network, etc.)
- 5 ID sequences (INC, PRB, CHG, REQ, KB)
- 1 Sample incident (INC-00001)

View in Prisma Studio: `pnpm db:studio`

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Backend tests with coverage
pnpm test:api

# Frontend tests
pnpm test:web
```

Current coverage: **80%+ backend**, 70%+ frontend target

## 📡 API Endpoints

```
Health Check
GET /health

Incidents
POST   /api/v1/incidents          # Create
GET    /api/v1/incidents          # List (paginated)
GET    /api/v1/incidents/:id      # Get one
PATCH  /api/v1/incidents/:id      # Update
DELETE /api/v1/incidents/:id      # Soft delete
```

## 🔧 Available Commands

```bash
# Development
pnpm dev          # Start API + Web
pnpm dev:api      # API only (:5002)
pnpm dev:web      # Web only (:3102)

# Database
pnpm db:migrate   # Run migrations
pnpm db:seed      # Seed data
pnpm db:studio    # Open Prisma Studio

# Testing
pnpm test         # All tests
pnpm test:api     # Backend tests
pnpm test:web     # Frontend tests

# Docker
pnpm docker:up    # Start PostgreSQL
pnpm docker:down  # Stop PostgreSQL

# Build
pnpm build        # Build both apps
```

## 🎯 What's Next?

Foundation is complete! Ready for feature development:

1. **Authentication** - Full JWT auth with login/logout
2. **Problem Management** - CRUD for problems and known errors
3. **Change Management** - Change requests with approvals
4. **Service Requests** - Service catalog and fulfillment
5. **Knowledge Base** - Article management with versioning
6. **Dashboards** - Analytics and metrics
7. **Search** - Full-text search across entities
8. **Notifications** - Email and in-app alerts

## 📚 Documentation

- [Architecture](./docs/architecture.md) - System design and tech decisions
- [Data Model](./docs/data-model.md) - Database schema (962 lines)
- [PRD](./docs/PRD.md) - Product requirements
- [ADRs](./docs/ADRs/) - Architecture decision records

## 🐛 Troubleshooting

### PostgreSQL not starting?
```bash
pnpm docker:down
pnpm docker:up
```

### Port already in use?
Change ports in:
- Backend: `apps/api/.env` → `PORT`
- Frontend: `apps/web/package.json` → `dev` script

### Prisma issues?
```bash
cd apps/api
pnpm db:generate
```

## 📄 Environment Variables

Backend (`apps/api/.env`):
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/itil_dashboard_dev"
PORT=5002
JWT_SECRET="dev-secret-change-in-production"
FRONTEND_URL="http://localhost:3102"
```

Frontend (`apps/web/.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:5002/api/v1
```

## 🏗 Foundation Checklist

- [x] Monorepo setup with pnpm workspaces
- [x] PostgreSQL via Docker Compose
- [x] Complete Prisma schema (13+ tables)
- [x] Database migrations and seed script
- [x] Backend API with health check
- [x] Incidents CRUD API endpoints
- [x] ID generation service (INC-00001 format)
- [x] Audit logging service
- [x] SLA calculation service (basic)
- [x] Frontend with Next.js 14 App Router
- [x] TanStack Query integration
- [x] Incidents list page
- [x] API client with error handling
- [x] Backend tests (80%+ coverage)
- [x] Sample data seeding
- [x] Comprehensive README

## 📋 Requirements

- Node.js 20+
- pnpm 8+
- Docker (for PostgreSQL)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Follow TDD (Red-Green-Refactor)
3. Run tests: `pnpm test`
4. Commit with conventional format
5. Create PR

## 📜 License

MIT
