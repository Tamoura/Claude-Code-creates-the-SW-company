# ConnectIn -- Product Addendum

> **Version**: 1.0
> **Date**: February 20, 2026
> **Product**: ConnectIn -- Professional Networking Platform

---

## 1. Product Overview

ConnectIn is an AI-native, Arabic-first professional networking platform that serves Arab tech professionals globally and MENA-based recruiters. It differentiates from LinkedIn through four pillars: AI baked into every feature from architecture up (not bolted on as premium upsell), Arabic-first design with RTL-native components and cultural awareness (not English-first with Arabic localization), privacy-first data ownership (user-owned data, transparent algorithms, full data export), and open-source community-driven development (core platform is open source, self-hostable, API-first). The platform runs on Next.js 14+ (port 3111) and Fastify + Prisma + PostgreSQL (port 5007).

---

## 2. Site Map

Every route in the application is listed below. Routes marked "Coming Soon" are planned but not yet implemented; they must still exist in the router to display placeholder pages.

| Route | Page Name | Purpose | Key Elements | Phase |
|-------|-----------|---------|--------------|-------|
| `/` | Home Feed | Main landing page for authenticated users; shows personalized news feed | Post composer, infinite-scroll feed, trending topics sidebar, language toggle | MVP |
| `/login` | Login | Email + OAuth login | Email/password form, "Continue with Google" button, "Continue with GitHub" button, "Forgot Password" link, language toggle | MVP |
| `/register` | Register | New account creation | Email/password form, OAuth buttons, terms of service checkbox, language toggle | MVP |
| `/verify/:token` | Email Verification | Verify email address via token link | Verification status message, "Resend" button if expired | MVP |
| `/forgot-password` | Forgot Password | Request password reset email | Email input, "Send Reset Link" button | MVP |
| `/reset-password/:token` | Reset Password | Set new password via token link | New password input, confirm password input, submit button | MVP |
| `/profile` | My Profile | View own profile | Photo, headline, summary (AR/EN), experience, education, skills, completeness score, "Edit" button, "Optimize with AI" button | MVP |
| `/profile/edit` | Edit Profile | Edit all profile sections | Inline editors for each section, bilingual tabs (AR/EN) for headline and summary, avatar upload crop tool | MVP |
| `/profile/setup` | Profile Setup Wizard | Guided profile creation for new users | Step-by-step wizard: photo, headline, summary, experience, education, skills; AI optimizer integration; completeness score | MVP |
| `/profile/:id` | User Profile | View another user's profile | Photo, headline, summary, experience, education, skills, "Connect" / "Message" / "Connected" button, mutual connections count | MVP |
| `/network` | My Network | Manage professional connections | Connection list (paginated), search within connections, "People You May Know" section, pending request count badge | MVP |
| `/network/pending` | Pending Requests | View and respond to connection requests | Incoming requests with accept/reject buttons, outgoing requests with withdraw button | MVP |
| `/jobs` | Job Search | Browse and search job listings | Search bar, filter controls (location, remote, experience, date), job cards with title/company/location/date | MVP |
| `/jobs/:id` | Job Detail | View full job posting | Title, company, location, description, requirements, salary range, "Apply" button, "Save" button, similar jobs | MVP |
| `/jobs/new` | Post a Job | Create a new job listing (recruiter only) | Form: title, company, location, remote toggle, description, requirements, salary range, language selector | MVP |
| `/jobs/applications` | My Applications | View jobs I have applied to | List of applications with status (applied, reviewed, rejected), job title, company, applied date | MVP |
| `/jobs/my-postings` | My Job Postings | View and manage my job postings (recruiter) | List of posted jobs with applicant count, status (active/closed/draft), edit/close actions | MVP |
| `/messages` | Message Inbox | View all conversations | Conversation list sorted by recency, contact photo, name, last message preview, unread indicator, timestamp | MVP |
| `/messages/:conversationId` | Conversation | 1:1 message thread | Message bubbles with send/read status, text input, send button, contact info header | MVP |
| `/search` | Search Results | Global search results | Search bar, tabs (People, Posts, Jobs), filter controls per tab, result cards | MVP |
| `/search?q=&type=people` | People Search | Search results filtered to people | People cards with photo, name, headline, location, mutual connections, "Connect" button | MVP |
| `/search?q=&type=posts` | Post Search | Search results filtered to posts | Post cards with author, content preview, engagement counts | MVP |
| `/search?q=&type=jobs` | Job Search Results | Search results filtered to jobs | Job cards with title, company, location, date | MVP |
| `/hashtag/:tag` | Hashtag Feed | Posts tagged with a specific hashtag | Hashtag name, post count, "Follow" button, post feed filtered to hashtag | MVP |
| `/settings/account` | Account Settings | Account management | Email display, change password, delete account, data export | MVP |
| `/settings/notifications` | Notification Settings | Notification preferences | Toggles for: connection requests, messages, likes, comments, job recommendations, email digest frequency | MVP |
| `/settings/privacy` | Privacy Settings | Privacy controls | Read receipt toggle, profile visibility settings, data download request | MVP |
| `/settings/language` | Language Settings | Language and locale | Language selector (Arabic/English), numeral format preference (Eastern Arabic / Western) | MVP |
| `/admin` | Admin Dashboard | Platform health overview (admin only) | Metrics: total users, active users (24h), new registrations (7d), pending reports, flagged content count | MVP |
| `/admin/moderation` | Moderation Queue | Content moderation (admin only) | Report list with content preview, reporter info, reason, action buttons (dismiss, warn, remove, ban) | MVP |
| `/admin/users` | User Management | User administration (admin only) | User list with search, role filter, status filter; actions: view profile, change role, suspend, ban | MVP |
| `/company/:id` | Company Page | View company profile | Company logo, name, description (AR/EN), industry, size, headquarters, open jobs, "Follow" button | Phase 2 |
| `/company/new` | Create Company | Create company page (recruiter) | Form: name, logo, description (AR/EN), industry, size, headquarters, website | Phase 2 |
| `/analytics/profile` | Profile Analytics | Profile view analytics | Total views (7d, 30d), views over time graph, viewer demographics, industry breakdown | Phase 2 |
| `/analytics/posts` | Post Analytics | Content performance analytics | Per-post metrics: impressions, unique viewers, likes, comments, shares, engagement rate | Phase 2 |
| `/notifications` | Notifications | All notifications | Chronological notification list with type icons, read/unread state, action links | MVP |
| `/terms` | Terms of Service | Legal terms | Terms of service content in Arabic and English | MVP |
| `/privacy` | Privacy Policy | Privacy policy | Privacy policy content in Arabic and English, AI data usage disclosure | MVP |
| `/about` | About ConnectIn | Product information | Product description, team, mission, open-source links, contact | MVP |
| `/404` | Not Found | 404 error page | "Page not found" message with navigation links | MVP |
| `/500` | Server Error | 500 error page | "Something went wrong" message with retry option | MVP |

**Total Routes: 40** (34 MVP + 4 Phase 2 + 2 error pages)

---

## 3. Business Logic

### 3.1 Connection Rules

| Rule | Value | Rationale |
|------|-------|-----------|
| Max pending outgoing requests | 100 | Prevent spam connection requests |
| Connection request message max length | 300 characters | Keep messages concise and professional |
| Rejection cooldown | 30 days | Prevent harassment; allow time before retrying |
| Request expiration | 90 days | Auto-clean stale requests |
| Max connections per user | 5,000 | Technical constraint for feed performance; aligned with LinkedIn's 30K limit at larger scale |

### 3.2 Content Rules

| Rule | Value | Rationale |
|------|-------|-----------|
| Post max length | 3,000 characters | Long enough for substantive content; short enough to encourage conciseness |
| Comment max length | 1,000 characters | Shorter than posts to keep discussions focused |
| Share comment max length | 1,000 characters | Consistent with comment length |
| Images per post | 4 max | Balance between visual content and performance |
| Image max file size | 10 MB per image | Quality while preventing abuse |
| Avatar max file size | 5 MB | Profile photos should be smaller than post images |
| Accepted image formats | JPEG, PNG, WebP | Standard web formats |
| Post edit window | 60 minutes | Allow correction of typos; prevent retroactive content manipulation |
| Content deletion | Soft delete (post hidden, data retained 90 days for moderation) | Allow moderation review of deleted content |

### 3.3 Rate Limiting

| Action | Limit | Window | Applies To |
|--------|-------|--------|-----------|
| Login attempts | 5 | 1 minute | Per IP |
| Registration | 3 | 1 hour | Per IP |
| Connection requests | 50 | 1 day | Per user |
| Posts | 10 | 1 hour | Per user |
| Comments | 30 | 1 hour | Per user |
| Messages | 100 | 1 hour | Per user |
| AI Profile Optimizer | 5 | 1 day | Per user |
| AI Content Assistant | 20 | 1 day | Per user |
| Search queries | 60 | 1 minute | Per user |
| API (authenticated) | 100 | 1 minute | Per user |
| API (unauthenticated) | 20 | 1 minute | Per IP |

### 3.4 Moderation Rules

| Rule | Description |
|------|-------------|
| Report categories | Spam, Harassment, Misinformation, Hate Speech, Impersonation, Other |
| Report review SLA | 24 hours |
| Auto-flag threshold | Content reported by 3+ unique users is auto-hidden pending review |
| User warning escalation | 1st offense: warning; 2nd: 7-day suspension; 3rd: permanent ban |
| Appeal window | 30 days from action date |
| Banned user data retention | 90 days after ban (for legal compliance), then permanent deletion |

### 3.5 Account Rules

| Rule | Value |
|------|-------|
| Email verification deadline | 7 days (after which login prompts re-verification; account not deleted) |
| Verification link expiry | 24 hours |
| Password reset link expiry | 1 hour |
| Account deletion grace period | 30 days (user can reactivate by logging in) |
| Session duration | 30 days (with rolling refresh) |
| Concurrent sessions | Unlimited (user can revoke individual sessions from settings) |
| Minimum password requirements | 8 characters, 1 uppercase, 1 number, 1 special character |

### 3.6 Feed Algorithm (MVP)

The MVP feed uses a simple scoring formula (not ML-based):

```
feed_score = recency_score * 0.6 + engagement_score * 0.3 + connection_score * 0.1

recency_score = 1 / (1 + hours_since_posted / 24)
engagement_score = (likes + comments * 2 + shares * 3) / max_engagement_in_batch
connection_score = 1.0 if author is 1st-degree connection, 0.5 if 2nd-degree, 0.0 otherwise
```

Posts from followed hashtags are mixed in with connection posts at a 20% ratio (1 in 5 posts may be from a followed hashtag, not a direct connection).

### 3.7 AI Feature Rules

| Rule | Description |
|------|-------------|
| AI Profile Optimizer daily limit | 5 optimizations per user per day |
| AI response timeout | 30 seconds (show "Try again" if exceeded) |
| AI suggestion disclaimer | All AI suggestions display: "Generated by AI. Review before accepting." |
| AI content attribution | AI-generated posts do not carry an "AI-generated" label; users are responsible for content they publish |
| AI feature toggle | Users can disable all AI features in settings |
| AI data usage | Profile data sent to Claude API for optimization is not stored by Anthropic (per API agreement); disclosed in privacy policy |

---

## 4. Tech Stack

### 4.1 Confirmed Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Frontend** | Next.js | 14+ | App Router, React Server Components |
| **Frontend UI** | React | 18+ | Client components where needed |
| **Styling** | Tailwind CSS | 3+ | With CSS logical properties for RTL |
| **i18n** | react-i18next | Latest | Namespace-based, AR/EN |
| **Arabic Fonts** | IBM Plex Arabic / Tajawal | Latest | Open-source, screen-optimized |
| **Backend** | Fastify | 4+ | Async, schema-based validation |
| **ORM** | Prisma | 5+ | Type-safe database access |
| **Database** | PostgreSQL | 15+ | Primary data store |
| **Vector Search** | pgvector | 0.5+ | Embedding storage for Phase 2 AI matching |
| **Cache** | Redis | 7+ | Sessions, rate limiting, caching |
| **Object Storage** | Cloudflare R2 or AWS S3 | -- | Avatars, post images, CVs |
| **Email** | Resend or SendGrid | -- | Transactional email (verification, password reset) |
| **AI** | Claude API (Anthropic) | Latest | Profile optimization, content generation |
| **AI Routing** | OpenRouter | -- | Multi-model routing (Phase 2+) |
| **WebSocket** | @fastify/websocket | Latest | Real-time messaging |
| **Testing** | Jest | 29+ | Unit + integration tests |
| **Testing (Frontend)** | React Testing Library | Latest | Component tests |
| **E2E Testing** | Playwright | Latest | End-to-end browser tests |
| **CI/CD** | GitHub Actions | -- | Automated testing and deployment |
| **Language** | TypeScript | 5+ | All JavaScript code |

### 4.2 Port Assignments

| Service | Port | Notes |
|---------|------|-------|
| Frontend (Next.js) | 3111 | Assigned per PORT-REGISTRY.md |
| Backend (Fastify) | 5007 | Assigned per PORT-REGISTRY.md |
| PostgreSQL | 5432 | Shared default Docker port |
| Redis | 6379 | Shared default Docker port |

---

## 5. Key Integrations

### 5.1 OAuth Providers

| Provider | Purpose | Scopes Required | Notes |
|----------|---------|-----------------|-------|
| **Google** | Registration + Login | `openid`, `email`, `profile` | Most common OAuth provider; covers Gmail users |
| **GitHub** | Registration + Login | `read:user`, `user:email` | Popular among developers (primary audience) |

Future consideration: LinkedIn OAuth (adds credibility but creates dependency on competitor).

### 5.2 AI Services

| Service | Purpose | Usage Context | Cost Model |
|---------|---------|---------------|------------|
| **Claude API (Anthropic)** | Profile optimization, content generation, content improvement | Triggered by user action (not background) | Per-token; estimated $0.01-0.05 per optimization |
| **OpenRouter** | Multi-model routing for content analysis and matching | Phase 2: routing between Claude, GPT-4, Gemini based on task | Per-token with model-specific pricing |

### 5.3 Email Service

| Service | Purpose | Volume Estimate (MVP) |
|---------|---------|----------------------|
| **Resend** (primary) or **SendGrid** (fallback) | Verification emails, password resets, notification digests | 5,000-10,000 emails/month (at 2,500 users) |

### 5.4 Object Storage

| Service | Purpose | Notes |
|---------|---------|-------|
| **Cloudflare R2** (primary) or **AWS S3** | Avatar images, post images, CV uploads (Phase 2) | R2 preferred for zero egress fees; CDN-backed for global delivery |

### 5.5 Monitoring & Analytics

| Service | Purpose |
|---------|---------|
| **Application monitoring** | Error tracking, performance monitoring (Sentry or similar) |
| **Web analytics** | Privacy-respecting analytics (Plausible or Umami, not Google Analytics) |
| **Uptime monitoring** | API health checks (BetterUptime or similar) |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-20 | Product Manager (AI Agent) | Initial addendum creation |
