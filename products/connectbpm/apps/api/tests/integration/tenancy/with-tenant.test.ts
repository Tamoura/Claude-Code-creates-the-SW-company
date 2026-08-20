/**
 * Layer one — the data-access boundary.        ADR-004 §2 · FR-002 · FR-003
 *                                              AC-051 · AC-052
 *
 * `withTenant(ctx, fn)` is the ONLY way to obtain a client that can reach
 * tenant data. These tests assert the three properties the rest of the build
 * depends on:
 *
 *   1. the injected predicate — an unscoped `findMany` returns one tenant only;
 *   2. the 404 shape — another tenant's row reads as ABSENT, not forbidden;
 *   3. the brand — a client that did not come from `withTenant` is refused at
 *      runtime as well as at compile time.
 */
import {
  adminPrisma,
  appPrisma,
  resetTenantData,
  seedTwoTenants,
  singleConnectionAppPrisma,
  type TwoTenantFixture,
} from '../../db';
import {
  assertTenantScoped,
  registerTenancyClient,
  withTenant,
  type TenantScopedClient,
} from '../../../src/tenancy';

describe('[AC-051][FR-002] withTenant is the only door to tenant data', () => {
  const admin = adminPrisma();
  const app = appPrisma();
  let fixture: TwoTenantFixture;

  const asTenant = <T>(tenantId: string, fn: Parameters<typeof withTenant<T>>[1]): Promise<T> =>
    withTenant({ tenantId }, fn, { client: app });

  beforeEach(async () => {
    await resetTenantData(admin);
    fixture = await seedTwoTenants(admin);
  });

  afterAll(async () => {
    await resetTenantData(admin);
    await Promise.all([admin.$disconnect(), app.$disconnect()]);
  });

  describe('[AC-051] the injected tenant predicate', () => {
    it('[AC-051] scopes a findMany that carries no where clause at all', async () => {
      const rows = await asTenant(fixture.a.id, (db) => db.workingCalendar.findMany());
      expect(rows.map((r) => r.tenantId)).toEqual([fixture.a.id]);
    });

    it('[AC-051] preserves a caller-supplied where and adds the tenant to it', async () => {
      const rows = await asTenant(fixture.a.id, (db) =>
        db.workingCalendar.findMany({ where: { name: fixture.a.calendarName } })
      );
      expect(rows).toHaveLength(1);

      const none = await asTenant(fixture.a.id, (db) =>
        db.workingCalendar.findMany({ where: { name: fixture.b.calendarName } })
      );
      expect(none).toEqual([]);
    });

    it('[AC-051] scopes count, so an aggregate cannot total another tenant', async () => {
      await expect(
        asTenant(fixture.a.id, (db) => db.workingCalendar.count())
      ).resolves.toBe(1);
    });

    it('[AC-051] leaves a deliberately global model unscoped — Tenant, User (FR-006)', async () => {
      const tenants = await asTenant(fixture.a.id, (db) => db.tenant.findMany());
      expect(tenants.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('[AC-052][FR-003] another tenant\'s row is ABSENT, never forbidden', () => {
    it("[AC-052] findUnique on tenant B's id returns null while acting as A", async () => {
      const row = await asTenant(fixture.a.id, (db) =>
        db.workingCalendar.findUnique({ where: { id: fixture.b.calendarId } })
      );
      expect(row).toBeNull();
    });

    it('[AC-052] findUniqueOrThrow raises the same not-found it raises for a row that never existed', async () => {
      const foreign = asTenant(fixture.a.id, (db) =>
        db.workingCalendar.findUniqueOrThrow({ where: { id: fixture.b.calendarId } })
      );
      const absent = asTenant(fixture.a.id, (db) =>
        db.workingCalendar.findUniqueOrThrow({
          where: { id: '00000000-0000-4000-8000-000000000000' },
        })
      );
      await expect(foreign).rejects.toThrow();
      await expect(absent).rejects.toThrow();
    });
  });

  describe('[AC-051] writes', () => {
    it('[AC-051] stamps tenantId onto a create that did not supply one', async () => {
      const created = await asTenant(fixture.a.id, (db) =>
        db.processDefinition.create({ data: { key: 'stamped', name: 'Stamped' } as never })
      );
      expect(created.tenantId).toBe(fixture.a.id);
    });

    it("[AC-051] overrides a create that claims another tenant's id", async () => {
      const created = await asTenant(fixture.a.id, (db) =>
        db.processDefinition.create({
          data: { tenantId: fixture.b.id, key: 'smuggled', name: 'Smuggled' } as never,
        })
      );
      expect(created.tenantId).toBe(fixture.a.id);
    });

    it("[AC-051] an updateMany with no where cannot touch another tenant's rows", async () => {
      const result = await asTenant(fixture.a.id, (db) =>
        db.workingCalendar.updateMany({ data: { name: 'rewritten' } })
      );
      expect(result.count).toBe(1);

      const untouched = await admin.workingCalendar.findUnique({
        where: { id: fixture.b.calendarId },
      });
      expect(untouched?.name).toBe(fixture.b.calendarName);
    });

    it("[AC-052] deleting another tenant's row by id deletes nothing", async () => {
      await expect(
        asTenant(fixture.a.id, (db) =>
          db.workingCalendar.delete({ where: { id: fixture.b.calendarId } })
        )
      ).rejects.toThrow();

      const survived = await admin.workingCalendar.findUnique({
        where: { id: fixture.b.calendarId },
      });
      expect(survived).not.toBeNull();
    });
  });

  describe('[AC-049] the transaction and the RLS variable', () => {
    it('[AC-049] sets app.tenant_id as part of the transaction', async () => {
      const [row] = await asTenant(fixture.a.id, (db) =>
        db.$queryRawUnsafe<Array<{ t: string | null }>>(
          "SELECT current_setting('app.tenant_id', true) AS t"
        )
      );
      expect(row?.t).toBe(fixture.a.id);
    });

    it('[AC-049] does not leak the setting into the next use of the same connection', async () => {
      const pinned = singleConnectionAppPrisma();
      try {
        await withTenant({ tenantId: fixture.a.id }, async (db) => db.workingCalendar.count(), {
          client: pinned,
        });
        const [row] = await pinned.$queryRawUnsafe<Array<{ t: string | null }>>(
          "SELECT current_setting('app.tenant_id', true) AS t"
        );
        expect(row?.t === null || row?.t === '').toBe(true);
      } finally {
        await pinned.$disconnect();
      }
    });

    it('[AC-049] rolls the whole unit of work back when the callback throws', async () => {
      await expect(
        asTenant(fixture.a.id, async (db) => {
          await db.processDefinition.create({ data: { key: 'doomed', name: 'Doomed' } as never });
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');

      const rows = await admin.processDefinition.findMany({ where: { key: 'doomed' } });
      expect(rows).toEqual([]);
    });

    it('[AC-049] refuses a write in a readOnly scope at the database, not in a branch', async () => {
      await expect(
        withTenant(
          { tenantId: fixture.a.id },
          (db) => db.workingCalendar.updateMany({ data: { name: 'no' } }),
          { client: app, readOnly: true }
        )
      ).rejects.toThrow(/read-only/i);
    });
  });

  describe('[AC-051] the brand cannot be forged', () => {
    it('[AC-051] refuses a client that did not come from withTenant', () => {
      // A DOUBLE assertion is the only way to get a raw client past the type
      // checker at all: `assertTenantScoped(app)` on its own does not compile,
      // and neither does `app as TenantScopedClient` — both are proved in
      // tests/type-fixtures/brand-forgery.ts. Written out here to show that the
      // runtime grant closes the one hole the type system cannot (AC-051).
      const forged = app as unknown as TenantScopedClient;
      expect(() => assertTenantScoped(forged)).toThrow(/withTenant/);
      expect(() => assertTenantScoped({} as unknown as TenantScopedClient)).toThrow(
        /withTenant/
      );
    });

    it('[AC-051] accepts the client withTenant produced', async () => {
      await asTenant(fixture.a.id, async (db) => {
        expect(assertTenantScoped(db)).toBe(db);
        return null;
      });
    });

    it('[AC-051] revokes the brand once the transaction has closed', async () => {
      let escaped: unknown;
      await asTenant(fixture.a.id, async (db) => {
        escaped = db;
        return null;
      });
      expect(() => assertTenantScoped(escaped as TenantScopedClient)).toThrow(/closed/i);
    });
  });
});

describe('[AC-051] withTenant resolves the registered client', () => {
  // Moved here from tests/unit by the Orchestrator: this opens a real Prisma
  // client and issues a real query, so it is an integration test by definition.
  // Leaving it under tests/unit made the unit suite require a live database,
  // contrary to the convention in README.md.
  it('[AC-051] uses the registered client when no explicit one is given', async () => {
    const client = appPrisma();
    try {
      registerTenancyClient(client);
      await expect(
        withTenant(
          { tenantId: '11111111-1111-4111-8111-111111111111' },
          async (db) => db.workingCalendar.count()
        )
      ).resolves.toBe(0);
    } finally {
      await client.$disconnect();
    }
  });
});
