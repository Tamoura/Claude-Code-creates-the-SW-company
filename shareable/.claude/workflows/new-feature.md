# Workflow: New Feature

This workflow guides the Orchestrator through implementing a new feature from request to merged code.

## Trigger

CEO says something like:
- "Add [feature] to [product]"
- "Implement [capability] for [product]"
- "[Product] needs [feature]"

## Prerequisites

- Product exists and is in development phase
- PRD exists for the product
- Architecture is defined

## Workflow Steps

### Phase 1: Specification (spec-kit enhanced)

```
Step 1.1: Create Feature Specification
├── Invoke Product Manager agent
├── Run `/speckit.specify` with CEO's feature request as input
│   ├── Generates structured spec at products/[product]/docs/specs/[feature-name].md
│   ├── User stories with acceptance criteria (Given/When/Then)
│   ├── Functional and non-functional requirements (FR-xxx, NFR-xxx)
│   ├── Component reuse check (from COMPONENT-REGISTRY.md)
│   └── Marks unclear areas with [NEEDS CLARIFICATION]
├── If [NEEDS CLARIFICATION] markers exist:
│   └── Run `/speckit.clarify` (up to 5 targeted questions to CEO)
├── Check if feature is in PRD:
│   ├── If not: Update PRD with new feature section
│   └── If yes: Verify spec aligns with existing PRD entry
└── Get acceptance criteria from spec (not free-form PRD)

Step 1.2: Check Dependencies
├── Are there blocking issues?
├── Are required APIs/components built?
├── Any external dependencies?
└── If blocked: Report to CEO, suggest resolution
```

### Phase 2: Planning (spec-kit enhanced)

```
Step 2.1: Create Implementation Plan
├── Invoke Architect agent
├── Run `/speckit.plan` with approved spec
│   ├── Constitution Check gate (all articles verified)
│   ├── Research phase (open source solutions)
│   ├── Design & Contracts (data model, API contracts)
│   └── Output: products/[product]/docs/plan.md
├── Run `/speckit.tasks` to generate task list
│   ├── Tasks organized by user story, TDD-ordered
│   ├── Parallel tasks marked for worktree execution
│   └── Output: products/[product]/docs/tasks.md
├── Run `/speckit.analyze` for consistency check
│   ├── Validates spec → plan → tasks alignment
│   └── Output: consistency report
├── What needs to be built:
│   ├── Backend changes? (API, database)
│   ├── Frontend changes? (UI, pages)
│   └── Both?
├── Can backend and frontend work in parallel?
└── Components to create/modify (from task list)

Step 2.2: Create Feature Branch
├── Branch from main: feature/[product]/[feature-id]
├── If parallel work needed:
│   ├── Create backend worktree: feature/[product]/[feature-id]-api
│   └── Create frontend worktree: feature/[product]/[feature-id]-ui
└── Update state with active task
```

### Phase 3: Implementation

```
Step 3.1: Backend Implementation (if needed)
├── Invoke Backend Engineer agent
├── Context:
│   ├── Feature requirements (from PRD)
│   ├── API contract (from architecture)
│   ├── Working directory (worktree if parallel)
│   └── Branch name
├── Agent deliverables:
│   ├── API endpoints implemented (TDD)
│   ├── Database migrations (if needed)
│   ├── All tests passing
│   └── Commits pushed to branch
└── Verify: Tests pass, endpoints work

Step 3.2: Frontend Implementation (if needed)
├── Invoke Frontend Engineer agent
├── Context:
│   ├── Feature requirements (from PRD)
│   ├── UI specifications
│   ├── API endpoints (from backend or contract)
│   ├── Working directory (worktree if parallel)
│   └── Branch name
├── Agent deliverables:
│   ├── UI components implemented (TDD)
│   ├── API integration
│   ├── All tests passing
│   └── Commits pushed to branch
└── Verify: Tests pass, UI works

Step 3.3: Merge Parallel Work (if applicable)
├── Merge backend branch into feature branch
├── Merge frontend branch into feature branch
├── Run all tests
├── Clean up worktrees
└── Resolve any conflicts
```

### Phase 4: Quality Assurance (MANDATORY BEFORE CEO REVIEW)

```
Step 4.1: E2E Tests with Playwright
├── Invoke QA Engineer agent
├── Context:
│   ├── Feature acceptance criteria
│   ├── User flows to test
│   └── Feature branch
├── Agent deliverables:
│   ├── E2E tests covering acceptance criteria
│   ├── Visual regression tests (screenshots)
│   ├── All tests passing IN BROWSER
│   └── Commits pushed to branch
├── MANDATORY CHECKS:
│   ├── Run `npm run test:e2e` - must pass
│   ├── Verify UI renders correctly (not just unit tests)
│   ├── Test all buttons, forms, and interactions
│   ├── Check styling loads properly (colors, borders, layout)
│   └── Test on both desktop and mobile viewports
└── Verify: Full test suite passes AND visual verification complete

Step 4.2: Visual Verification (MANDATORY)
├── QA Engineer must:
│   ├── Start the dev server
│   ├── Navigate through all new UI
│   ├── Verify all elements are visible and styled
│   ├── Test all user interactions work
│   └── Take screenshots as evidence
├── If ANY visual issues found:
│   └── Route back to Frontend Engineer to fix
└── Only proceed when visually verified

Step 4.3: Documentation
├── Invoke Technical Writer agent (if user-facing)
├── Update:
│   ├── API docs (if new endpoints)
│   ├── User guide (if new features)
│   └── README (if needed)
└── Commit updates to feature branch
```

**CRITICAL: Never send to CEO checkpoint without:**
1. `/speckit.analyze` passes (no CRITICAL findings in spec consistency)
2. All unit tests passing
3. All E2E/Playwright tests passing
4. Visual verification that UI renders correctly
5. Manual verification that all interactions work

### Phase 5: Review

```
Step 5.1: Create Pull Request
├── Create PR from feature branch to main
├── PR includes:
│   ├── Summary of changes
│   ├── Link to feature/issue
│   ├── Test results
│   └── Screenshots (if UI)
└── Run CI pipeline

CHECKPOINT: Feature Review
├── Notify CEO: "Feature complete, PR ready for review"
├── Provide:
│   ├── PR link
│   ├── What was built
│   ├── How to test locally
│   └── Any notes/concerns
├── Wait for: CEO approval
└── On approval: Proceed to merge

Step 5.2: Merge
├── Squash merge PR to main
├── Delete feature branch
├── Update state (task completed)
└── Notify CEO: "Feature merged and deployed to staging"
```

## Parallel Implementation Pattern

When backend and frontend can work in parallel:

```
                    ┌─────────────────────┐
                    │   Feature Branch    │
                    │ feature/prod/auth   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
    ┌─────────────────┐               ┌─────────────────┐
    │ Backend Worktree│               │Frontend Worktree│
    │ .../backend-auth│               │ .../frontend-auth│
    │                 │               │                 │
    │ API endpoints   │               │ UI components   │
    │ Database        │               │ Pages           │
    │ Tests           │               │ Tests           │
    └────────┬────────┘               └────────┬────────┘
             │                                  │
             └────────────────┬─────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Merge & Test      │
                    │   Full Integration  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   E2E Tests         │
                    │   QA Engineer       │
                    └─────────────────────┘
```

## State Updates

```yaml
active_tasks:
  - id: "FEAT-[product]-[id]"
    product: "[product]"
    description: "[feature name]"
    status: in_progress
    agents:
      - backend-engineer
      - frontend-engineer
      - qa-engineer
    branch: "feature/[product]/[id]"
    started: "[timestamp]"
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Tests fail | Agent fixes, retries (3 max) |
| Merge conflict | Resolve, run tests again |
| CI fails | Investigate, fix, re-run |
| CEO rejects PR | Get feedback, iterate |

## Commit Frequency

Agents should commit frequently:
- After each passing test (green phase)
- After each refactor
- Small, atomic commits
- Clear commit messages
