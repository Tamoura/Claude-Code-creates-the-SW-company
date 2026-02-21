# ConnectIn — Task List

> Generated from implementation plan. Updated as tasks complete.

---

## Phase 3: Feed, Profile & Network UI

| # | Task | Status | Branch |
|---|------|--------|--------|
| T024 | Feed Algorithm (cursor-based pagination in backend `getFeed`) | Complete | `feature/connectin/phase3-feed-ui` |
| T025 | Feed UI: post composer + infinite scroll | Complete | `feature/connectin/phase3-feed-ui` |
| T026 | Profile UI: inline headline edit + `/profile/[userId]` dynamic route | Complete | `feature/connectin/phase3-feed-ui` |
| T027 | Network UI: connections list + pending request accept/reject | Complete | `feature/connectin/phase3-feed-ui` |

### T024 — Feed Algorithm
- [x] **T024** Backend `getFeed` with cursor-based pagination already implemented
- Endpoint: `GET /feed?cursor=&limit=`
- Returns `{ data: Post[], meta: { cursor, hasMore, count } }`

### T025 — Feed UI
- [x] **T025** `useFeed` hook (`src/hooks/useFeed.ts`)
  - `fetchFeed(cursor?)` — initial load
  - `loadMore()` — appends next page (cursor-based)
  - `createPost(content)` — POST to API, prepends to state
  - `toggleLike(postId, isLiked)` — optimistic update with revert on failure
- [x] **T025** `PostCard` component (`src/components/feed/PostCard.tsx`)
  - Avatar initial fallback via `UserAvatar`
  - Author name, headline, relative time
  - Like button (filled/outline, aria-pressed)
  - Comment count badge
  - Apple design tokens: `rounded-[18px]`, `shadow-apple-md`, hover-lift
- [x] **T025** `FeedPage` updated (`src/app/(main)/feed/page.tsx`)
  - Composer with character count (3000 limit), disable on empty/submitting
  - Skeleton loading state (3x `PostCardSkeleton`)
  - Empty state
  - "Load more" button when `hasMore`

### T026 — Profile UI
- [x] **T026** Own profile page (`src/app/(main)/profile/page.tsx`)
  - "Edit Profile" button opens inline headline edit form
  - Headline input with save/cancel buttons
  - PUT `/profiles/me` with `{ headlineEn }`
  - Refetch on success
- [x] **T026** Other user profile page (`src/app/(main)/profile/[userId]/page.tsx`)
  - `useProfile(userId)` for dynamic userId
  - "Connect" button (POST `/connections/request`)
  - Status transitions: none → pending_sent → connected
  - Shows experience, education, skills (read-only)

### T027 — Network UI
- [x] **T027** `useConnections` hook (`src/hooks/useConnections.ts`)
  - Fetches `GET /connections` + `GET /connections/pending` in parallel
  - `acceptConnection(connectionId)` — PUT + optimistic update
  - `rejectConnection(connectionId)` — DELETE + optimistic update
  - Both revert on API failure
- [x] **T027** `NetworkPage` updated (`src/app/(main)/network/page.tsx`)
  - "Pending Requests" section with Accept/Decline buttons (only shown when count > 0)
  - "My Connections" section with avatar initial, name, headline
  - Client-side search filter on `displayName`
  - Section counts in headings

---

## Types Added

- `PendingRequest` added to `src/types/index.ts`
  ```ts
  { connectionId: string, user: { id, displayName, avatarUrl?, headlineEn? }, requestedAt: string }
  ```

---

## Test Coverage

- `src/hooks/__tests__/useFeed.test.ts` — 21 tests covering initial state, fetch, loadMore, createPost, toggleLike
- `src/hooks/__tests__/useConnections.test.ts` — 13 tests covering initial state, fetch, accept, reject
- All 367 tests pass
