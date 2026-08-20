/**
 * The tenancy boundary.                        ADR-004 · FR-002 · FR-003
 *
 * Import `withTenant` and `TenantScopedClient` from here. Everything a
 * repository needs is on this surface; nothing on it can reach two tenants.
 */
export {
  assertTenantScoped,
  registerTenancyClient,
  resetTenancyClientForTests,
  withTenant,
  type TenantContext,
  type TenantScopedClient,
  type WithTenantOptions,
} from './with-tenant';

export {
  GLOBAL_MODELS,
  TENANT_SCOPED_MODELS,
  assertKnownModel,
  isTenantScopedModel,
} from './model-registry';
