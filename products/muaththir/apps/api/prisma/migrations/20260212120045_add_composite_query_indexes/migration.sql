-- CreateIndex
CREATE INDEX "child_milestones_child_id_achieved_achieved_at_idx" ON "child_milestones"("child_id", "achieved", "achieved_at");

-- CreateIndex
CREATE INDEX "observations_child_id_deleted_at_observed_at_idx" ON "observations"("child_id", "deleted_at", "observed_at");
