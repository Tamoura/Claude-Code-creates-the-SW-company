# CTOaaS System Architecture

**Product**: CTOaaS (CTO as a Service)
**Version**: 1.0
**Created**: 2026-03-12
**Author**: Architect Agent
**Status**: Draft (pending CEO review)

---

## 1. Overview

CTOaaS is an AI-powered advisory platform for CTOs, CIOs, and VPs of Engineering. The architecture is built around three pillars:

1. **CopilotKit** -- React-based AI copilot UI with streaming, generative UI, and visible agent reasoning via the AG-UI protocol
2. **LangGraph** -- Stateful multi-step agent orchestration with ReAct pattern, tool use, and human-in-the-loop
3. **LlamaIndex** -- RAG framework for knowledge ingestion, chunking, indexing, and retrieval against pgvector

The system delivers personalized, citation-backed advisory responses grounded in curated engineering knowledge from elite organizations.

---

## 2. C4 Context Diagram (Level 1)

Shows CTOaaS in its environment -- users, external systems, and system boundaries.

```mermaid
graph TD
    subgraph Users
        CTO["CTO / CIO / VP Eng<br/><i>Technology leader seeking<br/>strategic advisory</i>"]
    end

    subgraph CTOaaS["CTOaaS Platform"]
        SYSTEM["CTOaaS Advisory System<br/><i>AI-powered CTO advisory<br/>with RAG, risk analysis,<br/>cost modeling, tech radar</i>"]
    end

    subgraph External["External Services"]
        CLAUDE["Anthropic Claude API<br/><i>Primary LLM for advisory<br/>response generation</i>"]
        OPENAI["OpenAI API<br/><i>Embedding generation +<br/>LLM fallback via OpenRouter</i>"]
        OPENROUTER["OpenRouter<br/><i>Unified LLM routing<br/>with automatic failover</i>"]
        S3["S3 / R2 Storage<br/><i>Knowledge base document<br/>storage and report exports</i>"]
        SMTP["SMTP Provider<br/><i>Email verification and<br/>notification delivery</i>"]
    end

    CTO -->|"HTTPS (port 3120)<br/>Interactive advisory chat,<br/>risk dashboard, cost analysis,<br/>tech radar"| SYSTEM
    SYSTEM -->|"REST API<br/>Advisory queries,<br/>streaming responses"| CLAUDE
    SYSTEM -->|"REST API<br/>Embedding generation"| OPENAI
    SYSTEM -->|"REST API<br/>LLM fallback routing"| OPENROUTER
    SYSTEM -->|"S3 API<br/>Document storage/retrieval"| S3
    SYSTEM -->|"SMTP<br/>Verification emails"| SMTP

    style CTO fill:#08427b,color:#fff
    style SYSTEM fill:#1168bd,color:#fff
    style CLAUDE fill:#999,color:#fff
    style OPENAI fill:#999,color:#fff
    style OPENROUTER fill:#999,color:#fff
    style S3 fill:#999,color:#fff
    style SMTP fill:#999,color:#fff
```

---

## 3. C4 Container Diagram (Level 2)

Shows the high-level technology choices -- apps, databases, APIs, and how they interact.

```mermaid
graph TD
    CTO["CTO / CIO / VP Eng"]

    subgraph Platform["CTOaaS Platform"]
        WEB["Web Application<br/><b>Next.js 14+ / React 18+</b><br/>Port 3120<br/><i>CopilotKit AI chat UI,<br/>dashboards, radar,<br/>cost analysis forms</i>"]

        API["API Server<br/><b>Fastify / TypeScript</b><br/>Port 5015<br/><i>REST endpoints, CopilotKit<br/>Runtime, LangGraph agent,<br/>LlamaIndex RAG pipeline</i>"]

        DB[("PostgreSQL 15+<br/><b>+ pgvector extension</b><br/><i>Users, orgs, conversations,<br/>messages, risk items, TCO,<br/>knowledge embeddings</i>")]

        REDIS[("Redis<br/><i>Session cache,<br/>rate limiting,<br/>conversation context</i>")]
    end

    subgraph AI["AI Services"]
        CLAUDE["Claude API<br/><i>Primary LLM</i>"]
        OPENAI["OpenAI API<br/><i>Embeddings</i>"]
        OPENROUTER["OpenRouter<br/><i>LLM Fallback</i>"]
    end

    S3["S3 / R2<br/><i>Knowledge docs,<br/>report exports</i>"]
    SMTP["SMTP<br/><i>Email delivery</i>"]

    CTO -->|"HTTPS"| WEB
    WEB -->|"REST + CopilotKit<br/>AG-UI Protocol<br/>(streaming)"| API
    API -->|"Prisma ORM"| DB
    API -->|"ioredis"| REDIS
    API -->|"@anthropic-ai/sdk<br/>Streaming responses"| CLAUDE
    API -->|"openai SDK<br/>Embedding vectors"| OPENAI
    API -->|"HTTP<br/>Fallback LLM"| OPENROUTER
    API -->|"S3 SDK<br/>Document I/O"| S3
    API -->|"SMTP"| SMTP

    style CTO fill:#08427b,color:#fff
    style WEB fill:#339af0,color:#fff
    style API fill:#51cf66,color:#fff
    style DB fill:#ffa94d,color:#fff
    style REDIS fill:#ff6b6b,color:#fff
    style CLAUDE fill:#be4bdb,color:#fff
    style OPENAI fill:#be4bdb,color:#fff
    style OPENROUTER fill:#be4bdb,color:#fff
    style S3 fill:#999,color:#fff
    style SMTP fill:#999,color:#fff
```

---

## 4. C4 Component Diagram (Level 3) -- API Server

Internal structure of the Fastify API server showing plugins, services, and the agent pipeline.

```mermaid
graph TD
    subgraph API["API Server (Fastify)"]
        subgraph Plugins["Plugins Layer"]
            AUTH["Auth Plugin<br/><i>@connectsw/auth<br/>JWT + refresh tokens<br/>JTI blacklist</i>"]
            PRISMA_P["Prisma Plugin<br/><i>@connectsw/shared<br/>Connection lifecycle</i>"]
            REDIS_P["Redis Plugin<br/><i>@connectsw/shared<br/>Graceful degradation</i>"]
            RATE["Rate Limiter<br/><i>@fastify/rate-limit<br/>100/min general<br/>20/min LLM</i>"]
            OBSERV["Observability<br/><i>Correlation IDs,<br/>Prometheus metrics,<br/>structured logging</i>"]
        end

        subgraph Routes["Route Layer"]
            AUTH_R["Auth Routes<br/><i>/v1/auth/*</i>"]
            CHAT_R["Chat Routes<br/><i>/v1/conversations/*</i>"]
            COPILOT_R["CopilotKit Runtime<br/><i>/v1/copilot/runtime<br/>AG-UI streaming</i>"]
            RISK_R["Risk Routes<br/><i>/v1/risks/*</i>"]
            COST_R["Cost Routes<br/><i>/v1/costs/*</i>"]
            RADAR_R["Radar Routes<br/><i>/v1/radar/*</i>"]
            PROFILE_R["Profile Routes<br/><i>/v1/profile/*<br/>/v1/onboarding/*</i>"]
        end

        subgraph Services["Service Layer"]
            CONV_S["Conversation<br/>Service"]
            RAG_S["RAG Service<br/><i>LlamaIndex query<br/>engine wrapper</i>"]
            RISK_S["Risk Analysis<br/>Service"]
            COST_S["Cost Calculator<br/>Service"]
            RADAR_S["Tech Radar<br/>Service"]
            PROFILE_S["Profile<br/>Service"]
            MEMORY_S["Memory<br/>Service<br/><i>Hierarchical<br/>summarization</i>"]
            SANITIZE["Data Sanitizer<br/><i>PII removal before<br/>LLM API calls</i>"]
        end

        subgraph Agent["LangGraph Agent"]
            GRAPH["Agent Graph<br/><i>ReAct orchestrator<br/>with state machine</i>"]
            RAG_TOOL["RAG Search Tool<br/><i>LlamaIndex query</i>"]
            RISK_TOOL["Risk Analyzer Tool<br/><i>Profile-based risk eval</i>"]
            COST_TOOL["Cost Calculator Tool<br/><i>TCO + cloud analysis</i>"]
            RADAR_TOOL["Tech Radar Tool<br/><i>Technology lookup</i>"]
            MEMORY_TOOL["Memory Tool<br/><i>Past decisions +<br/>preferences</i>"]
        end
    end

    DB[("PostgreSQL<br/>+ pgvector")]
    CLAUDE["Claude API"]

    Routes --> Services
    COPILOT_R --> GRAPH
    GRAPH --> RAG_TOOL
    GRAPH --> RISK_TOOL
    GRAPH --> COST_TOOL
    GRAPH --> RADAR_TOOL
    GRAPH --> MEMORY_TOOL
    RAG_TOOL --> RAG_S
    RISK_TOOL --> RISK_S
    COST_TOOL --> COST_S
    RADAR_TOOL --> RADAR_S
    MEMORY_TOOL --> MEMORY_S
    Services --> SANITIZE
    SANITIZE --> CLAUDE
    Services --> DB

    style AUTH fill:#339af0,color:#fff
    style GRAPH fill:#be4bdb,color:#fff
    style RAG_TOOL fill:#ae3ec9,color:#fff
    style RISK_TOOL fill:#ae3ec9,color:#fff
    style COST_TOOL fill:#ae3ec9,color:#fff
    style RADAR_TOOL fill:#ae3ec9,color:#fff
    style MEMORY_TOOL fill:#ae3ec9,color:#fff
    style RAG_S fill:#51cf66,color:#fff
    style COPILOT_R fill:#be4bdb,color:#fff
```

---

## 5. LangGraph Agent Graph

The CTO Advisory Agent uses the ReAct (Reasoning + Acting) pattern. Each tool node is an independent module that can be tested, improved, and extended separately. CopilotKit's AG-UI protocol makes every reasoning step visible to the CTO in real-time.

```mermaid
graph TD
    START((Start)) --> ROUTE{Router}

    ROUTE -->|"Question about<br/>best practices"| RAG["RAG Search<br/><i>LlamaIndex vector query<br/>Top-5 chunks, threshold 0.7</i>"]
    ROUTE -->|"Question about<br/>risk/vulnerability"| RISK["Risk Analyzer<br/><i>Profile-based risk eval<br/>EOL, CVE, vendor concentration</i>"]
    ROUTE -->|"Question about<br/>costs/TCO"| COST["Cost Calculator<br/><i>TCO projection, cloud<br/>spend optimization</i>"]
    ROUTE -->|"Question about<br/>technology trends"| RADAR["Tech Radar Lookup<br/><i>Ring position, quadrant,<br/>relevance to CTO stack</i>"]
    ROUTE -->|"Needs context from<br/>past conversations"| MEMORY["Memory Retrieval<br/><i>Decision history,<br/>preferences, key facts</i>"]
    ROUTE -->|"General question"| REASON["Direct Reasoning<br/><i>Claude generates response<br/>with org context</i>"]

    RAG --> SYNTHESIZE["Synthesize Response<br/><i>Combine tool results,<br/>add citations, confidence<br/>score, AI disclaimer</i>"]
    RISK --> SYNTHESIZE
    COST --> SYNTHESIZE
    RADAR --> SYNTHESIZE
    MEMORY --> SYNTHESIZE
    REASON --> SYNTHESIZE

    SYNTHESIZE --> HUMAN{Human-in-the-Loop?}
    HUMAN -->|"Agent needs<br/>clarification"| CLARIFY["Request Clarification<br/><i>Agent pauses and asks<br/>CTO for more info</i>"]
    CLARIFY --> ROUTE
    HUMAN -->|"Response ready"| RESPOND["Stream Response<br/><i>Via CopilotKit AG-UI<br/>with reasoning steps visible</i>"]
    RESPOND --> END((End))

    style START fill:#339af0,color:#fff
    style END fill:#339af0,color:#fff
    style ROUTE fill:#ffa94d,color:#fff
    style RAG fill:#51cf66,color:#fff
    style RISK fill:#ff6b6b,color:#fff
    style COST fill:#fcc419,color:#000
    style RADAR fill:#be4bdb,color:#fff
    style MEMORY fill:#339af0,color:#fff
    style REASON fill:#1168bd,color:#fff
    style SYNTHESIZE fill:#20c997,color:#fff
    style HUMAN fill:#ffa94d,color:#fff
    style CLARIFY fill:#ff922b,color:#fff
    style RESPOND fill:#51cf66,color:#fff
```

### Agent State Schema (LangGraph)

```typescript
interface AgentState {
  // Input
  messages: BaseMessage[];
  userQuery: string;
  organizationId: string;
  userId: string;

  // Context
  companyProfile: CompanyProfile | null;
  userPreferences: UserPreference[];
  conversationSummary: string | null;

  // Tool results
  ragResults: RAGChunk[];
  riskAnalysis: RiskResult | null;
  costAnalysis: CostResult | null;
  radarResults: TechRadarItem[];
  memoryResults: MemoryFact[];

  // Output
  response: string;
  citations: Citation[];
  confidenceScore: number;
  toolsUsed: string[];
  reasoningSteps: ReasoningStep[];
}
```

### Tool Node Specifications

| Tool | Input | Output | Latency Target | Data Source |
|------|-------|--------|----------------|------------|
| RAG Search | Query string, top_k=5, threshold=0.7 | Ranked chunks with similarity scores | < 500ms | pgvector via LlamaIndex |
| Risk Analyzer | Organization ID, company profile | Risk items with severity scores | < 2s | Company profile + risk rules |
| Cost Calculator | Cost parameters (TCO or cloud spend) | Projections, recommendations | < 1s | User input + benchmarks |
| Tech Radar Lookup | Technology name or category | Radar items with ring/quadrant | < 200ms | tech_radar_items table |
| Memory Retrieval | User ID, conversation context | Past decisions, preferences, key facts | < 300ms | conversations + preferences |

---

## 6. Advisory Chat Sequence Diagram

Shows the full flow from CTO question through CopilotKit, Fastify, LangGraph agent, tool execution, and streaming response with visible reasoning.

```mermaid
sequenceDiagram
    participant CTO as CTO (Browser)
    participant CK as CopilotKit<br/>(React UI)
    participant API as Fastify API<br/>(Port 5015)
    participant CKR as CopilotKit<br/>Runtime
    participant LG as LangGraph<br/>Agent
    participant RAG as LlamaIndex<br/>RAG Pipeline
    participant PGV as PostgreSQL<br/>+ pgvector
    participant CLAUDE as Claude API

    CTO->>CK: Types advisory question
    CK->>API: POST /v1/copilot/runtime<br/>(AG-UI protocol, streaming)
    API->>API: Authenticate JWT<br/>Load org context
    API->>CKR: Forward to CopilotKit Runtime
    CKR->>LG: Invoke agent graph<br/>with state (query + context)

    Note over LG: ReAct Loop Begins<br/>(visible to CTO via AG-UI)

    LG->>LG: REASON: Analyze query intent<br/>[Streaming: "Analyzing your question..."]
    LG->>CK: AG-UI: Reasoning step visible

    LG->>RAG: ACT: Search knowledge base
    RAG->>PGV: Vector similarity search<br/>(cosine, top-5, threshold 0.7)
    PGV-->>RAG: Ranked chunks
    RAG->>RAG: Rerank results
    RAG-->>LG: Top-k chunks with sources
    LG->>CK: AG-UI: "Found 3 relevant sources..."

    LG->>PGV: ACT: Load user preferences<br/>and decision history
    PGV-->>LG: Memory facts
    LG->>CK: AG-UI: "Reviewing your context..."

    LG->>LG: REASON: Synthesize answer<br/>with citations and confidence
    LG->>LG: Data sanitization step<br/>(remove PII/financials)
    LG->>CLAUDE: Generate advisory response<br/>(org context + RAG chunks<br/>+ preferences + query)
    CLAUDE-->>LG: Streaming token response

    LG->>LG: Parse citations,<br/>score confidence,<br/>add AI disclaimer

    LG-->>CKR: Streaming response<br/>with metadata
    CKR-->>API: AG-UI stream
    API-->>CK: SSE stream
    CK-->>CTO: Display response with:<br/>- Inline citations [1][2]<br/>- Confidence indicator<br/>- Source panel<br/>- AI disclaimer<br/>- Thumbs up/down

    Note over LG: ReAct Loop Ends

    API->>PGV: Store message + response<br/>+ citations + token count
```

---

## 7. Knowledge Ingestion Pipeline (LlamaIndex)

Shows how knowledge documents are ingested, chunked, embedded, and stored for RAG retrieval.

```mermaid
flowchart TD
    subgraph Ingestion["Knowledge Ingestion Pipeline (LlamaIndex)"]
        SOURCE["Source Documents<br/><i>Engineering blogs, whitepapers,<br/>conference talks, best practices<br/>(S3/R2 storage)</i>"]
        LOAD["Document Loader<br/><i>LlamaIndex readers:<br/>PDF, Markdown, HTML, JSON</i>"]
        CHUNK["Chunking Engine<br/><i>LlamaIndex SentenceSplitter<br/>Target: 500-1000 tokens<br/>Overlap: 50 tokens</i>"]
        EMBED["Embedding Generator<br/><i>OpenAI text-embedding-3-small<br/>1536 dimensions</i>"]
        STORE["Vector Storage<br/><i>pgvector (PostgreSQL)<br/>knowledge_chunks table<br/>HNSW index</i>"]
        META["Metadata Extraction<br/><i>Title, author, source,<br/>category, publish date</i>"]
    end

    subgraph Query["RAG Query Pipeline"]
        QINPUT["CTO Question"]
        QEMBED["Query Embedding<br/><i>Same model as ingestion</i>"]
        VSEARCH["Vector Similarity Search<br/><i>Cosine similarity<br/>Top-5, threshold 0.7</i>"]
        RERANK["Reranker<br/><i>LlamaIndex reranker<br/>Score + relevance filter</i>"]
        CONTEXT["Context Assembly<br/><i>Inject chunks into<br/>LangGraph agent state</i>"]
    end

    SOURCE --> LOAD
    LOAD --> META
    META --> CHUNK
    CHUNK --> EMBED
    EMBED --> STORE

    QINPUT --> QEMBED
    QEMBED --> VSEARCH
    STORE -.->|"Similarity search"| VSEARCH
    VSEARCH --> RERANK
    RERANK --> CONTEXT

    style SOURCE fill:#339af0,color:#fff
    style STORE fill:#ffa94d,color:#fff
    style EMBED fill:#be4bdb,color:#fff
    style QEMBED fill:#be4bdb,color:#fff
    style CONTEXT fill:#51cf66,color:#fff
```

### Embedding Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Model | `text-embedding-3-small` | Cost-efficient, 1536 dims, good quality |
| Dimensions | 1536 | Default for text-embedding-3-small |
| Chunk size | 500-1000 tokens | Balances context richness vs. retrieval precision |
| Chunk overlap | 50 tokens | Prevents information loss at boundaries |
| Similarity metric | Cosine | Standard for text embeddings |
| Top-k | 5 | Enough context without overwhelming prompt |
| Threshold | 0.7 | Filters low-relevance noise |
| Index type | HNSW | Sub-linear search time for 100K+ vectors |

---

## 8. Entity-Relationship Diagram

Complete database schema for the CTOaaS platform.

```mermaid
erDiagram
    ORGANIZATION {
        uuid id PK
        varchar name "NOT NULL"
        varchar industry "NOT NULL"
        int employee_count "NOT NULL"
        varchar growth_stage "NOT NULL"
        int founded_year
        jsonb challenges
        timestamp created_at "DEFAULT now()"
        timestamp updated_at
    }

    USER {
        uuid id PK
        uuid organization_id FK
        varchar email "UNIQUE NOT NULL"
        varchar name "NOT NULL"
        varchar password_hash "NOT NULL"
        varchar role "DEFAULT 'cto'"
        boolean email_verified "DEFAULT false"
        varchar verification_token
        timestamp verification_token_expires_at
        int failed_login_attempts "DEFAULT 0"
        timestamp locked_until
        varchar tier "DEFAULT 'free'"
        int daily_message_count "DEFAULT 0"
        date daily_message_reset_date
        timestamp created_at "DEFAULT now()"
        timestamp updated_at
    }

    COMPANY_PROFILE {
        uuid id PK
        uuid organization_id FK "UNIQUE"
        jsonb tech_stack "NOT NULL DEFAULT '{}'"
        varchar cloud_provider
        text architecture_notes
        text constraints
        int profile_completeness "DEFAULT 0"
        jsonb onboarding_state "step tracking"
        timestamp created_at "DEFAULT now()"
        timestamp updated_at
    }

    CONVERSATION {
        uuid id PK
        uuid user_id FK "NOT NULL"
        varchar title
        text summary "compressed older msgs"
        text long_term_memory "extracted key facts"
        int message_count "DEFAULT 0"
        timestamp created_at "DEFAULT now()"
        timestamp updated_at
    }

    MESSAGE {
        uuid id PK
        uuid conversation_id FK "NOT NULL"
        varchar role "user or assistant"
        text content "NOT NULL"
        jsonb citations
        varchar confidence "high/medium/low"
        varchar feedback "up/down/null"
        int token_count
        timestamp created_at "DEFAULT now()"
    }

    KNOWLEDGE_DOCUMENT {
        uuid id PK
        varchar title "NOT NULL"
        varchar source "NOT NULL"
        varchar author
        date published_date
        varchar url
        text content
        varchar category "NOT NULL"
        varchar status "active/archived"
        timestamp ingested_at "DEFAULT now()"
        timestamp updated_at
    }

    KNOWLEDGE_CHUNK {
        uuid id PK
        uuid document_id FK "NOT NULL"
        text content "NOT NULL"
        vector embedding "1536 dims"
        int token_count
        int chunk_index
    }

    RISK_ITEM {
        uuid id PK
        uuid organization_id FK "NOT NULL"
        varchar category "NOT NULL"
        varchar title "NOT NULL"
        text description
        int severity "1-10"
        varchar trend "improving/stable/worsening"
        varchar status "active/mitigated/dismissed"
        jsonb mitigations
        jsonb affected_systems
        timestamp identified_at "DEFAULT now()"
        timestamp updated_at
    }

    TCO_COMPARISON {
        uuid id PK
        uuid user_id FK "NOT NULL"
        varchar title "NOT NULL"
        jsonb options "NOT NULL"
        jsonb projections
        text ai_analysis
        timestamp created_at "DEFAULT now()"
        timestamp updated_at
    }

    CLOUD_SPEND {
        uuid id PK
        uuid user_id FK "NOT NULL"
        uuid organization_id FK "NOT NULL"
        varchar provider "NOT NULL"
        jsonb spend_breakdown "NOT NULL"
        decimal total_monthly "NOT NULL"
        jsonb benchmarks
        jsonb recommendations
        varchar import_source "manual/csv/json"
        timestamp period_start "NOT NULL"
        timestamp period_end "NOT NULL"
        timestamp created_at "DEFAULT now()"
    }

    TECH_RADAR_ITEM {
        uuid id PK
        varchar name "UNIQUE NOT NULL"
        varchar quadrant "NOT NULL"
        varchar ring "NOT NULL"
        text description
        text rationale
        boolean is_new "DEFAULT false"
        jsonb related_technologies
        timestamp created_at "DEFAULT now()"
        timestamp updated_at
    }

    USER_PREFERENCE {
        uuid id PK
        uuid user_id FK "NOT NULL"
        uuid organization_id FK "NOT NULL"
        varchar preference_key "NOT NULL"
        text preference_value
        int signal_count "DEFAULT 0"
        timestamp updated_at
    }

    REFRESH_TOKEN {
        uuid id PK
        uuid user_id FK "NOT NULL"
        varchar jti "UNIQUE NOT NULL"
        boolean revoked "DEFAULT false"
        timestamp expires_at "NOT NULL"
        timestamp created_at "DEFAULT now()"
    }

    AUDIT_LOG {
        uuid id PK
        uuid user_id FK
        varchar action "NOT NULL"
        varchar entity_type
        uuid entity_id
        jsonb metadata
        varchar ip_address
        timestamp created_at "DEFAULT now()"
    }

    ORGANIZATION ||--o{ USER : "has many"
    ORGANIZATION ||--o| COMPANY_PROFILE : "has one"
    ORGANIZATION ||--o{ RISK_ITEM : "has many"
    ORGANIZATION ||--o{ CLOUD_SPEND : "has many"
    USER ||--o{ CONVERSATION : "has many"
    USER ||--o{ TCO_COMPARISON : "has many"
    USER ||--o{ USER_PREFERENCE : "has many"
    USER ||--o{ REFRESH_TOKEN : "has many"
    USER ||--o{ AUDIT_LOG : "has many"
    USER ||--o{ CLOUD_SPEND : "has many"
    CONVERSATION ||--o{ MESSAGE : "has many"
    KNOWLEDGE_DOCUMENT ||--o{ KNOWLEDGE_CHUNK : "has many"
```

---

## 9. Authentication Flow

```mermaid
sequenceDiagram
    participant CTO as CTO (Browser)
    participant WEB as Next.js Frontend
    participant API as Fastify API
    participant DB as PostgreSQL
    participant SMTP as SMTP Provider

    Note over CTO,SMTP: Registration Flow
    CTO->>WEB: Fill signup form (email + password)
    WEB->>API: POST /v1/auth/signup
    API->>API: Validate password (8+ chars, complexity)
    API->>API: Hash password (argon2)
    API->>DB: Create user (unverified) + org
    API->>SMTP: Send verification email (24hr token)
    API-->>WEB: 201 Created
    WEB-->>CTO: "Check your email"

    Note over CTO,SMTP: Email Verification
    CTO->>WEB: Click verification link
    WEB->>API: POST /v1/auth/verify-email
    API->>DB: Validate token + mark verified
    API-->>WEB: 200 OK + redirect to /onboarding

    Note over CTO,SMTP: Login Flow
    CTO->>WEB: Submit credentials
    WEB->>API: POST /v1/auth/login
    API->>DB: Verify credentials
    alt Credentials valid
        API->>DB: Create refresh token (JTI)
        API-->>WEB: JWT (15min) + httpOnly cookie (7d)
        WEB->>WEB: Store JWT in memory (never localStorage)
    else Failed 5x in 15min
        API->>DB: Lock account (30 min)
        API-->>WEB: 429 Account locked
    end

    Note over CTO,SMTP: Token Refresh
    WEB->>API: POST /v1/auth/refresh (httpOnly cookie)
    API->>DB: Validate JTI + not revoked
    API->>DB: Revoke old JTI, create new JTI
    API-->>WEB: New JWT + new httpOnly cookie

    Note over CTO,SMTP: Logout
    CTO->>WEB: Click logout
    WEB->>API: POST /v1/auth/logout
    API->>DB: Revoke JTI (blacklist)
    API-->>WEB: Clear cookie
    WEB->>WEB: Clear JWT from memory
```

---

## 10. Risk Assessment Flow

```mermaid
sequenceDiagram
    participant CTO as CTO (Browser)
    participant WEB as Next.js Frontend
    participant API as Fastify API
    participant LG as LangGraph Agent
    participant DB as PostgreSQL

    CTO->>WEB: Navigate to /risks
    WEB->>API: GET /v1/risks/summary
    API->>DB: Load risk items for org
    DB-->>API: Risk items by category

    alt No profile configured
        API-->>WEB: 200 { configured: false }
        WEB-->>CTO: Empty state: "Complete profile first"
    else Profile exists
        API->>API: Calculate category scores (avg severity)
        API-->>WEB: 200 { categories: [...], scores: [...] }
        WEB-->>CTO: Risk dashboard with 4 category cards
    end

    CTO->>WEB: Click "Get Recommendations" on risk item
    WEB->>API: POST /v1/risks/:id/recommendations
    API->>DB: Load risk item + company profile
    API->>LG: Invoke agent with risk context
    LG->>LG: RAG search for mitigation best practices
    LG->>LG: Generate 2-5 mitigation actions
    LG-->>API: Recommendations with effort + priority
    API->>DB: Store recommendations on risk item
    API-->>WEB: 200 { recommendations: [...] }
    WEB-->>CTO: Display actions with effort/priority/impact

    CTO->>WEB: Click "Discuss with advisor"
    WEB->>WEB: Open /chat with pre-populated context
```

---

## 11. Conversation Memory Architecture

```mermaid
stateDiagram-v2
    [*] --> Active: New conversation created

    Active --> Active: Message added (count < 10)
    Active --> Summarizing: Message count > 10

    state Summarizing {
        [*] --> CompressOlder: Summarize messages 1...(n-10)
        CompressOlder --> ExtractFacts: Extract key facts
        ExtractFacts --> StoreLongTerm: Save to long_term_memory
        StoreLongTerm --> RetainRecent: Keep last 10 verbatim
        RetainRecent --> [*]
    }

    Summarizing --> Active: Summary stored, continue

    Active --> Idle: No activity 30 minutes
    Idle --> Active: User returns
    Active --> Archived: No activity 90 days
    Archived --> Active: User reopens
```

### Memory Hierarchy

| Layer | Storage | Content | Retention | Used In Prompt |
|-------|---------|---------|-----------|---------------|
| Short-term | `messages` table | Last 10 messages verbatim | Session | Always |
| Medium-term | `conversation.summary` | Compressed older messages | Per conversation | Always (if exists) |
| Long-term | `conversation.long_term_memory` | Key facts, decisions, preferences | Cross-session | Always (if exists) |
| Preference | `user_preferences` table | Learned communication style | Permanent | Always |

---

## 12. Project Structure

```
products/ctoaas/
├── apps/
│   ├── api/                          # Fastify backend (port 5015)
│   │   ├── src/
│   │   │   ├── server.ts             # Entry point, plugin registration
│   │   │   ├── app.ts                # Fastify app factory (buildApp)
│   │   │   ├── plugins/
│   │   │   │   ├── auth.ts           # @connectsw/auth integration
│   │   │   │   ├── prisma.ts         # @connectsw/shared/plugins/prisma
│   │   │   │   ├── redis.ts          # @connectsw/shared/plugins/redis
│   │   │   │   ├── rate-limit.ts     # @fastify/rate-limit config
│   │   │   │   ├── observability.ts  # Correlation IDs, metrics
│   │   │   │   └── copilot-runtime.ts# CopilotKit runtime setup
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts           # /v1/auth/* (from @connectsw/auth)
│   │   │   │   ├── conversations.ts  # /v1/conversations/*
│   │   │   │   ├── copilot.ts        # /v1/copilot/runtime (AG-UI)
│   │   │   │   ├── risks.ts          # /v1/risks/*
│   │   │   │   ├── costs.ts          # /v1/costs/*
│   │   │   │   ├── radar.ts          # /v1/radar/*
│   │   │   │   ├── profile.ts        # /v1/profile/*
│   │   │   │   ├── onboarding.ts     # /v1/onboarding/*
│   │   │   │   ├── preferences.ts    # /v1/preferences/*
│   │   │   │   └── health.ts         # /v1/health
│   │   │   ├── services/
│   │   │   │   ├── conversation.service.ts
│   │   │   │   ├── rag.service.ts     # LlamaIndex wrapper
│   │   │   │   ├── risk.service.ts
│   │   │   │   ├── cost.service.ts
│   │   │   │   ├── radar.service.ts
│   │   │   │   ├── profile.service.ts
│   │   │   │   ├── memory.service.ts
│   │   │   │   ├── sanitizer.service.ts
│   │   │   │   └── embedding.service.ts
│   │   │   ├── agent/
│   │   │   │   ├── graph.ts           # LangGraph graph definition
│   │   │   │   ├── state.ts           # AgentState interface
│   │   │   │   ├── nodes/
│   │   │   │   │   ├── router.ts      # Intent classification
│   │   │   │   │   ├── rag-search.ts  # RAG tool node
│   │   │   │   │   ├── risk-analyzer.ts
│   │   │   │   │   ├── cost-calculator.ts
│   │   │   │   │   ├── radar-lookup.ts
│   │   │   │   │   ├── memory-retrieval.ts
│   │   │   │   │   └── synthesizer.ts # Response assembly
│   │   │   │   └── prompts/
│   │   │   │       ├── system.ts       # System prompt template
│   │   │   │       ├── rag-context.ts  # RAG injection template
│   │   │   │       └── risk-analysis.ts
│   │   │   └── types/
│   │   │       ├── agent.ts
│   │   │       ├── risk.ts
│   │   │       ├── cost.ts
│   │   │       └── radar.ts
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── services/
│   │   │   │   └── agent/
│   │   │   └── integration/
│   │   │       ├── auth.test.ts
│   │   │       ├── conversations.test.ts
│   │   │       ├── risks.test.ts
│   │   │       ├── costs.test.ts
│   │   │       └── radar.test.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # Next.js frontend (port 3120)
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx         # Root layout with CopilotKit provider
│       │   │   ├── page.tsx           # Landing page (SSR)
│       │   │   ├── (auth)/
│       │   │   │   ├── login/page.tsx
│       │   │   │   ├── signup/page.tsx
│       │   │   │   └── verify-email/page.tsx
│       │   │   ├── onboarding/page.tsx
│       │   │   ├── (dashboard)/
│       │   │   │   ├── layout.tsx     # DashboardLayout wrapper
│       │   │   │   ├── dashboard/page.tsx
│       │   │   │   ├── chat/
│       │   │   │   │   ├── page.tsx   # Chat with CopilotKit sidebar
│       │   │   │   │   └── [conversationId]/page.tsx
│       │   │   │   ├── risks/
│       │   │   │   │   ├── page.tsx   # Risk dashboard
│       │   │   │   │   └── [category]/page.tsx
│       │   │   │   ├── costs/
│       │   │   │   │   ├── page.tsx   # Cost analysis hub
│       │   │   │   │   ├── tco/page.tsx
│       │   │   │   │   ├── tco/[comparisonId]/page.tsx
│       │   │   │   │   └── cloud-spend/page.tsx
│       │   │   │   ├── radar/page.tsx # Technology radar
│       │   │   │   └── settings/
│       │   │   │       ├── page.tsx
│       │   │   │       ├── profile/page.tsx
│       │   │   │       ├── account/page.tsx
│       │   │   │       └── preferences/page.tsx
│       │   ├── components/
│       │   │   ├── chat/
│       │   │   │   ├── ChatWindow.tsx  # CopilotKit chat wrapper
│       │   │   │   ├── CitationPanel.tsx
│       │   │   │   ├── ConversationSidebar.tsx
│       │   │   │   └── FeedbackButtons.tsx
│       │   │   ├── risk/
│       │   │   │   ├── RiskCategoryCard.tsx
│       │   │   │   ├── RiskItemDetail.tsx
│       │   │   │   └── RiskRecommendations.tsx
│       │   │   ├── cost/
│       │   │   │   ├── TcoForm.tsx
│       │   │   │   ├── TcoProjectionChart.tsx
│       │   │   │   ├── CloudSpendForm.tsx
│       │   │   │   └── CloudSpendChart.tsx
│       │   │   ├── radar/
│       │   │   │   ├── TechRadar.tsx   # SVG circular visualization
│       │   │   │   ├── RadarDetailPanel.tsx
│       │   │   │   └── RadarListView.tsx # Mobile fallback
│       │   │   ├── onboarding/
│       │   │   │   ├── CompanyBasics.tsx
│       │   │   │   ├── TechStackSelector.tsx
│       │   │   │   ├── ChallengesSelector.tsx
│       │   │   │   └── PreferencesForm.tsx
│       │   │   └── shared/            # @connectsw/ui re-exports
│       │   ├── hooks/
│       │   │   ├── useAuth.ts          # @connectsw/auth/frontend
│       │   │   ├── useConversations.ts
│       │   │   ├── useRisks.ts
│       │   │   ├── useCosts.ts
│       │   │   └── useRadar.ts
│       │   └── lib/
│       │       ├── api-client.ts       # Fetch wrapper with auth
│       │       ├── constants.ts
│       │       └── utils.ts
│       ├── tests/
│       ├── public/
│       ├── package.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── tsconfig.json
│
├── e2e/
│   ├── tests/
│   │   ├── auth.spec.ts
│   │   ├── onboarding.spec.ts
│   │   ├── chat.spec.ts
│   │   ├── risks.spec.ts
│   │   ├── costs.spec.ts
│   │   └── radar.spec.ts
│   └── playwright.config.ts
│
├── docs/
│   ├── PRD.md
│   ├── business-analysis.md
│   ├── architecture.md              # This document
│   ├── api-schema.yml               # OpenAPI 3.0
│   ├── db-schema.sql                # Full DDL
│   ├── plan.md                      # Implementation plan
│   ├── ADRs/
│   │   ├── ADR-001-copilotkit-for-ai-ui.md
│   │   ├── ADR-002-langgraph-for-agent-orchestration.md
│   │   └── ADR-003-llamaindex-for-rag.md
│   └── specs/
│       └── ctoaas-foundation.md
│
├── .claude/
│   └── addendum.md                  # Product-specific agent config
│
├── package.json
└── README.md
```

---

## 13. Integration Points

| System | Direction | Protocol | Data Exchanged | Auth Method | Failure Mode |
|--------|-----------|----------|---------------|-------------|--------------|
| Claude API (Anthropic) | Outbound | REST HTTPS | Advisory prompts + streaming responses | API key (env var) | Fallback to OpenRouter |
| OpenAI API | Outbound | REST HTTPS | Text for embedding generation | API key (env var) | Retry 3x, then error |
| OpenRouter | Outbound | REST HTTPS | Fallback LLM queries | API key (env var) | Return "advisor unavailable" |
| S3/R2 Storage | Outbound | S3 API | Knowledge docs upload/download | Access key + secret | Return cached if available |
| SMTP Provider | Outbound | SMTP/API | Verification emails | API key | Queue for retry |
| Redis | Internal | TCP | Session cache, rate limiting | Password (optional) | Graceful degradation to DB |
| PostgreSQL | Internal | TCP | All persistent data | Connection string | Fatal -- service unavailable |

---

## 14. Security Architecture

### Authentication and Authorization

| Aspect | Implementation |
|--------|---------------|
| Authentication | Email/password with argon2 hashing. JWT access token (15-min, in-memory). httpOnly refresh cookie (7-day, rotation). |
| Authorization | Organization-scoped queries via mandatory `organization_id` filter on all data-access services. Prisma middleware enforces scoping. |
| Account lockout | 5 failed attempts in 15 min = 30-min lock. Progressive backoff. |
| BOLA prevention | Every API endpoint validates that the authenticated user belongs to the requested organization. |
| BFLA prevention | Role field on User model. Admin-only routes guarded by role check. |
| Session management | Refresh token JTI tracked in DB. Revocation on logout. JTI blacklist with circuit breaker pattern. |

### Data Protection

| Layer | Mechanism |
|-------|-----------|
| In transit | TLS 1.2+ enforced. HSTS header. HTTP to HTTPS redirect in production. |
| At rest (sensitive) | AES-256-GCM application-level encryption for: company financials, cloud spend data, API keys stored in profiles. |
| At rest (general) | PostgreSQL disk-level encryption via provider (Render/Supabase). |
| LLM data sanitization | Sanitizer service strips raw financials, credentials, and unnecessary PII before any LLM API call. Only minimum context included. |
| No source code | Per BR-005, customer source code is never stored or transmitted to LLM providers. |
| PII logging | Logger from @connectsw/shared/utils/logger redacts PII fields automatically. |

### API Security

| Control | Configuration |
|---------|--------------|
| Rate limiting | 100 req/min general, 20 req/min LLM endpoints. In-memory fallback when Redis unavailable. |
| CORS | Allow only the Next.js frontend origin. Credentials mode enabled. |
| CSP | `default-src 'self'`, `script-src 'self'`, `connect-src 'self' api.anthropic.com api.openai.com` |
| Input validation | Zod schemas on all route handlers. Max message length 10,000 chars. |
| Error responses | RFC 7807 format with `type` field. No stack traces in production. |
| Request correlation | UUID correlation ID on every request for tracing. |
| Health endpoint | `/v1/health` returns 503 on DB connection failure. |

---

## 15. Scalability Considerations

| Concern | Design Decision | Scale Path |
|---------|----------------|------------|
| pgvector at 100K embeddings | HNSW index, cosine similarity, < 500ms target | Phase 2: migrate to dedicated Pinecone/Weaviate if > 1M embeddings |
| Concurrent users (1,000) | Connection pooling (50 connections), Redis caching | Horizontal scaling via multiple API instances behind load balancer |
| LLM API costs | Token budgeting per tier, response caching, prompt optimization | Phase 2: custom NanoChat model reduces per-query cost |
| Conversation context window | Hierarchical memory (summarize + extract facts) | Keeps context bounded regardless of conversation length |
| Database connections | Prisma connection pool with configurable size | PgBouncer for production if needed |

---

## 16. Error Handling Strategy

| Error Category | Example | Detection | Recovery | User Experience |
|---------------|---------|-----------|----------|----------------|
| Validation | Invalid email, password too short | Zod schema check | Return 400 with field errors | Inline form error messages |
| Auth | Expired JWT, invalid refresh token | Auth middleware | Clear tokens, redirect login | "Session expired" toast |
| LLM unavailable | Claude API 429 or 500 | Try/catch + timeout | Retry 3x with backoff, fallback to OpenRouter | "Thinking..." then error with retry |
| LLM timeout | Response exceeds 30s | Timeout guard | Cancel request, show partial | "Response is taking longer than expected" |
| Redis unavailable | Connection refused | Health check | Fall back to DB + in-memory rate limiting | No user-facing impact (graceful) |
| Database | Connection lost | Health check, Prisma error handler | Reconnect pool, return 503 | "Service temporarily unavailable" page |
| RAG no results | No chunks above 0.7 threshold | Empty result check | Respond with general AI knowledge, label it | "Based on general AI knowledge" label |
| Rate limit exceeded | 20+ LLM queries/min | Rate limiter middleware | Return 429 with retry-after header | "Slow down" message with countdown |
| Free tier limit | 20+ messages/day | Daily counter check | Return 403 with upgrade CTA | Modal: "Upgrade to Pro for unlimited" |

---

## 17. Traceability Matrix

Maps user stories to functional requirements to API endpoints to database tables.

| User Story | Functional Req | API Endpoint(s) | DB Tables | Component |
|------------|---------------|-----------------|-----------|-----------|
| US-01: Advisory Chat | FR-001, FR-002, FR-028, FR-029 | `POST /v1/copilot/runtime` | conversation, message | CopilotKit + LangGraph |
| US-02: Follow-Up | FR-003, FR-004 | `POST /v1/copilot/runtime` | conversation, message | LangGraph agent state |
| US-03: RAG Knowledge | FR-005 | `POST /v1/copilot/runtime` (internal RAG tool) | knowledge_document, knowledge_chunk | LlamaIndex |
| US-04: Citations | FR-006, FR-007 | `POST /v1/copilot/runtime` | message.citations | LangGraph synthesizer |
| US-05: Company Profile | FR-008, FR-009 | `POST /v1/onboarding`, `PUT /v1/profile` | organization, company_profile | Profile service |
| US-06: Preferences | FR-010 | `POST /v1/conversations/:id/messages/:id/feedback`, `GET /v1/preferences` | user_preference, message.feedback | Memory service |
| US-07: Conv Memory | FR-011, FR-012, FR-013 | `GET /v1/conversations`, `GET /v1/conversations/:id`, `GET /v1/conversations/search` | conversation, message | Memory service |
| US-08: Registration | FR-014, FR-015, FR-016 | `POST /v1/auth/signup`, `POST /v1/auth/login`, `POST /v1/auth/verify-email`, `POST /v1/auth/refresh`, `POST /v1/auth/logout` | user, refresh_token | @connectsw/auth |
| US-09: Data Isolation | FR-017, FR-018, FR-019 | All endpoints (middleware) | All tables (org_id filter) | Auth + Prisma middleware |
| US-10: Risk Dashboard | FR-020, FR-021 | `GET /v1/risks/summary`, `GET /v1/risks/:category` | risk_item, company_profile | Risk service |
| US-11: Risk Recommendations | FR-022 | `POST /v1/risks/:id/recommendations` | risk_item.mitigations | Risk service + LangGraph |
| US-12: TCO Calculator | FR-023, FR-024 | `POST /v1/costs/tco`, `GET /v1/costs/tco/:id`, `POST /v1/costs/tco/:id/analyze` | tco_comparison | Cost service |
| US-13: Cloud Spend | FR-027 | `POST /v1/costs/cloud-spend`, `GET /v1/costs/cloud-spend` | cloud_spend | Cost service |
| US-14: Tech Radar | FR-025, FR-026 | `GET /v1/radar`, `GET /v1/radar/:id` | tech_radar_item, company_profile | Radar service |

### NFR Coverage

| NFR | Implementation |
|-----|---------------|
| NFR-001 (Performance: streaming < 3s) | CopilotKit AG-UI streaming, LangGraph async execution |
| NFR-002 (Performance: full response < 15s) | Token budgeting, prompt optimization, timeout guards |
| NFR-003 (Performance: dashboard < 2s) | Redis caching for risk scores, pre-computed summaries |
| NFR-004 (Performance: vector search < 500ms) | HNSW index on pgvector, 100K embedding target |
| NFR-005 (Security: AES-256) | Sanitizer service + encryption service for sensitive fields |
| NFR-006 (Security: TLS 1.2+) | HSTS, HTTP redirect, provider-managed TLS |
| NFR-007 (Security: token storage) | In-memory JWT via @connectsw/auth/frontend TokenManager |
| NFR-008 (Security: OWASP) | Rate limiting, input validation, CORS, CSP, parameterized queries |
| NFR-009 (Security: rate limiting) | @fastify/rate-limit with Redis store, fallback to in-memory |
| NFR-010 (Accessibility: WCAG 2.1 AA) | shadcn/ui (accessible by default), keyboard nav, contrast ratios |
| NFR-011 (Scalability: 1K concurrent) | Connection pooling, Redis caching, horizontal scaling path |
| NFR-012 (Scalability: DB connections) | Prisma pool size = 50 |
| NFR-013 (Reliability: 99.5%) | Health checks, graceful degradation, monitoring |
| NFR-014 (Reliability: graceful degradation) | Redis fallback, OpenRouter fallback |
| NFR-015 (Reliability: no data loss) | PostgreSQL WAL, transaction safety |
| NFR-016 (Cost: < $0.05/interaction) | Token budgeting, response caching, prompt optimization |
| NFR-017 (Cost: token budgeting) | Per-tier limits, daily counters, cached common queries |

---

## 18. Technology Radar Visualization Architecture

The radar is a custom SVG component (not a library dependency) with D3.js for interactivity.

```mermaid
flowchart TD
    subgraph Frontend["Radar Frontend Component"]
        RADAR["TechRadar.tsx<br/><i>Custom SVG with D3.js<br/>4 rings x 4 quadrants</i>"]
        DETAIL["RadarDetailPanel.tsx<br/><i>Technology detail with<br/>personalized relevance</i>"]
        LIST["RadarListView.tsx<br/><i>Mobile fallback<br/>(viewport < 768px)</i>"]
        FILTER["Radar Filters<br/><i>All / My Stack /<br/>By Quadrant</i>"]
    end

    subgraph Backend["Radar API"]
        RAPI["GET /v1/radar<br/><i>All items + user stack overlay</i>"]
        RDETAIL["GET /v1/radar/:id<br/><i>Item detail + personalized<br/>relevance analysis</i>"]
    end

    subgraph Data["Radar Data"]
        ITEMS["tech_radar_items<br/><i>30+ seeded technologies<br/>with quadrant + ring</i>"]
        PROFILE["company_profile<br/><i>CTO's tech stack for<br/>highlight matching</i>"]
    end

    RADAR --> RAPI
    DETAIL --> RDETAIL
    FILTER --> RAPI
    RAPI --> ITEMS
    RAPI --> PROFILE
    RDETAIL --> ITEMS

    style RADAR fill:#be4bdb,color:#fff
    style DETAIL fill:#339af0,color:#fff
    style LIST fill:#339af0,color:#fff
```

### Radar Ring Definitions

| Ring | Meaning | Color |
|------|---------|-------|
| Adopt | Proven, recommended for production use | Green |
| Trial | Worth pursuing; safe to try in non-critical systems | Blue |
| Assess | Worth exploring; understand how it fits | Yellow |
| Hold | Proceed with caution; may be legacy or risky | Red |

### Radar Quadrant Definitions

| Quadrant | Contents |
|----------|----------|
| Languages & Frameworks | Programming languages, web/mobile/backend frameworks |
| Platforms & Infrastructure | Cloud services, databases, container orchestration, CI/CD |
| Tools | Development tools, monitoring, testing, security tools |
| Techniques | Architecture patterns, methodologies, practices |

---

## 19. Component Reuse Plan

| Need | Existing Component | Source | Action |
|------|-------------------|--------|--------|
| Auth (signup, login, JWT, refresh) | `@connectsw/auth` (backend + frontend) | `packages/auth/` | Direct import |
| Structured logging | `@connectsw/shared/utils/logger` | `packages/shared/` | Direct import |
| Password hashing | `@connectsw/shared/utils/crypto` | `packages/shared/` | Direct import |
| Prisma lifecycle | `@connectsw/shared/plugins/prisma` | `packages/shared/` | Direct import |
| Redis connection | `@connectsw/shared/plugins/redis` | `packages/shared/` | Direct import |
| UI components | `@connectsw/ui/components` | `packages/ui/` | Direct import |
| Dashboard layout | `@connectsw/ui/layout` | `packages/ui/` | Direct import |
| Dark mode | `@connectsw/ui/hooks/useTheme` | `packages/ui/` | Direct import |
| CopilotKit chat UI | `@copilotkit/react-ui` | npm | New dependency |
| LangGraph agent | `@langchain/langgraph` | npm | New dependency |
| LlamaIndex RAG | `llamaindex` | npm | New dependency |
| Tech radar visualization | None found | -- | Build custom (SVG + D3.js) |
| TCO calculator engine | None found | -- | Build custom (pure functions) |
| Risk scoring engine | None found | -- | Build custom (rule-based) |
| Data sanitizer for LLM | None found | -- | Build custom (add to registry) |

### New Components to Add to Registry After Implementation

| Component | Description | Reusable By |
|-----------|-------------|-------------|
| LLM Data Sanitizer | Strips PII/financials before LLM API calls | Any LLM-powered product |
| LangGraph Agent Base | Base agent graph with ReAct pattern | Any agentic product |
| CopilotKit Runtime Plugin | Fastify plugin for CopilotKit server | Any CopilotKit product |
| Embedding Service | OpenAI embedding generation with batching | Any RAG-enabled product |

---

## 20. Complexity Tracking

| Decision | Violates Simplicity? | Justification | Simpler Alternative Rejected |
|----------|---------------------|---------------|------------------------------|
| LangGraph for agent orchestration | No | CEO-mandated; provides state management, tool use, human-in-the-loop for complex advisory flows | Simple prompt chaining -- lacks state persistence and tool composition |
| CopilotKit for chat UI | No | CEO-mandated; provides streaming, generative UI, AG-UI protocol out of the box | Custom chat UI -- would require building SSE, streaming display, reasoning display from scratch |
| LlamaIndex for RAG | No | CEO-mandated; handles chunking, embedding, indexing, retrieval with optimized pipeline | Custom RAG pipeline -- same functionality but 3-5x more code to maintain |
| pgvector instead of Pinecone | No | Single database, simpler ops, sufficient for Phase 1 (100K embeddings) | Pinecone -- adds external dependency, cost, and complexity for Phase 1 scale |
| Redis for caching | No | ConnectSW standard, graceful degradation when unavailable | No caching -- would hit DB on every request, poor performance |
| Custom SVG radar | Yes (moderate) | No good open-source radar component matches ThoughtWorks-style with React integration | D3.js library component -- none found with 4-ring 4-quadrant radar |
| Hierarchical memory | No | Required by FR-012; simple 3-tier approach (recent/summary/facts) | No summarization -- would exceed context window on long conversations |

---

## 21. Constitution Check

| Article | Requirement | Status |
|---------|------------|--------|
| I. Spec-First | Specification exists at `products/ctoaas/docs/specs/ctoaas-foundation.md` | PASS |
| II. Component Reuse | COMPONENT-REGISTRY.md checked; 8 components reused, 4 new components planned | PASS |
| III. TDD | Test plan included in project structure (unit, integration, E2E directories) | PASS |
| IV. TypeScript | TypeScript 5+ with strict mode configured | PASS |
| V. Default Stack | Stack matches default (Fastify + Prisma + PostgreSQL + Next.js). New deps (CopilotKit, LangGraph, LlamaIndex) documented in ADRs | PASS |
| VII. Port Registry | Frontend: 3120, Backend: 5015 (already registered) | PASS |
| VIII. Git Safety | Branch: `foundation/ctoaas` | PASS |
| IX. Quality Gates | Multi-gate system applies | PASS |
| X. Diagram-First | 9 Mermaid diagrams included | PASS |
