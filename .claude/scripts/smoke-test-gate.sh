#!/bin/bash
# smoke-test-gate.sh
# Automated "does it actually run?" verification
# Usage: .claude/scripts/smoke-test-gate.sh <product-name>
#
# This script is the missing piece in the quality gate system.
# It verifies that a product actually starts and responds to requests,
# rather than just passing static analysis and unit tests.

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PRODUCT="${1:-}"
TIMEOUT="${2:-30}"

if [ -z "$PRODUCT" ]; then
  echo "Usage: $0 <product-name> [timeout-seconds]"
  echo ""
  echo "Example: $0 stablecoin-gateway"
  echo "Example: $0 stablecoin-gateway 60"
  exit 1
fi

PRODUCT_DIR="$REPO_ROOT/products/$PRODUCT"

if [ ! -d "$PRODUCT_DIR" ]; then
  echo "Error: Product directory not found: $PRODUCT_DIR"
  exit 1
fi

# Detect ports from product config
detect_ports() {
  local api_port=""
  local web_port=""

  if [ -f "$PRODUCT_DIR/docker-compose.yml" ]; then
    api_port=$(grep -A5 'api:' "$PRODUCT_DIR/docker-compose.yml" | grep -oE '[0-9]+:5[0-9]{3}' | head -1 | cut -d: -f1 || true)
    web_port=$(grep -A5 'web:' "$PRODUCT_DIR/docker-compose.yml" | grep -oE '[0-9]+:' | head -1 | tr -d ':' || true)
  fi

  if [ -z "$web_port" ] && [ -f "$PRODUCT_DIR/apps/web/vite.config.ts" ]; then
    web_port=$(grep -oE 'port:\s*[0-9]+' "$PRODUCT_DIR/apps/web/vite.config.ts" | grep -oE '[0-9]+' || true)
  fi

  if [ -z "$api_port" ]; then
    for envfile in "$PRODUCT_DIR/.env" "$PRODUCT_DIR/.env.docker" "$PRODUCT_DIR/apps/api/.env"; do
      if [ -f "$envfile" ]; then
        api_port=$(grep -oE 'PORT=5[0-9]{3}' "$envfile" | grep -oE '[0-9]+' | head -1 || true)
        [ -n "$api_port" ] && break
      fi
    done
  fi

  [ -z "$api_port" ] && api_port="5001"
  [ -z "$web_port" ] && web_port="3104"

  echo "$api_port $web_port"
}

# ============================================================================
# Setup
# ============================================================================

PIDS_TO_KILL=()
REPORT_DIR="$PRODUCT_DIR/docs/quality-reports"
mkdir -p "$REPORT_DIR"
REPORT_FILE="$REPORT_DIR/smoke-test-$(date +%Y%m%d-%H%M%S).md"
SCREENSHOT_DIR="$REPORT_DIR/screenshots"
mkdir -p "$SCREENSHOT_DIR"

PASSED=0
FAILED=0
WARNINGS=0
RESULTS=()

cleanup() {
  echo ""
  echo "Cleaning up..."
  for pid in "${PIDS_TO_KILL[@]}"; do
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  done
  jobs -p | xargs -r kill 2>/dev/null || true
}
trap cleanup EXIT

record() {
  local status=$1
  local name=$2
  local detail=$3

  if [ "$status" = "PASS" ]; then
    PASSED=$((PASSED + 1))
    RESULTS+=("✅ PASS: $name — $detail")
    echo "  ✅ $name: $detail"
  elif [ "$status" = "FAIL" ]; then
    FAILED=$((FAILED + 1))
    RESULTS+=("❌ FAIL: $name — $detail")
    echo "  ❌ $name: $detail"
  else
    WARNINGS=$((WARNINGS + 1))
    RESULTS+=("⚠️ WARN: $name — $detail")
    echo "  ⚠️ $name: $detail"
  fi
}

wait_for_port() {
  local port=$1
  local max_wait=$2
  local elapsed=0

  while [ $elapsed -lt "$max_wait" ]; do
    if curl -s -o /dev/null -w '' "http://localhost:$port" 2>/dev/null; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  return 1
}

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           SMOKE TEST GATE: $PRODUCT"
echo "║           $(date)"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

read -r API_PORT WEB_PORT <<< "$(detect_ports)"
echo "Detected ports — API: $API_PORT, Web: $WEB_PORT"
echo ""

cd "$PRODUCT_DIR"

HAS_API=false
HAS_WEB=false
[ -f "apps/api/package.json" ] && HAS_API=true
[ -f "apps/web/package.json" ] && HAS_WEB=true

# ============================================================================
# CHECK 1: Server Startup
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Check 1: Server Startup                                      │"
echo "└──────────────────────────────────────────────────────────────┘"

USE_DOCKER=false
if [ -f "docker-compose.yml" ] && command -v docker-compose >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    USE_DOCKER=true
  fi
fi

if [ "$USE_DOCKER" = true ]; then
  echo "Starting via docker-compose..."
  docker-compose up -d 2>/dev/null
else
  if [ "$HAS_API" = true ]; then
    echo "Starting API server..."
    cd "$PRODUCT_DIR/apps/api"
    npm run dev > /tmp/smoke-api-$PRODUCT.log 2>&1 &
    PIDS_TO_KILL+=($!)
    cd "$PRODUCT_DIR"
  fi

  if [ "$HAS_WEB" = true ]; then
    echo "Starting Web server..."
    cd "$PRODUCT_DIR/apps/web"
    npm run dev > /tmp/smoke-web-$PRODUCT.log 2>&1 &
    PIDS_TO_KILL+=($!)
    cd "$PRODUCT_DIR"
  fi
fi

if [ "$HAS_API" = true ]; then
  echo "Waiting for API on port $API_PORT (timeout: ${TIMEOUT}s)..."
  if wait_for_port "$API_PORT" "$TIMEOUT"; then
    record "PASS" "API server started" "Port $API_PORT responding"
  else
    record "FAIL" "API server started" "Port $API_PORT not responding after ${TIMEOUT}s"
    tail -10 /tmp/smoke-api-$PRODUCT.log 2>/dev/null | sed 's/^/    /'
  fi
fi

if [ "$HAS_WEB" = true ]; then
  echo "Waiting for Web on port $WEB_PORT (timeout: ${TIMEOUT}s)..."
  if wait_for_port "$WEB_PORT" "$TIMEOUT"; then
    record "PASS" "Web server started" "Port $WEB_PORT responding"
  else
    record "FAIL" "Web server started" "Port $WEB_PORT not responding after ${TIMEOUT}s"
    tail -10 /tmp/smoke-web-$PRODUCT.log 2>/dev/null | sed 's/^/    /'
  fi
fi

echo ""

# ============================================================================
# CHECK 2: Backend Health Check
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Check 2: Backend Health Check                                │"
echo "└──────────────────────────────────────────────────────────────┘"

if [ "$HAS_API" = true ]; then
  HEALTH_URL="http://localhost:$API_PORT/health"
  HEALTH_START=$(date +%s%N 2>/dev/null || date +%s)
  HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>/dev/null || echo -e "\n000")
  HEALTH_END=$(date +%s%N 2>/dev/null || date +%s)

  HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')
  HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -1)

  if [ "$HEALTH_STATUS" = "200" ]; then
    if echo "$HEALTH_BODY" | grep -qi "healthy\|ok\|status"; then
      record "PASS" "Backend health check" "200 OK — $HEALTH_BODY"
    else
      record "WARN" "Backend health check" "200 OK but response doesn't contain health status"
    fi
  else
    record "FAIL" "Backend health check" "HTTP $HEALTH_STATUS (expected 200)"
  fi
else
  record "WARN" "Backend health check" "No API app found, skipping"
fi

echo ""

# ============================================================================
# CHECK 3: Frontend Load
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Check 3: Frontend Load                                       │"
echo "└──────────────────────────────────────────────────────────────┘"

if [ "$HAS_WEB" = true ]; then
  WEB_URL="http://localhost:$WEB_PORT"
  WEB_RESPONSE=$(curl -s -w "\n%{http_code}" "$WEB_URL" 2>/dev/null || echo -e "\n000")

  WEB_BODY=$(echo "$WEB_RESPONSE" | sed '$d')
  WEB_STATUS=$(echo "$WEB_RESPONSE" | tail -1)

  if [ "$WEB_STATUS" = "200" ]; then
    if echo "$WEB_BODY" | grep -qiE '<div id="(root|app|__next)"'; then
      record "PASS" "Frontend loads" "200 OK — HTML with app root element"
    elif echo "$WEB_BODY" | grep -qi '<html'; then
      record "PASS" "Frontend loads" "200 OK — HTML response"
    else
      record "WARN" "Frontend loads" "200 OK but no recognizable app root in HTML"
    fi
  else
    record "FAIL" "Frontend loads" "HTTP $WEB_STATUS (expected 200)"
  fi
else
  record "WARN" "Frontend loads" "No web app found, skipping"
fi

echo ""

# ============================================================================
# CHECK 4: Placeholder / Coming Soon Detection
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Check 4: Placeholder / Coming Soon Detection                 │"
echo "└──────────────────────────────────────────────────────────────┘"

PLACEHOLDER_FILES=()
if [ "$HAS_WEB" = true ]; then
  while IFS= read -r file; do
    [ -n "$file" ] && PLACEHOLDER_FILES+=("$file")
  done < <(grep -rlE "Coming Soon|Placeholder|Under Construction|Not yet implemented" \
    "$PRODUCT_DIR/apps/web/src/pages" \
    "$PRODUCT_DIR/apps/web/src/components" 2>/dev/null || true)

  if [ ${#PLACEHOLDER_FILES[@]} -gt 0 ]; then
    record "FAIL" "Placeholder pages" "Found ${#PLACEHOLDER_FILES[@]} placeholder pages"
    for pf in "${PLACEHOLDER_FILES[@]}"; do
      relative="${pf#$PRODUCT_DIR/}"
      echo "    - $relative"
    done
  else
    record "PASS" "Placeholder pages" "No placeholder/Coming Soon pages found"
  fi
else
  record "WARN" "Placeholder pages" "No web app found, skipping"
fi

echo ""

# ============================================================================
# CHECK 5: Playwright Headless Verification (MANDATORY)
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Check 5: Playwright Headless Verification (MANDATORY)        │"
echo "└──────────────────────────────────────────────────────────────┘"

if [ "$HAS_WEB" = true ] && command -v npx >/dev/null 2>&1; then
  # Auto-install Playwright chromium if not present
  PW_INSTALLED=false
  if [ -d "$PRODUCT_DIR/apps/web/node_modules/@playwright" ] || \
     [ -d "$PRODUCT_DIR/node_modules/@playwright" ] || \
     [ -d "$PRODUCT_DIR/e2e/node_modules/@playwright" ]; then
    PW_INSTALLED=true
  fi

  if [ "$PW_INSTALLED" = false ]; then
    echo "  Playwright not found — auto-installing chromium..."
    npx playwright install chromium 2>/dev/null && PW_INSTALLED=true
    if [ "$PW_INSTALLED" = true ]; then
      echo "  Playwright chromium installed successfully."
    else
      echo "  Playwright install failed."
    fi
  fi

  if [ "$PW_INSTALLED" = true ]; then
    # Place the temp file inside the product dir so ESM can resolve local playwright
    PW_RUN_DIR="$PRODUCT_DIR/apps/web"
    [ ! -d "$PW_RUN_DIR/node_modules/@playwright" ] && PW_RUN_DIR="$PRODUCT_DIR"
    [ ! -d "$PW_RUN_DIR/node_modules/@playwright" ] && PW_RUN_DIR="$PRODUCT_DIR/e2e"
    SMOKE_SCRIPT_PW="$PW_RUN_DIR/.smoke-pw-$$.mjs"
    cat > "$SMOKE_SCRIPT_PW" << 'PLAYWRIGHT_EOF'
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:3104';
const screenshotPath = process.argv[3] || '/tmp/smoke-screenshot.png';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const hydrationErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      errors.push(text);
      // Detect React/Next.js hydration errors
      if (text.includes('Hydration') || text.includes('hydrat') ||
          text.includes('server-rendered') || text.includes('did not match')) {
        hydrationErrors.push(text);
      }
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
    if (err.message.includes('Hydration') || err.message.includes('hydrat')) {
      hydrationErrors.push(err.message);
    }
  });

  const results = { pages: [] };

  // Helper to check a single route
  async function checkRoute(routeUrl, routeName) {
    try {
      const response = await page.goto(routeUrl, { waitUntil: 'networkidle', timeout: 15000 });
      const status = response?.status() || 0;
      const bodyText = await page.textContent('body');
      const hasContent = bodyText && bodyText.trim().length > 10;
      results.pages.push({ route: routeName, status, hasContent, ok: status >= 200 && status < 400 });
    } catch (err) {
      results.pages.push({ route: routeName, status: 0, hasContent: false, ok: false, error: err.message });
    }
  }

  try {
    // Check homepage
    await checkRoute(url, '/');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Check key routes (best effort — 404 is acceptable for missing routes)
    for (const route of ['/login', '/dashboard']) {
      await checkRoute(url + route, route);
    }

    const homeResult = results.pages.find(p => p.route === '/');
    console.log(JSON.stringify({
      status: homeResult?.status || 0,
      hasContent: homeResult?.hasContent || false,
      consoleErrors: errors.length,
      hydrationErrors: hydrationErrors.length,
      screenshotPath,
      routes: results.pages
    }));
  } catch (err) {
    console.log(JSON.stringify({ status: 0, hasContent: false, consoleErrors: -1, hydrationErrors: 0, error: err.message }));
  } finally { await browser.close(); }
})();
PLAYWRIGHT_EOF

    SCREENSHOT_PATH="$SCREENSHOT_DIR/smoke-$(date +%Y%m%d-%H%M%S).png"
    # Script is placed in product dir so ESM resolves playwright from local node_modules
    PW_OUTPUT=$(node "$SMOKE_SCRIPT_PW" "http://localhost:$WEB_PORT" "$SCREENSHOT_PATH" 2>/dev/null || echo '{"status":0,"error":"playwright not available"}')
    rm -f "$SMOKE_SCRIPT_PW"

    # Parse top-level status (first occurrence before "routes" array)
    PW_STATUS=$(echo "$PW_OUTPUT" | grep -oE '"status":[0-9]+' | head -1 | grep -oE '[0-9]+' || echo "0")
    PW_ERRORS=$(echo "$PW_OUTPUT" | grep -oE '"consoleErrors":[0-9-]+' | head -1 | grep -oE '[0-9-]+' || echo "-1")
    PW_HYDRATION=$(echo "$PW_OUTPUT" | grep -oE '"hydrationErrors":[0-9]+' | head -1 | grep -oE '[0-9]+' || echo "0")
    PW_HAS_CONTENT=$(echo "$PW_OUTPUT" | grep -oE '"hasContent":(true|false)' | head -1 | grep -oE '(true|false)' || echo "false")

    if [ "$PW_HYDRATION" != "0" ]; then
      record "FAIL" "Playwright headless check" "Hydration errors detected ($PW_HYDRATION) — React SSR/CSR mismatch"
    elif [ "$PW_STATUS" = "200" ] && [ "$PW_HAS_CONTENT" = "true" ] && [ "$PW_ERRORS" = "0" ]; then
      record "PASS" "Playwright headless check" "Page loads, has content, 0 console errors, routes checked"
    elif [ "$PW_STATUS" = "200" ] && [ "$PW_ERRORS" != "0" ]; then
      record "FAIL" "Playwright headless check" "Page loads but $PW_ERRORS console errors detected"
    else
      record "FAIL" "Playwright headless check" "Page did not load correctly: status=$PW_STATUS content=$PW_HAS_CONTENT"
    fi

    [ -f "$SCREENSHOT_PATH" ] && echo "  Screenshot saved: $SCREENSHOT_PATH"

    # Print route check summary
    ROUTES_JSON=$(echo "$PW_OUTPUT" | grep -oE '"routes":\[.*\]' || true)
    if [ -n "$ROUTES_JSON" ]; then
      echo "  Route checks:"
      echo "  $PW_OUTPUT" | grep -oE '"route":"[^"]*","status":[0-9]+' | while read -r line; do
        route=$(echo "$line" | grep -oE '"route":"[^"]*"' | cut -d'"' -f4)
        status=$(echo "$line" | grep -oE '"status":[0-9]+' | grep -oE '[0-9]+')
        if [ "$status" -ge 200 ] && [ "$status" -lt 400 ]; then
          echo "    $route → $status OK"
        elif [ "$status" = "404" ]; then
          echo "    $route → 404 (not found, acceptable)"
        else
          echo "    $route → $status (issue)"
        fi
      done
    fi
  else
    record "FAIL" "Playwright headless check" "Playwright auto-install failed — run manually: npx playwright install chromium"
  fi
else
  if [ "$HAS_WEB" = true ]; then
    record "FAIL" "Playwright headless check" "npx not available — required for headless verification"
  else
    record "WARN" "Playwright headless check" "No web app found, skipping"
  fi
fi

echo ""

# ============================================================================
# CHECK 6: Production Build
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Check 6: Production Build                                    │"
echo "└──────────────────────────────────────────────────────────────┘"

if [ "$HAS_WEB" = true ]; then
  cd "$PRODUCT_DIR/apps/web"
  if npm run build > /tmp/smoke-build-web-$PRODUCT.log 2>&1; then
    record "PASS" "Web build" "Production build succeeded"
  else
    record "FAIL" "Web build" "Production build failed"
    tail -10 /tmp/smoke-build-web-$PRODUCT.log 2>/dev/null | sed 's/^/    /'
  fi
  cd "$PRODUCT_DIR"
fi

if [ "$HAS_API" = true ]; then
  cd "$PRODUCT_DIR/apps/api"
  if npm run build > /tmp/smoke-build-api-$PRODUCT.log 2>&1; then
    record "PASS" "API build" "Production build succeeded"
  else
    record "FAIL" "API build" "Production build failed"
    tail -10 /tmp/smoke-build-api-$PRODUCT.log 2>/dev/null | sed 's/^/    /'
  fi
  cd "$PRODUCT_DIR"
fi

echo ""

# ============================================================================
# CHECK 7: E2E Test Existence (MANDATORY for web apps)
# ============================================================================
echo "┌──────────────────────────────────────────────────────────────┐"
echo "│ Check 7: E2E Test Coverage (MANDATORY)                       │"
echo "└──────────────────────────────────────────────────────────────┘"

MIN_E2E_FILES=3

if [ "$HAS_WEB" = true ]; then
  E2E_COUNT=0
  for e2e_dir in "$PRODUCT_DIR/apps/web/e2e" "$PRODUCT_DIR/e2e" "$PRODUCT_DIR/apps/web/tests/e2e"; do
    if [ -d "$e2e_dir" ]; then
      dir_count=$(find "$e2e_dir" -name "*.spec.ts" -o -name "*.spec.js" -o -name "*.test.ts" -o -name "*.test.js" 2>/dev/null | wc -l | tr -d ' ')
      E2E_COUNT=$((E2E_COUNT + dir_count))
    fi
  done

  if [ "$E2E_COUNT" -ge "$MIN_E2E_FILES" ]; then
    record "PASS" "E2E test files exist" "Found $E2E_COUNT E2E test files (minimum: $MIN_E2E_FILES)"
  elif [ "$E2E_COUNT" -gt 0 ]; then
    record "WARN" "E2E test files exist" "Found $E2E_COUNT E2E test files but minimum is $MIN_E2E_FILES"
  else
    record "FAIL" "E2E test files exist" "No E2E test files found — every web app must have Playwright E2E tests"
  fi
else
  record "WARN" "E2E test files exist" "No web app found, skipping"
fi

echo ""

# ============================================================================
# RESULTS
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    SMOKE TEST RESULTS                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  ✅ Passed:   $PASSED"
echo "  ❌ Failed:   $FAILED"
echo "  ⚠️  Warnings: $WARNINGS"
echo ""

cat > "$REPORT_FILE" << EOF
# Smoke Test Report

**Product**: $PRODUCT
**Date**: $(date)
**Status**: $([ $FAILED -eq 0 ] && echo "PASS" || echo "FAIL")
**Ports**: API=$API_PORT, Web=$WEB_PORT

## Results Summary

- Passed: $PASSED
- Failed: $FAILED
- Warnings: $WARNINGS

## Detailed Results

$(for r in "${RESULTS[@]}"; do echo "- $r"; done)

## Placeholder Pages

$(if [ ${#PLACEHOLDER_FILES[@]} -gt 0 ]; then
  echo "**WARNING**: The following pages contain placeholder content:"
  for pf in "${PLACEHOLDER_FILES[@]}"; do
    echo "- ${pf#$PRODUCT_DIR/}"
  done
else
  echo "None found."
fi)

---

*Generated by smoke-test-gate.sh*
EOF

echo "Report saved: $REPORT_FILE"
echo ""
echo "GATE_REPORT_FILE=$REPORT_FILE"

if [ $FAILED -gt 0 ]; then
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║              ❌ SMOKE TEST: FAIL                             ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "The product does not run end-to-end. Fix issues and re-test."
  exit 1
else
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║              ✅ SMOKE TEST: PASS                             ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Product starts and responds correctly."
  exit 0
fi
