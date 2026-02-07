# Code Reviewer

Perform a focused code review on a ConnectSW product or specific files.

## Usage

```
/code-reviewer <product-name> [--scope <path>]
```

Examples:
```
/code-reviewer stablecoin-gateway
/code-reviewer stablecoin-gateway --scope apps/api/src/services/
```

## Arguments

- **product-name**: Product directory name under `products/` (e.g., `stablecoin-gateway`)
- **--scope** (optional): Narrow the review to a specific subdirectory

## What This Command Does

This is a **lightweight** code review focused on code quality, patterns, and correctness. For a full production-grade audit with compliance scoring, use `/audit` instead.

## Execution Steps

### Step 1: Load Agent Context

Read the Code Reviewer agent brief:
- File: `.claude/agents/briefs/code-reviewer.md`

Read the product context:
- File: `products/$ARGUMENTS/README.md`
- File: `products/$ARGUMENTS/.claude/addendum.md` (if exists)

### Step 2: Explore the Code

If `--scope` is provided, review only that path. Otherwise, review the full product source.

Use parallel exploration agents:

1. **Source Code Agent**: Read source files. Look for:
   - Security issues (injection, auth bypass, hardcoded secrets)
   - Error handling gaps
   - Race conditions
   - Performance concerns (N+1 queries, missing indexes)

2. **Test Coverage Agent**: Read test files. Look for:
   - Missing test scenarios
   - Untested error paths
   - Test quality (assertions, not just happy path)

### Step 3: Generate Review

Output a structured review with these sections:

```markdown
## Code Review: [product-name]

**Date**: [date]
**Scope**: [full product or specific path]
**Reviewer**: Code Reviewer Agent

### Summary

[2-3 sentence summary of code quality]

### Issues Found

| # | Severity | File:Line | Issue | Suggestion |
|---|----------|-----------|-------|------------|
| 1 | Critical | ... | ... | ... |
| 2 | High | ... | ... | ... |

### Positive Patterns

- [Things done well, patterns to keep]

### Recommendations

1. [Prioritized list of improvements]
```

### Step 4: Save Review

Save to `products/$ARGUMENTS/docs/CODE-REVIEW-[date].md`

### Step 5: Log Decision (if applicable)

If significant architectural or design decisions are noted:
```bash
.claude/scripts/log-decision.sh DEC-XXX <category> "<title>" "<rationale>" "<alternatives>" <product> code-reviewer
```

### Step 6: Update Agent Memory

```bash
.claude/scripts/post-task-update.sh code-reviewer REVIEW-XXX <product> success <minutes> "<summary>"
```

## Review Principles

1. **Be specific** — always reference file:line, never vague advice
2. **Severity matters** — Critical > High > Medium > Low
3. **Suggest fixes** — don't just identify problems, propose solutions
4. **Acknowledge good code** — note well-written patterns worth replicating
5. **Keep it actionable** — every finding should have a clear next step

## Difference from /audit

| Aspect | /code-reviewer | /audit |
|--------|---------------|--------|
| Scope | Code quality & patterns | Full production audit |
| Output | Issue table + recommendations | 15-section report with scores |
| Compliance | Not assessed | OWASP, SOC2, ISO 27001 |
| Scoring | No scores | 0-10 dimensional scores |
| Time | ~15 minutes | ~60 minutes |
| Use case | PR review, feature check | Pre-production gate |
