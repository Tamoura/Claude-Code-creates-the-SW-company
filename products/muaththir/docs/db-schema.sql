-- Mu'aththir Database Schema (Reference)
-- ========================================
-- This file is for documentation only. Prisma is the source of truth.
-- See prisma/schema.prisma for the authoritative schema definition.
--
-- Database: muaththir_dev
-- PostgreSQL 15+
-- Last Updated: 2026-02-07

-- ===== ENUMS =====

CREATE TYPE subscription_tier AS ENUM ('free', 'premium');

CREATE TYPE digest_frequency AS ENUM ('off', 'daily', 'weekly');

CREATE TYPE dimension AS ENUM (
    'academic',
    'social_emotional',
    'behavioural',
    'aspirational',
    'islamic',
    'physical'
);

CREATE TYPE sentiment AS ENUM (
    'positive',
    'neutral',
    'needs_attention'
);

CREATE TYPE age_band AS ENUM (
    'early_years',    -- ages 3-5
    'primary',        -- ages 6-9
    'upper_primary',  -- ages 10-12
    'secondary'       -- ages 13-16
);

CREATE TYPE gender AS ENUM ('male', 'female');


-- ===== TABLES =====

-- Parents (users)
-- The primary account holders. Each parent owns children, observations, etc.
CREATE TABLE parents (
    id              TEXT PRIMARY KEY,         -- CUID
    email           TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    digest_frequency  digest_frequency NOT NULL DEFAULT 'off',
    reset_token     TEXT,                     -- password reset token
    reset_token_exp TIMESTAMPTZ,              -- reset token expiry (1hr)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Children
-- Each child belongs to one parent. Age band is computed from date_of_birth.
CREATE TABLE children (
    id              TEXT PRIMARY KEY,         -- CUID
    parent_id       TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    date_of_birth   DATE NOT NULL,
    gender          gender,                   -- nullable
    photo_url       TEXT,                     -- nullable, path to resized photo
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_children_parent_id ON children(parent_id);

-- Observations
-- Free-form text observations tagged to a child and dimension.
-- Soft-deleted via deleted_at timestamp.
CREATE TABLE observations (
    id              TEXT PRIMARY KEY,         -- CUID
    child_id        TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    dimension       dimension NOT NULL,
    content         VARCHAR(1000) NOT NULL,
    sentiment       sentiment NOT NULL,
    observed_at     DATE NOT NULL,            -- date the observation was made
    tags            TEXT[] NOT NULL DEFAULT '{}',  -- up to 5 tags
    deleted_at      TIMESTAMPTZ,              -- null = active, set = soft-deleted
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_observations_child_dimension ON observations(child_id, dimension);
CREATE INDEX idx_observations_child_date ON observations(child_id, observed_at);
CREATE INDEX idx_observations_child_deleted ON observations(child_id, deleted_at);
CREATE INDEX idx_observations_tags ON observations USING GIN (tags);

-- Milestone Definitions
-- Static seed data: 240+ milestones (10 per dimension per age band).
-- Read-only at runtime; loaded via Prisma seed script.
CREATE TABLE milestone_definitions (
    id              TEXT PRIMARY KEY,         -- CUID
    dimension       dimension NOT NULL,
    age_band        age_band NOT NULL,
    title           VARCHAR(100) NOT NULL,
    description     VARCHAR(300) NOT NULL,
    guidance        VARCHAR(500),             -- optional parent-facing tip
    sort_order      INT NOT NULL,

    UNIQUE(dimension, age_band, sort_order)
);

CREATE INDEX idx_milestones_dimension_band ON milestone_definitions(dimension, age_band);

-- Child Milestones (Progress Tracking)
-- Tracks which milestones each child has achieved.
-- One row per child-milestone pair (created on first interaction).
CREATE TABLE child_milestones (
    id              TEXT PRIMARY KEY,         -- CUID
    child_id        TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    milestone_id    TEXT NOT NULL REFERENCES milestone_definitions(id) ON DELETE CASCADE,
    achieved        BOOLEAN NOT NULL DEFAULT FALSE,
    achieved_at     TIMESTAMPTZ,              -- when marked as achieved
    achieved_history JSONB,                   -- [{achieved_at, unmarked_at}] for undo tracking
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(child_id, milestone_id)
);

CREATE INDEX idx_child_milestones_child ON child_milestones(child_id);
CREATE INDEX idx_child_milestones_milestone ON child_milestones(milestone_id);

-- Score Cache
-- Pre-calculated radar chart scores per child per dimension.
-- Invalidated (stale = true) on observation/milestone changes.
-- Recalculated on dashboard load when stale.
CREATE TABLE score_cache (
    id              TEXT PRIMARY KEY,         -- CUID
    child_id        TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    dimension       dimension NOT NULL,
    score           INT NOT NULL DEFAULT 0,   -- 0-100
    calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stale           BOOLEAN NOT NULL DEFAULT TRUE,

    UNIQUE(child_id, dimension)
);

CREATE INDEX idx_score_cache_child_stale ON score_cache(child_id, stale);

-- Sessions (Refresh Tokens)
-- Each active refresh token has a row. Deleted on logout or rotation.
CREATE TABLE sessions (
    id              TEXT PRIMARY KEY,         -- CUID
    parent_id       TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,      -- refresh token value
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_parent ON sessions(parent_id);


-- ===== HELPER FUNCTIONS =====

-- Calculate age band from date of birth
-- NOTE: This is for reference. In the application, age band is calculated
-- in TypeScript using date-fns. It is never stored in the database.
CREATE OR REPLACE FUNCTION calculate_age_band(dob DATE)
RETURNS age_band AS $$
DECLARE
    age_years INT;
BEGIN
    age_years := DATE_PART('year', AGE(CURRENT_DATE, dob));

    IF age_years >= 3 AND age_years <= 5 THEN
        RETURN 'early_years';
    ELSIF age_years >= 6 AND age_years <= 9 THEN
        RETURN 'primary';
    ELSIF age_years >= 10 AND age_years <= 12 THEN
        RETURN 'upper_primary';
    ELSIF age_years >= 13 AND age_years <= 16 THEN
        RETURN 'secondary';
    ELSE
        RETURN NULL;  -- out of range
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Calculate radar chart score for a dimension
-- NOTE: This is for reference. In the application, scores are calculated
-- in TypeScript in the dashboard service. This function shows the formula.
CREATE OR REPLACE FUNCTION calculate_dimension_score(
    p_child_id TEXT,
    p_dimension dimension
)
RETURNS INT AS $$
DECLARE
    obs_count INT;
    obs_positive INT;
    obs_total INT;
    milestone_achieved INT;
    milestone_total INT;
    obs_factor FLOAT;
    milestone_factor FLOAT;
    sentiment_factor FLOAT;
    score FLOAT;
    child_dob DATE;
    child_age_band age_band;
BEGIN
    -- Get child's age band
    SELECT date_of_birth INTO child_dob FROM children WHERE id = p_child_id;
    child_age_band := calculate_age_band(child_dob);

    -- Count observations in last 30 days (excluding soft-deleted)
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE sentiment = 'positive')
    INTO obs_total, obs_positive
    FROM observations
    WHERE child_id = p_child_id
      AND dimension = p_dimension
      AND deleted_at IS NULL
      AND observed_at >= CURRENT_DATE - INTERVAL '30 days';

    -- Observation factor: min(count, 10) / 10 * 100
    obs_factor := LEAST(obs_total, 10)::FLOAT / 10.0 * 100.0;

    -- Milestone factor: achieved / total * 100
    SELECT COUNT(*) INTO milestone_total
    FROM milestone_definitions
    WHERE dimension = p_dimension AND age_band = child_age_band;

    SELECT COUNT(*) INTO milestone_achieved
    FROM child_milestones cm
    JOIN milestone_definitions md ON cm.milestone_id = md.id
    WHERE cm.child_id = p_child_id
      AND md.dimension = p_dimension
      AND md.age_band = child_age_band
      AND cm.achieved = TRUE;

    IF milestone_total > 0 THEN
        milestone_factor := milestone_achieved::FLOAT / milestone_total::FLOAT * 100.0;
    ELSE
        milestone_factor := 0;
    END IF;

    -- Sentiment factor: positive / total * 100
    IF obs_total > 0 THEN
        sentiment_factor := obs_positive::FLOAT / obs_total::FLOAT * 100.0;
    ELSE
        sentiment_factor := 0;
    END IF;

    -- Final score: 40% observation + 40% milestone + 20% sentiment
    score := (obs_factor * 0.4) + (milestone_factor * 0.4) + (sentiment_factor * 0.2);

    RETURN ROUND(score)::INT;
END;
$$ LANGUAGE plpgsql STABLE;


-- ===== NOTES =====
--
-- 1. All IDs are CUIDs (Collision-resistant Unique Identifiers) generated
--    by the application layer, not by PostgreSQL.
--
-- 2. The age_band is NEVER stored on the child record. It is always
--    calculated from date_of_birth at query time. This ensures it stays
--    accurate as the child ages.
--
-- 3. Observations use soft delete (deleted_at timestamp). A scheduled job
--    should permanently delete records where deleted_at < NOW() - 30 days.
--
-- 4. The score_cache table acts as a write-through cache. Scores are
--    invalidated (stale = true) whenever observations or milestones change.
--    They are recalculated on the next dashboard load.
--
-- 5. The achieved_history JSONB column on child_milestones stores an array
--    like: [{"achieved_at": "2026-01-15T10:00:00Z", "unmarked_at": "2026-01-20T14:30:00Z"}]
--    This preserves the full history of mark/unmark actions.
--
-- 6. Tags on observations use PostgreSQL native TEXT[] array type with a
--    GIN index for efficient array containment queries (WHERE tags @> '{salah}').
--
-- 7. Milestone definitions are seeded via Prisma db seed. There should be
--    at least 240 records (6 dimensions x 4 age bands x 10 milestones).
