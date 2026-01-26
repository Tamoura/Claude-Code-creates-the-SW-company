import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { generateDisplayId } from '../../src/services/id-generator.service.js';

const prisma = new PrismaClient();

describe('ID Generator Service', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.idSequence.deleteMany({
      where: { prefix: { in: ['TST', 'INC'] } },
    });
  });

  it('should generate INC-00001 for first incident', async () => {
    const id = await generateDisplayId(prisma, 'INC');
    expect(id).toBe('INC-00001');
  });

  it('should generate sequential IDs', async () => {
    const id1 = await generateDisplayId(prisma, 'TST');
    const id2 = await generateDisplayId(prisma, 'TST');
    const id3 = await generateDisplayId(prisma, 'TST');

    expect(id1).toBe('TST-00001');
    expect(id2).toBe('TST-00002');
    expect(id3).toBe('TST-00003');
  });

  it('should handle different prefixes independently', async () => {
    const inc1 = await generateDisplayId(prisma, 'INC');
    const prb1 = await generateDisplayId(prisma, 'PRB');
    const inc2 = await generateDisplayId(prisma, 'INC');

    expect(inc1).toBe('INC-00001');
    expect(prb1).toBe('PRB-00001');
    expect(inc2).toBe('INC-00002');
  });

  it('should pad numbers correctly up to 99999', async () => {
    // Create sequence with high number
    await prisma.idSequence.create({
      data: {
        prefix: 'TST',
        currentValue: 9998,
      },
    });

    const id1 = await generateDisplayId(prisma, 'TST');
    const id2 = await generateDisplayId(prisma, 'TST');

    expect(id1).toBe('TST-09999');
    expect(id2).toBe('TST-10000');
  });
});
