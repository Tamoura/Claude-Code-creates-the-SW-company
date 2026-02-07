-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MERCHANT', 'ADMIN');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'REFUNDED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'DELIVERING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MERCHANT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "amount" DECIMAL(18,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "network" TEXT NOT NULL DEFAULT 'polygon',
    "token" TEXT NOT NULL DEFAULT 'USDC',
    "tx_hash" TEXT,
    "block_number" INTEGER,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "customer_address" TEXT,
    "merchant_address" TEXT NOT NULL,
    "success_url" TEXT,
    "cancel_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "payment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "payment_session_id" TEXT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "reason" TEXT,
    "idempotency_key" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "tx_hash" TEXT,
    "block_number" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{"read":true,"write":true,"refund":false}',
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "endpoint_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "resource_id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "last_attempt_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3),
    "succeeded_at" TIMESTAMP(3),
    "response_code" INTEGER,
    "response_body" TEXT,
    "error_message" TEXT,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_links" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "name" TEXT,
    "amount" DECIMAL(18,6),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "network" TEXT NOT NULL DEFAULT 'polygon',
    "token" TEXT NOT NULL DEFAULT 'USDC',
    "merchant_address" TEXT NOT NULL,
    "success_url" TEXT,
    "cancel_url" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "max_usages" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_on_payment_received" BOOLEAN NOT NULL DEFAULT true,
    "email_on_refund_processed" BOOLEAN NOT NULL DEFAULT true,
    "email_on_payment_failed" BOOLEAN NOT NULL DEFAULT false,
    "send_customer_receipt" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "details" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_revoked_at_idx" ON "refresh_tokens"("revoked_at");
CREATE UNIQUE INDEX "payment_sessions_tx_hash_key" ON "payment_sessions"("tx_hash");
CREATE UNIQUE INDEX "payment_sessions_userId_idempotencyKey_key" ON "payment_sessions"("user_id", "idempotency_key");
CREATE INDEX "payment_sessions_user_id_status_idx" ON "payment_sessions"("user_id", "status");
CREATE INDEX "payment_sessions_status_created_at_idx" ON "payment_sessions"("status", "created_at");
CREATE INDEX "payment_sessions_tx_hash_idx" ON "payment_sessions"("tx_hash");
CREATE INDEX "payment_sessions_idempotency_key_idx" ON "payment_sessions"("idempotency_key");
CREATE INDEX "payment_sessions_merchant_address_idx" ON "payment_sessions"("merchant_address");
CREATE INDEX "payment_sessions_expires_at_idx" ON "payment_sessions"("expires_at");
CREATE INDEX "payment_sessions_network_idx" ON "payment_sessions"("network");
CREATE UNIQUE INDEX "refunds_tx_hash_key" ON "refunds"("tx_hash");
CREATE UNIQUE INDEX "refunds_payment_session_id_idempotency_key_key" ON "refunds"("payment_session_id", "idempotency_key");
CREATE INDEX "refunds_payment_session_id_idx" ON "refunds"("payment_session_id");
CREATE INDEX "refunds_idempotency_key_idx" ON "refunds"("idempotency_key");
CREATE INDEX "refunds_status_created_at_idx" ON "refunds"("status", "created_at");
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");
CREATE INDEX "webhook_endpoints_user_id_idx" ON "webhook_endpoints"("user_id");
CREATE UNIQUE INDEX "webhook_deliveries_endpoint_id_event_type_resource_id_key" ON "webhook_deliveries"("endpoint_id", "event_type", "resource_id");
CREATE INDEX "webhook_deliveries_endpoint_id_status_idx" ON "webhook_deliveries"("endpoint_id", "status");
CREATE INDEX "webhook_deliveries_status_next_attempt_at_idx" ON "webhook_deliveries"("status", "next_attempt_at");
CREATE UNIQUE INDEX "payment_links_short_code_key" ON "payment_links"("short_code");
CREATE INDEX "payment_links_user_id_idx" ON "payment_links"("user_id");
CREATE INDEX "payment_links_short_code_idx" ON "payment_links"("short_code");
CREATE INDEX "payment_links_active_created_at_idx" ON "payment_links"("active", "created_at");
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs"("actor");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs"("resource_type");
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_sessions" ADD CONSTRAINT "payment_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_session_id_fkey" FOREIGN KEY ("payment_session_id") REFERENCES "payment_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
