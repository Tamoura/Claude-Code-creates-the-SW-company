# ConnectIn Rollback Strategy

## Overview

This document defines the rollback procedures for ConnectIn deployments. All rollbacks should be completed within the SLA window defined in the incident response process.

## Rollback Decision Matrix

| Signal | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 5% of requests | Investigate; rollback if not resolved in 10 min |
| Health check | `/health` returns 503 | Automatic rollback via orchestrator |
| Latency p99 | > 2s sustained for 5 min | Investigate; rollback if degrading |
| Crash loop | > 3 restarts in 5 min | Automatic rollback |

## Rollback Procedures

### 1. Application Rollback (Docker)

```bash
# 1. Identify the last known good image tag
docker images connectin-api --format '{{.Tag}}' | head -5

# 2. Update docker-compose to use previous image tag
# In docker-compose.yml, change the image tag for the affected service

# 3. Restart with previous version
docker compose down api
docker compose up -d api

# 4. Verify health
curl -f http://localhost:5007/health || echo "HEALTH CHECK FAILED"

# 5. Monitor logs for 5 minutes
docker compose logs -f api --since 5m
```

### 2. Database Rollback (Prisma)

```bash
# 1. List migration history
cd apps/api
npx prisma migrate status

# 2. If the latest migration caused the issue, roll back
# WARNING: This may cause data loss. Only proceed if confirmed.
npx prisma migrate resolve --rolled-back <migration-name>

# 3. Apply the rollback SQL (must be prepared in advance)
# Each migration should have a corresponding down.sql in:
#   prisma/migrations/<migration-name>/down.sql

# 4. Verify schema state
npx prisma migrate status
```

### 3. Frontend Rollback (Next.js)

```bash
# 1. Identify previous build
ls -lt .next/BUILD_ID

# 2. Deploy previous build artifact
# If using Docker:
docker compose down web
docker compose up -d web  # with previous image tag

# 3. Verify
curl -f http://localhost:3111 || echo "FRONTEND DOWN"
```

### 4. Full Stack Rollback

```bash
# 1. Stop all services
docker compose down

# 2. Checkout previous release tag
git checkout <previous-release-tag>

# 3. Rebuild and restart
docker compose build
docker compose up -d

# 4. Run health checks
curl -f http://localhost:5007/health
curl -f http://localhost:3111

# 5. Run smoke tests
npm run test:smoke 2>/dev/null || echo "No smoke tests configured"
```

## Post-Rollback Checklist

- [ ] Verify `/health` returns 200 with `database: connected`
- [ ] Verify frontend loads without errors
- [ ] Check error rates in logs have returned to baseline
- [ ] Notify stakeholders of rollback and ETA for fix
- [ ] Create incident report documenting root cause
- [ ] Add regression test for the issue that caused rollback

## Prevention

- All deployments require passing CI pipeline (lint, typecheck, tests)
- Database migrations must have corresponding rollback SQL
- Feature flags for risky changes (gradual rollout)
- Canary deployments for production releases when available
