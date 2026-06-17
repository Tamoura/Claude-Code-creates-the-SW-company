import { Subject, Selection } from '@prisma/client';
import { SubjectRepository } from '../repositories/subject.repository';
import { NotFoundError, ForbiddenError, ConflictError } from '../lib/errors';
import { paginate, toSkipTake, Paginated } from '../lib/pagination';
import { ACTIVE_TERM } from '../lib/config';
import {
  ListSubjectsQuery,
  CreateSubjectInput,
  UpdateSubjectInput,
} from '../schemas/subject.schema';

export interface SubjectView {
  id: string;
  code: string | null;
  name: string;
  credits: number | null;
  workload: string | null;
  prerequisites: string | null;
  description: string | null;
  term: string | null;
  isSeed: boolean;
  ownerStudentId: string | null;
}

export function toSubjectView(s: Subject): SubjectView {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    credits: s.credits,
    workload: s.workload,
    prerequisites: s.prerequisites,
    description: s.description,
    term: s.term,
    isSeed: s.isSeed,
    ownerStudentId: s.ownerStudentId,
  };
}

export class SubjectService {
  constructor(private readonly repo: SubjectRepository) {}

  async list(
    studentId: string,
    query: ListSubjectsQuery
  ): Promise<Paginated<SubjectView>> {
    const { skip, take } = toSkipTake(query);
    const { rows, total } = await this.repo.list(
      studentId,
      { q: query.q, credits: query.credits, term: query.term },
      skip,
      take
    );
    return paginate(rows.map(toSubjectView), query, total);
  }

  async getById(studentId: string, id: string): Promise<SubjectView> {
    const subject = await this.repo.findVisibleById(studentId, id);
    if (!subject) {
      throw new NotFoundError('Subject not found');
    }
    return toSubjectView(subject);
  }

  async compare(studentId: string, ids: string[]): Promise<SubjectView[]> {
    const subjects = await this.repo.findVisibleByIds(studentId, ids);
    if (subjects.length < 2) {
      throw new NotFoundError('One or more subjects not found');
    }
    return subjects.map(toSubjectView);
  }

  async createManual(
    studentId: string,
    input: CreateSubjectInput
  ): Promise<{ subject: SubjectView; selection: Selection }> {
    const term = input.term ?? ACTIVE_TERM;
    const { subject, selection } = await this.repo.createOwnedWithSelection(
      studentId,
      { ...input, term }
    );
    return { subject: toSubjectView(subject), selection };
  }

  /** Loads an owned, editable subject or throws the right error (BR-005/004). */
  private async loadOwnedEditable(
    studentId: string,
    id: string
  ): Promise<Subject> {
    const subject = await this.repo.findById(id);
    if (!subject) {
      throw new NotFoundError('Subject not found');
    }
    if (subject.isSeed) {
      throw new ForbiddenError('Seed subjects are read-only');
    }
    if (subject.ownerStudentId !== studentId) {
      // Do not reveal another student's resource — 404 (FR-023).
      throw new NotFoundError('Subject not found');
    }
    return subject;
  }

  async update(
    studentId: string,
    id: string,
    input: UpdateSubjectInput
  ): Promise<SubjectView> {
    await this.loadOwnedEditable(studentId, id);
    const updated = await this.repo.updateOwned(id, input);
    return toSubjectView(updated);
  }

  async remove(studentId: string, id: string): Promise<void> {
    await this.loadOwnedEditable(studentId, id);
    // C-7: cannot delete a subject still carrying goals via its selection.
    const goalCount = await this.repo.countGoalsForSubject(studentId, id);
    if (goalCount > 0) {
      throw new ConflictError(
        'Delete the goals on this subject before removing it'
      );
    }
    await this.repo.deleteOwned(id);
  }
}
