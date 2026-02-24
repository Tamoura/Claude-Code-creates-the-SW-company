# ConnectSW Constitution

**Version**: 1.2.0
**Ratified**: 2026-02-11
**Last Amended**: 2026-02-24

## Preamble

This constitution governs all specification-to-implementation workflows at ConnectSW. It defines immutable principles that agents MUST follow when creating specifications, plans, tasks, and code. The constitution bridges spec-kit's specification-driven methodology with ConnectSW's orchestrator-based agent system.

---

## Article I: Specification-First Development

All product work MUST begin with structured analysis and specification before implementation. Specifications define the "what" and "why" — code serves the specification, not the reverse.

**Rules:**
- Every new product MUST go through Business Analysis (BA-01) before specification begins. The Business Analyst produces a Business Analysis Report with stakeholder mapping, gap analysis, competitive analysis, and feasibility assessment. This ensures the product is grounded in market reality before requirements are written.
- Every new product MUST have a specification (via `/speckit.specify`) that consumes the BA report
- Every new feature MUST have a feature spec (via `/speckit.specify`) before design begins
- Specifications MUST focus on user outcomes, not implementation details
- Requirements MUST use `[NEEDS CLARIFICATION]` markers for any uncertain areas
- Specifications MUST be clarified (via `/speckit.clarify`) before handoff to Architecture
- Specifications MUST be technology-agnostic; tech decisions belong in the plan phase
- Spec consistency (via `/speckit.analyze`) is a mandatory gate before CEO checkpoints

**Rationale:** ConnectSW agents previously jumped from CEO briefs directly to implementation, causing rework when requirements were ambiguous. Business analysis ensures market and stakeholder grounding. Spec-first ensures all agents share the same understanding before code is written. Mandatory consistency gates prevent drift between specification and implementation.

---

## Article II: Component Reuse Before Creation

Before building ANY backend plugin, service, utility, frontend hook, component, or infrastructure config, agents MUST check existing components.

**Rules:**
- Read `.claude/COMPONENT-REGISTRY.md` before designing any new component
- Check the "I Need To..." quick reference table for matching components
- If a matching component exists at maturity "Production" or "Solid": copy and adapt it
- If building something new and generic: add it to the registry
- Spec plans MUST reference existing components they will reuse

**Rationale:** ConnectSW has 60+ production-tested components across 7 products. Rebuilding wastes time and introduces inconsistency.

---

## Article III: Test-Driven Development

All implementation MUST follow strict Test-Driven Development with real dependencies.

**Rules:**
- Tests MUST be written before implementation code (Red-Green-Refactor)
- NO mocks in tests — use real databases, real services, real API calls
- Test coverage MUST be >= 80% for all products
- E2E tests (Playwright) MUST exist for every user-facing feature
- Every acceptance criterion in the spec MUST map to at least one test
- Task lists MUST order test file creation before implementation file creation

**Rationale:** Mock-based tests give false confidence. Real-dependency tests catch integration issues that matter in production.

---

## Article IV: TypeScript Everywhere

All JavaScript code MUST be written in TypeScript 5+.

**Rules:**
- No `any` types except where explicitly justified
- Strict mode enabled in all `tsconfig.json`
- Use Zod for runtime validation schemas
- ESLint + Prettier MUST be configured and enforced
- Conventional commits format for all git messages

**Rationale:** Type safety prevents entire categories of bugs. Consistent tooling reduces onboarding friction across products.

---

## Article V: Default Technology Stack

Products MUST use the ConnectSW default stack unless an ADR justifies deviation.

**Rules:**
- Backend: Fastify + Prisma + PostgreSQL 15+
- Frontend: Next.js 14+ with React 18+ + Tailwind CSS
- Testing: Jest/Vitest + Playwright
- CI/CD: GitHub Actions
- Runtime: Node.js 20+
- Deviations MUST be documented in an ADR with clear rationale
- Plans MUST specify the exact stack being used with version numbers

**Rationale:** Stack consistency enables component reuse across products and reduces context-switching for agents.

---

## Article VI: Specification Traceability

Every implementation artifact MUST trace back to a specification requirement. Traceability is enforced at every stage: code, commits, tests, PRs, audits, and quality gates.

**Rules:**

### 6.1 Requirement IDs (BRD/PRD Level)
- Every user story MUST have a unique ID: `US-01`, `US-02`, etc.
- Every functional requirement MUST have a unique ID: `FR-001`, `FR-002`, etc.
- Every non-functional requirement MUST have a unique ID: `NFR-001`, `NFR-002`, etc.
- Every acceptance criterion MUST have a unique ID within its story: `AC-1`, `AC-2`, etc.
- IDs are defined in the PRD and referenced by all downstream artifacts

### 6.2 Task Graph Traceability
- Every task in the task graph MUST have `story_ids` and `requirement_ids` fields
- The orchestrator populates these when instantiating the task graph from the PRD
- Acceptance criteria in task graphs MUST reference PRD acceptance criteria IDs

### 6.3 Commit Message Format
- Feature/fix/refactor/test commits MUST include story or requirement IDs:
  ```
  feat(auth): add login endpoint [US-01][FR-003]
  fix(canvas): handle null elements [US-04] #123
  test(api): add auth integration tests [US-01][AC-1]
  ```
- Exempt commit types: `docs`, `chore`, `ci`, `style`, `build`
- Enforced by `.githooks/commit-msg` hook (warning mode; hard mode available)

### 6.4 Test Naming Convention
- Unit/integration test names MUST include story + acceptance criteria IDs:
  ```typescript
  test('[US-01][AC-1] user can register with valid email', async () => { ... })
  test('[US-04][AC-2] canvas renders 200+ elements without lag', async () => { ... })
  ```
- E2E tests MUST be organized by story ID:
  ```
  e2e/tests/stories/us-01-auth/register.spec.ts
  e2e/tests/stories/us-01-auth/login.spec.ts
  e2e/tests/stories/us-04-canvas/render.spec.ts
  ```

### 6.5 Code Linkage
- Every route handler / page component implementing a feature MUST have a header comment:
  ```typescript
  // Implements: US-01, FR-003 — User Authentication
  ```
- Orphan code (code that serves no spec requirement) MUST be flagged during code review

### 6.6 PR Requirements
- PR description MUST include an "Implements" section listing all story/requirement IDs:
  ```markdown
  ## Implements
  - [US-01] User Authentication (FR-001, FR-002, FR-003)
  - [US-02] NL-to-Diagram Generation (FR-004, FR-005)
  ```

### 6.7 Quality Gate Enforcement
- **Traceability Gate** (`.claude/scripts/traceability-gate.sh`): Runs alongside Testing Gate
- Checks: commit IDs, test names, E2E organization, architecture matrix, PRD IDs
- MUST pass before any CEO checkpoint
- `/speckit.analyze` also verifies spec→plan→task alignment

### 6.8 Audit Trail Linkage
- Audit log entries MUST include `story_id` and `requirement_ids` fields
- Enables querying: "show all work done for US-01" or "is FR-003 implemented?"

### 6.9 Requirement Coverage Report
- Testing Gate report MUST include a requirement coverage matrix:
  ```
  | US/FR ID | Acceptance Criteria | Test File       | Status |
  |----------|-------------------|-----------------|--------|
  | US-01    | AC-1: Register    | us-01/register  | PASS   |
  | US-01    | AC-2: Login       | us-01/login     | PASS   |
  | FR-003   | Password rules    | us-01/register  | PASS   |
  ```

**Rationale:** Traceability prevents scope creep, ensures nothing is missed, makes audits straightforward, and provides a complete chain from business requirement to deployed code. Without enforcement, traceability rules are aspirational — with enforcement, they are guaranteed.

---

## Article VII: Port Registry Compliance

All products MUST use unique ports to enable simultaneous local development.

**Rules:**
- Frontend apps: 3100-3199 (assigned per product in PORT-REGISTRY.md)
- Backend APIs: 5000-5099 (assigned per product)
- Mobile dev servers: 8081-8099 (assigned per product)
- Databases: Default Docker ports (shared containers)
- New products MUST register ports before foundation phase
- Specs and plans MUST reference assigned ports

**Rationale:** Port conflicts prevent parallel development across products.

---

## Article VIII: Git Safety

Git operations MUST follow strict safety rules to prevent data loss.

**Rules:**
- Never use `git add .` or `git add -A` — always stage specific files
- Verify staged files before every commit (`git diff --cached --stat`)
- Commits with >30 files are blocked by pre-commit hooks
- All work on branches, never direct to main
- PRs required for all changes, squash merge for features
- Branch naming: `feature/[product]/[id]`, `fix/[product]/[id]`, `arch/[product]`, `foundation/[product]`

**Rationale:** A previous bad branch base once deleted 600+ files. These rules prevent that class of incident.

---

## Article IX: Diagram-First Documentation

All documentation MUST prioritize visual communication. If something can be explained with a diagram, it MUST include a diagram. Text supplements diagrams — not the other way around.

**Rules:**
- All diagrams MUST use Mermaid syntax (renders natively in GitHub and Command Center)
- PRDs MUST include: C4 diagrams, ER diagrams, user journey flowcharts, and sequence diagrams for multi-step flows
- Implementation plans MUST include: architecture diagrams, data flow diagrams, and ER diagrams for schema changes
- READMEs MUST include: at minimum a C4 Container diagram showing the system architecture
- ADRs MUST include: before/after diagrams showing the architectural change
- State transitions (order status, user lifecycle, etc.) MUST use state diagrams
- Decision logic MUST use flowcharts with diamond decision nodes
- Timeline and phased work MUST use Gantt charts
- A document that explains something complex without a diagram is considered incomplete and MUST be rejected

**Diagram type quick reference:**

| Situation | Use |
|-----------|-----|
| System boundaries | C4 Context (`graph TD`) |
| Tech stack layout | C4 Container (`graph TD`) |
| Internal modules | C4 Component (`graph TD`) |
| Database schema | ER Diagram (`erDiagram`) |
| Multi-step flows | Sequence (`sequenceDiagram`) |
| User journeys | Flowchart (`flowchart TD`) |
| State transitions | State Diagram (`stateDiagram-v2`) |
| Phased timelines | Gantt (`gantt`) |
| Class relationships | Class Diagram (`classDiagram`) |

**Rationale:** The CEO mandates diagrams for readability. A wall of text where a diagram would suffice is a documentation defect. Diagrams communicate architecture and flows faster than prose.

---

## Article X: Quality Gates

All products MUST pass quality gates before progressing through development stages.

**Rules:**
- Browser-First Gate: Product MUST work in a browser before any other gate runs
- Security Gate: No HIGH/CRITICAL vulnerabilities before PR creation
- Performance Gate: Lighthouse >= 90, bundle < 500KB before staging
- Testing Gate: All tests pass, 80%+ coverage, visual verification before CEO checkpoint
- Production Gate: Monitoring, logging, rollback plan, SSL before production deploy
- `/speckit.analyze` constitutes a Specification Consistency Gate verifying spec-plan-task alignment

**Rationale:** Multi-gate quality catches issues at the earliest, cheapest stage.

---

## Governance

### Amendment Process

1. Propose amendment with rationale and impact analysis
2. Run `/speckit.analyze` to check if amendment conflicts with existing specs
3. CEO approval required for all constitution changes
4. Version bump: MAJOR for principle removal/redefinition, MINOR for additions, PATCH for clarifications
5. All dependent templates and agent definitions MUST be updated after amendment

### Compliance Review

- Agents MUST read the constitution before starting any specification or planning work
- The orchestrator MUST verify constitution compliance at each checkpoint
- `/speckit.analyze` checks constitution alignment as part of its consistency audit
- Non-compliance MUST be flagged as CRITICAL severity in analysis reports

### Authority Hierarchy

1. CEO decisions (highest)
2. This constitution
3. Product-specific addendum (`products/[product]/.claude/addendum.md`)
4. Agent-specific guidelines (`.claude/agents/*.md`)
