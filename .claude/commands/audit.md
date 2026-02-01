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

- **product-name**: Product directory name under `products/` (e.g., `stablecoin-gateway`, `deal-flow-platform`)

## What This Command Does

This command invokes the **Code Reviewer** agent to perform a full professional audit of the specified product. The audit follows a strict methodology and produces a **decision-ready** report suitable for:
- CEO / Board presentations
- Investment committee reviews
- Regulated customer due diligence
- Internal engineering prioritization

The report is both technically rigorous (file:line references, exploit scenarios) AND business-actionable (ownership, phases, compliance mapping, go/no-go decisions).

## Execution Steps

### Step 1: Load Agent Context

Read the Code Reviewer agent instructions:
- File: `.claude/agents/code-reviewer.md`

Read the product context:
- File: `products/$ARGUMENTS/.claude/addendum.md` (if exists)
- File: `products/$ARGUMENTS/README.md`
- File: `products/$ARGUMENTS/docs/PRD.md` (if exists)

### Step 2: Explore the Codebase

Use parallel exploration agents to analyze the product thoroughly:

1. **Services & Business Logic Agent**: Read all files in `apps/api/src/services/` and `apps/api/src/workers/`. Analyze business logic, security controls, error handling, race conditions, and data integrity.

2. **Routes & API Layer Agent**: Read all files in `apps/api/src/routes/`. Analyze input validation, authorization, error responses, pagination, and API design consistency.

3. **Plugins, Utils & Schema Agent**: Read all files in `apps/api/src/plugins/`, `apps/api/src/utils/`, and `apps/api/prisma/schema.prisma`. Analyze authentication, encryption, database schema, validation, and configuration.

4. **Tests & CI/CD Agent**: Read all files in `apps/api/tests/`, `.github/workflows/`, and `apps/web/` (if exists). Analyze test coverage, test quality, CI pipeline security, and deployment safety.

### Step 3: Synthesize Findings

Combine all exploration results into **two deliverables** within a single report file:

1. **PART A — Sanitized Executive Memo** (Sections 1-3 + Scores + Compliance summary + Risk Register summary). This part contains NO file:line references, NO code snippets, and NO secrets. It is safe to share with board members, investors, and non-technical stakeholders.

2. **PART B — Engineering Appendix** (Sections 4 onwards). This part contains full technical detail: file:line references, code examples (with redacted secrets), exploit scenarios, and fix implementations. It is for the engineering team only.

Both parts are saved to the same file, clearly separated by `---` and headers.

---

# PART A — EXECUTIVE MEMO

---

#### Section 0: Methodology & Limitations

This section establishes credibility and sets expectations. It MUST appear before any findings.

**Audit Scope:**
- List every directory scanned (e.g., `apps/api/src/`, `apps/web/src/`, `apps/api/prisma/`)
- List every file type included (e.g., `.ts`, `.tsx`, `.prisma`, `.yml`, `.json`, `.env*`)
- Total files reviewed: [count]
- Total lines of code analyzed: [count]

**Methodology:**
- Static analysis: manual code review of all source files
- Schema analysis: Prisma schema, database indexes, relations
- Dependency audit: `package.json` and lock file review for known vulnerabilities
- Configuration review: environment files, Docker configs, CI/CD pipelines
- Test analysis: test coverage measurement, test quality assessment, gap identification
- Architecture review: dependency graph, layering, coupling analysis

**Out of Scope:**
- Dynamic penetration testing (no live exploit attempts were made)
- Runtime performance profiling (no load tests executed)
- Third-party SaaS integrations (only code-level integration points reviewed)
- Infrastructure-level security (cloud IAM, network policies, firewall rules)
- Generated code (e.g., Prisma client) unless it poses a security risk
- Third-party library internals (but vulnerable versions are noted)

**Limitations:**
- This audit is based on static code review. Some issues (memory leaks, race conditions under load, intermittent failures) may only manifest at runtime.
- Compliance assessments are technical gap analyses, not formal certifications.
- Scores reflect the state of the code at the time of audit and may change with subsequent commits.

#### Section 1: Executive Decision Summary (1 page)

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

Executives need clear action categories:

| Category | Items |
|----------|-------|
| **STOP** | Things that must cease immediately (e.g., "Deployments with embedded secrets") |
| **FIX** | Things that must be remediated before production (e.g., "Auth system, config management") |
| **CONTINUE** | Things that are working well (e.g., "Product vision, domain logic, test patterns") |

#### Section 3: System Overview

- Architecture diagram (text-based)
- Technology stack
- Key flows (payment, auth, etc.)
- Infrastructure topology

#### Section 4: Critical Issues (Top 10)

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

- Layering violations, coupling, bottlenecks
- Each with file:line references and impact assessment

#### Section 7: Security Findings

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

**GDPR/PDPL** (if applicable): Data handling assessment with specific gaps.

Note: This is a technical audit assessment, not a formal compliance certification. It identifies technical gaps that would block compliance.

#### Section 12: Technical Debt Map

Categorize debt by urgency and cost:

| Priority | Debt Item | Interest (cost of delay) | Owner | Payoff |
|----------|-----------|--------------------------|-------|--------|
| HIGH | ... | ... | Dev/DevOps/Security | ... |
| MEDIUM | ... | ... | ... | ... |
| LOW | ... | ... | ... | ... |

#### Section 13: Remediation Roadmap (Phased)

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

| Sub-dimension | Score | Notes |
|---------------|-------|-------|
| Modularity | X/2 | ... |
| API Design | X/2 | ... |
| Testability | X/2 | ... |
| Observability | X/2 | ... |
| Documentation | X/2 | ... |

### Step 4: Calculate Scores

Produce THREE score categories:

#### A. Technical Dimension Scores (0-10 scale)

- **Security**: auth, input validation, secrets, OWASP compliance
- **Architecture**: separation of concerns, patterns, scalability
- **Test Coverage**: line coverage %, edge case coverage, integration tests
- **Code Quality**: readability, DRY, error handling, logging
- **Performance**: query efficiency, caching, resource usage
- **DevOps**: CI/CD, monitoring, deployment safety
- **Runability**: does it actually start and serve real responses? Scoring guide:
  - 0: No start script, missing deps, immediate crash
  - 2: Starts but crashes within seconds
  - 4: Starts but /health or frontend returns errors
  - 6: Starts and /health passes, but frontend has placeholder pages
  - 8: Full stack starts, health OK, UI loads real data, no placeholders
  - 10: Full stack starts, health OK, real data, no placeholders, production build succeeds, zero console errors

**Technical Score** = average of all dimension scores.

#### B. Readiness Scores (0-10 scale)

These translate technical findings into business decisions:

- **Security Readiness**: Can it withstand real-world attacks? (weighted from Security + DevOps + Architecture scores)
- **Product Potential**: Is the core product logic sound? (weighted from Code Quality + Architecture + Runability)
- **Enterprise Readiness**: Can it onboard regulated/enterprise customers? (weighted from Security + DevOps + Compliance mapping)

This prevents the "everything is garbage" reaction. A product can score 3/10 on Security Readiness but 7/10 on Product Potential — meaning the vision is sound but the security posture needs work.

#### C. Overall Score

**Overall Score** = average of Technical Score and Readiness Scores.

### Step 5: Save Report

Save the full audit report to:
```
products/$ARGUMENTS/docs/AUDIT-REPORT.md
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
SCORES
============================================
TECHNICAL DIMENSIONS:
- Security:      X/10  [PASS/BELOW THRESHOLD]
- Architecture:  X/10  [PASS/BELOW THRESHOLD]
- Test Coverage: X/10  [PASS/BELOW THRESHOLD]
- Code Quality:  X/10  [PASS/BELOW THRESHOLD]
- Performance:   X/10  [PASS/BELOW THRESHOLD]
- DevOps:        X/10  [PASS/BELOW THRESHOLD]
- Runability:    X/10  [PASS/BELOW THRESHOLD]

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
OWASP Top 10:  X/10 Pass, Y/10 Partial, Z/10 Fail
  Failing: [List specific A0X controls]
SOC2 Type II:  [Ready / Not Ready]
  Gaps: [List specific principles]
ISO 27001:     [Ready / Not Ready]
  Gaps: [List specific Annex A controls]

============================================
RISK REGISTER (Top 5)
============================================
RISK-001 | [Title] | [Severity] | Owner: [X] | SLA: Phase [N]
RISK-002 | [Title] | [Severity] | Owner: [X] | SLA: Phase [N]
RISK-003 | [Title] | [Severity] | Owner: [X] | SLA: Phase [N]
RISK-004 | [Title] | [Severity] | Owner: [X] | SLA: Phase [N]
RISK-005 | [Title] | [Severity] | Owner: [X] | SLA: Phase [N]
(Full register: [N] items in report)

SCORE GATE: [PASS - all >= 8] / [FAIL - improvement plan above]

Full report: products/[product]/docs/AUDIT-REPORT.md
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
products/$ARGUMENTS/docs/AUDIT-REPORT.md
```

| Part | Audience | Contains | Does NOT Contain |
|------|----------|----------|------------------|
| **Part A: Executive Memo** | CEO, Board, Investors, Regulators | Sections 0-5, Scores, Compliance summary, Risk Register summary, Remediation phases | file:line references, code snippets, secret values |
| **Part B: Engineering Appendix** | Engineering team | Sections 6-15 with full file:line references, code examples, exploit scenarios | Verbatim secrets (always redacted per Rule 14) |
