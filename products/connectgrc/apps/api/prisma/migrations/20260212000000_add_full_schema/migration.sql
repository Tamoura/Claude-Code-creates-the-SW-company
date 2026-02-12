-- CreateEnum
CREATE TYPE "GrcDomain" AS ENUM ('GOVERNANCE_STRATEGY', 'RISK_MANAGEMENT', 'COMPLIANCE_REGULATORY', 'INFORMATION_SECURITY', 'AUDIT_ASSURANCE', 'BUSINESS_CONTINUITY');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY', 'MID', 'SENIOR', 'PRINCIPAL');

-- CreateEnum
CREATE TYPE "ProfessionalTier" AS ENUM ('FOUNDATION', 'DEVELOPING', 'PROFICIENT', 'EXPERT');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'SCENARIO_BASED', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'HIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ASSESSMENT_COMPLETE', 'TIER_CHANGE', 'JOB_MATCH', 'APPLICATION_UPDATE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ARTICLE', 'VIDEO', 'COURSE', 'WHITEPAPER', 'TOOL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "avatar_url" TEXT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "refresh_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verifications_token_key" ON "email_verifications"("token");
CREATE INDEX "email_verifications_email_idx" ON "email_verifications"("email");
CREATE INDEX "email_verifications_token_idx" ON "email_verifications"("token");

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");
CREATE INDEX "password_resets_email_idx" ON "password_resets"("email");
CREATE INDEX "password_resets_token_idx" ON "password_resets"("token");

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "linkedin_url" TEXT,
    "experience_level" "ExperienceLevel" NOT NULL DEFAULT 'ENTRY',
    "current_tier" "ProfessionalTier" NOT NULL DEFAULT 'FOUNDATION',
    "overall_score" DOUBLE PRECISION,
    "cv_url" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateTable
CREATE TABLE "domain_scores" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "domain" "GrcDomain" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "tier" "ProfessionalTier" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "domain_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "domain_scores_profile_id_domain_key" ON "domain_scores"("profile_id", "domain");

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "domain" "GrcDomain" NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'INTERMEDIATE',
    "text" TEXT NOT NULL,
    "options" JSONB,
    "correct_answer" TEXT,
    "explanation" TEXT,
    "framework" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "questions_domain_idx" ON "questions"("domain");
CREATE INDEX "questions_difficulty_idx" ON "questions"("difficulty");
CREATE INDEX "questions_active_idx" ON "questions"("active");

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "domain" "GrcDomain" NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "score" DOUBLE PRECISION,
    "tier" "ProfessionalTier",
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "time_spent" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assessments_user_id_idx" ON "assessments"("user_id");
CREATE INDEX "assessments_domain_idx" ON "assessments"("domain");
CREATE INDEX "assessments_status_idx" ON "assessments"("status");

-- CreateTable
CREATE TABLE "assessment_answers" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "is_correct" BOOLEAN,
    "score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assessment_answers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assessment_answers_assessment_id_question_id_key" ON "assessment_answers"("assessment_id", "question_id");

-- CreateTable
CREATE TABLE "career_simulations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_role" TEXT NOT NULL,
    "current_level" "ExperienceLevel" NOT NULL,
    "target_level" "ExperienceLevel" NOT NULL,
    "skill_gaps" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "estimated_months" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "career_simulations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "career_simulations_user_id_idx" ON "career_simulations"("user_id");

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "domain" "GrcDomain" NOT NULL,
    "level" "ExperienceLevel" NOT NULL,
    "steps" JSONB NOT NULL,
    "duration" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "learning_paths_domain_idx" ON "learning_paths"("domain");
CREATE INDEX "learning_paths_level_idx" ON "learning_paths"("level");

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'QAR',
    "domains" "GrcDomain"[],
    "level" "ExperienceLevel" NOT NULL,
    "required_tier" "ProfessionalTier",
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "posted_by" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "jobs_status_idx" ON "jobs"("status");
CREATE INDEX "jobs_level_idx" ON "jobs"("level");

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cover_letter" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "match_score" DOUBLE PRECISION,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "job_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_applications_job_id_user_id_key" ON "job_applications"("job_id", "user_id");
CREATE INDEX "job_applications_user_id_idx" ON "job_applications"("user_id");
CREATE INDEX "job_applications_status_idx" ON "job_applications"("status");

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ResourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "domain" "GrcDomain",
    "level" "ExperienceLevel",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resources_type_idx" ON "resources"("type");
CREATE INDEX "resources_domain_idx" ON "resources"("domain");
CREATE INDEX "resources_featured_idx" ON "resources"("featured");

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bookmarks_user_id_resource_id_key" ON "bookmarks"("user_id", "resource_id");

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_read_idx" ON "notifications"("read");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_scores" ADD CONSTRAINT "domain_scores_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_simulations" ADD CONSTRAINT "career_simulations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
