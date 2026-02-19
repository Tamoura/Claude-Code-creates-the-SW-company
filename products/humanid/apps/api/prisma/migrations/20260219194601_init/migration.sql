-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('HOLDER', 'ISSUER', 'DEVELOPER', 'ADMIN');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "did_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "biometric_type" AS ENUM ('FIDO2', 'FACE');

-- CreateEnum
CREATE TYPE "recovery_method" AS ENUM ('PHRASE', 'SOCIAL', 'CLOUD');

-- CreateEnum
CREATE TYPE "recovery_status" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "credential_status" AS ENUM ('OFFERED', 'ACTIVE', 'REVOKED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "presentation_proof_type" AS ENUM ('FULL', 'SELECTIVE', 'ZKP');

-- CreateEnum
CREATE TYPE "presentation_status" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "verification_request_status" AS ENUM ('CREATED', 'SENT', 'PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "issuer_trust_status" AS ENUM ('PENDING', 'TRUSTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "anchor_entity_type" AS ENUM ('DID', 'CREDENTIAL', 'REVOCATION');

-- CreateEnum
CREATE TYPE "anchor_chain" AS ENUM ('POLYGON');

-- CreateEnum
CREATE TYPE "anchor_status" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "api_key_environment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "api_key_status" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'HOLDER',
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dids" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'humanid',
    "public_key" TEXT NOT NULL,
    "status" "did_status" NOT NULL DEFAULT 'ACTIVE',
    "key_agreement" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "did_documents" (
    "id" TEXT NOT NULL,
    "did_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "document" JSONB NOT NULL,
    "document_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "did_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_bindings" (
    "id" TEXT NOT NULL,
    "did_id" TEXT NOT NULL,
    "type" "biometric_type" NOT NULL,
    "template_hash" TEXT NOT NULL,
    "fido2_credential_id" TEXT,
    "fido2_public_key" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "biometric_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_configs" (
    "id" TEXT NOT NULL,
    "did_id" TEXT NOT NULL,
    "method" "recovery_method" NOT NULL,
    "encrypted_config" TEXT NOT NULL,
    "status" "recovery_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_info" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "holder_did_id" TEXT NOT NULL,
    "issuer_did_id" TEXT NOT NULL,
    "issuer_id" TEXT,
    "template_id" TEXT,
    "credential_type" TEXT NOT NULL,
    "encrypted_claims" TEXT NOT NULL,
    "proof" JSONB NOT NULL,
    "credential_hash" TEXT NOT NULL,
    "status" "credential_status" NOT NULL DEFAULT 'OFFERED',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_templates" (
    "id" TEXT NOT NULL,
    "issuer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credential_type" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "required_attributes" JSONB NOT NULL,
    "optional_attributes" JSONB NOT NULL,
    "default_expiry_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credential_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_presentations" (
    "id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "holder_did_id" TEXT NOT NULL,
    "verifier_did_id" TEXT,
    "verification_request_id" TEXT,
    "disclosed_attributes" JSONB NOT NULL,
    "proof_type" "presentation_proof_type" NOT NULL,
    "zkp_proof" JSONB,
    "status" "presentation_status" NOT NULL DEFAULT 'ACTIVE',
    "presented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "credential_presentations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "id" TEXT NOT NULL,
    "verifier_id" TEXT NOT NULL,
    "holder_did" TEXT NOT NULL,
    "requested_attributes" JSONB NOT NULL,
    "status" "verification_request_status" NOT NULL DEFAULT 'CREATED',
    "result" JSONB,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issuers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "did_id" TEXT NOT NULL,
    "organization_name" TEXT NOT NULL,
    "legal_entity_id" TEXT,
    "trust_status" "issuer_trust_status" NOT NULL DEFAULT 'PENDING',
    "allowed_credential_types" JSONB,
    "verification_documents" JSONB,
    "verified_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issuers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_anchors" (
    "id" TEXT NOT NULL,
    "entity_type" "anchor_entity_type" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "chain" "anchor_chain" NOT NULL DEFAULT 'POLYGON',
    "transaction_hash" TEXT,
    "block_number" TEXT,
    "data_hash" TEXT NOT NULL,
    "status" "anchor_status" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "anchored_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockchain_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" "api_key_environment" NOT NULL DEFAULT 'SANDBOX',
    "status" "api_key_status" NOT NULL DEFAULT 'ACTIVE',
    "permissions" JSONB NOT NULL DEFAULT '{"read":true,"write":true}',
    "rate_limit" INTEGER NOT NULL DEFAULT 100,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dids_did_key" ON "dids"("did");

-- CreateIndex
CREATE INDEX "dids_user_id_idx" ON "dids"("user_id");

-- CreateIndex
CREATE INDEX "dids_did_idx" ON "dids"("did");

-- CreateIndex
CREATE INDEX "dids_status_idx" ON "dids"("status");

-- CreateIndex
CREATE INDEX "did_documents_did_id_idx" ON "did_documents"("did_id");

-- CreateIndex
CREATE UNIQUE INDEX "did_documents_did_id_version_key" ON "did_documents"("did_id", "version");

-- CreateIndex
CREATE INDEX "biometric_bindings_did_id_idx" ON "biometric_bindings"("did_id");

-- CreateIndex
CREATE INDEX "biometric_bindings_fido2_credential_id_idx" ON "biometric_bindings"("fido2_credential_id");

-- CreateIndex
CREATE INDEX "recovery_configs_did_id_idx" ON "recovery_configs"("did_id");

-- CreateIndex
CREATE INDEX "recovery_configs_status_idx" ON "recovery_configs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_token_hash_idx" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "credentials_holder_did_id_idx" ON "credentials"("holder_did_id");

-- CreateIndex
CREATE INDEX "credentials_issuer_did_id_idx" ON "credentials"("issuer_did_id");

-- CreateIndex
CREATE INDEX "credentials_issuer_id_idx" ON "credentials"("issuer_id");

-- CreateIndex
CREATE INDEX "credentials_template_id_idx" ON "credentials"("template_id");

-- CreateIndex
CREATE INDEX "credentials_status_idx" ON "credentials"("status");

-- CreateIndex
CREATE INDEX "credentials_credential_type_idx" ON "credentials"("credential_type");

-- CreateIndex
CREATE INDEX "credentials_issued_at_idx" ON "credentials"("issued_at");

-- CreateIndex
CREATE INDEX "credential_templates_issuer_id_idx" ON "credential_templates"("issuer_id");

-- CreateIndex
CREATE INDEX "credential_templates_credential_type_idx" ON "credential_templates"("credential_type");

-- CreateIndex
CREATE INDEX "credential_templates_is_active_idx" ON "credential_templates"("is_active");

-- CreateIndex
CREATE INDEX "credential_presentations_credential_id_idx" ON "credential_presentations"("credential_id");

-- CreateIndex
CREATE INDEX "credential_presentations_holder_did_id_idx" ON "credential_presentations"("holder_did_id");

-- CreateIndex
CREATE INDEX "credential_presentations_verifier_did_id_idx" ON "credential_presentations"("verifier_did_id");

-- CreateIndex
CREATE INDEX "credential_presentations_verification_request_id_idx" ON "credential_presentations"("verification_request_id");

-- CreateIndex
CREATE INDEX "credential_presentations_status_idx" ON "credential_presentations"("status");

-- CreateIndex
CREATE INDEX "credential_presentations_presented_at_idx" ON "credential_presentations"("presented_at");

-- CreateIndex
CREATE INDEX "verification_requests_verifier_id_idx" ON "verification_requests"("verifier_id");

-- CreateIndex
CREATE INDEX "verification_requests_holder_did_idx" ON "verification_requests"("holder_did");

-- CreateIndex
CREATE INDEX "verification_requests_status_idx" ON "verification_requests"("status");

-- CreateIndex
CREATE INDEX "verification_requests_expires_at_idx" ON "verification_requests"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "issuers_did_id_key" ON "issuers"("did_id");

-- CreateIndex
CREATE INDEX "issuers_user_id_idx" ON "issuers"("user_id");

-- CreateIndex
CREATE INDEX "issuers_did_id_idx" ON "issuers"("did_id");

-- CreateIndex
CREATE INDEX "issuers_trust_status_idx" ON "issuers"("trust_status");

-- CreateIndex
CREATE INDEX "issuers_organization_name_idx" ON "issuers"("organization_name");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_anchors_transaction_hash_key" ON "blockchain_anchors"("transaction_hash");

-- CreateIndex
CREATE INDEX "blockchain_anchors_entity_type_entity_id_idx" ON "blockchain_anchors"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "blockchain_anchors_status_idx" ON "blockchain_anchors"("status");

-- CreateIndex
CREATE INDEX "blockchain_anchors_chain_idx" ON "blockchain_anchors"("chain");

-- CreateIndex
CREATE INDEX "blockchain_anchors_transaction_hash_idx" ON "blockchain_anchors"("transaction_hash");

-- CreateIndex
CREATE INDEX "blockchain_anchors_created_at_idx" ON "blockchain_anchors"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "api_keys"("user_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_environment_idx" ON "api_keys"("environment");

-- CreateIndex
CREATE INDEX "api_keys_status_idx" ON "api_keys"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "dids" ADD CONSTRAINT "dids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "did_documents" ADD CONSTRAINT "did_documents_did_id_fkey" FOREIGN KEY ("did_id") REFERENCES "dids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_bindings" ADD CONSTRAINT "biometric_bindings_did_id_fkey" FOREIGN KEY ("did_id") REFERENCES "dids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_configs" ADD CONSTRAINT "recovery_configs_did_id_fkey" FOREIGN KEY ("did_id") REFERENCES "dids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_holder_did_id_fkey" FOREIGN KEY ("holder_did_id") REFERENCES "dids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_issuer_did_id_fkey" FOREIGN KEY ("issuer_did_id") REFERENCES "dids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "credential_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_templates" ADD CONSTRAINT "credential_templates_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_presentations" ADD CONSTRAINT "credential_presentations_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_presentations" ADD CONSTRAINT "credential_presentations_holder_did_id_fkey" FOREIGN KEY ("holder_did_id") REFERENCES "dids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_presentations" ADD CONSTRAINT "credential_presentations_verifier_did_id_fkey" FOREIGN KEY ("verifier_did_id") REFERENCES "dids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_presentations" ADD CONSTRAINT "credential_presentations_verification_request_id_fkey" FOREIGN KEY ("verification_request_id") REFERENCES "verification_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_verifier_id_fkey" FOREIGN KEY ("verifier_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issuers" ADD CONSTRAINT "issuers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issuers" ADD CONSTRAINT "issuers_did_id_fkey" FOREIGN KEY ("did_id") REFERENCES "dids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_anchors" ADD CONSTRAINT "fk_anchor_did" FOREIGN KEY ("entity_id") REFERENCES "dids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_anchors" ADD CONSTRAINT "fk_anchor_credential" FOREIGN KEY ("entity_id") REFERENCES "credentials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_presentation" FOREIGN KEY ("entity_id") REFERENCES "credential_presentations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
