/**
 * THE STANDING TWO-TENANT ISOLATION GATE.      ADR-004 §4 · AC-049 · AC-050
 *                                              NFR-008 · SC-001 · T027
 *
 * Not a one-off test. It re-asserts itself at every phase checkpoint, because
 * its meaning changes every time a route lands.
 *
 * It enumerates its targets from `docs/api-contract.yaml` — the document CI
 * already requires the router to match (API9) — and never from a list in this
 * file. A hand-maintained list is short by exactly the endpoint that leaks.
 *
 * WHAT IT PROVES TODAY, STATED PLAINLY: the API surface is `/health` and
 * `/health/live`. There are no tenant-scoped endpoints yet and therefore no
 * live cross-tenant HTTP probe to run. What is armed today is the COVERAGE
 * RULE: every implemented route must be classified from the contract, and the
 * first tenant-scoped route to be registered fails this suite until it is
 * probed. Live isolation today is proved one layer down, in
 * `rls-enforcement.test.ts` and `with-tenant.test.ts`, against a real database
 * and two real tenants.
 *
 * Verified by planting a violation: registering a `/v1/instances/:id` route and
 * running this file makes it fail. See the commit message.
 */
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../helpers';
import {
  CONTRACT_PATH,
  parseContract,
  routerRoutes,
  toRouterUrl,
  type ContractOperation,
  type RouterRoute,
} from '../../inventory';
import { adminPrisma, resetTenantData, seedTwoTenants, type TwoTenantFixture } from '../../db';
import { crossTenantProbe, tenantAuthHeaders } from './probe';

const CONTRACT: ContractOperation[] = parseContract(CONTRACT_PATH);

/**
 * Routes that exist in the router and deliberately NOT in the API contract.
 * Infrastructure, not API surface. Each needs a reason; the list is reviewed.
 * Anything else present in one and absent from the other fails the build.
 */
const ROUTER_ONLY: Record<string, string> = {
  'GET /health': 'Liveness/readiness probe. Infrastructure, not API surface (NFR-017).',
  'HEAD /health': 'Same route, HEAD is registered by Fastify alongside GET.',
  'GET /health/live': 'Kubernetes-style split probe. Dependency-free by design.',
  'HEAD /health/live': 'Same route, HEAD is registered by Fastify alongside GET.',
  'OPTIONS *': 'CORS preflight, registered by @fastify/cors.',
};

const key = (r: RouterRoute): string => `${r.method} ${r.url}`;

describe('[AC-049][AC-050][NFR-008] two-tenant isolation gate', () => {
  const admin = adminPrisma();
  let app: FastifyInstance;
  let routes: RouterRoute[];
  let fixture: TwoTenantFixture;

  beforeAll(async () => {
    app = await buildTestApp();
    routes = routerRoutes(app);
    await resetTenantData(admin);
    fixture = await seedTwoTenants(admin);
  });

  afterAll(async () => {
    await resetTenantData(admin);
    await admin.$disconnect();
    await app.close();
  });

  describe('[AC-050] the inventory the gate enumerates from', () => {
    it('[AC-050] reads the API contract rather than a list maintained in this file', () => {
      expect(CONTRACT.length).toBeGreaterThanOrEqual(50);
      expect(CONTRACT.some((o) => o.isPublic)).toBe(true);
      expect(CONTRACT.some((o) => !o.isPublic)).toBe(true);
    });

    it('[AC-050] reads the live router, and finds the routes that are known to exist', () => {
      const found = routes.map(key);
      expect(found).toContain('GET /health');
      expect(found).toContain('GET /health/live');
    });
  });

  describe('[AC-050] every implemented route is classified — no route escapes review', () => {
    it('[AC-050] fails on a route that is in neither the contract nor the reviewed router-only list', () => {
      const documented = new Set(
        CONTRACT.map((o) => `${o.method} ${toRouterUrl(o.path)}`)
      );
      const unclassified = routes.filter(
        (r) => !documented.has(key(r)) && !Object.hasOwn(ROUTER_ONLY, key(r))
      );

      expect(unclassified.map(key)).toEqual([]);
    });
  });

  describe('[AC-049] every implemented tenant-scoped route is probed cross-tenant', () => {
    /**
     * The coverage rule. `security: []` in the contract marks an endpoint as
     * unauthenticated; everything else resolves to one (tenant, membership) and
     * must be requested as a member of A using B's identifiers.
     */
    const tenantScoped = (): RouterRoute[] => {
      const publicUrls = new Set(
        CONTRACT.filter((o) => o.isPublic).map((o) => `${o.method} ${toRouterUrl(o.path)}`)
      );
      return routes.filter(
        (r) => !publicUrls.has(key(r)) && !Object.hasOwn(ROUTER_ONLY, key(r))
      );
    };

    it('[AC-049] probes every one of them, or fails naming the ones it could not', async () => {
      const targets = tenantScoped();

      // Stated rather than hidden: with no tenant routes registered, this
      // assertion is about arming, not about coverage. It becomes a real probe
      // the moment the first one lands, and fails loudly until it is wired.
      const headers = await tenantAuthHeaders(app, fixture.a);

      const leaked: string[] = [];
      for (const route of targets) {
        const result = await crossTenantProbe(app, route, headers, fixture.b);
        if (!result.isolated) leaked.push(`${key(route)} — ${result.reason}`);
      }

      expect(leaked).toEqual([]);
    });

    it('[AC-052] treats 403 as a FAILURE, not a pass — existence is never disclosed', () => {
      // The rule the probe encodes, asserted directly so it cannot be softened
      // in the probe without this failing too (FR-003, AC-052).
      expect(crossTenantProbe.ACCEPTABLE_STATUSES).toEqual([404]);
    });
  });
});
