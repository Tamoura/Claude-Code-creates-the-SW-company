# Security Scan Command

Quick OWASP Top 10 security scan that checks a ConnectSW product for the most critical web application security risks.

## Usage

```
/security-scan <product-name>
```

Examples:
```
/security-scan stablecoin-gateway
/security-scan connectin
/security-scan deal-flow-platform
```

## Arguments

- **product-name**: Product directory name under `products/` (e.g., `stablecoin-gateway`, `connectin`)

## What This Command Does

This command performs a targeted static analysis scan against the OWASP Top 10 (2021) categories, checking for the most common and dangerous web application security vulnerabilities. It inspects source code, configuration, and dependencies for:

1. **A01: Broken Access Control** -- authorization bypass, missing auth checks
2. **A02: Cryptographic Failures** -- weak crypto, plaintext secrets, insecure hashing
3. **A03: Injection** -- SQL injection, NoSQL injection, command injection, XSS
4. **A04: Insecure Design** -- missing CSRF protection, insecure defaults
5. **A05: Security Misconfiguration** -- security headers, verbose errors, default credentials
6. **A06: Vulnerable Components** -- known vulnerable dependencies
7. **A07: Auth Failures** -- weak password policies, missing brute-force protection
8. **A08: Data Integrity Failures** -- insecure deserialization, unsigned updates
9. **A09: Logging Failures** -- insufficient security event logging
10. **A10: SSRF** -- server-side request forgery vectors

This is a **quick scan** (~15-20 minutes) focused on code patterns. For a full production audit with compliance scoring, use `/audit`. For regulatory compliance, use `/compliance-check`.

**Reference protocols**:
- `.specify/memory/constitution.md` (Article VI: Quality, Article VIII: Security)
- `.claude/protocols/verification-before-completion.md` (5-step verification gate)
- `.claude/protocols/anti-rationalization.md` (The 1% Rule)
- `.claude/agents/briefs/security-engineer.md` (full agent brief)

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

echo "Security scan target: $ARGUMENTS"
echo "Product path: $PRODUCT_DIR"

# Detect product components
HAS_API="false"
HAS_WEB="false"
[ -d "$PRODUCT_DIR/apps/api" ] && HAS_API="true"
[ -d "$PRODUCT_DIR/apps/web" ] && HAS_WEB="true"

echo "Components: API=$HAS_API, Web=$HAS_WEB"
```

### Step 2: Load Product Context

Read the product context to understand its attack surface:
- File: `products/$ARGUMENTS/README.md`
- File: `products/$ARGUMENTS/.claude/addendum.md` (if exists)
- File: `.claude/agents/briefs/security-engineer.md`

### Step 3: A01 -- Broken Access Control

Check for authorization bypass risks and missing access control enforcement.

```bash
echo "=== A01: Broken Access Control ==="

if [ "$HAS_API" = "true" ]; then
  # Check for route handlers without auth middleware
  echo "--- Unprotected route handlers ---"
  grep -rn --include="*.ts" \
    -E "(app\.(get|post|put|patch|delete)|fastify\.(get|post|put|patch|delete)|router\.(get|post|put|patch|delete))" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null | \
    grep -v "health" | grep -v "ready" | grep -v "public" | grep -v "test" | head -20
  echo "  (Review above routes for missing auth middleware)"

  # Check for auth/authorization middleware
  echo "--- Auth middleware presence ---"
  grep -rn --include="*.ts" \
    -iE "(authenticate|authorize|requireAuth|isAuthenticated|verifyToken|authGuard|preHandler.*auth|onRequest.*auth|authMiddleware)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
    echo "  FAIL: No authentication middleware found"

  # Check for IDOR vulnerabilities (direct object reference without ownership check)
  echo "--- Direct object reference patterns ---"
  grep -rn --include="*.ts" \
    -E "(params\.(id|userId|accountId)|req\.params\.[a-z]+Id)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null | head -10
  echo "  (Review above for missing ownership verification)"

  # Check for role-based access control
  echo "--- Role-based access control ---"
  grep -rn --include="*.ts" \
    -iE "(role|permission|rbac|isAdmin|hasRole|canAccess|authorize.*role|checkPermission)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null | head -10 || \
    echo "  WARN: No role-based access control patterns found"
else
  echo "  SKIP: No API component"
fi
```

### Step 4: A02 -- Cryptographic Failures

Check for weak cryptography and sensitive data exposure.

```bash
echo ""
echo "=== A02: Cryptographic Failures ==="

# Check for weak hashing algorithms
echo "--- Weak hashing algorithms ---"
grep -rn --include="*.ts" \
  -iE "(md5|sha1\b|createHash.*['\"]md5|createHash.*['\"]sha1)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null && \
  echo "  FAIL: Weak hash algorithm detected (use SHA-256+ or bcrypt/argon2)" || \
  echo "  PASS: No weak hash algorithms found"

# Check for proper password hashing
echo "--- Password hashing ---"
grep -rn --include="*.ts" \
  -iE "(bcrypt|argon2|scrypt|pbkdf2|password.*hash)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || \
  echo "  WARN: No password hashing library usage found (may not be applicable)"

# Check for hardcoded secrets, tokens, or keys
echo "--- Hardcoded secrets ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -iE "(secret\s*[:=]\s*['\"][^'\"]{8,}|apiKey\s*[:=]\s*['\"][^'\"]{8,}|token\s*[:=]\s*['\"][^'\"]{16,}|private[_-]?key\s*[:=]\s*['\"])" \
  "$PRODUCT_DIR/apps/" 2>/dev/null | grep -v "test" | grep -v "spec" | grep -v "example" | grep -v "process\.env" && \
  echo "  FAIL: Potential hardcoded secrets detected" || \
  echo "  PASS: No hardcoded secrets detected (excluding test files)"

# Check for insecure JWT configuration
echo "--- JWT configuration ---"
grep -rn --include="*.ts" \
  -iE "(algorithm.*none|algorithm.*HS256|jwt.*sign|jsonwebtoken|jose)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null | head -5
echo "  (Review JWT config for algorithm strength -- prefer RS256/ES256 over HS256)"

# Check for sensitive data in logs
echo "--- Sensitive data logging ---"
grep -rn --include="*.ts" \
  -iE "(log.*password|log.*token|log.*secret|log.*credit|console\.\w+.*password)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null && \
  echo "  FAIL: Sensitive data may be logged" || \
  echo "  PASS: No obvious sensitive data logging"
```

### Step 5: A03 -- Injection

Check for SQL injection, command injection, and XSS vectors.

```bash
echo ""
echo "=== A03: Injection ==="

# Check for raw SQL queries (SQL injection risk)
echo "--- Raw SQL queries ---"
grep -rn --include="*.ts" \
  -E "(\$queryRaw|\$executeRaw|\.query\(|\.exec\(|raw\()" \
  "$PRODUCT_DIR/apps/" 2>/dev/null | head -10

# Check for string concatenation in queries (SQL injection)
echo "--- String concatenation in queries ---"
grep -rn --include="*.ts" \
  -E "(query.*\+.*req\.|query.*\$\{|execute.*\+.*param|WHERE.*\+|INSERT.*\+)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null && \
  echo "  FAIL: String concatenation in SQL queries detected (use parameterized queries)" || \
  echo "  PASS: No string concatenation in SQL queries found"

# Check for parameterized queries (good pattern)
echo "--- Parameterized query usage ---"
grep -rn --include="*.ts" \
  -iE "(prisma\.\w+\.(find|create|update|delete|upsert)|prepare.*statement|\$[0-9]|\?)" \
  "$PRODUCT_DIR/apps/api/src/" 2>/dev/null | wc -l | \
  xargs -I{} echo "  Parameterized/ORM query calls: {} occurrences"

# Check for command injection
echo "--- Command injection vectors ---"
grep -rn --include="*.ts" \
  -E "(child_process|exec\(|execSync|spawn\(|eval\(|Function\(|new Function)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null && \
  echo "  WARN: Shell/eval usage detected -- verify inputs are sanitized" || \
  echo "  PASS: No shell execution or eval usage found"

# Check for XSS vectors (frontend)
if [ "$HAS_WEB" = "true" ]; then
  echo "--- XSS vectors (frontend) ---"
  grep -rn --include="*.tsx" --include="*.jsx" \
    -E "(dangerouslySetInnerHTML|innerHTML|document\.write|\.html\()" \
    "$PRODUCT_DIR/apps/web/" 2>/dev/null && \
    echo "  WARN: Direct HTML injection patterns found -- verify inputs are sanitized" || \
    echo "  PASS: No dangerouslySetInnerHTML or innerHTML usage found"
fi

# Check for template injection
echo "--- Template injection ---"
grep -rn --include="*.ts" \
  -E "(template.*\$\{.*req\.|render.*\$\{.*user)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null && \
  echo "  WARN: User input in template literals detected" || \
  echo "  PASS: No template injection patterns found"
```

### Step 6: A04 -- Insecure Design (CSRF)

Check for CSRF protection and insecure design patterns.

```bash
echo ""
echo "=== A04: Insecure Design ==="

# Check for CSRF protection
echo "--- CSRF protection ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -iE "(csrf|xsrf|csrfToken|csurf|anti-forgery|_csrf|x-csrf)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || \
  echo "  WARN: No CSRF protection references found (may use SameSite cookies or token-based auth instead)"

# Check for SameSite cookie attribute (alternative CSRF protection)
echo "--- SameSite cookie configuration ---"
grep -rn --include="*.ts" \
  -iE "(sameSite|same_site|SameSite)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || \
  echo "  WARN: No SameSite cookie configuration found"

# Check for unsafe HTTP methods on state-changing operations
echo "--- GET requests with state changes ---"
grep -rn --include="*.ts" \
  -E "\.get\(.*\b(delete|remove|update|create|modify)\b" \
  "$PRODUCT_DIR/apps/api/src/" 2>/dev/null && \
  echo "  FAIL: State-changing operations on GET routes detected" || \
  echo "  PASS: No state-changing GET routes found"

# Check for input validation library
echo "--- Input validation ---"
grep -E "(zod|joi|yup|class-validator|ajv|typebox)" \
  "$PRODUCT_DIR/apps/api/package.json" 2>/dev/null || \
  echo "  WARN: No input validation library in API dependencies"

# Check for schema validation on routes
echo "--- Route schema validation ---"
grep -rn --include="*.ts" \
  -iE "(schema.*body|schema.*params|schema.*querystring|validate.*body|\.parse\(|zodResolver)" \
  "$PRODUCT_DIR/apps/api/src/" 2>/dev/null | head -5 || \
  echo "  WARN: No route-level schema validation found"
```

### Step 7: A05 -- Security Misconfiguration

Check for security headers, verbose error messages, and default configurations.

```bash
echo ""
echo "=== A05: Security Misconfiguration ==="

if [ "$HAS_API" = "true" ]; then
  # Check for security headers (Helmet or manual)
  echo "--- Security headers ---"
  grep -rn --include="*.ts" --include="*.json" \
    -iE "(helmet|@fastify/helmet|security.*header|X-Frame-Options|X-Content-Type|Strict-Transport|Content-Security-Policy|X-XSS-Protection)" \
    "$PRODUCT_DIR/apps/api/" 2>/dev/null || \
    echo "  FAIL: No security headers library or configuration found"

  # Check for verbose error responses in production
  echo "--- Error information disclosure ---"
  grep -rn --include="*.ts" \
    -E "(stack.*trace|error\.stack|err\.stack|\.stack\b)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null | grep -v "test" | grep -v "log" && \
    echo "  WARN: Stack traces may be exposed in API responses" || \
    echo "  PASS: No stack trace exposure in responses"

  # Check for debug mode flags
  echo "--- Debug mode ---"
  grep -rn --include="*.ts" \
    -iE "(debug\s*[:=]\s*true|DEBUG\s*[:=]\s*true|enableDebug)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null && \
    echo "  WARN: Debug flags found in source -- ensure disabled in production" || \
    echo "  PASS: No hardcoded debug flags found"
fi

if [ "$HAS_WEB" = "true" ]; then
  # Check for source maps in production build config
  echo "--- Source maps in production ---"
  grep -n "sourceMap\|productionBrowserSourceMaps" \
    "$PRODUCT_DIR/apps/web/next.config."* 2>/dev/null || \
    echo "  INFO: Check Next.js config for productionBrowserSourceMaps setting"
fi

# Check for default/example credentials in config
echo "--- Default credentials ---"
grep -rn --include="*.ts" --include="*.json" --include="*.yml" \
  -iE "(admin.*admin|password123|default.*password|changeme|p@ssw0rd|root.*root)" \
  "$PRODUCT_DIR/" 2>/dev/null | grep -v "node_modules" | grep -v "test" && \
  echo "  FAIL: Default/example credentials found in configuration" || \
  echo "  PASS: No default credentials found"
```

### Step 8: A06 -- Vulnerable and Outdated Components

Check for known vulnerable dependencies.

```bash
echo ""
echo "=== A06: Vulnerable and Outdated Components ==="

# Run npm audit on API
if [ "$HAS_API" = "true" ] && [ -f "$PRODUCT_DIR/apps/api/package-lock.json" ]; then
  echo "--- API dependency audit ---"
  cd "$PRODUCT_DIR/apps/api" && npm audit --production 2>/dev/null | tail -20
  cd - > /dev/null
elif [ "$HAS_API" = "true" ]; then
  echo "  WARN: No package-lock.json in API -- cannot run npm audit"
fi

# Run npm audit on Web
if [ "$HAS_WEB" = "true" ] && [ -f "$PRODUCT_DIR/apps/web/package-lock.json" ]; then
  echo "--- Web dependency audit ---"
  cd "$PRODUCT_DIR/apps/web" && npm audit --production 2>/dev/null | tail -20
  cd - > /dev/null
elif [ "$HAS_WEB" = "true" ]; then
  echo "  WARN: No package-lock.json in Web -- cannot run npm audit"
fi

# Check for pinned dependency versions (good practice)
echo "--- Version pinning ---"
if [ "$HAS_API" = "true" ]; then
  unpinned=$(grep -cE '"[~^]' "$PRODUCT_DIR/apps/api/package.json" 2>/dev/null || echo "0")
  echo "  API: $unpinned dependencies use ^ or ~ (consider pinning for production)"
fi
```

### Step 9: A07 -- Identification and Authentication Failures

Check for authentication weaknesses.

```bash
echo ""
echo "=== A07: Identification and Authentication Failures ==="

if [ "$HAS_API" = "true" ]; then
  # Check for password strength validation
  echo "--- Password strength validation ---"
  grep -rn --include="*.ts" \
    -iE "(password.*length|minLength.*password|password.*regex|password.*strong|password.*policy|zxcvbn)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
    echo "  WARN: No password strength validation found"

  # Check for account lockout / brute force protection
  echo "--- Brute force protection ---"
  grep -rn --include="*.ts" \
    -iE "(lockout|maxAttempts|loginAttempt|failedAttempt|accountLock|brute.*force|maxLoginAttempts)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
    echo "  WARN: No brute force protection found (rate limiting may partially cover this)"

  # Check for session management
  echo "--- Session management ---"
  grep -rn --include="*.ts" \
    -iE "(session.*expire|token.*expire|maxAge|expiresIn|refreshToken|sessionTimeout|tokenExpir)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null | head -5 || \
    echo "  WARN: No session/token expiration configuration found"

  # Check for secure cookie flags
  echo "--- Secure cookie flags ---"
  grep -rn --include="*.ts" \
    -iE "(httpOnly|secure.*true|sameSite|cookie.*options)" \
    "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
    echo "  WARN: No secure cookie configuration found"
fi
```

### Step 10: A08-A10 -- Additional Categories

```bash
echo ""
echo "=== A08: Software and Data Integrity Failures ==="

# Check for unsafe deserialization
echo "--- Unsafe deserialization ---"
grep -rn --include="*.ts" \
  -E "(JSON\.parse.*req\.|deserialize.*user|eval.*JSON|pickle|yaml\.load)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null | grep -v "test" && \
  echo "  WARN: Review JSON.parse usage with user input for prototype pollution" || \
  echo "  PASS: No obvious unsafe deserialization patterns"

# Check for subresource integrity (frontend)
if [ "$HAS_WEB" = "true" ]; then
  echo "--- Subresource integrity ---"
  grep -rn --include="*.tsx" --include="*.html" \
    -E "integrity=" \
    "$PRODUCT_DIR/apps/web/" 2>/dev/null || \
    echo "  INFO: No SRI attributes on external scripts (Next.js handles this internally)"
fi

echo ""
echo "=== A09: Security Logging and Monitoring Failures ==="

# Check for security event logging
echo "--- Security event logging ---"
grep -rn --include="*.ts" \
  -iE "(log.*auth|log.*login|log.*fail|audit.*log|security.*event|log.*access.*denied|log.*unauthorized)" \
  "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
  echo "  WARN: No security-specific event logging found"

# Check for login success/failure logging
echo "--- Authentication event logging ---"
grep -rn --include="*.ts" \
  -iE "(login.*success|login.*fail|auth.*success|auth.*fail|sign.*in.*log)" \
  "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
  echo "  WARN: No authentication success/failure logging found"

echo ""
echo "=== A10: Server-Side Request Forgery (SSRF) ==="

# Check for URL fetching with user input
echo "--- SSRF vectors ---"
grep -rn --include="*.ts" \
  -E "(fetch\(.*req\.|axios\(.*req\.|http\.get\(.*req\.|url.*=.*req\.(body|params|query))" \
  "$PRODUCT_DIR/apps/api/src/" 2>/dev/null && \
  echo "  WARN: User-controlled URLs in server-side requests -- verify URL allowlisting" || \
  echo "  PASS: No obvious SSRF vectors found"

# Check for URL validation/allowlisting
echo "--- URL allowlisting ---"
grep -rn --include="*.ts" \
  -iE "(allowedUrl|urlWhitelist|urlAllowlist|validUrl|isAllowedHost|allowedDomain)" \
  "$PRODUCT_DIR/apps/api/src/" 2>/dev/null || \
  echo "  INFO: No URL allowlisting implementation found (may not be needed if no external URL fetching)"
```

### Step 11: Generate Security Scan Report

After running all checks, compile results into a structured report.

**Report format**:

```markdown
## Security Scan Report: [product-name]

**Date**: [YYYY-MM-DD]
**Product**: [product-name]
**Scanner**: Security Engineer Agent (OWASP Module)
**Framework**: OWASP Top 10 (2021)
**Scan Type**: Static analysis (source code patterns)

### Summary

[2-3 sentence overall security posture assessment]

### Results

| # | OWASP Category | Check Item | Status | Details |
|---|---------------|-----------|--------|---------|
| 1 | A01: Access Control | Auth middleware present | PASS/FAIL | [location or "Missing"] |
| 2 | A01: Access Control | RBAC implementation | PASS/WARN | [location or "Missing"] |
| 3 | A01: Access Control | IDOR protection | PASS/WARN | [review needed or "Protected"] |
| 4 | A02: Crypto | No weak hash algorithms | PASS/FAIL | [algorithm or "Clean"] |
| 5 | A02: Crypto | Strong password hashing | PASS/WARN | [library or "Missing"] |
| 6 | A02: Crypto | No hardcoded secrets | PASS/FAIL | [violation or "Clean"] |
| 7 | A02: Crypto | JWT algorithm strength | PASS/WARN | [algorithm or "Review needed"] |
| 8 | A02: Crypto | No sensitive data in logs | PASS/FAIL | [violation or "Clean"] |
| 9 | A03: Injection | Parameterized queries used | PASS/FAIL | [count or "Raw SQL found"] |
| 10 | A03: Injection | No SQL string concatenation | PASS/FAIL | [violation or "Clean"] |
| 11 | A03: Injection | No command injection | PASS/WARN | [exec usage or "Clean"] |
| 12 | A03: Injection | No XSS vectors | PASS/WARN | [innerHTML or "Clean"] |
| 13 | A04: Design | CSRF protection | PASS/WARN | [method or "Missing"] |
| 14 | A04: Design | Input validation library | PASS/WARN | [library or "Missing"] |
| 15 | A04: Design | Route schema validation | PASS/WARN | [count or "Missing"] |
| 16 | A05: Misconfig | Security headers configured | PASS/FAIL | [library or "Missing"] |
| 17 | A05: Misconfig | No stack trace exposure | PASS/WARN | [location or "Clean"] |
| 18 | A05: Misconfig | No default credentials | PASS/FAIL | [violation or "Clean"] |
| 19 | A06: Components | Dependency vulnerabilities | PASS/WARN/FAIL | [audit summary] |
| 20 | A07: Auth | Password strength validation | PASS/WARN | [policy or "Missing"] |
| 21 | A07: Auth | Brute force protection | PASS/WARN | [mechanism or "Missing"] |
| 22 | A07: Auth | Session/token expiration | PASS/WARN | [config or "Missing"] |
| 23 | A07: Auth | Secure cookie flags | PASS/WARN | [flags or "Missing"] |
| 24 | A08: Integrity | No unsafe deserialization | PASS/WARN | [pattern or "Clean"] |
| 25 | A09: Logging | Security event logging | PASS/WARN | [events or "Missing"] |
| 26 | A09: Logging | Auth event logging | PASS/WARN | [events or "Missing"] |
| 27 | A10: SSRF | No SSRF vectors | PASS/WARN | [pattern or "Clean"] |
| 28 | A10: SSRF | URL allowlisting | PASS/WARN/N/A | [config or "N/A"] |

### Scoring

- **PASS**: [count] / 28
- **WARN**: [count] / 28
- **FAIL**: [count] / 28

### Security Verdict

| OWASP Category | Verdict |
|---------------|---------|
| A01: Broken Access Control | PASS / WARN / FAIL |
| A02: Cryptographic Failures | PASS / WARN / FAIL |
| A03: Injection | PASS / WARN / FAIL |
| A04: Insecure Design | PASS / WARN / FAIL |
| A05: Security Misconfiguration | PASS / WARN / FAIL |
| A06: Vulnerable Components | PASS / WARN / FAIL |
| A07: Auth Failures | PASS / WARN / FAIL |
| A08: Data Integrity | PASS / WARN / FAIL |
| A09: Logging Failures | PASS / WARN / FAIL |
| A10: SSRF | PASS / WARN / FAIL |
| **Overall** | **PASS / WARN / FAIL** |

Verdict logic:
- **PASS**: All categories pass. No critical or high-severity findings.
- **WARN**: Warnings present but no critical findings. Deploy with documented risk acceptance and remediation timeline.
- **FAIL**: One or more critical findings (A01 FAIL, A02 FAIL, A03 FAIL, A05 FAIL, or A06 critical vulnerabilities). Product MUST NOT deploy until failures are resolved.

### Critical Findings (Immediate Action Required)

| # | Severity | OWASP | File:Line | Finding | Remediation |
|---|----------|-------|-----------|---------|-------------|
| 1 | Critical/High | [A0X] | [file:line] | [finding] | [fix] |

### Remediation Actions

| Priority | Action | Owner | OWASP Category |
|----------|--------|-------|----------------|
| [P0/P1/P2] | [specific action] | [agent role] | [A0X] |

### Limitations

This scan is a **static pattern analysis** and has inherent limitations:
- It does NOT execute code or perform dynamic testing (DAST)
- It does NOT test actual authentication flows end-to-end
- It may produce false positives (patterns that look vulnerable but are safely handled)
- It may miss vulnerabilities in complex control flow or third-party integrations
- For comprehensive security assessment, combine with `/audit`, penetration testing, and dependency scanning in CI
```

### Step 12: Save Report

Save the security scan report to:
```
products/$ARGUMENTS/docs/quality-reports/security-scan-[YYYY-MM-DD].md
```

Create the directory if it does not exist:
```bash
mkdir -p "products/$ARGUMENTS/docs/quality-reports"
```

### Step 13: Log to Audit Trail

```bash
.claude/scripts/post-task-update.sh security-engineer SECURITY-SCAN-$ARGUMENTS $ARGUMENTS success 0 "Security scan completed: [verdict]"
```

## Status Definitions

| Status | Meaning |
|--------|---------|
| **PASS** | Check item verified safe. No vulnerable pattern detected. |
| **WARN** | Potential risk detected but may be a false positive or mitigated elsewhere. Manual review recommended. |
| **FAIL** | Confirmed vulnerable pattern or critical missing security control. Must be fixed before production. |
| **N/A** | Check item does not apply (e.g., SSRF checks when no external URL fetching exists). |

## Severity Mapping

| Severity | Criteria | SLA |
|----------|----------|-----|
| **Critical** | Directly exploitable with no authentication (SQLi, RCE, auth bypass) | Fix before any deployment |
| **High** | Exploitable with authentication or chained with another vulnerability | Fix within current sprint |
| **Medium** | Requires specific conditions or insider access to exploit | Fix within next sprint |
| **Low** | Informational or defense-in-depth improvement | Add to backlog |

## Relationship to Other Commands

| Command | Relationship |
|---------|-------------|
| `/audit` | Full 11-dimension audit including security scoring. `/security-scan` is a focused, faster OWASP Top 10 check. |
| `/compliance-check` | Regulatory compliance (Shariah, QFCRA). `/security-scan` covers technical AppSec, not regulatory. |
| `/pre-deploy` | Production readiness. `/security-scan` MUST pass before `/pre-deploy`. |
| `/code-reviewer` | General code review. `/security-scan` is security-specific and more thorough on OWASP categories. |
