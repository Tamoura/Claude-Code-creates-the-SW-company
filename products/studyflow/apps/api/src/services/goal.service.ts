import { GoalStatus } from '@prisma/client';
import { GoalRepository } from '../repositories/goal.repository';
import { NotFoundError } from '../lib/errors';
import { paginate, toSkipTake, Paginated } from '../lib/pagination';
import { computeMetrics } from './metrics.service';
import {
  toGoalView,
  toGoalLike,
  toEntryLike,
  toProgressEntryView,
  GoalView,
  ProgressEntryView,
} from './goal.presenter';
import {
  CreateGoalInput,
  UpdateGoalInput,
  ListGoalsQuery,
} from '../schemas/goal.schema';

export interface GoalDetailView extends GoalView {
  progressEntries: ProgressEntryView[];
}

export class GoalService {
  constructor(private readonly repo: GoalRepository) {}

  async create(studentId: string, input: CreateGoalInput): Promise<GoalView> {
    const selection = await this.repo.findOwnedSelection(
      studentId,
      input.selectionId
    );
    if (!selection) {
      // Not owned / not selected (BR-001) — 404 to avoid enumeration.
      throw new NotFoundError('Selection not found');
    }
    const goal = await this.repo.create({
      selectionId: input.selectionId,
      title: input.title,
      metricType: input.metricType,
      target: input.target,
      cadence: input.cadence,
      dueDate: new Date(`${input.dueDate}T00:00:00.000Z`),
    });
    return toGoalView(goal, []);
  }

  async list(
    studentId: string,
    query: ListGoalsQuery
  ): Promise<Paginated<GoalView>> {
    const { skip, take } = toSkipTake(query);
    const { rows, total } = await this.repo.list(
      studentId,
      { selectionId: query.selectionId, status: query.status as GoalStatus },
      skip,
      take
    );
    const data = rows.map((g) => toGoalView(g, g.progressEntries));
    return paginate(data, query, total);
  }

  async getDetail(studentId: string, id: string): Promise<GoalDetailView> {
    const goal = await this.repo.findOwnedWithEntries(studentId, id);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }
    const view = toGoalView(goal, goal.progressEntries);
    return {
      ...view,
      progressEntries: goal.progressEntries.map(toProgressEntryView),
    };
  }

  async update(
    studentId: string,
    id: string,
    input: UpdateGoalInput
  ): Promise<GoalView> {
    const existing = await this.repo.findOwnedWithEntries(studentId, id);
    if (!existing) {
      throw new NotFoundError('Goal not found');
    }
    const data: Record<string, unknown> = { ...input };
    if (input.dueDate) {
      data.dueDate = new Date(`${input.dueDate}T00:00:00.000Z`);
    }
    await this.repo.update(id, data);

    // Recompute status against the (possibly changed) goal + same entries.
    return this.recomputeAndReturn(studentId, id);
  }

  async abandon(studentId: string, id: string): Promise<GoalView> {
    const existing = await this.repo.findOwnedWithEntries(studentId, id);
    if (!existing) {
      throw new NotFoundError('Goal not found');
    }
    await this.repo.updateStatus(id, 'abandoned');
    const goal = await this.repo.findOwnedWithEntries(studentId, id);
    return toGoalView(goal!, goal!.progressEntries);
  }

  async remove(studentId: string, id: string): Promise<void> {
    const existing = await this.repo.findOwnedWithEntries(studentId, id);
    if (!existing) {
      throw new NotFoundError('Goal not found');
    }
    await this.repo.delete(id); // cascades progress entries (schema onDelete)
  }

  /**
   * Recomputes a goal's cached status from its current entries and persists it
   * (called after any write that affects metrics). Returns the fresh view.
   */
  async recomputeAndReturn(studentId: string, id: string): Promise<GoalView> {
    const goal = await this.repo.findOwnedWithEntries(studentId, id);
    if (!goal) {
      throw new NotFoundError('Goal not found');
    }
    const metrics = computeMetrics(
      toGoalLike(goal),
      goal.progressEntries.map(toEntryLike)
    );
    if (metrics.status !== goal.status) {
      await this.repo.updateStatus(id, metrics.status as GoalStatus);
    }
    const refreshed = await this.repo.findOwnedWithEntries(studentId, id);
    return toGoalView(refreshed!, refreshed!.progressEntries);
  }
}
