/**
 * The fail-closed guards on withTenant.        ADR-004 §2 · FR-002 · AC-051
 *
 * Each of these refuses to open a tenant scope at all. They are cheap to write
 * and easy to leave untested, and every one of them exists because the failure
 * it prevents is silent: a scope opened with no client, with a malformed tenant
 * id, or with no statement timeout would either fail far from its cause or hold
 * a transaction open indefinitely.
 */
import {
  registerTenancyClient,
  resetTenancyClientForTests,
  withTenant,
} from '../../../src/tenancy';
import { appPrisma } from '../../db';

const TENANT = '11111111-1111-4111-8111-111111111111';
const noop = async (): Promise<null> => null;

describe('[AC-051][FR-002] withTenant refuses to open an unsafe scope', () => {
  afterEach(() => {
    resetTenancyClientForTests();
  });

  it('[AC-051] refuses a tenantId that is not a UUID, naming the caller not a row', async () => {
    await expect(withTenant({ tenantId: 'not-a-uuid' }, noop)).rejects.toThrow(
      /not a UUID/
    );
    // The policy casts to uuid, so this would otherwise surface as a database
    // error during the first query, pointing at the table instead of the bug.
    await expect(withTenant({ tenantId: '' }, noop)).rejects.toThrow(/not a UUID/);
  });

  it('[AC-051] refuses when no client has been registered and none was passed', async () => {
    await expect(withTenant({ tenantId: TENANT }, noop)).rejects.toThrow(
      /No Prisma client registered/
    );
  });

  it('[AC-051] uses the registered client when no explicit one is given', async () => {
    const client = appPrisma();
    try {
      registerTenancyClient(client);
      await expect(
        withTenant({ tenantId: TENANT }, async (db) => db.workingCalendar.count())
      ).resolves.toBe(0);
    } finally {
      await client.$disconnect();
    }
  });

  it('[AC-051] refuses a statement timeout that is not a positive integer', async () => {
    const client = appPrisma();
    try {
      for (const statementTimeoutMs of [0, -1, 1.5, Number.NaN]) {
        await expect(
          withTenant({ tenantId: TENANT }, noop, { client, statementTimeoutMs })
        ).rejects.toThrow(/positive integer/);
      }
    } finally {
      await client.$disconnect();
    }
  });
});
