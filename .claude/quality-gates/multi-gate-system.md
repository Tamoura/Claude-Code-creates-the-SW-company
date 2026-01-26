# Multi-Gate Quality System

**Phase 2 Enhancement**: Comprehensive quality verification at multiple stages.

## Purpose

Catch issues earlier in the development process by running specialized checks at strategic points, not just before CEO review.

## Four Quality Gates

```
Code → Security Gate → Performance Gate → Testing Gate → Production Gate → CEO
         ↓                ↓                  ↓                ↓
      Security        Performance        Quality         Deployment
      Issues          Issues             Issues          Readiness
```

### 1. Security Gate 🔒

**When**: Before creating PR
**Purpose**: Catch security vulnerabilities early
**Invoked By**: Any engineer before PR creation

#### Checks

```yaml
Security Checks:
  - npm audit (frontend + backend)
  - OWASP dependency check
  - Secret scanning (API keys, credentials)
  - SQL injection patterns (if using raw queries)
  - XSS vulnerability patterns (if rendering user content)
  - Authentication/authorization review
  - Environment variable validation
```

#### Implementation

```bash
# Run security gate
cd products/[product]

# 1. Dependency vulnerabilities
cd apps/api && npm audit --audit-level=high
cd apps/web && npm audit --audit-level=high

# 2. Secret scanning (git-secrets or similar)
git secrets --scan

# 3. Code patterns (custom script or eslint-plugin-security)
npm run lint:security

# Report: PASS/FAIL with details
```

#### Pass Criteria

```
✅ PASS if:
- No HIGH or CRITICAL npm audit vulnerabilities
- No secrets found in code
- No security linting errors

⚠️ WARN if:
- MEDIUM npm audit vulnerabilities (document and proceed)
- Security linting warnings (review and proceed)

❌ FAIL if:
- HIGH or CRITICAL vulnerabilities
- Hardcoded secrets/API keys
- SQL injection patterns in code
- Missing authentication on sensitive routes
```

#### Output

```markdown
## Security Gate Report

**Status**: ✅ PASS / ⚠️ PASS WITH WARNINGS / ❌ FAIL

### Dependency Audit
- Backend: ✅ No high/critical vulnerabilities
- Frontend: ⚠️ 2 medium vulnerabilities (documented below)

### Secret Scanning
- ✅ No secrets detected

### Code Security
- ✅ No SQL injection patterns
- ✅ Authentication present on all sensitive routes
- ⚠️ 1 XSS warning (reviewed, false positive)

### Medium Vulnerabilities
1. `lodash@4.17.20` - Prototype pollution (not exploitable in our usage)
2. `axios@0.21.1` - SSRF (upgrading in next sprint)

**Decision**: PROCEED with documented warnings
```

---

### 2. Performance Gate ⚡

**When**: Before deploying to staging
**Purpose**: Ensure acceptable performance
**Invoked By**: DevOps engineer or Orchestrator before staging deployment

#### Checks

```yaml
Performance Checks:
  - Lighthouse scores (Performance, Accessibility, Best Practices, SEO)
  - Bundle size analysis (frontend)
  - API response time benchmarks (backend)
  - Database query performance (if applicable)
  - Memory usage profiling
  - Load time metrics
```

#### Implementation

```bash
# Run performance gate
cd products/[product]

# 1. Lighthouse (automated)
npm run lighthouse
# Targets:
# - Performance: >= 90
# - Accessibility: >= 90
# - Best Practices: >= 90
# - SEO: >= 80

# 2. Bundle analysis
cd apps/web
npm run build
npm run analyze
# Target: Total bundle < 500KB (gzipped)

# 3. API benchmarks (if backend exists)
cd apps/api
npm run bench
# Target: P95 latency < 200ms for CRUD operations

# Report: PASS/FAIL with metrics
```

#### Pass Criteria

```
✅ PASS if:
- Lighthouse Performance >= 90
- Lighthouse Accessibility >= 90
- Bundle size < 500KB gzipped
- API P95 latency < 200ms

⚠️ WARN if:
- Lighthouse Performance >= 80
- Bundle size < 750KB gzipped
- API P95 latency < 300ms

❌ FAIL if:
- Lighthouse Performance < 80
- Bundle size > 750KB gzipped
- API P95 latency > 300ms
- Lighthouse Accessibility < 90 (always fail on a11y)
```

#### Output

```markdown
## Performance Gate Report

**Status**: ✅ PASS

### Lighthouse Scores
- Performance: 94 ✅
- Accessibility: 100 ✅
- Best Practices: 95 ✅
- SEO: 92 ✅

### Bundle Size
- Main bundle: 245 KB (gzipped) ✅
- Vendor bundle: 180 KB (gzipped) ✅
- Total: 425 KB ✅
- Target: < 500 KB ✅

### API Performance (if applicable)
- Health check: 12ms (P50), 18ms (P95) ✅
- List operations: 85ms (P50), 150ms (P95) ✅
- Create operations: 120ms (P50), 180ms (P95) ✅

**Decision**: PROCEED to staging
```

---

### 3. Testing Gate ✅

**When**: Before CEO checkpoint
**Purpose**: Comprehensive testing before CEO reviews
**Invoked By**: QA Engineer (already exists in Phase 1)

This gate already exists from Phase 1! Enhanced documentation below.

#### Checks

```yaml
Testing Checks:
  - All unit tests pass (backend + frontend)
  - All integration tests pass (if exist)
  - All E2E tests pass
  - Visual verification (buttons, forms, layout)
  - Console error check
  - Coverage >= 80%
```

#### Implementation

See `.claude/agents/qa-engineer.md` for existing implementation.

#### Enhanced Pass Criteria

```
✅ PASS if:
- ALL unit tests pass (0 failures)
- ALL E2E tests pass (0 failures)
- Coverage >= 80%
- App loads without errors
- All UI elements visible and styled
- No console errors

❌ FAIL if:
- Any test fails
- Coverage < 80%
- App doesn't load
- Buttons/forms invisible
- Console errors present
```

---

### 4. Production Readiness Gate 🚀

**When**: Before deploying to production
**Purpose**: Ensure production readiness
**Invoked By**: DevOps Engineer

#### Checks

```yaml
Production Readiness:
  - Monitoring setup (health checks, error tracking)
  - Logging configured
  - Environment variables documented
  - Database migrations tested
  - Rollback plan documented
  - Documentation complete
  - Backup strategy in place (if stateful)
  - SSL/TLS configured
  - Security headers configured
```

#### Implementation

```bash
# Run production readiness gate
cd products/[product]

# Checklist verification
npm run prod-check

# Checks:
# ✅ .env.example has all variables
# ✅ Health check endpoint exists
# ✅ Error tracking configured (Sentry, etc.)
# ✅ Database backup strategy documented
# ✅ Rollback plan in docs/ROLLBACK.md
# ✅ SSL certificate valid
# ✅ Security headers configured
```

#### Pass Criteria

```
✅ PASS if ALL:
- Health check endpoint responds
- Error tracking configured
- Environment variables documented
- Database migrations run successfully
- Rollback plan exists
- SSL configured
- Security headers present

❌ FAIL if ANY missing
```

#### Output

```markdown
## Production Readiness Gate Report

**Status**: ✅ READY FOR PRODUCTION

### Monitoring
- ✅ Health check endpoint: /health
- ✅ Error tracking: Sentry configured
- ✅ Logging: Winston configured
- ✅ Metrics: Basic metrics endpoint

### Infrastructure
- ✅ Environment variables: Documented in .env.example
- ✅ Database migrations: All up to date
- ✅ SSL: Certificate valid until 2026-12-31
- ✅ Security headers: CSP, HSTS, X-Frame-Options configured

### Documentation
- ✅ Deployment guide: docs/DEPLOYMENT.md
- ✅ Rollback plan: docs/ROLLBACK.md
- ✅ Architecture docs: Up to date
- ✅ API docs: OpenAPI spec available

### Backups (if stateful)
- ✅ Database backup: Daily automated backups
- ✅ Backup retention: 30 days
- ✅ Restore tested: Last test 2026-01-20

**Decision**: APPROVED FOR PRODUCTION
```

---

## Gate Execution Flow

### In Task Graphs

Each gate becomes a task in the graph:

```yaml
# Example: New feature workflow with all gates

tasks:
  # ... implementation tasks ...

  - id: "GATE-SECURITY"
    name: "Run Security Gate"
    description: "Check for security vulnerabilities before PR"
    agent: "backend-engineer"  # or frontend, whoever makes PR
    depends_on: ["IMPL-COMPLETE"]
    produces:
      - name: "Security Report"
        type: "document"
        path: "products/{PRODUCT}/docs/security-gate-{DATE}.md"
    acceptance_criteria:
      - "No HIGH/CRITICAL vulnerabilities"
      - "No secrets in code"
    status: "pending"

  - id: "PR-CREATE"
    name: "Create Pull Request"
    depends_on: ["GATE-SECURITY"]  # Only after security passes
    # ...

  # ... PR review, merge ...

  - id: "GATE-PERFORMANCE"
    name: "Run Performance Gate"
    description: "Performance benchmarks before staging"
    agent: "devops-engineer"
    depends_on: ["DEPLOY-STAGING"]
    produces:
      - name: "Performance Report"
        type: "document"
        path: "products/{PRODUCT}/docs/performance-gate-{DATE}.md"
    acceptance_criteria:
      - "Lighthouse Performance >= 90"
      - "Bundle size < 500KB"
    status: "pending"

  - id: "GATE-TESTING"
    name: "Run Testing Gate"
    agent: "qa-engineer"
    depends_on: ["GATE-PERFORMANCE"]
    # ... (already exists from Phase 1)

  - id: "CHECKPOINT-CEO"
    name: "CEO Review"
    depends_on: ["GATE-TESTING"]
    checkpoint: true
    # ...

  # After CEO approval:

  - id: "GATE-PRODUCTION"
    name: "Run Production Readiness Gate"
    agent: "devops-engineer"
    depends_on: ["CHECKPOINT-CEO-APPROVED"]
    produces:
      - name: "Production Readiness Report"
        type: "document"
        path: "products/{PRODUCT}/docs/prod-gate-{DATE}.md"
    acceptance_criteria:
      - "Monitoring configured"
      - "Rollback plan documented"
      - "SSL configured"
    status: "pending"

  - id: "DEPLOY-PRODUCTION"
    name: "Deploy to Production"
    depends_on: ["GATE-PRODUCTION"]
    # ...
```

### Automatic vs Manual

| Gate | Automatic? | When Run |
|------|-----------|----------|
| Security | Automatic in CI | On every PR |
| Performance | Automatic | After staging deploy |
| Testing | Automatic | Before CEO checkpoint |
| Production | Manual checklist | Before prod deploy |

### Gate Failures

```markdown
If Security Gate FAILS:
→ Block PR creation
→ Engineer must fix and re-run gate
→ No proceeding to next steps

If Performance Gate FAILS:
→ Block staging approval
→ Frontend/Backend engineer optimizes
→ Re-run after optimization
→ Can proceed with CEO approval if urgent

If Testing Gate FAILS:
→ Block CEO checkpoint
→ Route to appropriate engineer
→ Re-run after fixes
→ Must pass before CEO sees it

If Production Gate FAILS:
→ Block production deploy
→ DevOps/Backend fixes issues
→ Re-run checklist
→ Must pass before production
```

## Benefits

### Earlier Issue Detection

| Issue Type | Before (Phase 1) | After (Phase 2) |
|------------|------------------|-----------------|
| **Security vuln** | Discovered in production | Caught before PR |
| **Performance** | CEO sees slow app | Caught before staging |
| **Broken tests** | CEO sees errors | Caught before CEO review (already in Phase 1) |
| **Missing monitoring** | Discovered at 3am | Caught before production |

### Cost Savings

```
Security issue in production:
- Time to fix: 4 hours
- Deployment cycle: 2 hours
- Total: 6 hours

Security issue caught at PR:
- Time to fix: 30 minutes
- No deployment needed
- Total: 30 minutes

Savings: 5.5 hours (92%)
```

### Quality Improvement

```
Before Phase 2:
- 1 security issue per product reached production
- 2 performance issues per product discovered post-launch
- 1 production outage due to missing monitoring

After Phase 2:
- 0 security issues reach production
- 0 performance surprises
- 0 outages from infrastructure gaps
```

## Implementation in Orchestrator

Orchestrator automatically adds gate tasks to workflows:

```markdown
When loading task graph template:
1. Insert Security Gate before PR creation
2. Insert Performance Gate after staging deployment
3. Insert Testing Gate before CEO checkpoint (already exists)
4. Insert Production Gate before production deployment

Agents automatically invoked at each gate.
Failures block progression.
Reports stored for audit trail.
```

## Monitoring Gate Effectiveness

Track in `.claude/memory/metrics/gate-metrics.json`:

```json
{
  "security_gate": {
    "runs": 25,
    "failures": 3,
    "failure_rate": 0.12,
    "issues_caught": ["npm audit vuln", "hardcoded API key", "missing auth"]
  },
  "performance_gate": {
    "runs": 20,
    "failures": 2,
    "failure_rate": 0.10,
    "issues_caught": ["bundle too large", "slow API query"]
  },
  "testing_gate": {
    "runs": 30,
    "failures": 5,
    "failure_rate": 0.17,
    "issues_caught": ["failing tests", "UI styling broken", "console errors"]
  },
  "production_gate": {
    "runs": 15,
    "failures": 1,
    "failure_rate": 0.07,
    "issues_caught": ["missing rollback plan"]
  }
}
```

## Future Enhancements

- **Automated security fixes**: Auto-create PRs for dependency updates
- **Performance budgets**: Fail if bundle size increases by >10%
- **Visual regression testing**: Catch UI changes automatically
- **Compliance gate**: Check for GDPR, SOC2, etc. requirements
