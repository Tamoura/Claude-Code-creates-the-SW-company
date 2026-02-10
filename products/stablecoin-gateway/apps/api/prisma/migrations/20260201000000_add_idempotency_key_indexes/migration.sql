-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "payment_sessions_idempotency_key_idx" ON "payment_sessions"("idempotency_key");

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "refunds_idempotency_key_idx" ON "refunds"("idempotency_key");
