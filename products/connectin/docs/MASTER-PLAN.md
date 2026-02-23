# ConnectIn Master Plan: LinkedIn Parity & UI/UX Revamp

> **Date**: February 24, 2026
> **Status**: CEO-Approved for Implementation
> **Scope**: Close all feature gaps vs LinkedIn/Qabilah + Full UI/UX revamp
> **Horizon**: 18+ months (5 phases, 45 features)

---

## Executive Summary

ConnectIn is an Arabic-first professional networking platform currently at **MVP stage** with 11 feature areas, 25 data models, and 26+ E2E tests. A comprehensive gap analysis against LinkedIn (~180 features) and Qabilah (~30 features) identified **45 features** needed to achieve competitive parity and establish market leadership in the Arabic professional networking space.

Three specialist agents produced the detailed plans:

| Document | Lines | Author | Contents |
|----------|:-----:|--------|----------|
| [ROADMAP.md](./ROADMAP.md) | 564 | Product Strategist | 45 features scored, 5 phases, Gantt charts, success metrics |
| [ARCHITECTURE-PLAN.md](./ARCHITECTURE-PLAN.md) | 2,711 | Architect | C4 diagrams, 41 new Prisma models, 100+ API endpoints, 6 sequence diagrams |
| [design/UI-UX-REVAMP-PLAN.md](./design/UI-UX-REVAMP-PLAN.md) | 1,806 | UI/UX Designer | Design system, color palette, 9 page wireframes, component library, a11y specs |

**Total documentation**: 5,081 lines across 3 documents + this master plan.

---

## Current State

### What Exists (11 Feature Areas)
1. **Auth** — Registration, login, JWT sessions, GDPR compliance (export, delete, restrict, object)
2. **Profiles** — Bilingual (AR/EN), experience CRUD, education CRUD, skills with endorsement count
3. **Connections** — Request/accept/reject/withdraw with cooldown and expiration
4. **Feed** — Posts (3000 chars, RTL), comments, likes, edit/delete
5. **Jobs** — Search, apply, save, recruiter posting, application management
6. **Messaging** — 1:1 WebSocket real-time, typing indicators, read receipts
7. **Notifications** — In-app, preferences, email digest (daily/weekly)
8. **Search** — People, posts, jobs (basic full-text)
9. **Consent/Privacy** — GDPR Articles 18, 20, 21
10. **Presence** — Basic online status (partial)
11. **Settings** — Language preference, notification preferences

### Tech Stack
- Backend: Fastify 4 + Prisma 5 + PostgreSQL 15 (port 5007)
- Frontend: Next.js 14 + React 18 + Tailwind CSS (port 3111)
- Real-time: WebSocket (Fastify plugin)
- Database: 25 Prisma models
- Tests: Jest + RTL + Playwright (26+ E2E)

---

## Phase 1: NOW (0-3 months) — "Close the Table-Stakes Gap"

### Features (10)

| # | Feature | Score | Effort | Key Deliverable |
|---|---------|:-----:|:------:|----------------|
| 1 | Image/Video Uploads | 40 | L | R2 storage, media processing pipeline |
| 2 | Reactions System | 40 | M | 6 reaction types replacing binary like |
| 3 | Hashtags & @Mentions | 48 | M | Hashtag pages, mention notifications |
| 4 | Shares/Reposts | 32 | M | Repost with optional commentary |
| 5 | Profile Strength Meter | 60 | S | AI-analyzed completeness scoring |
| 6 | Block/Report Users | 40 | M | Bidirectional blocking, moderation queue |
| 7 | Cover/Banner Image | 30 | S | Profile banner upload to R2 |
| 8 | Endorsement UI | 48 | M | 1-click skill endorsement, top endorsers |
| 9 | Open-to-Work Badge | 60 | S | Toggle with public/recruiter-only visibility |
| 10 | Follow (Non-Connection) | 32 | M | Asymmetric follow, feed integration |

### New Data Models (Phase 1)
- Reaction, Media, PostMedia, Repost, Hashtag, PostHashtag, HashtagFollow
- Mention, Bookmark, Endorsement, Block, Report, UserPreference

### UI/UX (Phase 1)
- Design tokens (colors, typography, spacing, shadows)
- Core components: SearchBar, NavigationSidebar, TopBar, BottomNav
- Feed revamp: PostCard with reactions, media, shares
- Profile revamp: banner, strength meter, endorsement UI, badges

### Success Metrics
- 1,000 MAU, 15% DAU/MAU, 40% D7 retention
- 30% posts with media, 65% avg profile completeness

---

## Phase 2: NEXT (3-6 months) — "AI-Powered Differentiation"

### Features (10)

| # | Feature | Score | Effort |
|---|---------|:-----:|:------:|
| 1 | People You May Know (AI) | 75 | XL |
| 2 | AI Job Match Score | 75 | XL |
| 3 | Who Viewed Your Profile | 45 | M |
| 4 | Saves/Bookmarks | 40 | S |
| 5 | Polls | 24 | M |
| 6 | Content Analytics | 36 | M |
| 7 | Easy Apply (1-Click) | 60 | S |
| 8 | Custom URL / Vanity Slug | 30 | S |
| 9 | Mutual Connections | 32 | M |
| 10 | Connection Degrees | 24 | L |

### Key Infrastructure
- pgvector extension for embedding-based similarity matching
- Claude API integration for AI features
- Profile view tracking system

### Success Metrics
- 5,000 MAU, 25% PYMK acceptance rate, 50% D30 retention

---

## Phase 3: GROWTH (6-12 months) — "Professional Platform"

### Features (10)
Company Pages, Recommendations, Certifications, Resume AI Optimizer, Job Alerts, Salary Insights, Group Messaging, File Sharing, Advanced Search, Dark Mode

### Key Infrastructure
- Meilisearch for Arabic full-text search
- SendGrid/SES for email system
- BullMQ for background jobs

### Success Metrics
- 25,000 MAU, 200 company pages, 35% quarterly retention

---

## Phase 4: FUTURE (12-18 months) — "Ecosystem & Monetization"

### Features (10)
Premium Tier, Recruiter Tools (ATS), Groups, Events, AI Job Recommendations, Interview Prep AI, Articles Editor, Document Posts, Newsletters, Profile Verification

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

## Architecture Summary

### Database Growth
- Current: 25 tables
- After Phase 1: +12 tables = 37
- After Phase 2: +6 tables = 43
- After Phase 3: +18 tables = 61
- Final: 66 tables

### New Infrastructure Services
| Service | Purpose | Phase |
|---------|---------|:-----:|
| Cloudflare R2 | Object storage (media, resumes) | 1 |
| BullMQ | Background jobs (email, AI, media processing) | 1 |
| Meilisearch | Arabic-optimized full-text search | 3 |
| SendGrid/SES | Transactional & digest email | 3 |
| Stripe | Payment processing | 4 |
| Firebase Cloud Messaging | Push notifications | 4 |

### Design System
- **Colors**: Teal primary (#0C9AB8), Gold secondary (#D4A853), semantic scales
- **Typography**: System fonts + Arabic-optimized, 4px grid spacing
- **Components**: 8 categories (Navigation, Content, Forms, Feedback, Data, Social, Media, Messaging)
- **Accessibility**: WCAG 2.1 AA, 4.5:1 contrast, keyboard nav, screen reader, RTL-first

---

## Implementation Order (Phase 1 Sprint Plan)

Based on dependency analysis, Phase 1 features should be built in this order:

### Sprint 1 (Weeks 1-2): Infrastructure + Quick Wins
1. **R2 Object Storage setup** (unblocks media uploads, banner, file sharing)
2. **UserPreference model** (dark mode prep, open-to-work)
3. **Profile Strength Meter** (S effort, no dependencies)
4. **Open-to-Work Badge** (S effort, no dependencies)
5. **Cover/Banner Image** (S effort, depends on R2)

### Sprint 2 (Weeks 3-4): Content Enrichment
6. **Reactions System** (M effort, replaces Like model)
7. **Hashtags & @Mentions** (M effort, extends Post model)

### Sprint 3 (Weeks 5-6): Social Features
8. **Endorsement UI** (M effort, extends ProfileSkill)
9. **Block/Report Users** (M effort, new models)

### Sprint 4 (Weeks 7-8): Sharing & Following
10. **Shares/Reposts** (M effort, extends Post)
11. **Follow (Non-Connection)** (M effort, feed algorithm change)

### Sprint 5 (Weeks 9-12): Media Pipeline
12. **Image/Video Uploads** (L effort, R2 + processing pipeline)

### UI/UX Revamp (Parallel Track)
- Design tokens & Tailwind config — Sprint 1
- Navigation shell (TopBar, Sidebar, BottomNav) — Sprint 1-2
- PostCard revamp (reactions, media, shares) — Sprint 2-3
- Profile page revamp (banner, badges, endorsements) — Sprint 3-4
- Feed page layout revamp — Sprint 4-5

---

## Reference Documents

| Document | Path | Lines |
|----------|------|:-----:|
| Product Roadmap | `products/connectin/docs/ROADMAP.md` | 564 |
| Architecture Plan | `products/connectin/docs/ARCHITECTURE-PLAN.md` | 2,711 |
| UI/UX Revamp Plan | `products/connectin/docs/design/UI-UX-REVAMP-PLAN.md` | 1,806 |
| Gap Analysis | `notes/research/linkedin-vs-qabilah-feature-comparison.md` | 500 |
| This Document | `products/connectin/docs/MASTER-PLAN.md` | — |

---

*Implementation begins with Phase 1, Sprint 1. Each feature follows TDD (Red-Green-Refactor). All work on feature branches with PRs to main.*
