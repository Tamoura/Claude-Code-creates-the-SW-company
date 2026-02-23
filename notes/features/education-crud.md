# Education CRUD Feature

## Branch
`feature/connectin/education-crud`

## Overview
Add Education CRUD endpoints (POST, PUT, DELETE) to the ConnectIn profile module.

## Endpoints
1. POST /api/v1/profiles/me/education - Add education entry
2. PUT /api/v1/profiles/me/education/:id - Update education entry
3. DELETE /api/v1/profiles/me/education/:id - Delete education entry

## Prisma Model
- Education: id, profileId, institution, degree, fieldOfStudy, description, startYear, endYear, sortOrder, createdAt
- Relation: Profile.educations (one-to-many)

## Key Decisions
- Education adds 15 points to completeness score (same as experience/skills)
- Ownership check: education.profile.userId must match authenticated user
- Include education in getMyProfile and getProfileById responses

## TDD Progress
- [ ] Red: Write failing tests
- [ ] Green: Implement minimum code
- [ ] Refactor: Clean up
