-- CreateIndex
CREATE INDEX "child_milestones_child_id_achieved_idx" ON "child_milestones"("child_id", "achieved");

-- CreateIndex
CREATE INDEX "parents_reset_token_idx" ON "parents"("reset_token");
