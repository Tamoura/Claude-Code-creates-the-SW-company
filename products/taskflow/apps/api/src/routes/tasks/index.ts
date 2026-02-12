import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createTaskSchema, updateTaskSchema } from './schemas';

class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

const taskRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // All task routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /api/v1/tasks - List user's tasks
  fastify.get('/api/v1/tasks', async (request, _reply) => {
    const tasks = await fastify.prisma.task.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
    });

    return { tasks };
  });

  // POST /api/v1/tasks - Create a task
  fastify.post('/api/v1/tasks', async (request, reply) => {
    const parsed = createTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    const { title, description } = parsed.data;

    const task = await fastify.prisma.task.create({
      data: {
        title,
        description: description || null,
        userId: request.userId,
      },
    });

    return reply.status(201).send({ task });
  });

  // PUT /api/v1/tasks/:id - Update a task
  fastify.put<{ Params: { id: string } }>('/api/v1/tasks/:id', async (request, reply) => {
    const { id } = request.params;

    const parsed = updateTaskSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    const existingTask = await fastify.prisma.task.findFirst({
      where: { id, userId: request.userId },
    });

    if (!existingTask) {
      throw new AppError('Task not found', 404);
    }

    const task = await fastify.prisma.task.update({
      where: { id },
      data: parsed.data,
    });

    return reply.status(200).send({ task });
  });

  // DELETE /api/v1/tasks/:id - Delete a task
  fastify.delete<{ Params: { id: string } }>('/api/v1/tasks/:id', async (request, reply) => {
    const { id } = request.params;

    const existingTask = await fastify.prisma.task.findFirst({
      where: { id, userId: request.userId },
    });

    if (!existingTask) {
      throw new AppError('Task not found', 404);
    }

    await fastify.prisma.task.delete({
      where: { id },
    });

    return reply.status(200).send({ message: 'Task deleted successfully' });
  });

  // GET /api/v1/tasks/stats - Get task statistics
  fastify.get('/api/v1/tasks/stats', async (request, _reply) => {
    const [total, completed] = await Promise.all([
      fastify.prisma.task.count({
        where: { userId: request.userId },
      }),
      fastify.prisma.task.count({
        where: { userId: request.userId, completed: true },
      }),
    ]);

    return {
      total,
      completed,
      pending: total - completed,
    };
  });

  // Error handler for AppError
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    reply.status(500).send({ error: 'Internal server error' });
  });
};

export default taskRoutes;
