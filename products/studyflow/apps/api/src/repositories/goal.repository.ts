import {
  PrismaClient,
  Prisma,
  Goal,
  GoalStatus,
  ProgressEntry,
} from '@prisma/client';

export type GoalWithEntries = Goal & { progressEntries: ProgressEntry[] };

/**
 * Goal data access. Ownership is enforced by joining through `selection`
 * (Goal → Selection.studentId, BR-004) — a student can only ever see/mutate
 * goals on their own selections.
 */
export class GoalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Confirms a selection belongs to the student (BR-001 binding check). */
  findOwnedSelection(studentId: string, selectionId: string) {
    return this.prisma.selection.findFirst({
      where: { id: selectionId, studentId },
    });
  }

  create(data: {
    selectionId: string;
    title: string;
    metricType: Prisma.GoalCreateInput['metricType'];
    target: number;
    cadence: Prisma.GoalCreateInput['cadence'];
    dueDate: Date;
  }): Promise<Goal> {
    return this.prisma.goal.create({
      data: {
        selection: { connect: { id: data.selectionId } },
        title: data.title,
        metricType: data.metricType,
        target: data.target,
        cadence: data.cadence,
        dueDate: data.dueDate,
        status: 'active',
      },
    });
  }

  async list(
    studentId: string,
    filter: { selectionId?: string; status?: GoalStatus },
    skip: number,
    take: number
  ): Promise<{ rows: GoalWithEntries[]; total: number }> {
    const where: Prisma.GoalWhereInput = {
      selection: { studentId },
      ...(filter.selectionId ? { selectionId: filter.selectionId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.goal.findMany({
        where,
        include: { progressEntries: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.goal.count({ where }),
    ]);
    return { rows, total };
  }

  /** Owned goal (scoped via selection.studentId) with its entries, or null. */
  findOwnedWithEntries(
    studentId: string,
    id: string
  ): Promise<GoalWithEntries | null> {
    return this.prisma.goal.findFirst({
      where: { id, selection: { studentId } },
      include: { progressEntries: { orderBy: { entryDate: 'desc' } } },
    });
  }

  update(id: string, data: Prisma.GoalUpdateInput): Promise<Goal> {
    return this.prisma.goal.update({ where: { id }, data });
  }

  updateStatus(id: string, status: GoalStatus): Promise<Goal> {
    return this.prisma.goal.update({ where: { id }, data: { status } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.goal.delete({ where: { id } });
  }
}
