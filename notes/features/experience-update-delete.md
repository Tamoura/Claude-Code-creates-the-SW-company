# Experience Update & Delete Endpoints

## Branch
feature/connectin/experience-update-delete

## Summary
Add PUT and DELETE endpoints for experience entries under /api/v1/profiles/me/experience/:id

## Key Decisions
- Use NotFoundError (not ForbiddenError) for ownership violations to avoid info leaking
- Partial update via addExperienceSchema.partial() with refinement
- After delete, recalculate completeness score (existing pattern in addExperience)

## Endpoints
1. PUT /api/v1/profiles/me/experience/:id - partial update, ownership check
2. DELETE /api/v1/profiles/me/experience/:id - delete + recalculate completeness

## Files Modified
- apps/api/tests/profile.test.ts (8 new tests)
- apps/api/src/modules/profile/profile.schemas.ts (updateExperienceSchema)
- apps/api/src/modules/profile/profile.service.ts (updateExperience, deleteExperience)
- apps/api/src/modules/profile/profile.routes.ts (PUT, DELETE routes)

## Patterns Followed
- NotFoundError for 404s (from ../../lib/errors)
- ValidationError for 422s (from ../../lib/errors)
- sendSuccess helper for responses (from ../../lib/response)
- zodToDetails for Zod error conversion (from ../../lib/validation)
- recalculateCompleteness after modifying experiences
