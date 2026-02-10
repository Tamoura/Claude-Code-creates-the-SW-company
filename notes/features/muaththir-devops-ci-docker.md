# Mu'aththir DEVOPS-01: CI/CD Pipeline & Docker Config

## Task
Setup CI/CD pipeline and Docker configuration for the Mu'aththir product.

## Branch
`feature/muaththir/inception`

## Deliverables

### 1. `.github/workflows/muaththir-ci.yml`
- 5 parallel jobs: test-backend, test-frontend, lint, security, quality-gate
- PostgreSQL 15 service container for backend tests (db: muaththir_test)
- Node.js 20 with npm caching
- Quality gate aggregates all job results

### 2. `products/muaththir/docker-compose.yml`
- PostgreSQL 15 Alpine on port 5435 (host) to avoid conflicts with other products
- API on port 5005, Web on port 3108
- Health checks on all services
- Named volume for DB persistence

### 3. `products/muaththir/apps/api/Dockerfile`
- Multi-stage: builder (npm ci, prisma generate, tsc build) + runner (Alpine, dumb-init, non-root UID 1001)
- Uploads directory for child photos
- Health check on /health, exposes 5005

### 4. `products/muaththir/apps/web/Dockerfile`
- 3-stage: deps + builder + runner (Next.js standalone output)
- Alpine base, dumb-init, non-root UID 1001
- Exposes 3108

### 5. `products/muaththir/apps/api/.env.example`
- All env vars with safe defaults
- No real secrets
- Covers: DB, JWT, CORS, email, Stripe, rate limiting, logging

## Patterns Reused
- CI workflow structure from `invoiceforge-ci.yml` (parallel jobs, quality gate)
- Dockerfile from `stablecoin-gateway/apps/api/Dockerfile` (multi-stage, dumb-init, non-root)
- Docker Compose from `stablecoin-gateway/docker-compose.yml` (health checks, volumes)

## Port Assignments (from PORT-REGISTRY.md)
- Frontend: 3108
- Backend: 5005
- Docker PostgreSQL host port: 5435 (avoids clash with other products)

## Decisions
- Docker Compose postgres mapped to 5435 externally to avoid conflicts with system PG on 5432
- Web Dockerfile uses Next.js standalone output mode (requires `output: 'standalone'` in next.config)
- No Redis in docker-compose (architecture doc confirms no Redis for MVP)
