-- ============================================================================
-- Row-Level Security — the SECOND isolation layer.        ADR-004 §3 · T011
--
-- Requirements: NFR-008 (zero cross-tenant incidents), FR-002, FR-003,
-- AC-049, AC-050, AC-051, AC-052. STRAT-01 kill criterion K6.
--
-- Two layers must BOTH fail to produce a leak:
--   1. `withTenant` injects `where: { tenantId }` into every model operation
--      and is the only way to obtain a client that can reach tenant data.
--   2. This migration. It holds when layer 1 is wrong — a forgotten predicate,
--      a raw query, a Prisma operation the extension did not anticipate.
--
-- FORCE, not merely ENABLE. `ENABLE ROW LEVEL SECURITY` exempts the table
-- OWNER; `FORCE` removes that exemption. Without FORCE, any deployment whose
-- DATABASE_URL happens to name the owning role has no second layer at all and
-- nothing in the application would report it.
--
-- Default deny. When `app.tenant_id` is unset, `current_setting(..., true)`
-- returns NULL, the comparison is NULL, and no row qualifies. An empty string
-- is mapped to NULL first because ''::uuid raises rather than returning NULL,
-- and a policy that raises is a policy whose failure mode is a 500 rather than
-- an empty result.
--
-- WITH CHECK mirrors USING, so a write that claims another tenant's id is
-- refused rather than silently accepted and then invisible.
--
-- Scope: all 27 tenant-scoped tables. The 5 deliberately global tables
-- (tenant, app_user, refresh_token, template, template_locale)
-- are enumerated in the schema trailer note 4 and in scripts/check-rls.ts, and
-- are covered by no policy — cross-tenant IDENTITY is a feature (FR-006);
-- cross-tenant DATA is the failure.
--
-- Migrations that need to touch rows across tenants run as an administrative
-- role, or lift FORCE inside the reviewed migration itself. The migrator role
-- is NOSUPERUSER NOBYPASSRLS precisely so that it cannot do so by accident.
-- ============================================================================

-- Single point of truth for the predicate. Schema-qualified in every policy,
-- so a search_path manipulation at query time cannot redirect it, and only the
-- migrator can replace it (the app role holds no CREATE on schema public).
CREATE OR REPLACE FUNCTION public.app_current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

COMMENT ON FUNCTION public.app_current_tenant_id() IS
  'ADR-004 §3. Set by withTenant() via SET LOCAL / set_config(..., true), which is transaction-scoped and therefore safe behind PgBouncer in transaction pooling mode.';

-- Membership
ALTER TABLE "membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "membership";
CREATE POLICY tenant_isolation ON "membership"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- WorkingCalendar
ALTER TABLE "working_calendar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "working_calendar" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "working_calendar";
CREATE POLICY tenant_isolation ON "working_calendar"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- ProcessDefinition
ALTER TABLE "process_definition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "process_definition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "process_definition";
CREATE POLICY tenant_isolation ON "process_definition"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- ProcessDefinitionVersion
ALTER TABLE "process_definition_version" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "process_definition_version" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "process_definition_version";
CREATE POLICY tenant_isolation ON "process_definition_version"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- FormSchema
ALTER TABLE "form_schema" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "form_schema" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "form_schema";
CREATE POLICY tenant_isolation ON "form_schema"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- ScheduleSubscription
ALTER TABLE "schedule_subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_subscription" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "schedule_subscription";
CREATE POLICY tenant_isolation ON "schedule_subscription"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- ScheduleOccurrence
ALTER TABLE "schedule_occurrence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule_occurrence" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "schedule_occurrence";
CREATE POLICY tenant_isolation ON "schedule_occurrence"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- InstanceBatch
ALTER TABLE "instance_batch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "instance_batch" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "instance_batch";
CREATE POLICY tenant_isolation ON "instance_batch"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- ProcessInstance
ALTER TABLE "process_instance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "process_instance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "process_instance";
CREATE POLICY tenant_isolation ON "process_instance"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- Token
ALTER TABLE "token" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "token" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "token";
CREATE POLICY tenant_isolation ON "token"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- InstanceVariable
ALTER TABLE "instance_variable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "instance_variable" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "instance_variable";
CREATE POLICY tenant_isolation ON "instance_variable"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- Task
ALTER TABLE "task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "task";
CREATE POLICY tenant_isolation ON "task"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- Attachment
ALTER TABLE "attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attachment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "attachment";
CREATE POLICY tenant_isolation ON "attachment"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- EvidenceEntry
ALTER TABLE "evidence_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evidence_entry" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "evidence_entry";
CREATE POLICY tenant_isolation ON "evidence_entry"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- EvidenceExport
ALTER TABLE "evidence_export" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evidence_export" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "evidence_export";
CREATE POLICY tenant_isolation ON "evidence_export"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- AuditLog
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "audit_log";
CREATE POLICY tenant_isolation ON "audit_log"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- UsageEvent
ALTER TABLE "usage_event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_event" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "usage_event";
CREATE POLICY tenant_isolation ON "usage_event"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- QuotaReservation
ALTER TABLE "quota_reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quota_reservation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "quota_reservation";
CREATE POLICY tenant_isolation ON "quota_reservation"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- QuotaCounter
ALTER TABLE "quota_counter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quota_counter" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "quota_counter";
CREATE POLICY tenant_isolation ON "quota_counter"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- UsageCounter
ALTER TABLE "usage_counter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_counter" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "usage_counter";
CREATE POLICY tenant_isolation ON "usage_counter"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- UsageDistinctActor
ALTER TABLE "usage_distinct_actor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_distinct_actor" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "usage_distinct_actor";
CREATE POLICY tenant_isolation ON "usage_distinct_actor"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- Subscription
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "subscription";
CREATE POLICY tenant_isolation ON "subscription"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- RetentionPolicy
ALTER TABLE "retention_policy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "retention_policy" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "retention_policy";
CREATE POLICY tenant_isolation ON "retention_policy"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- Job
ALTER TABLE "job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "job";
CREATE POLICY tenant_isolation ON "job"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- WebhookEndpoint
ALTER TABLE "webhook_endpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_endpoint" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "webhook_endpoint";
CREATE POLICY tenant_isolation ON "webhook_endpoint"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- WebhookDelivery
ALTER TABLE "webhook_delivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_delivery" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "webhook_delivery";
CREATE POLICY tenant_isolation ON "webhook_delivery"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());

-- Notification
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "notification";
CREATE POLICY tenant_isolation ON "notification"
  AS PERMISSIVE FOR ALL TO PUBLIC
  USING (tenant_id = public.app_current_tenant_id())
  WITH CHECK (tenant_id = public.app_current_tenant_id());
