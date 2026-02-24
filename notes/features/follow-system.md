# Follow System (Asymmetric, Non-Connection)

## Overview
Implements the follow system for ConnectIn. Follows are asymmetric
(user A can follow user B without B following A). This is different
from connections which require mutual acceptance.

## Schema (already exists)
- Follow model: id, followerId, followingId, createdAt
- Unique constraint: [followerId, followingId]
- Relations: User.followsGiven, User.followsReceived

## Files Created
- `apps/api/src/modules/follow/follow.schemas.ts`
- `apps/api/src/modules/follow/follow.service.ts`
- `apps/api/src/modules/follow/follow.routes.ts`
- `apps/api/tests/follow.test.ts`

## Files Modified
- `apps/api/src/app.ts` (register follow routes)

## Key Decisions
- Follow is idempotent (re-following returns success)
- Unfollow is idempotent (unfollowing non-followed returns success)
- Self-follow throws ValidationError (422)
- All routes require authentication
- Prefix: /api/v1/follows
