# CTOaaS Risk Service & Route Tests (IMPL-048 / IMPL-050)

## Status: Red Phase Complete

## What was done
- Created `tests/unit/risk.service.test.ts` (12 tests) for RiskService
- Created `tests/integration/risk.test.ts` (14 tests) for risk routes
- Updated `tests/helpers.ts` to include `riskItem.deleteMany` in cleanup

## Test Inventory

### Unit Tests (IMPL-048) - 12 tests
- `generateRisksFromProfile`: 5 tests (EOL tech, single-cloud, compliance gaps, team capacity, incomplete profile)
- `calculateCategoryScore`: 3 tests (average severity, empty category, exclude mitigated/dismissed)
- `getRiskSummary`: 2 tests (4 categories with scores, trend calculation)
- `updateRiskStatus`: 2 tests (active->mitigated, active->dismissed)

### Integration Tests (IMPL-050) - 14 tests
- `GET /api/v1/risks`: 3 tests (summary, auth, org-scoping)
- `GET /api/v1/risks/:category`: 3 tests (category items, status filter, severity sort)
- `GET /api/v1/risks/items/:id`: 3 tests (detail, 404, cross-org prevention)
- `PATCH /api/v1/risks/items/:id/status`: 3 tests (update, invalid status, auth)
- `POST /api/v1/risks/generate`: 2 tests (generate from profile, auth)

## All tests fail correctly (Red phase)
- Unit: 12/12 fail (RiskService undefined)
- Integration: 14/14 fail (routes return 404)
- Existing tests: 63 still pass (verified individually; concurrency issues pre-existing)

## Next Steps (Green Phase)
- Implement `src/services/risk.service.ts`
- Implement `src/routes/risk.ts`
- Register risk routes in app
