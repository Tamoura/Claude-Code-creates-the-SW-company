/* eslint-disable */
// FIXTURE — the ONE legal writer of usage_event (ADR-007).
export async function recordBillableCompletion(tx: any, e: any) {
  return tx.usageEvent.create({ data: e });
}
