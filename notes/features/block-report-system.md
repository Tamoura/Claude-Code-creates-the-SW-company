# Block/Report System - Feature Notes

## Branch
`feature/connectin/phase1-linkedin-parity`

## Scope
- Block users (create, delete, list)
- Report users/posts/comments
- Bidirectional profile hiding on block
- Blocking removes existing connections
- Reports create records (no auto-block)

## Schema Changes
- New `Block` model with unique [blockerId, blockedId]
- New `Report` model with ReportReason and ReportStatus enums
- Add relations to User model

## Key Decisions
- Bidirectional: if A blocks B, neither sees the other's profile
- Block is idempotent (re-blocking returns 201)
- Unblock is idempotent (unblocking non-blocked returns 200)
- Report reasons: SPAM, HARASSMENT, HATE_SPEECH, MISINFORMATION, IMPERSONATION, OTHER
- Report status: PENDING (default), REVIEWED, RESOLVED, DISMISSED

## TDD Progress
- [ ] RED: Write failing tests
- [ ] GREEN: Implement to pass tests
- [ ] REFACTOR: Clean up
- [ ] Schema migration
- [ ] Profile service integration (block check)
