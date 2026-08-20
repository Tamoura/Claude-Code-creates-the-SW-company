/**
 * Real-PostgreSQL test fixtures.               ADR-004, NFR-008, AC-049, AC-050
 *
 * CONVENTION (binding for all downstream agents):
 *   Every isolation fixture provisions TWO tenants. A single-tenant fixture
 *   cannot detect the one bug class this product cannot survive, so a test that
 *   creates one tenant and asserts it can read its own data proves nothing.
 *
 * Three connections, deliberately, because the isolation argument is about WHO
 * is connected, not only about what the SQL says:
 *
 *   appPrisma()      `connectbpm_app`      — what the API is. All assertions.
 *   migratorPrisma() `connectbpm_migrator` — the table OWNER. Used to prove
 *                                            FORCE RLS binds the owner too.
 *   adminPrisma()    superuser             — used ONLY to plant fixture rows for
 *                                            both tenants and to tear down. It
 *                                            bypasses RLS, which is exactly why
 *                                            it must never appear in an
 *                                            assertion: a fixture that could not
 *                                            plant tenant B's row would make
 *                                            "0 rows returned" meaningless.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

function clientFor(urlVar: 'DATABASE_URL' | 'DATABASE_URL_MIGRATOR' | 'ADMIN_DATABASE_URL'): PrismaClient {
  const url = process.env[urlVar];
  if (url === undefined || url === '') {
    throw new Error(`${urlVar} is not set — tests/setup.ts should have defaulted it`);
  }
  return new PrismaClient({ datasources: { db: { url } } });
}

export const appPrisma = (): PrismaClient => clientFor('DATABASE_URL');
export const migratorPrisma = (): PrismaClient => clientFor('DATABASE_URL_MIGRATOR');
export const adminPrisma = (): PrismaClient => clientFor('ADMIN_DATABASE_URL');

export interface SeededTenant {
  id: string;
  slug: string;
  /** A `working_calendar` row belonging to this tenant, and to no other. */
  calendarId: string;
  calendarName: string;
  /** A `process_definition` row belonging to this tenant, and to no other. */
  definitionId: string;
  definitionKey: string;
}

export interface TwoTenantFixture {
  a: SeededTenant;
  b: SeededTenant;
}

/**
 * `working_calendar` and `process_definition` are the fixture tables because
 * their only foreign key is to `tenant`. The isolation property under test is
 * the tenant predicate, so a fixture that first needs a definition version, an
 * instance and a token would be testing the seed script.
 */
async function seedTenant(db: PrismaClient, label: string): Promise<SeededTenant> {
  const id = randomUUID();
  const slug = `t-${label}-${id.slice(0, 8)}`;
  const calendarId = randomUUID();
  const calendarName = `calendar-${label}-${id.slice(0, 8)}`;
  const definitionId = randomUUID();
  const definitionKey = `key-${label}-${id.slice(0, 8)}`;

  await db.$executeRaw`
    INSERT INTO tenant (id, name, slug, updated_at)
    VALUES (${id}::uuid, ${`Tenant ${label}`}, ${slug}, now())`;
  await db.$executeRaw`
    INSERT INTO working_calendar
      (id, tenant_id, name, weekend_days, working_hours, updated_at)
    VALUES (${calendarId}::uuid, ${id}::uuid, ${calendarName},
            ARRAY[6,7], '{"start":"08:00","end":"17:00"}'::jsonb, now())`;
  await db.$executeRaw`
    INSERT INTO process_definition (id, tenant_id, key, name, updated_at)
    VALUES (${definitionId}::uuid, ${id}::uuid, ${definitionKey},
            ${`Definition ${label}`}, now())`;

  return { id, slug, calendarId, calendarName, definitionId, definitionKey };
}

/**
 * Plants two fully populated tenants using the ADMIN connection, so the rows
 * exist regardless of the state of row-level security. Every later assertion
 * runs as `connectbpm_app`.
 */
export async function seedTwoTenants(admin: PrismaClient): Promise<TwoTenantFixture> {
  return { a: await seedTenant(admin, 'a'), b: await seedTenant(admin, 'b') };
}

/** Removes every fixture row. Runs as admin: teardown must not be filtered. */
export async function resetTenantData(admin: PrismaClient): Promise<void> {
  await admin.$executeRawUnsafe(
    'TRUNCATE TABLE process_definition, working_calendar, membership, app_user, tenant CASCADE'
  );
}

/**
 * An app-role client pinned to ONE connection.
 *
 * `SET LOCAL` is transaction-scoped, which is the property that makes it safe
 * behind PgBouncer in transaction pooling mode (ADR-004 §3). Asserting that it
 * does not survive into a recycled connection is only deterministic if the next
 * query is guaranteed to reuse the same physical connection — with a pool it
 * would pass by luck.
 */
export function singleConnectionAppPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url === '') throw new Error('DATABASE_URL is not set');
  const pinned = new URL(url);
  pinned.searchParams.set('connection_limit', '1');
  pinned.searchParams.set('pool_timeout', '10');
  return new PrismaClient({ datasources: { db: { url: pinned.toString() } } });
}
