-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('linkedin', 'twitter', 'hackernews', 'other');

-- CreateEnum
CREATE TYPE "PostFormat" AS ENUM ('text', 'carousel', 'infographic', 'link', 'poll', 'video');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('draft', 'review', 'approved', 'published', 'archived');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('writing', 'analysis', 'image', 'translation');

-- CreateTable
CREATE TABLE "trend_sources" (
    "id" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "platform" "Platform" NOT NULL DEFAULT 'other',
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_drafts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_ar" TEXT,
    "content_en" TEXT,
    "format" "PostFormat" NOT NULL DEFAULT 'text',
    "format_reason" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'draft',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tone" TEXT,
    "target_audience" TEXT,
    "supporting_material" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "trend_source_id" TEXT,

    CONSTRAINT "post_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carousel_slides" (
    "id" TEXT NOT NULL,
    "post_draft_id" TEXT NOT NULL,
    "slide_number" INTEGER NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image_prompt" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carousel_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_logs" (
    "id" TEXT NOT NULL,
    "post_draft_id" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "completion_tokens" INTEGER NOT NULL,
    "cost_usd" DOUBLE PRECISION NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "task_type" "TaskType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trend_sources_platform_idx" ON "trend_sources"("platform");

-- CreateIndex
CREATE INDEX "trend_sources_analyzed_at_idx" ON "trend_sources"("analyzed_at");

-- CreateIndex
CREATE INDEX "trend_sources_tags_idx" ON "trend_sources" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "post_drafts_status_idx" ON "post_drafts"("status");

-- CreateIndex
CREATE INDEX "post_drafts_format_idx" ON "post_drafts"("format");

-- CreateIndex
CREATE INDEX "post_drafts_trend_source_id_idx" ON "post_drafts"("trend_source_id");

-- CreateIndex
CREATE INDEX "post_drafts_created_at_idx" ON "post_drafts"("created_at");

-- CreateIndex
CREATE INDEX "post_drafts_tags_idx" ON "post_drafts" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "carousel_slides_post_draft_id_idx" ON "carousel_slides"("post_draft_id");

-- CreateIndex
CREATE UNIQUE INDEX "carousel_slides_post_draft_id_slide_number_key" ON "carousel_slides"("post_draft_id", "slide_number");

-- CreateIndex
CREATE INDEX "generation_logs_post_draft_id_idx" ON "generation_logs"("post_draft_id");

-- CreateIndex
CREATE INDEX "generation_logs_task_type_idx" ON "generation_logs"("task_type");

-- CreateIndex
CREATE INDEX "generation_logs_model_idx" ON "generation_logs"("model");

-- CreateIndex
CREATE INDEX "generation_logs_created_at_idx" ON "generation_logs"("created_at");

-- AddForeignKey
ALTER TABLE "post_drafts" ADD CONSTRAINT "post_drafts_trend_source_id_fkey" FOREIGN KEY ("trend_source_id") REFERENCES "trend_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carousel_slides" ADD CONSTRAINT "carousel_slides_post_draft_id_fkey" FOREIGN KEY ("post_draft_id") REFERENCES "post_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_post_draft_id_fkey" FOREIGN KEY ("post_draft_id") REFERENCES "post_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
