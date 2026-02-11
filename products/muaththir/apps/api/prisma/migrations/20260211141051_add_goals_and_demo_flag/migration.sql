-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'paused');

-- AlterTable
ALTER TABLE "children" ADD COLUMN     "is_demo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "target_date" DATE,
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_child_id_dimension_idx" ON "goals"("child_id", "dimension");

-- CreateIndex
CREATE INDEX "goals_child_id_status_idx" ON "goals"("child_id", "status");

-- CreateIndex
CREATE INDEX "observations_child_id_dimension_observed_at_idx" ON "observations"("child_id", "dimension", "observed_at");

-- CreateIndex
CREATE INDEX "score_cache_calculated_at_idx" ON "score_cache"("calculated_at");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
