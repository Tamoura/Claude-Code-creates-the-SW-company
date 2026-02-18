# ConnectSW Constitution

**Version**: 1.1.0
**Ratified**: 2026-02-11
**Last Amended**: 2026-02-18

## Preamble

This constitution governs all specification-to-implementation workflows at ConnectSW. It defines immutable principles that agents MUST follow when creating specifications, plans, tasks, and code. The constitution bridges spec-kit's specification-driven methodology with ConnectSW's orchestrator-based agent system.

---

## Article I: Specification-First Development

All product work MUST begin with a structured specification before implementation. Specifications define the "what" and "why" — code serves the specification, not the reverse.

**Rules:**
- Every new product MUST have a specification (via `/speckit.specify`) before architecture begins
- Every new feature MUST have a feature spec before implementation starts
- Specifications MUST focus on user outcomes, not implementation details
- Requirements MUST use `[NEEDS CLARIFICATION]` markers for any uncertain areas
- Specifications MUST be technology-agnostic; tech decisions belong in the plan phase

**Rationale:** ConnectSW agents previously jumped from CEO briefs directly to implementation, causing rework when requirements were ambiguous. Spec-first ensures all agents share the same understanding before code is written.

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

Every implementation artifact MUST trace back to a specification requirement.

**Rules:**
- Task IDs MUST reference spec requirement IDs (e.g., `[FR-001]`, `[US1]`)
- Test names MUST reference acceptance criteria from the spec
- PRs MUST link to the spec and list which requirements they address
- Orphan code (code that serves no spec requirement) MUST be flagged during review
- `/speckit.analyze` MUST be run before any CEO checkpoint to verify traceability

**Rationale:** Traceability prevents scope creep, ensures nothing is missed, and makes audits straightforward.

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
