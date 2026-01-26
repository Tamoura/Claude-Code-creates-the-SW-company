import { PrismaClient } from '@prisma/client';

export async function generateDisplayId(
  prisma: PrismaClient,
  prefix: string
): Promise<string> {
  const sequence = await prisma.idSequence.upsert({
    where: { prefix },
    update: { currentValue: { increment: 1 } },
    create: { prefix, currentValue: 1 },
  });

  return `${prefix}-${sequence.currentValue.toString().padStart(5, '0')}`;
}
