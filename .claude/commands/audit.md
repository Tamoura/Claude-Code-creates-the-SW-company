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

- **product-name**: Product directory name under `products/` (e.g., `stablecoin-gateway`, `gpu-calculator`)

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

### Step 4: Save Report

Save the full audit report to:
```
products/$ARGUMENTS/docs/AUDIT-REPORT.md
```

### Step 5: Present Summary

Output a summary to the CEO:

```
Audit Complete: [product-name]

OVERALL ASSESSMENT: [Good / Fair / Needs Work / Critical]

TOP CRITICAL ISSUES:
1. [P0] [Issue title] (file:line)
2. [P0] [Issue title] (file:line)
3. [P1] [Issue title] (file:line)
4. [P1] [Issue title] (file:line)
5. [P2] [Issue title] (file:line)

SCORES:
- Security: X/10
- Architecture: X/10
- Test Coverage: X/10
- AI-Readiness: X/10

Full report: products/[product]/docs/AUDIT-REPORT.md
```

## Audit Rules

1. **Be brutally honest** — if code is bad, explain why technically
2. **No generic advice** — always reference exact files and line numbers
3. **Assume CTO audience** — business impact matters as much as technical details
4. **If something is missing, say so** — "No input validation on API endpoints"
5. **Provide code examples** — show vulnerable vs. secure code
6. **Prioritize by risk** — Severity x Likelihood x Blast Radius

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
