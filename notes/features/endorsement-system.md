# Endorsement System - ConnectIn

## Feature
Users can endorse skills on other users' profiles. Endorsements
increment a counter on ProfileSkill and are idempotent.

## Schema (already exists)
- Endorsement: id, endorserId, profileSkillId, createdAt
- Unique constraint: [endorserId, profileSkillId]
- ProfileSkill: has endorsementCount field + endorsements relation

## Endpoints
- POST /api/v1/endorsements — endorse a skill
- DELETE /api/v1/endorsements/:profileSkillId — remove endorsement
- GET /api/v1/endorsements/skill/:profileSkillId — list endorsers
- GET /api/v1/endorsements/by-me — list my endorsements

## Key Decisions
- Self-endorsement prevented (422 ValidationError)
- Endorsement is idempotent (upsert, count only increments on new)
- Removal is idempotent (no error if endorsement doesn't exist)
- All routes require auth

## Files Created
- src/modules/endorsement/endorsement.schemas.ts
- src/modules/endorsement/endorsement.service.ts
- src/modules/endorsement/endorsement.routes.ts
- tests/endorsement.test.ts
- Modified: src/app.ts (route registration)
