# Implementation Plan: [FEATURE NAME]

**Product**: [PRODUCT_NAME]
**Branch**: `feature/[product]/[feature-id]`
**Created**: [DATE]
**Spec**: [Link to spec.md]

## Summary

[Extract primary requirement and technical approach from feature spec]

## Technical Context

- **Language/Version**: TypeScript 5+ / Node.js 20+
- **Backend**: Fastify + Prisma + PostgreSQL 15
- **Frontend**: Next.js 14+ / React 18+ / Tailwind CSS
- **Testing**: Jest/Vitest + Playwright
- **Primary Dependencies**: [List key libraries]
- **Target Platform**: Web / Mobile / Both
- **Assigned Ports**: Frontend [PORT] / Backend [PORT]

## Constitution Check

**Gate: Before Phase 0**

| Article | Requirement | Status |
|---------|------------|--------|
| I. Spec-First | Specification exists and is approved | [PASS/FAIL] |
| II. Component Reuse | COMPONENT-REGISTRY.md checked | [PASS/FAIL] |
| III. TDD | Test plan defined | [PASS/FAIL] |
| IV. TypeScript | TypeScript configured | [PASS/FAIL] |
| V. Default Stack | Stack matches default or ADR exists | [PASS/FAIL] |
| VII. Port Registry | Ports assigned in PORT-REGISTRY.md | [PASS/FAIL] |

**If ANY gate fails: ERROR — resolve before proceeding.**

## Component Reuse Plan

| Need | Existing Component | Source Product | Action |
|------|-------------------|---------------|--------|
| [Need 1] | [Component name] | [Product] | Copy & Adapt / Import from @connectsw/shared |
| [Need 2] | None found | — | Build new (add to registry after) |

## Project Structure

```
products/[product]/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── plugins/        # Fastify plugins
│   │   │   ├── routes/         # API route handlers
│   │   │   ├── services/       # Business logic
│   │   │   └── server.ts       # Server entry
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/
│       ├── src/
│       │   ├── app/            # Next.js app router
│       │   ├── components/     # React components
│       │   ├── hooks/          # Custom hooks
│       │   └── lib/            # Utilities
│       └── tests/
├── e2e/
│   ├── tests/
│   └── playwright.config.ts
└── docs/
    ├── spec.md                 # Feature specification
    ├── plan.md                 # This file
    ├── data-model.md           # Entity models
    └── contracts/              # API contracts
```

## Phase 0: Research

- [ ] Investigate unknowns from spec
- [ ] Document findings in `docs/research.md`
- [ ] Resolve all `[NEEDS CLARIFICATION]` markers

## Phase 1: Design & Contracts

- [ ] Create `docs/data-model.md` from spec entities
- [ ] Create API contracts in `docs/contracts/`
- [ ] Verify contracts satisfy all functional requirements
- [ ] Run constitution check (post-Phase 1 re-validation)

## Complexity Tracking

| Decision | Violation of Simplicity? | Justification | Simpler Alternative Rejected |
|----------|------------------------|---------------|------------------------------|
| [Decision] | [Yes/No] | [Why needed] | [What was considered] |
