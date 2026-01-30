# SEC-011: Audit Log Service

## Problem
No dedicated audit logging for administrative actions. The codebase uses
`logger.info()` for structured logging but lacks a formal audit trail
for security-critical operations (API key CRUD, webhook modifications,
refund processing, payment status changes).

## Solution
Create a standalone `AuditLogService` with:
- `record()` method to create audit entries
- `query()` method with filtering by actor, action, resourceType, date range
- Sensitive field redaction for passwords, tokens, secrets
- Fire-and-forget semantics (failures logged, never thrown)
- In-memory store (DB migration is a separate task)

## Key Decisions
- In-memory array for MVP; Prisma table in follow-up task
- SENSITIVE_KEYS: password, secret, token, key, authorization
- Redaction replaces values with '[REDACTED]'
- Nested object redaction via recursive traversal
- record() wraps in try/catch so it never blocks main operations

## Files
- `apps/api/tests/services/audit-log.test.ts` - test file
- `apps/api/src/services/audit-log.service.ts` - implementation
