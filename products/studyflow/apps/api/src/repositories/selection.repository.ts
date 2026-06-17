import { PrismaClient, Selection, Subject } from '@prisma/client';

export type SelectionWithSubjectAndCount = Selection & {
  subject: Subject;
  _count: { goals: number };
};

/**
 * Selection data access. Every query is scoped to `studentId` (BR-004). Subject
 * visibility (seed or owned-by-this-student) is enforced when resolving the
 * subject for a new selection.
 */
export class SelectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Visible subject (seed or owned by this student) or null. */
  findVisibleSubject(studentId: string, subjectId: string): Promise<Subject | null> {
    return this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        OR: [{ isSeed: true }, { ownerStudentId: studentId }],
      },
    });
  }

  /** Codes of subjects this student has already selected in the term. */
  async selectedSubjectCodes(studentId: string, term: string): Promise<string[]> {
    const rows = await this.prisma.selection.findMany({
      where: { studentId, term },
      select: { subject: { select: { code: true } } },
    });
    return rows
      .map((r) => r.subject.code)
      .filter((c): c is string => Boolean(c));
  }

  findExisting(
    studentId: string,
    subjectId: string,
    term: string
  ): Promise<Selection | null> {
    return this.prisma.selection.findFirst({
      where: { studentId, subjectId, term },
    });
  }

  create(data: {
    studentId: string;
    subjectId: string;
    term: string;
    prereqWarningAck: boolean;
  }): Promise<Selection> {
    return this.prisma.selection.create({ data });
  }

  listForTerm(
    studentId: string,
    term: string
  ): Promise<SelectionWithSubjectAndCount[]> {
    return this.prisma.selection.findMany({
      where: { studentId, term },
      include: { subject: true, _count: { select: { goals: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  findOwned(studentId: string, id: string): Promise<Selection | null> {
    return this.prisma.selection.findFirst({ where: { id, studentId } });
  }

  goalsForSelection(selectionId: string): Promise<{ id: string; title: string }[]> {
    return this.prisma.goal.findMany({
      where: { selectionId },
      select: { id: true, title: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.selection.delete({ where: { id } });
  }
}
