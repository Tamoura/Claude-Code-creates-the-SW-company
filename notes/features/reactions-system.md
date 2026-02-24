# Reactions System - ConnectIn

## Overview
Replace simple like/unlike with rich reactions (LIKE, CELEBRATE, SUPPORT, LOVE, INSIGHTFUL, FUNNY).

## Schema
- `Reaction` model already exists in Prisma schema with `ReactionType` enum
- Unique constraint on `[postId, userId]` - one reaction per user per post
- Indexed on `[postId, type]` for fast count queries

## Endpoints
- `POST /posts/:id/react` - body: { type: "LIKE" | ... }
- `DELETE /posts/:id/react` - remove reaction
- `GET /posts/:id/reactions` - get breakdown by type

## Key Decisions
- Upsert semantics: re-reacting changes the type (no need to unreact first)
- Unreact is idempotent (no error if no existing reaction)
- getPostReactions returns all 6 types with 0 counts for unused types

## Files Modified
- `feed.schemas.ts` - added `reactToPostSchema`
- `feed.service.ts` - added `reactToPost`, `unreactToPost`, `getPostReactions`
- `feed.routes.ts` - added 3 new routes
- `tests/feed.test.ts` - added reaction test suite
