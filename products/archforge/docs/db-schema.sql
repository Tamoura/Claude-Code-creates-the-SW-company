-- ============================================================
-- ArchForge Database Schema
-- PostgreSQL 15+
--
-- Author: Architect, ConnectSW
-- Date: 2026-02-19
-- Version: 1.0
--
-- This schema defines all tables, relationships, indexes,
-- and constraints for the ArchForge MVP.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Trigram indexes for search

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255),                 -- NULL for OAuth-only users
    full_name       VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    role            VARCHAR(20) NOT NULL DEFAULT 'member'
                    CHECK (role IN ('admin', 'member', 'viewer')),
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    totp_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
    totp_secret     VARCHAR(255),                 -- encrypted TOTP secret
    status          VARCHAR(20) NOT NULL DEFAULT 'registered'
                    CHECK (status IN ('registered', 'verified', 'active',
                                      'suspended', 'deactivated')),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_status ON users (status);

-- ============================================================
-- OAUTH ACCOUNTS
-- ============================================================
CREATE TABLE oauth_accounts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(20) NOT NULL
                        CHECK (provider IN ('google', 'github', 'microsoft')),
    provider_account_id VARCHAR(255) NOT NULL,
    access_token        TEXT,                     -- encrypted
    refresh_token       TEXT,                     -- encrypted
    token_expires_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (provider, provider_account_id)
);

CREATE INDEX idx_oauth_user ON oauth_accounts (user_id);

-- ============================================================
-- WORKSPACES
-- ============================================================
CREATE TABLE workspaces (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    plan        VARCHAR(20) NOT NULL DEFAULT 'free'
                CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
    settings    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspaces_owner ON workspaces (owner_id);
CREATE UNIQUE INDEX idx_workspaces_slug ON workspaces (slug);

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================
CREATE TABLE workspace_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_wm_workspace ON workspace_members (workspace_id);
CREATE INDEX idx_wm_user ON workspace_members (user_id);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE projects (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by              UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name                    VARCHAR(255) NOT NULL,
    description             TEXT,
    framework_preference    VARCHAR(20) NOT NULL DEFAULT 'auto'
                            CHECK (framework_preference IN ('archimate', 'c4',
                                                            'togaf', 'auto')),
    status                  VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'archived', 'deleted')),
    settings                JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at             TIMESTAMPTZ
);

CREATE INDEX idx_projects_workspace_status ON projects (workspace_id, status);
CREATE INDEX idx_projects_created_by ON projects (created_by);
CREATE INDEX idx_projects_name_trgm ON projects USING gin (name gin_trgm_ops);

-- ============================================================
-- ARTIFACTS
-- ============================================================
CREATE TABLE artifacts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name                VARCHAR(255) NOT NULL,
    type                VARCHAR(30) NOT NULL
                        CHECK (type IN ('archimate_diagram', 'c4_diagram',
                                        'togaf_view', 'bpmn_diagram', 'custom')),
    framework           VARCHAR(20) NOT NULL
                        CHECK (framework IN ('archimate', 'c4', 'togaf',
                                             'bpmn', 'custom')),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'in_review', 'approved',
                                          'published', 'archived')),
    canvas_data         JSONB NOT NULL DEFAULT '{"elements":[],"relationships":[],"viewport":{"x":0,"y":0,"zoom":1}}',
    svg_content         TEXT,
    nl_description      TEXT,                     -- original NL input
    current_version     INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artifacts_project_status ON artifacts (project_id, status);
CREATE INDEX idx_artifacts_created_by ON artifacts (created_by);
CREATE INDEX idx_artifacts_framework ON artifacts (framework);

-- ============================================================
-- ARTIFACT VERSIONS
-- ============================================================
CREATE TABLE artifact_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id     UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    version_number  INTEGER NOT NULL,
    canvas_data     JSONB NOT NULL,               -- snapshot of canvas at this version
    svg_content     TEXT,
    change_summary  TEXT,                         -- auto-generated or manual description
    change_type     VARCHAR(30) NOT NULL DEFAULT 'manual_edit'
                    CHECK (change_type IN ('manual_edit', 'ai_generation',
                                           'ai_refinement', 'restoration',
                                           'auto_save')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (artifact_id, version_number)
);

CREATE INDEX idx_versions_artifact ON artifact_versions (artifact_id, version_number);

-- ============================================================
-- ARTIFACT ELEMENTS
-- Denormalized from canvas_data JSONB for query performance.
-- Kept in sync by the CanvasService on every save.
-- ============================================================
CREATE TABLE artifact_elements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id     UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    element_id      VARCHAR(100) NOT NULL,        -- unique within artifact
    element_type    VARCHAR(100) NOT NULL,         -- e.g., ApplicationComponent
    framework       VARCHAR(20) NOT NULL
                    CHECK (framework IN ('archimate', 'c4', 'togaf',
                                         'bpmn', 'custom')),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    properties      JSONB NOT NULL DEFAULT '{}',  -- framework-specific props
    position        JSONB NOT NULL DEFAULT '{"x":0,"y":0,"width":200,"height":100}',
    layer           VARCHAR(30)
                    CHECK (layer IS NULL OR layer IN ('business', 'application',
                                                      'technology', 'motivation',
                                                      'strategy')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (artifact_id, element_id)
);

CREATE INDEX idx_elements_artifact ON artifact_elements (artifact_id);
CREATE INDEX idx_elements_type ON artifact_elements (element_type);

-- ============================================================
-- ARTIFACT RELATIONSHIPS
-- ============================================================
CREATE TABLE artifact_relationships (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id         UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    relationship_id     VARCHAR(100) NOT NULL,     -- unique within artifact
    source_element_id   VARCHAR(100) NOT NULL,
    target_element_id   VARCHAR(100) NOT NULL,
    relationship_type   VARCHAR(100) NOT NULL,     -- e.g., Serving, Composition
    framework           VARCHAR(20) NOT NULL
                        CHECK (framework IN ('archimate', 'c4', 'togaf',
                                             'bpmn', 'custom')),
    label               VARCHAR(255),
    properties          JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (artifact_id, relationship_id)
);

CREATE INDEX idx_relationships_artifact ON artifact_relationships (artifact_id);
CREATE INDEX idx_relationships_source ON artifact_relationships (artifact_id, source_element_id);
CREATE INDEX idx_relationships_target ON artifact_relationships (artifact_id, target_element_id);

-- ============================================================
-- TEMPLATES
-- ============================================================
CREATE TABLE templates (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(20) NOT NULL
                    CHECK (category IN ('industry', 'pattern', 'framework')),
    subcategory     VARCHAR(100),                 -- e.g., financial_services, microservices
    framework       VARCHAR(20) NOT NULL
                    CHECK (framework IN ('archimate', 'c4', 'togaf', 'multi')),
    canvas_data     JSONB NOT NULL,
    svg_preview     TEXT,
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,
    usage_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_gallery ON templates (category, subcategory, is_public);
CREATE INDEX idx_templates_framework ON templates (framework, is_public);
CREATE INDEX idx_templates_created_by ON templates (created_by);
CREATE INDEX idx_templates_name_trgm ON templates USING gin (name gin_trgm_ops);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE comments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id         UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    author_id           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    parent_comment_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
    element_id          VARCHAR(100),              -- NULL if not anchored to element
    body                TEXT NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'resolved')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ
);

CREATE INDEX idx_comments_artifact_status ON comments (artifact_id, status);
CREATE INDEX idx_comments_author ON comments (author_id);
CREATE INDEX idx_comments_parent ON comments (parent_comment_id);
CREATE INDEX idx_comments_element ON comments (artifact_id, element_id)
    WHERE element_id IS NOT NULL;

-- ============================================================
-- SHARES
-- ============================================================
CREATE TABLE shares (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id     UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    shared_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    shared_with     UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL for link shares
    email           VARCHAR(255),                 -- for pending invitations
    permission      VARCHAR(20) NOT NULL
                    CHECK (permission IN ('view', 'comment', 'edit')),
    share_type      VARCHAR(10) NOT NULL
                    CHECK (share_type IN ('invite', 'link')),
    link_token      VARCHAR(255) UNIQUE,          -- for link-based shares
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shares_artifact ON shares (artifact_id);
CREATE INDEX idx_shares_shared_with ON shares (shared_with);
CREATE INDEX idx_shares_link_token ON shares (link_token)
    WHERE link_token IS NOT NULL;

-- ============================================================
-- EXPORTS
-- ============================================================
CREATE TABLE exports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id     UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    format          VARCHAR(20) NOT NULL
                    CHECK (format IN ('png', 'svg', 'pdf', 'plantuml',
                                      'archimate_xml', 'mermaid', 'drawio')),
    file_url        TEXT NOT NULL,                 -- S3 presigned URL or key
    file_size_bytes INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_exports_artifact ON exports (artifact_id);
CREATE INDEX idx_exports_user ON exports (user_id);
CREATE INDEX idx_exports_expires ON exports (expires_at);

-- ============================================================
-- DOCUMENT UPLOADS
-- ============================================================
CREATE TABLE document_uploads (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    original_filename   VARCHAR(500) NOT NULL,
    file_type           VARCHAR(10) NOT NULL
                        CHECK (file_type IN ('pdf', 'docx', 'txt', 'md', 'html')),
    file_size_bytes     INTEGER NOT NULL,
    storage_key         VARCHAR(500),              -- S3 key (NULL after processing)
    processing_status   VARCHAR(20) NOT NULL DEFAULT 'uploaded'
                        CHECK (processing_status IN ('uploaded', 'processing',
                                                     'completed', 'failed')),
    extraction_result   JSONB,                     -- extracted components & relationships
    error_message       TEXT,                      -- populated on failure
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at        TIMESTAMPTZ
);

CREATE INDEX idx_uploads_project ON document_uploads (project_id);
CREATE INDEX idx_uploads_status ON document_uploads (processing_status);

-- ============================================================
-- API KEYS
-- ============================================================
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    key_hash        VARCHAR(255) NOT NULL UNIQUE,  -- HMAC-SHA256 hash
    key_prefix      VARCHAR(10) NOT NULL,          -- first 8 chars for identification
    permissions     JSONB NOT NULL DEFAULT '{"read": true, "write": false}',
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_apikeys_user ON api_keys (user_id);
CREATE INDEX idx_apikeys_hash ON api_keys (key_hash);

-- ============================================================
-- SESSIONS (refresh tokens)
-- ============================================================
CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    jti             VARCHAR(255) NOT NULL UNIQUE,   -- JWT ID for revocation
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_jti ON sessions (jti);
CREATE INDEX idx_sessions_expires ON sessions (expires_at)
    WHERE revoked_at IS NULL;

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    resource_id     UUID,
    resource_type   VARCHAR(30) NOT NULL
                    CHECK (resource_type IN ('user', 'project', 'artifact',
                                             'template', 'comment', 'share',
                                             'export', 'api_key')),
    action          VARCHAR(30) NOT NULL
                    CHECK (action IN ('create', 'read', 'update', 'delete',
                                      'share', 'export', 'login', 'logout',
                                      'register', 'verify_email', 'generate',
                                      'ingest', 'restore', 'archive')),
    metadata        JSONB NOT NULL DEFAULT '{}',   -- additional context
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition audit_log by month for performance (optional, enable for production)
-- CREATE TABLE audit_log (...) PARTITION BY RANGE (created_at);

CREATE INDEX idx_audit_user_time ON audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_log (resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_log (action, created_at DESC);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE notification_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email_comments  BOOLEAN NOT NULL DEFAULT TRUE,
    email_shares    BOOLEAN NOT NULL DEFAULT TRUE,
    email_reviews   BOOLEAN NOT NULL DEFAULT TRUE,
    email_system    BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_comments BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_shares   BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_reviews  BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- Automatically update the updated_at column on row modification.
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_artifacts_updated_at
    BEFORE UPDATE ON artifacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_artifact_elements_updated_at
    BEFORE UPDATE ON artifact_elements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_notification_prefs_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TABLE SUMMARY
-- ============================================================
-- 15 tables total:
--
--  1. users                    - User accounts
--  2. oauth_accounts           - Linked OAuth providers (Google, GitHub, Microsoft)
--  3. workspaces               - Organizational containers for projects
--  4. workspace_members        - Workspace membership and roles
--  5. projects                 - Architecture projects within workspaces
--  6. artifacts                - Generated EA artifacts (diagrams, models)
--  7. artifact_versions        - Version history for artifacts
--  8. artifact_elements        - Denormalized elements for query performance
--  9. artifact_relationships   - Denormalized relationships for query performance
-- 10. templates                - Template library (public and personal)
-- 11. comments                 - Threaded comments on artifacts
-- 12. shares                   - Artifact sharing (invite and link-based)
-- 13. exports                  - Export history with download URLs
-- 14. document_uploads         - Uploaded documents for ingestion
-- 15. api_keys                 - Programmatic API keys
-- 16. sessions                 - Refresh token sessions
-- 17. audit_log                - Comprehensive audit trail
-- 18. notification_preferences - User notification settings
