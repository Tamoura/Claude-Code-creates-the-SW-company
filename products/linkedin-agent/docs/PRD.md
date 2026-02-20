# LinkedIn Agent - Product Requirements Document

**Version**: 1.0
**Last Updated**: 2026-02-15
**Status**: Draft
**Product Owner**: ConnectSW

---

## 1. Vision

LinkedIn Agent is an AI-powered content assistant that helps Arab tech professionals build and maintain a strong LinkedIn presence. It analyzes industry trends, generates engagement-optimized posts in Arabic and English, and recommends the best content format for each topic.

The core insight is that Arabic-speaking tech professionals -- founders, engineers, AI researchers, and thought leaders -- are underserved by existing AI writing tools. Most tools produce generic English content that doesn't resonate with Arabic-speaking audiences and doesn't account for the cultural nuances, reading patterns, and engagement behaviors specific to Arabic LinkedIn users.

## 2. Problem Statement

### The Pain Points

1. **Time-consuming content creation**: Writing consistent, high-quality LinkedIn posts takes 30-60 minutes per post. Professionals who want to post 3-5 times per week spend 3-5 hours on content creation alone.

2. **Arabic AI support is poor**: Most AI writing tools (ChatGPT, Jasper, Copy.ai) produce stilted, formal Arabic that reads like machine translation. They lack understanding of modern Arabic tech terminology and the informal-yet-professional tone that performs well on LinkedIn.

3. **Format selection is guesswork**: LinkedIn supports multiple content formats (text posts, carousels, polls, articles, infographics) but most professionals default to text-only posts. They lack data on which format works best for which type of content.

4. **Trend awareness requires effort**: Staying current with AI/tech trends requires reading multiple sources daily. Translating trend awareness into timely LinkedIn content adds another layer of effort.

5. **Bilingual content doubles the work**: Professionals who want to reach both Arabic and English audiences must effectively create each post twice, maintaining tone and quality in both languages.

### Who Suffers Most

- Tech founders building personal brands in the Arab world
- AI/ML engineers sharing technical insights in Arabic
- Tech thought leaders and consultants
- Startup ecosystem participants (investors, accelerator leads)
- Arabic tech educators and content creators

## 3. Target Users

### Primary Persona: The Arab Tech Professional

- **Demographics**: 25-45 years old, based in GCC/MENA region or diaspora
- **Role**: Engineer, founder, product manager, or consultant in tech/AI
- **LinkedIn behavior**: Wants to post 3-5 times per week but manages 1-2
- **Language**: Fluent in Arabic, proficient in English, prefers Arabic for LinkedIn
- **Pain**: Spends too long writing posts, struggles with consistent output
- **Goal**: Build thought leadership, grow network, attract opportunities

### Secondary Persona: The Bilingual Content Creator

- **Demographics**: 28-40 years old, active on LinkedIn
- **Role**: Tech educator, course creator, community builder
- **LinkedIn behavior**: Posts daily, creates carousels and infographics
- **Language**: Creates content in both Arabic and English
- **Pain**: Doubling effort for bilingual content, format experimentation
- **Goal**: Maximize reach across Arabic and English audiences

## 4. Core Features

### 4.1 Trend Analysis (Phase 1)

**Description**: Users paste articles, tweets, LinkedIn posts, or any text content. The AI extracts trending topics, identifies key angles, and surfaces insights worth discussing.

**User Flow**:
1. User pastes one or more URLs or text snippets
2. System analyzes content for trending topics, key claims, and discussion angles
3. System returns structured trend analysis with:
   - Topic summary
   - Key talking points
   - Suggested angles for LinkedIn posts
   - Relevance score (how timely/trending the topic is)
   - Related hashtags

**Technical Details**:
- Uses Gemini via OpenRouter for long-context analysis
- Stores trend analyses for future reference
- Supports Arabic and English input

### 4.2 Post Generation (Phase 1)

**Description**: AI generates LinkedIn posts optimized for engagement. Primary language is Arabic with English as secondary. Posts follow proven LinkedIn engagement patterns.

**User Flow**:
1. User selects a trend/topic or provides a custom topic
2. User chooses language (Arabic primary, English, or both)
3. User selects tone (professional, conversational, educational, provocative)
4. System generates 2-3 post variants
5. User can edit, regenerate, or refine
6. User copies final post to clipboard

**Technical Details**:
- Uses Claude via OpenRouter for high-quality Arabic writing
- Applies LinkedIn-specific engagement patterns (hooks, storytelling, CTAs)
- Supports RTL text rendering in the UI
- Stores generated posts for history and analytics

**Post Quality Criteria**:
- Strong opening hook (first 2 lines visible before "see more")
- Structured for readability (short paragraphs, line breaks)
- Culturally appropriate Arabic (modern standard with colloquial elements)
- Includes relevant hashtags (3-5)
- Appropriate length (150-300 words for text posts)

### 4.3 Format Recommendation (Phase 1)

**Description**: For each topic, the AI recommends the best LinkedIn content format and explains why.

**Supported Formats**:
- **Text post**: Best for personal stories, opinions, quick insights
- **Carousel**: Best for tutorials, step-by-step guides, listicles
- **Infographic**: Best for data-driven content, comparisons, statistics
- **Poll**: Best for engagement, opinion gathering, community building
- **Link post**: Best for sharing external content with commentary

**User Flow**:
1. After trend analysis or topic selection, system automatically recommends format
2. Recommendation includes reasoning and expected engagement
3. User can override recommendation
4. System adapts post generation to chosen format

### 4.4 Carousel Generator (Phase 2)

**Description**: Creates complete carousel content including slide-by-slide text and image generation prompts.

**User Flow**:
1. User selects carousel format (or accepts recommendation)
2. System generates slide-by-slide content (6-10 slides)
3. Each slide includes:
   - Headline text
   - Body text
   - Design direction / image prompt
   - Speaker notes
4. User can edit individual slides
5. Export as structured data for design tools

**Technical Details**:
- Generates image prompts compatible with DALL-E / Midjourney
- Follows carousel best practices (hook slide, content slides, CTA slide)
- Supports Arabic RTL layout in slide content

### 4.5 Supporting Material (Phase 2)

**Description**: Generates or suggests supplementary visual content -- infographics, diagrams, comparison tables, and images.

**Capabilities**:
- Data visualization suggestions (chart types, key metrics to highlight)
- Infographic outlines with section-by-section content
- Image generation prompts for post thumbnails
- Diagram descriptions for technical content
- Comparison tables for product/technology discussions

### 4.6 Multi-model Intelligence (All Phases)

**Description**: Uses OpenRouter to route tasks to the most capable AI model for each job.

**Model Routing**:
| Task | Preferred Model | Rationale |
|------|----------------|-----------|
| Arabic writing | Claude | Best Arabic quality, nuance |
| Trend analysis | Gemini | Long context, web awareness |
| Image prompts | Claude | Detailed descriptive prompts |
| Translation | Claude | Maintains tone across languages |
| Quick edits | GPT-4o-mini | Fast, cost-effective |
| Data analysis | Gemini | Strong analytical capabilities |

**Cost Optimization**:
- Route simple tasks to cheaper models
- Cache common operations
- Track per-user model usage and costs
- Provide cost transparency in the UI

## 5. Development Phases

### Phase 1: Core (MVP)

**Goal**: Working product with trend analysis, post generation, and format recommendation.

**Deliverables**:
- Trend analysis from pasted content
- Arabic and English post generation
- Format recommendation engine
- Post history and management
- Basic UI with RTL support
- OpenRouter integration with model routing

**Timeline**: 4-6 weeks
**Success Criteria**:
- Generate a quality Arabic LinkedIn post in under 30 seconds
- Trend analysis returns actionable insights from pasted articles
- Format recommendations match expert human judgment 70%+ of the time

### Phase 2: Rich Content

**Goal**: Carousel and infographic generation, content calendar.

**Deliverables**:
- Carousel slide generator with image prompts
- Infographic outline generator
- Content calendar with scheduling suggestions
- Post templates library
- Enhanced UI with slide preview

**Timeline**: 4-6 weeks
**Success Criteria**:
- Carousel content is ready for direct use in design tools
- Content calendar reduces planning time by 50%

### Phase 3: Automation

**Goal**: LinkedIn API integration, auto-scheduling, analytics.

**Deliverables**:
- LinkedIn OAuth integration
- Direct post publishing from the app
- Auto-scheduling with optimal timing
- Post performance analytics
- A/B testing for post variants
- Audience insights

**Timeline**: 6-8 weeks
**Success Criteria**:
- End-to-end post creation and publishing without leaving the app
- Analytics show measurable engagement improvement

## 6. Technical Architecture

### System Overview

```
[Browser / Next.js Frontend]
        |
        v
[Fastify API Server]
   |         |         |
   v         v         v
[Prisma]  [OpenRouter]  [Cache]
   |         |
   v         v
[PostgreSQL] [AI Models]
              ├── Claude (writing)
              ├── Gemini (analysis)
              ├── GPT-4o-mini (edits)
              └── DALL-E (images)
```

### Data Model (Core Entities)

- **User**: Account, preferences, usage tracking
- **TrendAnalysis**: Source content, extracted topics, angles
- **Post**: Generated content, language, format, status
- **Carousel**: Slides, image prompts, linked to post
- **ModelUsage**: Per-request model, tokens, cost tracking

### API Design

RESTful API with JSON responses. All endpoints under `/api/` prefix.
See [API Documentation](API.md) for full endpoint reference.

### Security Considerations

- API keys stored server-side only (never exposed to client)
- OpenRouter API key in environment variables
- Rate limiting on generation endpoints
- Input sanitization for pasted content
- No LinkedIn credentials stored (Phase 3 uses OAuth tokens)

## 7. Success Metrics

### Quantitative

| Metric | Target | Measurement |
|--------|--------|-------------|
| Posts generated per user per week | 5+ | Usage tracking |
| Time to generate a post | < 30 seconds | API response time |
| User retention (weekly active) | 60%+ | Login frequency |
| Arabic content quality score | 4/5+ | User rating |
| Format recommendation accuracy | 70%+ | User acceptance rate |

### Qualitative

- Users report saving 2+ hours per week on content creation
- Arabic posts read naturally (not like machine translation)
- Format recommendations feel insightful, not obvious
- Users discover new content angles they wouldn't have considered

## 8. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Arabic AI quality degrades | High | Medium | Multi-model fallback, quality scoring |
| OpenRouter downtime | High | Low | Request queuing, retry logic |
| LinkedIn API changes (Phase 3) | Medium | Medium | Abstract API layer, manual fallback |
| Low user adoption | High | Medium | Focus on Arabic niche, free tier |
| Cost per generation too high | Medium | Medium | Model routing optimization, caching |

## 9. Out of Scope (v1)

- Mobile app (web-only for now)
- LinkedIn API integration (Phase 3)
- Team/organization accounts
- White-label or API access for third parties
- Content moderation / compliance checking
- Integration with other social platforms (Twitter/X, Instagram)

## 10. Open Questions

1. Should we support dialectal Arabic (Egyptian, Gulf, Levantine) or focus on MSA?
2. What is the pricing model? Free tier + paid?
3. Should we build a Chrome extension for LinkedIn in-page content creation?
4. How do we handle copyright concerns with trend analysis from pasted articles?

## 11. User Stories & Acceptance Criteria

### US-01: Trend Analysis from Pasted Content

**As an** Arab tech professional, **I want to** paste articles or content and get AI-extracted trending topics, **so that** I can identify what's worth discussing on LinkedIn without reading multiple sources manually.

| ID | Acceptance Criteria |
|----|---------------------|
| AC-01.1 | Given I am on the Trends page, When I paste content (min 10 characters) and click Analyze, Then the system returns trending topics within 30 seconds |
| AC-01.2 | Given the analysis completes, When I view results, Then each topic shows a title, description, relevance score, and suggested angle |
| AC-01.3 | Given the analysis completes, When I view results, Then recommended hashtags are displayed |
| AC-01.4 | Given I click "Create Post" on a topic, When the navigation occurs, Then I am taken to the post generation page with the topic pre-filled |

### US-02: Bilingual Post Generation

**As a** bilingual content creator, **I want to** generate LinkedIn posts in Arabic, English, or both languages simultaneously, **so that** I can reach both audiences without doubling my content creation effort.

| ID | Acceptance Criteria |
|----|---------------------|
| AC-02.1 | Given I am on the New Post page, When I select language "Both" and click Generate, Then the system produces content in both Arabic and English |
| AC-02.2 | Given a post is generated in both languages, When I view the preview, Then Arabic content renders with RTL direction and English with LTR |
| AC-02.3 | Given a post is generated, When I view it, Then the content includes a strong opening hook, structured paragraphs, and 3-5 relevant hashtags |
| AC-02.4 | Given I want to refine content, When I click Edit on either language tab, Then I can modify the text and save changes |

### US-03: Tone Selection

**As a** tech professional, **I want to** choose the tone of my generated post (professional, casual, thought-leader, educational), **so that** the content matches my personal brand and audience expectations.

| ID | Acceptance Criteria |
|----|---------------------|
| AC-03.1 | Given I am configuring a post, When I select a tone option, Then the generated content reflects that tone in word choice and structure |
| AC-03.2 | Given I select "thought-leader" tone, When the post is generated, Then the content includes contrarian or forward-looking perspectives |
| AC-03.3 | Given I select "educational" tone, When the post is generated, Then the content follows a teaching structure with clear takeaways |

### US-04: Format Recommendation

**As a** content creator, **I want to** receive AI-powered format recommendations (text, carousel, infographic, poll, link), **so that** I optimize engagement without guessing which format works best.

| ID | Acceptance Criteria |
|----|---------------------|
| AC-04.1 | Given a post is generated, When I view the format recommendation, Then it shows the recommended format with a reason and alternative options |
| AC-04.2 | Given the recommended format is "carousel", When I view the recommendation card, Then a "Generate Carousel Slides" button is displayed |
| AC-04.3 | Given I disagree with the recommendation, When I choose a different format, Then the system adapts the content accordingly |

### US-05: Carousel Slide Generation

**As a** LinkedIn professional, **I want to** generate carousel slides with headlines, body text, and image prompts, **so that** I can create rich visual content efficiently without design skills.

| ID | Acceptance Criteria |
|----|---------------------|
| AC-05.1 | Given a post draft exists, When I click "Generate Carousel", Then the system creates 4-12 slides with headline, body, and image prompt per slide |
| AC-05.2 | Given carousel slides are generated, When I view the preview, Then I can navigate between slides using arrows |
| AC-05.3 | Given carousel slides are generated, When I view each slide, Then the image prompt is compatible with DALL-E or Midjourney |

### US-06: Post Translation

**As a** bilingual creator, **I want to** translate an existing post between Arabic and English while preserving tone, **so that** I can expand my audience reach from content originally written in one language.

| ID | Acceptance Criteria |
|----|---------------------|
| AC-06.1 | Given I have a post in English only, When I click "Translate to Arabic", Then the system generates an Arabic version that preserves tone and meaning |
| AC-06.2 | Given a translation completes, When I view the result, Then both language versions are displayed with correct text direction |
| AC-06.3 | Given a translation completes, When I check usage, Then the model, cost, and duration are displayed |

### US-07: Post History & Management

**As a** content creator, **I want to** view, edit, and manage all my generated posts with status tracking, **so that** I can maintain a content pipeline and reuse past work.

| ID | Acceptance Criteria |
|----|---------------------|
| AC-07.1 | Given I navigate to the Posts page, When the page loads, Then I see a paginated list of all post drafts with status and format badges |
| AC-07.2 | Given I click on a post, When the detail page loads, Then I see full content in both languages, carousel preview (if applicable), and generation logs |
| AC-07.3 | Given I want to change a post's status, When I update it from "draft" to "published", Then the status badge updates and publishedAt timestamp is recorded |

### US-08: Cost Transparency

**As a** cost-conscious user, **I want to** see the AI model used, token cost, and response time for each generation, **so that** I can understand my usage and optimize spending.

| ID | Acceptance Criteria |
|----|---------------------|
| AC-08.1 | Given a post is generated, When I view the result, Then the cost (USD), model name, and duration (seconds) are displayed |
| AC-08.2 | Given I navigate to the Models page, When I view usage statistics, Then I see aggregated costs by model and by task type |
| AC-08.3 | Given I select a time period (24h, 7d, 30d), When the usage data loads, Then the statistics reflect only that period |
