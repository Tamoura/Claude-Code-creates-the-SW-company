-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'DESIGNER', 'PUBLISHER', 'PROCESS_OWNER', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "DefinitionStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('CLAIMED', 'ADMITTED', 'REFUSED');

-- CreateEnum
CREATE TYPE "BatchKind" AS ENUM ('BULK', 'SCHEDULE');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'ADMITTED', 'REFUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InstanceStatus" AS ENUM ('RUNNING', 'SUSPENDED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAULT_TERMINATED');

-- CreateEnum
CREATE TYPE "TerminalReason" AS ENUM ('COMPLETED', 'EXPIRED', 'CANCELLED', 'FAULT_TERMINATED');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'CONSUMED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'CLAIMED', 'COMPLETED', 'WITHDRAWN', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED');

-- CreateEnum
CREATE TYPE "ActorKind" AS ENUM ('MEMBER', 'SYSTEM', 'SCHEDULE', 'SUPPORT', 'EXTERNAL_PARTY');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('JSON', 'CSV');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('HELD', 'CONVERTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('SANDBOX', 'STARTER', 'GROWTH', 'BUSINESS', 'SOVEREIGN');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('TIMER_DUE', 'TIMER_REMINDER', 'TIMER_ESCALATION', 'INSTANCE_SLA', 'SCHEDULE_TICK', 'OUTBOX_WEBHOOK', 'OUTBOX_NOTIFICATION', 'RETENTION', 'RECONCILE', 'ERASURE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'CLAIMED', 'DONE', 'FAILED', 'DISCARDED');

-- CreateTable
CREATE TABLE "tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "default_locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "residency" TEXT NOT NULL DEFAULT 'global',
    "deployment_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "roles" "WorkspaceRole"[],
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "invited_email" TEXT,
    "invited_by_id" UUID,
    "invited_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family_id" UUID NOT NULL,
    "rotated_to_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_calendar" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "weekend_days" INTEGER[],
    "working_hours" JSONB NOT NULL,
    "holidays" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "working_calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_definition" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DefinitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "source_template_slug" TEXT,
    "source_template_version" INTEGER,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_definition_version" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "graph" JSONB NOT NULL,
    "condition_asts" JSONB NOT NULL DEFAULT '{}',
    "instance_sla" JSONB,
    "checksum" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "published_by_id" UUID,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_definition_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_schema" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "definition_version_id" UUID NOT NULL,
    "element_id" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_schema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_subscription" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "definition_id" UUID NOT NULL,
    "recurrence" JSONB NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_occurrence_at" TIMESTAMP(3),
    "next_occurrence_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_occurrence" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "schedule_subscription_id" UUID NOT NULL,
    "occurrence_at" TIMESTAMP(3) NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'CLAIMED',
    "instance_id" UUID,
    "batch_id" UUID,
    "refusal_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_occurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instance_batch" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "definition_version_id" UUID NOT NULL,
    "kind" "BatchKind" NOT NULL,
    "requested_count" INTEGER NOT NULL,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" UUID,
    "source_ref" JSONB,
    "refusal_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instance_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "process_instance" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "definition_version_id" UUID NOT NULL,
    "batch_id" UUID,
    "business_key" TEXT,
    "status" "InstanceStatus" NOT NULL DEFAULT 'RUNNING',
    "terminalReason" "TerminalReason",
    "completed_step_count" INTEGER NOT NULL DEFAULT 0,
    "is_test" BOOLEAN NOT NULL DEFAULT false,
    "evidence_seq" BIGINT NOT NULL DEFAULT 0,
    "started_by_id" UUID,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "element_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "status" "TokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "branch_of_element_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instance_variable" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instance_variable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "token_id" UUID,
    "element_id" TEXT NOT NULL,
    "assignee_id" UUID,
    "candidate_role" "WorkspaceRole",
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "due_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "outcome" TEXT,
    "comment" TEXT,
    "time_to_complete_ms" INTEGER,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachment" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "object_key" TEXT NOT NULL,
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "uploaded_by_id" UUID,
    "erased_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_entry" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "seq" BIGINT NOT NULL,
    "event_type" TEXT NOT NULL,
    "definition_version_id" UUID NOT NULL,
    "actor_kind" "ActorKind" NOT NULL,
    "actor_id" UUID,
    "actor_role" TEXT NOT NULL,
    "actor_ref" JSONB,
    "actor_locale" TEXT NOT NULL DEFAULT 'en',
    "occurred_at_utc" TIMESTAMP(3) NOT NULL,
    "occurred_at_local" TEXT NOT NULL,
    "payload" JSONB,
    "payload_hash" TEXT NOT NULL,
    "prev_hash" TEXT NOT NULL,
    "entry_hash" TEXT NOT NULL,
    "is_test" BOOLEAN NOT NULL DEFAULT false,
    "payload_erased_at" TIMESTAMP(3),
    "payload_erased_by_id" UUID,
    "payload_erasure_policy" TEXT,
    "payload_fields_removed" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_export" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "filters" JSONB NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "versions_covered" JSONB NOT NULL,
    "retention_gaps_noted" JSONB NOT NULL DEFAULT '[]',
    "artifact_hash" TEXT,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "generated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor" TEXT NOT NULL,
    "actor_kind" "ActorKind" NOT NULL DEFAULT 'MEMBER',
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "reason" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "correlation_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_event" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "meter" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "instance_id" UUID,
    "definition_id" UUID,
    "definition_version" INTEGER,
    "terminal_reason" "TerminalReason",
    "completed_step_count_at_event" INTEGER,
    "idempotency_key" TEXT NOT NULL,
    "billing_period" TEXT NOT NULL,
    "occurred_at_utc" TIMESTAMP(3) NOT NULL,
    "compensates_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_reservation" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "billing_period" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'HELD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "quota_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_counter" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "billing_period" TEXT NOT NULL,
    "billable_completions" INTEGER NOT NULL DEFAULT 0,
    "open_reservations" INTEGER NOT NULL DEFAULT 0,
    "refused_starts" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quota_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counter" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "billing_period" TEXT NOT NULL,
    "meter" TEXT NOT NULL,
    "hour_bucket" TIMESTAMP(3) NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_distinct_actor" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "billing_period" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_distinct_actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'SANDBOX',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "hard_cap" INTEGER NOT NULL,
    "overage_enabled" BOOLEAN NOT NULL DEFAULT false,
    "entitlements" JSONB NOT NULL DEFAULT '{}',
    "external_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_policy" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "evidence_retention_days" INTEGER NOT NULL,
    "attachment_retention_days" INTEGER NOT NULL,
    "last_run_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "kind" "JobKind" NOT NULL,
    "instance_id" UUID,
    "token_id" UUID,
    "token_version" INTEGER,
    "element_id" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "run_at" TIMESTAMP(3) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_by" TEXT,
    "locked_until" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoint" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_delivery" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "endpoint_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "resource_id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "next_attempt_at" TIMESTAMP(3),
    "succeeded_at" TIMESTAMP(3),
    "response_code" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "deep_link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "graph" JSONB NOT NULL,
    "form_schemas" JSONB NOT NULL,
    "condition_asts" JSONB NOT NULL DEFAULT '{}',
    "context_tags" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_locale" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "labels" JSONB NOT NULL,
    "disclaimer" TEXT NOT NULL,

    CONSTRAINT "template_locale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_slug_key" ON "tenant"("slug");

-- CreateIndex
CREATE INDEX "tenant_status_idx" ON "tenant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE INDEX "app_user_status_idx" ON "app_user"("status");

-- CreateIndex
CREATE INDEX "membership_tenant_id_status_idx" ON "membership"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "membership_tenant_id_user_id_idx" ON "membership"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "membership_user_id_idx" ON "membership"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "membership_tenant_id_user_id_key" ON "membership"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_revoked_at_idx" ON "refresh_token"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_token_family_id_idx" ON "refresh_token"("family_id");

-- CreateIndex
CREATE INDEX "refresh_token_expires_at_idx" ON "refresh_token"("expires_at");

-- CreateIndex
CREATE INDEX "working_calendar_tenant_id_is_default_idx" ON "working_calendar"("tenant_id", "is_default");

-- CreateIndex
CREATE INDEX "process_definition_tenant_id_status_idx" ON "process_definition"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "process_definition_tenant_id_name_idx" ON "process_definition"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "process_definition_tenant_id_key_key" ON "process_definition"("tenant_id", "key");

-- CreateIndex
CREATE INDEX "process_definition_version_tenant_id_status_idx" ON "process_definition_version"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "process_definition_version_tenant_id_definition_id_version_idx" ON "process_definition_version"("tenant_id", "definition_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "process_definition_version_definition_id_version_key" ON "process_definition_version"("definition_id", "version");

-- CreateIndex
CREATE INDEX "form_schema_tenant_id_definition_version_id_idx" ON "form_schema"("tenant_id", "definition_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_schema_definition_version_id_element_id_key" ON "form_schema"("definition_version_id", "element_id");

-- CreateIndex
CREATE INDEX "schedule_subscription_tenant_id_status_next_occurrence_at_idx" ON "schedule_subscription"("tenant_id", "status", "next_occurrence_at");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_subscription_definition_id_key" ON "schedule_subscription"("definition_id");

-- CreateIndex
CREATE INDEX "schedule_occurrence_tenant_id_occurrence_at_idx" ON "schedule_occurrence"("tenant_id", "occurrence_at");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_occurrence_schedule_subscription_id_occurrence_at_key" ON "schedule_occurrence"("schedule_subscription_id", "occurrence_at");

-- CreateIndex
CREATE INDEX "instance_batch_tenant_id_status_created_at_idx" ON "instance_batch"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "process_instance_tenant_id_status_started_at_idx" ON "process_instance"("tenant_id", "status", "started_at");

-- CreateIndex
CREATE INDEX "process_instance_tenant_id_definition_version_id_status_idx" ON "process_instance"("tenant_id", "definition_version_id", "status");

-- CreateIndex
CREATE INDEX "process_instance_tenant_id_business_key_idx" ON "process_instance"("tenant_id", "business_key");

-- CreateIndex
CREATE INDEX "process_instance_tenant_id_due_at_idx" ON "process_instance"("tenant_id", "due_at");

-- CreateIndex
CREATE INDEX "process_instance_tenant_id_batch_id_idx" ON "process_instance"("tenant_id", "batch_id");

-- CreateIndex
CREATE INDEX "token_tenant_id_instance_id_status_idx" ON "token"("tenant_id", "instance_id", "status");

-- CreateIndex
CREATE INDEX "token_tenant_id_instance_id_element_id_idx" ON "token"("tenant_id", "instance_id", "element_id");

-- CreateIndex
CREATE INDEX "instance_variable_tenant_id_instance_id_idx" ON "instance_variable"("tenant_id", "instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "instance_variable_instance_id_key_key" ON "instance_variable"("instance_id", "key");

-- CreateIndex
CREATE INDEX "task_tenant_id_assignee_id_status_due_at_idx" ON "task"("tenant_id", "assignee_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "task_tenant_id_candidate_role_status_due_at_idx" ON "task"("tenant_id", "candidate_role", "status", "due_at");

-- CreateIndex
CREATE INDEX "task_tenant_id_instance_id_idx" ON "task"("tenant_id", "instance_id");

-- CreateIndex
CREATE INDEX "task_tenant_id_status_due_at_idx" ON "task"("tenant_id", "status", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "task_tenant_id_idempotency_key_key" ON "task"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "attachment_object_key_key" ON "attachment"("object_key");

-- CreateIndex
CREATE INDEX "attachment_tenant_id_instance_id_idx" ON "attachment"("tenant_id", "instance_id");

-- CreateIndex
CREATE INDEX "attachment_tenant_id_scan_status_idx" ON "attachment"("tenant_id", "scan_status");

-- CreateIndex
CREATE INDEX "evidence_entry_tenant_id_instance_id_seq_idx" ON "evidence_entry"("tenant_id", "instance_id", "seq");

-- CreateIndex
CREATE INDEX "evidence_entry_tenant_id_occurred_at_utc_idx" ON "evidence_entry"("tenant_id", "occurred_at_utc");

-- CreateIndex
CREATE INDEX "evidence_entry_tenant_id_event_type_occurred_at_utc_idx" ON "evidence_entry"("tenant_id", "event_type", "occurred_at_utc");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_entry_instance_id_seq_key" ON "evidence_entry"("instance_id", "seq");

-- CreateIndex
CREATE INDEX "evidence_export_tenant_id_created_at_idx" ON "evidence_export"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "evidence_export_tenant_id_status_idx" ON "evidence_export"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_timestamp_idx" ON "audit_log"("tenant_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_actor_kind_timestamp_idx" ON "audit_log"("tenant_id", "actor_kind", "timestamp");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_action_idx" ON "audit_log"("tenant_id", "action");

-- CreateIndex
CREATE INDEX "usage_event_tenant_id_billing_period_billable_idx" ON "usage_event"("tenant_id", "billing_period", "billable");

-- CreateIndex
CREATE INDEX "usage_event_tenant_id_billing_period_meter_idx" ON "usage_event"("tenant_id", "billing_period", "meter");

-- CreateIndex
CREATE INDEX "usage_event_tenant_id_instance_id_idx" ON "usage_event"("tenant_id", "instance_id");

-- CreateIndex
CREATE INDEX "usage_event_tenant_id_occurred_at_utc_idx" ON "usage_event"("tenant_id", "occurred_at_utc");

-- CreateIndex
CREATE UNIQUE INDEX "usage_event_tenant_id_idempotency_key_key" ON "usage_event"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "quota_reservation_instance_id_key" ON "quota_reservation"("instance_id");

-- CreateIndex
CREATE INDEX "quota_reservation_tenant_id_billing_period_status_idx" ON "quota_reservation"("tenant_id", "billing_period", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quota_counter_tenant_id_billing_period_key" ON "quota_counter"("tenant_id", "billing_period");

-- CreateIndex
CREATE INDEX "usage_counter_tenant_id_billing_period_meter_idx" ON "usage_counter"("tenant_id", "billing_period", "meter");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counter_tenant_id_billing_period_meter_hour_bucket_key" ON "usage_counter"("tenant_id", "billing_period", "meter", "hour_bucket");

-- CreateIndex
CREATE INDEX "usage_distinct_actor_tenant_id_billing_period_dimension_idx" ON "usage_distinct_actor"("tenant_id", "billing_period", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "usage_distinct_actor_tenant_id_billing_period_dimension_act_key" ON "usage_distinct_actor"("tenant_id", "billing_period", "dimension", "actor_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tenant_id_key" ON "subscription"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_external_ref_key" ON "subscription"("external_ref");

-- CreateIndex
CREATE INDEX "subscription_tier_status_idx" ON "subscription"("tier", "status");

-- CreateIndex
CREATE UNIQUE INDEX "retention_policy_tenant_id_key" ON "retention_policy"("tenant_id");

-- CreateIndex
CREATE INDEX "job_run_at_id_idx" ON "job"("run_at", "id");

-- CreateIndex
CREATE INDEX "job_tenant_id_status_run_at_idx" ON "job"("tenant_id", "status", "run_at");

-- CreateIndex
CREATE INDEX "job_tenant_id_instance_id_idx" ON "job"("tenant_id", "instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_tenant_id_dedupe_key_key" ON "job"("tenant_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "webhook_endpoint_tenant_id_enabled_idx" ON "webhook_endpoint"("tenant_id", "enabled");

-- CreateIndex
CREATE INDEX "webhook_delivery_tenant_id_status_next_attempt_at_idx" ON "webhook_delivery"("tenant_id", "status", "next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_delivery_endpoint_id_event_type_resource_id_key" ON "webhook_delivery"("endpoint_id", "event_type", "resource_id");

-- CreateIndex
CREATE INDEX "notification_tenant_id_recipient_id_read_created_at_idx" ON "notification"("tenant_id", "recipient_id", "read", "created_at");

-- CreateIndex
CREATE INDEX "template_published_idx" ON "template"("published");

-- CreateIndex
CREATE UNIQUE INDEX "template_slug_version_key" ON "template"("slug", "version");

-- CreateIndex
CREATE UNIQUE INDEX "template_locale_template_id_locale_key" ON "template_locale"("template_id", "locale");

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_calendar" ADD CONSTRAINT "working_calendar_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_definition" ADD CONSTRAINT "process_definition_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_definition_version" ADD CONSTRAINT "process_definition_version_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "process_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_schema" ADD CONSTRAINT "form_schema_definition_version_id_fkey" FOREIGN KEY ("definition_version_id") REFERENCES "process_definition_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_subscription" ADD CONSTRAINT "schedule_subscription_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "process_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_occurrence" ADD CONSTRAINT "schedule_occurrence_schedule_subscription_id_fkey" FOREIGN KEY ("schedule_subscription_id") REFERENCES "schedule_subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instance_batch" ADD CONSTRAINT "instance_batch_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance" ADD CONSTRAINT "process_instance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance" ADD CONSTRAINT "process_instance_definition_version_id_fkey" FOREIGN KEY ("definition_version_id") REFERENCES "process_definition_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "process_instance" ADD CONSTRAINT "process_instance_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "instance_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token" ADD CONSTRAINT "token_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "process_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instance_variable" ADD CONSTRAINT "instance_variable_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "process_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "process_instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "process_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_entry" ADD CONSTRAINT "evidence_entry_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "process_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_export" ADD CONSTRAINT "evidence_export_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_event" ADD CONSTRAINT "usage_event_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "process_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_reservation" ADD CONSTRAINT "quota_reservation_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_reservation" ADD CONSTRAINT "quota_reservation_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "process_instance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_counter" ADD CONSTRAINT "quota_counter_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counter" ADD CONSTRAINT "usage_counter_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_distinct_actor" ADD CONSTRAINT "usage_distinct_actor_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_policy" ADD CONSTRAINT "retention_policy_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "token"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoint" ADD CONSTRAINT "webhook_endpoint_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_delivery" ADD CONSTRAINT "webhook_delivery_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_locale" ADD CONSTRAINT "template_locale_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
