-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "sync_status" AS ENUM ('idle', 'syncing', 'complete', 'error');

-- CreateEnum
CREATE TYPE "pr_state" AS ENUM ('open', 'closed', 'merged');

-- CreateEnum
CREATE TYPE "review_state" AS ENUM ('approved', 'changes_requested', 'commented', 'dismissed');

-- CreateEnum
CREATE TYPE "deployment_status" AS ENUM ('pending', 'in_progress', 'success', 'failure', 'error');

-- CreateEnum
CREATE TYPE "deployment_environment" AS ENUM ('production', 'staging', 'development', 'preview');

-- CreateEnum
CREATE TYPE "metric_type" AS ENUM ('prs_merged', 'median_cycle_time', 'median_review_time', 'test_coverage', 'avg_pr_size', 'review_comments_per_pr', 'merge_without_approval_rate', 'commit_count', 'deployment_count');

-- CreateEnum
CREATE TYPE "anomaly_type" AS ENUM ('commit_frequency_drop', 'stalled_pr', 'coverage_drop', 'risk_score_spike', 'review_load_imbalance');

-- CreateEnum
CREATE TYPE "anomaly_severity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('pr_review_requested', 'pr_reviewed', 'pr_merged', 'deployment', 'anomaly', 'risk_change');

-- CreateEnum
CREATE TYPE "device_platform" AS ENUM ('ios', 'android');

-- CreateEnum
CREATE TYPE "risk_level" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "github_username" TEXT,
    "github_token" TEXT,
    "avatar_url" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verify_token" TEXT,
    "email_verify_expires" TIMESTAMP(3),
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "github_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "organization" TEXT,
    "language" TEXT,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "webhook_id" BIGINT,
    "webhook_secret" TEXT,
    "sync_status" "sync_status" NOT NULL DEFAULT 'idle',
    "sync_progress" INTEGER NOT NULL DEFAULT 0,
    "sync_started_at" TIMESTAMP(3),
    "sync_completed_at" TIMESTAMP(3),
    "sync_error" TEXT,
    "last_activity_at" TIMESTAMP(3),
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commits" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author_github_username" TEXT,
    "author_email" TEXT,
    "committed_at" TIMESTAMP(3) NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "branch" TEXT,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_requests" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "github_id" BIGINT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "state" "pr_state" NOT NULL DEFAULT 'open',
    "author_github_username" TEXT,
    "author_avatar_url" TEXT,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "commits_count" INTEGER NOT NULL DEFAULT 0,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "merged_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "first_review_at" TIMESTAMP(3),
    "draft_removed_at" TIMESTAMP(3),
    "url" TEXT,
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pull_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "pr_id" TEXT NOT NULL,
    "github_id" BIGINT NOT NULL,
    "reviewer_github_username" TEXT NOT NULL,
    "reviewer_avatar_url" TEXT,
    "state" "review_state" NOT NULL,
    "body" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "github_id" BIGINT NOT NULL,
    "environment" "deployment_environment" NOT NULL,
    "status" "deployment_status" NOT NULL DEFAULT 'pending',
    "commit_sha" TEXT,
    "description" TEXT,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coverage_reports" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "commit_sha" TEXT NOT NULL,
    "coverage" DECIMAL(5,1) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'github_checks',
    "reported_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "repo_id" TEXT,
    "metric" "metric_type" NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_snapshots" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" "risk_level" NOT NULL,
    "explanation" TEXT NOT NULL,
    "factors" JSONB NOT NULL,
    "recommendations" JSONB,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "queued_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pr_review_requested" BOOLEAN NOT NULL DEFAULT true,
    "pr_reviewed_merged" BOOLEAN NOT NULL DEFAULT true,
    "deployment_events" BOOLEAN NOT NULL DEFAULT true,
    "anomaly_alerts" BOOLEAN NOT NULL DEFAULT true,
    "risk_changes" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "email_digest" TEXT NOT NULL DEFAULT 'none',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" "device_platform" NOT NULL,
    "token" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invitations" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'MEMBER',
    "invited_by" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "details" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_state" (
    "job_name" TEXT NOT NULL,
    "last_processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_duration_ms" INTEGER,
    "last_status" TEXT NOT NULL DEFAULT 'success',
    "last_error" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_state_pkey" PRIMARY KEY ("job_name")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_github_username_key" ON "users"("github_username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_github_username_idx" ON "users"("github_username");

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE INDEX "teams_slug_idx" ON "teams"("slug");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "team_members_team_id_role_idx" ON "team_members"("team_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_user_id_team_id_key" ON "team_members"("user_id", "team_id");

-- CreateIndex
CREATE INDEX "repositories_team_id_idx" ON "repositories"("team_id");

-- CreateIndex
CREATE INDEX "repositories_github_id_idx" ON "repositories"("github_id");

-- CreateIndex
CREATE INDEX "repositories_team_id_sync_status_idx" ON "repositories"("team_id", "sync_status");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_team_id_github_id_key" ON "repositories"("team_id", "github_id");

-- CreateIndex
CREATE INDEX "commits_repo_id_idx" ON "commits"("repo_id");

-- CreateIndex
CREATE INDEX "commits_repo_id_committed_at_idx" ON "commits"("repo_id", "committed_at" DESC);

-- CreateIndex
CREATE INDEX "commits_author_github_username_idx" ON "commits"("author_github_username");

-- CreateIndex
CREATE INDEX "commits_committed_at_idx" ON "commits"("committed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "commits_repo_id_sha_key" ON "commits"("repo_id", "sha");

-- CreateIndex
CREATE INDEX "pull_requests_repo_id_idx" ON "pull_requests"("repo_id");

-- CreateIndex
CREATE INDEX "pull_requests_repo_id_state_idx" ON "pull_requests"("repo_id", "state");

-- CreateIndex
CREATE INDEX "pull_requests_author_github_username_idx" ON "pull_requests"("author_github_username");

-- CreateIndex
CREATE INDEX "pull_requests_created_at_idx" ON "pull_requests"("created_at" DESC);

-- CreateIndex
CREATE INDEX "pull_requests_repo_id_created_at_idx" ON "pull_requests"("repo_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_repo_id_github_id_key" ON "pull_requests"("repo_id", "github_id");

-- CreateIndex
CREATE INDEX "reviews_pr_id_idx" ON "reviews"("pr_id");

-- CreateIndex
CREATE INDEX "reviews_reviewer_github_username_idx" ON "reviews"("reviewer_github_username");

-- CreateIndex
CREATE INDEX "reviews_submitted_at_idx" ON "reviews"("submitted_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_pr_id_github_id_key" ON "reviews"("pr_id", "github_id");

-- CreateIndex
CREATE INDEX "deployments_repo_id_idx" ON "deployments"("repo_id");

-- CreateIndex
CREATE INDEX "deployments_repo_id_environment_idx" ON "deployments"("repo_id", "environment");

-- CreateIndex
CREATE INDEX "deployments_repo_id_created_at_idx" ON "deployments"("repo_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "deployments_repo_id_github_id_key" ON "deployments"("repo_id", "github_id");

-- CreateIndex
CREATE INDEX "coverage_reports_repo_id_idx" ON "coverage_reports"("repo_id");

-- CreateIndex
CREATE INDEX "coverage_reports_repo_id_reported_at_idx" ON "coverage_reports"("repo_id", "reported_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "coverage_reports_repo_id_commit_sha_key" ON "coverage_reports"("repo_id", "commit_sha");

-- CreateIndex
CREATE INDEX "metric_snapshots_team_id_idx" ON "metric_snapshots"("team_id");

-- CreateIndex
CREATE INDEX "metric_snapshots_team_id_metric_idx" ON "metric_snapshots"("team_id", "metric");

-- CreateIndex
CREATE INDEX "metric_snapshots_team_id_metric_period_start_idx" ON "metric_snapshots"("team_id", "metric", "period_start" DESC);

-- CreateIndex
CREATE INDEX "metric_snapshots_team_id_period_start_period_end_idx" ON "metric_snapshots"("team_id", "period_start" DESC, "period_end");

-- CreateIndex
CREATE INDEX "risk_snapshots_team_id_idx" ON "risk_snapshots"("team_id");

-- CreateIndex
CREATE INDEX "risk_snapshots_team_id_calculated_at_idx" ON "risk_snapshots"("team_id", "calculated_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_user_id_token_key" ON "device_tokens"("user_id", "token");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_token_key" ON "team_invitations"("token");

-- CreateIndex
CREATE INDEX "team_invitations_team_id_idx" ON "team_invitations"("team_id");

-- CreateIndex
CREATE INDEX "team_invitations_email_idx" ON "team_invitations"("email");

-- CreateIndex
CREATE INDEX "team_invitations_token_idx" ON "team_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_team_id_email_key" ON "team_invitations"("team_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs"("actor");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commits" ADD CONSTRAINT "commits_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "pull_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coverage_reports" ADD CONSTRAINT "coverage_reports_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_snapshots" ADD CONSTRAINT "risk_snapshots_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
