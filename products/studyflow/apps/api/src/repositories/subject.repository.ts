import { PrismaClient, Prisma, Subject, Selection } from '@prisma/client';

export interface SubjectListFilter {
  q?: string;
  credits?: number;
  term?: string;
}

/**
 * Subject data access. Catalog reads span seed subjects (ownerStudentId=null)
 * AND the requester's own manual adds — never another student's manual adds
 * (BR-004). Mutations are confined to the owner via `ownerStudentId`.
 */
export class SubjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private visibilityWhere(studentId: string): Prisma.SubjectWhereInput {
    return {
      OR: [{ isSeed: true }, { ownerStudentId: studentId }],
    };
  }

  private filterWhere(
    studentId: string,
    filter: SubjectListFilter
  ): Prisma.SubjectWhereInput {
    const and: Prisma.SubjectWhereInput[] = [this.visibilityWhere(studentId)];
    if (filter.q) {
      and.push({
        OR: [
          { name: { contains: filter.q, mode: 'insensitive' } },
          { code: { contains: filter.q, mode: 'insensitive' } },
        ],
      });
    }
    if (filter.credits !== undefined) {
      and.push({ credits: filter.credits });
    }
    if (filter.term) {
      and.push({ term: filter.term });
    }
    return { AND: and };
  }

  async list(
    studentId: string,
    filter: SubjectListFilter,
    skip: number,
    take: number
  ): Promise<{ rows: Subject[]; total: number }> {
    const where = this.filterWhere(studentId, filter);
    const [rows, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        orderBy: [{ code: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      this.prisma.subject.count({ where }),
    ]);
    return { rows, total };
  }

  /** Find a single subject visible to the student (seed or own). */
  findVisibleById(studentId: string, id: string): Promise<Subject | null> {
    return this.prisma.subject.findFirst({
      where: { id, ...this.visibilityWhere(studentId) },
    });
  }

  findVisibleByIds(studentId: string, ids: string[]): Promise<Subject[]> {
    return this.prisma.subject.findMany({
      where: { id: { in: ids }, ...this.visibilityWhere(studentId) },
    });
  }

  /** Raw find by id (no visibility filter) — used to distinguish 403 vs 404. */
  findById(id: string): Promise<Subject | null> {
    return this.prisma.subject.findUnique({ where: { id } });
  }

  /**
   * Creates an owned subject AND its auto-selection for the active term in one
   * transaction (US-05 AC-1). BR-005: isSeed=false, ownerStudentId=studentId.
   */
  async createOwnedWithSelection(
    studentId: string,
    data: {
      name: string;
      code?: string;
      credits?: number;
      workload?: string;
      prerequisites?: string;
      description?: string;
      term: string;
    }
  ): Promise<{ subject: Subject; selection: Selection }> {
    return this.prisma.$transaction(async (tx) => {
      const subject = await tx.subject.create({
        data: {
          name: data.name,
          code: data.code ?? null,
          credits: data.credits ?? null,
          workload: data.workload ?? null,
          prerequisites: data.prerequisites ?? null,
          description: data.description ?? null,
          term: data.term,
          isSeed: false,
          ownerStudentId: studentId,
        },
      });
      const selection = await tx.selection.create({
        data: { studentId, subjectId: subject.id, term: data.term },
      });
      return { subject, selection };
    });
  }

  updateOwned(
    id: string,
    data: Prisma.SubjectUpdateInput
  ): Promise<Subject> {
    return this.prisma.subject.update({ where: { id }, data });
  }

  async deleteOwned(id: string): Promise<void> {
    await this.prisma.subject.delete({ where: { id } });
  }

  /** Count goals attached (via selections) to this subject for this student. */
  async countGoalsForSubject(
    studentId: string,
    subjectId: string
  ): Promise<number> {
    return this.prisma.goal.count({
      where: { selection: { subjectId, studentId } },
    });
  }
}
