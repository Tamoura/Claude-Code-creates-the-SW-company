-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "growth_stage" AS ENUM ('seed', 'series-a', 'series-b', 'series-c', 'growth', 'enterprise');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('cto', 'vp_eng', 'co_founder', 'admin');

-- CreateEnum
CREATE TYPE "user_tier" AS ENUM ('free', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "message_role" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "confidence" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "feedback" AS ENUM ('up', 'down');

-- CreateEnum
CREATE TYPE "doc_status" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "risk_category" AS ENUM ('tech-debt', 'vendor', 'compliance', 'operational');

-- CreateEnum
CREATE TYPE "risk_trend" AS ENUM ('improving', 'stable', 'worsening');

-- CreateEnum
CREATE TYPE "risk_status" AS ENUM ('active', 'mitigated', 'dismissed');

-- CreateEnum
CREATE TYPE "cloud_provider" AS ENUM ('aws', 'gcp', 'azure', 'other');

-- CreateEnum
CREATE TYPE "import_source" AS ENUM ('manual', 'csv', 'json');

-- CreateEnum
CREATE TYPE "radar_quadrant" AS ENUM ('languages-frameworks', 'platforms-infrastructure', 'tools', 'techniques');

-- CreateEnum
CREATE TYPE "radar_ring" AS ENUM ('adopt', 'trial', 'assess', 'hold');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "industry" VARCHAR(100) NOT NULL,
    "employee_count" INTEGER NOT NULL,
    "growth_stage" "growth_stage" NOT NULL,
    "founded_year" INTEGER,
    "challenges" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'cto',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" VARCHAR(255),
    "verification_token_expires_at" TIMESTAMPTZ,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "tier" "user_tier" NOT NULL DEFAULT 'free',
    "daily_message_count" INTEGER NOT NULL DEFAULT 0,
    "daily_message_reset_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tech_stack" JSONB NOT NULL DEFAULT '{}',
    "cloud_provider" VARCHAR(50),
    "architecture_notes" TEXT,
    "constraints" TEXT,
    "profile_completeness" INTEGER NOT NULL DEFAULT 0,
    "onboarding_state" JSONB DEFAULT '{"currentStep": 1, "completed": false}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(255),
    "summary" TEXT,
    "long_term_memory" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "message_role" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "confidence" "confidence",
    "feedback" "feedback",
    "token_count" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "source" VARCHAR(255) NOT NULL,
    "author" VARCHAR(255),
    "published_date" DATE,
    "url" VARCHAR(2048),
    "content" TEXT,
    "category" VARCHAR(100) NOT NULL,
    "status" "doc_status" NOT NULL DEFAULT 'active',
    "ingested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "token_count" INTEGER,
    "chunk_index" INTEGER NOT NULL,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "category" "risk_category" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "severity" INTEGER NOT NULL,
    "trend" "risk_trend" NOT NULL DEFAULT 'stable',
    "status" "risk_status" NOT NULL DEFAULT 'active',
    "mitigations" JSONB NOT NULL DEFAULT '[]',
    "affected_systems" JSONB NOT NULL DEFAULT '[]',
    "identified_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "risk_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tco_comparisons" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "options" JSONB NOT NULL,
    "projections" JSONB,
    "ai_analysis" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tco_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloud_spend" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" "cloud_provider" NOT NULL,
    "spend_breakdown" JSONB NOT NULL,
    "total_monthly" DECIMAL(12,2) NOT NULL,
    "benchmarks" JSONB,
    "recommendations" JSONB,
    "import_source" "import_source" NOT NULL DEFAULT 'manual',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cloud_spend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tech_radar_items" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "quadrant" "radar_quadrant" NOT NULL,
    "ring" "radar_ring" NOT NULL,
    "description" TEXT,
    "rationale" TEXT,
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "related_technologies" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tech_radar_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "preference_key" VARCHAR(100) NOT NULL,
    "preference_value" TEXT,
    "signal_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "jti" VARCHAR(255) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organizations_industry_idx" ON "organizations"("industry");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_verification_token_idx" ON "users"("verification_token");

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_organization_id_key" ON "company_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "company_profiles_organization_id_idx" ON "company_profiles"("organization_id");

-- CreateIndex
CREATE INDEX "conversations_user_id_idx" ON "conversations"("user_id");

-- CreateIndex
CREATE INDEX "conversations_updated_at_idx" ON "conversations"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "knowledge_documents_category_idx" ON "knowledge_documents"("category");

-- CreateIndex
CREATE INDEX "knowledge_documents_status_idx" ON "knowledge_documents"("status");

-- CreateIndex
CREATE INDEX "knowledge_chunks_document_id_idx" ON "knowledge_chunks"("document_id");

-- CreateIndex
CREATE INDEX "risk_items_organization_id_idx" ON "risk_items"("organization_id");

-- CreateIndex
CREATE INDEX "risk_items_category_idx" ON "risk_items"("category");

-- CreateIndex
CREATE INDEX "risk_items_status_idx" ON "risk_items"("status");

-- CreateIndex
CREATE INDEX "risk_items_severity_idx" ON "risk_items"("severity" DESC);

-- CreateIndex
CREATE INDEX "tco_comparisons_user_id_idx" ON "tco_comparisons"("user_id");

-- CreateIndex
CREATE INDEX "cloud_spend_user_id_idx" ON "cloud_spend"("user_id");

-- CreateIndex
CREATE INDEX "cloud_spend_organization_id_idx" ON "cloud_spend"("organization_id");

-- CreateIndex
CREATE INDEX "cloud_spend_period_start_period_end_idx" ON "cloud_spend"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "tech_radar_items_name_key" ON "tech_radar_items"("name");

-- CreateIndex
CREATE INDEX "tech_radar_items_quadrant_idx" ON "tech_radar_items"("quadrant");

-- CreateIndex
CREATE INDEX "tech_radar_items_ring_idx" ON "tech_radar_items"("ring");

-- CreateIndex
CREATE INDEX "user_preferences_user_id_idx" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_preference_key_key" ON "user_preferences"("user_id", "preference_key");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_jti_idx" ON "refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_items" ADD CONSTRAINT "risk_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tco_comparisons" ADD CONSTRAINT "tco_comparisons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_spend" ADD CONSTRAINT "cloud_spend_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_spend" ADD CONSTRAINT "cloud_spend_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

