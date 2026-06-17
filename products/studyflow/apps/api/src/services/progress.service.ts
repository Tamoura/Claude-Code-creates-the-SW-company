import { ProgressRepository } from '../repositories/progress.repository';
import { GoalService } from './goal.service';
import { NotFoundError } from '../lib/errors';
import {
  toProgressEntryView,
  ProgressEntryView,
  GoalView,
} from './goal.presenter';
import {
  CreateProgressInput,
  UpdateProgressInput,
} from '../schemas/progress.schema';

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export interface ProgressWriteResult {
  progressEntry: ProgressEntryView;
  goal: GoalView;
}

/**
 * Progress business logic (US-07). Every write to an entry triggers a goal
 * metric + status recompute (BR-003, FR-016..018) via the goal service.
 */
export class ProgressService {
  constructor(
    private readonly repo: ProgressRepository,
    private readonly goalService: GoalService
  ) {}

  async create(
    studentId: string,
    goalId: string,
    input: CreateProgressInput
  ): Promise<ProgressWriteResult> {
    const goal = await this.repo.findOwnedGoal(studentId, goalId);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }
    const entry = await this.repo.create({
      goalId,
      entryDate: toDate(input.entryDate),
      value: input.value,
      note: input.note,
    });
    const goalView = await this.goalService.recomputeAndReturn(studentId, goalId);
    return { progressEntry: toProgressEntryView(entry), goal: goalView };
  }

  async listForGoal(
    studentId: string,
    goalId: string
  ): Promise<ProgressEntryView[]> {
    const goal = await this.repo.findOwnedGoal(studentId, goalId);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }
    const entries = await this.repo.listForGoal(goalId);
    return entries.map(toProgressEntryView);
  }

  async update(
    studentId: string,
    id: string,
    input: UpdateProgressInput
  ): Promise<ProgressWriteResult> {
    const entry = await this.repo.findOwned(studentId, id);
    if (!entry) {
      throw new NotFoundError('Progress entry not found');
    }
    const updated = await this.repo.update(id, {
      value: input.value,
      entryDate: input.entryDate ? toDate(input.entryDate) : undefined,
      note: input.note,
    });
    const goalView = await this.goalService.recomputeAndReturn(
      studentId,
      entry.goalId
    );
    return { progressEntry: toProgressEntryView(updated), goal: goalView };
  }

  async remove(studentId: string, id: string): Promise<void> {
    const entry = await this.repo.findOwned(studentId, id);
    if (!entry) {
      throw new NotFoundError('Progress entry not found');
    }
    await this.repo.delete(id);
    await this.goalService.recomputeAndReturn(studentId, entry.goalId);
  }
}
