# ConnectSW - AI Software Company

## Company Overview

ConnectSW is an AI-first software company where Claude Code agents handle all execution under CEO direction via an Orchestrator agent.

## How This Company Works

### For the CEO

You interact ONLY with the Orchestrator. Simply state what you want:
- "New product: [idea]"
- "Add feature: [description] to [product]"
- "Fix bug: [description]"
- "Ship [product] to production"
- "Status update"

The Orchestrator handles everything else.

### Agent Hierarchy

```
CEO
 └── Orchestrator (routes all work)
      ├── Business Analyst (requirements, stakeholder analysis)
      ├── Product Manager (specs, requirements)
      ├── Product Strategist (market analysis, roadmap)
      ├── Architect (system design)
      ├── Backend Engineer (API, business logic)
      ├── Frontend Engineer (UI, UX)
      ├── AI/ML Engineer (prompts, model routing, evals)
      ├── Mobile Developer (iOS, Android, React Native)
      ├── Data Engineer (schemas, migrations, pipelines)
      ├── Performance Engineer (optimization, load testing)
      ├── QA Engineer (testing, quality gates)
      ├── Security Engineer (AppSec, DevSecOps)
      ├── DevOps Engineer (CI/CD, infrastructure)
      ├── UI/UX Designer (design systems, accessibility)
      ├── Technical Writer (documentation)
      ├── Support Engineer (issues, bugs)
      ├── Innovation Specialist (R&D, emerging tech)
      └── Code Reviewer (audits, security assessment)
```

## Governing Documents

The **Constitution** (`.specify/memory/constitution.md`) is the single source of truth for all rules. It contains 14 articles covering:

| Article | Topic | Key Rule |
|---------|-------|----------|
| I | Spec-First Development | Every product/feature needs a spec before code |
| II | Component Reuse | Check COMPONENT-REGISTRY.md before building anything |
| III | Test-Driven Development | TDD with real dependencies, 80%+ coverage, no mocks |
| IV | TypeScript Everywhere | TS 5+, strict mode, Zod for runtime validation |
| V | Default Tech Stack | Fastify + Prisma + PostgreSQL + Next.js + Tailwind |
| VI | Traceability | Every artifact traces to a spec requirement (US-XX, FR-XXX) |
| VII | Port Registry | Unique ports per product (see PORT-REGISTRY.md) |
| VIII | Git Safety | Never `git add .`, verify staged files, pre-commit hooks |
| IX | Diagram-First Docs | If it can be a diagram, it MUST be a diagram (Mermaid) |
| X | Quality Gates | Browser, Security, Performance, Testing, Production gates |
| XI | Anti-Rationalization | No skipping quality processes; evidence-based completion |
| XII | Context Engineering | Progressive disclosure, attention-optimized prompts |
| XIII | CI Enforcement | Lint, test, coverage, security, traceability in CI |
| XIV | Clean & Secure Code | Shared ESLint config, OWASP-mapped rules, code review gate |

**Read the full constitution** for detailed rules and rationale.

## Context Engineering

Context windows degrade due to attention mechanics, not raw token limits. ConnectSW applies progressive disclosure to keep agents focused.

### Protocols

| Protocol | File | Purpose |
|----------|------|---------|
| Progressive Disclosure | `.claude/protocols/context-engineering.md` | Load only what agents need per task complexity |
| Context Compression | `.claude/protocols/context-compression.md` | Anchored Iterative Summarization for long sessions |
| Direct Delivery | `.claude/protocols/direct-delivery.md` | Specialists write to files; no re-synthesis |
| Context Hub | `.claude/protocols/context-hub.md` | Curated external API docs, persistent annotations |
| Quality Verification | `.claude/protocols/quality-verification.md` | Anti-rationalization + verification gates (planning, completion) |

### Progressive Disclosure Levels

| Task Complexity | Context Loaded | ~Token Budget |
|----------------|----------------|---------------|
| Trivial (typo, config) | Role + Task + Constraints | ~500 |
| Simple (single bug fix) | + Patterns + Experience + Context Hub docs | ~2,200 |
| Standard (multi-file feature) | + Full Brief + Registry + TDD + Context Hub full | ~5,500 |
| Complex (new product) | All sections expanded + Context Hub full | ~9,000 |

### Script Registry

All scripts organized into 6 namespaces. See `.claude/scripts/SCRIPT-REGISTRY.md` for the "I Need To..." quick reference table.

## Phase 0 — Mandatory Context Discovery

Before writing ANY code on a task, the assigned agent MUST:

1. **Inspect the target area** — Glob/grep to understand the files and modules involved.
2. **Identify the stack context** — Confirm frameworks, dependencies, and patterns in use.
3. **Fetch external API docs** — Use Context Hub (`chub get`) for libraries the task touches.
4. **Detect existing problems** — Partial migrations, inconsistent patterns, missing tests.
5. **Check the component registry** — Verify if reusable components already solve part of the task.
6. **Report findings** — Summarize to Orchestrator before proposing changes.

## When In Doubt — Default Agent Behavior

- **Read the code first.** Do not assume. Inspect the actual state.
- **Escalate, don't guess.** Surface ambiguity to the Orchestrator or CEO.
- **Propose a plan, don't just implement.** Present options with trade-offs.
- **Keep changes small and reversible.**

## Protocol Library (`.claude/protocols/`)

| Protocol | Category | When to Apply |
|----------|----------|---------------|
| `quality-verification.md` | Quality Assurance | Before planning, during implementation, before marking done — Articles II, XI |
| `context-engineering.md` | Context Engineering | When prompt design matters — Article XII |
| `context-compression.md` | Context Engineering | When context exceeds 60% — Article XII |
| `direct-delivery.md` | Context Engineering | Always — write deliverables to files — Article XII |
| `context-hub.md` | Context Engineering | External API docs, annotations, cross-session learning |
| `clean-code.md` | Code Quality | Before writing implementation code — Article XIV |
| `secure-coding.md` | Security | Before writing auth/payments/data code — Article XIV |
| `regression-testing.md` | Testing | Every new feature must add regression E2E tests |
| `ci-preflight.md` | Quality Assurance | Before every push — prevents CI failures |
| `parallel-execution.md` | Execution | When spawning multiple sub-agents |
| `i18n.md` | Internationalisation | Products with Arabic/RTL or multi-language |
| `proof-recording.md` | Testing | Every feature produces proof artifacts |
| `agent-message.schema.yml` | Agent Communication | Orchestrator + inter-agent messaging |
| `message-router.ts` | Agent Communication | Infrastructure — orchestrator routing |

## Specification-Driven Development (spec-kit)

| Command | Agent | Purpose |
|---------|-------|---------|
| `/speckit.specify` | Product Manager | Create structured feature specs from CEO briefs |
| `/speckit.clarify` | Product Manager | Resolve ambiguities in specs |
| `/speckit.plan` | Architect | Create traceable implementation plans |
| `/speckit.tasks` | Orchestrator | Generate dependency-ordered task lists |
| `/speckit.analyze` | QA Engineer | Validate spec/plan/tasks consistency (quality gate) |
| `/speckit.implement` | Orchestrator | Execute tasks via specialist agents |

**Workflow**: CEO brief → BA analysis → specify → clarify → PRD → Architecture → plan → tasks → implement → analyze → CEO Review

**Enforcement:** Spec-kit tasks are mandatory. The orchestrator MUST NOT skip them.

## Directory Structure

ConnectSW supports two repo layouts. All scripts auto-detect which mode via `.claude/scripts/resolve-product.sh`.

### Monorepo Mode

```
/products/[name]/        # Individual products
/packages/               # Shared cross-product packages
/docs/                   # Company documentation
/notes/                  # CEO briefs, decisions
/.claude/                # Agent definitions, workflows
/.specify/               # Spec-kit constitution, templates, commands
```

### Single-Repo Mode

```
/apps/                   # api/ and web/ at repo root
/e2e/                    # End-to-end tests
/docs/                   # Product documentation
/.claude/                # Agent definitions, workflows
/.specify/               # Spec-kit constitution, templates, commands
```

### Product Structure (per product)

```
apps/
├── api/                 # Backend (Fastify + Prisma)
└── web/                 # Frontend (Next.js + Tailwind)
e2e/                     # Playwright tests
docs/
├── PRD.md, API.md, ADRs/, specs/, plan.md, tasks.md
```

## Key Registries

- `.claude/COMPONENT-REGISTRY.md` — Reusable code components
- `.claude/PORT-REGISTRY.md` — Port assignments (3100-3199 frontend, 5000-5099 backend)
- `.claude/PRODUCT-REGISTRY.md` — All products with tier, stack, ports, CI, and docs

## Invoking the Orchestrator

```
/orchestrator New product: [idea]
/orchestrator Add [feature] to [product]
/orchestrator Fix [description] in [product]
/orchestrator Ship [product] to production
/orchestrator Status update
```

### Checkpoints (Orchestrator pauses for CEO approval)

- PRD complete
- Architecture complete
- Foundation complete (after Testing Gate PASS)
- Feature complete (after Testing Gate PASS)
- Pre-deployment to production (after Testing Gate PASS)
- Any blocker or decision needed

### Quality Gates (run before every checkpoint)

1. **Spec Consistency Gate** — `/speckit.analyze` validates alignment
2. **Browser-First Gate** — Product works in a real browser
3. **Testing Gate** — Unit tests, E2E tests, visual verification
4. All must PASS before proceeding. FAIL → fix → re-run.
