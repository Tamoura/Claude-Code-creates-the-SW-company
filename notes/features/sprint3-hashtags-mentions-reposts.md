# Sprint 3: Hashtags & @Mentions + Shares/Reposts

## Branch
`feature/connectin/phase1-sprint3`

## Features
1. **Hashtags & @Mentions** (#15)
   - Auto-extract #hashtags and @mentions from post content on creation
   - Hashtag pages (GET posts by tag)
   - Trending hashtags endpoint
   - Follow/unfollow hashtags
   - Mentions create notifications
   - Offset-based mention tracking for frontend highlighting

2. **Shares/Reposts** (#17)
   - Repost a post (with optional comment up to 1000 chars)
   - One repost per user per post (idempotent)
   - repostCount tracked on original post
   - Delete repost

## New Prisma Models
- Repost (originalPostId, userId, repostPostId?, comment?)
- Hashtag (tag unique, postCount, isTrending)
- PostHashtag (postId, hashtagId) junction
- HashtagFollow (userId, hashtagId)
- Mention (postId?, commentId?, mentionedUserId, offsetStart, offsetEnd)

## Key Business Rules
- Hashtag extraction: `/#([a-zA-Z0-9_\u0600-\u06FF]+)/g` (supports Arabic)
- Mention extraction: `/@([a-zA-Z0-9_\u0600-\u06FF]+)/g`
- Case-insensitive hashtags (stored lowercase)
- Mentions trigger MENTION notification (skip if blocked)
- Self-repost allowed (MVP simplicity)
- Trending = ordered by postCount DESC

## Progress
- [ ] Schema models added
- [ ] Hashtag tests written (RED)
- [ ] Hashtag service implemented (GREEN)
- [ ] Hashtag routes implemented
- [ ] Mention tests written (RED)
- [ ] Mention extraction implemented (GREEN)
- [ ] Repost tests written (RED)
- [ ] Repost service implemented (GREEN)
- [ ] Repost routes implemented
- [ ] All tests passing
