-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "daily_reminder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "milestone_alerts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weekly_digest" BOOLEAN NOT NULL DEFAULT false;
