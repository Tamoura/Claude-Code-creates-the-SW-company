# Pulse - Data Model Documentation

**Version**: 1.0
**Last Updated**: 2026-02-07
**Author**: Data Engineer
**Source**: `products/pulse/docs/db-schema.sql`

---

## 1. Entity Relationship Diagram

```
                           +-----------+
                           |   users   |
                           +-----+-----+
                                 |
              +------------------+------------------+
              |                  |                  |
       (1:M)  |           (M:N via)           (1:1) |
              v           team_members              v
     +--------+--------+       |        +-----------+-----------+
     | refresh_tokens   |       |        | notification_prefs   |
     +-----------------+       |        +-----------------------+
              |                |
              |           +----+----+
              |           |  teams  |
              |           +----+----+
              |                |
              |    +-----------+-----------+
              |    |                       |
              v    v                       v
     +--------+--------+       +-----------+-----------+
     | device_tokens    |       | team_invitations      |
     +-----------------+       +-----------------------+
              |
              |
     +--------+--------+
     | notifications    |
     +-----------------+

                           +----+----+
                           |  teams  |
                           +----+----+
                                |
                +---------------+---------------+
                |               |               |
          (1:M) |         (1:M) |         (1:M) |
                v               v               v
     +----------+--+   +-------+-------+  +-----+--------+
     | repositories |   | metric_       |  | risk_        |
     +----------+--+   | snapshots     |  | snapshots    |
                |       +---------------+  +--------------+
                |
    +-----------+-----------+-----------+
    |           |           |           |
    v           v           v           v
 +--+----+ +---+------+ +--+------+ +--+----------+
 |commits| |pull_     | |deploy-  | |coverage_    |
 +-------+ |requests  | |ments    | |reports      |
            +---+------+ +---------+ +-------------+
                |
                v
            +---+------+
            | reviews  |
            +----------+

 Standalone:
 +------------+    +-----------+
 | audit_logs |    | job_state |
 +------------+    +-----------+
```

### Relationship Summary

| Parent | Child | Relationship | FK Cascade |
|--------|-------|-------------|------------|
| users | team_members | 1:M | ON DELETE CASCADE |
| users | refresh_tokens | 1:M | ON DELETE CASCADE |
| users | notifications | 1:M | ON DELETE CASCADE |
| users | notification_preferences | 1:1 | ON DELETE CASCADE |
| users | device_tokens | 1:M | ON DELETE CASCADE |
| users | team_invitations (invited_by) | 1:M | ON DELETE CASCADE |
| teams | team_members | 1:M | ON DELETE CASCADE |
| teams | repositories | 1:M | ON DELETE CASCADE |
| teams | metric_snapshots | 1:M | ON DELETE CASCADE |
| teams | risk_snapshots | 1:M | ON DELETE CASCADE |
| teams | team_invitations | 1:M | ON DELETE CASCADE |
| repositories | commits | 1:M | ON DELETE CASCADE |
| repositories | pull_requests | 1:M | ON DELETE CASCADE |
| repositories | deployments | 1:M | ON DELETE CASCADE |
| repositories | coverage_reports | 1:M | ON DELETE CASCADE |
| repositories | metric_snapshots | 1:M (optional) | ON DELETE CASCADE |
| pull_requests | reviews | 1:M | ON DELETE CASCADE |

---

## 2. Table Descriptions

### 2.1 users

**Purpose**: User accounts supporting email/password and/or GitHub OAuth authentication.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | CUID-compatible identifier |
| email | TEXT | NO | - | UNIQUE | User email address |
| password_hash | TEXT | YES | - | - | bcrypt hash (cost 12). NULL for GitHub-only users |
| name | TEXT | NO | - | - | Display name |
| github_username | TEXT | YES | - | UNIQUE | GitHub username for linking commits/PRs |
| github_token | TEXT | YES | - | - | AES-256-GCM encrypted GitHub OAuth token |
| avatar_url | TEXT | YES | - | - | Profile picture URL |
| timezone | TEXT | YES | 'UTC' | - | User's timezone (IANA format) |
| email_verified | BOOLEAN | YES | FALSE | - | Whether email has been verified |
| email_verify_token | TEXT | YES | - | - | Token sent for email verification |
| email_verify_expires | TIMESTAMPTZ | YES | - | - | Verification token expiry |
| password_reset_token | TEXT | YES | - | - | Password reset token |
| password_reset_expires | TIMESTAMPTZ | YES | - | - | Reset token expiry |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Account creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Auto-trigger | Last modification timestamp |

### 2.2 teams

**Purpose**: Teams group users and repositories. First creator is automatically ADMIN.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Team identifier |
| name | TEXT | NO | - | - | Team display name |
| slug | TEXT | NO | - | UNIQUE | URL-friendly team identifier |
| timezone | TEXT | YES | 'UTC' | - | Team timezone for job windowing |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Auto-trigger | Last modification timestamp |

### 2.3 team_members

**Purpose**: Many-to-many join table between users and teams with RBAC role assignment.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Membership identifier |
| user_id | TEXT | NO | - | FK -> users(id) | The user |
| team_id | TEXT | NO | - | FK -> teams(id) | The team |
| role | user_role | NO | 'MEMBER' | ENUM | ADMIN, MEMBER, or VIEWER |
| joined_at | TIMESTAMPTZ | NO | NOW() | - | When user joined the team |
| | | | | UNIQUE(user_id, team_id) | One membership per user per team |

### 2.4 repositories

**Purpose**: GitHub repositories monitored by a team. Tracks webhook registration, sync status, and connection lifecycle.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Repository identifier |
| team_id | TEXT | NO | - | FK -> teams(id) | Owning team |
| github_id | BIGINT | NO | - | - | GitHub's repository ID |
| name | TEXT | NO | - | - | Repository name (e.g., "backend-api") |
| full_name | TEXT | NO | - | - | Full name (e.g., "acme/backend-api") |
| organization | TEXT | YES | - | - | GitHub organization name |
| language | TEXT | YES | - | - | Primary programming language |
| default_branch | TEXT | YES | 'main' | - | Default branch name |
| is_private | BOOLEAN | YES | FALSE | - | Whether repo is private |
| webhook_id | BIGINT | YES | - | - | GitHub webhook ID for cleanup |
| webhook_secret | TEXT | YES | - | - | Per-repo HMAC-SHA256 secret |
| sync_status | sync_status | YES | 'idle' | ENUM | Current ingestion status |
| sync_progress | INTEGER | YES | 0 | CHECK 0-100 | Ingestion percentage |
| sync_started_at | TIMESTAMPTZ | YES | - | - | When sync began |
| sync_completed_at | TIMESTAMPTZ | YES | - | - | When sync finished |
| sync_error | TEXT | YES | - | - | Error message if sync failed |
| last_activity_at | TIMESTAMPTZ | YES | - | - | Most recent event timestamp |
| connected_at | TIMESTAMPTZ | YES | NOW() | - | When monitoring started |
| disconnected_at | TIMESTAMPTZ | YES | - | - | When disconnected (data retained 30d) |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Record creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Auto-trigger | Last modification timestamp |
| | | | | UNIQUE(team_id, github_id) | One entry per repo per team |

### 2.5 commits

**Purpose**: Git commits ingested from GitHub. One row per unique commit per repository.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Commit record identifier |
| repo_id | TEXT | NO | - | FK -> repositories(id) | Parent repository |
| sha | TEXT | NO | - | - | Git commit SHA hash |
| message | TEXT | NO | - | - | Commit message |
| author_github_username | TEXT | YES | - | - | Author's GitHub username |
| author_email | TEXT | YES | - | - | Author's email |
| committed_at | TIMESTAMPTZ | NO | - | - | When commit was authored |
| additions | INTEGER | YES | 0 | - | Lines added |
| deletions | INTEGER | YES | 0 | - | Lines deleted |
| branch | TEXT | YES | - | - | Branch name |
| url | TEXT | YES | - | - | Link to GitHub commit page |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Ingestion timestamp |
| | | | | UNIQUE(repo_id, sha) | No duplicate commits per repo |

### 2.6 pull_requests

**Purpose**: GitHub pull requests tracking full lifecycle from open to merge/close.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | PR record identifier |
| repo_id | TEXT | NO | - | FK -> repositories(id) | Parent repository |
| github_id | BIGINT | NO | - | - | GitHub's PR ID |
| number | INTEGER | NO | - | - | PR number in the repo |
| title | TEXT | NO | - | - | PR title |
| state | pr_state | NO | 'open' | ENUM | open, closed, or merged |
| author_github_username | TEXT | YES | - | - | PR author's GitHub username |
| author_avatar_url | TEXT | YES | - | - | Author's avatar URL |
| additions | INTEGER | YES | 0 | - | Lines added |
| deletions | INTEGER | YES | 0 | - | Lines deleted |
| commits_count | INTEGER | YES | 0 | - | Number of commits in PR |
| is_draft | BOOLEAN | YES | FALSE | - | Whether PR is a draft |
| created_at | TIMESTAMPTZ | NO | - | - | PR creation time on GitHub |
| updated_at | TIMESTAMPTZ | NO | - | - | Last update on GitHub |
| merged_at | TIMESTAMPTZ | YES | - | - | When PR was merged |
| closed_at | TIMESTAMPTZ | YES | - | - | When PR was closed |
| first_review_at | TIMESTAMPTZ | YES | - | - | Earliest non-bot review time |
| draft_removed_at | TIMESTAMPTZ | YES | - | - | When draft status was removed |
| url | TEXT | YES | - | - | Link to GitHub PR page |
| ingested_at | TIMESTAMPTZ | NO | NOW() | - | When ingested into Pulse |
| | | | | UNIQUE(repo_id, github_id) | No duplicate PRs per repo |

### 2.7 reviews

**Purpose**: PR reviews. Bot reviews tracked but excluded from time-to-first-review.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Review identifier |
| pr_id | TEXT | NO | - | FK -> pull_requests(id) | Parent PR |
| github_id | BIGINT | NO | - | - | GitHub's review ID |
| reviewer_github_username | TEXT | NO | - | - | Reviewer's GitHub username |
| reviewer_avatar_url | TEXT | YES | - | - | Reviewer's avatar URL |
| state | review_state | NO | - | ENUM | approved, changes_requested, commented, dismissed |
| body | TEXT | YES | - | - | Review comment body |
| submitted_at | TIMESTAMPTZ | NO | - | - | When review was submitted |
| is_bot | BOOLEAN | YES | FALSE | - | Whether reviewer is a bot |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Ingestion timestamp |
| | | | | UNIQUE(pr_id, github_id) | No duplicate reviews per PR |

### 2.8 deployments

**Purpose**: GitHub deployment events with environment and status tracking.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Deployment identifier |
| repo_id | TEXT | NO | - | FK -> repositories(id) | Parent repository |
| github_id | BIGINT | NO | - | - | GitHub's deployment ID |
| environment | deployment_environment | NO | - | ENUM | production, staging, development, preview |
| status | deployment_status | NO | 'pending' | ENUM | pending, in_progress, success, failure, error |
| commit_sha | TEXT | YES | - | - | Deployed commit SHA |
| description | TEXT | YES | - | - | Deployment description |
| url | TEXT | YES | - | - | Deployment URL |
| created_at | TIMESTAMPTZ | NO | - | - | Deployment creation time |
| updated_at | TIMESTAMPTZ | NO | NOW() | - | Last status update |
| | | | | UNIQUE(repo_id, github_id) | No duplicate deployments per repo |

### 2.9 coverage_reports

**Purpose**: Test coverage data points. One entry per CI-triggering commit per repository.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Coverage report identifier |
| repo_id | TEXT | NO | - | FK -> repositories(id) | Parent repository |
| commit_sha | TEXT | NO | - | - | Commit that triggered the coverage report |
| coverage | NUMERIC(5,1) | NO | - | CHECK 0-100 | Coverage percentage (e.g., 87.3) |
| source | TEXT | YES | 'github_checks' | - | Data source identifier |
| reported_at | TIMESTAMPTZ | NO | - | - | When coverage was measured |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Ingestion timestamp |
| | | | | UNIQUE(repo_id, commit_sha) | One report per commit per repo |

### 2.10 metric_snapshots

**Purpose**: Pre-computed metric aggregates for fast dashboard queries. One row per metric per period per team/repo.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Snapshot identifier |
| team_id | TEXT | NO | - | FK -> teams(id) | Team this metric belongs to |
| repo_id | TEXT | YES | - | FK -> repositories(id) | NULL = team-level aggregate |
| metric | metric_type | NO | - | ENUM | Type of metric (9 types) |
| value | NUMERIC | NO | - | - | Computed metric value |
| period_start | TIMESTAMPTZ | NO | - | - | Start of the aggregation window |
| period_end | TIMESTAMPTZ | NO | - | - | End of the aggregation window |
| metadata | JSONB | YES | - | - | Breakdown data (e.g., per-developer) |
| computed_at | TIMESTAMPTZ | NO | NOW() | - | When this snapshot was computed |

### 2.11 risk_snapshots

**Purpose**: Sprint risk score history. Generated every 4 hours during work hours (8am-8pm).

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Risk snapshot identifier |
| team_id | TEXT | NO | - | FK -> teams(id) | Team this risk belongs to |
| score | INTEGER | NO | - | CHECK 0-100 | Composite risk score |
| level | risk_level | NO | - | ENUM | low (0-30), medium (31-60), high (61-100) |
| explanation | TEXT | NO | - | - | NL explanation of risk factors |
| factors | JSONB | NO | - | - | Array of { name, value, impactScore, weight, trend } |
| recommendations | JSONB | YES | - | - | Array of { action, priority, relatedFactor, url } |
| calculated_at | TIMESTAMPTZ | NO | NOW() | - | When score was computed |

### 2.12 notifications

**Purpose**: User notifications. Retained for 30 days. Supports push delivery and quiet hours.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Notification identifier |
| user_id | TEXT | NO | - | FK -> users(id) | Recipient user |
| type | notification_type | NO | - | ENUM | Category of notification |
| title | TEXT | NO | - | - | Notification title |
| body | TEXT | NO | - | - | Notification body text |
| data | JSONB | YES | - | - | Deep link data (repoId, prNumber, etc.) |
| read | BOOLEAN | YES | FALSE | - | Whether user has read it |
| dismissed | BOOLEAN | YES | FALSE | - | Whether user dismissed it |
| delivered | BOOLEAN | YES | FALSE | - | Whether push was sent to device |
| queued_until | TIMESTAMPTZ | YES | - | - | Deliver after this time (quiet hours) |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Creation timestamp |

### 2.13 notification_preferences

**Purpose**: Per-user notification settings. Auto-created with defaults on first access.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Preferences identifier |
| user_id | TEXT | NO | - | FK -> users(id), UNIQUE | Owning user (1:1) |
| pr_review_requested | BOOLEAN | YES | TRUE | - | Notify on PR review requests |
| pr_reviewed_merged | BOOLEAN | YES | TRUE | - | Notify on PR reviewed/merged |
| deployment_events | BOOLEAN | YES | TRUE | - | Notify on deployments |
| anomaly_alerts | BOOLEAN | YES | TRUE | - | Notify on anomaly detection |
| risk_changes | BOOLEAN | YES | TRUE | - | Notify on risk score changes |
| quiet_hours_start | TIME | YES | - | - | Quiet hours start (e.g., 22:00) |
| quiet_hours_end | TIME | YES | - | - | Quiet hours end (e.g., 07:00) |
| email_digest | TEXT | YES | 'none' | CHECK in (none, daily, weekly) | Email digest frequency |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Auto-trigger | Last modification |

### 2.14 device_tokens

**Purpose**: Mobile device push notification tokens. Refreshed on each app launch, cleaned up after 30 days of inactivity.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Token record identifier |
| user_id | TEXT | NO | - | FK -> users(id) | Owning user |
| platform | device_platform | NO | - | ENUM | ios or android |
| token | TEXT | NO | - | - | APNs or FCM device token |
| last_used_at | TIMESTAMPTZ | YES | NOW() | - | Last app launch with this token |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Token registration timestamp |
| | | | | UNIQUE(user_id, token) | No duplicate tokens per user |

### 2.15 team_invitations

**Purpose**: Pending team invitations sent by email.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Invitation identifier |
| team_id | TEXT | NO | - | FK -> teams(id) | Target team |
| email | TEXT | NO | - | - | Invitee email |
| role | user_role | NO | 'MEMBER' | ENUM | Role to assign on acceptance |
| invited_by | TEXT | NO | - | FK -> users(id) | Inviting user |
| token | TEXT | NO | - | UNIQUE | One-time invitation token |
| accepted_at | TIMESTAMPTZ | YES | - | - | When invitation was accepted |
| expires_at | TIMESTAMPTZ | NO | - | - | Invitation expiry |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Invitation creation timestamp |
| | | | | UNIQUE(team_id, email) | One invitation per email per team |

### 2.16 refresh_tokens

**Purpose**: Refresh tokens for silent JWT renewal. Stored as SHA-256 hashes.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Token record identifier |
| user_id | TEXT | NO | - | FK -> users(id) | Token owner |
| token_hash | TEXT | NO | - | UNIQUE | SHA-256 hash of the refresh token |
| expires_at | TIMESTAMPTZ | NO | - | - | Token expiry |
| revoked | BOOLEAN | YES | FALSE | - | Whether token has been revoked |
| created_at | TIMESTAMPTZ | NO | NOW() | - | Token creation timestamp |

### 2.17 audit_logs

**Purpose**: Audit trail for security-critical actions. Append-only, never deleted.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | TEXT | NO | gen_random_uuid()::text | PK | Log entry identifier |
| actor | TEXT | NO | - | - | User ID or 'system' |
| action | TEXT | NO | - | - | Action performed (e.g., 'repo.connect') |
| resource_type | TEXT | NO | - | - | Resource category (e.g., 'repository') |
| resource_id | TEXT | NO | - | - | Resource identifier |
| details | JSONB | YES | - | - | Additional context data |
| ip | TEXT | YES | - | - | Client IP address |
| user_agent | TEXT | YES | - | - | Client user agent |
| timestamp | TIMESTAMPTZ | NO | NOW() | - | When action occurred |

### 2.18 job_state

**Purpose**: Tracks last execution time for background jobs. Ensures idempotent processing.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| job_name | TEXT | NO | - | PK | Unique job identifier |
| last_processed_at | TIMESTAMPTZ | NO | NOW() | - | Last successful execution time |
| last_duration_ms | INTEGER | YES | - | - | Duration of last run in ms |
| last_status | TEXT | YES | 'success' | - | 'success' or 'error' |
| last_error | TEXT | YES | - | - | Error message if failed |
| updated_at | TIMESTAMPTZ | NO | NOW() | Auto-trigger | Last state change |

---

## 3. Enum Definitions

| Enum Name | Values | Purpose |
|-----------|--------|---------|
| user_role | ADMIN, MEMBER, VIEWER | RBAC team member roles |
| sync_status | idle, syncing, complete, error | Repository ingestion state |
| pr_state | open, closed, merged | Pull request lifecycle state |
| review_state | approved, changes_requested, commented, dismissed | PR review state |
| deployment_status | pending, in_progress, success, failure, error | Deployment lifecycle state |
| deployment_environment | production, staging, development, preview | Deployment target |
| metric_type | prs_merged, median_cycle_time, median_review_time, test_coverage, avg_pr_size, review_comments_per_pr, merge_without_approval_rate, commit_count, deployment_count | Pre-computed metric categories |
| anomaly_type | commit_frequency_drop, stalled_pr, coverage_drop, risk_score_spike, review_load_imbalance | Anomaly detection categories |
| anomaly_severity | low, medium, high | Anomaly severity level |
| notification_type | pr_review_requested, pr_reviewed, pr_merged, deployment, anomaly, risk_change | Push notification categories |
| device_platform | ios, android | Mobile device platform |
| risk_level | low, medium, high | Sprint risk severity bands |

---

## 4. Index Rationale

### 4.1 users

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_users_email | email | B-tree | Login lookup by email. Used on every authentication request. Already UNIQUE constraint but explicit index for clarity. |
| idx_users_github_username | github_username (WHERE NOT NULL) | Partial B-tree | Linking commits/PRs to users by GitHub username. Partial because not all users have GitHub connected. |

### 4.2 teams

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_teams_slug | slug | B-tree | URL-based team lookup. Slug is UNIQUE and used in every team-scoped API route. |

### 4.3 team_members

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_team_members_user | user_id | B-tree | "My teams" query: find all teams for a user. Used on login and team switcher. |
| idx_team_members_team | team_id | B-tree | "Team members" query: list all members of a team. Used on team management page. |
| idx_team_members_team_role | (team_id, role) | Composite B-tree | RBAC permission check: "Is user ADMIN of team X?". Avoids scanning all members. |

### 4.4 repositories

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_repos_team | team_id | B-tree | "Team repos" query: list all repositories for a team. Used on repo management page. |
| idx_repos_github_id | github_id | B-tree | Webhook lookup: match inbound GitHub webhook to repo by github_id. |
| idx_repos_team_sync | (team_id, sync_status) | Composite B-tree | Dashboard query: "Show syncing repos for my team". Filters repos by ingestion state. |
| idx_repos_disconnected | disconnected_at (WHERE NOT NULL) | Partial B-tree | Cleanup job: find repos pending data deletion (disconnected >30 days ago). |

### 4.5 commits

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_commits_repo | repo_id | B-tree | "Repo commits" query: all commits for a repository. |
| idx_commits_repo_date | (repo_id, committed_at DESC) | Composite B-tree | Activity feed: recent commits for a repo. Sorted by date descending. |
| idx_commits_author | author_github_username | B-tree | Developer detail view: commits by a specific author across repos. |
| idx_commits_date | committed_at DESC | B-tree | Global activity feed: recent commits across all repos. |
| idx_commits_committed_brin | committed_at | BRIN | Time-range aggregation queries for metric computation. BRIN is 10-100x smaller than B-tree for sequential timestamp data. Ideal for append-only tables where committed_at is roughly monotonically increasing. |

### 4.6 pull_requests

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_prs_repo | repo_id | B-tree | "Repo PRs" query: all pull requests for a repository. |
| idx_prs_repo_state | (repo_id, state) | Composite B-tree | Dashboard: "Open PRs" and "Merged PRs" for a repo. |
| idx_prs_repo_merged | (repo_id, merged_at DESC) WHERE merged_at IS NOT NULL | Partial B-tree | Velocity chart: recently merged PRs per repo. Skips open/closed-without-merge PRs. |
| idx_prs_author | author_github_username | B-tree | Developer view: all PRs by a specific author. |
| idx_prs_created | created_at DESC | B-tree | Global activity feed: recently opened PRs. |
| idx_prs_repo_created | (repo_id, created_at DESC) | Composite B-tree | Repo activity feed: PRs ordered by creation date. |
| idx_prs_open_no_review | (repo_id, created_at) WHERE state='open' AND first_review_at IS NULL | Partial B-tree | Stalled PR anomaly detection: open PRs without any review. Key query for 15-minute anomaly job. |
| idx_prs_created_brin | created_at | BRIN | Time-range aggregation for metric computation. |

### 4.7 reviews

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_reviews_pr | pr_id | B-tree | "PR reviews" query: all reviews for a pull request. |
| idx_reviews_reviewer | reviewer_github_username | B-tree | Review load analysis: count reviews per developer for load balancing detection. |
| idx_reviews_submitted | submitted_at DESC | B-tree | Recent reviews across all PRs (global activity). |
| idx_reviews_pr_nonbot | (pr_id, submitted_at) WHERE is_bot=FALSE | Partial B-tree | Time-to-first-review calculation: find earliest human review per PR. Excludes bot reviews (Dependabot, Codecov, etc.). |

### 4.8 deployments

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_deployments_repo | repo_id | B-tree | "Repo deployments" query: deployment history for a repo. |
| idx_deployments_repo_env | (repo_id, environment) | Composite B-tree | Environment filter: "Show production deployments for repo X". |
| idx_deployments_repo_date | (repo_id, created_at DESC) | Composite B-tree | Recent deployments per repo (deployment frequency chart). |
| idx_deployments_created_brin | created_at | BRIN | Time-range aggregation for deployment frequency metrics. |

### 4.9 coverage_reports

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_coverage_repo | repo_id | B-tree | "Repo coverage" query: all coverage data for a repo. |
| idx_coverage_repo_date | (repo_id, reported_at DESC) | Composite B-tree | Coverage trend chart: recent coverage values per repo. |
| idx_coverage_reported_brin | reported_at | BRIN | Time-range aggregation for coverage trend metrics. |

### 4.10 metric_snapshots

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_metrics_team | team_id | B-tree | "Team metrics" query: all metrics for a team. |
| idx_metrics_team_metric | (team_id, metric) | Composite B-tree | Specific metric query: "Get velocity data for team X". |
| idx_metrics_team_metric_period | (team_id, metric, period_start DESC) | Composite B-tree | Dashboard chart query: "Get weekly velocity for team X, last 12 weeks". Main dashboard query pattern. |
| idx_metrics_repo_metric_period | (repo_id, metric, period_start DESC) WHERE repo_id IS NOT NULL | Partial Composite B-tree | Repo-level metric query: "Get coverage trend for repo Y, last 12 weeks". |
| idx_metrics_team_period | (team_id, period_start DESC, period_end) | Composite B-tree | Multi-metric dashboard load: "Get all metrics for team X in date range". Used when loading the full dashboard. |

### 4.11 risk_snapshots

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_risk_team | team_id | B-tree | "Team risk" query: risk history for a team. |
| idx_risk_team_date | (team_id, calculated_at DESC) | Composite B-tree | Risk history chart: recent risk scores over time. |
| idx_risk_latest | (team_id, calculated_at DESC) | Composite B-tree | Current risk query: "What is the latest risk score for team X?". Used on dashboard load. |

### 4.12 notifications

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_notifications_user | user_id | B-tree | "My notifications" query: all notifications for a user. |
| idx_notifications_user_unread | (user_id, created_at DESC) WHERE read=FALSE | Partial B-tree | Unread badge count and list: "Show unread notifications for user". Most frequent notification query. |
| idx_notifications_user_date | (user_id, created_at DESC) | Composite B-tree | Full notification history: paginated list of all notifications. |
| idx_notifications_queued | queued_until WHERE queued_until IS NOT NULL AND delivered=FALSE | Partial B-tree | Quiet hours delivery: "Find notifications ready to send after quiet hours". Used by delivery scheduler. |
| idx_notifications_created | created_at | B-tree | Cleanup job: "Delete notifications older than 30 days". Used by daily cleanup. |

### 4.13 notification_preferences

| Index | Columns | Type | Rationale |
|-------|---------|------|-----------|
| idx_notif_prefs_user | user_id | B-tree | User preference lookup. user_id is UNIQUE so this serves as a fast point lookup. |

### 4.14 Other Tables

| Table | Index | Rationale |
|-------|-------|-----------|
| device_tokens | idx_device_tokens_user | Push token lookup by user for notification delivery |
| device_tokens | idx_device_tokens_stale | Cleanup: find tokens not used in 30+ days |
| team_invitations | idx_invitations_team | List invitations for a team |
| team_invitations | idx_invitations_email | Lookup invitation by invitee email |
| team_invitations | idx_invitations_token | Validate invitation token on acceptance |
| refresh_tokens | idx_refresh_user | Find active tokens for a user (logout all devices) |
| refresh_tokens | idx_refresh_token | Token hash lookup on refresh request |
| refresh_tokens | idx_refresh_expired | Cleanup: find expired non-revoked tokens |
| audit_logs | idx_audit_actor | Filter audit log by actor |
| audit_logs | idx_audit_action | Filter audit log by action type |
| audit_logs | idx_audit_resource | Filter audit log by resource (type + id) |
| audit_logs | idx_audit_timestamp | Recent audit entries (chronological view) |

---

## 5. Data Volume Estimates

Based on a typical team of 10 developers with 5 monitored repositories.

### 5.1 Per-Team Monthly Estimates

| Table | Rows/Month | Rows/Year | Growth Pattern |
|-------|-----------|-----------|----------------|
| users | ~1 | ~12 | Slow (team changes infrequently) |
| teams | 0 | 0 | Essentially static |
| team_members | ~1 | ~12 | Slow |
| repositories | ~0.5 | ~6 | Slow (repos added occasionally) |
| **commits** | **~3,000-6,000** | **~50,000** | **High** (50-100/day on weekdays) |
| **pull_requests** | **~200-400** | **~3,600** | **Medium-high** (10-20/week) |
| reviews | ~400-800 | ~7,200 | Medium-high (2x PRs) |
| deployments | ~100-200 | ~1,800 | Medium (5-10/week to staging+prod) |
| coverage_reports | ~200-400 | ~3,600 | Medium (1 per PR merge) |
| **metric_snapshots** | **~3,240** | **~38,880** | **High** (9 metrics * 24h/day * 15 periods) |
| risk_snapshots | ~60 | ~720 | Low-medium (3x/day * 20 workdays) |
| **notifications** | **~500-1,000** | **N/A (30d retention)** | **Medium** (rolling window) |
| notification_preferences | ~1 | ~12 | Static (one per user) |
| device_tokens | ~2 | ~24 | Static (one per device) |
| team_invitations | ~2 | ~24 | Low |
| refresh_tokens | ~30 | ~360 | Low (one per login session) |
| **audit_logs** | **~500-1,000** | **~9,000** | **Medium** (append-only, never deleted) |
| job_state | 0 | 0 | Static (5 rows, updated in place) |

### 5.2 Platform-Wide Projections (50 teams at month 3)

| Table | Total Rows | Size Estimate | Notes |
|-------|-----------|---------------|-------|
| commits | ~750,000 | ~150 MB | Largest table by row count |
| metric_snapshots | ~480,000 | ~100 MB | Second largest; grows with team count |
| pull_requests | ~60,000 | ~25 MB | Moderate |
| reviews | ~120,000 | ~30 MB | Moderate |
| audit_logs | ~150,000 | ~50 MB | Append-only, never shrinks |
| notifications | ~50,000 | ~15 MB | 30-day rolling window |
| **Total DB** | **~1.6M rows** | **~400 MB** | Comfortable for single PostgreSQL |

### 5.3 One-Year Projection (200 teams)

| Table | Total Rows | Size Estimate |
|-------|-----------|---------------|
| commits | ~10,000,000 | ~2 GB |
| metric_snapshots | ~7,500,000 | ~1.5 GB |
| audit_logs | ~1,800,000 | ~600 MB |
| pull_requests | ~720,000 | ~300 MB |
| **Total DB** | **~22M rows** | **~5 GB** |

At this scale, partitioning becomes beneficial for `commits` and `metric_snapshots`.

---

## 6. Partitioning Strategy

### 6.1 Tables That Benefit from Partitioning

Only time-series tables with high write volume justify partitioning overhead:

| Table | When to Partition | Partition Key | Strategy |
|-------|------------------|---------------|----------|
| commits | >5M rows (~6 months at 200 teams) | committed_at | Monthly range partitions |
| metric_snapshots | >3M rows (~4 months at 200 teams) | period_start | Monthly range partitions |
| audit_logs | >1M rows (~12 months at 200 teams) | timestamp | Quarterly range partitions |
| notifications | Not needed | - | 30-day retention keeps it small |

### 6.2 Partition Implementation Plan

**Phase 1 (MVP)**: No partitioning. BRIN indexes on timestamp columns provide 80% of the performance benefit at zero complexity cost. Single-table queries with BRIN scan only the relevant blocks.

**Phase 2 (>5M rows in commits)**: Introduce monthly range partitions on `commits`:

```sql
-- Convert commits to partitioned table
CREATE TABLE commits_partitioned (
  LIKE commits INCLUDING ALL
) PARTITION BY RANGE (committed_at);

-- Create partitions
CREATE TABLE commits_2026_01 PARTITION OF commits_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE commits_2026_02 PARTITION OF commits_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... auto-create future partitions via cron job
```

**Phase 3 (>10M rows)**: Extend to `metric_snapshots` and `audit_logs`.

### 6.3 BRIN Index Effectiveness

BRIN (Block Range Index) indexes are effective because time-series tables have natural correlation between physical row order and timestamp values. As rows are appended chronologically:

- BRIN index size: ~0.1% of table size (vs 10-20% for B-tree)
- Scan efficiency: Skips ~95% of blocks for typical time-range queries
- Works best for: "Get commits in the last 7 days", "Get metrics for the last 12 weeks"
- Limitation: Less effective if data is inserted out of order (e.g., historical backfill)

---

## 7. Data Retention and Archival

### 7.1 Retention Tiers

| Data Category | Active Retention | Archive Retention | Deletion |
|--------------|-----------------|-------------------|----------|
| Raw activity (commits, PRs, reviews, deployments) | 90 days | 12 months (compressed) | After 12 months |
| Coverage reports | 90 days | 12 months | After 12 months |
| Metric snapshots | 12 months | 24 months (downsampled) | After 24 months |
| Risk snapshots | 6 months | 12 months | After 12 months |
| Notifications | 30 days | - | After 30 days |
| Audit logs | Indefinite | - | Never deleted |
| Disconnected repo data | 30 days after disconnect | - | After 30 days |
| Stale device tokens | 30 days after last use | - | After 30 days |
| Expired refresh tokens | 7 days after expiry | - | After 7 days |

### 7.2 Archival Strategy

**Phase 1 (MVP)**: Simple deletion via daily cleanup job. The `data_cleanup` job runs at 2am UTC and handles:
- Delete notifications older than 30 days
- Delete data for repos disconnected >30 days ago
- Revoke and delete expired refresh tokens
- Delete stale device tokens

**Phase 2**: Archive to cold storage before deletion:
1. Export rows to JSONL files
2. Compress with gzip
3. Upload to S3/R2 (object storage)
4. Delete from PostgreSQL
5. Keep an archive manifest table for audit trail

**Phase 3**: Downsampling for long-term retention:
- Metric snapshots older than 12 months: aggregate from hourly to daily
- Risk snapshots older than 6 months: keep only daily snapshots (not 4-hourly)
- This reduces storage by ~4-6x for historical data

---

**Created by**: Data Engineer
**Last Updated**: 2026-02-07
**Status**: Complete
