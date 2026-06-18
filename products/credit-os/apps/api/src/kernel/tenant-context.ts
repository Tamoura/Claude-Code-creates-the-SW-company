/**
 * Tenant context — ADR-004 (single-tenant, multi-tenant-ready).
 *
 * Every request carries a `TenantContext`. The versioning base repository
 * (Phase 1) forces `WHERE tenantId = ctx.tenantId` on every query, so no
 * module can read or write across tenant boundaries.
 *
 * Phase 0: type contract only — no logic yet.
 */

/** Identifier types for clarity at call sites. */
export type TenantId = string;
export type ActorId = string;

/**
 * The resolved tenant + actor for the current unit of work.
 * Propagated from the auth plugin into every module service call.
 */
export interface TenantContext {
  /** The tenant whose data this unit of work may touch. */
  readonly tenantId: TenantId;
  /** The authenticated principal performing the action (audit actor). */
  readonly actorId: ActorId;
  /** Role claims from the OIDC token — used by RBAC preHandlers (Phase 1). */
  readonly roles: readonly string[];
  /**
   * Correlation id for tracing + audit. Mirrors the X-Request-ID header
   * propagated by `@connectsw/observability`.
   */
  readonly correlationId: string;
  /**
   * The auth surface the request arrived on — drives trust level
   * (ADR-006: internal web, branch, partner API, customer self-service).
   */
  readonly channel: AuthChannel;
}

/** The four launch channels (addendum — Clarifications, FRD-14.01). */
export type AuthChannel = 'web' | 'branch' | 'partner' | 'self-service';
