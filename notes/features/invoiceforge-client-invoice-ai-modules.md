# InvoiceForge: Client CRUD, Invoice CRUD, AI Generation

## Status: In Progress

## Scope
1. Client CRUD module - replace 501 stubs with real implementations
2. Invoice CRUD module - replace 501 stubs and add generate/send
3. AI invoice generation service - Anthropic Claude integration
4. Config update for Anthropic API key

## Key Business Rules
- All monetary values as integers (cents)
- Tax rates in basis points (850 = 8.50%)
- Server-side math recalculation always
- Invoice numbers: INV-{NNNN} zero-padded, per user
- Free tier: 5 invoices/month, counter resets on 1st
- Only draft invoices can be edited/deleted
- Client fuzzy matching: case-insensitive, strip suffixes, 80%+ threshold

## Architecture
- Route -> Handler -> Service pattern (follows auth module)
- Zod validation at handler boundaries
- PrismaClient passed to services
- Real PostgreSQL for tests (invoiceforge_test)
- Mock only Anthropic API calls in tests

## Implementation Order (TDD)
1. Client service + tests (RED-GREEN-REFACTOR)
2. Invoice service + tests (RED-GREEN-REFACTOR)
3. AI service + tests (RED-GREEN-REFACTOR)
