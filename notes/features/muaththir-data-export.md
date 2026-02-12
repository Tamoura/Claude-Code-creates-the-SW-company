# Muaththir Data Export Endpoint

## Summary

GET `/api/export` endpoint that allows authenticated parents to download all their data in JSON or CSV format. Supports GDPR-style data portability.

## Endpoint

- **URL**: `GET /api/export?format=json|csv`
- **Auth**: Required (Bearer token)
- **Rate limit**: 5 requests per hour (configured via route-level `config.rateLimit`)
- **Default format**: `json`

## JSON Response Shape

```json
{
  "exportedAt": "2026-02-12T...",
  "profile": { "name", "email", "subscriptionTier" },
  "children": [{
    "name", "dateOfBirth", "gender",
    "observations": [{ "dimension", "content", "sentiment", "observedAt", "tags" }],
    "milestones": [{ "achieved", "milestoneTitle", "dimension" }],
    "goals": [{ "title", "dimension", "status", "targetDate" }]
  }]
}
```

## CSV Format

Flat observations-only export with headers:
`child_name,dimension,content,sentiment,observed_at,tags`

- Tags joined with semicolons
- Fields with commas/quotes properly escaped per RFC 4180

## Key Decisions

- Soft-deleted observations (`deletedAt IS NOT NULL`) are excluded from both formats
- CSV exports only observations (most common exportable data); JSON includes everything
- Content-Disposition header triggers browser download
- Used `as unknown as ChildWithRelations[]` cast for Prisma include results

## Files

- `src/routes/export.ts` (197 lines) - Route implementation
- `src/app.ts` - Route registration (prefix: `/api/export`)
- `tests/integration/export.test.ts` (530 lines) - 25 integration tests

## Test Coverage

25 tests across 4 categories:
- Authentication (2): unauthenticated, invalid token
- JSON format (13): default format, headers, profile, children, observations, milestones, goals, exportedAt, multiple children, empty data, data isolation, soft-delete exclusion
- CSV format (8): content-type, disposition, headers, data rows, comma escaping, quote escaping, empty, tags, soft-delete exclusion
- Validation (1): invalid format rejection
