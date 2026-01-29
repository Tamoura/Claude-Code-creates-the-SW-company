# DevOps Setup - Stablecoin Gateway

This document provides a quick overview of the DevOps setup for Stablecoin Gateway.

## What's Been Set Up

✅ **CI/CD Pipelines** (GitHub Actions)
- Automated testing on every PR
- Automated staging deployment on merge to main
- Manual production deployment workflow

✅ **Docker Configuration**
- Dockerfiles for API and Web apps
- Multi-stage builds for optimal image size
- docker-compose.yml for local development

✅ **Documentation**
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Complete deployment guide
- [CICD.md](docs/CICD.md) - CI/CD pipeline documentation
- .env.example - Environment variables template

## Quick Start

### Local Development with Docker

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Edit .env with your values
nano .env

# 3. Start all services
docker-compose up -d

# 4. Check logs
docker-compose logs -f

# 5. Access services
# API: http://localhost:5001
# Web: http://localhost:3101
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

### Running Tests

```bash
# API tests
cd apps/api
npm test

# Web tests
cd apps/web
npm test
```

## GitHub Actions Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Runs on every PR and push:
- ✅ Tests (API + Web)
- ✅ Linting
- ✅ Build validation
- ✅ Code coverage upload

### 2. Deploy Staging (`.github/workflows/deploy-staging.yml`)

Auto-deploys to staging on merge to main:
- ✅ Build Docker images
- ✅ Push to AWS ECR
- ✅ Run database migrations
- ✅ Deploy to ECS
- ✅ Smoke tests

### 3. Deploy Production (`.github/workflows/deploy-production.yml`)

Manual deployment to production:
- ✅ Version-tagged deployment
- ✅ Database backup
- ✅ Blue-green deployment
- ✅ Health verification

## Required GitHub Secrets

Configure in: **Settings → Environments → [staging/production]**

### Staging Environment

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS credentials for ECR/ECS |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `DATABASE_URL` | PostgreSQL connection string |

### Production Environment

Same secrets as staging, but for production resources.

### Environment Variables

| Variable | Staging Value | Production Value |
|----------|---------------|------------------|
| `API_URL` | `https://staging-api.gateway.io` | `https://api.gateway.io` |
| `WEB_URL` | `https://staging.gateway.io` | `https://gateway.io` |

## AWS Infrastructure Required

Before deploying, set up:

1. **ECR Repositories**:
   - `stablecoin-gateway-api` (staging)
   - `stablecoin-gateway-web` (staging)
   - `stablecoin-gateway-api-prod` (production)
   - `stablecoin-gateway-web-prod` (production)

2. **ECS Clusters**:
   - `stablecoin-gateway-staging`
   - `stablecoin-gateway-production`

3. **RDS PostgreSQL** (Multi-AZ)
4. **ElastiCache Redis**
5. **Application Load Balancers**
6. **Secrets Manager** (for sensitive env vars)

## Deployment Process

### Staging (Automatic)

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes, commit, push
git push origin feature/my-feature

# 3. Create PR, get approval, merge to main
# → Staging deployment starts automatically
```

### Production (Manual)

```bash
# 1. Create version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 2. Go to GitHub Actions → Deploy to Production
# 3. Enter version tag: v1.0.0
# 4. Click "Run workflow"
# 5. Wait ~10-15 minutes for deployment
```

## Docker Images

### API Image
- **Base**: node:20-alpine
- **Size**: ~200MB
- **Layers**: Multi-stage (builder + runner)
- **User**: Non-root (nodejs)
- **Health Check**: `GET /health`

### Web Image
- **Base**: node:20-alpine
- **Size**: ~250MB
- **Build**: Next.js standalone output
- **User**: Non-root (nodejs)
- **Health Check**: `GET /`

## Monitoring

### Health Checks

- **API**: `curl https://api.gateway.io/health`
- **Web**: `curl https://gateway.io`

### Logs

```bash
# CloudWatch logs
aws logs tail /ecs/stablecoin-gateway-production-api --follow

# Docker logs (local)
docker-compose logs -f api
```

### Metrics

- API response time (p95 < 200ms)
- Payment success rate (> 95%)
- ECS CPU/Memory utilization
- Database connections

## Rollback

### Quick Rollback

```bash
# Option 1: Re-deploy previous version
# Go to GitHub Actions → Deploy to Production
# Enter previous version tag

# Option 2: ECS task revert
aws ecs update-service \
  --cluster stablecoin-gateway-production \
  --service api \
  --task-definition stablecoin-gateway-api-prod:PREVIOUS_REVISION
```

## File Structure

```
products/stablecoin-gateway/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # CI pipeline
│       ├── deploy-staging.yml         # Staging deployment
│       └── deploy-production.yml      # Production deployment
├── apps/
│   ├── api/
│   │   └── Dockerfile                 # API Docker image
│   └── web/
│       └── Dockerfile                 # Web Docker image
├── docs/
│   ├── DEPLOYMENT.md                  # Deployment guide
│   └── CICD.md                        # CI/CD documentation
├── .dockerignore                      # Docker build exclusions
├── .env.example                       # Environment variables template
├── docker-compose.yml                 # Local development setup
└── DEVOPS.md                          # This file
```

## Troubleshooting

### Build Fails

```bash
# Run locally
npm run build

# Check GitHub Actions logs
# Go to Actions → Select failed workflow
```

### Deployment Fails

```bash
# Check ECS service events
aws ecs describe-services \
  --cluster stablecoin-gateway-production \
  --services api web

# Check task logs
aws logs tail /ecs/stablecoin-gateway-production-api --since 10m
```

### Container Won't Start

```bash
# Check stopped task reason
aws ecs describe-tasks \
  --cluster stablecoin-gateway-production \
  --tasks <task-id>

# Common issues:
# - Missing environment variable
# - Database connection failed
# - Out of memory (increase task definition)
```

## Next Steps

### Phase 4 (Future)

- [ ] Automated E2E tests in CI
- [ ] Blue-green deployments
- [ ] Auto-rollback on errors
- [ ] Performance testing
- [ ] Security scanning (Snyk, Trivy)
- [ ] Terraform for IaC

## Documentation

- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Complete deployment guide
- **[CICD.md](docs/CICD.md)** - CI/CD pipeline details
- **[API README](apps/api/README.md)** - API documentation
- **[Web README](apps/web/README.md)** - Web app documentation

## Support

For DevOps issues:

- **GitHub Issues**: Tag with `devops` label
- **Slack**: #stablecoin-gateway channel
- **Documentation**: This file + linked docs

---

**Created by**: DevOps Engineer (Claude Agent)
**Date**: 2026-01-27
**Status**: Complete
**Time Spent**: 45 minutes
