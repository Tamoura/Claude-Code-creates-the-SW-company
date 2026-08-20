/**
 * The TransitionTx brand.                     ADR-007 · DEC-002 MET-2 · AC-012
 *
 * DEC-002 is irreversible: the billable event is instance completion, the meter
 * increments in the SAME transaction as the state transition, and retroactive
 * metering is impossible. AC-012 requires CI to fail any code path that writes
 * a usage event outside that transaction — which static analysis cannot decide
 * in general. ADR-007 makes it decidable by construction:
 *
 *     recordBillableCompletion(tx: TransitionTx, e: BillableCompletion)
 *
 * is the only writer of `usage_event`, and it cannot be called without a
 * `TransitionTx`, which exists only inside `withTransitionTx`. The lint rules in
 * `scripts/check-metering-boundary.ts` become a backstop over a type-level
 * guarantee rather than being the guarantee themselves.
 *
 * SCOPE: this file is the brand and its construction boundary. The Transition
 * Coordinator, the usage ledger and the engine are P2 work and deliberately do
 * not exist yet. The brand ships first because every later task that writes a
 * meter must be UNABLE TO COMPILE without one — a brand added after the meter
 * would be a brand nothing depends on.
 *
 * The boundary is closed the same three ways the tenancy brand is closed (see
 * `src/tenancy/with-tenant.ts`): a non-exported unique symbol, a module-private
 * runtime grant that a double assertion cannot fake, and an eslint rule that
 * bans the assertion outside this file.
 *
 * A fourth closure is specific to metering: a transition scope can only be
 * opened around a LIVE `TenantScopedClient`. The meter therefore cannot be in a
 * different transaction from the state change even in principle, because there
 * is only ever one transaction — the tenant's (MET-2).
 */
import type { Prisma } from '@prisma/client';
import { assertTenantScoped, type TenantScopedClient } from '../tenancy';

declare const TransitionTxBrand: unique symbol;

/**
 * The transition transaction. Every effect of one transition — token move,
 * task completion, evidence entry, usage event, quota reservation, outbox row —
 * is written through this one client, so a SIGKILL at any point either loses
 * all of them or commits all of them (ADR-007, AC-009).
 */
export type TransitionTx = Prisma.TransactionClient & {
  readonly [TransitionTxBrand]: true;
};

const liveGrants = new WeakSet<object>();
const revokedGrants = new WeakSet<object>();

/**
 * Verifies at RUNTIME that this client came from `withTransitionTx` and that
 * its transaction is still open.
 *
 * `recordBillableCompletion` and every other writer on the transition path call
 * this first. The type is what stops the mistake in review; this is what stops
 * it in production, where the only way to produce a wrongly typed value is a
 * deliberate double assertion.
 */
export function assertTransitionTx(tx: TransitionTx): TransitionTx {
  if (liveGrants.has(tx)) return tx;
  if (revokedGrants.has(tx)) {
    throw new Error(
      'This TransitionTx is no longer usable: the transition scope it belonged ' +
        'to has CLOSED. A meter written through it would land outside the ' +
        'transition transaction and be unaccounted (DEC-002 MET-2).'
    );
  }
  throw new Error(
    'Not a TransitionTx. Only the Transition Coordinator produces one, inside ' +
      'its interactive transaction (ADR-007). A meter written through anything ' +
      'else is not in the same transaction as the state change, so a crash ' +
      'between them loses or duplicates revenue — which DEC-002 MET-2/MET-3 ' +
      'exist to make impossible.'
  );
}

/**
 * Promotes the tenant transaction into the transition transaction for the
 * duration of `fn`, and revokes the grant afterwards — on the success path and
 * on the throw path alike.
 *
 * OWNERSHIP: this is the Transition Coordinator's constructor. When the
 * coordinator lands (P2, T111+) it is its only caller. Nothing else may call
 * it; `eslint.config.mjs` restricts the import to `src/engine/`, and the value
 * export is useless to anyone who cannot also name the brand.
 */
export async function withTransitionTx<T>(
  db: TenantScopedClient,
  fn: (tx: TransitionTx) => Promise<T>
): Promise<T> {
  // MET-2 in one line: no tenant transaction, no transition scope, so the meter
  // and the state change cannot be in different transactions.
  assertTenantScoped(db);

  const tx = db as unknown as TransitionTx;
  liveGrants.add(tx);
  try {
    return await fn(tx);
  } finally {
    liveGrants.delete(tx);
    revokedGrants.add(tx);
  }
}
