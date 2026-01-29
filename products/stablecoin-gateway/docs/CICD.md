# Stablecoin Gateway - CI/CD Documentation

This document explains the continuous integration and deployment pipeline for Stablecoin Gateway.

## Pipeline Overview

```
Developer → Git Push → GitHub Actions → Build → Test → Deploy
                          ↓
                    [CI Workflow]
                          ↓
                    ┌─────────────┐
                    │  Run Tests  │
                    │  Lint Code  │
                    │  Build Apps │
                    └──────┬──────┘
                           ↓
                    Merge to Main
                           ↓
                    [Deploy Staging]
                           ↓
                    ┌─────────────┐
                    │   Staging   │
                    │ Environment │
                    └──────┬──────┘
                           ↓
                    Manual Approval
                           ↓
                    [Deploy Production]
                           ↓
                    ┌─────────────┐
                    │ Production  │
                    │ Environment │
                    └─────────────┘
```

---

## Workflows

### 1. CI Workflow

**File**: `.github/workflows/ci.yml`

**Triggers**:
- Pull requests to `main` or `prototype/stablecoin-gateway`
- Pushes to `main` or `prototype/stablecoin-gateway`

**Jobs**:

#### Job: test-api
- Start PostgreSQL and Redis services
- Install dependencies
- Generate Prisma client
- Run database migrations
- Run unit tests with coverage
- Upload coverage to Codecov

#### Job: test-web
- Install dependencies
- Run unit tests with coverage
- Upload coverage to Codecov

#### Job: lint
- Install dependencies
- Run ESLint on API and Web code

#### Job: build
- Install dependencies
- Build API (TypeScript → JavaScript)
- Build Web (Next.js production build)

**Duration**: ~5-8 minutes

---

### 2. Deploy Staging Workflow

**File**: `.github/workflows/deploy-staging.yml`

**Triggers**:
- Push to `main` branch (automatic)

**Environment**: `staging`

**Steps**:

1. **Build**:
   - Install dependencies
   - Build API and Web applications
   - Run database migrations

2. **Docker**:
   - Login to AWS ECR
   - Build Docker images
   - Tag with commit SHA and `latest`
   - Push to ECR

3. **Deploy**:
   - Update ECS services (rolling deployment)
   - Wait for services to stabilize (60s)

4. **Verify**:
   - Health check API endpoint
   - Health check Web endpoint
   - Report success/failure

**Duration**: ~8-12 minutes

**Required Secrets**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DATABASE_URL`

**Required Variables**:
- `API_URL`
- `WEB_URL`

---

### 3. Deploy Production Workflow

**File**: `.github/workflows/deploy-production.yml`

**Triggers**:
- Manual dispatch with version input

**Environment**: `production`

**Inputs**:
- `version`: Version tag to deploy (e.g., `v1.0.0`)

**Steps**:

1. **Checkout**:
   - Checkout specific version tag

2. **Build**:
   - Install dependencies
   - Build API and Web applications
   - Run database migrations (with backup)

3. **Docker**:
   - Login to AWS ECR
   - Build Docker images
   - Tag with version and `latest`
   - Push to production ECR repositories

4. **Deploy**:
   - Update ECS services (blue-green deployment)
   - Wait for services to stabilize (120s)

5. **Verify**:
   - Health check API endpoint
   - Health check Web endpoint
   - Run post-deployment tests
   - Report success/failure

**Duration**: ~10-15 minutes

**Required Secrets**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DATABASE_URL`

**Required Variables**:
- `API_URL`
- `WEB_URL`

---

## GitHub Secrets Configuration

### Per Environment

Configure secrets in: **Settings → Environments → [staging/production] → Secrets**

#### Staging Environment

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@staging-db.rds.amazonaws.com:5432/db` |
| `AWS_ACCESS_KEY_ID` | AWS credentials for ECR/ECS | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

#### Production Environment

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@prod-db.rds.amazonaws.com:5432/db` |
| `AWS_ACCESS_KEY_ID` | AWS credentials for ECR/ECS | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

### Environment Variables

Configure in: **Settings → Environments → [staging/production] → Variables**

#### Staging Variables

| Variable Name | Value |
|---------------|-------|
| `API_URL` | `https://staging-api.gateway.io` |
| `WEB_URL` | `https://staging.gateway.io` |

#### Production Variables

| Variable Name | Value |
|---------------|-------|
| `API_URL` | `https://api.gateway.io` |
| `WEB_URL` | `https://gateway.io` |

---

## Docker Build Process

### Multi-Stage Builds

Both API and Web use multi-stage Docker builds for optimal image size:

#### Stage 1: Builder
- Install all dependencies (including devDependencies)
- Copy source code
- Build application
- Generate Prisma client (API only)

#### Stage 2: Runner
- Start from clean Node.js Alpine image
- Copy only built artifacts and production dependencies
- Create non-root user
- Configure health checks
- Run with `dumb-init` for proper signal handling

### Image Tags

- **Staging**: `<commit-sha>` and `latest`
- **Production**: `<version-tag>` (e.g., `v1.0.0`) and `latest`

### Image Repositories

- Staging API: `stablecoin-gateway-api`
- Staging Web: `stablecoin-gateway-web`
- Production API: `stablecoin-gateway-api-prod`
- Production Web: `stablecoin-gateway-web-prod`

---

## Deployment Strategy

### Staging: Rolling Deployment

- Zero-downtime deployment
- Update ECS task definition
- ECS gradually replaces tasks
- Old tasks drained after new tasks healthy

**Rollout**: ~2-3 minutes

### Production: Blue-Green Deployment (Future)

Current: Rolling deployment (same as staging)

Future enhancement:
- Deploy to "green" environment
- Run smoke tests
- Switch traffic to "green"
- Keep "blue" for quick rollback

---

## Rollback Procedures

### Automatic Rollback

Not currently implemented. Future enhancement:

- Monitor error rate for 10 minutes post-deployment
- Auto-rollback if error rate > 1%

### Manual Rollback

#### Option 1: Re-deploy Previous Version

```bash
# Go to GitHub Actions → Deploy to Production
# Enter previous version tag
```

#### Option 2: ECS Task Revert

```bash
aws ecs update-service \
  --cluster stablecoin-gateway-production \
  --service api \
  --task-definition stablecoin-gateway-api-prod:PREVIOUS_REVISION
```

---

## Testing Strategy

### Pre-merge (CI Workflow)

- ✅ Unit tests (API & Web)
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Build validation

### Post-deploy (Staging)

- ✅ Smoke tests (health checks)
- ⬜ Integration tests (future)
- ⬜ E2E tests (future)

### Post-deploy (Production)

- ✅ Smoke tests (health checks)
- ✅ Post-deployment validation
- ⬜ Canary testing (future)

---

## Monitoring Integration

### CloudWatch

- ECS task logs
- Application logs (JSON structured)
- Custom metrics (payment success rate, API latency)

### Datadog (Future)

- APM (Application Performance Monitoring)
- Distributed tracing
- Custom dashboards
- Alerting

---

## Performance Metrics

### Build Times

| Job | Average Duration | Target |
|-----|-----------------|--------|
| CI - Test API | 3-4 minutes | < 5 min |
| CI - Test Web | 2-3 minutes | < 5 min |
| CI - Lint | 1-2 minutes | < 3 min |
| CI - Build | 2-3 minutes | < 5 min |
| Deploy Staging | 8-12 minutes | < 15 min |
| Deploy Production | 10-15 minutes | < 20 min |

### Deployment Frequency

- **Staging**: Multiple times per day
- **Production**: 1-2 times per week

### Success Rate

- **Target**: > 95% successful deployments
- **Current**: TBD (track after Phase 3 complete)

---

## Cost Optimization

### GitHub Actions Minutes

- Free tier: 2,000 minutes/month
- Expected usage: ~1,000 minutes/month
- Cost: $0 (within free tier)

### ECR Storage

- Docker images: ~500MB per image
- Retention: Keep last 10 versions
- Cost: ~$0.10/GB/month

---

## Security Best Practices

### Secrets Management

- ✅ All secrets stored in GitHub Secrets
- ✅ Never commit `.env` files
- ✅ Secrets scoped to environments
- ✅ AWS credentials rotated quarterly

### Docker Security

- ✅ Non-root user in containers
- ✅ Alpine base images (smaller attack surface)
- ✅ No secrets in Docker images
- ✅ Health checks configured
- ✅ `dumb-init` for proper signal handling

### Access Control

- ✅ Production deploys require manual approval
- ✅ AWS credentials limited to ECR/ECS only
- ✅ Database credentials stored in Secrets Manager
- ⬜ Multi-factor authentication required (future)

---

## Troubleshooting

### Build Failures

**Symptom**: CI workflow fails during build

**Common Causes**:
- TypeScript compilation errors
- Missing environment variables
- Prisma schema errors

**Resolution**:
1. Check GitHub Actions logs
2. Run `npm run build` locally
3. Fix errors and push fix

### Deployment Failures

**Symptom**: Deploy workflow fails

**Common Causes**:
- AWS credentials expired
- ECS service not found
- Database migration failed
- Health check timeout

**Resolution**:
1. Check workflow logs
2. Verify AWS resources exist
3. Check ECS service events
4. Verify database connectivity

### Container Won't Start

**Symptom**: ECS task stops immediately after start

**Common Causes**:
- Out of memory
- Missing environment variables
- Database connection failed
- Port already in use

**Resolution**:
1. Check ECS task stopped reason
2. Review CloudWatch logs
3. Verify environment variables
4. Check database connectivity

---

## Future Enhancements

### Phase 4 (Months 4-6)

- [ ] Automated E2E tests in CI
- [ ] Blue-green deployments
- [ ] Canary deployments
- [ ] Auto-rollback on errors

### Phase 5 (Months 7-12)

- [ ] Multi-region deployments
- [ ] Performance testing in CI
- [ ] Security scanning (Snyk, Trivy)
- [ ] Terraform for IaC

---

## Support

For CI/CD issues:

- **DevOps Engineer**: GitHub Issues
- **Urgent**: #stablecoin-gateway Slack
- **Documentation**: This file

---

**Last Updated**: 2026-01-27
**Version**: 1.0.0
