import { FastifyPluginAsync } from 'fastify';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { DashboardService } from '../services/dashboard.service';
import { ReminderService } from '../services/reminder.service';
import { ExportService } from '../services/export.service';
import { requireStudentId } from '../lib/request';

/**
 * Dashboard, reminders and export routes (US-09/10/12, FR-019..024). All
 * read-only, auth required, ownership-scoped (BR-004). Reminders/dashboard are
 * computed on read (no scheduler — C-4).
 */
const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  const dashRepo = new DashboardRepository(fastify.prisma);
  const authRepo = new AuthRepository(fastify.prisma);
  const reminderService = new ReminderService(dashRepo);
  const dashboardService = new DashboardService(dashRepo, reminderService);
  const exportService = new ExportService(dashRepo, authRepo);

  fastify.addHook('preHandler', fastify.sessionAuth);

  fastify.get('/dashboard', async (request, reply) => {
    const studentId = requireStudentId(request);
    return reply.send(await dashboardService.get(studentId));
  });

  fastify.get('/reminders', async (request, reply) => {
    const studentId = requireStudentId(request);
    return reply.send({ data: await reminderService.list(studentId) });
  });

  fastify.get('/export', async (request, reply) => {
    const studentId = requireStudentId(request);
    const data = await exportService.export(studentId);
    return reply
      .header('Content-Type', 'application/json')
      .header(
        'Content-Disposition',
        'attachment; filename="studyflow-export.json"'
      )
      .send(data);
  });
};

export default dashboardRoutes;
