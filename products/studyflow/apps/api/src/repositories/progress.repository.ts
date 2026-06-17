import { PrismaClient, ProgressEntry } from '@prisma/client';

/**
 * Progress-entry data access, scoped through goal → selection → studentId
 * (BR-002/BR-004). A student can only touch entries on their own goals.
 */
export class ProgressRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Confirms the goal belongs to the student (via its selection). */
  findOwnedGoal(studentId: string, goalId: string) {
    return this.prisma.goal.findFirst({
      where: { id: goalId, selection: { studentId } },
    });
  }

  create(data: {
    goalId: string;
    entryDate: Date;
    value: number;
    note?: string | null;
  }): Promise<ProgressEntry> {
    return this.prisma.progressEntry.create({
      data: {
        goalId: data.goalId,
        entryDate: data.entryDate,
        value: data.value,
        note: data.note ?? null,
      },
    });
  }

  listForGoal(goalId: string): Promise<ProgressEntry[]> {
    return this.prisma.progressEntry.findMany({
      where: { goalId },
      orderBy: { entryDate: 'desc' },
    });
  }

  /** Finds an entry owned by the student (via goal.selection.studentId). */
  findOwned(studentId: string, id: string): Promise<ProgressEntry | null> {
    return this.prisma.progressEntry.findFirst({
      where: { id, goal: { selection: { studentId } } },
    });
  }

  update(
    id: string,
    data: { value?: number; entryDate?: Date; note?: string | null }
  ): Promise<ProgressEntry> {
    return this.prisma.progressEntry.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.progressEntry.delete({ where: { id } });
  }
}
