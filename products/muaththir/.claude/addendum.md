# Mu'aththir -- Agent Context Addendum

This document provides product-specific context for ConnectSW agents working on Mu'aththir.

## Product Overview

**Name**: Mu'aththir (Arabic for "Influential/Impactful")
**Type**: Web App (Full SaaS Product)
**Status**: Development (Backend MVP complete, Frontend in progress)
**Product Directory**: `products/muaththir/`
**Frontend Port**: 3108
**Backend Port**: 5005
**Database**: PostgreSQL (database name: `muaththir_dev`)

**What It Does**: Mu'aththir is a holistic child development platform where parents track children ages 3-16 across 6 interconnected dimensions: Academic, Social-Emotional, Behavioural, Aspirational, Islamic, and Physical. The core loop is: observe your child -> log the observation to a dimension -> review the radar chart -> check milestones -> repeat. Over time, parents build a rich longitudinal record of their child's development.

**Target Users**: Muslim parents primarily, but 5 of 6 dimensions are universal. Families with children ages 3-16 who want structured, holistic tracking beyond grades.

**Monetization**: Freemium model.
- Free: 1 child profile, unlimited observations and milestones
- Premium ($8/month): Unlimited children, data export, email digests
- Annual option: $77/year (20% discount)

## The Six Dimensions

| # | Dimension | Slug | Colour | Icon (suggested) | Description |
|---|-----------|------|--------|------------------|-------------|
| 1 | Academic | `academic` | Blue (#3B82F6) | Book/GraduationCap | School/learning progress, grades, milestones |
| 2 | Social-Emotional | `social_emotional` | Pink (#EC4899) | Heart/Users | Emotional intelligence, empathy, social skills |
| 3 | Behavioural | `behavioural` | Amber (#F59E0B) | Shield/CheckCircle | Conduct, habits, discipline, self-regulation |
| 4 | Aspirational | `aspirational` | Purple (#8B5CF6) | Star/Rocket | Goals, dreams, motivation, growth mindset |
| 5 | Islamic | `islamic` | Emerald (#10B981) | Moon/BookOpen | Quran, salah, Islamic knowledge, akhlaq |
| 6 | Physical | `physical` | Red (#EF4444) | Activity/Zap | Health, fitness, motor skills, nutrition, sleep |

These colours and icons are for UI consistency. All agents building dimension-related UI must use these.

## Age Bands

| Band | Ages | Slug | Description |
|------|------|------|-------------|
| Early Years | 3-5 | `early_years` | Pre-school, kindergarten. Focus on foundational skills, play-based learning. |
| Primary | 6-9 | `primary` | Early school years. Formal learning begins, social awareness grows. |
| Upper Primary | 10-12 | `upper_primary` | Pre-adolescence. Abstract thinking develops, identity forms. |
| Secondary | 13-16 | `secondary` | Adolescence. Independence, critical thinking, advanced academics. |

Age band is calculated from the child's date of birth. When a child's birthday causes a band transition, new milestones appear while previous band's completion status is preserved.

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| `/` | MVP | Landing page -- value proposition, 6-dimension model, CTA |
| `/signup` | MVP | Registration (email/password) |
| `/login` | MVP | Login |
| `/forgot-password` | MVP | Password reset request |
| `/reset-password` | MVP | Password reset with token |
| `/onboarding` | MVP | Post-signup guided onboarding |
| `/onboarding/child` | MVP | Create first child profile |
| `/dashboard` | MVP | Main dashboard -- radar chart, recent observations, milestones due |
| `/dashboard/observe` | MVP | New observation form |
| `/dashboard/timeline` | MVP | Chronological observation timeline with filters |
| `/dashboard/dimensions` | MVP | Grid view of all 6 dimensions |
| `/dashboard/dimensions/academic` | MVP | Academic dimension detail |
| `/dashboard/dimensions/social-emotional` | MVP | Social-Emotional dimension detail |
| `/dashboard/dimensions/behavioural` | MVP | Behavioural dimension detail |
| `/dashboard/dimensions/aspirational` | MVP | Aspirational dimension detail |
| `/dashboard/dimensions/islamic` | MVP | Islamic dimension detail |
| `/dashboard/dimensions/physical` | MVP | Physical dimension detail |
| `/dashboard/milestones` | MVP | All milestone checklists by dimension |
| `/dashboard/milestones/:dimension` | MVP | Milestone checklist for a specific dimension |
| `/dashboard/child/:id` | MVP | Child profile view |
| `/dashboard/child/:id/edit` | MVP | Edit child profile |
| `/dashboard/settings` | MVP | Account settings |
| `/dashboard/settings/notifications` | MVP | Notification preferences |
| `/dashboard/settings/subscription` | MVP | Subscription plan |
| `/dashboard/analytics` | MVP | Analytics overview (page skeleton) |
| `/pricing` | MVP | Pricing page |
| `/about` | MVP | About the methodology |
| `/privacy` | MVP | Privacy policy |
| `/terms` | MVP | Terms of service |
| `/dashboard/family` | Phase 2 | Multi-child family overview |
| `/dashboard/goals` | Phase 2 | Goal setting and tracking |
| `/dashboard/goals/new` | Phase 2 | Create new goal |
| `/dashboard/goals/:id` | Phase 2 | Goal detail |
| `/dashboard/reports` | Phase 2 | Progress reports |
| `/dashboard/reports/generate` | Phase 2 | Report configuration |
| `/dashboard/insights` | Phase 2 | AI-powered insights |
| `/dashboard/settings/sharing` | Phase 2 | Family sharing |
| `/dashboard/compare` | Phase 2 | Compare children across dimensions |
| `/dashboard/streaks` | Phase 2 | Streak tracking and engagement |

## Business Logic

### Radar Chart Score Calculation

Each dimension axis on the radar chart is scored 0-100. The formula:

```
score = (observation_factor * 0.4) + (milestone_factor * 0.4) + (sentiment_factor * 0.2)
```

Where:
- **observation_factor** = min(observations_last_30_days, 10) / 10 * 100
  - Caps at 10 observations; more than 10 does not increase this factor
- **milestone_factor** = milestones_achieved / milestones_total_for_age_band * 100
  - Based on current age band only
- **sentiment_factor** = positive_observations / total_observations_last_30_days * 100
  - If no observations, this factor is 0

The score is rounded to the nearest integer. Dimensions with zero observations and zero milestones score 0.

### Observation Data Model

Each observation contains:
- **child_id**: Reference to the child (required)
- **dimension**: One of the 6 dimension slugs (required)
- **content**: Free-form text, 1-1,000 characters (required)
- **content_ar**: Arabic text content (optional)
- **sentiment**: One of `positive`, `neutral`, `needs_attention` (required)
- **observed_at**: Date the observation occurred (defaults to today, can be backdated up to 1 year)
- **tags**: Array of strings, 0-5 tags per observation (optional)
- **created_at**: Timestamp of record creation (system-set)
- **updated_at**: Timestamp of last edit (system-set)
- **deleted_at**: Soft-delete timestamp (null if active)

### Child Age Band Calculation

```typescript
function getAgeBand(dateOfBirth: Date, referenceDate: Date = new Date()): string {
  const ageInYears = differenceInYears(referenceDate, dateOfBirth);

  if (ageInYears >= 3 && ageInYears <= 5) return 'early_years';
  if (ageInYears >= 6 && ageInYears <= 9) return 'primary';
  if (ageInYears >= 10 && ageInYears <= 12) return 'upper_primary';
  if (ageInYears >= 13 && ageInYears <= 16) return 'secondary';

  return 'out-of-range'; // Child is under 3 or over 16
}
```

Children under 3 or over 16 can still have profiles but will not have milestone checklists.

### Authentication Flow

- Email + password registration (no OAuth in MVP)
- JWT access tokens (1hr) + HttpOnly refresh token cookies (7d)
- bcrypt cost factor 12 for passwords
- Password requirements: 8+ characters, 1 uppercase, 1 number
- Rate limiting on auth endpoints: 30 requests/minute
- Session invalidation on password change

### Subscription Enforcement

- Free tier: 1 child profile. Unlimited observations and milestones for that child.
- When parent tries to create a 2nd child on free tier: show upgrade prompt.
- Premium ($8/month): Unlimited child profiles, data export, weekly email digest.
- Managed via Stripe Billing.
- Annual option: $77/year (20% discount).

### Data Privacy Rules

- All child data encrypted at rest
- No analytics pixels on child-data pages
- No third-party data sharing under any circumstances
- GDPR: data export within 24 hours, deletion within 30 days
- COPPA: treat all child data as sensitive regardless of jurisdiction
- Soft-deleted observations recoverable for 30 days, then permanently removed

## Special Considerations

### Islamic Content Guidelines

The Islamic dimension requires cultural sensitivity and accuracy:
- Use standard transliteration for Arabic terms (e.g., "salah" not "salat" or "prayer")
- Milestones should reference age-appropriate Islamic education expectations
- Avoid sectarian-specific content; focus on universally accepted Islamic practices
- Include guidance text that references Quran and Sunnah where appropriate
- Respect that families may follow different madhabs (schools of thought)
- Never present Islamic milestones as mandatory or judgmental

### Arabic Text Handling

- Observation text may contain Arabic words, Quranic ayat, or dua
- The UI must support bidirectional text rendering
- Arabic text within English observations should render correctly inline
- Surah names should support both Arabic (e.g., Al-Fatiha) and English transliteration
- Unicode support is required for all text fields

### The Holistic Philosophy

The 6 dimensions are interconnected, not isolated:
- **Ihsan** (excellence in everything) connects Academic goals to Islamic values
- **Sabr** (patience) connects Behavioural self-regulation to Islamic character
- **Shukr** (gratitude) connects Social-Emotional awareness to Islamic practice
- **Tawakkul** (reliance on Allah while taking action) connects Aspirational goals to Islamic faith

Agents building UI should reflect this interconnection. Dimension detail pages may cross-reference related concepts from other dimensions.

### Milestone Seed Data

The system requires 240+ milestones at launch (10 per dimension per age band, 6 dimensions x 4 bands = 24 categories). This seed data must be:
- Authored as a Prisma seed script or JSON fixture
- Reviewed for cultural appropriateness and developmental accuracy
- Loaded automatically during database migration/setup
- Not sourced from copyrighted assessment tools

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | Node.js | 20+ | LTS |
| Language | TypeScript | 5+ | All code |
| Frontend | Next.js 14 + React 18 | 14.x / 18.x | App Router, SSR for public pages |
| Styling | Tailwind CSS | 3.x | Utility-first |
| Components | shadcn/ui | latest | Built on Radix UI, accessible |
| Backend | Fastify | 5.x | Monolith with module separation (see ADR-001) |
| ORM | Prisma | 6.x | Type-safe DB access (see ADR-001) |
| Database | PostgreSQL | 15+ | Database name: `muaththir_dev` |
| Auth | Custom JWT + bcrypt | - | 1hr access, 7d refresh, cost-12 bcrypt |
| Validation | Zod | 3.x | API input validation |
| Charting | Recharts | 2.x | Radar chart, trend charts (see ADR-001) |
| Email | SendGrid or AWS SES | - | Transactional only |
| Testing | Jest + RTL + Playwright | - | Unit, component, E2E |
| Linting | ESLint + Prettier | - | Company standard |

### Libraries (Adopted)

| Package | Purpose | Why Chosen |
|---------|---------|------------|
| `bcrypt` | Password hashing | Industry standard, configurable cost |
| `jsonwebtoken` | JWT creation/verification | Mature, well-tested |
| `zod` | Schema validation | TypeScript-first, composable |
| `date-fns` | Date calculations, age band determination | Lightweight, tree-shakeable |
| `@fastify/cors` | CORS | Official Fastify plugin |
| `@fastify/helmet` | Security headers | Official Fastify plugin |
| `@fastify/rate-limit` | Rate limiting | Official Fastify plugin |
| `@fastify/cookie` | Cookie handling (refresh tokens) | Official Fastify plugin |
| `sharp` | Image resizing (child profile photos) | Fast, production-grade |
| `recharts` | Radar chart and trend graphs | React-native, SVG, accessible |

### Ports

- **Frontend**: 3108 (http://localhost:3108)
- **Backend**: 5005 (http://localhost:5005)
- **Database**: 5432 (shared PostgreSQL instance)

## Architecture

### System Design

Monolith backend with clean module separation. No microservices.

```
Browser -> Next.js (3108) -> Fastify API (5005) -> PostgreSQL
                                  |
                              SendGrid
                              (email)
```

### Backend Route Structure

```
apps/api/src/routes/
  activity.ts        - Activity logging
  children.ts        - Child CRUD
  children-photo.ts  - Photo upload
  compare.ts         - Child comparison
  dashboard.ts       - Dashboard aggregation
  digest.ts          - Email digest
  export.ts          - Data export
  health.ts          - Readiness/liveness checks
  insights.ts        - AI insights (Phase 2)
  milestones.ts      - Milestone definitions and progress
  profile.ts         - Parent profile management
  reports.ts         - Progress reports (Phase 2)
  sharing.ts         - Family sharing (Phase 2)
  streaks.ts         - Engagement streaks (Phase 2)
```

### Design Patterns

- **Route-Handler-Service**: Routes define endpoints, handlers parse requests, services contain business logic.
- **Zod schemas at boundaries**: All API inputs validated with Zod before reaching handlers.
- **Resource ownership**: Every database query filters by parent_id. No child can access another parent's data.
- **Soft deletes**: Observations use soft delete (deleted_at timestamp). Hard delete after 30 days via scheduled job.
- **Dimension as enum**: The 6 dimensions are a PostgreSQL enum type and a TypeScript union type. No magic strings.
- **Age band as computed field**: Never stored; always calculated from date of birth at query time.
- **Write-through cache**: Score cache table with staleness flag. Set stale on writes, recalculate on reads.

### Data Models (Key Entities)

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| Parent | email, name, passwordHash, subscriptionTier, digestFrequency | has many Children, Sessions, FamilyAccess |
| Child | name, dateOfBirth, gender, photoUrl, isDemo, medicalNotes | belongs to Parent, has many Observations, ChildMilestones, Goals, ScoreCache |
| Observation | dimension, content, contentAr, sentiment, observedAt, tags, deletedAt | belongs to Child |
| MilestoneDefinition | dimension, ageBand, title, description, guidance, titleAr, descriptionAr | has many ChildMilestones |
| ChildMilestone | childId, milestoneId, achieved, achievedAt, achievedHistory | belongs to Child + MilestoneDefinition |
| ScoreCache | childId, dimension, score, calculatedAt, stale | belongs to Child |
| Goal | childId, dimension, title, status, targetDate, templateId | belongs to Child, optional GoalTemplate |
| GoalTemplate | dimension, ageBand, title, description, category | has many Goals |
| Session | parentId, token, expiresAt | belongs to Parent |
| FamilyAccess | parentId, inviteeEmail, role, status, childIds | belongs to Parent |

### Security

- JWT access tokens (1hr) + HttpOnly refresh token cookies (7d)
- bcrypt cost factor 12 for passwords
- Rate limiting on auth (30/min) and general (200/min)
- All queries filtered by parent_id (resource ownership)
- Input validation (Zod) + output escaping (XSS prevention)
- Security headers via @fastify/helmet (CSP, HSTS, X-Frame-Options)
- Child data encrypted at rest
- No analytics tracking on child-data pages

### Component Reuse from Registry

The following components are copied/adapted from the ConnectSW Component Registry:

| Component | Source Product | Adaptation Needed |
|-----------|---------------|-------------------|
| Auth Plugin | @connectsw/auth | Adapted for Fastify 5.x |
| Prisma Plugin | @connectsw/shared | Adapted for Fastify 5.x |
| Observability Plugin | @connectsw/shared | Adapted for Fastify 5.x |
| Logger | @connectsw/shared | Copy as-is |
| Error Classes | @connectsw/shared | Copy as-is |
| Pagination Helper | Component Registry | Copy as-is |
| Crypto Utils | @connectsw/shared | Password hashing only |

### Key Documents

- PRD: `products/muaththir/docs/PRD.md`
- Architecture: `products/muaththir/docs/architecture.md`
- API Schema: `products/muaththir/docs/api-schema.yml`
- DB Schema: `products/muaththir/docs/db-schema.sql`
- ADR-001: `products/muaththir/docs/ADRs/001-tech-stack.md`
- ADR-002: `products/muaththir/docs/ADRs/002-radar-chart-calculation.md`
- ADR-003: `products/muaththir/docs/ADRs/003-milestone-data-model.md`

---

**Created by**: Product Manager + Architect
**Last Updated**: 2026-03-06
**Status**: Development -- backend MVP complete, frontend in progress
