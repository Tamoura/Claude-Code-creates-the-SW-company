-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- CreateEnum
CREATE TYPE "adr_status" AS ENUM ('proposed', 'accepted', 'deprecated', 'superseded');

-- DropIndex
DROP INDEX "idx_audit_logs_created_at_brin";

-- DropIndex
DROP INDEX "idx_knowledge_chunks_embedding";

-- DropIndex
DROP INDEX "idx_messages_content_trgm";

-- CreateTable
CREATE TABLE "architecture_decision_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "status" "adr_status" NOT NULL DEFAULT 'proposed',
    "context" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "consequences" TEXT,
    "alternatives" TEXT,
    "mermaid_diagram" TEXT,
    "conversation_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "architecture_decision_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "architecture_decision_records_organization_id_idx" ON "architecture_decision_records"("organization_id");

-- CreateIndex
CREATE INDEX "architecture_decision_records_status_idx" ON "architecture_decision_records"("status");

-- AddForeignKey
ALTER TABLE "architecture_decision_records" ADD CONSTRAINT "architecture_decision_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "architecture_decision_records" ADD CONSTRAINT "architecture_decision_records_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
