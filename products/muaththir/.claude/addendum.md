# Mu'aththir -- Agent Context Addendum

This document provides product-specific context for ConnectSW agents working on Mu'aththir.

## Product Overview

**Name**: Mu'aththir (Arabic for "Influential/Impactful")
**Type**: Web App (Full SaaS Product)
**Status**: Pre-Development (PRD Complete)
**Product Directory**: `products/muaththir/`
**Frontend Port**: 3108
**Backend Port**: 5005
**Database**: PostgreSQL (database name: `muaththir_dev`)

**What It Does**: Mu'aththir is a holistic child development platform where parents track children ages 3-16 across 6 interconnected dimensions: Academic, Social-Emotional, Behavioural, Aspirational, Islamic, and Physical. The core loop is: observe your child -> log the observation to a dimension -> review the radar chart -> check milestones -> repeat. Over time, parents build a rich longitudinal record of their child's development.

**Target Users**: Muslim parents primarily, but 5 of 6 dimensions are universal. Families with children ages 3-16 who want structured, holistic tracking beyond grades.

**Monetization**: Freemium model.
- Free: 1 child profile, unlimited observations and milestones
- Premium ($8/month): Unlimited children, data export, email digests

## The Six Dimensions

| # | Dimension | Slug | Colour (suggested) | Icon (suggested) | Description |
|---|-----------|------|-------------------|-------------------|-------------|
| 1 | Academic | `academic` | Blue (#3B82F6) | Book/GraduationCap | School/learning progress, grades, milestones |
| 2 | Social-Emotional | `social-emotional` | Pink (#EC4899) | Heart/Users | Emotional intelligence, empathy, social skills |
| 3 | Behavioural | `behavioural` | Amber (#F59E0B) | Shield/CheckCircle | Conduct, habits, discipline, self-regulation |
| 4 | Aspirational | `aspirational` | Purple (#8B5CF6) | Star/Rocket | Goals, dreams, motivation, growth mindset |
| 5 | Islamic | `islamic` | Emerald (#10B981) | Moon/BookOpen | Quran, salah, Islamic knowledge, akhlaq |
| 6 | Physical | `physical` | Red (#EF4444) | Activity/Zap | Health, fitness, motor skills, nutrition, sleep |

These colours and icons are for UI consistency. All agents building dimension-related UI should use these.

## Age Bands

| Band | Ages | Slug | Description |
|------|------|------|-------------|
| Early Years | 3-5 | `early-years` | Pre-school, kindergarten. Focus on foundational skills, play-based learning. |
| Primary | 6-9 | `primary` | Early school years. Formal learning begins, social awareness grows. |
| Upper Primary | 10-12 | `upper-primary` | Pre-adolescence. Abstract thinking develops, identity forms. |
| Secondary | 13-16 | `secondary` | Adolescence. Independence, critical thinking, advanced academics. |

Age band is calculated from the child's date of birth. When a child's birthday causes a band transition, new milestones appear while previous band's completion status is preserved.

## Site Map

| Route | Phase | Description |
|-------|-------|-------------|
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
- **text**: Free-form text, 1-1,000 characters (required)
- **sentiment**: One of `positive`, `neutral`, `needs_attention` (required)
- **observed_at**: Date the observation occurred (defaults to today, can be backdated up to 1 year)
- **tags**: Array of strings, 0-5 tags per observation (optional)
- **created_at**: Timestamp of record creation (system-set)
- **updated_at**: Timestamp of last edit (system-set)
- **deleted_at**: Soft-delete timestamp (null if active)

### Milestone Data Model

Each milestone definition contains:
- **dimension**: One of the 6 dimension slugs
- **age_band**: One of the 4 age band slugs
- **title**: Short title, max 100 characters
- **description**: Detailed description, max 300 characters
- **guidance**: Optional parent-facing tip, max 500 characters
- **sort_order**: Display order within dimension + age band

Each child's milestone progress is tracked separately:
- **child_id**: Reference to child
- **milestone_id**: Reference to milestone definition
- **achieved**: Boolean
- **achieved_at**: Timestamp when marked as achieved
- **achieved_history**: Array of {achieved_at, unmarked_at} for undo tracking

### Child Age Band Calculation

```typescript
function getAgeBand(dateOfBirth: Date, referenceDate: Date = new Date()): string {
  const ageInYears = differenceInYears(referenceDate, dateOfBirth);

  if (ageInYears >= 3 && ageInYears <= 5) return 'early-years';
  if (ageInYears >= 6 && ageInYears <= 9) return 'primary';
  if (ageInYears >= 10 && ageInYears <= 12) return 'upper-primary';
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
| Backend | Fastify | 4.x | Monolith with module separation |
| ORM | Prisma | 5.x | Type-safe DB access |
| Database | PostgreSQL | 15+ | Database name: `muaththir_dev` |
| Auth | Custom JWT + bcrypt | - | 1hr access, 7d refresh, cost-12 bcrypt |
| Validation | Zod | 3.x | API input validation |
| Charting | TBD (Architect decides) | - | Radar chart is core component |
| Email | SendGrid or AWS SES | - | Transactional only |
| Testing | Jest + RTL + Playwright | - | Unit, component, E2E |
| Linting | ESLint + Prettier | - | Company standard |

### Libraries (Likely)

| Package | Purpose |
|---------|---------|
| `bcrypt` | Password hashing |
| `jsonwebtoken` | JWT creation/verification |
| `zod` | Schema validation |
| `date-fns` | Date calculations, age band determination |
| `@fastify/cors` | CORS |
| `@fastify/helmet` | Security headers |
| `@fastify/rate-limit` | Rate limiting |
| `@fastify/cookie` | Cookie handling (refresh tokens) |
| `sharp` | Image resizing (child profile photos) |

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

### Backend Module Structure

```
apps/api/src/modules/
  auth/           - Registration, login, JWT, password reset
  children/       - Child CRUD, age band calculation, profile photos
  observations/   - Observation CRUD, validation, soft delete
  milestones/     - Milestone definitions, child milestone progress
  dashboard/      - Radar chart calculation, aggregation endpoints
  users/          - Profile, subscription management
  health/         - Readiness/liveness checks
```

Each module has: `routes.ts`, `handlers.ts`, `service.ts`, `schemas.ts`, `test.ts`

### Design Patterns

- **Route-Handler-Service**: Routes define endpoints, handlers parse requests, services contain business logic. Services are testable independently.
- **Zod schemas at boundaries**: All API inputs validated with Zod before reaching handlers.
- **Resource ownership**: Every database query filters by parent_id. No child can access another parent's data.
- **Soft deletes**: Observations use soft delete (deleted_at timestamp). Hard delete after 30 days via scheduled job.
- **Dimension as enum**: The 6 dimensions are a PostgreSQL enum type and a TypeScript union type. No magic strings.
- **Age band as computed field**: Never stored; always calculated from date of birth at query time.

### Data Models (Key Entities)

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| Parent | email, name, password_hash, subscription_tier | has many Children, Sessions |
| Child | name, date_of_birth, gender, photo_url, parent_id | belongs to Parent, has many Observations, ChildMilestones |
| Observation | dimension, text, sentiment, observed_at, tags, deleted_at | belongs to Child |
| MilestoneDefinition | dimension, age_band, title, description, guidance, sort_order | has many ChildMilestones |
| ChildMilestone | child_id, milestone_id, achieved, achieved_at | belongs to Child + MilestoneDefinition |
| Session | token, expires_at | belongs to Parent |

### Security

- JWT access tokens (1hr) + HttpOnly refresh token cookies (7d)
- bcrypt cost factor 12 for passwords
- Rate limiting on auth (30/min) and general (200/min)
- All queries filtered by parent_id (resource ownership)
- Input validation (Zod) + output escaping (XSS prevention)
- Security headers via @fastify/helmet
- Child data encrypted at rest
- No analytics tracking on child-data pages

### Key Documents

- PRD: `products/muaththir/docs/PRD.md`
- Architecture: `products/muaththir/docs/architecture.md` (to be created by Architect)
- API Schema: `products/muaththir/docs/api-schema.yml` (to be created by Architect)
- DB Schema: `products/muaththir/docs/db-schema.sql` (to be created by Architect)

---

**Created by**: Product Manager
**Last Updated**: 2026-02-07
**Status**: PRD complete, ready for architecture
