/**
 * Layer two — PostgreSQL row-level security.   ADR-004 §3 · NFR-008 · AC-049/AC-050
 *
 * These tests deliberately do NOT go through `withTenant`. Every query below is
 * raw SQL with no tenant predicate at all — the shape a repository would have
 * if an engineer forgot to scope it. That is the entire point of the second
 * layer: it must hold when the application layer is wrong. A suite that only
 * exercised `withTenant` would pass identically with RLS switched off, and
 * would therefore be testing the query builder rather than the isolation.
 */
import { join } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { parseSchema, isTenantScoped } from '../../../scripts/schema-model';
import {
  adminPrisma,
  appPrisma,
  migratorPrisma,
  resetTenantData,
  seedTwoTenants,
  type TwoTenantFixture,
} from '../../db';

const TENANT_SCOPED_TABLES = parseSchema(
  join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma')
)
  .filter(isTenantScoped)
  .map((m) => m.table);

interface RelSecurity {
  relname: string;
  relrowsecurity: boolean;
  relforcerowsecurity: boolean;
  policies: bigint;
}

interface RolePosture {
  rolname: string;
  rolsuper: boolean;
  rolbypassrls: boolean;
}

/** Runs `fn` inside one transaction with `app.tenant_id` set, or unset. */
async function inTenantTx<T>(
  db: PrismaClient,
  tenantId: string | null,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    if (tenantId !== null) {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    }
    return fn(tx as unknown as PrismaClient);
  });
}

/** The unscoped read. No WHERE tenant_id — on purpose. */
async function readAllCalendars(db: PrismaClient): Promise<Array<{ tenant_id: string }>> {
  return db.$queryRawUnsafe<Array<{ tenant_id: string }>>(
    'SELECT tenant_id FROM working_calendar'
  );
}

describe('[AC-049][NFR-008] PostgreSQL row-level security is the second isolation layer', () => {
  const admin = adminPrisma();
  const app = appPrisma();
  const owner = migratorPrisma();
  let fixture: TwoTenantFixture;

  beforeAll(async () => {
    await resetTenantData(admin);
    fixture = await seedTwoTenants(admin);
  });

  afterAll(async () => {
    await resetTenantData(admin);
    await Promise.all([admin.$disconnect(), app.$disconnect(), owner.$disconnect()]);
  });

  describe('[AC-049] the role posture the whole layer depends on', () => {
    it('[AC-049] connects as a role that is neither superuser nor BYPASSRLS', async () => {
      const [posture] = await app.$queryRawUnsafe<RolePosture[]>(
        'SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user'
      );
      expect(posture).toBeDefined();
      expect(posture?.rolsuper).toBe(false);
      expect(posture?.rolbypassrls).toBe(false);
    });

    it('[AC-049] the table owner is also neither superuser nor BYPASSRLS', async () => {
      const [posture] = await owner.$queryRawUnsafe<RolePosture[]>(
        'SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user'
      );
      expect(posture?.rolsuper).toBe(false);
      expect(posture?.rolbypassrls).toBe(false);
    });

    it('[AC-049] the application role cannot create objects, so it cannot disable its own RLS', async () => {
      await expect(
        app.$executeRawUnsafe('CREATE TABLE rls_escape_hatch (id int)')
      ).rejects.toThrow();
    });
  });

  describe('[AC-049] structural coverage over all 27 tenant-scoped tables', () => {
    it('[AC-049] enables, FORCES and applies a policy to every tenant-scoped table', async () => {
      const rows = await app.$queryRawUnsafe<RelSecurity[]>(`
        SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
               (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
      `);
      const byTable = new Map(rows.map((r) => [r.relname, r]));

      const unprotected = TENANT_SCOPED_TABLES.filter((table) => {
        const row = byTable.get(table);
        return (
          row === undefined ||
          !row.relrowsecurity ||
          !row.relforcerowsecurity ||
          Number(row.policies) === 0
        );
      });

      expect(TENANT_SCOPED_TABLES).toHaveLength(27);
      expect(unprotected).toEqual([]);
    });
  });

  describe('[AC-050][FR-003] an unscoped query cannot reach another tenant', () => {
    it('[AC-050] returns NOTHING when no tenant context is set — default deny', async () => {
      const rows = await readAllCalendars(app);
      expect(rows).toEqual([]);
    });

    it('[AC-050] returns only tenant A rows when the context is tenant A', async () => {
      const rows = await inTenantTx(app, fixture.a.id, readAllCalendars);
      expect(rows.map((r) => r.tenant_id)).toEqual([fixture.a.id]);
    });

    it('[AC-050] returns only tenant B rows when the context is tenant B', async () => {
      const rows = await inTenantTx(app, fixture.b.id, readAllCalendars);
      expect(rows.map((r) => r.tenant_id)).toEqual([fixture.b.id]);
    });

    it("[AC-052][FR-003] cannot read tenant B's row by its primary key while acting as A", async () => {
      const rows = await inTenantTx(app, fixture.a.id, (tx) =>
        tx.$queryRawUnsafe<Array<{ id: string }>>(
          'SELECT id FROM working_calendar WHERE id = $1::uuid',
          fixture.b.calendarId
        )
      );
      // Not a permission error — an empty result, which the API renders as 404.
      expect(rows).toEqual([]);
    });

    it('[AC-050] filters the table OWNER too — FORCE, not merely ENABLE', async () => {
      const rows = await readAllCalendars(owner);
      expect(rows).toEqual([]);
    });
  });

  describe('[AC-051][FR-002] writes are constrained by the same predicate', () => {
    it("[AC-051] refuses an INSERT that claims another tenant's id", async () => {
      await expect(
        inTenantTx(app, fixture.a.id, (tx) =>
          tx.$executeRawUnsafe(
            `INSERT INTO working_calendar
               (id, tenant_id, name, weekend_days, working_hours, updated_at)
             VALUES (gen_random_uuid(), $1::uuid, 'smuggled', ARRAY[6,7], '{}'::jsonb, now())`,
            fixture.b.id
          )
        )
      ).rejects.toThrow(/row-level security/i);
    });

    it("[AC-051] an UPDATE with no predicate cannot touch another tenant's row", async () => {
      await inTenantTx(app, fixture.a.id, (tx) =>
        tx.$executeRawUnsafe("UPDATE working_calendar SET name = 'rewritten'")
      );

      const [row] = await admin.$queryRawUnsafe<Array<{ name: string }>>(
        'SELECT name FROM working_calendar WHERE id = $1::uuid',
        fixture.b.calendarId
      );
      expect(row?.name).toBe(fixture.b.calendarName);
    });

    it("[AC-051] a DELETE with no predicate cannot remove another tenant's row", async () => {
      await inTenantTx(app, fixture.a.id, (tx) =>
        tx.$executeRawUnsafe('DELETE FROM process_definition')
      );

      const [row] = await admin.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM process_definition WHERE id = $1::uuid',
        fixture.b.definitionId
      );
      expect(row?.id).toBe(fixture.b.definitionId);
    });
  });
});
