-- ============================================================================
-- Pulse - Database Schema (PostgreSQL 15+)
-- AI-Powered Developer Intelligence Platform
--
-- Version: 1.0
-- Last Updated: 2026-02-07
-- Database: pulse_dev
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- For gen_random_uuid()

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');

COMMENT ON TYPE user_role IS 'Team member role for RBAC. ADMIN has full access, MEMBER can view team data and connect own repos, VIEWER is read-only.';

CREATE TYPE sync_status AS ENUM ('idle', 'syncing', 'complete', 'error');

COMMENT ON TYPE sync_status IS 'Repository data ingestion status.';

CREATE TYPE pr_state AS ENUM ('open', 'closed', 'merged');

COMMENT ON TYPE pr_state IS 'Pull request state as reported by GitHub.';

CREATE TYPE review_state AS ENUM ('approved', 'changes_requested', 'commented', 'dismissed');

COMMENT ON TYPE review_state IS 'Pull request review state.';

CREATE TYPE deployment_status AS ENUM ('pending', 'in_progress', 'success', 'failure', 'error');

COMMENT ON TYPE deployment_status IS 'GitHub deployment status.';

CREATE TYPE deployment_environment AS ENUM ('production', 'staging', 'development', 'preview');

COMMENT ON TYPE deployment_environment IS 'Deployment target environment.';

CREATE TYPE metric_type AS ENUM (
  'prs_merged',
  'median_cycle_time',
  'median_review_time',
  'test_coverage',
  'avg_pr_size',
  'review_comments_per_pr',
  'merge_without_approval_rate',
  'commit_count',
  'deployment_count'
);

COMMENT ON TYPE metric_type IS 'Types of pre-computed metric snapshots.';

CREATE TYPE anomaly_type AS ENUM (
  'commit_frequency_drop',
  'stalled_pr',
  'coverage_drop',
  'risk_score_spike',
  'review_load_imbalance'
);

COMMENT ON TYPE anomaly_type IS 'Categories of anomaly detection.';

CREATE TYPE anomaly_severity AS ENUM ('low', 'medium', 'high');

COMMENT ON TYPE anomaly_severity IS 'Severity level of detected anomaly.';

CREATE TYPE notification_type AS ENUM (
  'pr_review_requested',
  'pr_reviewed',
  'pr_merged',
  'deployment',
  'anomaly',
  'risk_change'
);

COMMENT ON TYPE notification_type IS 'Push notification categories (aligned with user preference toggles).';

CREATE TYPE device_platform AS ENUM ('ios', 'android');

COMMENT ON TYPE device_platform IS 'Mobile device platform for push notifications.';

CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');

COMMENT ON TYPE risk_level IS 'Sprint risk severity: low (0-30), medium (31-60), high (61-100).';

-- ============================================================================
-- TABLES
-- ============================================================================

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT,                        -- NULL for GitHub-only auth users
  name              TEXT NOT NULL,
  github_username   TEXT UNIQUE,
  github_token      TEXT,                        -- AES-256-GCM encrypted at rest
  avatar_url        TEXT,
  timezone          TEXT DEFAULT 'UTC',
  email_verified    BOOLEAN DEFAULT FALSE,
  email_verify_token TEXT,
  email_verify_expires TIMESTAMPTZ,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'User accounts. Supports email/password and/or GitHub OAuth authentication.';
COMMENT ON COLUMN users.github_token IS 'GitHub OAuth access token, encrypted with AES-256-GCM. Decrypt with ENCRYPTION_KEY env var.';
COMMENT ON COLUMN users.password_hash IS 'bcrypt hash (cost factor 12). NULL for users who only use GitHub OAuth.';

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_github_username ON users (github_username) WHERE github_username IS NOT NULL;

-- ─── Teams ────────────────────────────────────────────────────────────────────

CREATE TABLE teams (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  timezone    TEXT DEFAULT 'UTC',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE teams IS 'Teams group users and repositories. First user to create a team is automatically ADMIN.';

CREATE INDEX idx_teams_slug ON teams (slug);

-- ─── Team Members (join table) ────────────────────────────────────────────────

CREATE TABLE team_members (
  id        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id   TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role      user_role NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, team_id)
);

COMMENT ON TABLE team_members IS 'Many-to-many relationship between users and teams with RBAC role.';

CREATE INDEX idx_team_members_user ON team_members (user_id);
CREATE INDEX idx_team_members_team ON team_members (team_id);
CREATE INDEX idx_team_members_team_role ON team_members (team_id, role);

-- ─── Repositories ─────────────────────────────────────────────────────────────

CREATE TABLE repositories (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id         TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  github_id       BIGINT NOT NULL,
  name            TEXT NOT NULL,
  full_name       TEXT NOT NULL,                -- e.g., "acme/backend-api"
  organization    TEXT,
  language        TEXT,
  default_branch  TEXT DEFAULT 'main',
  is_private      BOOLEAN DEFAULT FALSE,
  webhook_id      BIGINT,                       -- GitHub webhook ID for cleanup on disconnect
  webhook_secret  TEXT,                          -- HMAC secret for this repo's webhooks
  sync_status     sync_status DEFAULT 'idle',
  sync_progress   INTEGER DEFAULT 0 CHECK (sync_progress >= 0 AND sync_progress <= 100),
  sync_started_at TIMESTAMPTZ,
  sync_completed_at TIMESTAMPTZ,
  sync_error      TEXT,
  last_activity_at TIMESTAMPTZ,
  connected_at    TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,                  -- Set when user disconnects; data retained 30 days
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, github_id)
);

COMMENT ON TABLE repositories IS 'GitHub repositories monitored by a team. Webhook registration and sync status tracked per repo.';
COMMENT ON COLUMN repositories.webhook_secret IS 'Per-repo HMAC-SHA256 secret for verifying inbound GitHub webhooks.';
COMMENT ON COLUMN repositories.disconnected_at IS 'When set, data will be deleted 30 days after this timestamp.';

CREATE INDEX idx_repos_team ON repositories (team_id);
CREATE INDEX idx_repos_github_id ON repositories (github_id);
CREATE INDEX idx_repos_team_sync ON repositories (team_id, sync_status);
CREATE INDEX idx_repos_disconnected ON repositories (disconnected_at) WHERE disconnected_at IS NOT NULL;

-- ─── Commits ──────────────────────────────────────────────────────────────────

CREATE TABLE commits (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  repo_id                 TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  sha                     TEXT NOT NULL,
  message                 TEXT NOT NULL,
  author_github_username  TEXT,
  author_email            TEXT,
  committed_at            TIMESTAMPTZ NOT NULL,
  additions               INTEGER DEFAULT 0,
  deletions               INTEGER DEFAULT 0,
  branch                  TEXT,
  url                     TEXT,                   -- Link to GitHub commit
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repo_id, sha)
);

COMMENT ON TABLE commits IS 'Git commits ingested from GitHub. One row per unique commit per repository.';

CREATE INDEX idx_commits_repo ON commits (repo_id);
CREATE INDEX idx_commits_repo_date ON commits (repo_id, committed_at DESC);
CREATE INDEX idx_commits_author ON commits (author_github_username);
CREATE INDEX idx_commits_date ON commits (committed_at DESC);
-- Time-series optimization: BRIN index for sequential timestamp access
CREATE INDEX idx_commits_committed_brin ON commits USING BRIN (committed_at);

-- ─── Pull Requests ────────────────────────────────────────────────────────────

CREATE TABLE pull_requests (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  repo_id               TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  github_id             BIGINT NOT NULL,
  number                INTEGER NOT NULL,
  title                 TEXT NOT NULL,
  state                 pr_state NOT NULL DEFAULT 'open',
  author_github_username TEXT,
  author_avatar_url     TEXT,
  additions             INTEGER DEFAULT 0,
  deletions             INTEGER DEFAULT 0,
  commits_count         INTEGER DEFAULT 0,
  is_draft              BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL,      -- PR creation time on GitHub
  updated_at            TIMESTAMPTZ NOT NULL,
  merged_at             TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  first_review_at       TIMESTAMPTZ,               -- Computed: earliest review submitted_at
  draft_removed_at      TIMESTAMPTZ,               -- When draft status was removed (for cycle time calc)
  url                   TEXT,
  ingested_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repo_id, github_id)
);

COMMENT ON TABLE pull_requests IS 'GitHub pull requests. Tracks full lifecycle from open to merge/close.';
COMMENT ON COLUMN pull_requests.first_review_at IS 'Timestamp of first non-bot review. Used for time-to-first-review metric.';
COMMENT ON COLUMN pull_requests.draft_removed_at IS 'When draft status was removed. Cycle time starts from this if PR was opened as draft.';

CREATE INDEX idx_prs_repo ON pull_requests (repo_id);
CREATE INDEX idx_prs_repo_state ON pull_requests (repo_id, state);
CREATE INDEX idx_prs_repo_merged ON pull_requests (repo_id, merged_at DESC) WHERE merged_at IS NOT NULL;
CREATE INDEX idx_prs_author ON pull_requests (author_github_username);
CREATE INDEX idx_prs_created ON pull_requests (created_at DESC);
CREATE INDEX idx_prs_repo_created ON pull_requests (repo_id, created_at DESC);
-- For stalled PR detection: open PRs without reviews
CREATE INDEX idx_prs_open_no_review ON pull_requests (repo_id, created_at)
  WHERE state = 'open' AND first_review_at IS NULL;
-- BRIN for time-series queries
CREATE INDEX idx_prs_created_brin ON pull_requests USING BRIN (created_at);

-- ─── Reviews ──────────────────────────────────────────────────────────────────

CREATE TABLE reviews (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pr_id                   TEXT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  github_id               BIGINT NOT NULL,
  reviewer_github_username TEXT NOT NULL,
  reviewer_avatar_url     TEXT,
  state                   review_state NOT NULL,
  body                    TEXT,
  submitted_at            TIMESTAMPTZ NOT NULL,
  is_bot                  BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pr_id, github_id)
);

COMMENT ON TABLE reviews IS 'PR reviews. Bot reviews are tracked but excluded from time-to-first-review calculations.';

CREATE INDEX idx_reviews_pr ON reviews (pr_id);
CREATE INDEX idx_reviews_reviewer ON reviews (reviewer_github_username);
CREATE INDEX idx_reviews_submitted ON reviews (submitted_at DESC);
-- For first-review calculation: non-bot reviews per PR
CREATE INDEX idx_reviews_pr_nonbot ON reviews (pr_id, submitted_at)
  WHERE is_bot = FALSE;

-- ─── Deployments ──────────────────────────────────────────────────────────────

CREATE TABLE deployments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  repo_id         TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  github_id       BIGINT NOT NULL,
  environment     deployment_environment NOT NULL,
  status          deployment_status NOT NULL DEFAULT 'pending',
  commit_sha      TEXT,
  description     TEXT,
  url             TEXT,
  created_at      TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repo_id, github_id)
);

COMMENT ON TABLE deployments IS 'GitHub deployments. Tracks deployment events with environment and status.';

CREATE INDEX idx_deployments_repo ON deployments (repo_id);
CREATE INDEX idx_deployments_repo_env ON deployments (repo_id, environment);
CREATE INDEX idx_deployments_repo_date ON deployments (repo_id, created_at DESC);
CREATE INDEX idx_deployments_created_brin ON deployments USING BRIN (created_at);

-- ─── Coverage Reports ─────────────────────────────────────────────────────────

CREATE TABLE coverage_reports (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  repo_id     TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  commit_sha  TEXT NOT NULL,
  coverage    NUMERIC(5,1) NOT NULL CHECK (coverage >= 0 AND coverage <= 100),
  source      TEXT DEFAULT 'github_checks',     -- 'github_checks', 'manual_upload', 'ci_artifact'
  reported_at TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (repo_id, commit_sha)
);

COMMENT ON TABLE coverage_reports IS 'Test coverage data points. One per CI-triggering commit per repo.';
COMMENT ON COLUMN coverage_reports.coverage IS 'Test coverage percentage with 1 decimal precision (e.g., 87.3).';

CREATE INDEX idx_coverage_repo ON coverage_reports (repo_id);
CREATE INDEX idx_coverage_repo_date ON coverage_reports (repo_id, reported_at DESC);
CREATE INDEX idx_coverage_reported_brin ON coverage_reports USING BRIN (reported_at);

-- ─── Metric Snapshots (pre-computed aggregates) ───────────────────────────────

CREATE TABLE metric_snapshots (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id       TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  repo_id       TEXT REFERENCES repositories(id) ON DELETE CASCADE,  -- NULL = team-level aggregate
  metric        metric_type NOT NULL,
  value         NUMERIC NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  metadata      JSONB,                          -- Optional breakdown data (e.g., per-developer)
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE metric_snapshots IS 'Pre-computed metric aggregates for fast dashboard queries. One row per metric per period per team/repo.';
COMMENT ON COLUMN metric_snapshots.repo_id IS 'NULL means this is a team-level aggregate across all repos.';
COMMENT ON COLUMN metric_snapshots.metadata IS 'Breakdown data, e.g., per-developer PR counts as JSON.';

CREATE INDEX idx_metrics_team ON metric_snapshots (team_id);
CREATE INDEX idx_metrics_team_metric ON metric_snapshots (team_id, metric);
CREATE INDEX idx_metrics_team_metric_period ON metric_snapshots (team_id, metric, period_start DESC);
CREATE INDEX idx_metrics_repo_metric_period ON metric_snapshots (repo_id, metric, period_start DESC) WHERE repo_id IS NOT NULL;
-- Composite index for common dashboard query pattern
CREATE INDEX idx_metrics_team_period ON metric_snapshots (team_id, period_start DESC, period_end);

-- ─── Risk Snapshots ───────────────────────────────────────────────────────────

CREATE TABLE risk_snapshots (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id       TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  level         risk_level NOT NULL,
  explanation   TEXT NOT NULL,
  factors       JSONB NOT NULL,                 -- Array of { name, value, impactScore, weight, trend }
  recommendations JSONB,                         -- Array of { action, priority, relatedFactor, url }
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE risk_snapshots IS 'Sprint risk score history. Generated every 4 hours during work hours (8am-8pm).';

CREATE INDEX idx_risk_team ON risk_snapshots (team_id);
CREATE INDEX idx_risk_team_date ON risk_snapshots (team_id, calculated_at DESC);
-- Quick lookup for latest risk per team
CREATE INDEX idx_risk_latest ON risk_snapshots (team_id, calculated_at DESC);

-- ─── Notifications ────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,                            -- Deep link data (repoId, prNumber, etc.)
  read        BOOLEAN DEFAULT FALSE,
  dismissed   BOOLEAN DEFAULT FALSE,
  delivered   BOOLEAN DEFAULT FALSE,            -- Push notification sent to device
  queued_until TIMESTAMPTZ,                     -- For quiet hours: deliver after this time
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'User notifications. Retained for 30 days. Supports push delivery and quiet hours.';

CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE read = FALSE;
CREATE INDEX idx_notifications_user_date ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_queued ON notifications (queued_until) WHERE queued_until IS NOT NULL AND delivered = FALSE;
-- For cleanup job: delete notifications older than 30 days
CREATE INDEX idx_notifications_created ON notifications (created_at);

-- ─── Notification Preferences ─────────────────────────────────────────────────

CREATE TABLE notification_preferences (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  pr_review_requested BOOLEAN DEFAULT TRUE,
  pr_reviewed_merged  BOOLEAN DEFAULT TRUE,
  deployment_events   BOOLEAN DEFAULT TRUE,
  anomaly_alerts      BOOLEAN DEFAULT TRUE,
  risk_changes        BOOLEAN DEFAULT TRUE,
  quiet_hours_start   TIME,                     -- e.g., 22:00
  quiet_hours_end     TIME,                     -- e.g., 07:00
  email_digest        TEXT DEFAULT 'none' CHECK (email_digest IN ('none', 'daily', 'weekly')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notification_preferences IS 'Per-user notification settings. Auto-created with defaults on first access.';

CREATE INDEX idx_notif_prefs_user ON notification_preferences (user_id);

-- ─── Device Tokens (Push Notifications) ───────────────────────────────────────

CREATE TABLE device_tokens (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform    device_platform NOT NULL,
  token       TEXT NOT NULL,                    -- APNs or FCM token
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

COMMENT ON TABLE device_tokens IS 'Mobile device push notification tokens. Refreshed on each app launch, cleaned up after 30 days of inactivity.';

CREATE INDEX idx_device_tokens_user ON device_tokens (user_id);
CREATE INDEX idx_device_tokens_stale ON device_tokens (last_used_at) WHERE last_used_at < NOW() - INTERVAL '30 days';

-- ─── Team Invitations ─────────────────────────────────────────────────────────

CREATE TABLE team_invitations (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id     TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'MEMBER',
  invited_by  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, email)
);

COMMENT ON TABLE team_invitations IS 'Pending team invitations sent by email.';

CREATE INDEX idx_invitations_team ON team_invitations (team_id);
CREATE INDEX idx_invitations_email ON team_invitations (email);
CREATE INDEX idx_invitations_token ON team_invitations (token);

-- ─── Refresh Tokens ───────────────────────────────────────────────────────────

CREATE TABLE refresh_tokens (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,             -- SHA-256 hash of the refresh token
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE refresh_tokens IS 'Refresh tokens for silent JWT renewal. Stored as SHA-256 hashes.';

CREATE INDEX idx_refresh_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_token ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_expired ON refresh_tokens (expires_at) WHERE revoked = FALSE;

-- ─── Audit Log ────────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor         TEXT NOT NULL,                  -- User ID or 'system'
  action        TEXT NOT NULL,                  -- e.g., 'repo.connect', 'team.invite', 'auth.login'
  resource_type TEXT NOT NULL,                  -- e.g., 'repository', 'team', 'user'
  resource_id   TEXT NOT NULL,
  details       JSONB,
  ip            TEXT,
  user_agent    TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Audit trail for security-critical actions. Never deleted.';

CREATE INDEX idx_audit_actor ON audit_logs (actor);
CREATE INDEX idx_audit_action ON audit_logs (action);
CREATE INDEX idx_audit_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_logs (timestamp DESC);

-- ─── Job State (for idempotent background jobs) ──────────────────────────────

CREATE TABLE job_state (
  job_name          TEXT PRIMARY KEY,
  last_processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_duration_ms  INTEGER,
  last_status       TEXT DEFAULT 'success',     -- 'success' or 'error'
  last_error        TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE job_state IS 'Tracks last execution time for background jobs. Ensures idempotent processing.';

-- Pre-populate job state
INSERT INTO job_state (job_name, last_processed_at) VALUES
  ('metric_aggregation', NOW() - INTERVAL '2 hours'),
  ('risk_calculation', NOW() - INTERVAL '5 hours'),
  ('anomaly_detection', NOW() - INTERVAL '20 minutes'),
  ('github_sync', NOW() - INTERVAL '35 minutes'),
  ('data_cleanup', NOW() - INTERVAL '25 hours');

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_repos_updated_at BEFORE UPDATE ON repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_notif_prefs_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_job_state_updated_at BEFORE UPDATE ON job_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Tables: 15
--   - users, teams, team_members
--   - repositories, commits, pull_requests, reviews, deployments
--   - coverage_reports, metric_snapshots, risk_snapshots
--   - notifications, notification_preferences, device_tokens
--   - team_invitations, refresh_tokens, audit_logs, job_state
--
-- Indexes: 50+ (including BRIN indexes for time-series optimization)
-- Enums: 12
-- Triggers: 5 (updated_at auto-update)
--
-- Key Design Decisions:
--   - BRIN indexes on timestamp columns for efficient time-range queries
--   - Partial indexes for common query patterns (e.g., open PRs without reviews)
--   - Composite indexes for dashboard query patterns
--   - Foreign key cascading deletes for data consistency
--   - JSON columns (JSONB) for flexible data (metric breakdown, risk factors)
--   - TEXT primary keys (CUID format) for Prisma compatibility
-- ============================================================================
