# CI Preflight Protocol

**Purpose**: Prevent CI failures by running local validation before pushing code. This is a proactive gate that replaces the reactive pattern of "push, wait for CI, fix CI failure, push again."

## The Problem

Agents push code that fails CI due to predictable, recurring issues:
- Lockfile out of sync with package.json
- Broken GitHub Action references
- TypeScript compilation errors
- Lint violations
- Missing test updates

The reactive `claude-ci-fix.yml` workflow attempts auto-repair after failure, but this wastes CI minutes, creates noise PRs, and delays the actual work. Prevention is cheaper than repair.

## When to Run

**MANDATORY** before:
- `git push` (any branch)
- Creating a PR
- Reporting a task as "ready for review"

**Script**: `.claude/scripts/ci-preflight.sh [product]`

## What It Checks

| Check | What It Validates | Common Failure |
|-------|-------------------|----------------|
| Lockfile consistency | `pnpm-lock.yaml` matches all `package.json` files | Agent added dependency without running `pnpm install` |
| Actions validation | Staged workflow files pass `actionlint` | Syntax errors, broken action references |
| Known broken actions | Cross-references `.claude/ci/known-issues.yml` | Deleted/renamed GitHub Actions |
| TypeScript compilation | `tsc --noEmit` on product apps | Type errors introduced by changes |
| Lint | `npm run lint` on product apps | ESLint violations |
| Tests | `npm test` on product apps | Test failures from code changes |
| Secrets scan | `gitleaks` on staged files | Hardcoded credentials |
| Git safety | File count, .env files | Mass commits, credential leaks |

## Integration Points

### For Individual Agents

Every agent that modifies code MUST run ci-preflight before reporting task completion:

```
## CI Preflight (MANDATORY before push)
Before pushing your changes, run:
  bash .claude/scripts/ci-preflight.sh {PRODUCT}

If it reports FAIL:
1. Fix all failures listed in the report
2. Re-run until PASS
3. Only then push and report completion

If it reports PASS WITH WARNINGS:
- Review warnings — safe to push but address if possible
```

### For the Orchestrator

The orchestrator injects the CI Preflight directive into every implementation agent's prompt (backend-engineer, frontend-engineer, mobile-developer, data-engineer, devops-engineer). It runs at the same level as the Verification-Before-Completion protocol — individual task level, not milestone level.

### In the Gate Hierarchy

```
Individual Task Level:                    Milestone Level:
+---------------------------+             +---------------------------+
|  Agent implements task    |             |  All tasks complete       |
|          |                |             |          |                |
|  CI Preflight Gate        |  <-- NEW    |  Spec Consistency Gate    |
|          |                |             |  Browser Gate             |
|  5-Step Verification Gate |             |  Testing Gate             |
|          |                |             |  Code Review Gate         |
|  Task marked done         |  ---------> |  Audit Gate               |
+---------------------------+             |  Documentation Gate       |
                                          |          |                |
                                          |  CEO Checkpoint           |
                                          +---------------------------+
```

## Known Issues Registry

Agents MUST check `.claude/ci/known-issues.yml` before making changes to:
- `.github/workflows/` files
- `package.json` files (any workspace)
- CI/CD configuration
- Docker files

When an agent encounters a new CI failure pattern, they MUST add it to the registry so future agents avoid the same mistake.

## Agent Responsibilities

### When Modifying Dependencies

1. Edit `package.json`
2. Run `pnpm install` from repo root
3. Stage BOTH `package.json` AND `pnpm-lock.yaml`
4. Verify: `pnpm install --frozen-lockfile --dry-run`

### When Modifying Workflows

1. Check `.claude/ci/known-issues.yml` for known broken references
2. Run `actionlint` on the modified file
3. Verify action references exist (check GitHub repo availability)

### When Encountering a CI Failure

1. Diagnose the root cause
2. Fix the issue
3. Add to `.claude/ci/known-issues.yml` if it's a pattern other agents might hit
4. Run ci-preflight to verify the fix
5. Push only after PASS

## Enforcement

The CI Preflight Protocol is enforced at three levels:

1. **Script-level**: `ci-preflight.sh` returns non-zero exit on failure
2. **Agent-level**: Orchestrator includes CI Preflight in every implementation agent prompt
3. **Pre-push hook**: `.githooks/pre-push` runs ci-preflight automatically (optional, opt-in)
