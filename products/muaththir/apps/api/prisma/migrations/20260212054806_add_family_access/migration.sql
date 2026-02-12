-- CreateEnum
CREATE TYPE "ShareRole" AS ENUM ('viewer', 'contributor');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('pending', 'accepted', 'declined');

-- CreateTable
CREATE TABLE "family_access" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "invitee_email" TEXT NOT NULL,
    "invitee_id" TEXT,
    "role" "ShareRole" NOT NULL DEFAULT 'viewer',
    "status" "ShareStatus" NOT NULL DEFAULT 'pending',
    "child_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "family_access_invitee_email_idx" ON "family_access"("invitee_email");

-- CreateIndex
CREATE INDEX "family_access_invitee_id_idx" ON "family_access"("invitee_id");

-- CreateIndex
CREATE INDEX "family_access_parent_id_idx" ON "family_access"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "family_access_parent_id_invitee_email_key" ON "family_access"("parent_id", "invitee_email");

-- CreateIndex
CREATE INDEX "goals_child_id_status_updated_at_idx" ON "goals"("child_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "observations_child_id_deleted_at_dimension_idx" ON "observations"("child_id", "deleted_at", "dimension");

-- CreateIndex
CREATE INDEX "sessions_parent_id_expires_at_idx" ON "sessions"("parent_id", "expires_at");

-- AddForeignKey
ALTER TABLE "family_access" ADD CONSTRAINT "family_access_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
