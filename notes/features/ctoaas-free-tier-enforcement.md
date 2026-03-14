# CTOaaS Free Tier Enforcement

## Task IDs
- IMPL-083: Red phase (failing tests for tier service)
- IMPL-084: Green phase (implement tier service + route)
- IMPL-093: Component registry update
- IMPL-096: Product registry update

## Key Decisions
- Free tier: 20 messages/day limit
- Pro/Enterprise: unlimited messages
- Counter resets at midnight UTC (using dailyMessageResetDate field)
- User model already has: tier, dailyMessageCount, dailyMessageResetDate
- Tier status endpoint: GET /api/v1/tier/status
- Tier check applied as preHandler on copilot /run route

## Patterns Followed
- Service layer pattern (TierService with PrismaClient)
- AppError for error responses
- sendSuccess/sendError for consistent response format
- buildApp() + app.inject() for integration tests
- createTestUser() helper for authenticated test requests
