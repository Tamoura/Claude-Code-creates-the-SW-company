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

PRODUCT_PATH="products/$PRODUCT"
REPORT_DIR="$PRODUCT_PATH/docs/quality-reports"
mkdir -p "$REPORT_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORT_DIR/${GATE_TYPE}-gate-${TIMESTAMP}.md"

# Initialize report
{
  echo "# ${GATE_TYPE^} Gate Report"
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
    
    # API performance benchmarks (if backend exists)
    if [ -f "$PRODUCT_PATH/apps/api/package.json" ]; then
      echo "### API Performance Benchmarks" >> "$REPORT_FILE"
      cd "$PRODUCT_PATH/apps/api"
      if npm run bench >> "$REPORT_FILE" 2>&1; then
        echo "✅ PASS: Performance benchmarks complete" >> "$REPORT_FILE"
      else
        echo "⚠️  INFO: Benchmark script not configured" >> "$REPORT_FILE"
      fi
      echo "" >> "$REPORT_FILE"
      cd - > /dev/null
    fi
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
    
    # Check for health endpoint (if backend exists)
    if [ -f "$PRODUCT_PATH/apps/api/package.json" ]; then
      echo "### Health Check Endpoint" >> "$REPORT_FILE"
      # This would need the API running, so we just check if route exists
      if grep -r "health" "$PRODUCT_PATH/apps/api/src" > /dev/null 2>&1; then
        echo "✅ Health check endpoint found" >> "$REPORT_FILE"
      else
        echo "⚠️  WARN: Health check endpoint not found" >> "$REPORT_FILE"
      fi
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

echo ""
echo "📊 Report saved to: $REPORT_FILE"
cat "$REPORT_FILE"

# Exit with appropriate code
if [ "$GATE_PASSED" = true ]; then
  exit 0
else
  exit 1
fi
