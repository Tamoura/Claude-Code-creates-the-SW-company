-- AlterTable
ALTER TABLE "children" ADD COLUMN     "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "medical_notes" VARCHAR(1000),
ADD COLUMN     "special_needs" VARCHAR(500);

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "template_id" TEXT;

-- CreateTable
CREATE TABLE "goal_templates" (
    "id" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "age_band" "AgeBand" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "category" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "goal_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goal_templates_dimension_age_band_idx" ON "goal_templates"("dimension", "age_band");

-- CreateIndex
CREATE UNIQUE INDEX "goal_templates_dimension_age_band_sort_order_key" ON "goal_templates"("dimension", "age_band", "sort_order");

-- CreateIndex
CREATE INDEX "goals_template_id_idx" ON "goals"("template_id");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "goal_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
