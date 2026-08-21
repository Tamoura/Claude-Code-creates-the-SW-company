# ADR-001: Layer the API as routes → services → repositories

**Status**: Accepted
**Date**: 2026-01-15
**Deciders**: Architect agent, Backend Engineer agent
**Traces to**: FR-005, NFR-003

## Context

TaskFlow's rules are small but not trivial: a task cannot be created against a
missing project (FR-001), a due date must be in the future (FR-004), and a
completed task must be reopened before it can be edited (FR-005). Those rules
have to live somewhere, and the choice sets the pattern every product generated
from this repository will copy.

Two options were on the table:

1. **Handlers do everything.** Fastify route handlers validate, apply rules and
   call Prisma directly. Fewer files, less ceremony.
2. **Three layers.** Routes shape HTTP, services own rules, repositories own
   persistence.

## Decision

Three layers.

## Consequences

**Positive**

- FR-005 is a plain method on `TaskService`, testable without an HTTP request.
- Swapping persistence touches one file per aggregate, never a route.
- Reviewers can find any rule by name — the Code Reviewer agent checks that
  business rules live in `services/`, and the check is meaningful.

**Negative**

- Three files for what could be one. For CRUD with no rules this is overhead,
  and a product with genuinely no domain logic may collapse the service layer —
  that variance belongs in the product's own ADR, not this one.

**Neutral**

- Route handlers stay short enough to read whole, which keeps the diff small
  when a rule changes.
