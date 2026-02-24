# Phase 2 Sprint 1 — Bookmarks, Slug, Easy Apply, Profile Views

## Branch
`feature/connectin/phase2-sprint1`

## Features
- **A.1** Saves/Bookmarks UI: hook + card + saved page with filter tabs
- **A.2** Custom URL/Slug UI: SlugSettings component + settings integration + slug profile route
- **A.3** Easy Apply UI: easyApplyToJob in useJobs + EasyApplyButton + JobCard integration
- **A.4** Who Viewed Your Profile: useProfileViews hook + ProfileViewerItem + ProfileViewsSection + profile page integration

## New Types Added
- `Bookmark` interface (with `target?: Post | Job`)
- `ProfileViewer` interface
- `slug?: string` on `Profile`

## API Endpoints Expected (backend stubs, frontend-only)
- GET /bookmarks
- POST /bookmarks
- DELETE /bookmarks/:id
- PUT /profiles/me/slug
- GET /profiles/by-slug/:slug
- POST /jobs/:id/easy-apply
- GET /profiles/me/views
- GET /profiles/me/views/count

## Implementation Status
- [ ] A.0 Types added
- [ ] A.1.1 useBookmarks hook
- [ ] A.1.2 BookmarkCard component
- [ ] A.1.3 Saved page
- [ ] A.2.1 SlugSettings component
- [ ] A.2.2 Settings page integration
- [ ] A.2.3 Slug profile route
- [ ] A.3.1 easyApplyToJob in useJobs
- [ ] A.3.2 EasyApplyButton component
- [ ] A.3.3 JobCard update
- [ ] A.4.1 useProfileViews hook
- [ ] A.4.2 ProfileViewerItem component
- [ ] A.4.3 ProfileViewsSection component
- [ ] A.4.4 Profile page integration

## Notes
- All components use `"use client"` directive
- i18n via `useTranslation("common")` — t() returns key in tests
- Design tokens: `rounded-[18px]`, `shadow-apple-md`, `dark:bg-[#1C1C1E]`
- Test files in `__tests__/` directories next to source
