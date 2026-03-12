-- CTOaaS Database Schema
-- PostgreSQL 15+ with pgvector extension
-- Created: 2026-03-12
-- Author: Architect Agent
--
-- Schema traces to:
--   US-08, US-09 (auth + data isolation)
--   US-05 (company profile)
--   US-01, US-02, US-07 (conversations + memory)
--   US-03, US-04 (knowledge + RAG)
--   US-10, US-11 (risk items)
--   US-12 (TCO comparison)
--   US-13 (cloud spend)
--   US-14 (tech radar)
--   US-06 (user preferences)

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search on conversations

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    industry        VARCHAR(100) NOT NULL,
    employee_count  INTEGER NOT NULL CHECK (employee_count > 0),
    growth_stage    VARCHAR(50) NOT NULL CHECK (growth_stage IN ('seed', 'series-a', 'series-b', 'series-c', 'growth', 'enterprise')),
    founded_year    INTEGER,
    challenges      JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_industry ON organizations(industry);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id                 UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email                           VARCHAR(255) NOT NULL UNIQUE,
    name                            VARCHAR(255) NOT NULL,
    password_hash                   VARCHAR(255) NOT NULL,
    role                            VARCHAR(50) NOT NULL DEFAULT 'cto' CHECK (role IN ('cto', 'vp_eng', 'co_founder', 'admin')),
    email_verified                  BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token              VARCHAR(255),
    verification_token_expires_at   TIMESTAMPTZ,
    failed_login_attempts           INTEGER NOT NULL DEFAULT 0,
    locked_until                    TIMESTAMPTZ,
    tier                            VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
    daily_message_count             INTEGER NOT NULL DEFAULT 0,
    daily_message_reset_date        DATE,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;

-- ============================================================
-- COMPANY PROFILES
-- ============================================================
CREATE TABLE company_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    tech_stack          JSONB NOT NULL DEFAULT '{}'::jsonb,
    cloud_provider      VARCHAR(50),
    architecture_notes  TEXT,
    constraints         TEXT,
    profile_completeness INTEGER NOT NULL DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
    onboarding_state    JSONB DEFAULT '{"currentStep": 1, "completed": false}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_profiles_organization_id ON company_profiles(organization_id);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE conversations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(255),
    summary             TEXT,               -- Compressed older messages (medium-term memory)
    long_term_memory    TEXT,               -- Extracted key facts (long-term memory)
    message_count       INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role                VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content             TEXT NOT NULL,
    citations           JSONB,              -- Array of citation objects
    confidence          VARCHAR(10) CHECK (confidence IN ('high', 'medium', 'low')),
    feedback            VARCHAR(10) CHECK (feedback IN ('up', 'down')),
    token_count         INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
-- Full-text search index for conversation search (FR-013)
CREATE INDEX idx_messages_content_trgm ON messages USING gin(content gin_trgm_ops);

-- ============================================================
-- KNOWLEDGE DOCUMENTS (RAG source material)
-- ============================================================
CREATE TABLE knowledge_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(500) NOT NULL,
    source          VARCHAR(255) NOT NULL,      -- e.g., "Netflix Engineering Blog"
    author          VARCHAR(255),
    published_date  DATE,
    url             VARCHAR(2048),
    content         TEXT,
    category        VARCHAR(100) NOT NULL,       -- e.g., "microservices", "database", "devops"
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_documents_category ON knowledge_documents(category);
CREATE INDEX idx_knowledge_documents_status ON knowledge_documents(status);

-- ============================================================
-- KNOWLEDGE CHUNKS (embedded vectors for RAG retrieval)
-- ============================================================
CREATE TABLE knowledge_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    embedding       vector(1536),           -- OpenAI text-embedding-3-small dimensions
    token_count     INTEGER,
    chunk_index     INTEGER NOT NULL
);

CREATE INDEX idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
-- HNSW index for fast vector similarity search (< 500ms at 100K vectors)
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ============================================================
-- RISK ITEMS
-- ============================================================
CREATE TABLE risk_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category            VARCHAR(50) NOT NULL CHECK (category IN ('tech-debt', 'vendor', 'compliance', 'operational')),
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    severity            INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 10),
    trend               VARCHAR(20) NOT NULL DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'worsening')),
    status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'dismissed')),
    mitigations         JSONB DEFAULT '[]'::jsonb,
    affected_systems    JSONB DEFAULT '[]'::jsonb,
    identified_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_risk_items_organization_id ON risk_items(organization_id);
CREATE INDEX idx_risk_items_category ON risk_items(category);
CREATE INDEX idx_risk_items_status ON risk_items(status);
CREATE INDEX idx_risk_items_severity ON risk_items(severity DESC);

-- ============================================================
-- TCO COMPARISONS
-- ============================================================
CREATE TABLE tco_comparisons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    options         JSONB NOT NULL,             -- Array of option objects with cost parameters
    projections     JSONB,                      -- Calculated 3-year projections
    ai_analysis     TEXT,                       -- AI-generated analysis
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tco_comparisons_user_id ON tco_comparisons(user_id);

-- ============================================================
-- CLOUD SPEND
-- ============================================================
CREATE TABLE cloud_spend (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider            VARCHAR(20) NOT NULL CHECK (provider IN ('aws', 'gcp', 'azure', 'other')),
    spend_breakdown     JSONB NOT NULL,         -- { compute, storage, database, networking, other }
    total_monthly       DECIMAL(12,2) NOT NULL,
    benchmarks          JSONB,                  -- Comparison against industry averages
    recommendations     JSONB,                  -- AI-generated recommendations
    import_source       VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (import_source IN ('manual', 'csv', 'json')),
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cloud_spend_user_id ON cloud_spend(user_id);
CREATE INDEX idx_cloud_spend_organization_id ON cloud_spend(organization_id);
CREATE INDEX idx_cloud_spend_period ON cloud_spend(period_start, period_end);

-- ============================================================
-- TECH RADAR ITEMS (shared reference data, not org-scoped)
-- ============================================================
CREATE TABLE tech_radar_items (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    VARCHAR(100) NOT NULL UNIQUE,
    quadrant                VARCHAR(50) NOT NULL CHECK (quadrant IN ('languages-frameworks', 'platforms-infrastructure', 'tools', 'techniques')),
    ring                    VARCHAR(10) NOT NULL CHECK (ring IN ('adopt', 'trial', 'assess', 'hold')),
    description             TEXT,
    rationale               TEXT,
    is_new                  BOOLEAN NOT NULL DEFAULT FALSE,
    related_technologies    JSONB DEFAULT '[]'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tech_radar_items_quadrant ON tech_radar_items(quadrant);
CREATE INDEX idx_tech_radar_items_ring ON tech_radar_items(ring);

-- ============================================================
-- USER PREFERENCES (learned over time from feedback)
-- ============================================================
CREATE TABLE user_preferences (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    preference_key      VARCHAR(100) NOT NULL,
    preference_value    TEXT,
    signal_count        INTEGER NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================
-- REFRESH TOKENS (for JWT rotation)
-- ============================================================
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jti             VARCHAR(255) NOT NULL UNIQUE,
    revoked         BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_jti ON refresh_tokens(jti);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100),
    entity_id       UUID,
    metadata        JSONB DEFAULT '{}'::jsonb,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
-- BRIN index for time-series queries (learned pattern from pulse product)
CREATE INDEX idx_audit_logs_created_at_brin ON audit_logs USING brin(created_at);

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_company_profiles_updated_at
    BEFORE UPDATE ON company_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_risk_items_updated_at
    BEFORE UPDATE ON risk_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tco_comparisons_updated_at
    BEFORE UPDATE ON tco_comparisons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tech_radar_items_updated_at
    BEFORE UPDATE ON tech_radar_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA: Tech Radar Items (30+ technologies)
-- ============================================================
INSERT INTO tech_radar_items (name, quadrant, ring, description, rationale, is_new) VALUES
-- Languages & Frameworks
('TypeScript', 'languages-frameworks', 'adopt', 'Typed superset of JavaScript for both frontend and backend development.', 'Production-proven across all ConnectSW products. Type safety prevents entire class of runtime errors. Excellent tooling ecosystem.', false),
('Rust', 'languages-frameworks', 'trial', 'Systems programming language focused on safety, speed, and concurrency.', 'Growing adoption for performance-critical services. Memory safety without garbage collection. Strong in WebAssembly and infrastructure tooling.', false),
('Go', 'languages-frameworks', 'trial', 'Simple, fast, concurrent language by Google for cloud services.', 'Excellent for microservices and CLI tools. Simple concurrency model. Fast compilation. Growing in cloud-native ecosystem.', false),
('Next.js', 'languages-frameworks', 'adopt', 'React framework with SSR, SSG, and App Router for full-stack web applications.', 'Standard at ConnectSW. App Router provides excellent DX. Server Components reduce client bundle. Vercel ecosystem is mature.', false),
('Fastify', 'languages-frameworks', 'adopt', 'High-performance Node.js web framework with plugin architecture.', 'ConnectSW default backend framework. 2x faster than Express. Excellent TypeScript support. Plugin system enables clean separation.', false),
('Svelte/SvelteKit', 'languages-frameworks', 'assess', 'Compiler-based frontend framework with minimal runtime overhead.', 'Interesting compilation approach reduces bundle size. Growing community. Worth watching for specific use cases.', true),
('Deno', 'languages-frameworks', 'assess', 'Secure JavaScript/TypeScript runtime by Node.js creator.', 'Built-in TypeScript support and security model are appealing. Ecosystem still maturing. JSR registry is promising.', false),
('React Native', 'languages-frameworks', 'trial', 'Cross-platform mobile framework using React.', 'Enables code sharing between web and mobile. New Architecture improves performance. Good for teams with React expertise.', false),

-- Platforms & Infrastructure
('PostgreSQL', 'platforms-infrastructure', 'adopt', 'Advanced open-source relational database with extensibility.', 'ConnectSW default database. pgvector extension enables RAG. JSON support, full-text search, excellent performance.', false),
('Redis', 'platforms-infrastructure', 'adopt', 'In-memory data store for caching, sessions, and rate limiting.', 'ConnectSW standard for caching. Simple protocol, fast, reliable. Graceful degradation pattern established.', false),
('Kubernetes', 'platforms-infrastructure', 'adopt', 'Container orchestration platform for production deployments.', 'Industry standard for container orchestration. Managed offerings (EKS, GKE, AKS) reduce operational burden.', false),
('AWS', 'platforms-infrastructure', 'adopt', 'Comprehensive cloud platform with broadest service offering.', 'Market leader with deepest service catalog. Strong enterprise adoption. Well-documented patterns.', false),
('Cloudflare Workers', 'platforms-infrastructure', 'trial', 'Edge computing platform with V8 isolates for serverless functions.', 'Excellent for edge caching, API gateways, and light compute. R2 for storage. Zero cold starts.', true),
('Neon', 'platforms-infrastructure', 'trial', 'Serverless Postgres with branching and auto-scaling.', 'Database branching enables per-PR preview environments. Serverless pricing model. pgvector support.', true),
('Supabase', 'platforms-infrastructure', 'trial', 'Open-source Firebase alternative built on PostgreSQL.', 'Combines Postgres with auth, storage, and real-time. Good for rapid prototyping. Self-hostable.', false),
('CockroachDB', 'platforms-infrastructure', 'assess', 'Distributed SQL database with strong consistency and horizontal scaling.', 'For globally distributed applications. PostgreSQL wire compatibility. High operational complexity.', false),

-- Tools
('CopilotKit', 'tools', 'adopt', 'React framework for building AI copilot experiences with streaming and generative UI.', 'Selected for CTOaaS. AG-UI protocol provides real-time agent reasoning visibility. Reduces custom AI UI code by 80%.', true),
('LangGraph', 'tools', 'adopt', 'Stateful agent orchestration framework for multi-step AI workflows.', 'Selected for CTOaaS. Used by Uber, LinkedIn, Replit. Durable execution, tool use, human-in-the-loop.', true),
('LlamaIndex', 'tools', 'adopt', 'Data framework for RAG applications with document ingestion and retrieval.', 'Selected for CTOaaS. TypeScript support, 40% faster than alternatives. Excellent chunking and indexing.', true),
('Prisma', 'tools', 'adopt', 'Type-safe ORM for Node.js and TypeScript with migration management.', 'ConnectSW standard ORM. Auto-generated types from schema. Excellent migration workflow.', false),
('Playwright', 'tools', 'adopt', 'Cross-browser E2E testing framework with auto-wait and trace viewer.', 'ConnectSW standard for E2E tests. Reliable, fast, excellent debugging tools.', false),
('Turborepo', 'tools', 'assess', 'High-performance monorepo build system by Vercel.', 'Could improve CI times for ConnectSW monorepo. Remote caching is appealing. Added complexity may not justify yet.', false),
('Biome', 'tools', 'trial', 'Fast formatter and linter replacing ESLint + Prettier.', 'Written in Rust, 10-100x faster than ESLint. Unified tool reduces config. Still maturing for plugin ecosystem.', true),
('Semgrep', 'tools', 'adopt', 'Static analysis tool for finding security vulnerabilities.', 'ConnectSW CI pipeline standard. Custom rules for OWASP checks. Low false positive rate.', false),

-- Techniques
('RAG (Retrieval-Augmented Generation)', 'techniques', 'adopt', 'Combining LLM generation with document retrieval for grounded responses.', 'Core technique for CTOaaS. Reduces hallucination, enables source citations. Proven at scale.', false),
('ReAct Pattern', 'techniques', 'adopt', 'Reasoning + Acting loop for LLM agents with tool use.', 'Standard pattern for agentic AI. Agent reasons about what to do, acts (calls tools), observes results, repeats.', false),
('Agentic AI', 'techniques', 'trial', 'AI systems that autonomously plan, execute, and adapt multi-step workflows.', 'Emerging paradigm beyond simple chatbots. LangGraph and CopilotKit enable production agentic systems.', true),
('Feature Flags', 'techniques', 'adopt', 'Runtime feature toggling for gradual rollouts and A/B testing.', 'Essential for SaaS products. Enables freemium gating, gradual feature releases, and safe experimentation.', false),
('Event Sourcing', 'techniques', 'assess', 'Storing all state changes as an append-only event log.', 'Useful for audit trails and decision history tracking. Added complexity may not justify for Phase 1.', false),
('Domain-Driven Design', 'techniques', 'trial', 'Software design approach modeling complex business domains.', 'Useful for CTOaaS domain modeling (risk, cost, radar). Bounded contexts help isolate complexity.', false),
('Trunk-Based Development', 'techniques', 'adopt', 'Development model with short-lived feature branches merged to main frequently.', 'ConnectSW standard. Reduces merge conflicts. Feature flags enable incomplete work on main.', false);
