# Phase 1: LinkedIn Parity — Feature Notes

**Branch**: `feature/connectin/phase1-linkedin-parity`
**Target**: Close table-stakes gaps (10 features)
**Approach**: TDD (Red-Green-Refactor)

## Sprint Plan

### Sprint 1 (Weeks 1-2): Infrastructure + Quick Wins
1. [x] Planning docs committed to main
2. [ ] UserPreference model + migration
3. [ ] Profile Strength Meter (backend + frontend)
4. [ ] Open-to-Work Badge (backend + frontend)
5. [ ] Cover/Banner Image (backend + frontend, needs R2 or local storage)

### Sprint 2 (Weeks 3-4): Content Enrichment
6. [ ] Reactions System (replace Like with 6 reaction types)
7. [ ] Hashtags & @Mentions

### Sprint 3 (Weeks 5-6): Social Features
8. [ ] Endorsement UI
9. [ ] Block/Report Users

### Sprint 4 (Weeks 7-8): Sharing & Following
10. [ ] Shares/Reposts
11. [ ] Follow (Non-Connection)

### Sprint 5 (Weeks 9-12): Media Pipeline
12. [ ] Image/Video Uploads (R2 + processing)

## Implementation Notes

### UserPreference Model
- Stores dark mode, open-to-work status, open-to-work visibility (PUBLIC/RECRUITERS_ONLY)
- One-to-one with User model
- Created during registration with defaults

### Profile Strength Meter
- Algorithm: weighted scoring across fields
  - Photo: 15%, Headline: 15%, Summary: 15%, Experience: 20%, Education: 15%, Skills: 10%, Location: 5%, Website: 5%
- Returns score 0-100 + specific suggestions
- Bilingual suggestions (AR/EN based on language preference)

### Open-to-Work Badge
- Field in UserPreference: openToWork (boolean), openToWorkVisibility (PUBLIC/RECRUITERS_ONLY)
- API: PUT /api/v1/profiles/me/open-to-work
- Frontend: Toggle on profile page, green badge overlay on avatar

### Cover/Banner Image
- R2 or local upload, max 5MB, image formats only
- Profile model: add bannerUrl field
- API: PUT /api/v1/profiles/me/banner (multipart/form-data)
- Frontend: Banner area at top of profile page

## Decisions Log
- Starting with backend-only features before R2 setup (strength meter, open-to-work, reactions)
- Will use local file storage initially if R2 setup is blocked
