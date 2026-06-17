import { Prisma } from '@prisma/client';
import { SelectionRepository } from '../repositories/selection.repository';
import { NotFoundError, ConflictError } from '../lib/errors';
import { computeUnmetPrerequisites } from '../lib/prerequisites';
import { toSubjectView, SubjectView } from './subject.service';
import { ACTIVE_TERM } from '../lib/config';
import { CreateSelectionInput } from '../schemas/selection.schema';

export interface SelectionView {
  id: string;
  term: string;
  subjectId: string;
  prereqWarningAck: boolean;
  createdAt: Date;
}

export interface SelectionListItem {
  id: string;
  term: string;
  prereqWarningAck: boolean;
  goalCount: number;
  subject: SubjectView;
}

export interface CreateSelectionResult {
  selection: SelectionView;
  prerequisiteWarning?: { unmet: string[] };
}

export class SelectionService {
  constructor(private readonly repo: SelectionRepository) {}

  async create(
    studentId: string,
    input: CreateSelectionInput
  ): Promise<CreateSelectionResult> {
    const subject = await this.repo.findVisibleSubject(studentId, input.subjectId);
    if (!subject) {
      throw new NotFoundError('Subject not found');
    }

    const existing = await this.repo.findExisting(
      studentId,
      input.subjectId,
      ACTIVE_TERM
    );
    if (existing) {
      throw new ConflictError('Subject already selected for this term');
    }

    const selectedCodes = await this.repo.selectedSubjectCodes(
      studentId,
      ACTIVE_TERM
    );
    const unmet = computeUnmetPrerequisites(subject.prerequisites, selectedCodes);

    let selection;
    try {
      selection = await this.repo.create({
        studentId,
        subjectId: input.subjectId,
        term: ACTIVE_TERM,
        prereqWarningAck: input.prereqWarningAck ?? false,
      });
    } catch (e) {
      // Race on the unique (studentId, subjectId, term) constraint.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictError('Subject already selected for this term');
      }
      throw e;
    }

    const result: CreateSelectionResult = { selection: toSelectionView(selection) };
    if (unmet.length > 0) {
      result.prerequisiteWarning = { unmet };
    }
    return result;
  }

  async list(studentId: string): Promise<SelectionListItem[]> {
    const rows = await this.repo.listForTerm(studentId, ACTIVE_TERM);
    return rows.map((r) => ({
      id: r.id,
      term: r.term,
      prereqWarningAck: r.prereqWarningAck,
      goalCount: r._count.goals,
      subject: toSubjectView(r.subject),
    }));
  }

  async remove(studentId: string, id: string): Promise<void> {
    const selection = await this.repo.findOwned(studentId, id);
    if (!selection) {
      throw new NotFoundError('Selection not found');
    }
    const goals = await this.repo.goalsForSelection(id);
    if (goals.length > 0) {
      // C-7: block removal; surface the dependent goals as a problem extension.
      throw new ConflictError(
        'This subject has goals. Delete its goals before removing it.'
      ).withExtensions({ dependentGoals: goals });
    }
    await this.repo.delete(id);
  }
}

function toSelectionView(s: {
  id: string;
  term: string;
  subjectId: string;
  prereqWarningAck: boolean;
  createdAt: Date;
}): SelectionView {
  return {
    id: s.id,
    term: s.term,
    subjectId: s.subjectId,
    prereqWarningAck: s.prereqWarningAck,
    createdAt: s.createdAt,
  };
}
