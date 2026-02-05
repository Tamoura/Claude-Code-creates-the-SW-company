# ConnectSW Installation Guide

Complete setup guide for the ConnectSW agentic software company repository.

## Prerequisites

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | >= 20.0.0 | `node -v` |
| pnpm | >= 8.0.0 | `pnpm -v` |
| Docker + Compose | Latest | `docker --version` |
| Git | >= 2.30 | `git --version` |
| Claude Code CLI | Latest | `claude --version` |

### Install Prerequisites (macOS)

```bash
# Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 20
nvm use 20

# pnpm
npm install -g pnpm@8.15.0

# Docker Desktop
# Download from https://www.docker.com/products/docker-desktop/
```

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Tamoura/Claude-Code-creates-the-SW-company.git
cd "Claude Code creates the SW company"

# 2. Enable git hooks (safety guards)
git config core.hooksPath .githooks

# 3. Install root dependencies
npm install --ignore-workspaces

# 4. Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# 5. Set up the active product (stablecoin-gateway)
cd products/stablecoin-gateway/apps/api
cp .env.example .env
# Edit .env with generated secrets (see below)
npx prisma generate
npx prisma migrate dev
cd ../../../..

# 6. Run
cd products/stablecoin-gateway/apps/api
npm run dev
```

---

## Detailed Setup

### 1. Clone and Configure Git

```bash
git clone https://github.com/Tamoura/Claude-Code-creates-the-SW-company.git
cd "Claude Code creates the SW company"

# IMPORTANT: Enable version-controlled git hooks
git config core.hooksPath .githooks
```

The repository includes two git hooks:

- **pre-commit** -- Blocks commits with >30 files or >5000 deleted lines (prevents accidental mass changes). Bypass with `ALLOW_LARGE_COMMIT=1` when intentional.
- **post-commit** -- Logs commit metadata to `.claude/audit-trail.jsonl` for agent observability.

### 2. Install Root Dependencies

```bash
npm install --ignore-workspaces
```

This installs the root-level tooling: `tsx` (TypeScript runner), `typescript`, `eslint`, `prettier`, and `@playwright/test`.

### 3. Start Infrastructure Services

```bash
docker compose up -d
```

This starts:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL 15 | 5432 | Primary database |
| Redis 7 | 6379 | Caching and job queues |

Verify services are running:

```bash
docker compose ps
```

### 4. Generate Secrets

Generate the required secrets for environment files:

```bash
# JWT Secret
echo "JWT_SECRET=$(openssl rand -hex 32)"

# Database Password
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"

# Webhook Encryption Key (must be 64 hex chars)
echo "WEBHOOK_ENCRYPTION_KEY=$(openssl rand -hex 32)"

# Internal API Key
echo "INTERNAL_API_KEY=$(openssl rand -hex 32)"

# API Key HMAC Secret
echo "API_KEY_HMAC_SECRET=$(openssl rand -hex 32)"
```

Save these values -- you will need them for `.env` files below.

---

## Product Setup

### Stablecoin Gateway (Primary Product)

The most mature product. Backend API with blockchain payment processing.

**Ports**: API on `5001`, Web on `3104`

#### API Setup

```bash
cd products/stablecoin-gateway/apps/api
cp .env.example .env
```

Edit `.env` with your generated secrets:

```env
# Server
PORT=5001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stablecoin_gateway_dev

# Redis
REDIS_URL=redis://localhost:6379

# Auth (REQUIRED - use generated values)
JWT_SECRET=<your-generated-jwt-secret>
INTERNAL_API_KEY=<your-generated-internal-api-key>
API_KEY_HMAC_SECRET=<your-generated-hmac-secret>

# Encryption (REQUIRED - must be 64 hex chars)
WEBHOOK_ENCRYPTION_KEY=<your-generated-encryption-key>

# Frontend URL
FRONTEND_URL=http://localhost:3104

# Blockchain (optional for dev - uses mock if not set)
ALCHEMY_API_KEY=
INFURA_PROJECT_ID=

# KMS (disable for local dev)
USE_KMS=false
ALLOW_PRIVATE_KEY_FALLBACK=true
```

Create the database and run migrations:

```bash
# Create the database (if it doesn't exist)
docker exec -it $(docker compose ps -q postgres 2>/dev/null || echo "postgres") \
  psql -U postgres -c "CREATE DATABASE stablecoin_gateway_dev;" 2>/dev/null || true

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed test data
npm run db:seed
```

Start the API:

```bash
npm run dev
# API available at http://localhost:5001
# Swagger docs at http://localhost:5001/docs
```

Run tests:

```bash
# Create test database
docker exec -it $(docker compose ps -q postgres 2>/dev/null || echo "postgres") \
  psql -U postgres -c "CREATE DATABASE stablecoin_gateway_test;" 2>/dev/null || true

npm test
npm run test:coverage
```

#### Web Setup (Optional)

```bash
cd products/stablecoin-gateway/apps/web
npm install
npm run dev
# Web available at http://localhost:3104
```

---

### MeetingMind

AI meeting assistant (frontend only).

**Port**: `3106`

```bash
cd products/meetingmind/apps/web
npm install
npm run dev
# Available at http://localhost:3106
```

---

### Quantum Computing Usecases

Quantum computing educational explorer (frontend only).

**Port**: `3105`

```bash
cd products/quantum-computing-usecases/apps/web
npm install
npm run dev
# Available at http://localhost:3105
```

---

## Port Registry

All products use unique ports to run simultaneously.

| Port | Product | Type |
|------|---------|------|
| 3104 | stablecoin-gateway | Frontend |
| 3105 | quantum-computing-usecases | Frontend |
| 3106 | meetingmind | Frontend |
| 5001 | stablecoin-gateway | API |
| 5432 | PostgreSQL | Database |
| 6379 | Redis | Cache/Queue |
| 3150 | Agent Dashboard | Infrastructure |

---

## Agent Infrastructure

ConnectSW uses Claude Code agents for all development work. The agent system is located in `.claude/`.

### Directory Structure

```
.claude/
  agents/           # 14 specialist agent definitions
  commands/          # Slash commands (/orchestrator, /audit, /status, etc.)
  engine/            # Task graph executor (TypeScript)
  dashboard/         # Executive dashboard server
  memory/            # Agent learning and knowledge
  monitoring/        # Agent health checks
  orchestrator/      # Orchestrator state and config
  protocols/         # Message routing
  quality-gates/     # Build/test gate scripts
  scripts/           # Utility scripts
  audit-trail.jsonl  # Append-only activity log
```

### Using Agent Commands

These are Claude Code slash commands invoked during a session:

| Command | Purpose |
|---------|---------|
| `/orchestrator` | Route tasks to specialist agents |
| `/audit <product>` | Run comprehensive code audit with scoring |
| `/status` | Quick project status check |
| `/dashboard` | Full dashboard report |
| `/check-system` | System health verification |

### Running Infrastructure Scripts

```bash
# Verify agent infrastructure is runnable
npx tsx .claude/engine/task-graph-executor.ts products/stablecoin-gateway

# Start the dashboard server
npx tsx .claude/dashboard/dashboard-server.ts

# View audit trail
bash .claude/scripts/view-audit-trail.sh

# Backfill agent memory from git history
bash .claude/scripts/backfill-history.sh

# Generate dashboard report
bash .claude/scripts/generate-dashboard.sh
```

---

## CI/CD

### GitHub Actions Workflows

| Workflow | Trigger | What it Does |
|----------|---------|--------------|
| `test.yml` | PRs to main | Lint, security audit, coverage check (80% min) |
| `test-stablecoin-gateway.yml` | Changes to stablecoin-gateway | Full test suite with PostgreSQL, lint, typecheck, security audit |

### Running CI Checks Locally

```bash
# Lint
npm run lint

# Security audit (must pass without || true)
npm audit --audit-level=high

# Type check (per product)
cd products/stablecoin-gateway/apps/api
npx tsc --noEmit

# Quality gates
bash .claude/quality-gates/executor.sh products/stablecoin-gateway
```

---

## Common Tasks

### Create a New Feature Branch

```bash
# Verify you're on main
git branch --show-current

# Create feature branch
git checkout -b feature/<product>/<feature-name>

# After work, push and create PR
git push -u origin feature/<product>/<feature-name>
gh pr create --base main
```

### Run All Product Tests

```bash
# Stablecoin Gateway
cd products/stablecoin-gateway/apps/api && npm test

# MeetingMind
cd products/meetingmind/apps/web && npm test

# Quantum Computing
cd products/quantum-computing-usecases/apps/web && npm test
```

### Database Operations

```bash
cd products/stablecoin-gateway/apps/api

# Open visual database browser
npx prisma studio

# Create a new migration
npx prisma migrate dev --name <migration-name>

# Reset database (destructive)
npx prisma migrate reset

# View database schema
npx prisma db pull
```

### Docker Operations

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Stop services
docker compose down

# Reset volumes (destructive - deletes all data)
docker compose down -v
```

---

## Troubleshooting

### `tsx: command not found`

```bash
# Install at root level
npm install --ignore-workspaces
# Or run via npx
npx tsx <file>
```

### Pre-commit hook blocks commit

The hook blocks commits with >30 files. If this is intentional (e.g., a merge):

```bash
ALLOW_LARGE_COMMIT=1 git commit -m "your message"
```

### Database connection refused

```bash
# Check Docker is running
docker compose ps

# Restart services
docker compose down && docker compose up -d

# Verify PostgreSQL is accepting connections
docker exec -it $(docker compose ps -q postgres) pg_isready
```

### Prisma migration issues

```bash
# Reset and re-run all migrations
npx prisma migrate reset

# If schema is out of sync
npx prisma generate
npx prisma db push
```

### Port already in use

```bash
# Find what's using a port
lsof -i :<port>

# Kill the process
kill -9 <pid>
```

### Redis connection refused

```bash
# Check Redis is running
docker compose ps

# Test Redis connection
docker exec -it $(docker compose ps -q redis) redis-cli ping
# Should respond: PONG
```

---

## Git Safety Rules

These rules are enforced by hooks and CI. Follow them to avoid issues:

1. **Never use `git add .` or `git add -A`** -- Always stage specific files by name
2. **Verify staged files before every commit** -- Run `git diff --cached --stat`
3. **Verify after every commit** -- Run `git show --stat`
4. **Always create branches from `main`** -- Verify with `git branch --show-current` before branching
5. **Never commit `.env` files or secrets** -- Already in `.gitignore`
6. **Conventional commit format** -- `type(scope): subject` (e.g., `feat(auth): add login endpoint`)
