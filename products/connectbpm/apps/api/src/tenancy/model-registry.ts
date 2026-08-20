/**
 * Which models carry `tenantId`, and which deliberately do not.
 *                                              ADR-004 §1 · FR-002 · AC-051
 *
 * ADR-004 §2 requires `withTenant` to "throw on any model operation it does not
 * recognise — so a newly added model is scoped by default and a new
 * unregistered model fails loudly rather than silently leaking". This file is
 * that recognition set, and `tests/unit/tenancy/model-registry.test.ts` pins it
 * against BOTH the generated `Prisma.ModelName` enum and the `.prisma` file, so
 * it cannot drift from the schema without a red build.
 *
 * Adding a model to GLOBAL_MODELS is a reviewed act and the reason goes next to
 * it. The same five names are enumerated in the schema trailer (note 4) and in
 * `scripts/check-rls.ts`; all three lists are asserted equal.
 */

/**
 * Deliberately NOT tenant-scoped. Cross-tenant IDENTITY is a feature (FR-006,
 * EC-20); cross-tenant DATA is the failure this product cannot survive.
 */
export const GLOBAL_MODELS: ReadonlyMap<string, string> = new Map([
  ['Tenant', 'It IS the tenant; isolation is by its own id.'],
  ['User', 'Global identity — one human, many workspaces via Membership (FR-006).'],
  [
    'RefreshToken',
    'Scoped to the User, not the tenant: a session authenticates the human. ' +
      'Tenant-scoping it would force re-login per workspace and fragment the ' +
      'session-revocation surface.',
  ],
  ['Template', 'The shared template gallery is global by design (FR-153).'],
  ['TemplateLocale', 'Locale variants of Template, and global with it.'],
]);

/** The 27 models that carry a non-null `tenantId` and are covered by RLS. */
export const TENANT_SCOPED_MODELS: ReadonlySet<string> = new Set([
  'Membership',
  'WorkingCalendar',
  'ProcessDefinition',
  'ProcessDefinitionVersion',
  'FormSchema',
  'ScheduleSubscription',
  'ScheduleOccurrence',
  'InstanceBatch',
  'ProcessInstance',
  'Token',
  'InstanceVariable',
  'Task',
  'Attachment',
  'EvidenceEntry',
  'EvidenceExport',
  'AuditLog',
  'UsageEvent',
  'QuotaReservation',
  'QuotaCounter',
  'UsageCounter',
  'UsageDistinctActor',
  'Subscription',
  'RetentionPolicy',
  'Job',
  'WebhookEndpoint',
  'WebhookDelivery',
  'Notification',
]);

/**
 * Fails closed. A model this file has never heard of is a model nobody has
 * decided the isolation posture for, and guessing "probably global" is exactly
 * how a leak ships.
 */
export function assertKnownModel(model: string): void {
  if (TENANT_SCOPED_MODELS.has(model) || GLOBAL_MODELS.has(model)) return;
  throw new Error(
    `Model "${model}" is not registered in src/tenancy/model-registry.ts. ` +
      `withTenant refuses to run an operation whose tenant posture nobody has ` +
      `decided (ADR-004 §2). Add it to TENANT_SCOPED_MODELS, or to ` +
      `GLOBAL_MODELS with a written reason — and to the allowlist in ` +
      `scripts/check-rls.ts, which asserts the same five names.`
  );
}

/** True for a model whose rows must be filtered by `tenantId`. */
export function isTenantScopedModel(model: string): boolean {
  assertKnownModel(model);
  return TENANT_SCOPED_MODELS.has(model);
}
