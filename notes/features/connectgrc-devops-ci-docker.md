# ConnectGRC DevOps - CI/CD & Docker Setup

## Task: DEVOPS-01
**Branch**: foundation/connectgrc
**Ports**: Frontend 3110, Backend 5006

## What Was Built

1. **GitHub Actions CI Workflow** (`.github/workflows/connectgrc-ci.yml`)
   - Triggers on PR and push to main when `products/connectgrc/**` changes
   - 4 parallel jobs: test-api, test-web, lint, security
   - Quality gate final job
   - PostgreSQL 15 service container for API tests

2. **API Dockerfile** (`products/connectgrc/apps/api/Dockerfile`)
   - 3-stage multi-stage build (deps -> build -> production)
   - Alpine, dumb-init, non-root user (nodejs:1001)
   - Health check on /health, port 5006

3. **Web Dockerfile** (`products/connectgrc/apps/web/Dockerfile`)
   - 3-stage multi-stage build (deps -> build -> production)
   - Next.js standalone output
   - dumb-init, non-root user, port 3110

4. **Docker Compose** (`products/connectgrc/docker-compose.yml`)
   - PostgreSQL 15 Alpine with health check + volume
   - Redis 7 Alpine with health check + volume
   - API service (depends on postgres, auto-migrate)
   - Web service (depends on api)
   - Required-secret validation for credentials
   - Localhost-only port binding for databases

5. **Environment Files**
   - `products/connectgrc/apps/api/.env.example` - All backend env vars
   - `products/connectgrc/apps/web/.env.example` - All frontend env vars

## Reference Sources
- CI workflow adapted from: `.github/workflows/test-stablecoin-gateway.yml` and `muaththir-ci.yml`
- API Dockerfile adapted from: `products/muaththir/apps/api/Dockerfile`
- Web Dockerfile adapted from: `products/muaththir/apps/web/Dockerfile`
- Docker Compose adapted from: `products/stablecoin-gateway/docker-compose.yml`
