# Feature Specification: LinkedIn Agent — Core Features

**Product**: linkedin-agent
**Feature Branch**: `feature/linkedin-agent/core-mvp`
**Created**: 2026-02-21
**Status**: Accepted
**Version**: 1.0

## Business Context

### Problem Statement

Arab tech professionals, founders, and thought leaders spend 2-4 hours per week crafting LinkedIn posts — the primary channel for professional visibility in the MENA region. Creating bilingual content (Arabic + English) doubles the effort. No tool exists that understands Arabic professional tone, suggests optimal formats (text vs carousel vs infographic), and routes AI generation through the best model for each task.

### Target Users

| Persona | Role | Pain Point | Expected Outcome |
|---------|------|-----------|-----------------|
| Ahmed (Tech Founder) | Startup CEO, 34, Riyadh | Spends 3hrs/week on LinkedIn; Arabic posts get less engagement | Generate professional Arabic posts in minutes with AI-optimised format |
| Nora (Content Creator) | GRC thought leader, 38, Dubai | Can't produce carousel graphics without a designer | AI-generated carousel slides with image prompts ready for design tools |
| Omar (Engineer) | Senior developer, 28, Cairo | Wants to build personal brand but doesn't know what to write about | Trend analysis that surfaces angles and talking points from industry news |
| Fatima (Recruiter) | Talent acquisition, 42, Jeddah | Needs to post job-related content regularly to attract candidates | Consistent content calendar with auto-scheduled posts |

### Business Value

- **Revenue Impact**: SaaS subscription — Free (3 posts/mo), Pro ($19/mo unlimited), Team ($49/mo)
- **User Retention**: Content history and trend data build value over time
- **Competitive Position**: Only AI content tool built for Arabic professional context with multi-model routing
- **Strategic Alignment**: LinkedIn content is the gateway to ConnectIn user acquisition

## User Scenarios & Testing

### User Story 1 — Trend Analysis (Priority: P1)

**As a** tech professional, **I want to** paste an article or industry news and get AI-powered analysis of trending topics and content angles, **so that** I can create timely, relevant posts that resonate with my audience.

**Acceptance Criteria**:

1. **Given** a user pastes content (article, news, blog post), **When** they click "Analyse", **Then** the AI identifies 3-5 trending topics with relevance scores, suggested angles, and recommended hashtags
2. **Given** analysis results, **When** the user selects a topic, **Then** they can proceed to generate a post based on that topic with the suggested angle pre-filled
3. **Given** a completed analysis, **When** the system logs the request, **Then** the AI model used, tokens consumed, and cost are recorded in the generation log

### User Story 2 — AI Post Generation (Priority: P1)

**As a** Arab professional, **I want to** generate LinkedIn posts in Arabic, English, or both with AI-recommended formats, **so that** I can publish high-quality bilingual content in minutes instead of hours.

**Acceptance Criteria**:

1. **Given** a user provides a topic and selects a tone (professional/conversational/educational/provocative), **When** they click "Generate", **Then** the AI produces a post with format recommendation (text/carousel/infographic/poll) and reasoning
2. **Given** a generated post, **When** the user reviews it, **Then** both Arabic and English versions are available with culturally appropriate tone and professional vocabulary
3. **Given** the user wants a different format, **When** they select an alternative, **Then** the post is regenerated optimised for that format

### User Story 3 — Post Management (Priority: P1)

**As a** content creator, **I want to** manage my post drafts with status tracking (draft → review → approved → published), **so that** I can maintain an organised content pipeline.

**Acceptance Criteria**:

1. **Given** generated posts, **When** the user views the posts list, **Then** all drafts are displayed with status badges, format icons, and creation date, filterable by status and format
2. **Given** a post draft, **When** the user edits the content, tags, or tone, **Then** changes are saved and the last-modified timestamp updates
3. **Given** a post is approved, **When** the user marks it as published, **Then** the publish date is recorded and it moves to the published section

### User Story 4 — Carousel Generation (Priority: P2)

**As a** thought leader, **I want to** generate carousel slides with headlines, body text, and image prompts, **so that** I can create visual LinkedIn content without hiring a graphic designer.

**Acceptance Criteria**:

1. **Given** a text post, **When** the user clicks "Generate Carousel", **Then** 4-12 slides are generated with headline, body text, and AI-generated image prompt for each slide
2. **Given** carousel slides, **When** the user previews them, **Then** a swipeable carousel preview shows each slide with layout positioning
3. **Given** a carousel slide, **When** the user edits the headline or body, **Then** changes are saved per-slide without regenerating other slides

### User Story 5 — LinkedIn Publishing (Priority: P3)

**As a** professional who posts regularly, **I want to** connect my LinkedIn account and publish posts directly from the app, **so that** I can streamline my content workflow without copy-pasting.

**Acceptance Criteria**:

1. **Given** a user connects their LinkedIn via OAuth, **When** the connection is established, **Then** their LinkedIn profile name is displayed and publishing is enabled
2. **Given** an approved post, **When** the user clicks "Publish to LinkedIn", **Then** the post is published to their LinkedIn feed and the post status updates to "published"
3. **Given** a published post, **When** LinkedIn engagement data is available, **Then** impressions, likes, comments, and shares are displayed on the post detail page
