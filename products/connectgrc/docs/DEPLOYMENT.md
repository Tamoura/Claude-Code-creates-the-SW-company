# ConnectGRC -- Deployment Guide

This document covers local development setup with Docker, environment configuration, and production deployment.

## Table of Contents

- [Local Development with Docker](#local-development-with-docker)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Full-Stack Docker Deployment](#full-stack-docker-deployment)
- [Production Checklist](#production-checklist)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Troubleshooting](#troubleshooting)

---

## Local Development with Docker

### Prerequisites

- Node.js 20+
- Docker Desktop (or Docker Engine + Docker Compose)
- Git

### Architecture

```mermaid
graph LR
    subgraph "Docker Compose"
        PG["PostgreSQL 15<br/>:5433 -> :5432"]
        REDIS["Redis 7<br/>:6380 -> :6379"]
    end

    subgraph "Local (npm run dev)"
        API["Fastify API<br/>:5006"]
        WEB["Next.js<br/>:3110"]
    end

    WEB -->|"REST"| API
    API -->|"Prisma"| PG
    API -->|"ioredis"| REDIS

    classDef docker fill:#0db7ed,color:#fff
    classDef local fill:#51cf66,color:#fff

    class PG,REDIS docker
    class API,WEB local
```

### Step-by-Step Setup

```bash
# 1. Navigate to the product directory
cd products/connectgrc

# 2. Start database services
# POSTGRES_PASSWORD is required by docker-compose
POSTGRES_PASSWORD=devpassword docker compose up -d postgres redis

# 3. Verify services are running
docker compose ps
# Expected: connectgrc-postgres (healthy), connectgrc-redis (healthy)

# 4. Configure API environment
cp apps/api/.env.example apps/api/.env

# Edit apps/api/.env -- set at minimum:
#   DATABASE_URL=postgresql://postgres:devpassword@localhost:5433/connectgrc_dev
#   JWT_SECRET=<generate with: openssl rand -hex 32>

# 5. Configure Web environment
cp apps/web/.env.example apps/web/.env.local

# 6. Install dependencies
cd apps/api && npm install && cd ../..
cd apps/web && npm install && cd ../..

# 7. Run database migrations
cd apps/api && npx prisma migrate dev && cd ../..

# 8. Seed test data
cd apps/api && npx prisma db seed && cd ../..

# 9. Start API server (Terminal 1)
cd apps/api && npm run dev

# 10. Start Web server (Terminal 2)
cd apps/web && npm run dev
```

### Verify Everything Works

```bash
# Health check
curl http://localhost:5006/api/v1/health
# Expected: {"status":"ok","version":"0.1.0","uptime":...,"database":"connected"}

# Login with test user
curl -X POST http://localhost:5006/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Test123!@#"}'
# Expected: {"accessToken":"...","refreshToken":"...","user":{...}}

# Open web app
open http://localhost:3110
```

### Docker Commands Reference

```bash
# Start services
POSTGRES_PASSWORD=devpassword docker compose up -d postgres redis

# Stop services (preserves data)
docker compose stop

# Stop and remove containers (preserves volumes)
docker compose down

# Stop and remove everything including data volumes
docker compose down -v

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Connect to PostgreSQL
docker exec -it connectgrc-postgres psql -U postgres -d connectgrc_dev

# Connect to Redis
docker exec -it connectgrc-redis redis-cli -a devpassword
```

---

## Environment Variables

### API Server (`apps/api/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string |
| `JWT_SECRET` | Yes | -- | JWT signing key (min 32 chars). Generate: `openssl rand -hex 32` |
| `PORT` | No | `5006` | API server port |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |
| `ALLOWED_ORIGINS` | No | `http://localhost:3110` | Comma-separated CORS origins |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per rate limit window |
| `RATE_LIMIT_WINDOW` | No | `60000` | Rate limit window in milliseconds |
| `REDIS_URL` | No | -- | Redis connection string (optional, graceful degradation) |
| `INTERNAL_API_KEY` | No | -- | Key for internal/metrics endpoints |

#### Future Variables (Stubbed)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | AI-powered question generation and scoring |
| `SENDGRID_API_KEY` | Email notifications |
| `EMAIL_FROM` | Sender email address |
| `LIVEKIT_API_KEY` | WebRTC voice assessment |
| `LIVEKIT_API_SECRET` | LiveKit authentication |
| `LIVEKIT_URL` | LiveKit server URL |

### Web App (`apps/web/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:5006` | Backend API base URL |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3110` | App URL (for metadata, OAuth) |
| `PORT` | No | `3110` | Dev server port |

### Docker Compose (`.env` or inline)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_USER` | No | `postgres` | Database user |
| `POSTGRES_PASSWORD` | Yes | -- | Database password |
| `POSTGRES_DB` | No | `connectgrc_dev` | Database name |
| `REDIS_PASSWORD` | No | `devpassword` | Redis password |
| `JWT_SECRET` | Yes (for API container) | -- | JWT signing key |
| `JWT_REFRESH_SECRET` | Yes (for API container) | -- | Refresh token signing key |
| `FRONTEND_URL` | No | `http://localhost:3110` | Frontend URL for CORS |
| `NODE_ENV` | No | `development` | Environment mode |

---

## Database Setup

### Connection Strings

| Environment | Connection String |
|-------------|-------------------|
| Local (Docker) | `postgresql://postgres:devpassword@localhost:5433/connectgrc_dev` |
| Local (native) | `postgresql://postgres@localhost:5432/connectgrc_dev` |
| Production | Set via `DATABASE_URL` env var |

### Migration Commands

```bash
cd apps/api

# Create and apply migrations (development)
npx prisma migrate dev

# Create migration without applying (for review)
npx prisma migrate dev --create-only

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (destroys all data)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate

# Open database GUI
npx prisma studio
```

### Schema Overview

The database has 18 models across 6 categories. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full ER diagram.

```mermaid
graph TD
    subgraph "Identity (4)"
        User --> ApiKey
        User --> Session
        AuditLog
    end

    subgraph "Auth Tokens (2)"
        EmailVerification
        PasswordReset
    end

    subgraph "Profile (2)"
        User --> Profile
        Profile --> DomainScore
    end

    subgraph "Assessment (3)"
        User --> Assessment
        Assessment --> AssessmentAnswer
        Question --> AssessmentAnswer
    end

    subgraph "Career (2)"
        User --> CareerSimulation
        LearningPath
    end

    subgraph "Jobs (2)"
        Job --> JobApplication
        User --> JobApplication
    end

    subgraph "Content (2)"
        Resource --> Bookmark
        User --> Bookmark
    end

    subgraph "Communication (1)"
        User --> Notification
    end

    classDef identity fill:#339af0,color:#fff
    classDef profile fill:#51cf66,color:#fff
    classDef assessment fill:#ff922b,color:#fff
    classDef career fill:#be4bdb,color:#fff
    classDef jobs fill:#f06595,color:#fff
    classDef content fill:#20c997,color:#fff

    class User,ApiKey,Session,AuditLog identity
    class Profile,DomainScore profile
    class Assessment,AssessmentAnswer,Question assessment
    class CareerSimulation,LearningPath career
    class Job,JobApplication jobs
    class Resource,Bookmark,Notification content
```

---

## Full-Stack Docker Deployment

To run the entire stack (API + Web + PostgreSQL + Redis) in Docker:

### Build and Run

```bash
cd products/connectgrc

# Create a .env file for docker-compose secrets
cat > .env << 'EOF'
POSTGRES_PASSWORD=<strong-password>
JWT_SECRET=<generate-with-openssl-rand-hex-32>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-hex-32>
EOF

# Build and start all services
docker compose up --build -d

# Verify all services are running
docker compose ps

# Run migrations inside the API container
docker compose exec api npx prisma migrate deploy

# Check API health
curl http://localhost:5006/api/v1/health

# Open the web app
open http://localhost:3110
```

### Service Details

| Service | Container | Internal Port | External Port | Health Check |
|---------|-----------|---------------|---------------|-------------|
| PostgreSQL | connectgrc-postgres | 5432 | 127.0.0.1:5433 | `pg_isready` every 10s |
| Redis | connectgrc-redis | 6379 | 127.0.0.1:6380 | `redis-cli ping` every 10s |
| API | connectgrc-api | 5006 | 127.0.0.1:5006 | HTTP GET /health every 30s |
| Web | connectgrc-web | 3110 | 127.0.0.1:3110 | HTTP GET / every 30s |

### Service Dependencies

```mermaid
graph TD
    WEB["connectgrc-web<br/>:3110"] --> API["connectgrc-api<br/>:5006"]
    API --> PG["connectgrc-postgres<br/>:5433"]
    API --> REDIS["connectgrc-redis<br/>:6380"]
    PG -.->|"health check"| API
    REDIS -.->|"health check"| API

    classDef service fill:#339af0,color:#fff
    class WEB,API,PG,REDIS service
```

The API container waits for PostgreSQL and Redis to be healthy before starting. On startup, it runs `prisma migrate deploy` and then starts the server.

### Docker Build Details

Both the API and Web Dockerfiles use multi-stage builds:

**API (`apps/api/Dockerfile`)**
1. `deps` stage: Install npm dependencies
2. `build` stage: Generate Prisma client, compile TypeScript
3. `production` stage: Copy only dist + node_modules + prisma, run as non-root user

**Web (`apps/web/Dockerfile`)**
1. `deps` stage: Install npm dependencies
2. `build` stage: Build Next.js (standalone output)
3. `production` stage: Copy standalone server + static assets, run as non-root user

Both use `dumb-init` for proper PID 1 signal handling and run as a non-root `nodejs` user.

---

## Production Checklist

### Before First Deploy

- [ ] **Generate strong secrets**
  ```bash
  # JWT secret (minimum 32 characters)
  openssl rand -hex 32
  # JWT refresh secret (separate from access token secret)
  openssl rand -hex 32
  # PostgreSQL password
  openssl rand -base64 24
  # Redis password
  openssl rand -base64 24
  ```

- [ ] **Set NODE_ENV=production** on the API server

- [ ] **Configure ALLOWED_ORIGINS** to the production frontend URL only

- [ ] **Run database migrations**
  ```bash
  npx prisma migrate deploy
  ```

- [ ] **Verify health endpoint**
  ```bash
  curl https://api.yourdomain.com/api/v1/health
  ```

### Security

- [ ] All secrets stored in environment variables (never in code or Docker images)
- [ ] `JWT_SECRET` is at least 32 characters of cryptographic randomness
- [ ] `POSTGRES_PASSWORD` uses a strong, unique password
- [ ] Database port (5432/5433) is not exposed to the public internet
- [ ] Redis port (6379/6380) is not exposed to the public internet
- [ ] HTTPS is enforced on all public-facing endpoints
- [ ] CORS `ALLOWED_ORIGINS` is set to production frontend URL only
- [ ] Rate limiting is configured appropriately for production traffic
- [ ] `NODE_ENV=production` hides internal error details

### Database

- [ ] Connection pooling is configured (`DATABASE_POOL_SIZE`)
- [ ] Automated backups are enabled
- [ ] Database is on a dedicated/managed instance (not Docker in production)
- [ ] Migrations are tested in staging before production

### Monitoring

- [ ] Health endpoint (`GET /api/v1/health`) is monitored by an uptime service
- [ ] Application logs are shipped to a centralized logging service
- [ ] Error tracking is configured (e.g., Sentry)
- [ ] Database connection pool metrics are monitored

### Performance

- [ ] Prisma connection pool size is tuned for expected load
- [ ] Redis is enabled for rate limiting (not in-memory fallback)
- [ ] Next.js is running in standalone mode with proper caching headers
- [ ] CDN is configured for static assets

---

## Monitoring and Health Checks

### Health Endpoint

`GET /api/v1/health` returns the API status and database connectivity.

```bash
curl http://localhost:5006/api/v1/health
```

| Response | Status Code | Meaning |
|----------|-------------|---------|
| `{"status":"ok","database":"connected"}` | 200 | Healthy |
| `{"status":"degraded","database":"disconnected"}` | 503 | Database down |

### Docker Health Checks

All services in docker-compose have health checks:

| Service | Check | Interval | Timeout | Retries |
|---------|-------|----------|---------|---------|
| PostgreSQL | `pg_isready` | 10s | 5s | 5 |
| Redis | `redis-cli ping` | 10s | 5s | 5 |
| API | HTTP GET /health | 30s | 5s | 3 |
| Web | HTTP GET / | 30s | 5s | 3 |

### Log Levels

Set via the `LOG_LEVEL` environment variable:

| Level | Use When |
|-------|----------|
| `debug` | Development, detailed debugging |
| `info` | General production use |
| `warn` | Production, fewer logs |
| `error` | Production, errors only |

---

## Troubleshooting

### Common Issues

**Database connection refused**
```bash
# Verify PostgreSQL is running
docker compose ps postgres
# Check logs
docker compose logs postgres
# Verify connection string
echo $DATABASE_URL
# Test direct connection
docker exec -it connectgrc-postgres psql -U postgres -d connectgrc_dev -c "SELECT 1"
```

**Redis connection failed (non-critical)**
Redis is optional. If not available, the API falls back to in-memory rate limiting. Check:
```bash
docker compose ps redis
docker compose logs redis
```

**Prisma migration errors**
```bash
# Reset and re-apply (destroys data)
cd apps/api && npx prisma migrate reset

# Check migration status
cd apps/api && npx prisma migrate status
```

**Port already in use**
```bash
# Find what's using the port
lsof -i :5006  # API
lsof -i :3110  # Web
lsof -i :5433  # PostgreSQL
lsof -i :6380  # Redis

# Kill the process
kill -9 <PID>
```

**Docker compose POSTGRES_PASSWORD error**
The docker-compose requires `POSTGRES_PASSWORD` to be set:
```bash
# Set it inline
POSTGRES_PASSWORD=devpassword docker compose up -d

# Or create a .env file in the product root
echo "POSTGRES_PASSWORD=devpassword" > .env
docker compose up -d
```

**CORS errors in browser**
Verify `ALLOWED_ORIGINS` in `apps/api/.env` matches the frontend URL exactly (including protocol and port):
```
ALLOWED_ORIGINS=http://localhost:3110
```
