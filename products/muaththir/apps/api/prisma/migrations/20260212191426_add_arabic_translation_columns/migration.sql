-- AlterTable
ALTER TABLE "goal_templates" ADD COLUMN     "description_ar" VARCHAR(1000),
ADD COLUMN     "title_ar" VARCHAR(400);

-- AlterTable
ALTER TABLE "milestone_definitions" ADD COLUMN     "description_ar" VARCHAR(600),
ADD COLUMN     "guidance_ar" VARCHAR(1000),
ADD COLUMN     "title_ar" VARCHAR(200);

-- AlterTable
ALTER TABLE "observations" ADD COLUMN     "content_ar" VARCHAR(2000);
