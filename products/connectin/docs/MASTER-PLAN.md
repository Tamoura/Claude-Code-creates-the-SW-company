# ConnectIn Master Plan: LinkedIn Parity & UI/UX Revamp

> **Date**: February 24, 2026 (Updated: February 25, 2026)
> **Status**: Backend Phases 1-3 Complete | Phase 2 Sprint 1 Frontend Done | Phase 1 Frontend In Progress
> **Scope**: Close all feature gaps vs LinkedIn/Qabilah + Full UI/UX revamp
> **Horizon**: 18+ months (5 phases, 45 features)

---

## Executive Summary

ConnectIn is an Arabic-first professional networking platform that has achieved significant implementation milestones. Backend development has completed all Phase 1 (LinkedIn parity), Phase 2 (AI differentiation), and Phase 3 (platform expansion) features — far ahead of the original schedule. The Phase 2 Sprint 1 frontend (bookmarks, custom slug, easy apply, profile views) is complete and merged. Phase 1 frontend implementation is now the active work stream, building UI components for reactions, follow, endorsements, block/report, and profile strength.

**Current test counts**: 557 API tests passing | 636 web tests passing

Three specialist agents produced the detailed plans:

| Document | Lines | Author | Contents |
|----------|:-----:|--------|----------|
| [ROADMAP.md](./ROADMAP.md) | 607 | Product Strategist | 45 features scored, 5 phases, Gantt charts, success metrics |
| [ARCHITECTURE-PLAN.md](./ARCHITECTURE-PLAN.md) | 2,711 | Architect | C4 diagrams, 41 new Prisma models, 100+ API endpoints, 6 sequence diagrams |
| [design/UI-UX-REVAMP-PLAN.md](./design/UI-UX-REVAMP-PLAN.md) | 1,806 | UI/UX Designer | Design system, color palette, 9 page wireframes, component library, a11y specs |

**Total documentation**: 5,081+ lines across 3 documents + this master plan.

---

## Current State (February 25, 2026)

### Backend: All Phase 1-3 Features Implemented

The backend has outpaced the original roadmap by roughly 9-12 months. All 30 features across Phases 1, 2, and 3 have working API implementations with comprehensive test coverage.

**Registered API modules** (from `apps/api/src/app.ts`):
- Core: auth, profile, connection, feed, consent, jobs, messaging, notifications, search, presence
- Phase 1: block, report, follow, endorsement, hashtag, media
- Phase 2: bookmark, poll, profile-views (via profile routes), slug (via profile routes), easy-apply (via jobs routes)
- Phase 3: certification, recommendation, job-alerts, group-messaging, advanced-search, salary-insights, organization, group, event, article
- AI: ai (Claude API integration — profile optimization, content generation)

### Frontend: Phase 2 Sprint 1 Done, Phase 1 In Progress

| Frontend Sprint | Features | Tests | Status |
|----------------|----------|:-----:|:------:|
| Phase 2 Sprint 1 | Bookmarks, Custom Slug, Easy Apply, Profile Views | 61 | DONE — PR #313 |
| Phase 1 Frontend | Reactions UI, Follow Button, Block/Report UI, Endorsements, Profile Strength Meter | In progress | IN PROGRESS |

**Existing frontend pages** (from `apps/web/src/app/(main)/`):
- Feed, Profile, Jobs, Messages, Network, Search, Settings, Saved

**Existing frontend components**:
- Feed: PostCard, ReactionPicker (tests written, components in progress)
- Jobs: JobCard, EasyApplyButton, ApplyModal, CreateJobModal
- Profile: ExperienceForm, EducationForm, SlugSettings, ProfileViewerItem, ProfileViewsSection
- Layout: TopBar, Sidebar, BottomNav, LanguageToggle, AuthGate
- Messages: ConversationItem, MessageBubble, TypingIndicator
- Notifications: NotificationItem, NotificationsPanel
- Saved: BookmarkCard

### Tech Stack
- Backend: Fastify 4 + Prisma 5 + PostgreSQL 15 (port 5007)
- Frontend: Next.js 14 + React 18 + Tailwind CSS (port 3111)
- Real-time: WebSocket (Fastify plugin)
- AI: Claude API (Anthropic) — profile optimization, content generation
- Database: 37+ Prisma models
- Tests: Jest + RTL (557 API | 636 web) + Playwright (26 E2E)

---

## Phase 1: NOW (0-3 months) — "Close the Table-Stakes Gap"

### Sprint Status (ALL COMPLETE — February 2026)

**Backend: 10/10 features complete (100%) | Frontend: In progress**

| Sprint | Features | Tests | Status |
|--------|----------|:-----:|:------:|
| Sprint 1 | Profile Strength Meter, Open-to-Work Badge, User Preferences | 41 | DONE |
| Sprint 2 | Reactions, Block/Report, Follow, Endorsements | 54 | DONE |
| Sprint 3 | Hashtags & @Mentions, Shares/Reposts | Included in 557 | DONE |
| Sprint 4 | Cover/Banner Image, Image/Video Uploads | Included in 557 | DONE |
| **Total Phase 1 Backend** | **10 features** | **557 (all API)** | **100% DONE** |

### Features

| # | Feature | Score | Effort | Key Deliverable | Backend Status | Frontend Status |
|---|---------|:-----:|:------:|----------------|:--------------:|:---------------:|
| 1 | Image/Video Uploads | 40 | L | R2 storage, media processing pipeline | DONE | Planned |
| 2 | Reactions System | 40 | M | 6 reaction types replacing binary like | DONE (18 tests) | In Progress |
| 3 | Hashtags & @Mentions | 48 | M | Hashtag pages, mention notifications | DONE | Planned |
| 4 | Shares/Reposts | 32 | M | Repost with optional commentary | DONE | Planned |
| 5 | Profile Strength Meter | 60 | S | AI-analyzed completeness scoring | DONE | In Progress |
| 6 | Block/Report Users | 40 | M | Bidirectional blocking, moderation queue | DONE (14 tests) | In Progress |
| 7 | Cover/Banner Image | 30 | S | Profile banner upload to R2 | DONE | Planned |
| 8 | Endorsement UI | 48 | M | 1-click skill endorsement, top endorsers | DONE (9 tests) | In Progress |
| 9 | Open-to-Work Badge | 60 | S | Toggle with public/recruiter-only visibility | DONE | Planned |
| 10 | Follow (Non-Connection) | 32 | M | Asymmetric follow, feed integration | DONE (13 tests) | In Progress |

### Data Models (Phase 1) — ALL IMPLEMENTED
- Reaction, Endorsement, Block, Report, UserPreference, Follow
- Media, PostMedia, Repost, Hashtag, PostHashtag, HashtagFollow, Mention, Bookmark

### UI/UX (Phase 1) — In Progress
- Design tokens (colors, typography, spacing, shadows) — Done
- Core components: TopBar, Sidebar, BottomNav — Done
- PostCard revamp (reactions UI, ReactionPicker) — In Progress
- Profile page revamp (follow button, endorsement UI, block button) — In Progress
- Profile strength meter UI — In Progress

---

## Phase 2: NEXT (3-6 months) — "AI-Powered Differentiation"

### Sprint Status

**Backend: 10/10 features complete (100%) | Frontend Sprint 1: DONE**

| Sprint | Features | Tests | Status |
|--------|----------|:-----:|:------:|
| Phase 2 Sprint 1 Frontend | Bookmarks, Custom Slug, Easy Apply, Who Viewed Profile | 61 | DONE — PR #313 |
| Phase 2 Sprint 2 Frontend | PYMK AI, AI Job Match, Polls, Content Analytics | — | Planned |
| **Total Phase 2 Backend** | **10 features** | **Included in 557** | **100% DONE** |

### Features

| # | Feature | Score | Effort | Backend Status | Frontend Status |
|---|---------|:-----:|:------:|:--------------:|:---------------:|
| 1 | People You May Know (AI) | 75 | XL | DONE | Planned |
| 2 | AI Job Match Score | 75 | XL | DONE | Planned |
| 3 | Who Viewed Your Profile | 45 | M | DONE | DONE (PR #313) |
| 4 | Saves/Bookmarks | 40 | S | DONE | DONE (PR #313) |
| 5 | Polls | 24 | M | DONE | Planned |
| 6 | Content Analytics | 36 | M | DONE | Planned |
| 7 | Easy Apply (1-Click) | 60 | S | DONE | DONE (PR #313) |
| 8 | Custom URL / Vanity Slug | 30 | S | DONE | DONE (PR #313) |
| 9 | Mutual Connections | 32 | M | DONE | Planned |
| 10 | Connection Degrees | 24 | L | DONE | Planned |

### Key Infrastructure (All Implemented)
- pgvector extension for embedding-based similarity matching
- Claude API integration for AI features
- Profile view tracking system

---

## Phase 3: GROWTH (6-12 months) — "Professional Platform"

### Sprint Status

**Backend: 10/10 features complete (100%) | Frontend: Not started**

| Feature | Backend Status |
|---------|:--------------:|
| Company/Organization Pages | DONE |
| Recommendations (Written Testimonials) | DONE |
| Certifications/Licenses | DONE |
| Resume AI Optimizer | DONE (Claude API) |
| Job Alerts | DONE |
| Salary Insights | DONE |
| Group Messaging | DONE |
| File Sharing in Messages | DONE |
| Advanced Search (Boolean/Filter) | DONE |
| Dark Mode | Planned (Frontend only) |

---

## Phase 4: FUTURE (12-18 months) — "Ecosystem & Monetization"

### Features (10)

**Backend work not yet started. Planning phase.**

Premium Tier, Recruiter Tools (ATS), Groups (note: Group model implemented in Phase 3 backend), Events (note: Event model implemented in Phase 3 backend), AI Job Recommendations, Interview Prep AI, Articles Editor (note: Article model implemented), Document Posts, Newsletters, Profile Verification

### Key Infrastructure
- Stripe for payments
- Firebase Cloud Messaging for push notifications
- Rich text editor (Tiptap/ProseMirror)

### Success Metrics
- 50,000 MAU, $50K MRR, 1,500 premium subscribers

---

## Phase 5: HORIZON (18+ months) — "Category Leader"

### Features (5)
Learning Platform, Audio Events, Decentralized Identity (DID), ActivityPub Federation, In-App Professional Games

### Success Metrics
- 100,000+ MAU, $1.2M+ ARR, 50+ open-source contributors

---

## Overall Completion Estimate (February 25, 2026)

| Dimension | Progress | Notes |
|-----------|:--------:|-------|
| Backend — Phase 1 | 100% | All 10 features, 557 total API tests |
| Backend — Phase 2 | 100% | All 10 features included in 557 tests |
| Backend — Phase 3 | 100% | All 10 features included in 557 tests |
| Backend — Phase 4 | ~15% | Groups, Events, Articles models done; payment/premium not started |
| Backend — Phase 5 | 0% | Not started |
| Frontend — Phase 1 | ~35% | Layout shell done; reactions/follow/endorsements in progress |
| Frontend — Phase 2 Sprint 1 | 100% | Bookmarks, slug, easy apply, profile views — PR #313 |
| Frontend — Phase 2 Sprint 2+ | 0% | Planned |
| Frontend — Phase 3+ | 0% | Not started |
| E2E Tests | 26/26 | Auth, feed, jobs, network, profile flows |

**Overall platform completion: ~45%**

---

## Current Active Work Stream: Phase 1 Frontend

The `feature/connectin/phase1-frontend` branch is actively implementing UI components for Phase 1 features. Tests for these components have been written (Red phase complete):

- `ReactionPicker.test.tsx` — Reaction picker component tests
- `FollowButton.test.tsx` — Follow/unfollow button tests
- `BlockButton.test.tsx` — Block user button tests
- `EndorseButton.test.tsx` — Skill endorsement button tests
- `useReactions.test.ts` — Reactions hook tests
- `useConnections.test.ts` — Connections hook tests

These will be merged to main once all tests pass.

---

## Architecture Summary

### Database Growth
- Current: 37+ tables (Phases 1-3 backend complete)
- After Phase 4: +10 tables (payments, premium features)
- Final target: 66 tables

### New Infrastructure Services
| Service | Purpose | Phase | Status |
|---------|---------|:-----:|:------:|
| Cloudflare R2 | Object storage (media, resumes) | 1 | Integrated |
| BullMQ | Background jobs (email, AI, media processing) | 1 | Integrated |
| Claude API | AI features (profile optimization, content gen) | 2 | Integrated |
| Meilisearch | Arabic-optimized full-text search | 3 | Planned |
| SendGrid/SES | Transactional & digest email | 3 | Planned |
| Stripe | Payment processing | 4 | Not started |
| Firebase Cloud Messaging | Push notifications | 4 | Not started |

### Design System
- **Colors**: Teal primary (#0C9AB8), Gold secondary (#D4A853), semantic scales
- **Typography**: System fonts + Arabic-optimized, 4px grid spacing
- **Components**: 8 categories (Navigation, Content, Forms, Feedback, Data, Social, Media, Messaging)
- **Accessibility**: WCAG 2.1 AA, 4.5:1 contrast, keyboard nav, screen reader, RTL-first

---

## Test Summary

| Test Suite | Count | Status |
|-----------|:-----:|:------:|
| API (backend) | 557 | All passing |
| Web (frontend RTL) | 636 | All passing |
| E2E (Playwright) | 26 | All passing |
| **Total** | **1,219** | **All passing** |

---

## Implementation Sprints

### Backend Sprints (ALL COMPLETE)

#### Sprint 1 (Weeks 1-2) — COMPLETE (Feb 2026)
1. **UserPreference model** — DONE (theme, language, feed sort, activity status)
2. **Profile Strength Meter** — DONE (completeness score calculation)
3. **Open-to-Work Badge** — DONE (UserPreference with visibility toggle)

#### Sprint 2 (Weeks 3-4) — COMPLETE (Feb 2026)
4. **Reactions System** — DONE (6 types: LIKE, CELEBRATE, SUPPORT, LOVE, INSIGHTFUL, FUNNY — 18 tests)
5. **Block/Report Users** — DONE (block/unblock, bidirectional hiding, reporting — 14 tests)
6. **Follow System** — DONE (follow/unfollow, lists, pagination, status — 13 tests)
7. **Endorsement System** — DONE (endorse/remove, endorser lists, count tracking — 9 tests)

#### Sprint 3 — COMPLETE (Feb 2026)
8. **Hashtags & @Mentions** — DONE (hashtag pages, mention notifications)
9. **Shares/Reposts** — DONE (repost with optional commentary)

#### Sprint 4 — COMPLETE (Feb 2026)
10. **Cover/Banner Image** — DONE (profile banner upload)
11. **Image/Video Uploads** — DONE (media pipeline)

#### Phase 2 Backend — COMPLETE (Feb 2026)
- All 10 Phase 2 features implemented (PYMK AI, Job Match, Profile Views, Bookmarks, Polls, Content Analytics, Easy Apply, Slug, Mutual Connections, Connection Degrees)

#### Phase 3 Backend — COMPLETE (Feb 2026)
- All 10 Phase 3 features implemented (Company Pages, Recommendations, Certifications, Resume AI, Job Alerts, Salary Insights, Group Messaging, File Sharing, Advanced Search + AI integration)

### Frontend Sprints

#### Phase 2 Sprint 1 Frontend — COMPLETE (PR #313)
- Saves/Bookmarks UI — hook + card + saved page with filter tabs
- Custom URL/Slug UI — SlugSettings component + settings integration + slug profile route
- Easy Apply UI — EasyApplyButton + JobCard integration
- Who Viewed Your Profile — ProfileViewerItem + ProfileViewsSection + profile page integration

#### Phase 1 Frontend — IN PROGRESS (branch: feature/connectin/phase1-frontend)
- Reactions UI (ReactionPicker, useReactions hook)
- Follow Button (FollowButton, useConnections hook)
- Block/Report UI (BlockButton, ReportModal)
- Endorsement UI (EndorseButton)
- Profile Strength Meter display

---

## Reference Documents

| Document | Path | Lines |
|----------|------|:-----:|
| Product Roadmap | `products/connectin/docs/ROADMAP.md` | 607 |
| Architecture Plan | `products/connectin/docs/ARCHITECTURE-PLAN.md` | 2,711 |
| UI/UX Revamp Plan | `products/connectin/docs/design/UI-UX-REVAMP-PLAN.md` | 1,806 |
| Gap Analysis | `notes/research/linkedin-vs-qabilah-feature-comparison.md` | 500 |
| This Document | `products/connectin/docs/MASTER-PLAN.md` | — |

---

*Last updated: February 25, 2026. Backend Phases 1-3 complete. Phase 2 Sprint 1 Frontend merged. Phase 1 Frontend in active development.*
