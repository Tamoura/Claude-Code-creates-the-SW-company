-- Add webhook delivery idempotency
-- This migration adds a resource_id field and unique constraint to prevent duplicate webhook deliveries

-- Add resource_id column (nullable initially for existing data)
ALTER TABLE webhook_deliveries
ADD COLUMN resource_id TEXT;

-- Update existing rows with a placeholder (if any exist)
-- In production, you'd want to populate this from the payload JSON
UPDATE webhook_deliveries
SET resource_id = CONCAT('legacy_', id)
WHERE resource_id IS NULL;

-- Make resource_id NOT NULL after populating existing data
ALTER TABLE webhook_deliveries
ALTER COLUMN resource_id SET NOT NULL;

-- Add unique constraint for idempotency
-- Prevents duplicate deliveries for same endpoint + event + resource
CREATE UNIQUE INDEX webhook_delivery_idempotency
ON webhook_deliveries(endpoint_id, event_type, resource_id);

-- Note: To apply this migration, run:
-- psql -d stablecoin_gateway_dev -f prisma/migrations/add_webhook_delivery_idempotency.sql
