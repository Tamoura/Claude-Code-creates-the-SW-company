# LinkedIn Agent — Architecture

## 1. Business Context

LinkedIn Agent is an AI-powered content assistant for Arab tech professionals who want to build thought leadership on LinkedIn. It analyzes trends, generates bilingual posts (Arabic + English), recommends optimal content formats, and creates carousel slides — all powered by multi-model AI routing through OpenRouter.

**Target users**: Arab tech professionals, bilingual content creators, GRC/cybersecurity thought leaders.

**Key differentiator**: Arabic-first AI content generation with format intelligence and multi-model cost optimization.

---

## 2. C4 Level 1 — System Context

```mermaid
graph TD
    User["👤 Content Creator<br/>(Arab Tech Professional)"]
    LA["<b>LinkedIn Agent</b><br/>AI Content Assistant<br/>Ports: 3114 / 5010"]
    OR["☁️ OpenRouter API<br/>(AI Gateway)"]
    LI["☁️ LinkedIn<br/>(Manual post via copy-paste)"]
    PG["🗄️ PostgreSQL<br/>(Database)"]

    User -->|"Paste articles,<br/>configure posts"| LA
    LA -->|"AI inference requests<br/>(Claude, Gemini, GPT)"| OR
    LA -->|"Stores drafts,<br/>trends, usage logs"| PG
    User -->|"Copy-paste<br/>generated content"| LI
    OR -->|"Generated text,<br/>analysis results"| LA

    style LA fill:#7950f2,color:#fff,stroke:#5c3dba,stroke-width:3px
    style User fill:#339af0,color:#fff
    style OR fill:#ff922b,color:#fff
    style LI fill:#0a66c2,color:#fff
    style PG fill:#339af0,color:#fff
```

---

## 3. C4 Level 2 — Container Diagram

```mermaid
graph TD
    subgraph "LinkedIn Agent System"
        WEB["🌐 Next.js 15 Frontend<br/>React 19, Tailwind CSS<br/>Port: 3114"]
        API["⚡ Fastify API<br/>TypeScript, Prisma ORM<br/>Port: 5010"]
        DB["🗄️ PostgreSQL<br/>4 tables<br/>Port: 5432"]
    end

    subgraph "External Services"
        OR["☁️ OpenRouter API"]
        CLAUDE["🤖 Claude Sonnet 4.5<br/>(Writing, Translation)"]
        GEMINI["🤖 Gemini 2.0 Flash<br/>(Trend Analysis)"]
        GPT["🤖 GPT-4o-mini<br/>(Quick Edits)"]
    end

    User["👤 Content Creator"] -->|"HTTPS"| WEB
    WEB -->|"REST API calls<br/>/api/*"| API
    API -->|"Prisma queries"| DB
    API -->|"POST /chat/completions"| OR
    OR --> CLAUDE
    OR --> GEMINI
    OR --> GPT

    style WEB fill:#339af0,color:#fff
    style API fill:#7950f2,color:#fff
    style DB fill:#20c997,color:#fff
    style OR fill:#ff922b,color:#fff
    style CLAUDE fill:#d4a574,color:#333
    style GEMINI fill:#4285f4,color:#fff
    style GPT fill:#10a37f,color:#fff
```

---

## 4. Sequence Diagram — Post Generation Flow

```mermaid
sequenceDiagram
    actor User as Content Creator
    participant Web as Next.js Frontend
    participant API as Fastify API
    participant OR as OpenRouter
    participant Claude as Claude Sonnet 4.5
    participant Gemini as Gemini 2.0 Flash
    participant DB as PostgreSQL

    User->>Web: Enter topic, language, tone
    Web->>API: POST /api/posts/generate

    par AI Writing
        API->>OR: Generate post content
        OR->>Claude: Prompt (topic + language + tone)
        Claude-->>OR: Bilingual post draft
        OR-->>API: Post content (AR + EN)
    and Format Analysis
        API->>OR: Analyze content for format
        OR->>Gemini: Content analysis prompt
        Gemini-->>OR: Format recommendation
        OR-->>API: Best format + alternatives
    end

    API->>DB: INSERT PostDraft
    API->>DB: INSERT GenerationLog (x2)
    API-->>Web: postDraft + formatRecommendation + usage
    Web-->>User: Display preview (AR/EN tabs)

    opt Carousel Generation
        User->>Web: Click "Generate Carousel"
        Web->>API: POST /api/posts/:id/carousel
        API->>OR: Generate slides
        OR->>Claude: Carousel prompt
        Claude-->>OR: Slides with image prompts
        OR-->>API: Structured slides
        API->>DB: INSERT CarouselSlides
        API-->>Web: Carousel preview
        Web-->>User: Slide-by-slide display
    end
```

---

## 5. Sequence Diagram — Trend Analysis Flow

```mermaid
sequenceDiagram
    actor User as Content Creator
    participant Web as Next.js Frontend
    participant API as Fastify API
    participant OR as OpenRouter
    participant Gemini as Gemini 2.0 Flash
    participant DB as PostgreSQL

    User->>Web: Paste article/content
    Web->>API: POST /api/trends/analyze
    API->>OR: Analyze content
    OR->>Gemini: Content + analysis prompt
    Gemini-->>OR: Topics, relevance, tags
    OR-->>API: Structured analysis
    API->>DB: INSERT TrendSource
    API->>DB: INSERT GenerationLog
    API-->>Web: trendSource + analysis + usage
    Web-->>User: Topics grid with relevance scores

    opt Generate Post from Trend
        User->>Web: Click "Create Post" on topic
        Web->>Web: Navigate to /posts/new?topic=...
    end
```

---

## 6. Entity-Relationship Diagram

```mermaid
erDiagram
    TrendSource {
        string id PK "CUID"
        string url "Optional source URL"
        string title "Source title"
        text content "Full text content"
        enum platform "linkedin|twitter|hackernews|other"
        datetime analyzedAt
        string[] tags "GIN indexed"
        datetime createdAt
    }

    PostDraft {
        string id PK "CUID"
        string title "Post title/hook"
        text content "Primary language content"
        text contentAr "Arabic version"
        text contentEn "English version"
        enum format "text|carousel|infographic|link|poll|video"
        text formatReason "AI explanation"
        enum status "draft|review|approved|published|archived"
        string[] tags "Hashtags, GIN indexed"
        string tone "professional|casual|thought-leader|educational"
        string targetAudience
        json supportingMaterial
        string trendSourceId FK
        datetime createdAt
        datetime updatedAt
        datetime publishedAt
    }

    CarouselSlide {
        string id PK "CUID"
        string postDraftId FK
        int slideNumber
        string headline
        text body
        text imagePrompt "DALL-E compatible"
        string imageUrl "Optional generated URL"
        datetime createdAt
    }

    GenerationLog {
        string id PK "CUID"
        string postDraftId FK
        string model "e.g. anthropic/claude-sonnet-4-5"
        string provider "anthropic|google|openai"
        int promptTokens
        int completionTokens
        float costUsd
        int durationMs
        enum taskType "writing|analysis|image|translation"
        datetime createdAt
    }

    TrendSource ||--o{ PostDraft : "inspires"
    PostDraft ||--o{ CarouselSlide : "has slides"
    PostDraft ||--o{ GenerationLog : "tracks usage"
```

---

## 7. State Diagram — Post Draft Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft: AI generates post
    Draft --> Review: Author reviews
    Draft --> Draft: Edit content
    Review --> Approved: Content finalized
    Review --> Draft: Needs changes
    Approved --> Published: Copy to LinkedIn
    Published --> Archived: Content retired
    Draft --> Archived: Discarded
    Review --> Archived: Discarded
```

---

## 8. AI Model Routing

```mermaid
flowchart LR
    subgraph "Task Types"
        W["✍️ Writing"]
        A["📊 Analysis"]
        T["🌐 Translation"]
        I["🎨 Image Prompts"]
        E["✏️ Quick Edits"]
    end

    subgraph "Models (via OpenRouter)"
        C["Claude Sonnet 4.5<br/>Best Arabic quality"]
        G["Gemini 2.0 Flash<br/>Long context, fast"]
        GPT["GPT-4o-mini<br/>Cost-effective"]
    end

    W --> C
    T --> C
    I --> C
    A --> G
    E --> GPT

    style C fill:#d4a574,color:#333
    style G fill:#4285f4,color:#fff
    style GPT fill:#10a37f,color:#fff
```

---

## 9. API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | Health check |
| `POST` | `/api/trends/analyze` | Analyze content for trends |
| `GET` | `/api/trends` | List analyzed trends |
| `POST` | `/api/posts/generate` | Generate AI post |
| `GET` | `/api/posts` | List post drafts |
| `GET` | `/api/posts/:id` | Get single post |
| `PATCH` | `/api/posts/:id` | Update post |
| `DELETE` | `/api/posts/:id` | Delete post |
| `POST` | `/api/posts/:id/translate` | Translate post (AR↔EN) |
| `POST` | `/api/posts/:id/carousel` | Generate carousel slides |
| `GET` | `/api/posts/:id/carousel` | Get carousel for post |
| `GET` | `/api/models` | List available AI models |
| `GET` | `/api/models/usage` | Usage stats and costs |

---

## 10. Security

- **CORS**: Restricted to frontend origin (`http://localhost:3114`)
- **Rate Limiting**: 100 req/15min global; endpoint-specific limits (10/min for analysis, 20/hr for generation)
- **Headers**: X-Content-Type-Options, X-Frame-Options, CSP, HSTS (production)
- **Error Format**: RFC 7807 Problem Details
- **Input Validation**: Zod schemas on all endpoints
