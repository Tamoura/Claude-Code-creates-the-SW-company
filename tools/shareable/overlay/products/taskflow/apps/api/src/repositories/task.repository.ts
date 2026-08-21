import type { Prisma, PrismaClient, Task } from '@prisma/client';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from '../schemas/task.schema';

/**
 * The only layer that talks to Prisma. Services depend on this interface, so
 * swapping the datastore never reaches the route handlers
 * (see docs/ADRs/ADR-001-layered-api.md).
 */
export class TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateTaskInput): Promise<Task> {
    return this.prisma.task.create({ data: input });
  }

  async findById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({ where: { id } });
  }

  async list(query: ListTasksQuery): Promise<{ tasks: Task[]; total: number }> {
    const where: Prisma.TaskWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
    };

    const [tasks, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { tasks, total };
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    return this.prisma.task.update({ where: { id }, data: input });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }

  async projectExists(projectId: string): Promise<boolean> {
    const count = await this.prisma.project.count({ where: { id: projectId } });
    return count > 0;
  }
}
