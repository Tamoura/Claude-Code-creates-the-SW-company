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

Combine all exploration results into the audit report with the following structure:

---

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

#### Section 5: Architecture Problems

- Layering violations, coupling, bottlenecks
- Each with file:line references and impact assessment

#### Section 6: Security Findings

Organized by category:
- Authentication & Authorization
- Injection Vulnerabilities
- Data Security
- API Security
- Infrastructure Security

For each finding, note:
- OWASP Top 10 category (if applicable)
- SOC2 control mapping (if applicable)

#### Section 7: Performance & Scalability

- Database query analysis
- Memory and resource usage
- Algorithm efficiency
- Caching strategy assessment
- Each with file:line references

#### Section 8: Testing Gaps

- Coverage % (actual or estimated)
- Missing test scenarios
- Brittle or flaky tests
- Missing test categories (unit, integration, E2E, load, security)

#### Section 9: DevOps Issues

- CI/CD pipeline assessment
- Deployment safety
- Monitoring and alerting
- Rollback capability
- Secret management

#### Section 10: Compliance Readiness

Map findings to compliance frameworks. For each, state Pass/Partial/Fail:

| Framework | Status | Gaps |
|-----------|--------|------|
| **OWASP Top 10** | X/10 controls addressed | List gaps |
| **SOC2 Type II** | Ready / Not Ready | What's missing |
| **ISO 27001** | Ready / Not Ready | What's missing |
| **GDPR/PDPL** | Applicable / N/A | Data handling gaps |

Note: This is a technical audit assessment, not a formal compliance certification. It identifies technical gaps that would block compliance.

#### Section 11: Technical Debt Map

Categorize debt by urgency and cost:

| Priority | Debt Item | Interest (cost of delay) | Owner | Payoff |
|----------|-----------|--------------------------|-------|--------|
| HIGH | ... | ... | Dev/DevOps/Security | ... |
| MEDIUM | ... | ... | ... | ... |
| LOW | ... | ... | ... | ... |

#### Section 12: Remediation Roadmap (Phased)

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

#### Section 13: Quick Wins (1-day fixes)

Numbered list of changes that can be done in under a day each, with file references.

#### Section 14: AI-Readiness Score (0-10 with sub-scores)

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
COMPLIANCE
============================================
OWASP Top 10:  X/10 addressed
SOC2 Type II:  [Ready / Not Ready]
ISO 27001:     [Ready / Not Ready]

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

## Score Interpretation

| Score | Meaning |
|-------|---------|
| 9-10  | Exemplary. Best practices throughout. Audit-ready for external review. |
| 8     | Production-ready. Minor improvements possible. Enterprise-acceptable. |
| 6-7   | Functional but needs work before production. Not enterprise-ready. |
| 4-5   | Significant issues. Not production-safe. Conditional on Phase 1 completion. |
| 1-3   | Critical problems. Major rework needed. Stop deployments. |

## Scope

**Audit**:
- All source code files
- Configuration files
- Database schemas
- Tests (quality and coverage)
- CI/CD pipelines
- Dependencies
- Compliance posture (OWASP, SOC2, ISO 27001)
- Secret management practices
- Infrastructure configuration (Docker, deployment templates)

**Do NOT audit**:
- Generated code (unless security risk)
- Third-party library internals (but note vulnerable versions)
- Documentation files (unless they contradict code)
