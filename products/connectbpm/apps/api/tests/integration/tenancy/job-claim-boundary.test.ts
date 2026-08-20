/**
 * The one cross-tenant exception.        ADR-010 · ADR-004 §3 · ADR-009 · NFR-008
 *
 * ARCH-02 exists because ADR-004 §3 and ADR-009 contradicted each other and the
 * contradiction was INVISIBLE: `job` had ENABLE + FORCE row-level security, the
 * runner's cross-tenant claim matched zero rows, and the query reported success.
 * No error, no log — timers never fire, escalations never escalate, and the
 * engine looks healthy.
 *
 * These tests are written so that the SILENT failure cannot come back. The
 * first describe block is the regression: it plants a due job in each of two
 * tenants and asserts that a claim reaches BOTH. If the boundary is ever
 * removed, mis-owned or mis-policied, that test goes red instead of the product
 * going quiet.
 *
 * The remaining blocks assert the other half — that buying cross-tenant CLAIM
 * did not buy cross-tenant READ. Both halves have to hold; either one alone is
 * a different bug.
 */
import type { PrismaClient } from '@prisma/client';
import {
  adminPrisma,
  appPrisma,
  migratorPrisma,
  runnerPrisma,
  resetTenantData,
  seedDueJob,
  seedTwoTenants,
  type TwoTenantFixture,
} from '../../db';

interface ClaimedJob {
  job_id: string;
  tenant_id: string;
}

const claim = (db: PrismaClient, worker: string, batch = 100, cap = 100, lease = 60) =>
  db.$queryRawUnsafe<ClaimedJob[]>(
    'SELECT job_id, tenant_id FROM public.app_claim_due_jobs($1, $2::int, $3::int, $4::int)',
    worker,
    batch,
    cap,
    lease
  );

describe('[ADR-010][NFR-008] the cross-tenant job-claim boundary', () => {
  const admin = adminPrisma();
  const app = appPrisma();
  const runner = runnerPrisma();
  const owner = migratorPrisma();

  let fixture: TwoTenantFixture;
  let jobA: string;
  let jobB: string;

  beforeEach(async () => {
    await resetTenantData(admin);
    fixture = await seedTwoTenants(admin);
    jobA = await seedDueJob(admin, fixture.a.id, 'a');
    jobB = await seedDueJob(admin, fixture.b.id, 'b');
  });

  afterAll(async () => {
    await resetTenantData(admin);
    await Promise.all([
      admin.$disconnect(),
      app.$disconnect(),
      runner.$disconnect(),
      owner.$disconnect(),
    ]);
  });

  // ── the regression itself ────────────────────────────────────────────────

  describe('the runner claims due jobs across tenants', () => {
    it('claims BOTH tenants jobs in one call, with no tenant context set', async () => {
      const claimed = await claim(runner, 'worker-1');

      const tenants = claimed.map((c) => c.tenant_id).sort();
      expect(tenants).toEqual([fixture.a.id, fixture.b.id].sort());
      expect(claimed.map((c) => c.job_id).sort()).toEqual([jobA, jobB].sort());
    });

    it('takes the lease: status CLAIMED, worker recorded, attempts incremented', async () => {
      await claim(runner, 'worker-1');

      const rows = await admin.$queryRawUnsafe<
        Array<{ status: string; locked_by: string; attempts: number; leased: boolean }>
      >('SELECT status, locked_by, attempts, locked_until > now() AS leased FROM job');

      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.status).toBe('CLAIMED');
        expect(row.locked_by).toBe('worker-1');
        expect(row.attempts).toBe(1);
        expect(row.leased).toBe(true);
      }
    });

    it('does not claim the same job twice — a second call returns nothing', async () => {
      const first = await claim(runner, 'worker-1');
      const second = await claim(runner, 'worker-2');

      expect(first).toHaveLength(2);
      expect(second).toHaveLength(0);
    });

    it('does not claim a job that is not due yet', async () => {
      await resetTenantData(admin);
      fixture = await seedTwoTenants(admin);
      await seedDueJob(admin, fixture.a.id, 'future', -3600);

      expect(await claim(runner, 'worker-1')).toHaveLength(0);
    });

    it('returns ids and tenant ids ONLY — no payload crosses the boundary', async () => {
      const [first] = await claim(runner, 'worker-1');

      expect(first).toBeDefined();
      // The projection IS the guarantee: the runner learns which tenant to
      // enter, and learns nothing else until it is inside withTenant.
      expect(Object.keys(first as ClaimedJob).sort()).toEqual(['job_id', 'tenant_id']);
    });
  });

  // ── the lease reaper ─────────────────────────────────────────────────────

  describe('the lease reaper', () => {
    it('returns a crashed workers jobs to PENDING, across tenants', async () => {
      await claim(runner, 'doomed-worker');
      await admin.$executeRawUnsafe(
        "UPDATE job SET locked_until = now() - interval '5 minutes'"
      );

      const reaped = await runner.$queryRawUnsafe<ClaimedJob[]>(
        'SELECT job_id, tenant_id FROM public.app_reap_expired_job_leases(500)'
      );

      expect(reaped.map((r) => r.tenant_id).sort()).toEqual([fixture.a.id, fixture.b.id].sort());
      const rows = await admin.$queryRawUnsafe<Array<{ status: string; attempts: number }>>(
        'SELECT status, attempts FROM job'
      );
      for (const row of rows) {
        expect(row.status).toBe('PENDING');
        // NOT re-incremented. `attempts` counts claims, so a crash loop stays
        // bounded rather than resetting on every reap (ADR-009).
        expect(row.attempts).toBe(1);
      }
    });

    it('leaves a LIVE lease alone', async () => {
      await claim(runner, 'busy-worker', 100, 100, 600);

      const reaped = await runner.$queryRawUnsafe<ClaimedJob[]>(
        'SELECT job_id, tenant_id FROM public.app_reap_expired_job_leases(500)'
      );

      expect(reaped).toHaveLength(0);
    });
  });

  // ── the boundary is exactly one function wide ────────────────────────────

  describe('cross-tenant CLAIM did not buy cross-tenant READ', () => {
    it('the runner, in an ordinary session, still sees no job at all', async () => {
      const [row] = await runner.$queryRawUnsafe<Array<{ count: bigint }>>(
        'SELECT count(*) AS count FROM job'
      );

      expect(Number(row?.count)).toBe(0);
    });

    it('the runner inside withTenant(A) sees As job and not Bs', async () => {
      const rows = await runner.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${fixture.a.id}, true)`;
        return tx.$queryRawUnsafe<Array<{ id: string; tenant_id: string }>>(
          'SELECT id, tenant_id FROM job'
        );
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]?.id).toBe(jobA);
      expect(rows.map((r) => r.tenant_id)).not.toContain(fixture.b.id);
    });

    it('the runner cannot read another tenants job by primary key (FR-003: absent, not forbidden)', async () => {
      const rows = await runner.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${fixture.a.id}, true)`;
        return tx.$queryRawUnsafe<Array<{ id: string }>>(
          'SELECT id FROM job WHERE id = $1::uuid',
          jobB
        );
      });

      expect(rows).toHaveLength(0);
    });

    it('the runner cannot read another tenants working_calendar or process_definition', async () => {
      const rows = await runner.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.tenant_id', ${fixture.a.id}, true)`;
        return tx.$queryRawUnsafe<Array<{ calendars: bigint; definitions: bigint }>>(
          `SELECT (SELECT count(*) FROM working_calendar WHERE tenant_id = $1::uuid) AS calendars,
                  (SELECT count(*) FROM process_definition WHERE tenant_id = $1::uuid) AS definitions`,
          fixture.b.id
        );
      });

      expect(Number(rows[0]?.calendars)).toBe(0);
      expect(Number(rows[0]?.definitions)).toBe(0);
    });

    it('the API role cannot call the claim function at all', async () => {
      // Not "returns nothing" — REFUSED. A bug on the HTTP surface must not be
      // able to lease every tenants timers and suppress the engine globally.
      await expect(claim(app, 'rogue-api')).rejects.toThrow(/permission denied/i);
    });

    it('the API role cannot call the reaper either', async () => {
      await expect(
        app.$queryRawUnsafe('SELECT * FROM public.app_reap_expired_job_leases(10)')
      ).rejects.toThrow(/permission denied/i);
    });
  });

  // ── the confinement, asserted rather than assumed ────────────────────────

  describe('the claim principal is confined', () => {
    it('connectbpm_job_claimer is NOLOGIN, NOSUPERUSER and NOBYPASSRLS', async () => {
      const [role] = await admin.$queryRawUnsafe<
        Array<{ rolcanlogin: boolean; rolsuper: boolean; rolbypassrls: boolean }>
      >("SELECT rolcanlogin, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'connectbpm_job_claimer'");

      expect(role).toBeDefined();
      // NOLOGIN is what makes "reachable only through the function" true: there
      // is no session in which this role is the current_user except one the
      // function opened.
      expect(role?.rolcanlogin).toBe(false);
      expect(role?.rolsuper).toBe(false);
      expect(role?.rolbypassrls).toBe(false);
    });

    it('the MIGRATOR is a member of the claimer and STILL sees no job', async () => {
      // The load-bearing detail. Ownership transfer requires membership, and a
      // policy targeted `TO connectbpm_job_claimer` applies to MEMBERS too — so
      // without the `current_user` conjunct in the policy the table owner reads
      // every tenants jobs. Measured before the conjunct was added: 2 rows.
      const [row] = await owner.$queryRawUnsafe<Array<{ inherits: boolean; count: bigint }>>(
        `SELECT pg_has_role(current_user, 'connectbpm_job_claimer', 'USAGE') AS inherits,
                (SELECT count(*) FROM job) AS count`
      );

      expect(row?.inherits).toBe(true);
      expect(Number(row?.count)).toBe(0);
    });

    it('the claim functions are SECURITY DEFINER, owned by the claimer, search_path pinned', async () => {
      const fns = await admin.$queryRawUnsafe<
        Array<{ proname: string; owner: string; prosecdef: boolean; proconfig: string[] | null }>
      >(`SELECT p.proname, pg_get_userbyid(p.proowner) AS owner, p.prosecdef, p.proconfig
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname IN ('app_claim_due_jobs', 'app_reap_expired_job_leases')`);

      expect(fns).toHaveLength(2);
      for (const fn of fns) {
        expect(fn.prosecdef).toBe(true);
        // A function owned by connectbpm_migrator claims ZERO rows, because
        // FORCE ROW LEVEL SECURITY binds the table owner. Verified in ARCH-02.
        expect(fn.owner).toBe('connectbpm_job_claimer');
        expect(fn.proconfig ?? []).toContain('search_path=pg_catalog');
      }
    });

    it('the claimer cannot name job.payload, and holds no privilege on any other table', async () => {
      const rows = await admin.$queryRawUnsafe<Array<{ relname: string; attname: string; privilege_type: string }>>(
        `SELECT c.relname, a.attname, acl.privilege_type
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
           CROSS JOIN LATERAL aclexplode(a.attacl) acl
          WHERE n.nspname = 'public'
            AND acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'connectbpm_job_claimer')`
      );

      expect(rows.length).toBeGreaterThan(0);
      expect(new Set(rows.map((r) => r.relname))).toEqual(new Set(['job']));

      const readable = rows.filter((r) => r.privilege_type === 'SELECT').map((r) => r.attname).sort();
      const writable = rows.filter((r) => r.privilege_type === 'UPDATE').map((r) => r.attname).sort();

      expect(readable).toEqual(['attempts', 'id', 'locked_until', 'run_at', 'status', 'tenant_id']);
      expect(writable).toEqual(['attempts', 'locked_by', 'locked_until', 'status', 'updated_at']);
      // `payload` carries outbox bodies — tenant CONTENT. `tenant_id` is
      // readable and deliberately NOT writable: the claimer routes jobs, it
      // does not move them between tenants.
      expect(readable).not.toContain('payload');
      expect(writable).not.toContain('payload');
      expect(writable).not.toContain('tenant_id');
    });

    it('tenant_isolation on job is still a single unconditional equality', async () => {
      const [policy] = await admin.$queryRawUnsafe<Array<{ qual: string }>>(
        `SELECT qual FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'job' AND policyname = 'tenant_isolation'`
      );

      expect(policy).toBeDefined();
      // ADR-010 chose an ADDITIVE policy over amending this one, because a
      // predicate with no branch in it cannot fail open. If this assertion ever
      // fails, the option that was rejected has been adopted by accident.
      expect(policy?.qual).not.toMatch(/current_user/i);
      expect(policy?.qual).not.toMatch(/\bor\b/i);
    });
  });
});
