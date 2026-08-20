/* eslint-disable */
// FIXTURE — deliberately violates the metering boundary. Never imported by the
// app; it exists so the CI gate can be proven to fail on a real violation
// rather than merely reported as present.
import { UsageService } from '@connectsw/billing/backend';

export async function completeInstance(prisma: any, instanceId: string) {
  await prisma.usageEvent.create({ data: { instanceId, billable: true } });
  await UsageService.increment('instances', 1);
  await prisma.usageEvent.update({ where: { id: instanceId }, data: {} });
  const fn = new Function('return 1');
  return fn();
}
