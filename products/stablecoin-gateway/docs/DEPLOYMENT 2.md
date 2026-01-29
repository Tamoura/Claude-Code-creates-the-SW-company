# Stablecoin Gateway - Deployment Guide

This guide covers deploying Stablecoin Gateway to staging and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development with Docker](#local-development-with-docker)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deploying to Staging](#deploying-to-staging)
- [Deploying to Production](#deploying-to-production)
- [Environment Variables](#environment-variables)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring](#monitoring)

---

## Prerequisites

### Required Tools

- **Docker**: 24.0+ and Docker Compose
- **Node.js**: 20.x
- **AWS CLI**: 2.x (for production deployments)
- **Git**: For version control

### AWS Infrastructure Setup

Before deploying, ensure the following AWS resources are created:

1. **ECR Repositories**:
   - `stablecoin-gateway-api` (staging)
   - `stablecoin-gateway-web` (staging)
   - `stablecoin-gateway-api-prod` (production)
   - `stablecoin-gateway-web-prod` (production)

2. **ECS Clusters**:
   - `stablecoin-gateway-staging`
   - `stablecoin-gateway-production`

3. **RDS PostgreSQL**:
   - Staging: `stablecoin-gateway-staging-db`
   - Production: `stablecoin-gateway-production-db`

4. **ElastiCache Redis**:
   - Staging: `stablecoin-gateway-staging-redis`
   - Production: `stablecoin-gateway-production-redis`

5. **Application Load Balancers**:
   - Staging: `stablecoin-gateway-staging-alb`
   - Production: `stablecoin-gateway-production-alb`

6. **Secrets Manager**:
   - `stablecoin-gateway/staging/*`
   - `stablecoin-gateway/production/*`

7. **KMS Keys** (for secure wallet management):
   - Staging: `stablecoin-gateway-staging-wallet-key`
   - Production: `stablecoin-gateway-production-wallet-key`
   - **Key Spec**: `ECC_SECG_P256K1` (SECP256K1 curve for Ethereum)
   - **Key Usage**: `SIGN_VERIFY`

---

## AWS KMS Setup for Secure Wallet Management

### Overview

Stablecoin Gateway uses AWS Key Management Service (KMS) to securely manage private keys for the hot wallet. Private keys **never** exist in application memory or environment variables.

### Creating a KMS Key

#### For Development/Staging

```bash
# Create KMS key with SECP256K1 curve (Ethereum-compatible)
aws kms create-key \
  --key-spec ECC_SECG_P256K1 \
  --key-usage SIGN_VERIFY \
  --description "Stablecoin Gateway Staging Wallet Key" \
  --tags TagKey=Environment,TagValue=staging TagKey=Application,TagValue=stablecoin-gateway

# Get the Key ID from response
# Example: "KeyId": "12345678-1234-1234-1234-123456789012"

# Create alias for easy reference
aws kms create-alias \
  --alias-name alias/stablecoin-gateway-staging-wallet \
  --target-key-id 12345678-1234-1234-1234-123456789012
```

#### For Production

```bash
# Create production KMS key
aws kms create-key \
  --key-spec ECC_SECG_P256K1 \
  --key-usage SIGN_VERIFY \
  --description "Stablecoin Gateway Production Wallet Key" \
  --tags TagKey=Environment,TagValue=production TagKey=Application,TagValue=stablecoin-gateway

# Create alias
aws kms create-alias \
  --alias-name alias/stablecoin-gateway-production-wallet \
  --target-key-id <PRODUCTION-KEY-ID>
```

### Importing an Existing Private Key (Optional)

If you need to import an existing Ethereum private key:

```bash
# 1. Get the public key from KMS to use for wrapping
aws kms get-parameters-for-import \
  --key-id <KEY-ID> \
  --wrapping-algorithm RSAES_OAEP_SHA_256 \
  --wrapping-key-spec RSA_2048

# 2. Wrap your private key using the public key
# (Use OpenSSL or a script - see AWS documentation)

# 3. Import the wrapped key
aws kms import-key-material \
  --key-id <KEY-ID> \
  --encrypted-key-material fileb://wrapped-key.bin \
  --import-token fileb://import-token.bin \
  --expiration-model KEY_MATERIAL_DOES_NOT_EXPIRE
```

**Note**: For production, it's recommended to generate the key directly in KMS rather than importing.

### IAM Permissions

The ECS task execution role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:GetPublicKey",
        "kms:Sign"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/*",
      "Condition": {
        "StringEquals": {
          "kms:RequestAlias": "alias/stablecoin-gateway-*-wallet"
        }
      }
    }
  ]
}
```

### Getting the Ethereum Address

After creating the KMS key, derive the Ethereum address:

```bash
# Install dependencies
npm install

# Run derivation script
node scripts/derive-kms-address.js arn:aws:kms:us-east-1:123456789012:key/...

# Output:
# KMS Key ID: arn:aws:kms:us-east-1:123456789012:key/12345678...
# Ethereum Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
#
# IMPORTANT: Fund this address with gas tokens (MATIC for Polygon)
```

**CRITICAL**: Fund the derived address with native tokens (ETH/MATIC) for gas fees before deploying.

### Local Development Without KMS

For local development, you can use a test private key:

```bash
# Option 1: Use KMS LocalStack (recommended)
docker-compose up -d localstack

# LocalStack creates a mock KMS endpoint at http://localhost:4566
export AWS_ENDPOINT_URL=http://localhost:4566
export KMS_KEY_ID="test-key-id"

# Option 2: Use fallback to private key (NOT for production)
# Set ALLOW_PRIVATE_KEY_FALLBACK=true in .env (only for dev)
export HOT_WALLET_PRIVATE_KEY="0x..."
export ALLOW_PRIVATE_KEY_FALLBACK="true"
```

### Security Best Practices

1. **Key Rotation**: Rotate KMS keys annually
2. **Access Logging**: Enable CloudTrail logging for all KMS operations
3. **Least Privilege**: Grant only `kms:Sign` and `kms:GetPublicKey` permissions
4. **Multi-Region**: Use KMS multi-region keys for disaster recovery
5. **Monitoring**: Set up CloudWatch alarms for unusual KMS activity
6. **Backup**: Export and securely store the public key (address derivation)

### Testing KMS Integration

```bash
# Test KMS connectivity
npm run test:kms

# Test transaction signing
npm run test:kms-signing

# View KMS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/KMS \
  --metric-name SignCount \
  --dimensions Name=KeyId,Value=<KEY-ID> \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## Local Development with Docker

### Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd products/stablecoin-gateway

# Copy environment variables
cp .env.example .env

# Edit .env with your local values
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services

When running `docker-compose up`, the following services start:

- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **API**: `http://localhost:5001`
- **Web**: `http://localhost:3101`

### Running Migrations

```bash
# Inside the API container
docker-compose exec api npm run db:migrate

# Or from host
cd apps/api
npm run db:migrate
```

### Rebuilding Containers

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build api
docker-compose up -d api
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

The project uses three GitHub Actions workflows:

#### 1. **CI Workflow** (`.github/workflows/ci.yml`)

Runs on every PR and push to main/prototype branches:

- ✅ Run unit tests for API and Web
- ✅ Run linting (ESLint)
- ✅ Build Docker images
- ✅ Upload test coverage to Codecov

**Triggered by**: Pull requests, pushes to main

#### 2. **Deploy Staging** (`.github/workflows/deploy-staging.yml`)

Automatically deploys to staging on merge to main:

1. Build Docker images
2. Push images to ECR
3. Run database migrations
4. Update ECS services
5. Run smoke tests

**Triggered by**: Push to main branch

#### 3. **Deploy Production** (`.github/workflows/deploy-production.yml`)

Manual deployment to production:

1. Checkout specific version tag
2. Build and push images
3. Backup database
4. Run migrations
5. Deploy to ECS
6. Verify health checks

**Triggered by**: Manual workflow dispatch with version input

---

## Deploying to Staging

### Automatic Deployment

Staging deploys automatically when code is merged to `main`:

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/my-feature

# After PR approval and merge to main
# → Staging deployment starts automatically
```

### Manual Deployment

To manually trigger staging deployment:

1. Go to GitHub Actions
2. Select "Deploy to Staging" workflow
3. Click "Run workflow"
4. Select `main` branch
5. Click "Run workflow"

### Verify Staging Deployment

```bash
# Check API health
curl https://staging-api.gateway.io/health

# Check Web health
curl https://staging.gateway.io

# Check ECS services
aws ecs describe-services \
  --cluster stablecoin-gateway-staging \
  --services api web
```

---

## Deploying to Production

### Prerequisites

- All tests passing on staging
- Version tag created
- CEO/Team approval

### Create Release Tag

```bash
# Create and push version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### Deploy via GitHub Actions

1. Go to GitHub Actions
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Enter version tag (e.g., `v1.0.0`)
5. Click "Run workflow"
6. Wait for deployment to complete (~5-10 minutes)

### Verify Production Deployment

```bash
# Check API health
curl https://api.gateway.io/health

# Check Web health
curl https://gateway.io

# Monitor logs
aws logs tail /ecs/stablecoin-gateway-production-api --follow

# Check metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=api \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average
```

---

## Environment Variables

### Generating Secure Secrets

**CRITICAL:** Never use default or weak secrets in production. Generate cryptographically secure secrets using:

```bash
# Generate a 64-byte (512-bit) secret in hexadecimal format
openssl rand -hex 64
```

This command generates a 128-character hexadecimal string suitable for:
- `JWT_SECRET` - JSON Web Token signing key
- `REFRESH_TOKEN_SECRET` - Refresh token signing key (if different from JWT_SECRET)
- Any other cryptographic keys

**Example output:**
```
a7f4c9e2d1b8f6a3e5c7d9b1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1
c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5
```

**Security Best Practices:**
- Generate unique secrets for staging and production
- Store secrets in GitHub Actions Secrets (encrypted)
- Never commit secrets to version control
- Rotate secrets periodically (every 90 days minimum)
- Use AWS Secrets Manager or similar for production secrets
- Never reuse secrets across different environments or services

### Required Secrets (GitHub Actions)

Configure these in GitHub Settings → Secrets and Variables → Actions:

**Secrets** (encrypted):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `DATABASE_URL` (staging & production)
- `JWT_SECRET` (staging & production)
- `ALCHEMY_API_KEY`
- `INFURA_PROJECT_ID`

**Variables** (plaintext):
- `API_URL` (staging: https://staging-api.gateway.io)
- `WEB_URL` (staging: https://staging.gateway.io)

### Environment-Specific Configuration

#### Staging

```bash
# .env.staging
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://user:pass@staging-db.us-east-1.rds.amazonaws.com:5432/stablecoin_gateway_staging
REDIS_URL=redis://staging-redis.cache.amazonaws.com:6379
FRONTEND_URL=https://staging.gateway.io
```

#### Production

```bash
# .env.production
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://user:pass@production-db.us-east-1.rds.amazonaws.com:5432/stablecoin_gateway_production
REDIS_URL=redis://production-redis.cache.amazonaws.com:6379
FRONTEND_URL=https://gateway.io
```

---

## Rollback Procedures

### Rollback Production Deployment

If a production deployment fails, rollback to the previous version:

#### Option 1: Re-deploy Previous Version

```bash
# Find previous version tag
git tag -l

# Trigger deployment with previous version
# Go to GitHub Actions → Deploy to Production
# Enter previous version tag (e.g., v1.0.0)
```

#### Option 2: AWS ECS Task Revert

```bash
# List task definitions
aws ecs list-task-definitions \
  --family-prefix stablecoin-gateway-api-prod

# Update service to previous task definition
aws ecs update-service \
  --cluster stablecoin-gateway-production \
  --service api \
  --task-definition stablecoin-gateway-api-prod:123
```

#### Option 3: Database Rollback (if migration failed)

```bash
# SSH into API container or use ECS Exec
aws ecs execute-command \
  --cluster stablecoin-gateway-production \
  --task <task-id> \
  --container api \
  --command "/bin/sh" \
  --interactive

# Inside container, rollback migration
npm run db:migrate:rollback
```

### Rollback Time Objectives

- **ECS task revert**: ~2-3 minutes
- **Full re-deployment**: ~8-10 minutes
- **Database rollback**: ~5-10 minutes (if needed)

---

## Monitoring

### Health Checks

All services expose health check endpoints:

- **API**: `GET /health`
- **Web**: `GET /` (should return 200)

### Logs

View logs in CloudWatch:

```bash
# API logs
aws logs tail /ecs/stablecoin-gateway-production-api --follow

# Web logs
aws logs tail /ecs/stablecoin-gateway-production-web --follow

# Filter by error
aws logs tail /ecs/stablecoin-gateway-production-api --filter-pattern "ERROR"
```

### Metrics

Key metrics to monitor:

- **API Response Time** (p95): < 200ms
- **Payment Success Rate**: > 95%
- **CPU Utilization**: < 70%
- **Memory Utilization**: < 80%
- **Database Connections**: < 80% of max
- **Redis Memory**: < 80% of max

### Alerts

Configure CloudWatch alarms for:

- API 5xx error rate > 1%
- API latency p95 > 500ms
- ECS task count = 0 (service down)
- Database CPU > 80%
- Redis memory > 80%

---

## Troubleshooting

### Deployment Failed

```bash
# Check GitHub Actions logs
# Go to Actions → Select failed workflow → View logs

# Check ECS service events
aws ecs describe-services \
  --cluster stablecoin-gateway-production \
  --services api web

# Check task logs
aws logs tail /ecs/stablecoin-gateway-production-api --since 10m
```

### Database Migration Failed

```bash
# Connect to database
psql $DATABASE_URL

# Check migration status
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;

# Manually rollback if needed
# (Be careful - test in staging first!)
```

### Container Won't Start

```bash
# Check ECS task stopped reason
aws ecs describe-tasks \
  --cluster stablecoin-gateway-production \
  --tasks <task-id>

# Common issues:
# - Out of memory (increase task memory)
# - Environment variable missing
# - Database connection failed
```

---

## Support

For deployment issues:

- **DevOps Engineer**: Create GitHub issue with `deployment` label
- **On-Call**: Check #stablecoin-gateway Slack channel
- **Emergencies**: Page on-call via PagerDuty

---

**Last Updated**: 2026-01-27
**Version**: 1.0.0
