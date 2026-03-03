# QDB SME Relief Portal — Deployment Guide

**Product**: QDB SME Relief Portal
**Version**: 1.1 | March 2026
**Classification**: Confidential — QDB Internal / DevOps Use Only
**Audience**: DevOps Engineer, QDB IT Infrastructure, Backend Engineers

> **Prototype Notice**: The QDB SME Relief Portal is currently a **Next.js prototype**
> (port 3120) with no backend implemented. This document describes the **planned
> production deployment architecture** as defined in the PRD. Backend components
> (PostgreSQL database, Fastify API, CRM connector, WPS service, document storage,
> audit service, notification service) are **planned but not yet built**. Sections
> covering planned-only components are labelled **[PLANNED]**.

---

## Table of Contents

1. [Environment Overview](#1-environment-overview)
2. [Deployment Architecture](#2-deployment-architecture)
3. [Infrastructure Requirements](#3-infrastructure-requirements)
4. [Environment Variables Reference](#4-environment-variables-reference)
5. [Docker Setup](#5-docker-setup)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Database Migration Process](#7-database-migration-process)
8. [Integration Configuration](#8-integration-configuration)
9. [Health Checks and Monitoring](#9-health-checks-and-monitoring)
10. [Rollback Procedure](#10-rollback-procedure)
11. [Secrets Management](#11-secrets-management)
12. [Pre-Deployment Checklist](#12-pre-deployment-checklist)
13. [Post-Deployment Verification](#13-post-deployment-verification)
14. [Current Prototype Setup](#14-current-prototype-setup)

---

## 1. Environment Overview

### 1.1 Environment Progression

Three environments are used from development through production release.

```mermaid
flowchart LR
    DEV["Development<br/>localhost:3120<br/>Prototype only<br/>No integrations<br/>Mocked responses"] -->|"PR merged<br/>CI passes"| STAGING

    STAGING["Staging<br/>Azure App Service<br/>staging-sme-relief.qdb.com.qa<br/>Sandbox integrations<br/>Full stack"] -->|"QDB sign-off<br/>Release tag created"| PROD

    PROD["Production<br/>sme-relief.qdb.com.qa<br/>Live integrations<br/>High availability<br/>99.5% uptime SLA"]

    style DEV fill:#339af0,color:#fff
    style STAGING fill:#ffd43b,color:#000
    style PROD fill:#51cf66,color:#000
```

| Attribute | Development | Staging | Production |
|-----------|-------------|---------|------------|
| URL | `http://localhost:3120` | `https://staging-sme-relief.qdb.com.qa` | `https://sme-relief.qdb.com.qa` |
| NAS / Tawtheeq | Mocked (prototype) | Sandbox NAS endpoint | Live NAS endpoint |
| MOCI API | Mocked (prototype) | MOCI sandbox API | Live MOCI API |
| WPS System | Mocked (prototype) | WPS sandbox / test data | Live WPS API |
| Dynamics CRM | Mocked (prototype) | Dynamics 365 sandbox org | Dynamics 365 production org |
| Document Storage | Local filesystem | Azure Blob (staging container) | Azure Blob (production container) |
| Database | None (prototype) | Azure PostgreSQL Flexible Server | Azure PostgreSQL Flexible Server (HA) |
| Monitoring | None | Azure Application Insights | Azure Application Insights + PagerDuty |
| Admin access | Local | QDB VPN + Azure AD | QDB VPN + Azure AD + MFA enforced |

---

## 2. Deployment Architecture

### Production Architecture Diagram

```mermaid
graph TD
    subgraph "Internet (Public)"
        USERS["SME Applicants<br/>Browsers"]
        ADMIN_USERS["QDB Admin Staff<br/>QDB Internal Network"]
    end

    subgraph "Azure Front Door (Global)"
        AFD["Azure Front Door + WAF<br/>DDoS protection<br/>Geo-restriction: Qatar + allow-listed IPs<br/>SSL offloading<br/>Rate limiting: 100 req/min per IP"]
        CDN["Azure CDN<br/>Static asset caching<br/>Next.js build outputs<br/>Cache-Control headers"]
    end

    subgraph "Azure Region: Qatar North"
        subgraph "Application Tier — Azure App Service or AKS"
            LB["Azure Application Gateway<br/>Layer 7 load balancer<br/>Health probes<br/>SSL termination ("TLS 1.3 min")"]
            WEB1["Next.js App<br/>Instance 1<br/>Port 3120<br/>Container: node:20-alpine"]
            WEB2["Next.js App<br/>Instance 2<br/>Auto-scale: CPU > 70%"]
            API1["Fastify API<br/>Instance 1<br/>Port 5014<br/>Container: node:20-alpine"]
            API2["Fastify API<br/>Instance 2<br/>Auto-scale: CPU > 70%"]
        end

        subgraph "Data Tier"
            PG_PRIMARY["Azure Database for PostgreSQL<br/>Flexible Server<br/>General Purpose: 4 vCores 16GB RAM<br/>Storage: 512 GB<br/>High Availability: Zone-redundant"]
            PG_STANDBY["Standby Replica<br/>Same region<br/>Automatic failover < 60s"]
            REDIS["Azure Cache for Redis<br/>C2 Standard ("6 GB")<br/>HA with replica<br/>TLS 1.3 required"]
        end

        subgraph "Storage Tier"
            BLOB["Azure Blob Storage<br/>Document container<br/>GRS ("Geo-redundant")<br/>Lifecycle: Archive after 1 year<br/>Retention: 7 years minimum"]
            KV["Azure Key Vault<br/>Encryption keys<br/>Secrets<br/>Access via Managed Identity"]
        end

        subgraph "Monitoring"
            AI["Azure Application Insights<br/>APM<br/>Distributed tracing<br/>Performance monitoring"]
            LA["Log Analytics Workspace<br/>Centralised logs<br/>Audit export<br/>Alert rules<br/>Retention: 2 years"]
        end
    end

    subgraph "External Integrations"
        NAS["Tawtheeq / NAS"]
        MOCI["MOCI API"]
        WPS["WPS API"]
        CRM["Dynamics 365 CRM"]
    end

    USERS -->|"HTTPS/443"| AFD
    ADMIN_USERS -->|"HTTPS/443<br/>QDB VPN required"| AFD
    AFD --> CDN
    CDN --> LB
    LB --> WEB1
    LB --> WEB2
    WEB1 -->|"Internal HTTPS"| API1
    WEB2 -->|"Internal HTTPS"| API2
    API1 --> PG_PRIMARY
    API2 --> PG_PRIMARY
    PG_PRIMARY --> PG_STANDBY
    API1 --> REDIS
    API2 --> REDIS
    API1 --> BLOB
    BLOB <-.->|"Managed Identity"| KV
    API1 --> NAS
    API1 --> MOCI
    API1 --> WPS
    API1 --> CRM
    API1 --> AI
    API2 --> AI
    AI --> LA
    WEB1 --> AI
    WEB2 --> AI

    style AFD fill:#ff6b6b,color:#fff
    style PG_PRIMARY fill:#51cf66,color:#000
    style BLOB fill:#51cf66,color:#000
    style KV fill:#ffd43b,color:#000
```

---

## 2. Environment Variables Reference

All environment variables must be set in Azure App Service Application Settings (for App Service
deployment) or as Kubernetes Secrets (for AKS deployment). Never commit `.env` files to the repository.

### API Server (Fastify)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Runtime environment | `production` | Yes |
| `PORT` | API server port | `5014` | Yes |
| `DATABASE_URL` | PostgreSQL connection string with SSL | `postgresql://qdb_relief:pass@host:5432/qdb_relief?sslmode=require` | Yes |
| `REDIS_URL` | Redis connection string | `rediss://qdb_redis:pass@host:6380` (use `rediss` for TLS) | Yes |
| `JWT_SECRET` | 256-bit random secret for portal JWT signing | 64-char hex string | Yes |
| `JWT_ACCESS_EXPIRY` | Access token lifetime in seconds | `1800` (30 min) | Yes |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime in seconds | `28800` (8 hours) | Yes |
| `NAS_CLIENT_ID` | Tawtheeq OIDC client ID | `qdb-relief-portal` | Yes |
| `NAS_CLIENT_SECRET` | Tawtheeq OIDC client secret | (from QDB IT) | Yes |
| `NAS_ISSUER_URL` | NAS OIDC issuer URL | `https://nas.gov.qa/auth/realms/tawtheeq` | Yes |
| `NAS_REDIRECT_URI` | NAS OAuth callback URI | `https://sme-relief.qdb.com.qa/auth/callback` | Yes |
| `MOCI_API_KEY` | MOCI REST API key | (from MOCI integration team) | Yes |
| `MOCI_BASE_URL` | MOCI API base URL | `https://api.moci.gov.qa/v1` | Yes |
| `MOCI_TIMEOUT_MS` | MOCI API timeout in milliseconds | `3000` | Yes |
| `WPS_SERVICE_TOKEN` | WPS API service token | (from Ministry of Labour MOU) | Conditional |
| `WPS_BASE_URL` | WPS API base URL | `https://wps.mol.gov.qa/v1` | Conditional |
| `WPS_TIMEOUT_MS` | WPS API timeout | `10000` | Yes |
| `CRM_TENANT_ID` | Azure AD tenant ID | UUID | Yes |
| `CRM_CLIENT_ID` | Azure AD service principal client ID | UUID | Yes |
| `CRM_CLIENT_SECRET` | Azure AD service principal secret | (rotated every 90 days) | Yes |
| `CRM_ORG_URL` | Dynamics CRM organization URL | `https://qdb.crm.dynamics.com` | Yes |
| `AZURE_STORAGE_ACCOUNT` | Blob storage account name | `qdbreliefdocs` | Yes |
| `AZURE_STORAGE_CONTAINER` | Blob container name | `documents` | Yes |
| `AZURE_KEY_VAULT_URI` | Key Vault URI for encryption key access | `https://qdb-relief-kv.vault.azure.net` | Yes |
| `ENCRYPTION_KEY_NAME` | Key Vault key name for document encryption | `doc-encryption-key` | Yes |
| `SMTP_HOST` | Email SMTP host | `smtp.qdb.com.qa` | Yes |
| `SMTP_PORT` | SMTP port | `587` | Yes |
| `SMTP_USER` | SMTP username | `noreply@qdb.com.qa` | Yes |
| `SMTP_PASS` | SMTP password | (from QDB IT) | Yes |
| `SMS_GATEWAY_URL` | SMS gateway endpoint | `https://sms.qdb.com.qa/v1/send` | Yes |
| `SMS_GATEWAY_KEY` | SMS gateway API key | (from QDB IT) | Yes |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `86400000` (24 hours) | Yes |
| `RATE_LIMIT_MAX` | Max attempts per CR per window | `3` | Yes |
| `ADMIN_AZURE_AD_TENANT` | Azure AD tenant for admin auth | UUID | Yes |
| `LOG_LEVEL` | Pino log level | `info` | Yes |

### Web App (Next.js)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (public) | `https://sme-relief.qdb.com.qa/api/v1` | Yes |
| `NEXT_PUBLIC_PORTAL_URL` | Portal public URL (for links) | `https://sme-relief.qdb.com.qa` | Yes |
| `NODE_ENV` | Runtime environment | `production` | Yes |

---

## 3. Infrastructure Requirements

### Minimum Production Specifications

| Component | Specification | Notes |
|-----------|--------------|-------|
| **Next.js App Service** | P2v3 (2 vCores, 8 GB RAM) × 2 minimum | Auto-scale to P3v3 × 5 on CPU > 70% |
| **Fastify API App Service** | P2v3 (2 vCores, 8 GB RAM) × 2 minimum | Auto-scale on CPU > 70% |
| **PostgreSQL Flexible Server** | General Purpose, 4 vCores, 16 GB RAM | Zone-redundant HA; 512 GB SSD |
| **Redis Cache** | C2 Standard (6 GB) with replica | TLS connections only |
| **Blob Storage** | Standard GRS | Lifecycle management: archive after 1 year |
| **Key Vault** | Standard tier | 5 keys (encryption, API secrets) |
| **Application Gateway** | Standard_v2 | WAF policy enabled |
| **Azure Front Door** | Standard tier + WAF | Qatar geo-filter + IP allow-list for admin |

### Network Requirements

- All traffic must be HTTPS; HTTP redirects to HTTPS enforced at Front Door
- TLS 1.3 minimum (TLS 1.0 and 1.1 disabled)
- API servers communicate with external APIs (NAS, MOCI, WPS, CRM) via outbound HTTPS
- Admin portal access restricted to QDB internal network + VPN (Azure Front Door WAF IP restriction)
- PostgreSQL accessible only from API App Service (private endpoint or VNet integration)
- Redis accessible only from API App Service (private endpoint)
- Blob Storage accessible only from API App Service (Managed Identity + VNet service endpoint)

---

## 4. Pre-Deployment Checklist

Complete all items before deploying to production. Items marked with BLOCKER must be resolved
before any production deployment.

### Integration Agreements

- [ ] **BLOCKER**: NAS / Tawtheeq client credentials issued by QDB IT for production environment
- [ ] **BLOCKER**: NAS production redirect URI registered and confirmed
- [ ] **BLOCKER**: MOCI API key provisioned for production use
- [ ] **BLOCKER**: Dynamics CRM Azure AD service principal created with required permissions
- [ ] **BLOCKER**: CRM schema customisation (custom entities and fields) approved and deployed by QDB IT
- [ ] WPS API MOU signed (or documented decision to use file-only fallback at launch)
- [ ] SMS gateway API key provisioned
- [ ] SMTP relay configured for portal domain

### Security and Compliance

- [ ] **BLOCKER**: PDPA compliance assessment completed and signed off by QDB Data Protection Officer
- [ ] **BLOCKER**: QDB IT security review completed
- [ ] Azure Key Vault keys created and rotation schedule configured (90-day rotation for service principal secrets)
- [ ] Blob Storage encryption configured with Key Vault key
- [ ] Azure Front Door WAF policy enabled with Qatar geo-restriction
- [ ] Admin portal IP restriction configured (QDB VPN range only)
- [ ] Penetration test completed and critical findings resolved (if applicable)

### Infrastructure

- [ ] DNS records configured: `sme-relief.qdb.com.qa` → Azure Front Door
- [ ] SSL certificate issued and installed (Azure-managed or imported)
- [ ] PostgreSQL Flexible Server provisioned with HA standby
- [ ] Redis Cache provisioned with replica
- [ ] Blob Storage container created with correct access policy (private, no public access)
- [ ] Log Analytics workspace created and App Insights configured
- [ ] Alert rules configured (see Section 8 of ADMIN-GUIDE.md)
- [ ] Backup policy confirmed for PostgreSQL (7-year retention minimum for audit data)

### Application

- [ ] All environment variables set in App Service Application Settings (not in code)
- [ ] Database migrations run against production database (see Section 5)
- [ ] Initial admin user seeded in database
- [ ] NRGP beneficiary list uploaded and activated (via admin interface)
- [ ] Eligibility criteria confirmed and active in database
- [ ] Program lifecycle set to OPEN with confirmed end date configured
- [ ] Smoke test completed against staging environment

---

## 5. Database Migration Steps

The portal uses Prisma Migrate for database schema management. Migrations are version-controlled
and applied in sequence.

### Initial Schema Creation (First Deployment)

```bash
# Set the production DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host:5432/qdb_relief?sslmode=require"

# Navigate to the API app directory
cd products/qdb-sme-relief/apps/api

# Apply all migrations
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

### Database-Level Security Setup

Run these SQL statements after initial migration to enforce audit trail tamper protection:

```sql
-- Revoke DELETE and UPDATE on audit_log table from the application role
REVOKE DELETE, UPDATE ON TABLE audit_log FROM qdb_relief_app;

-- Grant only INSERT and SELECT to the application role
GRANT INSERT, SELECT ON TABLE audit_log TO qdb_relief_app;

-- Create trigger to alert on any attempt to modify audit records
-- (even by superuser — for detection purposes)
CREATE OR REPLACE FUNCTION audit_tamper_alert()
RETURNS event_trigger AS $$
BEGIN
  -- Insert alert record to a separate monitoring table
  -- This is also sent to Azure Monitor via the application
  RAISE WARNING 'AUDIT TAMPER ATTEMPT DETECTED: %', tg_tag;
END;
$$ LANGUAGE plpgsql;
```

### Applying Subsequent Migrations (Post-Launch)

```bash
# During a planned maintenance window
# 1. Put the portal in PAUSED state via admin UI first
# 2. Apply migrations
npx prisma migrate deploy

# 3. Verify migration completed
npx prisma migrate status

# 4. Restart API instances
# 5. Resume portal in admin UI
```

### Rollback a Failed Migration

```bash
# If a migration fails, Prisma marks it as failed
# Do NOT attempt to re-run the migration without fixing the schema first

# Check migration status
npx prisma migrate status

# If the last migration partially applied, it must be manually reversed
# Connect to the database and roll back the specific change
# Then mark the migration as rolled back:
npx prisma migrate resolve --rolled-back "migration_name"
```

---

## 6. CI/CD Pipeline

The portal uses GitHub Actions for continuous integration and deployment.

### Pipeline Overview

```mermaid
flowchart TD
    PR["Developer opens<br/>Pull Request"] --> CI["CI Pipeline<br/>github/workflows/ci.yml"]

    CI --> LINT["Lint<br/>ESLint + TypeScript"]
    CI --> TEST_UNIT["Unit Tests<br/>Jest"]
    CI --> TEST_E2E["E2E Tests<br/>Playwright<br/>("against staging")"]
    CI --> SEMGREP["Semgrep SAST<br/>Security scan"]
    CI --> TRIVY["Trivy<br/>Container scan"]

    LINT --> GATE{All checks pass?}
    TEST_UNIT --> GATE
    TEST_E2E --> GATE
    SEMGREP --> GATE
    TRIVY --> GATE

    GATE -->|Fail| BLOCK_MERGE["PR blocked<br/>from merging"]
    GATE -->|Pass| REVIEW["Code review<br/>required"]

    REVIEW --> MERGE["Merge to main"]
    MERGE --> STAGING_DEPLOY["Deploy to Staging<br/>Auto-deploy on merge to main"]
    STAGING_DEPLOY --> STAGING_VERIFY["Automated smoke tests<br/>against staging"]
    STAGING_VERIFY -->|Pass| PROD_GATE["Production deploy gate<br/>Manual approval required"]
    STAGING_VERIFY -->|Fail| ALERT["Alert engineering team<br/>Rollback staging"]

    PROD_GATE --> PROD_DEPLOY["Deploy to Production<br/>Blue-green deployment"]
    PROD_DEPLOY --> HEALTH_CHECK["Health checks<br/>all instances pass"]
    HEALTH_CHECK -->|Pass| COMPLETE["Deploy complete<br/>Monitoring active"]
    HEALTH_CHECK -->|Fail| ROLLBACK["Automatic rollback<br/>to previous version"]

    style GATE fill:#ffd43b,color:#000
    style PROD_GATE fill:#ff9900,color:#fff
    style ROLLBACK fill:#ff6b6b,color:#fff
    style COMPLETE fill:#51cf66,color:#000
```

### GitHub Actions Workflows

| Workflow | File | Trigger | Purpose |
|---------|------|---------|---------|
| CI | `.github/workflows/ci.yml` | Pull request to main | Lint, test, security scan |
| Deploy Staging | `.github/workflows/deploy-staging.yml` | Merge to main | Auto-deploy to staging |
| Deploy Production | `.github/workflows/deploy-production.yml` | Manual trigger with SHA | Production deploy with approval |
| Database Migrations | `.github/workflows/migrate.yml` | Manual trigger | Run Prisma migrations in target environment |

### Blue-Green Production Deployment

Production deployments use a blue-green strategy:
1. New version deployed to the inactive "green" slot
2. Smoke tests run against the green slot
3. If tests pass: traffic is switched from "blue" to "green" (instant cutover)
4. Blue slot retained for 30 minutes for rollback window
5. After 30 minutes: blue slot updated to match green for next deploy cycle

---

## 7. Health Check Endpoints

All health check endpoints are unauthenticated and return HTTP 200 on healthy, 503 on unhealthy.

### API Server Health Checks

| Endpoint | Method | Purpose | Expected Response |
|----------|--------|---------|-----------------|
| `/health` | GET | Overall API health | `{"status": "healthy", "version": "1.0.0"}` |
| `/health/db` | GET | PostgreSQL connectivity | `{"status": "healthy", "latency_ms": 3}` |
| `/health/redis` | GET | Redis connectivity | `{"status": "healthy", "latency_ms": 1}` |
| `/health/integrations` | GET | External API status | See below |

**Integration health response example**:

```json
{
  "nas": {"status": "healthy", "last_success": "2026-03-03T14:00:00Z"},
  "moci": {"status": "healthy", "last_success": "2026-03-03T14:01:00Z", "latency_ms": 245},
  "wps": {"status": "degraded", "last_error": "timeout", "last_success": "2026-03-03T13:45:00Z"},
  "crm": {"status": "healthy", "last_success": "2026-03-03T14:00:30Z", "latency_ms": 312}
}
```

### Next.js App Health Check

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Next.js application health |

### Application Gateway Health Probe Configuration

Configure Azure Application Gateway probes to:
- **Path**: `/health`
- **Protocol**: HTTPS
- **Port**: 5014 (API) / 3120 (Web)
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Unhealthy threshold**: 3 consecutive failures

---

## 8. Rollback Procedure

### Automatic Rollback (Blue-Green Deployment)

If health checks fail after a production deployment, the CI/CD pipeline automatically rolls back
by switching traffic back to the blue slot. No manual intervention required within the first
30 minutes of a deployment.

### Manual Rollback (Post-30-Minute Window)

If issues are discovered after the 30-minute automatic rollback window:

```bash
# 1. Identify the last stable image version
gh run list --workflow=deploy-production.yml --limit=5

# 2. Trigger a production deployment of the stable version
gh workflow run deploy-production.yml \
  --field sha=<stable_commit_sha> \
  --field environment=production

# 3. Monitor deployment health
gh run watch
```

### Database Rollback

If a migration caused issues:

```bash
# 1. PAUSE the portal (admin UI or direct database update)
UPDATE program_lifecycle SET status = 'PAUSED' WHERE id = 1;

# 2. Roll back the Prisma migration
npx prisma migrate resolve --rolled-back "migration_name"

# 3. Apply the reverse SQL migration manually (stored in /docs/migrations/rollback/)

# 4. Restart API instances

# 5. Resume portal
```

> **Warning**: Database rollbacks for migrations that added columns with NOT NULL constraints or
> deleted data are irreversible. Always take a PostgreSQL snapshot before applying migrations to
> production.

---

## 9. Post-Deployment Verification

Run this verification checklist after every production deployment.

### Functional Smoke Tests

- [ ] Home page loads correctly at `https://sme-relief.qdb.com.qa` in both English and Arabic
- [ ] Arabic RTL layout is correct on the home page
- [ ] "Apply for Relief" button redirects to Tawtheeq / NAS login
- [ ] Admin login works at `https://sme-relief.qdb.com.qa/admin`
- [ ] Health check endpoint returns 200: `GET /api/v1/health`
- [ ] DB health check returns 200: `GET /api/v1/health/db`
- [ ] Integration health shows NAS and MOCI as healthy
- [ ] Admin dashboard loads and shows application statistics

### Integration Smoke Tests (Staging Only — Not Production)

- [ ] Full application flow with NAS test user completes without errors
- [ ] MOCI lookup returns correct company data for test CR number
- [ ] WPS validation runs and returns result
- [ ] CRM case is created in staging CRM instance

### Monitoring Verification

- [ ] Azure Application Insights is receiving traces from both web app and API
- [ ] Log Analytics is receiving logs
- [ ] Alert rules are active (test by checking alert configurations, do not trigger alerts in production)
- [ ] Redis cache is populated (check hit rate via Azure portal metrics)

---

---

## 11. Secrets Management

### 11.1 Secret Inventory

| Secret | Storage | Rotation | Who Rotates |
|--------|---------|----------|------------|
| NAS client secret | Azure Key Vault | As directed by NAS (minimum annually) | QDB IT |
| MOCI API key | Azure Key Vault | As directed by MOCI | QDB IT |
| WPS API key | Azure Key Vault | As directed by Ministry of Labor | QDB IT |
| CRM service principal secret | Azure Key Vault | Every 90 days (mandatory — NFR) | QDB IT |
| Admin AAD app secret | Azure Key Vault | Every 90 days | QDB IT |
| Storage connection string | Azure Key Vault | Annually or on compromise | QDB IT |
| JWT signing secret | Azure Key Vault | Every 6 months | QDB IT |
| SMTP password | Azure Key Vault | Annually | QDB IT |
| SMS gateway API key | Azure Key Vault | Annually | QDB IT |
| Database password | Azure Key Vault | Every 90 days | QDB IT |

### 11.2 Key Vault Access Pattern

The portal API accesses Key Vault using the App Service **managed identity** — no
credentials are stored in code, configuration files, or environment variables checked
into source control.

```
App Service Managed Identity
  → Azure Key Vault: Get (specific named secrets only)
  → No List permission — principle of least privilege
```

### 11.3 Secret Rotation Procedure

```bash
# Step 1: Generate new secret in the source system

# Step 2: Add new version to Azure Key Vault
az keyvault secret set \
  --vault-name qdb-sme-relief-kv \
  --name CRM_CLIENT_SECRET \
  --value "new-secret-value"

# Step 3: Portal picks up new version within 5 minutes (Key Vault SDK cache TTL)
#         Restart App Service instances if immediate take-up is required:
az webapp restart --resource-group qdb-sme-relief-prod-rg --name qdb-sme-relief-api

# Step 4: Verify integration is functional
curl https://sme-relief.qdb.com.qa/api/v1/health/integrations

# Step 5: Deactivate the old secret version in Key Vault
az keyvault secret set-attributes \
  --vault-name qdb-sme-relief-kv \
  --name CRM_CLIENT_SECRET \
  --version OLD_VERSION_ID \
  --enabled false

# Step 6: Record rotation in the QDB IT secret rotation log
```

### 11.4 Where Secrets Must Never Appear

- Git repositories (including `.env` files — always include `.env*` in `.gitignore`)
- Application logs (log summaries must never contain raw secret values or tokens)
- Error messages returned to any user or external system
- CRM case fields, notes, or attachments
- Slack, email, or any messaging platform (even internal)
- Azure Monitor logs or Application Insights traces

---

## 12. Pre-Deployment Checklist

Complete all items before deploying to production. Items marked **BLOCKER** must be
resolved before any production deployment can proceed.

### Integration Agreements

- [ ] **BLOCKER**: NAS / Tawtheeq client credentials issued by QDB IT for production
- [ ] **BLOCKER**: NAS production redirect URI registered and confirmed with NAS team
- [ ] **BLOCKER**: MOCI API key provisioned for production use
- [ ] **BLOCKER**: Dynamics CRM Azure AD service principal created with required permissions
- [ ] **BLOCKER**: CRM schema customisation (`qdb_disbursementcases` entity) deployed by QDB IT
- [ ] WPS API MOU signed between QDB and Ministry of Labor (or documented decision to use file-only fallback at launch)
- [ ] SMS gateway API key provisioned
- [ ] SMTP relay configured and verified for portal sender domain

### Security and Compliance

- [ ] **BLOCKER**: PDPA compliance assessment completed and signed off by QDB Data Protection Officer
- [ ] **BLOCKER**: QDB IT security review completed and sign-off received
- [ ] **BLOCKER**: Azure Key Vault provisioned with all secrets; managed identity configured
- [ ] Azure Front Door WAF policy enabled with Qatar geo-restriction
- [ ] Admin portal IP restriction configured (QDB VPN range only)
- [ ] Penetration test completed and all critical findings resolved
- [ ] Document encryption (AES-256) verified on Azure Blob Storage

### Infrastructure

- [ ] DNS record configured: `sme-relief.qdb.com.qa` resolves to Azure Front Door
- [ ] SSL certificate issued and validated (Azure-managed or imported)
- [ ] PostgreSQL Flexible Server provisioned with zone-redundant HA standby
- [ ] Azure Blob Storage container created with no public access
- [ ] Log Analytics workspace and Application Insights configured
- [ ] PagerDuty integration configured for critical alerts (production)
- [ ] Alert rules set and verified (test with intentional health check failure in staging)
- [ ] Database backup policy confirmed (35-day retention minimum; 7-year audit data)

### Application

- [ ] All environment variables set in Azure App Service Application Settings (not in code)
- [ ] Database migrations run against production database (`npx prisma migrate deploy`)
- [ ] Audit table tamper-protection SQL constraints applied
- [ ] Initial QDB Admin user seeded in database
- [ ] NRGP beneficiary list uploaded and activated via admin interface
- [ ] Eligibility criteria confirmed and active in database
- [ ] Program lifecycle configured: state = OPEN, end date set
- [ ] Full smoke test completed against staging environment (with real sandbox integrations)

---

## 5. Docker Setup

> **[PLANNED]**: The prototype does not use Docker. The following configuration is
> planned for staging and production deployments.

### 5.1 Next.js Web App Dockerfile

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3120

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3120
CMD ["node", "server.js"]
```

### 5.2 Fastify API Dockerfile [PLANNED]

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5014

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=apiuser:nodejs . .

USER apiuser
EXPOSE 5014
CMD ["node", "src/server.js"]
```

### 5.3 Docker Compose — Local Development Reference [PLANNED]

```yaml
version: '3.9'
services:
  web:
    build:
      context: ./apps/web
    ports:
      - "3120:3120"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_APP_URL=http://localhost:3120
      - NEXT_PUBLIC_API_URL=http://localhost:5014/api/v1
    depends_on:
      - api

  api:
    build:
      context: ./apps/api
    ports:
      - "5014:5014"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:localdev@db:5432/qdb_sme_relief
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: qdb_sme_relief
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: localdev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 8. Integration Configuration

> **[PLANNED]**: All integration configuration applies to the planned production backend.
> The current prototype mocks all external integrations.

### 8.1 Integration Overview

```mermaid
sequenceDiagram
    participant Portal as QDB SME Relief Portal
    participant KV as Azure Key Vault
    participant NAS as NAS Tawtheeq OIDC
    participant MOCI as MOCI CR API
    participant WPS as WPS System
    participant DocStore as Azure Blob Storage
    participant CRM as Dynamics 365 CRM

    Note over Portal,KV: Startup: Portal loads secrets from Key Vault via Managed Identity
    Portal->>KV: Get secrets
    KV-->>Portal: Credentials returned

    Note over Portal,NAS: Applicant authentication
    Portal->>NAS: OIDC Authorization Request
    NAS-->>Portal: ID Token (QID claim)

    Note over Portal,MOCI: Company verification
    Portal->>MOCI: GET /company/cr_number
    MOCI-->>Portal: Company name, status, shareholders

    Note over Portal,WPS: Salary validation
    Portal->>WPS: GET /payroll/cr_number?period=last_90_days
    WPS-->>Portal: Payroll records, employee count

    Note over Portal,DocStore: Document storage
    Portal->>DocStore: PUT document (AES-256, TLS 1.3)
    DocStore-->>Portal: Document URL + checksum

    Note over Portal,CRM: Case creation
    Portal->>CRM: POST disbursement case
    CRM-->>Portal: Case ID
```

### 8.2 NAS / Tawtheeq OIDC

**Protocol**: OIDC Authorization Code Flow with PKCE (preferred) or SAML 2.0.

| Attribute | Detail |
|-----------|--------|
| Assurance level | NAS Level 2 minimum; request Level 3 if available |
| Identity claim | QID (Qatar Identification Number) |
| Token validation | ID Token signature verified against NAS JWKS endpoint |
| Session model | Portal issues its own JWT after NAS validation; NAS session not maintained |
| Failure handling | NAS unavailable: display "try again in 30 minutes" with QDB Operations contact |
| Reference | QDB One ADR-002 (NAS via Keycloak gateway, SAML 2.0/OIDC, QID mapper) |

**Provisioning steps**:
1. QDB IT submits service registration request to NAS integration team
2. NAS provides `client_id`, `client_secret`, issuer URL, JWKS endpoint
3. Store credentials in Azure Key Vault; configure via `NAS_*` env vars
4. Register production and staging redirect URIs with NAS

### 8.3 MOCI CR API

**Protocol**: REST (JSON) — SOAP alternative may be required; confirm with MOCI.

| Attribute | Detail |
|-----------|--------|
| Authentication | API key in header: `X-API-Key: {MOCI_API_KEY}` |
| CR lookup endpoint | `GET /company/{cr_number}` |
| Response fields | Company name (Arabic + English), CR status, sector, registration date, authorised signatories |
| Latency requirement | Response within 3 seconds end-to-end (NFR-003) |
| Cache policy | Company data cached for current session only; not persisted post-submission |
| Error handling | CR not found: display not-found error. API down: display temporary error. Never allow manual bypass. |
| Retry policy | 2 retries with 1-second delay on 5xx errors |

**Provisioning steps**:
1. QDB IT requests API access from MOCI integration team
2. MOCI provides API key and CR endpoint documentation
3. Store API key in Key Vault; set `MOCI_API_BASE_URL` and `MOCI_API_KEY`

### 8.4 WPS System

> **Note**: The WPS integration mechanism must be confirmed with the Ministry of Labor.
> A data-sharing MOU between QDB and the Ministry of Labor is a prerequisite (PRD
> Assumption ASM-008). REST API is assumed; SFTP file transfer may be required as
> an alternative.

| Attribute | Detail |
|-----------|--------|
| Integration type | REST API or secure SFTP (TBC with Ministry of Labor) |
| Query key | CR number |
| Data returned | Employee count, total payroll (last 90 days), per-month breakdown, payment dates |
| Data age limit | WPS data must not be older than 90 days (BR-010) |
| Discrepancy threshold | 10% variance triggers `wps_discrepancy` flag; configurable via `WPS_DISCREPANCY_THRESHOLD_PCT` |
| Failure mode | API unavailable: use uploaded WPS CSV only; set `wps_api_fallback` flag on CRM case |
| Legal prerequisite | Data sharing MOU between QDB and Ministry of Labor (ASM-008) must be confirmed before integration work begins |

### 8.5 Dynamics 365 CRM

**Protocol**: Dynamics 365 Web API (REST/OData v4), OAuth 2.0 with Azure AD service principal.

| Attribute | Detail |
|-----------|--------|
| Authentication | Azure AD service principal — OAuth 2.0 client credentials flow |
| Case entity | `qdb_disbursementcases` (custom entity — QDB IT CRM admin must create before go-live) |
| Auto case | `case_type: auto_nrgp`, `status: pending_disbursement` |
| Manual case | `case_type: manual_review`, `status: pending_review` |
| Status polling | Portal polls CRM every 5 minutes for active application status changes |
| Retry on write failure | 3 retries with exponential backoff (base delay: 1 second); failures queued in Azure Service Bus |
| Secret rotation | CRM service principal client secret must be rotated every 90 days |

**Provisioning steps**:
1. QDB IT creates an Azure AD App Registration for the portal API
2. Generates client secret (90-day expiry; calendar reminder for rotation)
3. QDB CRM admin grants app registration access to Dynamics 365 environment
4. QDB CRM admin creates `qdb_disbursementcases` custom entity with all required fields
5. Test case creation in staging CRM before production go-live
6. Store `CRM_CLIENT_ID` and `CRM_CLIENT_SECRET` in Key Vault

### 8.6 Document Storage

**Azure Blob Storage container setup**:

```bash
# Create storage container (run once per environment)
az storage container create \
  --name qdb-sme-relief-documents \
  --account-name "${AZURE_STORAGE_ACCOUNT}" \
  --public-access off \
  --auth-mode login

# Apply lifecycle management policy (7-year retention per BR-008)
az storage account management-policy create \
  --account-name "${AZURE_STORAGE_ACCOUNT}" \
  --policy '{
    "rules": [{
      "name": "move-to-cool-tier",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": {"blobTypes": ["blockBlob"]},
        "actions": {
          "baseBlob": {"tierToCool": {"daysAfterModificationGreaterThan": 180}}
        }
      }
    }]
  }'
```

---

## 14. Current Prototype Setup

### 14.1 Prototype State

The current QDB SME Relief Portal is a **Next.js 14 prototype** running on port 3120.
It demonstrates the applicant-facing UI flow and admin dashboard layout, but has no
backend, database, or live integrations.

| Component | Status |
|-----------|--------|
| Next.js frontend — applicant flow | Prototype — functional UI |
| Next.js admin dashboard UI | Prototype — functional UI |
| NAS / Tawtheeq OIDC | Not implemented — mocked |
| MOCI API integration | Not implemented — mocked |
| WPS API integration | Not implemented — mocked |
| Dynamics 365 CRM integration | Not implemented — mocked |
| PostgreSQL database | Not implemented |
| Document storage (Azure Blob) | Not implemented — local simulation |
| Fastify API backend | Not implemented |
| Audit trail service | Not implemented |
| Notification service (email/SMS) | Not implemented |
| CI/CD pipeline | Not configured |
| Docker containers | Not configured |

### 14.2 Running the Prototype Locally

**Prerequisites**: Node.js 20+, npm 10+

```bash
# Navigate to the web app
cd products/qdb-sme-relief/apps/web

# Install dependencies
npm install

# Copy the environment template
# No real credentials are needed for the prototype
cp .env.example .env.local

# Start the development server
npm run dev
```

The prototype runs at `http://localhost:3120`. All integration responses are mocked
within the Next.js app. No external services or credentials are required.

### 14.3 Path to Production

Work required to move from prototype to production:

1. **Fastify API backend**: Implement API service with database, integration clients, session management, audit service, document handling, and notification service
2. **PostgreSQL schema**: Prisma schema for `applications`, `audit_events`, `nrgp_list`, `eligibility_criteria`, `users` tables
3. **NAS OIDC**: Provision credentials; implement OIDC Authorization Code flow with PKCE
4. **MOCI integration**: Obtain API access; implement CR lookup with retry and session caching
5. **WPS integration**: Confirm MOU with Ministry of Labor; implement after legal clearance
6. **CRM integration**: QDB IT provisions service principal and custom entity; implement Web API client with Service Bus retry queue
7. **Document storage**: Provision Azure Blob Storage; implement virus scanning pipeline
8. **CI/CD pipeline**: Configure GitHub Actions workflows and Azure App Service deployment slots
9. **Monitoring**: Configure Azure Application Insights and PagerDuty alert rules
10. **Secrets management**: Provision Azure Key Vault; configure App Service managed identity

---

*This document is confidential — QDB Internal Use Only.*
*For applicant-facing documentation, see USER-GUIDE.md.*
*For administrator operations, see ADMIN-GUIDE.md.*
