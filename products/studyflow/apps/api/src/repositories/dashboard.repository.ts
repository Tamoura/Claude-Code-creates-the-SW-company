import { PrismaClient, Goal, ProgressEntry, Selection, Subject } from '@prisma/client';

export type GoalWithEntries = Goal & { progressEntries: ProgressEntry[] };
export type SelectionWithSubject = Selection & {
  subject: Subject;
  goals: GoalWithEntries[];
};

/**
 * Read-side aggregation queries for dashboard, reminders, and export. All
 * scoped to `studentId` and the active term (BR-004, C-5). Batched includes
 * avoid N+1 (NFR-001).
 */
export class DashboardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Selections (with subject + goals + entries) for the active term. */
  selectionsWithGoals(
    studentId: string,
    term: string
  ): Promise<SelectionWithSubject[]> {
    return this.prisma.selection.findMany({
      where: { studentId, term },
      include: {
        subject: true,
        goals: { include: { progressEntries: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Owned (manually-added) subjects for export. */
  ownedSubjects(studentId: string): Promise<Subject[]> {
    return this.prisma.subject.findMany({
      where: { ownerStudentId: studentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  allSelections(studentId: string): Promise<Selection[]> {
    return this.prisma.selection.findMany({
      where: { studentId },
      orderBy: { createdAt: 'asc' },
    });
  }

  allGoals(studentId: string): Promise<Goal[]> {
    return this.prisma.goal.findMany({
      where: { selection: { studentId } },
      orderBy: { createdAt: 'asc' },
    });
  }

  allProgressEntries(studentId: string): Promise<ProgressEntry[]> {
    return this.prisma.progressEntry.findMany({
      where: { goal: { selection: { studentId } } },
      orderBy: { entryDate: 'asc' },
    });
  }
}
