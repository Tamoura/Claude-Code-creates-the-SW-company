-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'premium');

-- CreateEnum
CREATE TYPE "DigestFrequency" AS ENUM ('off', 'daily', 'weekly');

-- CreateEnum
CREATE TYPE "Dimension" AS ENUM ('academic', 'social_emotional', 'behavioural', 'aspirational', 'islamic', 'physical');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('positive', 'neutral', 'needs_attention');

-- CreateEnum
CREATE TYPE "AgeBand" AS ENUM ('early_years', 'primary', 'upper_primary', 'secondary');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'free',
    "digest_frequency" "DigestFrequency" NOT NULL DEFAULT 'off',
    "reset_token" TEXT,
    "reset_token_exp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "gender" "Gender",
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "content" VARCHAR(1000) NOT NULL,
    "sentiment" "Sentiment" NOT NULL,
    "observed_at" DATE NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_definitions" (
    "id" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "age_band" "AgeBand" NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "guidance" VARCHAR(500),
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "milestone_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_milestones" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "milestone_id" TEXT NOT NULL,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "achieved_at" TIMESTAMP(3),
    "achieved_history" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_cache" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stale" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "score_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parents_email_key" ON "parents"("email");

-- CreateIndex
CREATE INDEX "children_parent_id_idx" ON "children"("parent_id");

-- CreateIndex
CREATE INDEX "observations_child_id_dimension_idx" ON "observations"("child_id", "dimension");

-- CreateIndex
CREATE INDEX "observations_child_id_observed_at_idx" ON "observations"("child_id", "observed_at");

-- CreateIndex
CREATE INDEX "observations_child_id_deleted_at_idx" ON "observations"("child_id", "deleted_at");

-- CreateIndex
CREATE INDEX "observations_tags_idx" ON "observations" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "milestone_definitions_dimension_age_band_idx" ON "milestone_definitions"("dimension", "age_band");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_definitions_dimension_age_band_sort_order_key" ON "milestone_definitions"("dimension", "age_band", "sort_order");

-- CreateIndex
CREATE INDEX "child_milestones_child_id_idx" ON "child_milestones"("child_id");

-- CreateIndex
CREATE INDEX "child_milestones_milestone_id_idx" ON "child_milestones"("milestone_id");

-- CreateIndex
CREATE UNIQUE INDEX "child_milestones_child_id_milestone_id_key" ON "child_milestones"("child_id", "milestone_id");

-- CreateIndex
CREATE INDEX "score_cache_child_id_stale_idx" ON "score_cache"("child_id", "stale");

-- CreateIndex
CREATE UNIQUE INDEX "score_cache_child_id_dimension_key" ON "score_cache"("child_id", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_parent_id_idx" ON "sessions"("parent_id");

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_milestones" ADD CONSTRAINT "child_milestones_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_milestones" ADD CONSTRAINT "child_milestones_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestone_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_cache" ADD CONSTRAINT "score_cache_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
