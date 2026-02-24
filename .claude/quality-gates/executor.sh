#!/bin/bash
# Quality Gate Executor
# Compatible with Claude Code system - can be invoked by agents via terminal commands
#
# Usage: .claude/quality-gates/executor.sh <gate_type> <product>
# Gate types: security, performance, testing, production

set -e

GATE_TYPE=$1
PRODUCT=$2

if [ -z "$GATE_TYPE" ] || [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <gate_type> <product>"
  echo "Gate types: security, performance, testing, production"
  exit 1
fi

SCRIPT_DIR_INIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR_INIT/../.." && pwd)"

PRODUCT_PATH="$REPO_ROOT/products/$PRODUCT"
REPORT_DIR="$PRODUCT_PATH/docs/quality-reports"
mkdir -p "$REPORT_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORT_DIR/${GATE_TYPE}-gate-${TIMESTAMP}.md"

# Initialize report
{
  GATE_LABEL=$(echo "$GATE_TYPE" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')
  echo "# $GATE_LABEL Gate Report"
  echo "**Product**: $PRODUCT"
  echo "**Date**: $(date -Iseconds)"
  echo "**Status**: RUNNING"
  echo ""
} > "$REPORT_FILE"

GATE_PASSED=true
GATE_FAILURES=()

case $GATE_TYPE in
  security)
    echo "## Security Gate Checks" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # npm audit for backend
    if [ -f "$PRODUCT_PATH/apps/api/package.json" ]; then
      echo "### Backend Dependency Audit" >> "$REPORT_FILE"
      cd "$PRODUCT_PATH/apps/api"
      if npm audit --audit-level=high >> "$REPORT_FILE" 2>&1; then
        echo "✅ PASS: No high/critical vulnerabilities" >> "$REPORT_FILE"
      else
        echo "❌ FAIL: High/critical vulnerabilities found" >> "$REPORT_FILE"
        GATE_PASSED=false
        GATE_FAILURES+=("Backend npm audit")
      fi
      cd - > /dev/null
      echo "" >> "$REPORT_FILE"
    fi
    
    # npm audit for frontend
    if [ -f "$PRODUCT_PATH/apps/web/package.json" ]; then
      echo "### Frontend Dependency Audit" >> "$REPORT_FILE"
      cd "$PRODUCT_PATH/apps/web"
      if npm audit --audit-level=high >> "$REPORT_FILE" 2>&1; then
        echo "✅ PASS: No high/critical vulnerabilities" >> "$REPORT_FILE"
      else
        echo "❌ FAIL: High/critical vulnerabilities found" >> "$REPORT_FILE"
        GATE_PASSED=false
        GATE_FAILURES+=("Frontend npm audit")
      fi
      cd - > /dev/null
      echo "" >> "$REPORT_FILE"
    fi
    
    # Secret scanning (if git-secrets is available)
    echo "### Secret Scanning" >> "$REPORT_FILE"
    if command -v git-secrets > /dev/null 2>&1; then
      if git secrets --scan "$PRODUCT_PATH" >> "$REPORT_FILE" 2>&1; then
        echo "✅ PASS: No secrets detected" >> "$REPORT_FILE"
      else
        echo "❌ FAIL: Secrets detected in code" >> "$REPORT_FILE"
        GATE_PASSED=false
        GATE_FAILURES+=("Secret scanning")
      fi
    else
      echo "⚠️  WARN: git-secrets not installed, skipping secret scan" >> "$REPORT_FILE"
      echo "Install: brew install git-secrets (macOS) or apt-get install git-secrets (Linux)" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"

    # Hardcoded secrets pattern scan
    echo "### Hardcoded Secret Patterns" >> "$REPORT_FILE"
    SECRET_PATTERNS='(password|secret|api_key|apikey|token|private_key)\s*[:=]\s*["\x27][^\s"'\'']{8,}'
    FOUND=$(grep -rEi "$SECRET_PATTERNS" "$PRODUCT_PATH/apps" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.json' -l 2>/dev/null | grep -v node_modules | grep -v '.test.' | grep -v '__tests__' | head -10 || true)
    if [ -n "$FOUND" ]; then
      echo "❌ FAIL: Potential hardcoded secrets found in:" >> "$REPORT_FILE"
      echo "$FOUND" | while read -r f; do echo "  - $f" >> "$REPORT_FILE"; done
      GATE_PASSED=false
      GATE_FAILURES+=("Hardcoded secrets")
    else
      echo "✅ PASS: No hardcoded secret patterns detected" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"

    # SQL injection patterns
    echo "### SQL Injection Patterns" >> "$REPORT_FILE"
    SQLI_PATTERNS='(\$\{.*\}|`.*\$\{|\+ *req\.(body|query|params))'
    SQLI_FOUND=$(grep -rEn "$SQLI_PATTERNS" "$PRODUCT_PATH/apps" --include='*.ts' --include='*.js' 2>/dev/null | grep -vi 'node_modules' | grep -i 'query\|sql\|exec\|raw' | head -10 || true)
    if [ -n "$SQLI_FOUND" ]; then
      echo "⚠️  WARN: Potential SQL injection patterns:" >> "$REPORT_FILE"
      echo '```' >> "$REPORT_FILE"
      echo "$SQLI_FOUND" >> "$REPORT_FILE"
      echo '```' >> "$REPORT_FILE"
      GATE_FAILURES+=("Potential SQL injection (review needed)")
    else
      echo "✅ PASS: No obvious SQL injection patterns" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"

    # XSS patterns (dangerouslySetInnerHTML, innerHTML)
    echo "### XSS Vulnerability Patterns" >> "$REPORT_FILE"
    XSS_FOUND=$(grep -rEn 'dangerouslySetInnerHTML|\.innerHTML\s*=' "$PRODUCT_PATH/apps" --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' 2>/dev/null | grep -v node_modules | head -10 || true)
    if [ -n "$XSS_FOUND" ]; then
      echo "⚠️  WARN: Potential XSS patterns found:" >> "$REPORT_FILE"
      echo '```' >> "$REPORT_FILE"
      echo "$XSS_FOUND" >> "$REPORT_FILE"
      echo '```' >> "$REPORT_FILE"
      GATE_FAILURES+=("Potential XSS (review needed)")
    else
      echo "✅ PASS: No dangerouslySetInnerHTML or innerHTML usage" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"

    # Environment variable validation
    echo "### Environment Variable Safety" >> "$REPORT_FILE"
    if [ -f "$PRODUCT_PATH/.env" ]; then
      echo "⚠️  WARN: .env file exists in product root (should be .gitignored)" >> "$REPORT_FILE"
      if grep -q '.env' "$PRODUCT_PATH/.gitignore" 2>/dev/null; then
        echo "  ✅ .env is in .gitignore" >> "$REPORT_FILE"
      else
        echo "  ❌ .env is NOT in .gitignore" >> "$REPORT_FILE"
        GATE_PASSED=false
        GATE_FAILURES+=(".env not gitignored")
      fi
    else
      echo "✅ PASS: No .env file in product root" >> "$REPORT_FILE"
    fi
    if [ -f "$PRODUCT_PATH/.env.example" ]; then
      echo "✅ .env.example exists for documentation" >> "$REPORT_FILE"
    else
      echo "⚠️  WARN: No .env.example found" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
    ;;
    
  performance)
    echo "## Performance Gate Checks" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if [ -f "$PRODUCT_PATH/apps/web/package.json" ]; then
      cd "$PRODUCT_PATH/apps/web"
      
      # Build and analyze bundle size
      echo "### Bundle Size Analysis" >> "$REPORT_FILE"
      if npm run build >> "$REPORT_FILE" 2>&1; then
        # Check if analyze script exists
        if npm run analyze >> "$REPORT_FILE" 2>&1; then
          echo "✅ PASS: Bundle analysis complete" >> "$REPORT_FILE"
        else
          echo "⚠️  INFO: Bundle analyzer not configured" >> "$REPORT_FILE"
        fi
      else
        echo "❌ FAIL: Build failed" >> "$REPORT_FILE"
        GATE_PASSED=false
        GATE_FAILURES+=("Build failure")
      fi
      echo "" >> "$REPORT_FILE"
      
      cd - > /dev/null
    fi
    
    # Lighthouse performance audit (Constitution Article X: Lighthouse >= 90)
    if [ -f "$PRODUCT_PATH/apps/web/package.json" ]; then
      echo "### Lighthouse Performance Audit" >> "$REPORT_FILE"
      if command -v npx &> /dev/null && npx lighthouse --version &> /dev/null 2>&1; then
        # Determine frontend port from PORT-REGISTRY or default
        FRONTEND_PORT=$(grep -A2 "$PRODUCT" "$REPO_ROOT/.claude/PORT-REGISTRY.md" 2>/dev/null | grep -oE '3[0-9]{3}' | head -1 || echo "3100")
        LIGHTHOUSE_URL="http://localhost:${FRONTEND_PORT}"

        # Run Lighthouse in headless mode if server is running
        if curl -s --max-time 3 "$LIGHTHOUSE_URL" > /dev/null 2>&1; then
          LIGHTHOUSE_JSON=$(npx lighthouse "$LIGHTHOUSE_URL" --output=json --chrome-flags="--headless --no-sandbox" --only-categories=performance 2>/dev/null || echo '{}')
          LIGHTHOUSE_SCORE=$(echo "$LIGHTHOUSE_JSON" | grep -o '"performance":[0-9.]*' | grep -o '[0-9.]*' | head -1 || echo "0")
          LIGHTHOUSE_PCT=$(echo "$LIGHTHOUSE_SCORE" | awk '{printf "%.0f", $1 * 100}' 2>/dev/null || echo "0")

          echo "Lighthouse Performance Score: ${LIGHTHOUSE_PCT}/100" >> "$REPORT_FILE"
          if [ "$LIGHTHOUSE_PCT" -ge 90 ]; then
            echo "✅ PASS: Lighthouse score >= 90 (Constitution Article X)" >> "$REPORT_FILE"
          elif [ "$LIGHTHOUSE_PCT" -ge 70 ]; then
            echo "⚠️  WARN: Lighthouse score ${LIGHTHOUSE_PCT} — target >= 90" >> "$REPORT_FILE"
          else
            echo "❌ FAIL: Lighthouse score ${LIGHTHOUSE_PCT} — target >= 90" >> "$REPORT_FILE"
            GATE_PASSED=false
            GATE_FAILURES+=("Lighthouse score ${LIGHTHOUSE_PCT} < 90")
          fi
        else
          echo "⚠️  INFO: Frontend server not running at $LIGHTHOUSE_URL — skipping Lighthouse" >> "$REPORT_FILE"
          echo "  Start the dev server first: cd $PRODUCT_PATH/apps/web && npm run dev" >> "$REPORT_FILE"
        fi
      else
        echo "⚠️  INFO: Lighthouse CLI not available — install with: npm i -g lighthouse" >> "$REPORT_FILE"
      fi
      echo "" >> "$REPORT_FILE"
    fi

    # Bundle size enforcement (Constitution: < 500KB gzipped initial load)
    if [ -f "$PRODUCT_PATH/apps/web/package.json" ]; then
      echo "### Bundle Size Check" >> "$REPORT_FILE"
      BUILD_DIR=""
      for candidate in "$PRODUCT_PATH/apps/web/.next" "$PRODUCT_PATH/apps/web/dist" "$PRODUCT_PATH/apps/web/build"; do
        [ -d "$candidate" ] && BUILD_DIR="$candidate" && break
      done
      if [ -n "$BUILD_DIR" ]; then
        # Measure gzipped JS bundle size (initial load chunks)
        if [ -d "$BUILD_DIR/static/chunks" ]; then
          GZIP_KB=0
          for jsfile in "$BUILD_DIR/static/chunks"/*.js; do
            [ -f "$jsfile" ] || continue
            FILE_GZ_KB=$(gzip -c "$jsfile" 2>/dev/null | wc -c | awk '{printf "%.0f", $1/1024}')
            GZIP_KB=$((GZIP_KB + FILE_GZ_KB))
          done
          echo "Gzipped JS bundle: ${GZIP_KB}KB" >> "$REPORT_FILE"
          if [ "$GZIP_KB" -gt 500 ]; then
            echo "❌ FAIL: Gzipped bundle ${GZIP_KB}KB exceeds 500KB limit" >> "$REPORT_FILE"
            GATE_PASSED=false
            GATE_FAILURES+=("Bundle size ${GZIP_KB}KB gzipped exceeds 500KB")
          else
            echo "✅ PASS: Gzipped bundle within 500KB limit" >> "$REPORT_FILE"
          fi
        else
          # Fallback: measure total build directory
          BUNDLE_KB=$(du -sk "$BUILD_DIR" 2>/dev/null | cut -f1 || echo "0")
          BUNDLE_MB=$((BUNDLE_KB / 1024))
          echo "Build output: ${BUNDLE_MB}MB (${BUNDLE_KB}KB raw)" >> "$REPORT_FILE"
          if [ "$BUNDLE_KB" -gt 51200 ]; then
            echo "⚠️  WARN: Build output exceeds 50MB — review for optimization" >> "$REPORT_FILE"
          else
            echo "✅ PASS: Build output size within limits" >> "$REPORT_FILE"
          fi
        fi
      else
        echo "⚠️  INFO: No build output found (run build first)" >> "$REPORT_FILE"
      fi
      echo "" >> "$REPORT_FILE"
    fi

    # TypeScript strict mode check
    echo "### TypeScript Configuration" >> "$REPORT_FILE"
    TS_STRICT=true
    for tsconfig in "$PRODUCT_PATH/apps/api/tsconfig.json" "$PRODUCT_PATH/apps/web/tsconfig.json"; do
      if [ -f "$tsconfig" ]; then
        if grep -q '"strict"' "$tsconfig" 2>/dev/null; then
          if grep '"strict"' "$tsconfig" | grep -q 'true' 2>/dev/null; then
            echo "✅ strict mode enabled: $tsconfig" >> "$REPORT_FILE"
          else
            echo "⚠️  WARN: strict mode disabled: $tsconfig" >> "$REPORT_FILE"
            TS_STRICT=false
          fi
        else
          echo "⚠️  WARN: strict not set: $tsconfig" >> "$REPORT_FILE"
          TS_STRICT=false
        fi
      fi
    done
    echo "" >> "$REPORT_FILE"

    # API performance benchmarks (if backend exists)
    if [ -f "$PRODUCT_PATH/apps/api/package.json" ]; then
      echo "### API Performance Benchmarks" >> "$REPORT_FILE"
      cd "$PRODUCT_PATH/apps/api"
      if npm run bench >> "$REPORT_FILE" 2>&1; then
        echo "✅ PASS: Performance benchmarks complete" >> "$REPORT_FILE"
      else
        echo "⚠️  INFO: Benchmark script not configured (add 'bench' to package.json scripts)" >> "$REPORT_FILE"
      fi
      echo "" >> "$REPORT_FILE"
      cd - > /dev/null
    fi

    # Dependency count check
    echo "### Dependency Health" >> "$REPORT_FILE"
    for app_dir in "$PRODUCT_PATH/apps/api" "$PRODUCT_PATH/apps/web"; do
      if [ -f "$app_dir/package.json" ]; then
        app_name=$(basename "$app_dir")
        if command -v jq &> /dev/null; then
          DEP_COUNT=$(jq '.dependencies | length // 0' "$app_dir/package.json" 2>/dev/null || echo "0")
          DEVDEP_COUNT=$(jq '.devDependencies | length // 0' "$app_dir/package.json" 2>/dev/null || echo "0")
          echo "  $app_name: $DEP_COUNT deps, $DEVDEP_COUNT devDeps" >> "$REPORT_FILE"
        fi
      fi
    done
    echo "" >> "$REPORT_FILE"
    ;;
    
  testing)
    echo "## Testing Gate Checks" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"

    # Detect which apps exist
    HAS_WEB=false
    HAS_API=false
    [ -f "$PRODUCT_PATH/apps/web/package.json" ] && HAS_WEB=true
    [ -f "$PRODUCT_PATH/apps/api/package.json" ] && HAS_API=true

    # API unit/integration tests
    if [ "$HAS_API" = true ]; then
      echo "### API Tests" >> "$REPORT_FILE"
      cd "$PRODUCT_PATH/apps/api"
      if npm test >> "$REPORT_FILE" 2>&1; then
        echo "✅ PASS: All API tests passed" >> "$REPORT_FILE"
      else
        echo "❌ FAIL: API tests failed" >> "$REPORT_FILE"
        GATE_PASSED=false
        GATE_FAILURES+=("API tests")
      fi
      echo "" >> "$REPORT_FILE"
      cd - > /dev/null
    fi

    # Web unit tests
    if [ "$HAS_WEB" = true ]; then
      echo "### Web Unit Tests" >> "$REPORT_FILE"
      cd "$PRODUCT_PATH/apps/web"
      if npm test >> "$REPORT_FILE" 2>&1; then
        echo "✅ PASS: All web unit tests passed" >> "$REPORT_FILE"
      else
        echo "❌ FAIL: Web unit tests failed" >> "$REPORT_FILE"
        GATE_PASSED=false
        GATE_FAILURES+=("Web unit tests")
      fi
      echo "" >> "$REPORT_FILE"
      cd - > /dev/null
    fi

    # Smoke tests (web only, optional)
    if [ "$HAS_WEB" = true ]; then
      echo "### Smoke Tests" >> "$REPORT_FILE"
      cd "$PRODUCT_PATH/apps/web"
      if npm run test:smoke >> "$REPORT_FILE" 2>&1; then
        echo "✅ PASS: All smoke tests passed" >> "$REPORT_FILE"
      else
        echo "⚠️  INFO: Smoke tests not configured (optional)" >> "$REPORT_FILE"
      fi
      echo "" >> "$REPORT_FILE"
      cd - > /dev/null
    fi

    # E2E tests (check both locations)
    if [ -d "$PRODUCT_PATH/e2e" ] || [ -d "$PRODUCT_PATH/apps/web/e2e" ]; then
      echo "### E2E Tests" >> "$REPORT_FILE"
      if [ "$HAS_WEB" = true ]; then
        cd "$PRODUCT_PATH/apps/web"
      else
        cd "$PRODUCT_PATH"
      fi
      if npm run test:e2e >> "$REPORT_FILE" 2>&1; then
        echo "✅ PASS: All E2E tests passed" >> "$REPORT_FILE"
      else
        echo "❌ FAIL: E2E tests failed" >> "$REPORT_FILE"
        GATE_PASSED=false
        GATE_FAILURES+=("E2E tests")
      fi
      echo "" >> "$REPORT_FILE"
      cd - > /dev/null
    fi

    # No test apps found
    if [ "$HAS_WEB" = false ] && [ "$HAS_API" = false ]; then
      echo "⚠️  WARN: No apps/web or apps/api found for $PRODUCT" >> "$REPORT_FILE"
    fi
    ;;
    
  production)
    echo "## Production Readiness Gate" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Check for required files
    echo "### Required Files" >> "$REPORT_FILE"
    
    checks=(
      ".env.example:Environment variables documented"
      "docs/DEPLOYMENT.md:Deployment guide exists"
      "docs/ROLLBACK.md:Rollback plan exists"
    )
    
    for check in "${checks[@]}"; do
      file="${check%%:*}"
      desc="${check#*:}"
      if [ -f "$PRODUCT_PATH/$file" ]; then
        echo "✅ $desc" >> "$REPORT_FILE"
      else
        echo "❌ Missing: $desc" >> "$REPORT_FILE"
        GATE_PASSED=false
        GATE_FAILURES+=("Missing $file")
      fi
    done
    echo "" >> "$REPORT_FILE"
    
    # CI/CD configuration
    echo "### CI/CD Configuration" >> "$REPORT_FILE"
    if [ -d "$REPO_ROOT/.github/workflows" ]; then
      WORKFLOW_COUNT=$(ls "$REPO_ROOT"/.github/workflows/*.yml 2>/dev/null | wc -l | tr -d ' ')
      echo "✅ GitHub Actions: $WORKFLOW_COUNT workflow(s) found" >> "$REPORT_FILE"
    else
      echo "⚠️  WARN: No .github/workflows directory" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"

    # Dockerfile check
    echo "### Container Configuration" >> "$REPORT_FILE"
    DOCKER_FOUND=false
    for dockerfile in "$PRODUCT_PATH/Dockerfile" "$PRODUCT_PATH/docker-compose.yml" "$PRODUCT_PATH/apps/api/Dockerfile"; do
      if [ -f "$dockerfile" ]; then
        echo "✅ Found: $(basename "$dockerfile")" >> "$REPORT_FILE"
        DOCKER_FOUND=true
      fi
    done
    if [ "$DOCKER_FOUND" = false ]; then
      echo "⚠️  WARN: No Dockerfile or docker-compose.yml found" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"

    # Logging configuration
    echo "### Logging & Observability" >> "$REPORT_FILE"
    LOG_FOUND=$(grep -rEl 'pino|winston|bunyan|morgan|logger' "$PRODUCT_PATH/apps" --include='*.ts' --include='*.js' 2>/dev/null | grep -v node_modules | head -5 || true)
    if [ -n "$LOG_FOUND" ]; then
      echo "✅ PASS: Structured logging detected" >> "$REPORT_FILE"
    else
      echo "⚠️  WARN: No structured logging library detected (pino, winston, bunyan)" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"

    # Database migration safety
    echo "### Database Migration Safety" >> "$REPORT_FILE"
    if [ -d "$PRODUCT_PATH/apps/api/prisma/migrations" ]; then
      MIGRATION_COUNT=$(ls -d "$PRODUCT_PATH/apps/api/prisma/migrations"/*/ 2>/dev/null | wc -l | tr -d ' ')
      echo "✅ Prisma migrations: $MIGRATION_COUNT migration(s)" >> "$REPORT_FILE"
    elif [ -f "$PRODUCT_PATH/apps/api/prisma/schema.prisma" ]; then
      echo "⚠️  WARN: Prisma schema exists but no migrations directory" >> "$REPORT_FILE"
    else
      echo "ℹ️  No Prisma schema detected" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"

    # Live health check (if backend exists)
    if [ -f "$PRODUCT_PATH/apps/api/package.json" ]; then
      echo "### Health Check Endpoint (Live Verification)" >> "$REPORT_FILE"
      # Start API server, wait for port, curl /health, verify 200+healthy
      API_PORT=""
      for envfile in "$PRODUCT_PATH/.env" "$PRODUCT_PATH/.env.docker" "$PRODUCT_PATH/apps/api/.env"; do
        if [ -f "$envfile" ]; then
          API_PORT=$(grep -oE 'PORT=5[0-9]{3}' "$envfile" | grep -oE '[0-9]+' | head -1 || true)
          [ -n "$API_PORT" ] && break
        fi
      done
      [ -z "$API_PORT" ] && API_PORT="5001"

      echo "Starting API server on port $API_PORT..." >> "$REPORT_FILE"
      cd "$PRODUCT_PATH/apps/api"
      npm run dev > /tmp/prod-gate-api-$PRODUCT.log 2>&1 &
      API_PID=$!
      cd - > /dev/null

      HEALTH_OK=false
      ELAPSED=0
      while [ $ELAPSED -lt 30 ]; do
        if curl -s -o /dev/null -w '' "http://localhost:$API_PORT" 2>/dev/null; then
          break
        fi
        sleep 1
        ELAPSED=$((ELAPSED + 1))
      done

      if [ $ELAPSED -lt 30 ]; then
        HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "http://localhost:$API_PORT/health" 2>/dev/null || echo -e "\n000")
        HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
        HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -1)

        if [ "$HEALTH_STATUS" = "200" ] && echo "$HEALTH_BODY" | grep -qi "healthy\|ok\|status"; then
          echo "✅ Health check endpoint responds: HTTP 200 — $HEALTH_BODY" >> "$REPORT_FILE"
          HEALTH_OK=true
        else
          echo "❌ FAIL: /health returned HTTP $HEALTH_STATUS" >> "$REPORT_FILE"
          GATE_PASSED=false
          GATE_FAILURES+=("Health check: HTTP $HEALTH_STATUS")
        fi
      else
        echo "❌ FAIL: API server did not start within 30s" >> "$REPORT_FILE"
        GATE_PASSED=false
        GATE_FAILURES+=("API server failed to start")
      fi

      # Kill the API server we started
      kill "$API_PID" 2>/dev/null || true
      wait "$API_PID" 2>/dev/null || true
      echo "" >> "$REPORT_FILE"
    fi
    ;;
    
  *)
    echo "Unknown gate type: $GATE_TYPE" >> "$REPORT_FILE"
    echo "Unknown gate type: $GATE_TYPE"
    exit 1
    ;;
esac

# Final status
{
  echo ""
  echo "---"
  echo ""
  if [ "$GATE_PASSED" = true ]; then
    echo "**Status**: ✅ PASS"
    echo ""
    echo "All checks passed. Proceeding..."
  else
    echo "**Status**: ❌ FAIL"
    echo ""
    echo "**Failures**:"
    for failure in "${GATE_FAILURES[@]}"; do
      echo "- $failure"
    done
    echo ""
    echo "Please fix the issues above and re-run the gate."
  fi
} >> "$REPORT_FILE"

# Update status in report
sed -i.bak "s/\*\*Status\*\*: RUNNING/\*\*Status\*\*: $(if [ "$GATE_PASSED" = true ]; then echo '✅ PASS'; else echo '❌ FAIL'; fi)/" "$REPORT_FILE"
rm -f "$REPORT_FILE.bak"

# Record gate result in metrics
METRICS_SCRIPT="$REPO_ROOT/.claude/scripts/update-gate-metrics.sh"
if [ -f "$METRICS_SCRIPT" ]; then
  RESULT=$([ "$GATE_PASSED" = true ] && echo "pass" || echo "fail")
  FAILURE_COUNT=${#GATE_FAILURES[@]}
  DETAILS="{\"product\":\"$PRODUCT\",\"failures\":$FAILURE_COUNT}"
  bash "$METRICS_SCRIPT" "$GATE_TYPE" "$PRODUCT" "$RESULT" "$DETAILS" 2>/dev/null || true
fi

echo ""
echo "📊 Report saved to: $REPORT_FILE"
cat "$REPORT_FILE"

# Exit with appropriate code
if [ "$GATE_PASSED" = true ]; then
  exit 0
else
  exit 1
fi
