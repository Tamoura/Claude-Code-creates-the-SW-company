# Pre-Deploy Command

Production readiness checklist that verifies a ConnectSW product meets all operational requirements before deployment.

## Usage

```
/pre-deploy <product-name>
```

Examples:
```
/pre-deploy stablecoin-gateway
/pre-deploy connectin
/pre-deploy connectgrc
```

## Arguments

- **product-name**: Product directory name under `products/` (e.g., `stablecoin-gateway`, `connectin`)

## What This Command Does

This command runs a comprehensive production readiness checklist against a product's API and web applications. It verifies that all operational concerns are addressed before any deployment to staging or production. This is the final technical gate before the DevOps Engineer proceeds with deployment.

Unlike `/audit` (which scores code quality across 11 dimensions) or `/security-scan` (which checks OWASP Top 10), `/pre-deploy` focuses on **operational readiness**: health endpoints, environment configuration, database state, monitoring, resilience, and runtime safety.

**Reference protocols**:
- `.specify/memory/constitution.md` (Article VI: Quality, Article X: Deployment)
- `.claude/protocols/verification-before-completion.md` (5-step verification gate)
- `.claude/protocols/anti-rationalization.md` (The 1% Rule)
- `.claude/PORT-REGISTRY.md` (port assignments)

## Execution Steps

### Step 1: Validate Product Exists

```bash
PRODUCT_DIR="products/$ARGUMENTS"

if [ ! -d "$PRODUCT_DIR" ]; then
  echo "FAIL: Product directory '$PRODUCT_DIR' does not exist."
  echo "Available products:"
  ls products/
  exit 1
fi

echo "Pre-deploy check target: $ARGUMENTS"
echo "Product path: $PRODUCT_DIR"

# Detect product components
HAS_API="false"
HAS_WEB="false"
[ -d "$PRODUCT_DIR/apps/api" ] && HAS_API="true"
[ -d "$PRODUCT_DIR/apps/web" ] && HAS_WEB="true"

echo "Components: API=$HAS_API, Web=$HAS_WEB"
```

### Step 2: Load Product Context

Read the product context:
- File: `products/$ARGUMENTS/README.md`
- File: `products/$ARGUMENTS/.claude/addendum.md` (if exists)
- File: `.claude/PORT-REGISTRY.md` (get assigned ports for this product)

### Step 3: Health and Readiness Endpoints

Verify that the API exposes `/health` and `/ready` endpoints.

```bash
echo "=== CHECK: Health & Readiness Endpoints ==="

if [ "$HAS_API" = "true" ]; then
  # Search for health endpoint registration
  echo "--- /health endpoint ---"
  grep -rn --include="*.ts" \
    -E "(\/health|health.*route|registerHealth|healthCheck|health-check)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || echo "  FAIL: No /health endpoint found"

  # Search for readiness endpoint registration
  echo "--- /ready endpoint ---"
  grep -rn --include="*.ts" \
    -E "(\/ready|readiness|readyCheck|ready-check|\/readyz|\/readiness)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || echo "  FAIL: No /ready endpoint found"

  # Check that health endpoint verifies dependencies (not just returning 200)
  echo "--- Health check depth ---"
  grep -rn --include="*.ts" -A 5 \
    -E "(healthCheck|health.*handler)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null | \
    grep -iE "(database|redis|postgres|prisma|connection|ping)" || \
    echo "  WARN: Health check may not verify database connectivity"
else
  echo "  SKIP: No API component"
fi
```

### Step 4: Environment Variables Documentation

Verify that all required environment variables are documented and accounted for.

```bash
echo ""
echo "=== CHECK: Environment Variables ==="

# Find all env references in code
echo "--- Environment variables used in code ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -oE "process\.env\.[A-Z_]+" \
  "$PRODUCT_DIR/apps/" 2>/dev/null | \
  sed 's/.*process\.env\.//' | sort -u

# Check for .env.example or .env.template
echo "--- Environment documentation ---"
for env_doc in ".env.example" ".env.template" ".env.sample" "env.example"; do
  if [ -f "$PRODUCT_DIR/$env_doc" ] || [ -f "$PRODUCT_DIR/apps/api/$env_doc" ]; then
    echo "  PASS: Found $env_doc"
    found_env_doc="true"
  fi
done
[ -z "$found_env_doc" ] && echo "  FAIL: No .env.example or .env.template found"

# Check for hardcoded secrets (should be in env vars)
echo "--- Hardcoded secrets scan ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -iE "(password\s*=\s*['\"][^'\"]{4,}|secret\s*=\s*['\"][^'\"]{4,}|api[_-]?key\s*=\s*['\"][^'\"]{4,})" \
  "$PRODUCT_DIR/apps/" 2>/dev/null | grep -v "test" | grep -v "spec" | grep -v "mock" || \
  echo "  PASS: No hardcoded secrets detected (excluding test files)"
```

### Step 5: Database Migrations

Verify that database migrations are up to date and properly managed.

```bash
echo ""
echo "=== CHECK: Database Migrations ==="

if [ "$HAS_API" = "true" ]; then
  # Check for Prisma migrations directory
  echo "--- Migration files ---"
  if [ -d "$PRODUCT_DIR/apps/api/prisma/migrations" ]; then
    migration_count=$(ls -d "$PRODUCT_DIR/apps/api/prisma/migrations"/*/ 2>/dev/null | wc -l | tr -d ' ')
    echo "  PASS: $migration_count migrations found"

    # Check for pending schema changes (schema.prisma vs last migration)
    echo "--- Prisma schema status ---"
    if [ -f "$PRODUCT_DIR/apps/api/prisma/schema.prisma" ]; then
      echo "  Schema file exists"
      # Check if schema was modified more recently than last migration
      schema_time=$(stat -c %Y "$PRODUCT_DIR/apps/api/prisma/schema.prisma" 2>/dev/null || stat -f %m "$PRODUCT_DIR/apps/api/prisma/schema.prisma" 2>/dev/null)
      last_migration=$(ls -td "$PRODUCT_DIR/apps/api/prisma/migrations"/*/ 2>/dev/null | head -1)
      if [ -n "$last_migration" ]; then
        migration_time=$(stat -c %Y "${last_migration}migration.sql" 2>/dev/null || stat -f %m "${last_migration}migration.sql" 2>/dev/null)
        if [ -n "$schema_time" ] && [ -n "$migration_time" ] && [ "$schema_time" -gt "$migration_time" ]; then
          echo "  WARN: Schema file is newer than last migration. Run 'npx prisma migrate dev' to check for pending changes."
        else
          echo "  PASS: Schema appears in sync with migrations"
        fi
      fi
    else
      echo "  FAIL: No schema.prisma found"
    fi
  else
    echo "  WARN: No Prisma migrations directory found"
  fi

  # Check for migration scripts in package.json
  echo "--- Migration scripts ---"
  grep -n "migrate" "$PRODUCT_DIR/apps/api/package.json" 2>/dev/null || \
    echo "  WARN: No migration scripts in package.json"
else
  echo "  SKIP: No API component"
fi
```

### Step 6: Error Monitoring Configuration

Verify that error monitoring/observability is configured.

```bash
echo ""
echo "=== CHECK: Error Monitoring ==="

# Check for error monitoring libraries
echo "--- Monitoring libraries ---"
grep -E "(sentry|datadog|newrelic|bugsnag|rollbar|elastic-apm|opentelemetry|pino.*transport)" \
  "$PRODUCT_DIR/apps/api/package.json" 2>/dev/null || \
  echo "  WARN: No error monitoring library in API dependencies"

if [ "$HAS_WEB" = "true" ]; then
  grep -E "(sentry|datadog|newrelic|bugsnag|rollbar|elastic-rum|opentelemetry)" \
    "$PRODUCT_DIR/apps/web/package.json" 2>/dev/null || \
    echo "  WARN: No error monitoring library in Web dependencies"
fi

# Check for error monitoring initialization
echo "--- Monitoring initialization ---"
grep -rn --include="*.ts" \
  -iE "(Sentry\.init|initMonitoring|setupErrorTracking|instrument|errorHandler)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || \
  echo "  WARN: No error monitoring initialization found"

# Check for global error handlers
echo "--- Global error handlers ---"
grep -rn --include="*.ts" \
  -E "(setErrorHandler|onError|process\.on.*uncaughtException|process\.on.*unhandledRejection)" \
  "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
  echo "  WARN: No global error handler found in API"
```

### Step 7: Graceful Shutdown

Verify that the application handles SIGTERM/SIGINT for graceful shutdown.

```bash
echo ""
echo "=== CHECK: Graceful Shutdown ==="

if [ "$HAS_API" = "true" ]; then
  # Check for signal handlers
  echo "--- Signal handlers ---"
  grep -rn --include="*.ts" \
    -E "(SIGTERM|SIGINT|graceful.*shut|server\.close|app\.close|beforeExit|process\.on.*signal)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
    echo "  FAIL: No graceful shutdown handler found"

  # Check for Fastify close hooks
  echo "--- Fastify close hooks ---"
  grep -rn --include="*.ts" \
    -E "(onClose|addHook.*onClose|fastify\.close)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
    echo "  WARN: No Fastify onClose hooks found"

  # Check for database connection cleanup
  echo "--- Connection cleanup ---"
  grep -rn --include="*.ts" \
    -E "(prisma\.\$disconnect|pool\.end|connection\.close|redis\.quit)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
    echo "  WARN: No explicit database connection cleanup found"
else
  echo "  SKIP: No API component"
fi
```

### Step 8: Rate Limiting

Verify that rate limiting is configured on the API.

```bash
echo ""
echo "=== CHECK: Rate Limiting ==="

if [ "$HAS_API" = "true" ]; then
  # Check for rate limiting library
  echo "--- Rate limiting library ---"
  grep -E "(rate-limit|@fastify/rate-limit|express-rate-limit|bottleneck|rate-limiter)" \
    "$PRODUCT_DIR/apps/api/package.json" 2>/dev/null || \
    echo "  FAIL: No rate limiting library in API dependencies"

  # Check for rate limiting configuration
  echo "--- Rate limiting configuration ---"
  grep -rn --include="*.ts" \
    -iE "(rateLimit|rateLimiter|maxRequests|windowMs|rate_limit|throttle)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
    echo "  FAIL: No rate limiting configuration found"

  # Check for per-route rate limits on sensitive endpoints
  echo "--- Sensitive endpoint rate limits ---"
  grep -rn --include="*.ts" -B 3 -A 3 \
    -E "(login|signin|signup|register|reset-password|forgot-password)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null | \
    grep -iE "(rateLimit|limit)" || \
    echo "  WARN: Auth endpoints may lack per-route rate limits"
else
  echo "  SKIP: No API component"
fi
```

### Step 9: CORS Configuration

Verify that CORS is properly configured.

```bash
echo ""
echo "=== CHECK: CORS Configuration ==="

if [ "$HAS_API" = "true" ]; then
  # Check for CORS library/plugin
  echo "--- CORS library ---"
  grep -E "(@fastify/cors|cors)" \
    "$PRODUCT_DIR/apps/api/package.json" 2>/dev/null || \
    echo "  FAIL: No CORS library in API dependencies"

  # Check for CORS configuration
  echo "--- CORS configuration ---"
  grep -rn --include="*.ts" \
    -iE "(cors|origin.*http|allowedOrigins|Access-Control)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
    echo "  FAIL: No CORS configuration found"

  # Check for wildcard CORS (security risk in production)
  echo "--- Wildcard CORS check ---"
  grep -rn --include="*.ts" \
    -E "origin.*['\"]?\*['\"]?" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null && \
    echo "  WARN: Wildcard CORS origin detected. Restrict to specific domains in production." || \
    echo "  PASS: No wildcard CORS origin found"
else
  echo "  SKIP: No API component"
fi
```

### Step 10: Structured Logging

Verify that structured logging is enabled (not `console.log`).

```bash
echo ""
echo "=== CHECK: Structured Logging ==="

if [ "$HAS_API" = "true" ]; then
  # Check for structured logging library
  echo "--- Logging library ---"
  grep -E "(pino|winston|bunyan|@fastify/.*log)" \
    "$PRODUCT_DIR/apps/api/package.json" 2>/dev/null || \
    echo "  FAIL: No structured logging library in API dependencies"

  # Check for logger initialization
  echo "--- Logger initialization ---"
  grep -rn --include="*.ts" \
    -iE "(pino\(|createLogger|winston\.create|logger.*=.*pino|fastify.*logger)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
    echo "  WARN: No logger initialization found"

  # Check for raw console.log in production code (should use structured logger)
  echo "--- console.log usage (should be minimal) ---"
  console_count=$(grep -rn --include="*.ts" "console\.\(log\|warn\|error\|info\)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null | \
    grep -v "test" | grep -v "spec" | grep -v "// " | wc -l | tr -d ' ')
  if [ "$console_count" -gt 5 ]; then
    echo "  WARN: $console_count console.* calls found in API source. Replace with structured logger."
  elif [ "$console_count" -gt 0 ]; then
    echo "  INFO: $console_count console.* calls found (low count, acceptable)"
  else
    echo "  PASS: No raw console.* calls in API source"
  fi

  # Check for request logging
  echo "--- Request logging ---"
  grep -rn --include="*.ts" \
    -iE "(requestLog|accessLog|request.*log|log.*request|onRequest.*log)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
    echo "  INFO: Fastify has built-in request logging when logger is enabled"
else
  echo "  SKIP: No API component"
fi
```

### Step 11: Additional Production Checks

```bash
echo ""
echo "=== CHECK: Additional Production Readiness ==="

# Check for Dockerfile or containerization
echo "--- Containerization ---"
find "$PRODUCT_DIR" -maxdepth 3 -name "Dockerfile" -o -name "docker-compose*.yml" 2>/dev/null | \
  head -5 || echo "  WARN: No Dockerfile or docker-compose found"

# Check for CI/CD pipeline
echo "--- CI/CD pipeline ---"
if ls .github/workflows/*"$ARGUMENTS"* 2>/dev/null; then
  echo "  PASS: Product-specific workflow found"
elif ls .github/workflows/*.yml 2>/dev/null | head -1 > /dev/null 2>&1; then
  echo "  INFO: Generic workflows exist but no product-specific workflow"
else
  echo "  WARN: No CI/CD workflows found"
fi

# Check for TypeScript strict mode
echo "--- TypeScript strict mode ---"
for tsconfig in "$PRODUCT_DIR/apps/api/tsconfig.json" "$PRODUCT_DIR/apps/web/tsconfig.json" "$PRODUCT_DIR/tsconfig.json"; do
  if [ -f "$tsconfig" ]; then
    grep -q '"strict".*true' "$tsconfig" 2>/dev/null && \
      echo "  PASS: strict mode enabled in $tsconfig" || \
      echo "  WARN: strict mode not enabled in $tsconfig"
  fi
done

# Check for production build script
echo "--- Build scripts ---"
if [ "$HAS_API" = "true" ]; then
  grep -q '"build"' "$PRODUCT_DIR/apps/api/package.json" 2>/dev/null && \
    echo "  PASS: API build script exists" || \
    echo "  FAIL: No build script in API package.json"
fi
if [ "$HAS_WEB" = "true" ]; then
  grep -q '"build"' "$PRODUCT_DIR/apps/web/package.json" 2>/dev/null && \
    echo "  PASS: Web build script exists" || \
    echo "  FAIL: No build script in Web package.json"
fi

# Check for NODE_ENV handling
echo "--- NODE_ENV handling ---"
grep -rn --include="*.ts" \
  -E "NODE_ENV|process\.env\.NODE_ENV" \
  "$PRODUCT_DIR/apps/" 2>/dev/null | head -5 || \
  echo "  WARN: No NODE_ENV references found"
```

### Step 12: Generate Pre-Deploy Report

After running all checks, compile results into a structured report.

**Report format**:

```markdown
## Pre-Deploy Readiness Report: [product-name]

**Date**: [YYYY-MM-DD]
**Product**: [product-name]
**Checker**: DevOps Engineer Agent (Pre-Deploy Module)
**Components**: API=[yes/no], Web=[yes/no]

### Summary

[2-3 sentence overall production readiness assessment]

### Results

| # | Category | Check Item | Status | Details |
|---|----------|-----------|--------|---------|
| 1 | Health | /health endpoint exists | PASS/FAIL | [file:line or "Missing"] |
| 2 | Health | /ready endpoint exists | PASS/FAIL | [file:line or "Missing"] |
| 3 | Health | Health check verifies dependencies | PASS/WARN/FAIL | [deps checked or "Shallow"] |
| 4 | Config | .env.example documented | PASS/FAIL | [file or "Missing"] |
| 5 | Config | No hardcoded secrets | PASS/FAIL | [violations or "Clean"] |
| 6 | Database | Migrations exist | PASS/WARN/FAIL | [count or "None"] |
| 7 | Database | Schema in sync with migrations | PASS/WARN/FAIL | [status] |
| 8 | Database | Migration scripts in package.json | PASS/WARN | [script or "Missing"] |
| 9 | Monitoring | Error monitoring library installed | PASS/WARN | [library or "Missing"] |
| 10 | Monitoring | Monitoring initialized | PASS/WARN | [location or "Missing"] |
| 11 | Monitoring | Global error handler | PASS/WARN | [location or "Missing"] |
| 12 | Resilience | Graceful shutdown handler | PASS/FAIL | [signals handled or "Missing"] |
| 13 | Resilience | Connection cleanup on shutdown | PASS/WARN | [resources or "Missing"] |
| 14 | Security | Rate limiting library installed | PASS/FAIL | [library or "Missing"] |
| 15 | Security | Rate limiting configured | PASS/FAIL | [config or "Missing"] |
| 16 | Security | Auth endpoint rate limits | PASS/WARN | [endpoints or "Missing"] |
| 17 | Security | CORS library installed | PASS/FAIL | [library or "Missing"] |
| 18 | Security | CORS configured (no wildcard) | PASS/WARN/FAIL | [origins or "Wildcard"] |
| 19 | Logging | Structured logging library | PASS/FAIL | [library or "Missing"] |
| 20 | Logging | Logger initialized | PASS/WARN | [location or "Missing"] |
| 21 | Logging | Minimal console.log usage | PASS/WARN | [count or "Clean"] |
| 22 | Infra | Dockerfile/containerization | PASS/WARN | [file or "Missing"] |
| 23 | Infra | CI/CD pipeline | PASS/WARN | [workflow or "Missing"] |
| 24 | Infra | TypeScript strict mode | PASS/WARN | [config or "Not strict"] |
| 25 | Infra | Production build script | PASS/FAIL | [script or "Missing"] |

### Scoring

- **PASS**: [count] / 25
- **WARN**: [count] / 25
- **FAIL**: [count] / 25

### Deploy Verdict

| Category | Verdict |
|----------|---------|
| Health Endpoints | PASS / FAIL |
| Environment Config | PASS / FAIL |
| Database Readiness | PASS / WARN / FAIL |
| Error Monitoring | PASS / WARN |
| Resilience | PASS / FAIL |
| Security Controls | PASS / FAIL |
| Structured Logging | PASS / FAIL |
| Infrastructure | PASS / WARN |
| **Overall** | **GO / NO-GO** |

Verdict logic:
- **GO**: All categories PASS or have only warnings with documented mitigation.
- **NO-GO**: Any FAIL in Health, Security, Resilience, or Logging categories. These are hard blockers for production deployment.
- Warnings in Database, Monitoring, or Infrastructure categories can proceed with a remediation plan attached to the deployment ticket.

### Remediation Actions

| Priority | Action | Owner | Category |
|----------|--------|-------|----------|
| [P0/P1/P2] | [specific action] | [agent role] | [Health/Config/DB/Monitoring/Resilience/Security/Logging/Infra] |

### Pre-Deploy Checklist (Manual Verification)

These items cannot be fully verified from source code alone and require manual confirmation:

- [ ] Database backup has been taken before migration
- [ ] Staging environment has been tested with production-like data
- [ ] Rollback plan is documented and tested
- [ ] On-call engineer is assigned for the deployment window
- [ ] External service API keys are configured in production environment
- [ ] DNS/load balancer configuration is verified
- [ ] SSL certificates are valid and not expiring within 30 days
```

### Step 13: Save Report

Save the pre-deploy report to:
```
products/$ARGUMENTS/docs/quality-reports/pre-deploy-[YYYY-MM-DD].md
```

Create the directory if it does not exist:
```bash
mkdir -p "products/$ARGUMENTS/docs/quality-reports"
```

### Step 14: Log to Audit Trail

```bash
.claude/scripts/post-task-update.sh devops-engineer PRE-DEPLOY-$ARGUMENTS $ARGUMENTS success 0 "Pre-deploy check completed: [GO/NO-GO]"
```

## Status Definitions

| Status | Meaning |
|--------|---------|
| **PASS** | Check item fully satisfied. Production-ready. |
| **WARN** | Check item partially satisfied. Can deploy with documented risk acceptance. |
| **FAIL** | Check item missing or broken. Deployment blocked until resolved. |
| **SKIP** | Check item not applicable (e.g., API checks when product has no API). |

## Relationship to Other Commands

| Command | Relationship |
|---------|-------------|
| `/audit` | Full code quality audit (11 dimensions). `/pre-deploy` focuses on operational readiness, not code quality. Run `/audit` first, then `/pre-deploy`. |
| `/security-scan` | OWASP Top 10 scan. `/pre-deploy` checks rate limiting and CORS but does not cover injection/XSS. Run both before production. |
| `/compliance-check` | Regulatory compliance for financial products. Must pass before `/pre-deploy` for `stablecoin-gateway` and `connectgrc`. |
| `/check-system` | System-wide infrastructure health. `/pre-deploy` is product-specific. |
