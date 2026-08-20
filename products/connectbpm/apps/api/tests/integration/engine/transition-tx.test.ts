/**
 * The TransitionTx brand.                     ADR-007 · DEC-002 MET-2 · AC-012
 *
 * DEC-002 is irreversible and retroactive metering is impossible, so the meter
 * must increment inside the SAME transaction as the state transition. AC-012
 * asks CI to fail any code path that writes a usage event outside it. Static
 * analysis cannot decide that in general — ADR-007 makes it decidable by
 * construction instead: `recordBillableCompletion` takes a `TransitionTx`, and
 * a `TransitionTx` exists only inside the coordinator's transaction.
 *
 * This file tests the BRAND and its construction boundary only. The
 * coordinator, the ledger and the engine are P2 work and are deliberately not
 * implemented here — the brand has to exist first, because every later task
 * that writes a meter must be unable to compile without one.
 */
import {
  adminPrisma,
  appPrisma,
  resetTenantData,
  seedTwoTenants,
  type TwoTenantFixture,
} from '../../db';
import { withTenant, type TenantScopedClient } from '../../../src/tenancy';
import {
  assertTransitionTx,
  withTransitionTx,
  type TransitionTx,
} from '../../../src/engine/transition-tx';

describe('[AC-012][MET-2] TransitionTx is constructible only inside the transition scope', () => {
  const admin = adminPrisma();
  const app = appPrisma();
  let fixture: TwoTenantFixture;

  beforeAll(async () => {
    await resetTenantData(admin);
    fixture = await seedTwoTenants(admin);
  });

  afterAll(async () => {
    await resetTenantData(admin);
    await Promise.all([admin.$disconnect(), app.$disconnect()]);
  });

  const inTenant = <T>(fn: (db: TenantScopedClient) => Promise<T>): Promise<T> =>
    withTenant({ tenantId: fixture.a.id }, fn, { client: app });

  it('[AC-012] grants the brand inside withTransitionTx and nowhere else', async () => {
    await inTenant(async (db) => {
      const result = await withTransitionTx(db, async (tx) => {
        expect(assertTransitionTx(tx)).toBe(tx);
        return 'ok';
      });
      expect(result).toBe('ok');
      return null;
    });
  });

  it('[AC-012] refuses a TenantScopedClient posing as a TransitionTx', async () => {
    await inTenant(async (db) => {
      const forged = db as unknown as TransitionTx;
      expect(() => assertTransitionTx(forged)).toThrow(/Transition Coordinator/i);
      return null;
    });
  });

  it('[AC-012] refuses a bare object posing as a TransitionTx', () => {
    expect(() => assertTransitionTx({} as unknown as TransitionTx)).toThrow(
      /Transition Coordinator/i
    );
  });

  it('[AC-012] REVOKES the brand when the transition scope closes', async () => {
    let escaped: TransitionTx | undefined;
    await inTenant(async (db) => {
      await withTransitionTx(db, async (tx) => {
        escaped = tx;
        return null;
      });
      return null;
    });
    expect(() => assertTransitionTx(escaped as TransitionTx)).toThrow(/closed/i);
  });

  it('[AC-012][MET-2] refuses to open a transition scope outside a tenant transaction', async () => {
    const raw = app as unknown as TenantScopedClient;
    await expect(withTransitionTx(raw, async () => null)).rejects.toThrow(/withTenant/);
  });

  it('[AC-012][MET-2] the transition scope IS the tenant transaction — one rollback, not two', async () => {
    await expect(
      inTenant(async (db) =>
        withTransitionTx(db, async (tx) => {
          await tx.processDefinition.create({
            data: { key: 'transition-doomed', name: 'Doomed' } as never,
          });
          throw new Error('transition failed');
        })
      )
    ).rejects.toThrow('transition failed');

    const rows = await admin.processDefinition.findMany({
      where: { key: 'transition-doomed' },
    });
    expect(rows).toEqual([]);
  });

  it('[AC-012] revokes the brand even when the transition throws', async () => {
    let escaped: TransitionTx | undefined;
    await expect(
      inTenant(async (db) =>
        withTransitionTx(db, async (tx) => {
          escaped = tx;
          throw new Error('boom');
        })
      )
    ).rejects.toThrow('boom');
    expect(() => assertTransitionTx(escaped as TransitionTx)).toThrow(/closed/i);
  });
});
