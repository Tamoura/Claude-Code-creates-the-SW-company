# Feature Specification: ConnectIn — Core Features

**Product**: connectin
**Feature Branch**: `feature/connectin/core-mvp`
**Created**: 2026-02-21
**Status**: Accepted
**Version**: 1.0

## Business Context

### Problem Statement

300M+ Arabic speakers worldwide lack a professional networking platform built for them. LinkedIn's Arabic support is bolted on — RTL is poorly implemented, Arabic content discovery is broken, and AI features don't understand Arabic professional context. Arab tech professionals, founders, and recruiters need a platform that is fundamentally Arabic-first and AI-native.

### Target Users

| Persona | Role | Pain Point | Expected Outcome |
|---------|------|-----------|-----------------|
| Ahmed (Arab Tech Pro) | Software engineer, 28, Riyadh | LinkedIn feels foreign; Arabic posts get buried in English feed | A professional network where Arabic is the default, not an afterthought |
| Sophia (Global Professional) | Product manager, 32, Berlin | Wants to connect with MENA talent but language is a barrier | Bilingual platform where she can discover and connect with Arab professionals |
| Khalid (MENA Recruiter) | Talent acquisition, 40, Dubai | No GRC/tech-specific talent marketplace for the region | Verified professional profiles with skills and certifications |
| Layla (Content Creator) | Thought leader, 35, Cairo | Arabic content gets less engagement than English on LinkedIn | Platform that prioritises Arabic content and recommends to the right audience |

### Business Value

- **Revenue Impact**: Freemium model with premium ($15/mo professionals, $99/mo recruiters)
- **User Retention**: Network effects — connections and content create switching cost
- **Competitive Position**: Only Arabic-first professional networking platform. No direct competitor
- **Strategic Alignment**: 300M Arabic speakers, young demographic, growing tech scene in MENA

## User Scenarios & Testing

### User Story 1 — Registration & Profile Setup (Priority: P1)

**As a** Arab tech professional, **I want to** register and create a bilingual professional profile (Arabic and English), **so that** I can present myself to both Arabic-speaking and international connections.

**Acceptance Criteria**:

1. **Given** a new user visits /register, **When** they complete registration (email or OAuth), **Then** their account is created and a verification email is sent
2. **Given** a verified user, **When** they create their profile with headline, summary, experience (in both Arabic and English), **Then** their profile completeness score is calculated and displayed
3. **Given** a completed profile, **When** another user views it, **Then** the profile is displayed in the viewer's preferred language with a toggle to switch

### User Story 2 — Professional Connections (Priority: P1)

**As a** professional in the MENA tech ecosystem, **I want to** send and manage connection requests, **so that** I can build my professional network within the Arab tech community.

**Acceptance Criteria**:

1. **Given** a user views another profile, **When** they click "Connect", **Then** a connection request is sent and the recipient is notified
2. **Given** a pending connection request, **When** the recipient accepts, **Then** both users appear in each other's connections list and can see shared connections
3. **Given** a connection, **When** either user views the other's profile, **Then** mutual connections are displayed and messaging is unlocked

### User Story 3 — Content Feed & Posts (Priority: P1)

**As a** Arab professional, **I want to** create and consume bilingual content in a feed that prioritises Arabic posts, **so that** I can share knowledge and engage with my professional community.

**Acceptance Criteria**:

1. **Given** a user opens the feed, **When** the page loads, **Then** posts from connections are displayed in reverse chronological order with infinite scroll
2. **Given** a user creates a post (Arabic, English, or both), **When** they publish it, **Then** the post appears in their connections' feeds with proper RTL/LTR rendering
3. **Given** a post in the feed, **When** a user likes, comments, or shares, **Then** the engagement is recorded and the post author is notified

### User Story 4 — Job Board (Priority: P2)

**As a** MENA-based recruiter, **I want to** post job listings and search professional profiles, **so that** I can find verified Arab tech talent for my organisation.

**Acceptance Criteria**:

1. **Given** a recruiter creates a job listing, **When** they define requirements (skills, certifications, location, language), **Then** the listing is published and searchable by professionals
2. **Given** a professional searches for jobs, **When** they filter by location, industry, and language, **Then** matching jobs are displayed with relevance ranking
3. **Given** a professional applies to a job, **When** the recruiter views applications, **Then** they see the applicant's profile with skills, experience, and a recruiter-specific shortlist

### User Story 5 — Real-Time Messaging (Priority: P2)

**As a** connected professional, **I want to** send direct messages to my connections with real-time delivery, **so that** I can have private professional conversations without leaving the platform.

**Acceptance Criteria**:

1. **Given** two connected users, **When** one sends a message, **Then** the recipient sees it in real-time via WebSocket without page refresh
2. **Given** a conversation thread, **When** the recipient reads messages, **Then** read receipts are shown to the sender
3. **Given** a user is offline, **When** they receive messages, **Then** they are stored and delivered when the user returns, with an unread count badge

### User Story 6 — AI Profile Optimiser (Priority: P2)

**As a** professional creating their profile, **I want to** receive AI-powered suggestions for my headline and summary in both Arabic and English, **so that** my profile is professionally compelling and discoverable.

**Acceptance Criteria**:

1. **Given** a user's profile data (experience, skills, education), **When** they click "Optimise with AI", **Then** the system generates 3 headline suggestions and a summary draft in their preferred language
2. **Given** an AI-generated suggestion, **When** the user selects it, **Then** the text is applied to their profile and can be further edited
3. **Given** a profile in one language, **When** the user requests translation, **Then** the AI generates a professionally-toned translation preserving cultural nuance
