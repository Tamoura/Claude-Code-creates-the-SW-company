-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrgPlan" AS ENUM ('TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LEARNER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "SSOProvider" AS ENUM ('SAML', 'OIDC');

-- CreateEnum
CREATE TYPE "Dimension" AS ENUM ('DELEGATION', 'DESCRIPTION', 'DISCERNMENT', 'DILIGENCE');

-- CreateEnum
CREATE TYPE "InteractionMode" AS ENUM ('AUTOMATION', 'AUGMENTATION', 'AGENCY');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SCENARIO', 'SELF_REPORT');

-- CreateEnum
CREATE TYPE "IndicatorTrack" AS ENUM ('OBSERVABLE', 'SELF_REPORT');

-- CreateEnum
CREATE TYPE "IndicatorStatus" AS ENUM ('PASS', 'PARTIAL', 'FAIL');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LearningPathStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('VIDEO', 'ARTICLE', 'EXERCISE', 'QUIZ', 'SIMULATION');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "RoleProfile" AS ENUM ('DEVELOPER', 'ANALYST', 'MANAGER', 'MARKETER', 'GENERIC');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'SAML_LOGIN');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'TRIAL',
    "plan" "OrgPlan" NOT NULL DEFAULT 'TRIAL',
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 365,
    "ssoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavioral_indicators" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "shortCode" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "track" "IndicatorTrack" NOT NULL,
    "prevalenceWeight" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behavioral_indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "dimension" "Dimension" NOT NULL,
    "interactionMode" "InteractionMode" NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "indicatorId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "options_json" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_modules" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "interactionMode" "InteractionMode",
    "contentType" "ContentType" NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "contentUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "algorithm_versions" (
    "id" SERIAL NOT NULL,
    "version" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "algorithm_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID NOT NULL,
    "teamId" UUID,
    "email" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'LEARNER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "avatarUrl" TEXT,
    "verificationTokenHash" VARCHAR(64),
    "verificationTokenExp" TIMESTAMP(3),
    "resetTokenHash" VARCHAR(64),
    "resetTokenExp" TIMESTAMP(3),
    "loginFailureCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "refreshTokenHash" VARCHAR(64) NOT NULL,
    "userAgent" VARCHAR(500),
    "ipAddress" VARCHAR(45),
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sso_configs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID NOT NULL,
    "provider" "SSOProvider" NOT NULL,
    "entityId" TEXT NOT NULL,
    "ssoUrl" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sso_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_templates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID,
    "name" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "roleProfile" "RoleProfile" NOT NULL DEFAULT 'GENERIC',
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "dimensionWeights" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "algorithmVersionId" INTEGER NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "progressPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ltiContextId" VARCHAR(255),
    "ltiLineItemUrl" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answer" VARCHAR(10) NOT NULL,
    "elapsedSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fluency_profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "algorithmVersion" INTEGER NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "dimensionScores" JSONB NOT NULL,
    "selfReportScores" JSONB NOT NULL,
    "indicatorBreakdown" JSONB NOT NULL,
    "discernmentGap" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fluency_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "status" "LearningPathStatus" NOT NULL DEFAULT 'ACTIVE',
    "progressPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_modules" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID NOT NULL,
    "pathId" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "ModuleStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_path_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_completions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID NOT NULL,
    "pathModuleId" UUID NOT NULL,
    "score" DOUBLE PRECISION,
    "timeSpentMinutes" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "badgeUrl" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "verificationUrl" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "orgId" UUID NOT NULL,
    "actorId" UUID,
    "action" "AuditAction" NOT NULL,
    "resourceType" VARCHAR(100) NOT NULL,
    "resourceId" UUID,
    "beforeState" JSONB,
    "afterState" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "behavioral_indicators_shortCode_key" ON "behavioral_indicators"("shortCode");

-- CreateIndex
CREATE INDEX "behavioral_indicators_dimension_idx" ON "behavioral_indicators"("dimension");

-- CreateIndex
CREATE INDEX "behavioral_indicators_track_idx" ON "behavioral_indicators"("track");

-- CreateIndex
CREATE INDEX "questions_dimension_idx" ON "questions"("dimension");

-- CreateIndex
CREATE INDEX "questions_questionType_idx" ON "questions"("questionType");

-- CreateIndex
CREATE INDEX "questions_indicatorId_idx" ON "questions"("indicatorId");

-- CreateIndex
CREATE INDEX "learning_modules_dimension_idx" ON "learning_modules"("dimension");

-- CreateIndex
CREATE INDEX "learning_modules_difficulty_idx" ON "learning_modules"("difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "algorithm_versions_version_key" ON "algorithm_versions"("version");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_orgId_email_key" ON "users"("orgId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refreshTokenHash_key" ON "user_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_orgId_idx" ON "user_sessions"("orgId");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "user_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sso_configs_orgId_idx" ON "sso_configs"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "sso_configs_orgId_provider_key" ON "sso_configs"("orgId", "provider");

-- CreateIndex
CREATE INDEX "teams_orgId_idx" ON "teams"("orgId");

-- CreateIndex
CREATE INDEX "assessment_templates_orgId_idx" ON "assessment_templates"("orgId");

-- CreateIndex
CREATE INDEX "assessment_templates_roleProfile_idx" ON "assessment_templates"("roleProfile");

-- CreateIndex
CREATE INDEX "assessment_sessions_orgId_idx" ON "assessment_sessions"("orgId");

-- CreateIndex
CREATE INDEX "assessment_sessions_userId_idx" ON "assessment_sessions"("userId");

-- CreateIndex
CREATE INDEX "assessment_sessions_status_idx" ON "assessment_sessions"("status");

-- CreateIndex
CREATE INDEX "assessment_sessions_expiresAt_idx" ON "assessment_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "assessment_sessions_deletedAt_idx" ON "assessment_sessions"("deletedAt");

-- CreateIndex
CREATE INDEX "responses_sessionId_idx" ON "responses"("sessionId");

-- CreateIndex
CREATE INDEX "responses_orgId_idx" ON "responses"("orgId");

-- CreateIndex
CREATE INDEX "responses_questionId_idx" ON "responses"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "responses_sessionId_questionId_key" ON "responses"("sessionId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "fluency_profiles_sessionId_key" ON "fluency_profiles"("sessionId");

-- CreateIndex
CREATE INDEX "fluency_profiles_orgId_idx" ON "fluency_profiles"("orgId");

-- CreateIndex
CREATE INDEX "fluency_profiles_userId_idx" ON "fluency_profiles"("userId");

-- CreateIndex
CREATE INDEX "fluency_profiles_createdAt_idx" ON "fluency_profiles"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "learning_paths_profileId_key" ON "learning_paths"("profileId");

-- CreateIndex
CREATE INDEX "learning_paths_orgId_idx" ON "learning_paths"("orgId");

-- CreateIndex
CREATE INDEX "learning_paths_userId_idx" ON "learning_paths"("userId");

-- CreateIndex
CREATE INDEX "learning_paths_status_idx" ON "learning_paths"("status");

-- CreateIndex
CREATE INDEX "learning_path_modules_pathId_idx" ON "learning_path_modules"("pathId");

-- CreateIndex
CREATE INDEX "learning_path_modules_orgId_idx" ON "learning_path_modules"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_modules_pathId_moduleId_key" ON "learning_path_modules"("pathId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "module_completions_pathModuleId_key" ON "module_completions"("pathModuleId");

-- CreateIndex
CREATE INDEX "module_completions_orgId_idx" ON "module_completions"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_profileId_key" ON "certificates"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verificationUrl_key" ON "certificates"("verificationUrl");

-- CreateIndex
CREATE INDEX "certificates_orgId_idx" ON "certificates"("orgId");

-- CreateIndex
CREATE INDEX "certificates_userId_idx" ON "certificates"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_idx" ON "audit_logs"("orgId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "behavioral_indicators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_configs" ADD CONSTRAINT "sso_configs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "assessment_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_algorithmVersionId_fkey" FOREIGN KEY ("algorithmVersionId") REFERENCES "algorithm_versions"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "assessment_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fluency_profiles" ADD CONSTRAINT "fluency_profiles_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "assessment_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "fluency_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_modules" ADD CONSTRAINT "learning_path_modules_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_modules" ADD CONSTRAINT "learning_path_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "learning_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_completions" ADD CONSTRAINT "module_completions_pathModuleId_fkey" FOREIGN KEY ("pathModuleId") REFERENCES "learning_path_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "fluency_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
