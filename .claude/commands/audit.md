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

This command invokes the **Code Reviewer** agent to perform a full professional audit of the specified product. The audit follows a strict 6-phase methodology and produces a comprehensive report.

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

Combine all exploration results into the audit report following the exact structure defined in `.claude/agents/code-reviewer.md`:

1. **Executive Summary** (non-technical, for CEO/CTO)
2. **System Overview** (architecture, stack, flows)
3. **Critical Issues (Top 10)** with file:line references, exploit scenarios, and fixes
4. **Architecture Problems** (layering violations, coupling, bottlenecks)
5. **Security Findings** (auth, injection, data, API, infrastructure)
6. **Performance & Scalability** (queries, memory, algorithms, caching)
7. **Testing Gaps** (coverage %, missing scenarios, brittle tests)
8. **DevOps Issues** (CI/CD, deployment, monitoring)
9. **AI-Readiness Score** (0-10 with sub-scores)
10. **Technical Debt Map** (high/medium/low interest)
11. **Refactoring Roadmap** (30/60/90 day plans)
12. **Quick Wins** (1-day fixes)

### Step 4: Calculate Scores

Produce scores for each dimension (0-10 scale):
- **Security**: auth, input validation, secrets, OWASP compliance
- **Architecture**: separation of concerns, patterns, scalability
- **Test Coverage**: line coverage %, edge case coverage, integration tests
- **Code Quality**: readability, DRY, error handling, logging
- **Performance**: query efficiency, caching, resource usage
- **DevOps**: CI/CD, monitoring, deployment safety

**Overall Score** = average of all dimension scores.

### Step 5: Save Report

Save the full audit report to:
```
products/$ARGUMENTS/docs/AUDIT-REPORT.md
```

### Step 6: Score Gate Check

**If any individual score < 8/10 OR overall score < 8/10:**

1. Identify which dimensions are below 8
2. For each low-scoring dimension, create a concrete improvement plan:
   - What specific changes are needed (with file:line references)
   - Expected score improvement per change
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

OVERALL ASSESSMENT: [Good / Fair / Needs Work / Critical]
OVERALL SCORE: X.X/10

DIMENSION SCORES:
- Security:     X/10 [PASS/BELOW THRESHOLD]
- Architecture: X/10 [PASS/BELOW THRESHOLD]
- Test Coverage: X/10 [PASS/BELOW THRESHOLD]
- Code Quality: X/10 [PASS/BELOW THRESHOLD]
- Performance:  X/10 [PASS/BELOW THRESHOLD]
- DevOps:       X/10 [PASS/BELOW THRESHOLD]

TOP CRITICAL ISSUES:
1. [P0] [Issue title] (file:line)
2. [P0] [Issue title] (file:line)
3. [P1] [Issue title] (file:line)

SCORE GATE: [PASS - all >= 8] / [FAIL - improvement plan below]

[If FAIL:]
IMPROVEMENT PLAN:
- Security (6/10 -> 8/10): [specific changes]
- Test Coverage (5/10 -> 8/10): [specific changes]
Estimated iterations to reach 8/10: N

Full report: products/[product]/docs/AUDIT-REPORT.md
```

## Audit Rules

1. **Be brutally honest** -- if code is bad, explain why technically
2. **No generic advice** -- always reference exact files and line numbers
3. **Assume CTO audience** -- business impact matters as much as technical details
4. **If something is missing, say so** -- "No input validation on API endpoints"
5. **Provide code examples** -- show vulnerable vs. secure code
6. **Prioritize by risk** -- Severity x Likelihood x Blast Radius
7. **Score fairly** -- 8/10 means production-quality, not perfect

## Score Interpretation

| Score | Meaning |
|-------|---------|
| 9-10  | Exemplary. Best practices throughout. |
| 8     | Production-ready. Minor improvements possible. |
| 6-7   | Functional but needs work before production. |
| 4-5   | Significant issues. Not production-safe. |
| 1-3   | Critical problems. Major rework needed. |

## Scope

**Audit**:
- All source code files
- Configuration files
- Database schemas
- Tests (quality and coverage)
- CI/CD pipelines
- Dependencies

**Do NOT audit**:
- Generated code (unless security risk)
- Third-party library internals (but note vulnerable versions)
- Documentation files (unless they contradict code)
