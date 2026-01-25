# Workflow: Bug Fix

This workflow guides the Orchestrator through fixing a bug from report to verified resolution.

## Trigger

- CEO reports a bug: "There's a bug in [product] where..."
- GitHub issue created with bug label
- Support Engineer escalates an issue

## Prerequisites

- Product exists
- Bug is reproducible (or investigation needed)

## Workflow Steps

### Phase 1: Triage

```
Step 1.1: Initial Assessment
├── Invoke Support Engineer agent
├── Tasks:
│   ├── Attempt to reproduce
│   ├── Identify affected component
│   ├── Assess severity
│   └── Document findings
└── Output: Bug investigation report

Step 1.2: Prioritize
├── Based on Support Engineer assessment:
│   ├── Critical: Immediate action
│   ├── High: Current session
│   ├── Medium: Next sprint
│   └── Low: Backlog
└── Update issue with priority label

Step 1.3: Route
├── Backend bug → Backend Engineer
├── Frontend bug → Frontend Engineer
├── Infrastructure → DevOps Engineer
├── Unknown → Need more investigation
└── Create/update GitHub issue
```

### Phase 2: Investigation (if needed)

```
Step 2.1: Deep Dive
├── If component unclear:
│   ├── Check logs
│   ├── Review recent changes
│   ├── Test in different environments
│   └── Narrow down to specific code
└── Update issue with findings

Step 2.2: Root Cause Analysis
├── Why did this happen?
├── When was it introduced?
├── What's the fix scope?
└── Are there related issues?
```

### Phase 3: Fix

```
Step 3.1: Create Fix Branch
├── Branch from main: fix/[product]/[issue-id]
└── Update state with active task

Step 3.2: Implement Fix (TDD)
├── Invoke appropriate agent (Backend/Frontend)
├── Requirements:
│   ├── First: Write failing test that reproduces bug
│   ├── Second: Fix the code
│   ├── Third: Verify test passes
│   └── Fourth: Check for regressions
├── Agent commits:
│   ├── test: add failing test for #[issue]
│   └── fix: resolve [bug description] #[issue]
└── Push to fix branch

Step 3.3: Regression Check
├── Run full test suite
├── Run E2E tests
└── All must pass before proceeding
```

### Phase 4: Verification

```
Step 4.1: QA Verification
├── Invoke QA Engineer (for high/critical bugs)
├── Tasks:
│   ├── Verify original bug is fixed
│   ├── Test related functionality
│   ├── Add regression test if not covered
│   └── Sign off on fix
└── Update issue with verification status

Step 4.2: Create Pull Request
├── Create PR: fix/[product]/[issue-id] → main
├── PR includes:
│   ├── Summary of the bug
│   ├── Root cause
│   ├── Fix description
│   ├── Test coverage
│   └── Link to issue
└── Run CI

CHECKPOINT: Fix Review (for Critical/High only)
├── Notify CEO: "Bug fix ready for review"
├── Provide: PR link, what was fixed
├── Wait for: CEO approval
└── On approval: Proceed to merge

Note: Medium/Low bugs can be merged without checkpoint
if tests pass and fix is straightforward
```

### Phase 5: Resolution

```
Step 5.1: Merge
├── Squash merge PR to main
├── Delete fix branch
└── Auto-deploys to staging

Step 5.2: Verify in Staging
├── Invoke Support Engineer
├── Verify bug is fixed in staging
└── Report status

Step 5.3: Production (if production bug)
├── If critical: Trigger production deploy
├── Else: Wait for next release cycle
└── Verify in production when deployed

Step 5.4: Close Issue
├── Update issue with resolution
├── Link to PR/commit
├── Close issue
└── Update orchestrator state
```

## Bug Priority Response Matrix

| Priority | Triage | Investigation | Fix | Review |
|----------|--------|---------------|-----|--------|
| Critical | Immediate | 30 min max | ASAP | CEO required |
| High | Same session | 1 hour max | Same session | CEO required |
| Medium | Same session | Can queue | Next sprint | Auto-merge OK |
| Low | Can queue | Can queue | Backlog | Auto-merge OK |

## Hotfix Flow (Critical Production Bugs)

```
Critical Bug Reported
        │
        ▼
┌───────────────────┐
│ Immediate Triage  │
│ Support Engineer  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Hotfix Branch     │
│ fix/[product]/    │
│ hotfix-[issue]    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Minimal Fix       │
│ TDD still applies │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ CEO Approval      │  ◄── CHECKPOINT
│ (fast-track)      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Deploy to Prod    │
│ DevOps Engineer   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Monitor & Verify  │
│ Support Engineer  │
└───────────────────┘
```

## State Updates

```yaml
active_tasks:
  - id: "BUG-[product]-[issue]"
    product: "[product]"
    description: "Fix: [bug description]"
    status: in_progress
    priority: [critical|high|medium|low]
    agent: [backend-engineer|frontend-engineer]
    branch: "fix/[product]/[issue-id]"
    issue_number: [number]
    started: "[timestamp]"
```

## Issue Resolution Template

When closing a bug issue:

```markdown
## Resolution

**Fixed in**: PR #[number]
**Deployed to**: [staging|production] on [date]

**Root Cause**:
[Brief explanation of what caused the bug]

**Fix**:
[Brief explanation of the fix]

**Testing**:
- [x] Failing test added
- [x] Fix implemented
- [x] All tests passing
- [x] Verified in [environment]

**Related**:
- Commit: [hash]
- Related issues: #[numbers]
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Cannot reproduce | Ask for more info, check environments |
| Fix introduces regression | Revert, investigate more |
| Fix is complex/risky | CHECKPOINT with CEO |
| Multiple root causes | Split into multiple issues |
