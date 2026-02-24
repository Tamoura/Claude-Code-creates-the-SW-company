# Phase 1 Sprint 1: Profile Strength Meter & Open-to-Work Badge

## Branch
`feature/connectin/phase1-linkedin-parity`

## Scope
1. UserPreference model (Prisma schema change)
2. Profile Strength Meter endpoint (GET /api/v1/profiles/me/strength)
3. Open-to-Work Badge endpoint (PUT /api/v1/profiles/me/open-to-work)

## Key Decisions
- Profile Strength uses a different weighting than the existing `completenessScore`:
  - avatarUrl: 15, headline: 15, summary: 15, experience: 20, education: 15, skills: 10, location: 5, website: 5
- Open-to-Work visibility: PUBLIC shows to all, RECRUITERS_ONLY hides from non-recruiter viewers
- UserPreference model stores theme + open-to-work settings
- bannerUrl added to Profile model

## Test Database
- URL: postgresql://postgres:postgres@localhost:5432/connectin_dev (same as dev; tests use cleanDatabase)
- Schema sync: `npx prisma db push --accept-data-loss`

## Status
- [x] Schema changes (UserPreference, bannerUrl, relation)
- [ ] RED: Profile Strength tests
- [ ] GREEN: Profile Strength implementation
- [ ] RED: Open-to-Work tests
- [ ] GREEN: Open-to-Work implementation
- [ ] Refactor & commit
