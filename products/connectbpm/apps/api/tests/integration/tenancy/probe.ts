/**
 * The cross-tenant probe.                      ADR-004 §4 · AC-049 · AC-052
 *
 * Requests one endpoint as a member of tenant A, substituting tenant B's
 * identifiers into every path parameter, and decides whether isolation held.
 *
 * Two rules, and they are not the same rule:
 *   1. the STATUS must be 404. Not 403, not 401, not 200 with an empty body.
 *      403 says "this exists and is not yours", which discloses existence
 *      across a tenant boundary (FR-003, AC-052). The response must be
 *      indistinguishable from one for a resource that never existed.
 *   2. NO VALUE ORIGINATING IN B may appear anywhere in the response — status
 *      alone is not enough, because an error body that echoes the identifier it
 *      refused is still a disclosure.
 */
import type { FastifyInstance } from 'fastify';
import type { RouterRoute } from '../../inventory';
import type { SeededTenant } from '../../db';

export interface ProbeResult {
  isolated: boolean;
  reason: string;
}

/** Statuses that count as isolation holding. Deliberately a single value. */
const ACCEPTABLE_STATUSES = [404] as const;

/**
 * Authenticates as a member of tenant A.
 *
 * NOT YET IMPLEMENTABLE: signup, login and membership are T018–T024 and do not
 * exist. Rather than return `{}` and let every probe pass as an unauthenticated
 * 404 — a gate reporting a pass it never evaluated — this throws the moment it
 * is actually needed, which is the moment the first tenant-scoped route is
 * registered.
 */
export async function tenantAuthHeaders(
  _app: FastifyInstance,
  _tenant: SeededTenant
): Promise<Record<string, string>> {
  return { 'x-isolation-probe': 'unauthenticated' };
}

function assertCanAuthenticate(headers: Record<string, string>): void {
  if (headers['x-isolation-probe'] === 'unauthenticated') {
    throw new Error(
      'The isolation suite cannot authenticate as a member of tenant A, but a ' +
        'tenant-scoped route is now registered. An unauthenticated 404 proves ' +
        'nothing about isolation. Implement tenantAuthHeaders() in ' +
        'tests/integration/tenancy/probe.ts against the real login route ' +
        '(T018–T024) before merging that route. AC-049 / AC-050.'
    );
  }
}

/** Every value that belongs to tenant B and must not appear in a response. */
function secretsOf(tenant: SeededTenant): string[] {
  return [
    tenant.id,
    tenant.slug,
    tenant.calendarId,
    tenant.calendarName,
    tenant.definitionId,
    tenant.definitionKey,
  ];
}

/** Substitutes B's identifiers into every `:param` in the route. */
function targetUrl(url: string, tenant: SeededTenant): string {
  return url.replace(/:([A-Za-z0-9_]+)/g, (_match, name: string) =>
    /calendar/i.test(name) ? tenant.calendarId : tenant.definitionId
  );
}

async function probe(
  app: FastifyInstance,
  route: RouterRoute,
  headers: Record<string, string>,
  tenantB: SeededTenant
): Promise<ProbeResult> {
  assertCanAuthenticate(headers);

  const response = await app.inject({
    method: route.method as 'GET',
    url: targetUrl(route.url, tenantB),
    headers,
  });

  if (!ACCEPTABLE_STATUSES.includes(response.statusCode as 404)) {
    return {
      isolated: false,
      reason:
        `responded ${response.statusCode}; a cross-tenant reference must be 404 ` +
        `(403 discloses that the resource exists — FR-003, AC-052)`,
    };
  }

  const body = response.body;
  const disclosed = secretsOf(tenantB).find((value) => body.includes(value));
  if (disclosed !== undefined) {
    return {
      isolated: false,
      reason: `body echoed a value originating in tenant B: ${disclosed}`,
    };
  }

  return { isolated: true, reason: 'isolated' };
}

export const crossTenantProbe = Object.assign(probe, { ACCEPTABLE_STATUSES });
