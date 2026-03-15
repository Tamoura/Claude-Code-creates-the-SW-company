# IMPL-013 & IMPL-014: Profile/Onboarding Tests (Red Phase)

## Status: Red phase complete

## What was done
- Created `tests/unit/profile.service.test.ts` (8 tests) [IMPL-013]
- Created `tests/integration/profile.test.ts` (19 tests) [IMPL-014]
- All 27 new tests fail as expected (Red phase)
- All 36 existing tests still pass

## Key decisions
- Unit tests expect a `ProfileService` class with `calculateCompleteness()` and `buildOrgContext()` methods
- Integration tests use real signup+login flow (not the stub `createTestUser`) to get authenticated tokens
- Onboarding is 4 steps: CompanyBasics -> TechStack -> Challenges -> Preferences
- Step data maps to: Organization (steps 1,3), CompanyProfile (step 2), UserPreference (step 4)
- Completeness: 0/25/50/75/100 based on steps completed, with partial % support

## Routes expected
- `GET /api/v1/onboarding/step/:step` - get step data
- `PUT /api/v1/onboarding/step/:step` - save step data
- `PUT /api/v1/onboarding/complete` - mark onboarding done
- `GET /api/v1/profile/company` - get company profile
- `PUT /api/v1/profile/company` - update company profile
- `GET /api/v1/profile/completeness` - get completeness %

## Next: Green phase
Implement `ProfileService` and route handlers to make tests pass.
