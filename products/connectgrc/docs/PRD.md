# ConnectGRC - Product Requirements Document

**Product**: ConnectGRC
**Version**: 1.0
**Author**: Product Manager, ConnectSW
**Created**: 2026-02-11
**Updated**: 2026-02-16
**Status**: Living Document

---

## Table of Contents

1. [Overview](#1-overview)
2. [Personas](#2-personas)
3. [User Journeys](#3-user-journeys)
4. [Features](#4-features)
5. [Site Map](#5-site-map)
6. [User Flows](#6-user-flows)
7. [Functional Requirements](#7-functional-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Phase Roadmap](#10-phase-roadmap)
11. [Out of Scope](#11-out-of-scope)
12. [Risks](#12-risks)
13. [Success Metrics](#13-success-metrics)

---

## 1. Overview

### 1.1 Product Vision

ConnectGRC is the first AI-native talent platform built specifically for Governance, Risk, and Compliance (GRC) professionals. It connects GRC practitioners with employers through AI-powered skill assessments, career development tools, and intelligent job matching.

### 1.2 Problem Statement

GRC professionals lack a specialized platform to:
- Objectively validate their expertise across six core GRC domains.
- Receive AI-driven career guidance tailored to the GRC field.
- Connect with employers who understand and value specific GRC competencies.

Generic job platforms do not differentiate between GRC domains, experience levels, or framework-specific expertise. Employers struggle to assess candidate competency beyond certifications listed on a resume.

### 1.3 Product Goals

| Goal | Measurable Target |
|------|-------------------|
| Assess GRC professionals objectively | 25-question domain assessments with AI scoring against golden answers |
| Provide actionable career guidance | Personalized career simulations with certification ROI analysis |
| Connect talent with employers | Job matching based on domain scores, tier, and framework experience |
| Build a GRC knowledge ecosystem | Curated resource hub with 100+ articles, courses, and tools within 6 months |

### 1.4 Current Implementation Status

| Component | Status | Completion |
|-----------|--------|------------|
| Architecture & Design | Complete | 100% |
| Backend Foundation (Fastify + Prisma + PostgreSQL) | Complete | 100% |
| Frontend Foundation (Next.js 14 + Tailwind CSS) | In Progress | 85% |
| Authentication (register, login, verify, reset) | Complete | 100% |
| Profile Management (CRUD, domain scores) | Complete | 100% |
| Assessment System (session, questions, scoring, tiers) | Complete | 100% |
| Career Simulator (simulation, learning paths) | Complete | 100% |
| Job Board (listings, applications, filters) | Complete | 100% |
| Resource Hub (browse, filter, bookmark) | Complete | 100% |
| Notification System (list, mark read, unread count) | Complete | 100% |
| Admin Panel (users, analytics, question seeding) | Complete (API), Stubbed (UI) | 70% |
| E2E Test Framework (Playwright) | Configured | 60% |
| Overall Test Suite | 706/706 passing | 100% |

---

## 2. Personas

### 2.1 GRC Aspirant

**Who**: Early-career professional (0-2 years) entering the GRC field, often transitioning from IT, audit, or legal backgrounds.

**Goals**:
- Understand which GRC domains match their strengths.
- Get a baseline skill assessment to identify learning gaps.
- Discover certification paths with the highest career ROI.
- Access foundational GRC resources and frameworks.

**Pain Points**:
- Unsure which GRC specialization to pursue.
- Cannot differentiate themselves from other entry-level candidates.
- Overwhelmed by the number of certifications available (CISSP, CISA, CRISC, etc.).

**Key Behaviors**:
- Takes assessments to discover strengths across GRC domains.
- Uses the Career Simulator to explore entry-level to mid-level paths.
- Bookmarks resources and follows learning paths.

### 2.2 GRC Professional

**Who**: Mid-to-senior practitioner (3-10+ years) with established GRC experience and one or more certifications.

**Goals**:
- Validate expertise with an objective, AI-scored assessment.
- Achieve a higher professional tier (Developing, Proficient, Expert).
- Plan career transitions (e.g., from Risk Analyst to GRC Manager to CISO).
- Stay current with evolving frameworks and regulations (DORA, NIS2, AI Act).

**Pain Points**:
- Skills are hard to prove beyond listing certifications.
- Limited visibility into compensation benchmarks by GRC specialty.
- Career progression paths are unclear without mentorship.

**Key Behaviors**:
- Takes domain-specific assessments quarterly for continuous improvement.
- Runs career simulations to evaluate transition scenarios.
- Engages with the AI career counselor for strategic advice.
- Applies to matched job postings based on tier and domain scores.

### 2.3 Recruiter / Employer

**Who**: HR professionals or hiring managers at organizations seeking GRC talent.

**Goals**:
- Find pre-assessed candidates with verified domain competencies.
- Post job requirements with specific GRC domain and tier requirements.
- Review candidate assessment summaries without raw transcript data.
- Reduce time-to-hire for specialized GRC roles.

**Pain Points**:
- Cannot objectively compare GRC candidates beyond resume claims.
- GRC hiring requires niche knowledge that generalist recruiters lack.
- High cost of a bad hire in compliance-critical roles.

**Key Behaviors**:
- Posts jobs with domain, tier, and framework requirements.
- Searches the talent pool by domain score and certification.
- Reviews candidate assessment summaries and tier placements.

### 2.4 Platform Administrator

**Who**: ConnectGRC internal team member responsible for platform operations.

**Goals**:
- Manage the question bank, frameworks, and golden answers.
- Monitor platform health, user growth, and assessment quality.
- Manage user accounts, roles, and permissions.
- Seed and curate assessment content across all six GRC domains.

**Pain Points**:
- Scaling content quality across domains requires expert curation.
- Monitoring assessment integrity at scale.

**Key Behaviors**:
- Uses the admin dashboard to track platform metrics.
- Creates and manages assessment questions and golden answers.
- Reviews and curates GRC framework entries.
- Manages user roles and resolves account issues.

---

## 3. User Journeys

### 3.1 Aspirant Journey (Status: 98% complete)

```
Register -> Verify Email -> Create Profile -> Take First Assessment
  -> View Results (Tier Placement) -> Explore Career Paths
  -> Browse Resources -> Set Learning Goals
```

**Implemented**:
- Registration with email verification flow.
- Profile creation with headline, bio, experience level, skills, certifications.
- Assessment by GRC domain (6 domains available).
- Scoring with tier placement (Foundation/Developing/Proficient/Expert).
- Career simulation with skill gap analysis and recommendations.
- Resource hub with domain filtering and bookmarks.
- Notification system for assessment results and updates.

**Remaining**:
- Voice-based assessment input (currently text-based, stubbed for LiveKit).
- AI-powered profile analysis suggestions.

### 3.2 Professional Journey (Status: 25% complete)

```
Register -> Verify Email -> Import Profile/CV -> Take Advanced Assessment
  -> View Detailed Results (Radar Chart) -> Run Career Simulations
  -> AI Counselor Chat -> Apply to Matched Jobs -> Track Applications
```

**Implemented**:
- Registration, authentication, and profile management.
- Assessment system with domain selection and scoring.
- Career simulation with target role and level selection.
- Job browsing with domain and remote filters.
- Job application with cover letter support.
- Application tracking.

**Remaining**:
- CV upload and AI-powered parsing.
- Advanced assessment with adaptive difficulty.
- Radar chart visualization for domain score breakdown.
- AI counselor chat interface (endpoint stubbed).
- Intelligent job matching based on domain scores.
- Salary benchmarking by role and region.

### 3.3 Recruiter Journey (Status: 0% - Phase 2)

```
Register as Employer -> Create Company Profile -> Post Job
  -> Search Talent Pool -> Review Assessment Summaries
  -> Shortlist Candidates -> Track Pipeline
```

**Not yet implemented**. Database schema includes employer-related models (Job, JobApplication with employer fields) to support this journey in Phase 2.

### 3.4 Admin Journey (Status: 70% complete)

```
Login as Admin -> View Dashboard Metrics -> Manage Users
  -> Manage Frameworks -> Manage Questions -> Seed Question Bank
  -> Review Analytics
```

**Implemented**:
- Admin API endpoints: user listing (paginated, filterable), user role updates, analytics aggregation, question seeding.
- Admin UI stubs for all pages (dashboard, users, frameworks, questions, analytics).
- Admin dashboard shows metric cards (total users, assessments, frameworks, questions).
- Role-based access control enforced on all admin endpoints.

**Remaining**:
- Wire admin UI pages to real API endpoints.
- Framework CRUD management UI.
- Question management UI with bulk import.
- Analytics charts (user growth, assessment trends, domain distributions).
- Audit log viewer.

---

## 4. Features

### 4.1 MVP Features (Phase 1 - Current)

#### F-AUTH: Authentication & Onboarding
- **Registration**: Email, password (strength validation: 8+ chars, uppercase, lowercase, digit), name, role selection (Talent/Employer).
- **Email Verification**: Token-based, 24-hour expiry. Required before login.
- **Login**: JWT access token (15-minute TTL) + refresh token (7-day TTL, one-time-use rotation).
- **Password Reset**: Forgot-password with 1-hour token, anti-enumeration response.
- **Session Management**: Logout invalidates all user sessions. Refresh token rotation.
- **Route Protection**: Unauthenticated users redirected to `/login`. Authenticated users on auth pages redirected to `/dashboard`.

#### F-PROFILE: Profile Management
- **Profile CRUD**: Headline, bio, phone, location, LinkedIn URL, experience level, skills, certifications.
- **Domain Scores**: Per-domain scores updated after assessment completion.
- **Public Profile View**: Sanitized view (phone removed) for other users.
- **Experience Levels**: Entry (0-2 years), Mid (3-5 years), Senior (6-10 years), Principal (10+ years).

#### F-ASSESSMENT: AI Assessment System
- **Domain Selection**: Six GRC domains (Governance & Strategy, Risk Management, Compliance & Regulatory, Information Security, Audit & Assurance, Business Continuity).
- **Session Management**: 10 questions per assessment, 1-hour time limit, IN_PROGRESS/COMPLETED/EXPIRED statuses.
- **Answer Submission**: Per-question answer with correctness validation against stored correct answers.
- **Scoring Engine**: Percentage-based scoring. Tier assignment: Foundation (<50%), Developing (50-69%), Proficient (70-89%), Expert (90%+).
- **Profile Score Update**: Completed assessments update the user's domain score in their profile.
- **Assessment History**: Past assessments listed with scores, tiers, and completion dates.

#### F-CAREER: Career Simulator
- **Career Simulation**: Target role and level selection. Skill gap analysis. Time-to-target estimation based on level differential.
- **Simulation History**: List of past simulations with recommendations.
- **Learning Paths**: Domain-filtered learning paths with level progression.

#### F-JOBS: Job Board
- **Job Listings**: Paginated, filterable by domain, level, remote status, location.
- **Job Details**: Title, company, description, location, remote flag, salary range (QAR), required domains, required tier.
- **Job Application**: One application per user per job. Cover letter optional. Duplicate detection.
- **Application Tracking**: User's applications listed with job details.
- **Admin Job Management**: Create and update jobs (admin role required).

#### F-RESOURCES: Resource Hub
- **Browse Resources**: Paginated list with type, domain, level, and featured filters.
- **Resource Types**: Article, Video, Course, Whitepaper, Tool.
- **Bookmarks**: Authenticated users can bookmark/unbookmark resources. Bookmark list per user.
- **Resource Detail**: Full resource information with external URL link.

#### F-NOTIFICATIONS: Notification System
- **Notification List**: Paginated, chronologically ordered.
- **Mark Read**: Individual notification mark-as-read. Bulk mark-all-as-read.
- **Unread Count**: Real-time unread notification count for badge display.
- **Notification Types**: Assessment Complete, Tier Change, Job Match, Application Update, System.

#### F-ADMIN: Admin Panel
- **User Management API**: List users (paginated, role-filterable), update user roles, toggle email verification.
- **Analytics API**: Aggregate metrics by role, assessment status, and job status.
- **Question Seeding**: Bulk create sample questions for a given domain.
- **Question CRUD**: Full question lifecycle (create, read, update, soft-delete) with domain/difficulty/type filters.
- **Role Guard**: All admin endpoints require ADMIN role. Non-admin requests receive 403 Forbidden.

### 4.2 Phase 2 Features (Planned)

#### F-EMPLOYER: Employer Dashboard
- Employer registration and company profile.
- Candidate search by domain score, tier, and framework experience.
- Assessment summary view (no raw transcripts).
- Application management pipeline (review, shortlist, reject, hire).
- Employer analytics (hiring funnel, time-to-hire).

#### F-VOICE: Voice-Based Assessment
- LiveKit WebRTC audio streaming integration.
- OpenAI Whisper transcription.
- Audio waveform visualization during assessment.

#### F-AI-SCORING: AI-Powered Scoring
- RAG-based scoring against golden answers using embeddings.
- GPT-4o evaluation for depth, accuracy, and context.
- Stretch question detection for high performers (90%+ in a domain).

#### F-AI-COUNSELOR: AI Career Counselor
- Chat interface with senior GRC advisor persona.
- Certification ROI analysis.
- Salary benchmarking by role, region, and certification.
- Regional regulatory awareness (GDPR, CCPA, HIPAA, DORA, NIS2, AI Act).

#### F-CV-PARSER: CV Upload & AI Parsing
- PDF/DOCX upload (max 10MB).
- AI-powered data extraction (experience, certifications, skills, frameworks).
- Profile auto-population from parsed CV data.

### 4.3 Future Features (Phase 3+)

- **Vanguard Journey**: Top-tier professionals as community leaders and mentors.
- **Team Assessments**: Organization-level assessments and team analytics.
- **Custom Question Pools**: Employer-specific assessment customization.
- **SSO Integration**: Enterprise single sign-on.
- **API Access**: Public API for third-party integrations.
- **Mobile Application**: React Native app for assessments on the go.
- **Certification Verification**: Automated cert verification via provider APIs.
- **Community Forum**: Peer discussion and knowledge sharing.

---

## 5. Site Map

### 5.1 Public Pages (Route Group: `(public)/`)

| Route | Page | Purpose | Key Elements |
|-------|------|---------|--------------|
| `/` | Landing Page | Primary marketing page | Hero with CTA, 4 feature cards (Assessments, Career Simulator, Tiering, Resources), bottom CTA section |
| `/about` | About | Company mission and differentiators | Mission statement, 3 differentiators (GRC-Native, AI-Powered, Career Intelligence) |
| `/how-it-works` | How It Works | 4-step onboarding explanation | Numbered steps: Create Profile, Take Assessment, Get Tier, Plan Career |
| `/for-talents` | For Talents | Benefits for GRC professionals | Talent-specific value proposition and feature highlights |
| `/for-employers` | For Employers | Benefits for hiring organizations | Employer-specific value proposition, compliance value |
| `/pricing` | Pricing | Subscription tiers | 3-tier comparison: Free ($0), Professional ($29/mo), Enterprise (Custom) |
| `/contact` | Contact | Contact form | Email placeholder (hello@connectgrc.com), form coming soon |
| `/terms` | Terms of Service | Legal terms | Terms and conditions content |

### 5.2 Authentication Pages (Route Group: `(auth)/`)

| Route | Page | Purpose | Key Elements |
|-------|------|---------|--------------|
| `/login` | Login | User authentication | Email/password form, remember me, forgot password link, register link |
| `/register` | Register | New user registration | Name, email, role selector (Talent/Employer), password, confirm password, success screen with email verification prompt |
| `/verify-email` | Verify Email | Email token verification | Token processing from URL, success/error display |
| `/forgot-password` | Forgot Password | Password reset request | Email input form |
| `/reset-password` | Reset Password | New password entry | Token from URL, new password form with matching validation |

### 5.3 Authenticated App Pages (Route Group: `(app)/`)

| Route | Page | Purpose | Key Elements |
|-------|------|---------|--------------|
| `/dashboard` | Dashboard | User home after login | Highest tier card, assessments taken count, domain scores count, domain performance bar chart, getting started checklist |
| `/profile` | Profile | Professional profile management | Editable form: headline, experience level, bio, phone, location, LinkedIn, skills (comma-sep), certifications (comma-sep), save button |
| `/assessment` | Assessment Hub | Assessment domain selection | 6 domain cards with start buttons, past assessments list with scores/tiers |
| `/career` | Career Simulator | Career path exploration | Simulation form (target role + level), simulation results with recommendations, previous simulations list, learning paths grid |
| `/jobs` | Job Board | Job discovery and application | Domain and remote filters, job cards with requirements, quick apply button, applied state tracking |
| `/resources` | Resource Hub | GRC content library | Domain filter dropdown, resource cards with type/featured badges, bookmark toggle, external link |
| `/notifications` | Notifications | Activity notifications | Unread count, mark all as read, notification list with read/unread states, empty state |

### 5.4 Admin Pages (Route Group: `(admin)/`)

| Route | Page | Purpose | Key Elements |
|-------|------|---------|--------------|
| `/admin` | Admin Dashboard | Platform overview | 4 metric cards: total users, assessments completed, frameworks, questions |
| `/admin/users` | User Management | Account administration | User list stub (coming soon placeholder) |
| `/admin/frameworks` | Framework Management | GRC framework CRUD | Framework management stub (ISO 27001, NIST CSF, SOC 2 mentioned) |
| `/admin/questions` | Question Management | Assessment question CRUD | Question management stub (coming soon placeholder) |
| `/admin/analytics` | Analytics | Platform analytics | Analytics dashboard stub (user growth, assessment rates, domain distributions) |

### 5.5 System Pages

| Route | Page | Purpose | Key Elements |
|-------|------|---------|--------------|
| `*` (404) | Not Found | Invalid route handling | 404 heading, "Page Not Found" message, Go Home link |
| Error Boundary | Error | Runtime error recovery | Error icon, "Something went wrong" message, technical details in dev mode, Try Again button |

---

## 6. User Flows

### 6.1 Registration and Onboarding Flow

```
User Story: As a GRC Aspirant, I want to create an account and set up my profile
so that I can take assessments and track my professional growth.
```

1. User visits `/register`.
2. User fills in name, email, selects role (Talent or Employer), enters password and confirmation.
3. Client validates: passwords match, minimum 8 characters.
4. Server validates: email format, password strength (upper, lower, digit), email uniqueness.
5. Server creates user with `emailVerified=false`, generates 24-hour verification token.
6. Success screen displays with instruction to check email.
7. User clicks verification link, client POSTs token to `/api/v1/auth/verify-email`.
8. Server verifies token validity and expiry, sets `emailVerified=true`.
9. User redirected to `/login`, enters credentials.
10. Server verifies credentials and email verification status, issues JWT + refresh token.
11. User redirected to `/dashboard`.

### 6.2 Assessment Flow

```
User Story: As a GRC Professional, I want to take a domain-specific assessment
so that I can get an objective score and professional tier placement.
```

1. User navigates to `/assessment`.
2. System displays 6 domain cards with descriptions.
3. User clicks "Start Assessment" on chosen domain.
4. Server checks question availability (minimum 10 active questions in domain).
5. Server creates assessment session (status=IN_PROGRESS, 1-hour expiry).
6. Server creates placeholder answers for 10 selected questions.
7. User answers each question sequentially.
8. Each answer is validated against stored correct answer, scored 0 or 1.
9. User completes assessment; server calculates percentage score.
10. Server assigns tier: Foundation (<50%), Developing (50-69%), Proficient (70-89%), Expert (90%+).
11. Server updates domain score in user profile.
12. Results displayed with score and tier.

### 6.3 Career Simulation Flow

```
User Story: As a GRC Professional, I want to simulate career paths
so that I can understand the time and skills needed to reach my target role.
```

1. User navigates to `/career`.
2. User enters target role (e.g., "GRC Manager") and target level (Mid/Senior/Lead).
3. Server retrieves user profile and current domain scores.
4. Server generates skill gap analysis and recommendations.
5. Server calculates estimated months based on level differential (12 months per level).
6. Simulation saved to database and displayed to user.
7. User can view previous simulations and learning paths.

### 6.4 Job Application Flow

```
User Story: As a GRC Professional, I want to browse and apply to GRC jobs
so that I can advance my career with a role that matches my skills.
```

1. User navigates to `/jobs`.
2. System loads active jobs with domain and remote filters.
3. System loads user's existing applications to show applied state.
4. User browses jobs, each showing title, location, required domains, required tier, salary range.
5. User clicks "Quick Apply" on a matching job.
6. Server validates: job exists, job is active, user has not already applied.
7. Application created with PENDING status.
8. UI updates to show "Applied" state on the job card.

### 6.5 Admin User Management Flow

```
User Story: As a Platform Administrator, I want to manage user accounts
so that I can maintain platform integrity and assign appropriate roles.
```

1. Admin navigates to `/admin/users`.
2. System loads paginated user list with role filter.
3. Admin can update user roles (TALENT, EMPLOYER, ADMIN).
4. Admin can toggle email verification status.
5. All actions require ADMIN role (enforced server-side with 403 on violation).

---

## 7. Functional Requirements

### 7.1 Authentication (FR-AUTH)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-AUTH-01 | System shall accept registration with email, password, name, and role | Critical | Implemented |
| FR-AUTH-02 | System shall enforce password policy: minimum 8 characters, at least one uppercase, one lowercase, one digit | Critical | Implemented |
| FR-AUTH-03 | System shall reject duplicate email registrations with HTTP 409 | Critical | Implemented |
| FR-AUTH-04 | System shall send email verification token valid for 24 hours | Critical | Implemented (stub) |
| FR-AUTH-05 | System shall require email verification before allowing login | Critical | Implemented |
| FR-AUTH-06 | System shall issue JWT access tokens with 15-minute TTL | Critical | Implemented |
| FR-AUTH-07 | System shall issue refresh tokens with 7-day TTL and one-time-use rotation | Critical | Implemented |
| FR-AUTH-08 | System shall prevent email enumeration on forgot-password endpoint | High | Implemented |
| FR-AUTH-09 | System shall invalidate all user sessions on logout | High | Implemented |
| FR-AUTH-10 | System shall enforce rate limiting on authentication endpoints (100 req/min global) | High | Implemented |

### 7.2 Profile Management (FR-PROF)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-PROF-01 | System shall allow users to create and update their professional profile | Critical | Implemented |
| FR-PROF-02 | System shall support fields: headline (200 chars), bio (2000 chars), phone (50 chars), location (100 chars), LinkedIn URL | High | Implemented |
| FR-PROF-03 | System shall support experience levels: Entry, Mid, Senior, Principal | High | Implemented |
| FR-PROF-04 | System shall store skills and certifications as string arrays | High | Implemented |
| FR-PROF-05 | System shall provide a public profile view with phone number redacted | Normal | Implemented |
| FR-PROF-06 | System shall track domain scores per user per GRC domain | Critical | Implemented |
| FR-PROF-07 | System shall support CV URL storage | Normal | Implemented |

### 7.3 Assessment System (FR-ASMT)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-ASMT-01 | System shall support assessments across 6 GRC domains | Critical | Implemented |
| FR-ASMT-02 | System shall require a minimum of 10 active questions per domain to start an assessment | Critical | Implemented |
| FR-ASMT-03 | System shall create assessment sessions with 1-hour expiry | Critical | Implemented |
| FR-ASMT-04 | System shall support answer submission with correctness validation | Critical | Implemented |
| FR-ASMT-05 | System shall calculate percentage score and assign professional tier | Critical | Implemented |
| FR-ASMT-06 | System shall update user domain scores upon assessment completion | Critical | Implemented |
| FR-ASMT-07 | System shall enforce assessment ownership (user can only access own assessments) | Critical | Implemented |
| FR-ASMT-08 | System shall prevent answer submission to non-in-progress assessments | High | Implemented |
| FR-ASMT-09 | System shall support question types: Multiple Choice, Scenario-Based, True/False | High | Implemented (schema) |
| FR-ASMT-10 | System shall support question difficulties: Beginner, Intermediate, Advanced, Expert | High | Implemented (schema) |

### 7.4 Career Simulator (FR-CAREER)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-CAREER-01 | System shall accept target role and target level for career simulation | High | Implemented |
| FR-CAREER-02 | System shall generate skill gap analysis based on current profile | High | Implemented (stub) |
| FR-CAREER-03 | System shall estimate months to target based on level differential | High | Implemented |
| FR-CAREER-04 | System shall store simulation history per user | High | Implemented |
| FR-CAREER-05 | System shall provide domain-filtered learning paths | Normal | Implemented |

### 7.5 Job Board (FR-JOBS)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-JOBS-01 | System shall list active jobs with pagination | High | Implemented |
| FR-JOBS-02 | System shall support filtering by domain, level, remote status, location | High | Implemented |
| FR-JOBS-03 | System shall display job details including salary range, required domains, required tier | High | Implemented |
| FR-JOBS-04 | System shall allow authenticated TALENT users to apply to active jobs | High | Implemented |
| FR-JOBS-05 | System shall prevent duplicate applications to the same job | High | Implemented |
| FR-JOBS-06 | System shall allow ADMIN users to create and update jobs | High | Implemented |
| FR-JOBS-07 | System shall track application status (Pending, Reviewed, Shortlisted, Rejected, Hired) | Normal | Implemented (schema) |

### 7.6 Resource Hub (FR-RES)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-RES-01 | System shall list resources with pagination and filters (type, domain, level, featured) | Normal | Implemented |
| FR-RES-02 | System shall support resource types: Article, Video, Course, Whitepaper, Tool | Normal | Implemented |
| FR-RES-03 | System shall allow authenticated users to bookmark and unbookmark resources | Normal | Implemented |
| FR-RES-04 | System shall provide per-user bookmark listing | Normal | Implemented |
| FR-RES-05 | System shall display resource detail with external URL | Normal | Implemented |

### 7.7 Notification System (FR-NOTIF)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-NOTIF-01 | System shall list user notifications with pagination | Normal | Implemented |
| FR-NOTIF-02 | System shall support marking individual notifications as read | Normal | Implemented |
| FR-NOTIF-03 | System shall support marking all notifications as read | Normal | Implemented |
| FR-NOTIF-04 | System shall provide real-time unread notification count | Normal | Implemented |
| FR-NOTIF-05 | System shall support notification types: Assessment Complete, Tier Change, Job Match, Application Update, System | Normal | Implemented (schema) |

### 7.8 Admin Panel (FR-ADMIN)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-ADMIN-01 | System shall restrict all admin endpoints to users with ADMIN role | Critical | Implemented |
| FR-ADMIN-02 | System shall provide paginated, filterable user listing | High | Implemented |
| FR-ADMIN-03 | System shall allow role updates and email verification toggling | High | Implemented |
| FR-ADMIN-04 | System shall provide aggregate analytics (users by role, assessments by status, jobs by status) | High | Implemented |
| FR-ADMIN-05 | System shall support bulk question seeding by domain | High | Implemented |
| FR-ADMIN-06 | System shall support full question CRUD with domain, difficulty, and type filters | High | Implemented |
| FR-ADMIN-07 | System shall support question soft-delete (deactivation) | Normal | Implemented |

---

## 8. Non-Functional Requirements

### 8.1 Performance (NFR-PERF)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-01 | API response time (p95) | < 200ms |
| NFR-PERF-02 | Frontend first contentful paint | < 1.5s |
| NFR-PERF-03 | Lighthouse score (all categories) | 90+ |
| NFR-PERF-04 | First load JS bundle size | < 500KB |
| NFR-PERF-05 | Database query time (p95) | < 50ms |
| NFR-PERF-06 | Concurrent users supported | 500+ simultaneous |

### 8.2 Security (NFR-SEC)

| ID | Requirement | Implementation |
|----|-------------|---------------|
| NFR-SEC-01 | Password hashing | bcrypt with cost factor 12 |
| NFR-SEC-02 | Token storage | Access tokens in memory (TokenManager), never localStorage. Refresh tokens in localStorage for persistence. |
| NFR-SEC-03 | SQL injection prevention | Prisma parameterized queries (no raw SQL in application code) |
| NFR-SEC-04 | XSS prevention | React's built-in escaping; no dangerouslySetInnerHTML |
| NFR-SEC-05 | CORS policy | Strict origin allowlist (frontend URL only, configurable via ALLOWED_ORIGINS) |
| NFR-SEC-06 | Rate limiting | Redis-backed rate limiting, 100 requests per 60 seconds per IP, health endpoint exempt |
| NFR-SEC-07 | Input validation | Zod schemas on all request bodies and query parameters |
| NFR-SEC-08 | Data isolation | All queries scoped to authenticated user via repository pattern |
| NFR-SEC-09 | Audit trail | AuditLog model tracks actor, action, resource, IP, user agent, timestamp |
| NFR-SEC-10 | Email enumeration protection | Forgot-password always returns success regardless of email existence |
| NFR-SEC-11 | JWT algorithm | HS256 with minimum 32-character secret |
| NFR-SEC-12 | Refresh token rotation | One-time use; old session deleted before new one created |

### 8.3 Reliability (NFR-REL)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-REL-01 | Uptime | 99.5% (development), 99.9% (production target) |
| NFR-REL-02 | Redis degradation | Graceful fallback when Redis is unavailable |
| NFR-REL-03 | Health check | `/api/v1/health` returns database status, uptime, version |
| NFR-REL-04 | Error handling | Global error handler with structured error responses, no stack traces in production |

### 8.4 Scalability (NFR-SCALE)

| ID | Requirement | Approach |
|----|-------------|----------|
| NFR-SCALE-01 | Database connection pooling | Configurable pool size (default 10, timeout 30s) |
| NFR-SCALE-02 | Pagination | Cursor-based and offset-based pagination on all list endpoints |
| NFR-SCALE-03 | Database indexing | Indexes on all foreign keys, frequently filtered columns, and sort columns |
| NFR-SCALE-04 | Stateless API | JWT-based auth enables horizontal scaling without session affinity |

### 8.5 Accessibility (NFR-A11Y)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-A11Y-01 | WCAG compliance | WCAG 2.1 AA |
| NFR-A11Y-02 | Form labels | All form inputs have associated labels |
| NFR-A11Y-03 | Error announcements | Error messages use `role="alert"` |
| NFR-A11Y-04 | Keyboard navigation | All interactive elements keyboard-accessible |
| NFR-A11Y-05 | Color contrast | Minimum 4.5:1 ratio for text |

### 8.6 Compliance (NFR-COMP)

| ID | Requirement | Notes |
|----|-------------|-------|
| NFR-COMP-01 | Data privacy | No PII in logs; sensitive fields redacted from public views |
| NFR-COMP-02 | Terms of service | ToS page required before account creation |
| NFR-COMP-03 | Data retention | Audit logs retained indefinitely; user data deletable on request |
| NFR-COMP-04 | Cookie policy | Minimal cookie usage; refresh token in localStorage with secure practices |

---

## 9. Acceptance Criteria

### 9.1 Authentication

```gherkin
Given a new user with a valid email and strong password
When they submit the registration form
Then the system creates the account with emailVerified=false
And returns HTTP 201 with user details (id, email, name, role)
And generates a verification token valid for 24 hours

Given a user whose email has not been verified
When they attempt to log in with correct credentials
Then the system returns HTTP 401 with message "Please verify your email before logging in"

Given a user with verified email and correct credentials
When they submit the login form
Then the system returns HTTP 200 with accessToken (15-min TTL), refreshToken (7-day TTL), and user object
And the client stores the access token in memory via TokenManager

Given an authenticated user
When they call the logout endpoint
Then all sessions for that user are deleted from the database
And the client clears all stored tokens

Given an existing email address
When another user tries to register with the same email
Then the system returns HTTP 409 with code "CONFLICT"
```

### 9.2 Assessment

```gherkin
Given an authenticated user selecting a GRC domain with at least 10 active questions
When they start an assessment
Then the system creates a session with status IN_PROGRESS and 1-hour expiry
And returns the assessment with 10 questions

Given an in-progress assessment
When the user submits an answer for a question
Then the system validates the answer against the stored correct answer
And records isCorrect and score (0 or 1)

Given an in-progress assessment where all answers have been submitted
When the user completes the assessment
Then the system calculates the percentage score
And assigns a professional tier (Foundation/Developing/Proficient/Expert)
And updates the user's domain score in their profile
And sets the assessment status to COMPLETED

Given a user trying to access another user's assessment
When they request the assessment by ID
Then the system returns HTTP 403 "Not authorized to access this assessment"
```

### 9.3 Job Application

```gherkin
Given an authenticated TALENT user and an active job listing
When they click Quick Apply
Then the system creates a job application with PENDING status
And the UI updates to show "Applied" on the job card

Given a user who has already applied to a job
When they try to apply again
Then the system returns HTTP 409 "Already applied to this job"

Given a non-active job listing
When a user attempts to apply
Then the system returns HTTP 400 "Job is not active"
```

### 9.4 Admin

```gherkin
Given a user with TALENT role
When they attempt to access any admin endpoint
Then the system returns HTTP 403

Given an ADMIN user
When they request the user list with role filter "TALENT"
Then the system returns a paginated list of users with TALENT role
And each user includes id, email, name, role, emailVerified, createdAt, updatedAt

Given an ADMIN user requesting platform analytics
Then the system returns aggregated counts: users by role, assessments by status, jobs by status
```

---

## 10. Phase Roadmap

### Phase 1: Foundation + Core Features (Current - ~40% complete)

| Sprint | Feature | Story Points | Status |
|--------|---------|-------------|--------|
| Sprint 0 | Product Definition & Architecture | 21 | Complete |
| Sprint 1 | Platform Foundation (Backend, Frontend, DevOps) | 29 | In Progress (85%) |
| Sprint 2 | Authentication & Onboarding | 37 | Complete (API), In Progress (E2E) |
| Sprint 3 | Profile Management | 26 | Complete (API + basic UI) |
| Sprint 4 | AI Assessment System | 47 | Complete (basic scoring) |
| Sprint 5 | Career Simulator + Public Pages | 42 | Complete (basic simulation + all public pages) |
| Sprint 6 | Admin Dashboard | 39 | Complete (API), Stubbed (UI) |
| Sprint 7 | Resource Hub | 19 | Complete (API + UI) |
| Sprint 8 | Notification System | 16 | Complete (API + UI) |
| Sprint 9 | Polish, Security & Performance | 21 | Not Started |

**Total Story Points**: 297
**Completed**: ~180 pts
**Remaining**: ~117 pts

### Phase 2: Employer Features + AI Integration (Target: Month 3-5)

- Employer registration and dashboard.
- Candidate search and talent pool.
- Assessment summary views for employers.
- LiveKit voice assessment integration.
- OpenAI GPT-4o scoring (RAG pipeline).
- AI career counselor chat.
- CV upload and AI parsing.
- Advanced assessment with adaptive difficulty.
- Radar chart domain visualization.

### Phase 3: Scale + Ecosystem (Target: Month 6-9)

- Vanguard community features.
- Team and organization assessments.
- Custom question pools for enterprises.
- SSO integration.
- Public API.
- Mobile application.
- Certification verification.
- Community forum.

---

## 11. Out of Scope

The following items are explicitly **not** included in Phase 1:

| Item | Reason |
|------|--------|
| Voice-based assessment input | Requires LiveKit integration; currently text-based with stub |
| AI-powered scoring (RAG) | Requires OpenAI API integration; currently uses simple correctness check |
| AI career counselor chat | Requires OpenAI API; career simulation uses deterministic logic |
| CV parsing and auto-population | Requires AI/NLP service; profile is manual entry |
| Employer/Recruiter dashboard | Phase 2 feature; database schema pre-supports it |
| Payment processing | Pricing page exists but no payment gateway integration |
| Email delivery | Verification and reset tokens are created but email sending is stubbed (console only) |
| Mobile application | Web-first; mobile planned for Phase 3 |
| SSO / OAuth | Standard email/password only in Phase 1 |
| Multi-language support | English only in Phase 1 |
| Real-time notifications (WebSocket) | Polling-based in Phase 1; WebSocket planned for Phase 2 |
| File storage (S3) | CV URL stored as string; actual file upload deferred |
| Advanced analytics with charts | Admin analytics returns raw data; chart rendering is stubbed |

---

## 12. Risks

### 12.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI scoring accuracy when transitioning from stub to real GPT-4o | Medium | High | Extensive golden answer curation; A/B testing stub vs AI scores before switchover |
| LiveKit voice integration complexity | Medium | Medium | Stub pattern allows frontend development independent of LiveKit; audio waveform placeholder already in UI |
| Database performance under concurrent assessment sessions | Low | High | Connection pooling configured; indexes on all query-heavy columns; cursor-based pagination |
| JWT token management edge cases (race conditions on refresh) | Medium | Medium | One-time-use refresh tokens with session deletion before creation; TokenManager singleton pattern |
| Question bank quality across all 6 domains | High | High | Admin seeding tools built; question CRUD API complete; phased content creation with domain experts |

### 12.2 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low initial adoption by GRC professionals | Medium | High | Free tier with full assessment access; content marketing via resource hub; industry partnerships |
| Employer feature delay impacts revenue timeline | Medium | High | Phase 2 employer features have database schema pre-built; reduced migration risk |
| Competition from generic assessment platforms adding GRC content | Low | Medium | Deep GRC domain specialization across 6 domains; AI-native scoring; career simulation unique to GRC |
| Pricing model resistance ($29/mo for Professional) | Medium | Medium | Free tier provides meaningful value; Professional ROI demonstrated through career outcomes |

### 12.3 User Adoption Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Assessment fatigue (25 questions too long for voice) | Medium | Medium | Phase 1 is text-based (10 questions); voice assessment introduced gradually in Phase 2 |
| Professionals skeptical of AI-scored assessments | High | High | Transparent scoring methodology; golden answer comparison visible to user; continuous calibration |
| Recruiters prefer established platforms (LinkedIn, Indeed) | High | Medium | Unique value prop: pre-assessed candidates with verified domain scores; integrates with rather than replaces existing workflows |
| Low completion rate on profile setup | Medium | Medium | Progressive profile completion; profile completion percentage indicator; minimum profile not required for assessment |

---

## 13. Success Metrics

### 13.1 Platform Health

| Metric | Target (3 months) | Target (6 months) |
|--------|-------------------|-------------------|
| Registered users | 500 | 2,000 |
| Monthly active users | 200 | 800 |
| Assessment completion rate | 70% (of started) | 80% |
| Profile completion rate | 50% (of registered) | 65% |
| Average assessment score | Tracked (no target) | Tracked (no target) |

### 13.2 Engagement

| Metric | Target (3 months) | Target (6 months) |
|--------|-------------------|-------------------|
| Assessments per user per quarter | 1.5 | 2.0 |
| Career simulations per user | 2.0 | 3.0 |
| Resource bookmarks per user | 5 | 10 |
| Job applications per user | 1.0 | 3.0 |
| Session duration (average) | 8 minutes | 12 minutes |

### 13.3 Quality

| Metric | Target |
|--------|--------|
| Test pass rate | 100% (706/706 currently) |
| API uptime | 99.5%+ |
| Error rate (5xx responses) | < 0.1% |
| Lighthouse score | 90+ all categories |
| Security vulnerabilities (critical) | 0 |

### 13.4 Technical Debt

| Metric | Target |
|--------|--------|
| Test coverage | 80%+ |
| Admin UI pages wired to API | 100% by Sprint 9 |
| Feature flag stubs replaced with real implementations | 50% by Phase 2 start |
| E2E test coverage of critical flows | 100% by Sprint 9 |

---

## Appendix A: Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20+ |
| Language | TypeScript | 5+ |
| Backend Framework | Fastify | Latest |
| Frontend Framework | Next.js (App Router) | 14+ |
| UI Library | React | 18+ |
| Styling | Tailwind CSS | Latest |
| Database | PostgreSQL | 15+ |
| ORM | Prisma | Latest |
| Cache / Rate Limiting | Redis | 7+ |
| Authentication | JWT (HS256) | -- |
| Validation | Zod | Latest |
| Testing (Unit/Integration) | Jest + React Testing Library | Latest |
| Testing (E2E) | Playwright | Latest |
| CI/CD | GitHub Actions | -- |
| Containerization | Docker + docker-compose | -- |

## Appendix B: Port Assignments

| Service | Port |
|---------|------|
| Frontend (Next.js dev server) | 3110 |
| Backend (Fastify API) | 5006 |
| PostgreSQL (Docker) | 5433 (mapped to 5432 internal) |
| Redis (Docker) | 6380 (mapped to 6379 internal) |

## Appendix C: API Endpoint Registry

All endpoints are prefixed with `/api/v1/`.

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/health` | No | -- | Health check with DB status and uptime |
| POST | `/auth/register` | No | -- | User registration |
| POST | `/auth/login` | No | -- | User login, returns JWT + refresh token |
| POST | `/auth/refresh` | No | -- | Refresh access token (requires refresh token in body) |
| DELETE | `/auth/logout` | Yes | Any | Invalidate all user sessions |
| POST | `/auth/verify-email` | No | -- | Verify email with token |
| POST | `/auth/forgot-password` | No | -- | Request password reset email |
| POST | `/auth/reset-password` | No | -- | Reset password with token |
| GET | `/profile` | Yes | Any | Get current user profile |
| PUT | `/profile` | Yes | Any | Create or update profile |
| GET | `/profile/:userId` | No | -- | Get public profile view |
| GET | `/profile/domain-scores` | Yes | Any | Get user's domain scores |
| GET | `/assessments` | Yes | Any | List user's assessments |
| POST | `/assessments` | Yes | Any | Start new assessment (requires domain) |
| GET | `/assessments/:id` | Yes | Owner | Get assessment with questions and answers |
| POST | `/assessments/:id/answers` | Yes | Owner | Submit answer for a question |
| POST | `/assessments/:id/complete` | Yes | Owner | Complete assessment, trigger scoring |
| GET | `/questions` | Yes | Admin | List questions with filters |
| POST | `/questions` | Yes | Admin | Create question |
| PUT | `/questions/:id` | Yes | Admin | Update question |
| DELETE | `/questions/:id` | Yes | Admin | Soft-delete question |
| GET | `/jobs` | No | -- | List active jobs with filters |
| GET | `/jobs/:id` | No | -- | Get job details |
| POST | `/jobs` | Yes | Admin | Create job |
| PUT | `/jobs/:id` | Yes | Admin | Update job |
| POST | `/jobs/:id/apply` | Yes | Talent | Apply to job |
| GET | `/jobs/applications` | Yes | Any | List user's applications |
| POST | `/career/simulate` | Yes | Any | Run career simulation |
| GET | `/career/simulations` | Yes | Any | List user's simulations |
| GET | `/career/learning-paths` | No | -- | List learning paths with filters |
| GET | `/resources` | No | -- | List resources with filters |
| GET | `/resources/:id` | No | -- | Get resource details |
| POST | `/resources/:id/bookmark` | Yes | Any | Bookmark resource |
| DELETE | `/resources/:id/bookmark` | Yes | Any | Remove bookmark |
| GET | `/resources/bookmarks` | Yes | Any | List user's bookmarks |
| GET | `/notifications` | Yes | Any | List user notifications |
| PATCH | `/notifications/:id/read` | Yes | Owner | Mark notification as read |
| POST | `/notifications/read-all` | Yes | Any | Mark all notifications as read |
| GET | `/notifications/unread-count` | Yes | Any | Get unread count |
| GET | `/admin/users` | Yes | Admin | List all users (paginated, filterable) |
| PATCH | `/admin/users/:id` | Yes | Admin | Update user (role, verification) |
| GET | `/admin/analytics` | Yes | Admin | Platform analytics |
| POST | `/admin/seed-questions` | Yes | Admin | Seed sample questions for a domain |

## Appendix D: Database Schema Summary

**18 models** defined in Prisma schema:

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| User | Core user account | Has Profile, Assessments, CareerSimulations, JobApplications, Bookmarks, Notifications |
| ApiKey | API authentication keys | Belongs to User |
| Session | Auth sessions with JWT + refresh tokens | Belongs to User |
| AuditLog | Security and action audit trail | Standalone (references actor by string) |
| EmailVerification | Email verification tokens (24h expiry) | Standalone (references email) |
| PasswordReset | Password reset tokens (1h expiry) | Standalone (references email) |
| Profile | Professional profile | Belongs to User; has DomainScores |
| DomainScore | Per-domain assessment scores | Belongs to Profile; unique per profile+domain |
| Question | Assessment questions | Has AssessmentAnswers |
| Assessment | Assessment sessions | Belongs to User; has AssessmentAnswers |
| AssessmentAnswer | Per-question answers | Belongs to Assessment and Question |
| CareerSimulation | Career path simulations | Belongs to User |
| LearningPath | Guided learning curricula | Standalone |
| Job | Job postings | Has JobApplications |
| JobApplication | User job applications | Belongs to Job and User |
| Resource | GRC learning resources | Has Bookmarks |
| Bookmark | User resource bookmarks | Belongs to User and Resource |
| Notification | In-app notifications | Belongs to User |
