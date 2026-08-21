import type { Task } from '@prisma/client';
import type { TaskRepository } from '../repositories/task.repository';
import { BadRequestError, NotFoundError } from '../lib/errors';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from '../schemas/task.schema';

export interface TaskListResult {
  tasks: Task[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Business rules for tasks. Routes stay thin; everything that could be wrong
 * for a domain reason is decided here. [US-01][US-02][FR-001..FR-007]
 */
export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  /** [FR-001] A task cannot be created against a project that does not exist. */
  async create(input: CreateTaskInput): Promise<Task> {
    if (!(await this.repository.projectExists(input.projectId))) {
      throw new NotFoundError('Project', input.projectId);
    }
    if (input.dueDate && input.dueDate.getTime() < Date.now()) {
      throw new BadRequestError('dueDate must be in the future');
    }
    return this.repository.create(input);
  }

  async getById(id: string): Promise<Task> {
    const task = await this.repository.findById(id);
    if (!task) {
      throw new NotFoundError('Task', id);
    }
    return task;
  }

  async list(query: ListTasksQuery): Promise<TaskListResult> {
    const { tasks, total } = await this.repository.list(query);
    return { tasks, total, limit: query.limit, offset: query.offset };
  }

  /** [FR-005] A DONE task is closed: it can be reopened, but not edited in place. */
  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const existing = await this.getById(id);
    const reopening = input.status !== undefined && input.status !== 'DONE';

    if (existing.status === 'DONE' && !reopening) {
      throw new BadRequestError('a completed task must be reopened before it can be edited');
    }

    return this.repository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await this.repository.delete(id);
  }
}
