# Workflow: New Product

This workflow guides the Orchestrator through creating a new product from CEO idea to development-ready state.

## Trigger

CEO says something like:
- "New product: [idea]"
- "Start a new product for [purpose]"
- "I want to build [description]"

## Prerequisites

- CEO has provided product idea/brief
- No existing product with same name

## Workflow Steps

### Phase 1: Inception

```
Step 1.1: Create Product Structure
├── Create directory: products/[product-name]/
├── Create subdirectories: apps/, docs/, e2e/
├── Initialize package.json
└── Update orchestrator state (phase: inception)

Step 1.2: Gather Requirements
├── Check if CEO brief exists in notes/briefs/
├── If not, ask CEO for:
│   ├── Target users
│   ├── Core problem being solved
│   ├── Key features (high level)
│   └── Any constraints
└── Save brief to notes/briefs/[product-name].md

Step 1.3: Product Manager Creates PRD
├── Invoke Product Manager agent
├── Input: CEO brief
├── Output: products/[product-name]/docs/PRD.md
└── Commit to branch: feature/[product]/prd

CHECKPOINT: PRD Review
├── Notify CEO: "PRD ready for review"
├── Provide: Link to PRD
├── Wait for: CEO approval
└── On approval: Merge PRD branch
```

### Phase 2: Architecture

```
Step 2.1: System Design
├── Invoke Architect agent
├── Input: Approved PRD
├── Outputs:
│   ├── products/[product]/docs/architecture.md
│   ├── products/[product]/docs/api-contract.yml
│   ├── products/[product]/docs/data-model.md
│   └── products/[product]/docs/ADRs/ADR-001-*.md
└── Commit to branch: arch/[product]

CHECKPOINT: Architecture Review
├── Notify CEO: "Architecture ready for review"
├── Provide: Summary of key decisions
├── Wait for: CEO approval
└── On approval: Merge architecture branch
```

### Phase 3: Foundation

```
Step 3.1: Setup Infrastructure
├── Invoke DevOps agent
├── Create CI/CD pipelines
├── Setup environments (dev, staging)
└── Commit to branch: foundation/[product]

Step 3.2: Scaffold Backend (can be parallel with 3.3)
├── Create git worktree for backend agent
├── Invoke Backend Engineer agent
├── Setup:
│   ├── apps/api/ project structure
│   ├── Database schema (Prisma)
│   ├── Basic health endpoint
│   └── Test infrastructure
└── Commit to worktree branch

Step 3.3: Scaffold Frontend (can be parallel with 3.2)
├── Create git worktree for frontend agent
├── Invoke Frontend Engineer agent
├── Setup:
│   ├── apps/web/ project structure
│   ├── Basic layout and routing
│   ├── API client setup
│   └── Test infrastructure
└── Commit to worktree branch

Step 3.4: Merge Foundation
├── Merge backend branch
├── Merge frontend branch
├── Run all tests
└── Create PR for foundation

Step 3.5: E2E Verification (MANDATORY BEFORE CEO REVIEW)
├── Invoke QA Engineer agent
├── Tasks:
│   ├── Set up Playwright if not exists
│   ├── Write basic E2E smoke tests
│   ├── Test that app loads and renders correctly
│   ├── Test all visible UI elements are styled
│   ├── Test basic navigation works
│   └── Take screenshots as evidence
├── MANDATORY CHECKS:
│   ├── Dev server starts without errors
│   ├── App loads in browser
│   ├── All UI elements visible and styled correctly
│   ├── No console errors
│   ├── Forms have visible inputs and buttons
│   └── Basic interactions work (clicks, form submission)
├── If ANY issues found:
│   └── Route back to Frontend Engineer to fix
└── Only proceed to checkpoint when verified

CHECKPOINT: Foundation Review
├── Notify CEO: "Foundation ready for review"
├── Provide:
│   ├── What was set up
│   ├── How to run locally
│   ├── E2E test results
│   └── Screenshots of working UI
├── Wait for: CEO approval
└── On approval: Merge foundation branch
```

### Phase 4: Ready for Development

```
Step 4.1: Update State
├── Set product phase: development
├── Set current_sprint: "1.0"
└── Update agent_history

Step 4.2: Prepare Sprint
├── Invoke Product Manager
├── Create first sprint plan from PRD
├── Create GitHub issues for sprint tasks
└── Notify CEO: "Product ready for development"

Output:
├── Ready-to-develop product
├── First sprint planned
└── CEO can now request features
```

## State Updates

Throughout this workflow, update `.claude/orchestrator/state.yml`:

```yaml
products:
  [product-name]:
    phase: inception → architecture → development
    status: active
    created_at: [timestamp]
    last_activity: [timestamp]
```

## Rollback Points

If CEO rejects at checkpoint:
- PRD rejected: Return to Step 1.2, revise based on feedback
- Architecture rejected: Return to Step 2.1, revise based on feedback
- Foundation rejected: Fix issues, re-submit PR

## Parallel Work

Steps 3.2 and 3.3 can run in parallel using git worktrees:

```bash
# Create worktrees
git worktree add ../connectsw-worktrees/backend-[product] -b foundation/[product]/backend
git worktree add ../connectsw-worktrees/frontend-[product] -b foundation/[product]/frontend

# Agents work in parallel

# Merge when both complete
git checkout main
git merge foundation/[product]/backend
git merge foundation/[product]/frontend

# Cleanup
git worktree remove ../connectsw-worktrees/backend-[product]
git worktree remove ../connectsw-worktrees/frontend-[product]
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Product name already exists | Ask CEO for different name |
| PRD agent fails | Retry with more context, escalate after 3 attempts |
| Architecture conflicts with constraints | Escalate to CEO for decision |
| Foundation tests fail | Fix before proceeding, don't merge broken code |
