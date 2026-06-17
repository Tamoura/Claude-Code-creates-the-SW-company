# ADR-006: API Versioning, Validation & Error Model

## Status
Accepted — 2026-06-17 (ARCH-01)

## Context
Multiple agents (Backend, Frontend, QA, DevOps) will build against this API. Consistency in route
versioning, input validation, and error shape is required for traceability (Constitution Art. VI),
runtime safety (Art. IV — Zod), and clean clients. The registry provides reusable `AppError` (RFC
7807), generic Zod validate helpers, and a pagination helper.

## Decision
1. **Versioning:** all API routes are prefixed `/v1`. Breaking changes introduce `/v2`; `/v1` is the
   MVP contract (`API.md`). Health endpoints (`/health`, `/health/ready`, `/internal/metrics`) are unversioned.
2. **Validation:** every request **body, query, and params** is validated by a Zod schema declared in
   the module's `[name].schema.ts`, applied via reused `validateBody`/`validateQuery`/`validateParams`
   helpers. Validation failures return **400** (or **422** for semantic refinements like future dates)
   with a field-error map. No handler trusts unvalidated input (Art. IV).
3. **Error model:** all errors are thrown as **`AppError`** subclasses (`UnauthorizedError`,
   `ForbiddenError`, `NotFoundError`, `BadRequestError`, `ConflictError`, `ValidationError`) and
   serialized by a **single Fastify error handler** to **RFC 7807** problem+json
   (`type`, `title`, `status`, `detail`, optional `errors`). No stack traces leak to clients (NFR-006).
4. **List envelope & pagination:** list endpoints return `{ data, pagination }` using the shared
   pagination helper (`page`, `limit` ≤ 100). Non-enumerating responses where required (auth, NFR-007).
5. **Response typing:** response shapes are also Zod-described (single source of truth) and exported as
   TS types for the web client.

## Consequences

### Positive
- Uniform, predictable client integration; traceable endpoints (each cites FR/US).
- Runtime safety at the boundary (Zod) complements TS strict compile-time safety (Art. IV).
- One error-mapping path → consistent status codes and bodies; easier E2E assertions.

### Negative
- Slight per-endpoint boilerplate (schema + handler split) — offset by reuse helpers and clarity.

### Neutral
- OpenAPI can be generated from the Zod schemas later if an external contract is needed (not MVP).

## Alternatives Considered

### Ad-hoc validation in handlers / no shared error class
- Pros: less upfront structure.
- Cons: inconsistent errors, untraceable, error-prone, harder tests.
- Rejected: violates Art. IV/VI and the layering contract.

### Header/media-type versioning instead of URL prefix
- Pros: cleaner URLs.
- Cons: harder to read/test/curl; less obvious for a small team.
- Rejected: URL `/v1` is simplest and explicit.

## References
- Constitution Art. IV (TS/Zod), Art. VI (traceability), NFR-006/007
- `architecture.md` §4.2, §12 · `API.md` · `.claude/COMPONENT-REGISTRY.md` (AppError, validate helpers, pagination)
