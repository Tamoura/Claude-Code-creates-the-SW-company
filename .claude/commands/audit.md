# Audit Command

Perform a comprehensive professional code audit on a ConnectSW product.

## Usage

```
/audit <product-name>
```

Example:
```
/audit stablecoin-gateway
```

## Arguments

- **product-name**: Product name (e.g., `stablecoin-gateway`, `deal-flow-platform`). Works in both monorepo (`products/<name>/`) and single-repo (`apps/` at root) layouts.

## What This Command Does

This command invokes the **Code Reviewer** agent to perform a full professional audit of the specified product across **11 technical dimensions** (Security, Architecture, Test Coverage, Code Quality, Performance, DevOps, Runability, Accessibility, Privacy, Observability, API Design) against **9 industry frameworks** (OWASP Top 10, OWASP API Top 10, OWASP ASVS, CWE/SANS Top 25, WCAG 2.1 AA, GDPR, ISO 25010, DORA, SRE Golden Signals). The audit includes both **static analysis** (code review) and **dynamic testing** (DAST, load testing, runtime profiling, infrastructure scanning) against the running application. The audit produces a **decision-ready** report suitable for:
- CEO / Board presentations
- Investment committee reviews
- Regulated customer due diligence
- Internal engineering prioritization

The report is both technically rigorous (file:line references, exploit scenarios) AND business-actionable (ownership, phases, compliance mapping, go/no-go decisions).

## Execution Steps

### Step 0: Resolve Product Path

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
PRODUCT="$ARGUMENTS"
source "$REPO_ROOT/.claude/scripts/resolve-product.sh"
# PRODUCT_DIR now set: monorepo → products/<name>, single-repo → repo root
# REPO_MODE: "monorepo" or "single"

if [ ! -d "$PRODUCT_DIR/apps" ] && [ "$REPO_MODE" != "single" ]; then
  echo "FAIL: Product '$PRODUCT' not found."
  if [ -d "$REPO_ROOT/products" ]; then
    echo "Available products:"
    ls "$REPO_ROOT/products/"
  else
    echo "This appears to be a single-repo. Run without a product name or use the repo directory name."
  fi
  exit 1
fi

echo "Product: $PRODUCT"
echo "Mode: $REPO_MODE"
echo "Path: $PRODUCT_DIR"
```

### Step 0b: E2E Gate (MANDATORY — block audit if E2E fails)

Before performing any audit analysis, verify E2E tests exist and pass.

```bash
# Check E2E tests exist
if [ ! -f "$PRODUCT_DIR/e2e/package.json" ]; then
  echo "AUDIT BLOCKED: No E2E tests found in $PRODUCT_DIR/e2e/"
  echo "E2E tests are required before audit. Add Playwright tests first."
  exit 1
fi

# Run E2E tests (assumes API + web are already running)
cd "$PRODUCT_DIR/e2e" && npm test 2>&1
E2E_STATUS=$?

if [ $E2E_STATUS -ne 0 ]; then
  echo "AUDIT BLOCKED: E2E tests failed (exit code $E2E_STATUS)"
  echo "Fix all E2E test failures before running the audit."
  exit 1
fi

echo "E2E Gate: PASS — proceeding with audit"
```

**If E2E Gate fails:** Stop immediately. Report to Orchestrator:
> AUDIT BLOCKED — E2E tests must pass before audit can proceed. Route to QA Engineer to fix failing tests.

**If services are not running:** Report to CEO:
> Audit requires the platform to be running. Start with `npm run dev` in `$PRODUCT_DIR/`, then re-run `/audit $ARGUMENTS`.

---

### Step 1: Load Agent Context

Read the Code Reviewer agent instructions:
- File: `.claude/agents/code-reviewer.md`

Read the product context:
- File: `$PRODUCT_DIR/.claude/addendum.md` (if exists)
- File: `$PRODUCT_DIR/README.md`
- File: `$PRODUCT_DIR/docs/PRD.md` (if exists)

### Step 2: Explore the Codebase

Use parallel exploration agents to analyze the product thoroughly:

1. **Services & Business Logic Agent**: Read all files in `apps/api/src/services/` and `apps/api/src/workers/`. Analyze business logic, security controls, error handling, race conditions, and data integrity.

2. **Routes & API Layer Agent**: Read all files in `apps/api/src/routes/`. Analyze input validation, authorization, error responses, pagination, and API design consistency.

3. **Plugins, Utils & Schema Agent**: Read all files in `apps/api/src/plugins/`, `apps/api/src/utils/`, and `apps/api/prisma/schema.prisma`. Analyze authentication, encryption, database schema, validation, and configuration.

4. **Tests & CI/CD Agent**: Read all files in `apps/api/tests/`, `.github/workflows/`, and `apps/web/` (if exists). Analyze test coverage, test quality, CI pipeline security, and deployment safety.

5. **Accessibility & UX Agent**: If `apps/web/` exists, analyze all frontend components for WCAG 2.1 AA compliance: color contrast, alt text, form labels, keyboard navigation, heading hierarchy, ARIA attributes, focus management, responsive design. Note: run Lighthouse Accessibility if possible.

6. **Privacy & Observability Agent**: Scan all source files for: PII handling (storage, logging, transmission), consent mechanisms, data deletion capabilities, data export features, retention policies, structured logging configuration, health check endpoints, monitoring setup, error tracking, tracing configuration.

### Step 2b: Dynamic Testing (requires running application)

**PREREQUISITE**: The application must be running. Detect API and frontend ports from `PORT-REGISTRY.md`, `package.json`, or `.env` files. If the application is not running, skip dynamic testing with a clear note in the report: "Dynamic testing skipped — application was not running. Start with `npm run dev` and re-run audit for full coverage."

**Port Detection:**
```bash
# Try to detect ports from PORT-REGISTRY.md, .env, or package.json
API_PORT=$(grep -oE '(PORT|API_PORT)=([0-9]+)' "$PRODUCT_DIR/apps/api/.env" 2>/dev/null | head -1 | cut -d= -f2)
[ -z "$API_PORT" ] && API_PORT=$(grep -oE '"start.*--port ([0-9]+)"' "$PRODUCT_DIR/apps/api/package.json" 2>/dev/null | grep -oE '[0-9]+' | head -1)
[ -z "$API_PORT" ] && API_PORT="5000"

WEB_PORT=$(grep -oE '(PORT|WEB_PORT|NEXT_PORT)=([0-9]+)' "$PRODUCT_DIR/apps/web/.env" 2>/dev/null | head -1 | cut -d= -f2)
[ -z "$WEB_PORT" ] && WEB_PORT="3100"

# Check if services are actually running
API_UP=$(curl -sf "http://localhost:$API_PORT/health" > /dev/null 2>&1 && echo "true" || echo "false")
WEB_UP=$(curl -sf "http://localhost:$WEB_PORT" > /dev/null 2>&1 && echo "true" || echo "false")

echo "API: port=$API_PORT up=$API_UP"
echo "Web: port=$WEB_PORT up=$WEB_UP"
```

**If API is running, execute these dynamic tests:**

7. **DAST Agent** — Active security probing against the running API:

```bash
echo "=== DAST: Dynamic Application Security Testing ==="
API_BASE="http://localhost:$API_PORT"

# 7a. Security Headers Check
echo "--- Security Headers ---"
HEADERS=$(curl -sI "$API_BASE/health" 2>/dev/null)
echo "$HEADERS" | grep -iE "(strict-transport|x-frame|x-content-type|content-security|x-xss|referrer-policy|permissions-policy)" || echo "  FAIL: Missing security headers"

# 7b. CORS Probing (test with malicious origin)
echo "--- CORS Probe ---"
CORS_RESP=$(curl -sI -H "Origin: https://evil.com" "$API_BASE/health" 2>/dev/null)
echo "$CORS_RESP" | grep -i "access-control-allow-origin" | grep -i "evil" && echo "  FAIL: CORS allows arbitrary origins" || echo "  PASS: CORS does not reflect evil origin"

# 7c. Auth Bypass Probes (access protected endpoints without token)
echo "--- Auth Bypass Probes ---"
# Find route files to discover endpoints
ENDPOINTS=$(grep -rhoE "(get|post|put|patch|delete)\(['\"]\/[^'\"]*['\"]" "$PRODUCT_DIR/apps/api/src/routes/" 2>/dev/null | sed "s/.*['\"]//;s/['\"]//g" | sort -u | head -20)
for endpoint in $ENDPOINTS; do
  STATUS=$(curl -so /dev/null -w "%{http_code}" "$API_BASE$endpoint" 2>/dev/null)
  if [ "$STATUS" = "200" ]; then
    # Check if this should be protected (not health/public/docs)
    echo "$endpoint" | grep -qiE "(health|ready|public|docs|swagger|openapi)" || \
      echo "  WARN: $endpoint returns 200 without auth token (status: $STATUS)"
  fi
done

# 7d. SQL Injection Probes (safe — parameterized payloads)
echo "--- Injection Probes ---"
for endpoint in $ENDPOINTS; do
  # Test with SQL injection in query params
  SQLI_STATUS=$(curl -so /dev/null -w "%{http_code}" "$API_BASE${endpoint}?id=1%27%20OR%201%3D1--" 2>/dev/null)
  [ "$SQLI_STATUS" = "500" ] && echo "  WARN: $endpoint returns 500 on SQL injection payload (may be vulnerable)"
done

# 7e. Rate Limiting Verification
echo "--- Rate Limiting ---"
# Send 50 rapid requests to login/auth endpoint
AUTH_ENDPOINT=$(echo "$ENDPOINTS" | grep -iE "(login|signin|auth)" | head -1)
if [ -n "$AUTH_ENDPOINT" ]; then
  RATE_BLOCKED=false
  for i in $(seq 1 50); do
    STATUS=$(curl -so /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "$API_BASE$AUTH_ENDPOINT" 2>/dev/null)
    [ "$STATUS" = "429" ] && RATE_BLOCKED=true && break
  done
  $RATE_BLOCKED && echo "  PASS: Rate limiting active (429 after rapid requests)" || echo "  FAIL: No rate limiting detected on $AUTH_ENDPOINT after 50 rapid requests"
else
  echo "  SKIP: No auth endpoint found to test rate limiting"
fi

# 7f. Error Information Disclosure
echo "--- Error Disclosure ---"
ERR_BODY=$(curl -s "$API_BASE/nonexistent-endpoint-404-test" 2>/dev/null)
echo "$ERR_BODY" | grep -iE "(stack|trace|node_modules|at Object|at Module|\.ts:[0-9])" && \
  echo "  FAIL: Stack trace exposed in error response" || echo "  PASS: No stack trace in error responses"

# 7g. HTTP Method Override
echo "--- HTTP Method Override ---"
for override_header in "X-HTTP-Method-Override" "X-Method-Override" "X-HTTP-Method"; do
  curl -sI -X POST -H "$override_header: DELETE" "$API_BASE/health" 2>/dev/null | grep -q "200" && \
    echo "  WARN: $override_header accepted — verify this is intentional"
done
```

8. **Load Testing Agent** — Stress test and race condition detection:

```bash
echo ""
echo "=== Load Testing ==="

# 8a. API Load Test with autocannon (install if needed)
if ! command -v autocannon &> /dev/null; then
  echo "Installing autocannon..."
  npm install -g autocannon 2>/dev/null || npx autocannon --version > /dev/null 2>&1
fi

echo "--- API Throughput & Latency (10s, 100 connections) ---"
npx autocannon -c 100 -d 10 --json "$API_BASE/health" 2>/dev/null | \
  node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log('  Requests/sec: '+d.requests.average);
    console.log('  Latency p50: '+d.latency.p50+'ms');
    console.log('  Latency p95: '+d.latency.p95+'ms');
    console.log('  Latency p99: '+d.latency.p99+'ms');
    console.log('  Errors: '+d.errors);
    console.log('  Timeouts: '+d.timeouts);
    console.log('  Non-2xx: '+(d.non2xx||0));
    if(d.latency.p99>1000) console.log('  FAIL: p99 latency >1000ms');
    else if(d.latency.p95>400) console.log('  WARN: p95 latency >400ms');
    else console.log('  PASS: Latency within thresholds');" 2>/dev/null || echo "  SKIP: autocannon not available"

# 8b. Race Condition Detection
echo "--- Race Condition Detection ---"
echo "Sending 20 parallel identical POST requests to state-changing endpoints..."
# Find POST endpoints that create resources
POST_ENDPOINTS=$(echo "$ENDPOINTS" | grep -i "post" | head -3)
if [ -z "$POST_ENDPOINTS" ]; then
  POST_ENDPOINTS=$(grep -rhoE "post\(['\"]\/[^'\"]*['\"]" "$PRODUCT_DIR/apps/api/src/routes/" 2>/dev/null | sed "s/post(['\"]//;s/['\"]//g" | head -3)
fi

for endpoint in $POST_ENDPOINTS; do
  echo "  Testing $endpoint..."
  # Fire 20 parallel requests
  RESULTS=""
  for i in $(seq 1 20); do
    curl -so /dev/null -w "%{http_code}\n" -X POST \
      -H "Content-Type: application/json" -d '{}' \
      "$API_BASE$endpoint" 2>/dev/null &
  done
  wait
  echo "  (Check database for duplicate entries after this test)"
done

# 8c. Memory Leak Indicator (compare /health response time before and after load)
echo "--- Memory Leak Indicator ---"
PRE_LOAD=$(curl -so /dev/null -w "%{time_total}" "$API_BASE/health" 2>/dev/null)
npx autocannon -c 50 -d 30 "$API_BASE/health" > /dev/null 2>&1
POST_LOAD=$(curl -so /dev/null -w "%{time_total}" "$API_BASE/health" 2>/dev/null)
echo "  Health response time before load: ${PRE_LOAD}s"
echo "  Health response time after 30s load: ${POST_LOAD}s"
# Compare using node for float comparison
node -e "const pre=$PRE_LOAD,post=$POST_LOAD;
  const ratio=post/pre;
  if(ratio>3) console.log('  WARN: Response time degraded '+ratio.toFixed(1)+'x after load — possible memory leak');
  else console.log('  PASS: Response time stable after load (ratio: '+ratio.toFixed(1)+'x)');" 2>/dev/null
```

9. **Lighthouse & Frontend Profiling Agent** (if frontend is running):

```bash
echo ""
echo "=== Frontend Runtime Profiling ==="

if [ "$WEB_UP" = "true" ]; then
  WEB_BASE="http://localhost:$WEB_PORT"

  # 9a. Lighthouse Audit (Performance, Accessibility, Best Practices, SEO)
  echo "--- Lighthouse Audit ---"
  if command -v lighthouse &> /dev/null || npx lighthouse --version > /dev/null 2>&1; then
    npx lighthouse "$WEB_BASE" \
      --output=json --output-path="$PRODUCT_DIR/docs/quality-reports/lighthouse.json" \
      --chrome-flags="--headless --no-sandbox" \
      --only-categories=performance,accessibility,best-practices,seo \
      2>/dev/null

    if [ -f "$PRODUCT_DIR/docs/quality-reports/lighthouse.json" ]; then
      node -e "
        const r=JSON.parse(require('fs').readFileSync('$PRODUCT_DIR/docs/quality-reports/lighthouse.json','utf8'));
        const c=r.categories;
        console.log('  Performance:    '+(c.performance.score*100)+'/100');
        console.log('  Accessibility:  '+(c.accessibility.score*100)+'/100');
        console.log('  Best Practices: '+(c['best-practices'].score*100)+'/100');
        console.log('  SEO:            '+(c.seo.score*100)+'/100');
        const lcp=r.audits['largest-contentful-paint'];
        const inp=r.audits['total-blocking-time'];
        const cls=r.audits['cumulative-layout-shift'];
        if(lcp) console.log('  LCP: '+lcp.displayValue);
        if(inp) console.log('  TBT (INP proxy): '+inp.displayValue);
        if(cls) console.log('  CLS: '+cls.displayValue);
      " 2>/dev/null
    fi
  else
    echo "  SKIP: Lighthouse not available (install: npm i -g lighthouse)"
  fi

  # 9b. Bundle Size Analysis
  echo "--- Bundle Size ---"
  if [ -d "$PRODUCT_DIR/apps/web/.next" ]; then
    BUNDLE_SIZE=$(du -sk "$PRODUCT_DIR/apps/web/.next/static" 2>/dev/null | cut -f1)
    echo "  Static bundle: ${BUNDLE_SIZE}KB"
    [ "$BUNDLE_SIZE" -gt 300 ] 2>/dev/null && echo "  WARN: Bundle exceeds 300KB budget" || echo "  PASS: Bundle within budget"
  elif [ -d "$PRODUCT_DIR/apps/web/dist" ]; then
    BUNDLE_SIZE=$(du -sk "$PRODUCT_DIR/apps/web/dist" 2>/dev/null | cut -f1)
    echo "  Dist size: ${BUNDLE_SIZE}KB"
  else
    echo "  SKIP: No build output found (run build first)"
  fi

  # 9c. Core Web Vitals via browser automation
  echo "--- Console Errors ---"
  # Check for JavaScript errors on the main page
  ERR_COUNT=$(curl -s "$WEB_BASE" 2>/dev/null | grep -ciE "(error|exception|undefined is not)" || echo "0")
  echo "  Potential client-side errors in HTML: $ERR_COUNT"
else
  echo "  SKIP: Frontend not running on port $WEB_PORT"
fi
```

10. **Infrastructure Scanning Agent**:

```bash
echo ""
echo "=== Infrastructure Security Scanning ==="

# 10a. Dockerfile Linting
echo "--- Dockerfile Analysis ---"
DOCKERFILES=$(find "$PRODUCT_DIR" -maxdepth 4 -name "Dockerfile" 2>/dev/null)
if [ -n "$DOCKERFILES" ]; then
  for df in $DOCKERFILES; do
    echo "  Scanning: $df"
    # Check for common Dockerfile security issues
    grep -n "^FROM.*:latest" "$df" && echo "    FAIL: Using :latest tag (pin to specific version)"
    grep -n "^USER" "$df" > /dev/null || echo "    WARN: No USER directive (runs as root by default)"
    grep -n "COPY \." "$df" && echo "    WARN: COPY . may include secrets — use .dockerignore"
    grep -in "ENV.*PASSWORD\|ENV.*SECRET\|ENV.*KEY" "$df" && echo "    FAIL: Secrets hardcoded in Dockerfile ENV"
    grep -n "^RUN.*apt-get.*-y" "$df" | grep -v "no-install-recommends" && echo "    WARN: apt-get without --no-install-recommends bloats image"

    # If hadolint is available, run it
    if command -v hadolint &> /dev/null; then
      hadolint "$df" 2>/dev/null | head -10
    fi
  done
else
  echo "  INFO: No Dockerfiles found"
fi

# 10b. Docker Compose Security
echo "--- Docker Compose Analysis ---"
COMPOSE_FILES=$(find "$PRODUCT_DIR" -maxdepth 3 -name "docker-compose*.yml" -o -name "docker-compose*.yaml" 2>/dev/null)
if [ -n "$COMPOSE_FILES" ]; then
  for cf in $COMPOSE_FILES; do
    echo "  Scanning: $cf"
    grep -n "privileged: true" "$cf" && echo "    FAIL: Privileged container detected"
    grep -n "network_mode: host" "$cf" && echo "    WARN: Host network mode — container shares host network"
    grep -n "cap_add:" "$cf" && echo "    WARN: Additional capabilities granted — review necessity"
    grep -inE "(PASSWORD|SECRET|KEY)=" "$cf" | grep -v "\${" && echo "    FAIL: Hardcoded secrets in compose file (use env_file or Docker secrets)"
  done
else
  echo "  INFO: No Docker Compose files found"
fi

# 10c. GitHub Actions Security Audit
echo "--- GitHub Actions Security ---"
if [ -d ".github/workflows" ]; then
  for wf in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$wf" ] || continue
    wf_name=$(basename "$wf")
    # Check for shell injection via ${{ }} in run blocks
    grep -n 'run:.*\${{' "$wf" && echo "    FAIL: $wf_name — shell injection risk: \${{ }} in run block (use env: instead)"
    # Check for unpinned actions
    grep -n "uses:.*@main\|uses:.*@master" "$wf" && echo "    WARN: $wf_name — unpinned action reference (use @sha or @vX.Y.Z)"
    # Check for excessive permissions
    grep -n "permissions: write-all" "$wf" && echo "    WARN: $wf_name — write-all permissions (use least privilege)"
    # Check for secrets in logs
    grep -n "echo.*\${{ secrets" "$wf" && echo "    FAIL: $wf_name — secrets may be printed to logs"
  done
else
  echo "  INFO: No GitHub Actions workflows found"
fi

# 10d. Dependency SBOM and Deep CVE Scan
echo "--- Dependency Deep Scan ---"
if [ -f "$PRODUCT_DIR/apps/api/package-lock.json" ]; then
  echo "  Running npm audit (API)..."
  cd "$PRODUCT_DIR/apps/api" && npm audit --json 2>/dev/null | node -e "
    const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const v=d.metadata?.vulnerabilities||{};
    console.log('    Critical: '+(v.critical||0));
    console.log('    High: '+(v.high||0));
    console.log('    Moderate: '+(v.moderate||0));
    console.log('    Low: '+(v.low||0));
    console.log('    Total: '+(v.total||0));
    if((v.critical||0)>0) console.log('    FAIL: Critical vulnerabilities found');
    else if((v.high||0)>0) console.log('    WARN: High vulnerabilities found');
    else console.log('    PASS: No critical/high vulnerabilities');
  " 2>/dev/null
  cd - > /dev/null
fi
if [ -f "$PRODUCT_DIR/apps/web/package-lock.json" ]; then
  echo "  Running npm audit (Web)..."
  cd "$PRODUCT_DIR/apps/web" && npm audit --json 2>/dev/null | node -e "
    const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const v=d.metadata?.vulnerabilities||{};
    console.log('    Critical: '+(v.critical||0));
    console.log('    High: '+(v.high||0));
    console.log('    Moderate: '+(v.moderate||0));
    console.log('    Total: '+(v.total||0));
  " 2>/dev/null
  cd - > /dev/null
fi

# 10e. Trivy Container Scan (if available and Docker image exists)
echo "--- Container Vulnerability Scan ---"
if command -v trivy &> /dev/null; then
  for df in $DOCKERFILES; do
    IMAGE_NAME=$(grep "^FROM" "$df" | tail -1 | awk '{print $2}')
    echo "  Scanning base image: $IMAGE_NAME"
    trivy image --severity HIGH,CRITICAL --quiet "$IMAGE_NAME" 2>/dev/null | head -20
  done
else
  echo "  SKIP: Trivy not installed (install: brew install trivy)"
fi
```

### Step 3: Synthesize Findings

Combine all exploration results into **two deliverables** within a single report file:

1. **PART A — Sanitized Executive Memo** (Sections 1-3 + Scores + Compliance summary + Risk Register summary). This part contains NO file:line references, NO code snippets, and NO secrets. It is safe to share with board members, investors, and non-technical stakeholders.

2. **PART B — Engineering Appendix** (Sections 4 onwards). This part contains full technical detail: file:line references, code examples (with redacted secrets), exploit scenarios, and fix implementations. It is for the engineering team only.

Both parts are saved to the same file, clearly separated by `---` and headers.

---

## DIAGRAM-FIRST MANDATE (MANDATORY — CEO directive)

**Every section that can be visualised MUST include a Mermaid diagram. Text is supplementary to diagrams, never a replacement.**

| Section | Required Diagram(s) |
|---------|-------------------|
| Section 0 | Audit scope flowchart |
| Section 1 | Score dashboard (`xychart-beta` bar chart of all 11 dimensions) |
| Section 2 | Stop/Fix/Continue flowchart |
| Section 3 | C4 Context diagram + C4 Container diagram |
| Section 4 | Risk severity matrix (quadrant chart) |
| Section 5 | Risk dependency graph (flowchart) |
| Section 6 | Architecture layer diagram showing violations |
| Section 7 | Security finding flow (attack path sequence diagram) |
| Section 12 | Technical debt quadrant chart |
| Section 13 | Remediation Gantt chart |
| Section 15 | AI-Readiness radar (xychart-beta) |

A diagram-free section is an **incomplete section**. If Mermaid cannot render a concept, use ASCII art as fallback — never omit the visual entirely.

---

# PART A — EXECUTIVE MEMO

---

#### Section 0: Methodology & Limitations

This section establishes credibility and sets expectations. It MUST appear before any findings.

**REQUIRED DIAGRAM — Audit Scope Flowchart:**
```mermaid
flowchart TD
    A[Audit Start] --> B[Source Code\napps/api/src · apps/web/src]
    A --> C[Schema & Config\nprisma · .env · docker]
    A --> D[Tests & CI/CD\ntests/ · .github/workflows/]
    A --> E[Dependencies\npackage.json · lock files]
    A --> J[Running Application\nAPI · Frontend]
    B --> F[Static Analysis]
    C --> F
    D --> F
    E --> F
    J --> K[Dynamic Testing]
    K --> K1[DAST Probes\nauth bypass · injection · BOLA]
    K --> K2[Load Testing\nautocannon · race conditions]
    K --> K3[Lighthouse\nperformance · a11y · best practices]
    K --> K4[Infra Scanning\nDockerfile · GH Actions · SBOM]
    F --> G[Synthesis]
    K1 --> G
    K2 --> G
    K3 --> G
    K4 --> G
    G --> H[Executive Memo\nPart A]
    G --> I[Engineering Appendix\nPart B]
```

**Audit Scope:**
- List every directory scanned (e.g., `apps/api/src/`, `apps/web/src/`, `apps/api/prisma/`)
- List every file type included (e.g., `.ts`, `.tsx`, `.prisma`, `.yml`, `.json`, `.env*`)
- Total files reviewed: [count]
- Total lines of code analyzed: [count]

**Methodology:**

*Static Analysis:*
- Manual code review of all source files
- Schema analysis: Prisma schema, database indexes, relations
- Dependency audit: `package.json` and lock file review for known vulnerabilities
- Configuration review: environment files, Docker configs, CI/CD pipelines
- Test analysis: test coverage measurement, test quality assessment, gap identification
- Architecture review: dependency graph, layering, coupling analysis

*Dynamic Testing (requires running application):*
- DAST: Active probing of running API endpoints for auth bypass, injection, BOLA/BFLA, CSRF, header security
- Load testing: Concurrent request stress testing via `autocannon` to measure p95/p99 latency, throughput, error rates under load
- Race condition detection: Parallel identical requests to state-changing endpoints to detect double-spend, duplicate creation, and concurrency bugs
- Runtime performance profiling: Lighthouse audit (Performance, Accessibility, Best Practices, SEO) on frontend pages
- Infrastructure scanning: Dockerfile linting (`hadolint`), Docker Compose security, GitHub Actions audit, dependency SBOM generation

**Out of Scope:**
- Cloud IAM policies and network firewall rules (only application-level infra is scanned)
- Third-party SaaS runtime behavior (only code-level integration points and dependency versions reviewed)
- Generated code (e.g., Prisma client) unless it poses a security risk
- Formal compliance certification (this audit produces evidence artifacts, not formal certificates)

**Limitations:**
- Dynamic tests run against the development environment, not production. Production-specific issues (DNS, load balancer, CDN) are not tested.
- Load testing uses moderate concurrency (100 connections) to detect architectural issues, not full-scale capacity planning.
- Compliance assessments are technical gap analyses with evidence artifacts, not formal certifications.
- Scores reflect the state of the code at the time of audit and may change with subsequent commits.

#### Section 1: Executive Decision Summary (1 page)

**REQUIRED DIAGRAM — Score Dashboard (replace X with actual scores):**
```mermaid
xychart-beta
    title "Audit Score Dashboard — [Product Name]"
    x-axis ["Security", "Architecture", "Test Cov.", "Code Quality", "Performance", "DevOps", "Runability", "Accessibility", "Privacy", "Observability", "API Design"]
    y-axis "Score (0–10)" 0 --> 10
    bar [X, X, X, X, X, X, X, X, X, X, X]
    line [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8]
```
*(The horizontal line at 8 marks the production-ready threshold)*

This section is for CEO/Board/Investors. No jargon. Answer these questions explicitly:

| Question | Answer |
|----------|--------|
| **Can this go to production?** | Yes / No / Conditionally |
| **Is it salvageable?** | Yes / No |
| **Risk if ignored** | Low / High / Catastrophic |
| **Recovery effort** | e.g., "4-8 weeks with 2 engineers" |
| **Enterprise-ready?** | Yes / No — and what's blocking |
| **Compliance-ready?** | SOC2: Y/N, OWASP Top 10: Y/N |

Include a **Top 5 Risks in Plain Language** list — no technical jargon, written so a non-technical executive understands the business consequence:
- BAD: "SQL injection in payment endpoint"
- GOOD: "An attacker could steal payment data through a known web vulnerability"

#### Section 2: Stop / Fix / Continue

**REQUIRED DIAGRAM — Action Priority Flowchart:**
```mermaid
flowchart LR
    subgraph STOP["🛑 STOP — Immediate"]
        S1[Item 1]
        S2[Item 2]
    end
    subgraph FIX["🔧 FIX — Before Production"]
        F1[Item 1]
        F2[Item 2]
        F3[Item 3]
    end
    subgraph CONTINUE["✅ CONTINUE — Working Well"]
        C1[Item 1]
        C2[Item 2]
    end
    STOP --> FIX --> CONTINUE
```

| Category | Items |
|----------|-------|
| **STOP** | Things that must cease immediately (e.g., "Deployments with embedded secrets") |
| **FIX** | Things that must be remediated before production (e.g., "Auth system, config management") |
| **CONTINUE** | Things that are working well (e.g., "Product vision, domain logic, test patterns") |

#### Section 3: System Overview

**REQUIRED DIAGRAM 1 — C4 Level 1: Context (who uses it, what it connects to):**
```mermaid
graph TD
    CEO["👤 CEO / Users"]
    PRODUCT["[Product Name]\nCore System"]
    DB[("PostgreSQL\nDatabase")]
    EXTERNAL["External Services\ne.g. Stripe · Auth0 · S3"]

    CEO -->|"Uses"| PRODUCT
    PRODUCT -->|"Reads/Writes"| DB
    PRODUCT -->|"Calls"| EXTERNAL

    style PRODUCT fill:#1e3a5f,stroke:#4a90d9,color:#fff
    style DB fill:#2d4a2d,stroke:#5a9a5a,color:#fff
    style EXTERNAL fill:#4a3a1e,stroke:#c9a050,color:#fff
```

**REQUIRED DIAGRAM 2 — C4 Level 2: Container (apps, services, tech stack):**
```mermaid
graph TD
    subgraph SYSTEM["[Product Name] — Container View"]
        WEB["Next.js Frontend\nPort :XXXX"]
        API["Fastify API\nPort :XXXX"]
        DB[("PostgreSQL\nDatabase")]
        CACHE[("Redis Cache\nif applicable")]
    end
    BROWSER["👤 Browser"] -->|"HTTPS"| WEB
    WEB -->|"REST /api/v1"| API
    API -->|"Prisma ORM"| DB
    API -->|"ioredis"| CACHE

    style API fill:#1e3a5f,stroke:#4a90d9,color:#fff
    style WEB fill:#2d1e5f,stroke:#9a4ad9,color:#fff
    style DB fill:#2d4a2d,stroke:#5a9a5a,color:#fff
```

**Technology stack table, key flows (auth, payments, etc.), and infrastructure topology follow below.**

#### Section 4: Critical Issues (Top 10)

**REQUIRED DIAGRAM — Risk Severity Matrix:**
```mermaid
quadrantChart
    title Risk Severity Matrix — [Product Name]
    x-axis Low Likelihood --> High Likelihood
    y-axis Low Impact --> High Impact
    quadrant-1 Critical — Act Now
    quadrant-2 High — Plan Soon
    quadrant-3 Low — Monitor
    quadrant-4 Medium — Schedule
    RISK-001: [0.85, 0.90]
    RISK-002: [0.70, 0.75]
    RISK-003: [0.50, 0.80]
    RISK-004: [0.30, 0.60]
    RISK-005: [0.20, 0.30]
```
*(Replace coordinates with actual likelihood/impact values 0–1 for each finding)*

For each issue provide ALL of:
- **File/Location**: exact `file:line` reference
- **Severity**: Critical / High / Medium / Low
- **Likelihood**: How likely is exploitation or failure
- **Blast Radius**: Feature / Product / Organization
- **Risk Owner**: Dev / DevOps / Security / Management
- **Category**: Code / Infrastructure / Process / People
- **Business Impact**: What happens to the business if this is exploited (in plain language)
- **Exploit Scenario**: Step-by-step attack or failure path
- **Fix**: Concrete code or config change with example
- **Compliance Impact**: Which standards this violates (OWASP, SOC2, ISO 27001, GDPR/PDPL if applicable)

#### Section 5: Risk Register

**REQUIRED DIAGRAM — Risk Dependency Graph (resolve in this order):**
```mermaid
flowchart TD
    R001["RISK-001\nCritical"]:::crit --> R003["RISK-003\nHigh"]:::high
    R001 --> R004["RISK-004\nMedium"]:::med
    R002["RISK-002\nCritical"]:::crit --> R005["RISK-005\nHigh"]:::high
    R003 --> R006["RISK-006\nMedium"]:::med
    R005 --> R007["RISK-007\nLow"]:::low
    R004 --> R008["RISK-008\nLow"]:::low

    classDef crit fill:#7f1d1d,stroke:#ef4444,color:#fff
    classDef high fill:#7c2d12,stroke:#f97316,color:#fff
    classDef med fill:#713f12,stroke:#eab308,color:#fff
    classDef low fill:#1e3a5f,stroke:#60a5fa,color:#fff
```
*(Replace RISK-IDs and dependency edges with actual findings from this audit)*

A single consolidated table that tracks every finding as a trackable item with clear ownership and SLAs. This is what management uses to assign work and track remediation.

| Issue ID | Title | Domain | Severity | Owner | SLA | Dependency | Verification | Status |
|----------|-------|--------|----------|-------|-----|------------|--------------|--------|
| RISK-001 | [Concise title] | Security / Performance / Architecture / DevOps / Testing | Critical / High / Medium / Low | Dev / DevOps / Security / Management (named team or person if known) | Phase 0 (48h) / Phase 1 (1-2w) / Phase 2 (2-4w) / Phase 3 (4-8w) | Other RISK-IDs that must be resolved first, or "None" | How to confirm the fix works (test name, manual check, metric threshold) | Open / In Progress / Resolved |

Rules for the Risk Register:
- Every finding from Sections 4, 6, 7, 8, and 9 MUST appear as a row in this table
- Issue IDs are sequential: RISK-001, RISK-002, etc.
- **Owner** must be a specific role, not "Team" — if unclear, assign to Management for triage
- **SLA** maps directly to the Remediation Roadmap phases
- **Dependency** prevents parallel-work conflicts (e.g., "RISK-003 requires RISK-001 to be resolved first because the auth fix changes the middleware signature")
- **Verification** must be concrete: a test file name, a curl command, a metric check — not "verify it works"

---

# PART B — ENGINEERING APPENDIX

(This section contains file:line references, code examples, and technical detail. For engineering team only.)

---

#### Section 6: Architecture Problems

**REQUIRED DIAGRAM — Architecture Layer Diagram (show actual violations as ⚡ edges):**
```mermaid
graph TD
    subgraph PRESENTATION["Presentation Layer"]
        WEB["Next.js Pages\napps/web/src/pages/"]
        COMP["Components\napps/web/src/components/"]
    end
    subgraph APPLICATION["Application Layer"]
        ROUTES["Fastify Routes\napps/api/src/routes/"]
        SERVICES["Services\napps/api/src/services/"]
    end
    subgraph DOMAIN["Domain / Business Logic"]
        BIZ["Business Rules\napps/api/src/domain/"]
        WORKERS["Workers\napps/api/src/workers/"]
    end
    subgraph INFRA["Infrastructure Layer"]
        DB[("PostgreSQL\nPrisma ORM")]
        PLUGINS["Plugins\napps/api/src/plugins/"]
        CACHE[("Cache / Queue")]
    end

    WEB -->|"REST"| ROUTES
    COMP --> WEB
    ROUTES --> SERVICES
    SERVICES --> BIZ
    SERVICES --> WORKERS
    BIZ --> DB
    SERVICES --> PLUGINS
    PLUGINS --> DB
    WORKERS --> CACHE

    ROUTES -->|"⚡ VIOLATION: Direct DB access\nfile:line"| DB
    BIZ -->|"⚡ VIOLATION: Cross-domain import\nfile:line"| SERVICES

    style PRESENTATION fill:#1e1e3f,stroke:#6366f1
    style APPLICATION fill:#1e3a1e,stroke:#22c55e
    style DOMAIN fill:#3f2d1e,stroke:#f59e0b
    style INFRA fill:#1e1e1e,stroke:#94a3b8
```
*(Replace ⚡ violation edges with actual file:line violations found during the audit)*

- Layering violations, coupling, bottlenecks
- Each with file:line references and impact assessment

#### Section 7: Security Findings

**REQUIRED DIAGRAM — Attack Path Sequence (show the worst-case exploit chain):**
```mermaid
sequenceDiagram
    actor Attacker
    participant API as Fastify API
    participant DB as PostgreSQL
    participant Victim as Victim Account

    Note over Attacker,Victim: Attack Path: [Describe the vulnerability chain]

    Attacker->>API: POST /api/auth/login<br/>{"email": "victim@example.com"}
    Note right of API: ⚡ No rate limiting (RISK-001)
    API->>DB: SELECT * FROM users WHERE email = ?
    DB-->>API: User record
    API-->>Attacker: 200 OK — account enumeration possible

    Attacker->>API: GET /api/users/999/profile<br/>Authorization: Bearer [attacker_token]
    Note right of API: ⚡ Missing object-level auth (RISK-002)<br/>OWASP API1: BOLA
    API->>DB: SELECT * FROM users WHERE id = 999
    DB-->>API: Victim's PII data
    API-->>Attacker: 200 OK — victim's data exposed

    Note over Attacker,Victim: Impact: PII breach, account takeover
```
*(Replace with the actual worst-case attack chain found during this audit. Show each step with RISK-ID references)*

Organized by category:
- Authentication & Authorization
- Injection Vulnerabilities
- Data Security
- API Security
- Infrastructure Security

For each finding, note:
- OWASP Top 10 category (if applicable)
- SOC2 control mapping (if applicable)

#### Section 8: Performance & Scalability

- Database query analysis
- Memory and resource usage
- Algorithm efficiency
- Caching strategy assessment
- Each with file:line references

#### Section 9: Testing Gaps

- Coverage % (actual or estimated)
- Missing test scenarios
- Brittle or flaky tests
- Missing test categories (unit, integration, E2E, load, security)

#### Section 10: DevOps Issues

- CI/CD pipeline assessment
- Deployment safety
- Monitoring and alerting
- Rollback capability
- Secret management

#### Section 11: Compliance Readiness

Map findings to compliance frameworks with explicit control-by-control assessment. Do NOT summarize with a single "X/10" — list every control individually.

**OWASP Top 10 (2021) — Control-by-Control:**

| Control | Status | Evidence / Gap |
|---------|--------|----------------|
| A01: Broken Access Control | Pass / Partial / Fail | Specific findings with file:line references |
| A02: Cryptographic Failures | Pass / Partial / Fail | Specific findings |
| A03: Injection | Pass / Partial / Fail | Specific findings |
| A04: Insecure Design | Pass / Partial / Fail | Specific findings |
| A05: Security Misconfiguration | Pass / Partial / Fail | Specific findings |
| A06: Vulnerable and Outdated Components | Pass / Partial / Fail | Specific findings |
| A07: Identification and Authentication Failures | Pass / Partial / Fail | Specific findings |
| A08: Software and Data Integrity Failures | Pass / Partial / Fail | Specific findings |
| A09: Security Logging and Monitoring Failures | Pass / Partial / Fail | Specific findings |
| A10: Server-Side Request Forgery (SSRF) | Pass / Partial / Fail | Specific findings |

**SOC2 Type II — Trust Service Principles:**

| Principle | Status | Evidence / Gap |
|-----------|--------|----------------|
| Security (Common Criteria) | Pass / Partial / Fail | Specific findings |
| Availability | Pass / Partial / Fail | Specific findings |
| Processing Integrity | Pass / Partial / Fail | Specific findings |
| Confidentiality | Pass / Partial / Fail | Specific findings |
| Privacy | Pass / Partial / Fail | Specific findings (if applicable) |

**ISO 27001 Annex A — Key Controls:**

| Control Area | Status | Evidence / Gap |
|-------------|--------|----------------|
| A.5 Information Security Policies | Pass / Partial / Fail | Specific findings |
| A.6 Organization of Information Security | Pass / Partial / Fail | Specific findings |
| A.8 Asset Management | Pass / Partial / Fail | Specific findings |
| A.9 Access Control | Pass / Partial / Fail | Specific findings |
| A.10 Cryptography | Pass / Partial / Fail | Specific findings |
| A.12 Operations Security | Pass / Partial / Fail | Specific findings |
| A.14 System Acquisition, Development and Maintenance | Pass / Partial / Fail | Specific findings |
| A.16 Information Security Incident Management | Pass / Partial / Fail | Specific findings |
| A.18 Compliance | Pass / Partial / Fail | Specific findings |

**OWASP API Security Top 10 (2023):**

| Risk | Status | Evidence / Gap |
|------|--------|----------------|
| API1: Broken Object Level Authorization (BOLA) | Pass / Partial / Fail | Specific findings |
| API2: Broken Authentication | Pass / Partial / Fail | Specific findings |
| API3: Broken Object Property Level Authorization | Pass / Partial / Fail | Specific findings |
| API4: Unrestricted Resource Consumption | Pass / Partial / Fail | Specific findings |
| API5: Broken Function Level Authorization (BFLA) | Pass / Partial / Fail | Specific findings |
| API6: Unrestricted Sensitive Business Flows | Pass / Partial / Fail | Specific findings |
| API7: Server Side Request Forgery (SSRF) | Pass / Partial / Fail | Specific findings |
| API8: Security Misconfiguration | Pass / Partial / Fail | Specific findings |
| API9: Improper Inventory Management | Pass / Partial / Fail | Specific findings |
| API10: Unsafe Consumption of APIs | Pass / Partial / Fail | Specific findings |

**WCAG 2.1 AA (Accessibility):**

| Principle | Status | Evidence / Gap |
|-----------|--------|----------------|
| 1. Perceivable (text alternatives, contrast, adaptable) | Pass / Partial / Fail | Specific findings |
| 2. Operable (keyboard, timing, navigation) | Pass / Partial / Fail | Specific findings |
| 3. Understandable (readable, predictable, input assistance) | Pass / Partial / Fail | Specific findings |
| 4. Robust (compatible with assistive tech) | Pass / Partial / Fail | Specific findings |
| Lighthouse Accessibility Score | [score]/100 | |

**GDPR/PDPL (Privacy & Data Protection):**

| Requirement | Status | Evidence / Gap |
|-------------|--------|----------------|
| Consent capture (granular, withdrawable, auditable) | Implemented / Partial / Missing | Specific findings |
| Right of Access (Art. 15) | Implemented / Missing | DSAR mechanism details |
| Right to Rectification (Art. 16) | Implemented / Missing | User data correction capability |
| Right to Erasure (Art. 17) | Implemented / Missing | Deletion cascade, backups |
| Right to Restrict Processing (Art. 18) | Implemented / Missing | Processing limitation mechanism |
| Right to Data Portability (Art. 20) | Implemented / Missing | Export format |
| Right to Object (Art. 21) | Implemented / Missing | Objection mechanism |
| Data Minimization | Pass / Fail | Only necessary data collected? |
| Retention Policies | Defined / Undefined | Per-type retention periods |
| Encryption at Rest | Yes / No | Database and file encryption |
| No PII in Logs | Pass / Fail | Log scanning results |
| Breach Notification Process | Documented / Undocumented | 72-hour notification capability |

**DORA Metrics (Delivery Health):**

| Metric | Value | Tier |
|--------|-------|------|
| Deployment Frequency | [value] | Elite / High / Medium / Low |
| Lead Time for Changes | [value] | Elite / High / Medium / Low |
| Change Failure Rate | [value] | Elite / High / Medium / Low |
| Time to Restore Service | [value] | Elite / High / Medium / Low |

Note: This is a technical audit assessment, not a formal compliance certification. It identifies technical gaps that would block compliance.

#### Section 11b: Accessibility Assessment

WCAG 2.1 AA assessment for all frontend pages:

- **Automated checks** (run Lighthouse Accessibility or axe-core):
  - Color contrast ratios (1.4.3: >= 4.5:1 text, 1.4.11: >= 3:1 non-text)
  - Alt text on all images (1.1.1)
  - Form labels present and associated (1.3.1, 3.3.2)
  - Heading hierarchy (no skipped levels) (1.3.1)
  - Language attribute on HTML element (3.1.1)
  - ARIA roles and properties correct (4.1.2)
  - Focus indicators visible (2.4.7)
  - Keyboard navigation for all interactive elements (2.1.1)
  - No keyboard traps (2.1.2)
  - Content reflows at 320px width (1.4.10)

- **Manual checks**:
  - Screen reader compatibility (meaningful reading order, status messages announced)
  - Error identification in text (3.3.1) — not just color
  - Error suggestions provided (3.3.3)
  - Consistent navigation across pages (3.2.3)
  - Link purpose clear from context (2.4.4)
  - Page titles descriptive (2.4.2)

Report: Lighthouse Accessibility score, list of violations by severity, affected pages/components.

#### Section 11c: Privacy & Data Protection Assessment

For each personal data type collected by the product:

| Data Type | Lawful Basis | Retention Period | Encrypted at Rest | Deletable | Exportable |
|-----------|-------------|------------------|-------------------|-----------|------------|
| e.g., Email | Consent | 2 years | Yes/No | Yes/No | Yes/No |

Check and report on:
- Consent capture mechanism (granular? withdrawable? timestamped?)
- All 6 GDPR data subject rights implementation status
- PII presence in application logs (scan for email patterns, names, IPs)
- Data minimization (only necessary fields collected?)
- Cross-border data transfer safeguards (if applicable)

#### Section 11d: Observability Assessment

| Signal | Monitored | Tool/Method | Alert Threshold |
|--------|-----------|-------------|-----------------|
| Latency (p50/p95/p99) | Yes/No | [tool] | [threshold] |
| Traffic (req/sec) | Yes/No | [tool] | [threshold] |
| Errors (error rate %) | Yes/No | [tool] | [threshold] |
| Saturation (CPU/mem/disk) | Yes/No | [tool] | [threshold] |

Check and report on:
- Structured logging format (JSON with correlation IDs, or unstructured?)
- Log levels configured (ERROR/WARN/INFO/DEBUG) with DEBUG off in production
- Distributed tracing present (OpenTelemetry SDK? W3C Trace Context headers?)
- Health check endpoints (exist? monitored externally?)
- Error tracking service (Sentry, Datadog, etc.?)
- Database monitoring (slow query log, connection pool, replication lag)
- Alerting strategy (SLO-based or raw metrics? Runbooks exist?)
- No sensitive data in logs (PII, tokens, passwords)

#### Section 11e: API Design Assessment

| Check | Status | Details |
|-------|--------|---------|
| OpenAPI/Swagger documentation complete | Yes/Partial/No | Coverage % |
| API versioning strategy | Implemented/Missing | URL path, header, or query param |
| Consistent error format (RFC 7807) | Yes/No | Example |
| Pagination on all list endpoints | Yes/Partial/No | Endpoints missing pagination |
| BOLA protection (object-level authz) | Pass/Fail | Test: User A accesses User B's object |
| BFLA protection (function-level authz) | Pass/Fail | Test: Regular user accesses admin endpoint |
| Rate limiting configured | Yes/Partial/No | Endpoints and limits |
| CORS properly configured | Yes/No | No wildcard in production |
| Request/response schema validation | Yes/Partial/No | Middleware used |
| Deprecated endpoints marked | N/A/Yes/No | Sunset dates |

#### Section 11f: Dynamic Security Testing (DAST) Results

Report all findings from the DAST probes (Step 2b, Agent 7):

| # | Test | Status | Details |
|---|------|--------|---------|
| 1 | Security Headers (HSTS, X-Frame, CSP, X-Content-Type) | PASS/FAIL | Missing headers listed |
| 2 | CORS Origin Reflection | PASS/FAIL | Does API reflect arbitrary origins? |
| 3 | Unauthenticated Endpoint Access | PASS/WARN/FAIL | List endpoints returning 200 without auth |
| 4 | SQL Injection Response | PASS/WARN | Endpoints returning 500 on injection payloads |
| 5 | Rate Limiting (Auth endpoints) | PASS/FAIL | 429 observed after N requests, or never triggered |
| 6 | Error Information Disclosure | PASS/FAIL | Stack traces in error responses? |
| 7 | HTTP Method Override | PASS/WARN | Override headers accepted? |

**DAST Verdict**: PASS / WARN / FAIL

If DAST was skipped (application not running), note: "DAST skipped — application was not running during audit."

#### Section 11g: Load Testing & Race Condition Results

Report all findings from the load testing (Step 2b, Agent 8):

**API Performance Under Load (100 concurrent connections, 10 seconds):**

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Requests/sec | [value] | >= 1000 | PASS/FAIL |
| Latency p50 | [value]ms | <= 100ms | PASS/WARN/FAIL |
| Latency p95 | [value]ms | <= 400ms | PASS/WARN/FAIL |
| Latency p99 | [value]ms | <= 1000ms | PASS/WARN/FAIL |
| Error count | [value] | 0 | PASS/FAIL |
| Timeout count | [value] | 0 | PASS/FAIL |
| Non-2xx responses | [value] | 0 | PASS/WARN |

**Race Condition Tests:**

| Endpoint | Parallel Requests | Duplicates Created | Status |
|----------|------------------|--------------------|--------|
| [endpoint] | 20 | [count] | PASS/FAIL |

**Memory Leak Indicator:**

| Metric | Before Load | After 30s Load | Ratio | Status |
|--------|-------------|----------------|-------|--------|
| Health response time | [value]s | [value]s | [X]x | PASS/WARN |

#### Section 11h: Lighthouse & Frontend Profile

If frontend was tested, report Lighthouse scores:

| Category | Score | Threshold | Status |
|----------|-------|-----------|--------|
| Performance | [X]/100 | >= 90 | PASS/WARN/FAIL |
| Accessibility | [X]/100 | >= 90 | PASS/WARN/FAIL |
| Best Practices | [X]/100 | >= 90 | PASS/WARN/FAIL |
| SEO | [X]/100 | >= 90 | PASS/WARN/FAIL |

**Core Web Vitals:**

| Metric | Value | Good Threshold | Status |
|--------|-------|---------------|--------|
| LCP (Largest Contentful Paint) | [value] | <= 2.5s | PASS/WARN/FAIL |
| TBT/INP (Total Blocking Time) | [value] | <= 200ms | PASS/WARN/FAIL |
| CLS (Cumulative Layout Shift) | [value] | <= 0.1 | PASS/WARN/FAIL |

**Bundle Size:** [X]KB (budget: 300KB gzip)

Full Lighthouse report saved to: `$PRODUCT_DIR/docs/quality-reports/lighthouse.json`

#### Section 11i: Infrastructure Security Results

Report findings from the infrastructure scan (Step 2b, Agent 10):

**Dockerfile Security:**

| # | File | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 1 | [path] | [issue] | High/Med/Low | [fix] |

**Docker Compose Security:**

| # | File | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 1 | [path] | [issue] | High/Med/Low | [fix] |

**GitHub Actions Security:**

| # | Workflow | Issue | Severity | Fix |
|---|---------|-------|----------|-----|
| 1 | [name] | Shell injection risk | Critical | Move `${{ }}` to env: block |
| 2 | [name] | Unpinned action | Medium | Pin to @sha256 |

**Dependency Vulnerability Summary:**

| Component | Critical | High | Moderate | Low | Total |
|-----------|----------|------|----------|-----|-------|
| API | [X] | [X] | [X] | [X] | [X] |
| Web | [X] | [X] | [X] | [X] | [X] |

**Infrastructure Verdict**: PASS / WARN / FAIL

#### Section 12: Technical Debt Map

**REQUIRED DIAGRAM — Technical Debt Quadrant (effort to fix vs. cost of delay):**
```mermaid
quadrantChart
    title Technical Debt Quadrant — [Product Name]
    x-axis Low Effort to Fix --> High Effort to Fix
    y-axis Low Cost of Delay --> High Cost of Delay
    quadrant-1 Pay Now — High Impact, Quick Win
    quadrant-2 Schedule — Strategic Investment
    quadrant-3 Deprioritize — Low Value
    quadrant-4 Quick Wins — Do First
    Missing rate limiting: [0.15, 0.90]
    No API versioning: [0.25, 0.60]
    Test coverage gaps: [0.55, 0.80]
    No structured logging: [0.30, 0.70]
    Missing OpenAPI docs: [0.35, 0.45]
    Circular dependencies: [0.70, 0.55]
    No DB migrations CI: [0.50, 0.65]
```
*(Replace items with actual debt found. X = effort to fix 0–1, Y = cost of delay 0–1)*

Categorize debt by urgency and cost:

| Priority | Debt Item | Interest (cost of delay) | Owner | Payoff |
|----------|-----------|--------------------------|-------|--------|
| HIGH | ... | ... | Dev/DevOps/Security | ... |
| MEDIUM | ... | ... | ... | ... |
| LOW | ... | ... | ... | ... |

#### Section 13: Remediation Roadmap (Phased)

**REQUIRED DIAGRAM — Remediation Gantt Chart:**
```mermaid
gantt
    title Remediation Roadmap — [Product Name]
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section Phase 0 — Immediate (48h)
    Rotate exposed secrets         :crit, p0a, 2025-01-01, 1d
    Patch critical vulnerabilities :crit, p0b, after p0a, 1d

    section Phase 1 — Stabilize (1-2 weeks)
    Auth hardening                 :active, p1a, after p0b, 4d
    Input validation & rate limits :p1b, after p0b, 3d
    CI/CD security gates           :p1c, after p1a, 3d
    Config management              :p1d, after p1b, 2d

    section Phase 2 — Production-Ready (2-4 weeks)
    Architecture refactor          :p2a, after p1c, 7d
    Test coverage to 80%+          :p2b, after p1c, 10d
    Observability stack            :p2c, after p1d, 5d
    Compliance gaps (GDPR/OWASP)   :p2d, after p2a, 7d

    section Phase 3 — Excellence (4-8 weeks)
    Performance optimization       :p3a, after p2b, 10d
    Advanced security controls     :p3b, after p2d, 14d
    External audit prep            :p3c, after p3a, 7d
```
*(Adjust task names, durations, and dates to match the actual findings and available team capacity)*

NOT a vague 30/60/90 day plan. Concrete phases with clear gates:

**Phase 0 — Immediate (48 hours)**
- What must happen RIGHT NOW to prevent breach/outage
- e.g., Rotate secrets, revoke exposed keys, patch critical vulns
- Owner for each item
- Gate: All Phase 0 items resolved before any deployment

**Phase 1 — Stabilize (1-2 weeks)**
- Security hardening, config management, CI/CD fixes
- Owner for each item
- Gate: All scores >= 6/10, no Critical issues remaining

**Phase 2 — Production-Ready (2-4 weeks)**
- Architecture improvements, test coverage, monitoring
- Owner for each item
- Gate: All scores >= 8/10, compliance gaps addressed

**Phase 3 — Excellence (4-8 weeks)**
- Optimization, advanced security, operational maturity
- Owner for each item
- Gate: All scores >= 9/10, audit-ready for external review

#### Section 14: Quick Wins (1-day fixes)

Numbered list of changes that can be done in under a day each, with file references.

#### Section 15: AI-Readiness Score (0-10 with sub-scores)

**REQUIRED DIAGRAM — AI-Readiness Profile:**
```mermaid
xychart-beta
    title "AI-Readiness Score — [Product Name]"
    x-axis ["Modularity", "API Design", "Testability", "Observability", "Documentation"]
    y-axis "Score (0–2)" 0 --> 2
    bar [X, X, X, X, X]
    line [2, 2, 2, 2, 2]
```
*(Replace X with actual sub-scores 0–2. The line at 2 marks the full-score threshold. Sum = AI-Readiness total out of 10)*

| Sub-dimension | Score | Notes |
|---------------|-------|-------|
| Modularity | X/2 | ... |
| API Design | X/2 | ... |
| Testability | X/2 | ... |
| Observability | X/2 | ... |
| Documentation | X/2 | ... |

### Step 4: Calculate Scores

Produce THREE score categories:

#### A. Technical Dimension Scores (0-10 scale, 11 dimensions)

**Core Dimensions (7):**

- **Security**: Auth, input validation, secrets, OWASP Top 10, OWASP ASVS L2, CWE/SANS Top 25 coverage. Scoring guide:
  - Check OWASP ASVS categories: V2 (Auth), V3 (Sessions), V4 (Access Control), V5 (Validation), V6 (Crypto), V7 (Error/Logging), V8 (Data Protection), V13 (API Security), V14 (Configuration)
  - Check CWE Top 25 applicable weaknesses: XSS (CWE-79), SQLi (CWE-89), CSRF (CWE-352), Path Traversal (CWE-22), Command Injection (CWE-78), Missing Auth (CWE-862/306), Hardcoded Creds (CWE-798)
  - Check OWASP API Security Top 10 (2023): BOLA (API1), Broken Auth (API2), Broken Object Property Auth (API3), Unrestricted Resource Consumption (API4), BFLA (API5), Sensitive Business Flows (API6), SSRF (API7), Misconfiguration (API8), Inventory (API9), Unsafe Consumption (API10)
- **Architecture**: Separation of concerns, patterns, scalability, ISO 25010 Maintainability (modularity, reusability, analyzability, modifiability, testability)
- **Test Coverage**: Line coverage %, edge case coverage, integration tests, database state verification, traceability to requirements
- **Code Quality**: Readability, DRY, error handling, logging, complexity (cyclomatic < 10), naming, no dead code, type safety
- **Performance**: Concrete thresholds required:
  - Backend: API p95 latency <= 400ms, p99 <= 1000ms, error rate < 1%, no N+1 queries, DB query p95 < 100ms
  - Frontend: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1, Lighthouse Performance >= 90
  - Budgets: JS bundle < 300KB gzip, total page < 1.5MB, < 50 requests
- **DevOps**: CI/CD pipeline, deployment safety, secrets management, rollback capability. Include DORA metrics assessment:
  - Deployment Frequency (Elite: multiple/day, High: weekly-monthly)
  - Lead Time for Changes (Elite: < 1 day, High: < 1 week)
  - Change Failure Rate (Elite: 0-15%)
  - Time to Restore (Elite: < 1 hour, High: < 1 day)
- **Runability**: Does it actually start and serve real responses? Scoring guide:
  - 0: No start script, missing deps, immediate crash
  - 2: Starts but crashes within seconds
  - 4: Starts but /health or frontend returns errors
  - 6: Starts and /health passes, but frontend has placeholder pages
  - 8: Full stack starts, health OK, UI loads real data, no placeholders
  - 10: Full stack starts, health OK, real data, no placeholders, production build succeeds, zero console errors

**New Dimensions (4):**

- **Accessibility**: WCAG 2.1 AA compliance. Scoring guide:
  - Check: Color contrast >= 4.5:1 (WCAG 1.4.3), alt text on images (1.1.1), form labels (1.3.1/3.3.2), keyboard navigation (2.1.1), focus indicators (2.4.7), heading hierarchy (1.3.1), language attribute (3.1.1), ARIA roles (4.1.2), reflow at 320px (1.4.10), error identification (3.3.1)
  - 0: No accessibility consideration at all
  - 4: Some alt text and labels but major keyboard/contrast issues
  - 6: Lighthouse Accessibility >= 70, basic keyboard nav works
  - 8: Lighthouse Accessibility >= 90, keyboard nav complete, contrast passes, ARIA correct
  - 10: Full WCAG 2.1 AA compliance, tested with screen reader, no violations
- **Privacy & Data Protection**: GDPR/PDPL compliance. Scoring guide:
  - Check: Consent capture (granular, withdrawable, auditable), data subject rights (access, rectification, erasure, portability, restrict, object), data minimization, retention policies, encryption at rest, no PII in logs, data processing register
  - 0: No privacy consideration, PII stored in plaintext, no consent
  - 4: Passwords hashed but PII in logs, no consent mechanism, no deletion capability
  - 6: Basic consent, password hashing, but no DSAR mechanism, no retention policy
  - 8: Consent capture, all 6 data subject rights implemented, no PII in logs, encryption at rest
  - 10: Full GDPR compliance, automated retention, DPIA completed, breach notification process
- **Observability**: Production monitoring readiness (SRE Four Golden Signals). Scoring guide:
  - Check: Structured logging (JSON + correlation IDs), Four Golden Signals monitored (latency, traffic, errors, saturation), distributed tracing (OpenTelemetry/W3C Trace Context), SLO-based alerting, runbooks for P1/P2 alerts, health check endpoints, error tracking, database monitoring, dependency health monitoring
  - 0: No logging, no monitoring, no health endpoints
  - 4: Basic console.log, health endpoint exists, no structured logging
  - 6: Structured JSON logging, health checks, basic error tracking, no tracing
  - 8: Structured logging with correlation IDs, all 4 golden signals monitored, error tracking with context, DB monitoring
  - 10: Full observability stack (logs + metrics + traces), SLO-based alerting, runbooks, circuit breakers, dependency monitoring
- **API Design**: REST/GraphQL design quality and OWASP API Top 10 compliance. Scoring guide:
  - Check: OpenAPI/Swagger documentation complete, API versioning strategy, consistent error format (RFC 7807), pagination on all list endpoints, no overfetching, CORS configured (no wildcard), request/response schema validation, deprecated endpoints marked, BOLA/BFLA protection verified
  - 0: No documentation, inconsistent responses, no pagination
  - 4: Some Swagger docs but incomplete, inconsistent error format
  - 6: OpenAPI docs, consistent errors, pagination, but no versioning, some BOLA gaps
  - 8: Complete OpenAPI docs, consistent RFC 7807 errors, pagination, BOLA/BFLA verified, CORS correct
  - 10: Full API documentation, versioning, deprecation policy, all OWASP API Top 10 addressed

**Technical Score** = average of all 11 dimension scores.

#### Deterministic Score Anchoring (MANDATORY)

To ensure audit scores are consistent and reproducible across runs, each dimension score
MUST be anchored to at least 2 measurable data points. Do NOT assign scores based on
"general impression" — every score must cite evidence.

**Before assigning any score, collect these concrete measurements:**

| Dimension | Required Measurements | How to Measure |
|-----------|----------------------|----------------|
| Security | npm audit HIGH/CRITICAL count; grep for hardcoded secrets; DAST findings | `cd apps/api && npm audit --audit-level=high`; `grep -r "password\|secret\|api_key" --include="*.ts" -l`; DAST auth bypass count, rate limit test result |
| Architecture | File count per directory; import depth | `find apps/ -name "*.ts" | wc -l`; check circular deps |
| Test Coverage | Coverage % from Jest | `npm test -- --coverage` |
| Code Quality | ESLint error/warning count; `any` type count | `npx eslint . --format json 2>/dev/null | grep -c "error"`; `grep -r ": any" --include="*.ts" | wc -l` |
| Performance | Lighthouse score; bundle size; autocannon p95/p99; load test errors | Lighthouse CLI; `du -sk .next/static/chunks/`; autocannon JSON output |
| DevOps | CI workflow exists; Docker exists; .env.example exists | `ls .github/workflows/`; `ls Dockerfile`; `ls .env.example` |
| Runability | Server starts; health check responds; frontend loads | `curl -s localhost:{PORT}/health`; `curl -s localhost:{FRONTEND_PORT}` |
| Accessibility | Lighthouse Accessibility score | Lighthouse CLI `--only-categories=accessibility` |
| Privacy | PII in logs check; deletion endpoint exists | `grep -r "email\|password" --include="*.ts" apps/api/src/ | grep -i "log"` |
| Observability | Structured logger configured; health endpoint exists | `grep -r "pino\|winston" --include="*.ts"` |
| API Design | Route count; schema validation count | `grep -r "route\|fastify\.\(get\|post\|put\|delete\)" --include="*.ts" | wc -l` |

**Score consistency rules:**
- If npm audit shows >= 1 CRITICAL vulnerability: Security score CANNOT exceed 4/10
- If test coverage < 50%: Test Coverage score CANNOT exceed 4/10
- If no CI workflow exists: DevOps score CANNOT exceed 3/10
- If server doesn't start: Runability score CANNOT exceed 2/10
- If Lighthouse Accessibility < 50: Accessibility score CANNOT exceed 3/10
- If DAST finds auth bypass on protected endpoints: Security score CANNOT exceed 3/10
- If rate limiting not detected on auth endpoints: Security score CANNOT exceed 5/10
- If autocannon p99 > 2000ms: Performance score CANNOT exceed 4/10
- If Dockerfile uses :latest or runs as root: DevOps score CANNOT exceed 6/10
- If GitHub Actions has shell injection (${{ }} in run:): DevOps score CANNOT exceed 4/10
- If load test shows errors > 1%: Performance score CANNOT exceed 5/10
- If race condition duplicates detected: Architecture score CANNOT exceed 5/10
- These caps are non-negotiable and ensure score consistency across audit runs

**In the report, for each dimension score, include:**
```
**[Dimension]: X/10**
Evidence:
- [Measurement 1]: [value]
- [Measurement 2]: [value]
- [Qualitative finding]: [description with file:line]
Score justification: [1 sentence explaining why X and not X-1 or X+1]
```

#### B. Readiness Scores (0-10 scale)

These translate technical findings into business decisions:

- **Security Readiness**: Can it withstand real-world attacks? (weighted: Security 40% + API Design 20% + DevOps 20% + Architecture 20%)
- **Product Potential**: Is the core product logic sound? (weighted: Code Quality 30% + Architecture 25% + Runability 25% + Accessibility 20%)
- **Enterprise Readiness**: Can it onboard regulated/enterprise customers? (weighted: Security 30% + Privacy 25% + Observability 20% + DevOps 15% + Compliance mapping 10%)

This prevents the "everything is garbage" reaction. A product can score 3/10 on Security Readiness but 7/10 on Product Potential — meaning the vision is sound but the security posture needs work.

#### C. Overall Score

**Overall Score** = average of Technical Score and Readiness Scores.

#### D. Framework Coverage Summary

Every audit must report coverage against these frameworks:

| Framework | How to Report |
|-----------|--------------|
| OWASP Top 10 (2021) | Control-by-control: A01-A10 Pass/Partial/Fail (already in Section 11) |
| OWASP API Top 10 (2023) | API1-API10 Pass/Partial/Fail (new in Section 11) |
| OWASP ASVS L2 | Categories V1-V14 coverage percentage |
| CWE/SANS Top 25 | Applicable weaknesses checked/not-checked |
| WCAG 2.1 AA | Principles (POUR) with pass/fail per guideline |
| GDPR | 6 data subject rights + consent + retention: implemented/missing |
| ISO 25010 | Map each finding to quality characteristic |
| DORA Metrics | 4 metrics with Elite/High/Medium/Low tier |
| SRE Golden Signals | 4 signals: monitored/not-monitored |

### Step 5: Save Report

Save the full audit report to:
```
$PRODUCT_DIR/docs/AUDIT-REPORT.md
```

### Step 6: Score Gate Check

**If any technical dimension score < 8/10 OR overall score < 8/10:**

1. Identify which dimensions are below 8
2. For each low-scoring dimension, create a concrete improvement plan:
   - What specific changes are needed (with file:line references)
   - Owner: Dev / DevOps / Security / Management
   - Expected score improvement per change
   - Phase assignment (0/1/2/3)
3. Present the improvement plan to the Orchestrator
4. The Orchestrator should automatically execute the improvement plan:
   - Assign tasks to the appropriate agents (backend-engineer for code, qa-engineer for tests, etc.)
   - After improvements are made, re-run `/audit` on the improved code
   - Repeat until all scores reach 8/10

**If all scores >= 8/10:**
- Present results to CEO
- CEO decides whether to push for higher scores (9/10 or 10/10) or accept

### Step 7: Present Summary

Output a summary to the CEO:

```
Audit Complete: [product-name]

============================================
EXECUTIVE DECISION
============================================
Can go to production?  [Yes / No / Conditionally]
Is it salvageable?     [Yes]
Risk if ignored:       [Low / High / Catastrophic]
Recovery effort:       [X weeks, Y engineers]
Enterprise-ready?      [Yes / No]

============================================
STOP / FIX / CONTINUE
============================================
STOP:     [1-2 items that must cease immediately]
FIX:      [2-3 items that must be remediated]
CONTINUE: [2-3 things working well]

============================================
SCORES (11 Dimensions)
============================================
CORE DIMENSIONS:
- Security:       X/10  [PASS/BELOW THRESHOLD]
- Architecture:   X/10  [PASS/BELOW THRESHOLD]
- Test Coverage:  X/10  [PASS/BELOW THRESHOLD]
- Code Quality:   X/10  [PASS/BELOW THRESHOLD]
- Performance:    X/10  [PASS/BELOW THRESHOLD]
- DevOps:         X/10  [PASS/BELOW THRESHOLD]
- Runability:     X/10  [PASS/BELOW THRESHOLD]

NEW DIMENSIONS:
- Accessibility:  X/10  [PASS/BELOW THRESHOLD]
- Privacy:        X/10  [PASS/BELOW THRESHOLD]
- Observability:  X/10  [PASS/BELOW THRESHOLD]
- API Design:     X/10  [PASS/BELOW THRESHOLD]

READINESS:
- Security Readiness:   X/10
- Product Potential:     X/10
- Enterprise Readiness:  X/10

OVERALL: X.X/10 — [Good / Fair / Needs Work / Critical]

============================================
TOP CRITICAL ISSUES
============================================
1. [P0] [Issue title] (file:line) — Owner: [Dev/DevOps/Security]
2. [P0] [Issue title] (file:line) — Owner: [Dev/DevOps/Security]
3. [P1] [Issue title] (file:line) — Owner: [Dev/DevOps/Security]

============================================
REMEDIATION PHASES
============================================
Phase 0 (48h):  [immediate actions]
Phase 1 (1-2w): [stabilization]
Phase 2 (2-4w): [production-ready]

============================================
COMPLIANCE (Control-Level)
============================================
OWASP Top 10:       X/10 Pass, Y/10 Partial, Z/10 Fail
  Failing: [List specific A0X controls]
OWASP API Top 10:   X/10 Pass, Y/10 Partial, Z/10 Fail
  Failing: [List specific API-X risks]
SOC2 Type II:       [Ready / Not Ready]
  Gaps: [List specific principles]
ISO 27001:          [Ready / Not Ready]
  Gaps: [List specific Annex A controls]
WCAG 2.1 AA:        [Compliant / Partial / Non-Compliant]
  Lighthouse A11y: [score]/100
  Violations: [count by severity]
GDPR:               [Compliant / Partial / Non-Compliant]
  Rights: [X/6 implemented]
  Gaps: [List missing rights]
DORA:               [Elite / High / Medium / Low]
  [Metric]: [tier] for each of 4 metrics

============================================
RISK REGISTER (Top 5)
============================================
RISK-001 | [Title] | [Severity] | Owner: [X] | SLA: Phase [N]
RISK-002 | [Title] | [Severity] | Owner: [X] | SLA: Phase [N]
RISK-003 | [Title] | [Severity] | Owner: [X] | SLA: Phase [N]
RISK-004 | [Title] | [Severity] | Owner: [X] | SLA: Phase [N]
RISK-005 | [Title] | [Severity] | Owner: [X] | SLA: Phase [N]
(Full register: [N] items in report)

============================================
DYNAMIC TESTING
============================================
DAST:         [PASS/WARN/FAIL/SKIPPED]
  Auth bypass: [X endpoints exposed]
  Rate limit:  [Active/Not detected]
  Headers:     [X/7 present]
Load Test:    [PASS/WARN/FAIL/SKIPPED]
  p95: [X]ms  p99: [X]ms  Errors: [X]
  Race conditions: [None/X detected]
Lighthouse:   [PASS/WARN/FAIL/SKIPPED]
  Perf: [X]/100  A11y: [X]/100  BP: [X]/100
Infrastructure: [PASS/WARN/FAIL]
  Dockerfile: [X issues]  GH Actions: [X issues]
  CVEs: [X critical, X high]

SCORE GATE: [PASS - all >= 8] / [FAIL - improvement plan above]

Full report: $PRODUCT_DIR/docs/AUDIT-REPORT.md
```

## Audit Rules

1. **Be brutally honest** — if code is bad, explain why technically
2. **No generic advice** — always reference exact files and line numbers
3. **Dual audience** — every technical finding must have a business impact translation
4. **Risk ownership is mandatory** — every finding must have an owner (Dev / DevOps / Security / Management)
5. **If something is missing, say so** — "No input validation on API endpoints"
6. **Provide code examples** — show vulnerable vs. secure code
7. **Prioritize by risk** — Severity x Likelihood x Blast Radius
8. **Score fairly** — 8/10 means production-quality, not perfect
9. **Compliance-aware** — note which standards each finding impacts (OWASP, SOC2, ISO 27001)
10. **Phase everything** — every remediation item must be assigned to a phase (0/1/2/3)
11. **Plain language for executives** — the Executive Decision Summary and Stop/Fix/Continue sections must be readable by non-technical stakeholders
12. **Never say "everything is broken"** — always separate what's working (Continue) from what needs fixing (Stop/Fix), and distinguish product potential from security readiness
13. **No truncated text** — every sentence in the report must be complete. Never use "...", ellipses, or trailing placeholders. If a table cell would be too long, write a full sentence and wrap it. Partial thoughts degrade trust and make the report look unfinished.
14. **Never print secrets verbatim** — when reporting on secrets, API keys, tokens, passwords, or credentials found in code or config, NEVER reproduce the actual value. Instead report: (a) whether the secret is present or absent, (b) the type of secret (API key, JWT secret, DB password, etc.), (c) the file and line where it was found, (d) at most the last 4 characters for identification (e.g., "...a3f9"). Use the format: `[SECRET REDACTED — type: JWT_SECRET, location: .env:3, suffix: ...a3f9]`. This rule applies to both the Executive Memo and the Engineering Appendix.
15. **Two-deliverable output** — every audit produces two documents: a Sanitized Executive Memo (Sections 1-2 + Scores + Compliance + Risk Register summary, no file:line references, no code snippets, no secrets) and an Engineering Appendix (full technical detail with file:line references, code examples, redacted secrets). Both are saved to the same report file, clearly separated by headers.

## Score Interpretation

| Score | Meaning |
|-------|---------|
| 9-10  | Exemplary. Best practices throughout. Audit-ready for external review. |
| 8     | Production-ready. Minor improvements possible. Enterprise-acceptable. |
| 6-7   | Functional but needs work before production. Not enterprise-ready. |
| 4-5   | Significant issues. Not production-safe. Conditional on Phase 1 completion. |
| 1-3   | Critical problems. Major rework needed. Stop deployments. |

## Scope

**Audit** (detailed in Section 0 of every report):
- All source code files
- Configuration files
- Database schemas
- Tests (quality and coverage)
- CI/CD pipelines
- Dependencies
- Compliance posture (OWASP A01-A10, SOC2 Trust Principles, ISO 27001 Annex A)
- Secret management practices (reported with redaction per Rule 14)
- Infrastructure configuration (Docker, deployment templates)

**Do NOT audit**:
- Generated code (unless security risk)
- Third-party library internals (but note vulnerable versions)
- Documentation files (unless they contradict code)

## Output Files

Every audit produces a single report file with two clearly separated parts:

```
$PRODUCT_DIR/docs/AUDIT-REPORT.md
```

| Part | Audience | Contains | Does NOT Contain |
|------|----------|----------|------------------|
| **Part A: Executive Memo** | CEO, Board, Investors, Regulators | Sections 0-5, Scores, Compliance summary, Risk Register summary, Remediation phases | file:line references, code snippets, secret values |
| **Part B: Engineering Appendix** | Engineering team | Sections 6-15 with full file:line references, code examples, exploit scenarios | Verbatim secrets (always redacted per Rule 14) |
