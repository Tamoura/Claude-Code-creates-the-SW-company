-- Add missing indexes for query performance and security checks

-- Client lookups by user (used in ownership verification, listing)
CREATE INDEX "clients_user_id_idx" ON "clients"("user_id");

-- Invoice lookups by user (used in listing, access control)
CREATE INDEX "invoices_user_id_idx" ON "invoices"("user_id");

-- Invoice lookups by client (used in joins, filtering)
CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");

-- Invoice filtering by user + status (used in dashboard queries)
CREATE INDEX "invoices_user_id_status_idx" ON "invoices"("user_id", "status");
