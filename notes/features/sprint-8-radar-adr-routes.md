# Sprint 8: Tech Radar Routes + ADR CRUD

## Tasks
- IMPL-066: Radar integration tests
- IMPL-068: Radar route implementation
- IMPL-071: ADR integration tests
- IMPL-075: ADR service + route implementation

## Key Decisions
- ADR model needs to be added to Prisma schema (not present yet)
- TechRadarItem model exists with 31 seeded items
- Radar relevance score: match user tech stack against radar item name/related technologies
- ADR routes scoped to organization via authenticated user
- ADR status transitions: proposed -> accepted, proposed -> deprecated, accepted -> superseded

## Conventions Observed
- Routes use `FastifyPluginAsync` pattern
- Auth via `preHandler: [fastify.authenticate]`
- User ID extracted as `(request.user as { sub: string }).sub`
- Organization lookup via `prisma.user.findUnique` then `organizationId`
- Response format: `sendSuccess(reply, data)` wrapping `{ success: true, data }`
- Error format: `AppError.notFound()` etc., via error handler plugin
- Tests use `getApp()`, `getPrisma()`, `closeApp()`, `cleanDatabase()`, `authHeaders()`
- Tests create users via signup+login flow
- Zod validation in `src/validations/` directory
