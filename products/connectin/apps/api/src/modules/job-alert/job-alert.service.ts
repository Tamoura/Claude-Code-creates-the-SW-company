import { PrismaClient } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

interface CreateAlertInput {
  keywords?: string;
  location?: string;
  workType?: string;
  experienceLevel?: string;
}

export class JobAlertService {
  constructor(private readonly prisma: PrismaClient) {}

  async createAlert(userId: string, input: CreateAlertInput) {
    const alert = await this.prisma.jobAlert.create({
      data: {
        userId,
        keywords: input.keywords || null,
        location: input.location || null,
        workType: input.workType as any || null,
        experienceLevel: input.experienceLevel as any || null,
        isActive: true,
      },
    });

    return this.format(alert);
  }

  async listAlerts(userId: string) {
    const alerts = await this.prisma.jobAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((a) => this.format(a));
  }

  async updateAlert(alertId: string, userId: string, input: { isActive?: boolean }) {
    const alert = await this.prisma.jobAlert.findUnique({ where: { id: alertId } });
    if (!alert) throw new NotFoundError('Job alert not found');
    if (alert.userId !== userId) throw new ForbiddenError('Not your alert');

    const updated = await this.prisma.jobAlert.update({
      where: { id: alertId },
      data: {
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    return this.format(updated);
  }

  async deleteAlert(alertId: string, userId: string) {
    const alert = await this.prisma.jobAlert.findUnique({ where: { id: alertId } });
    if (!alert) throw new NotFoundError('Job alert not found');
    if (alert.userId !== userId) throw new ForbiddenError('Not your alert');

    await this.prisma.jobAlert.delete({ where: { id: alertId } });
    return { deleted: true };
  }

  private format(alert: any) {
    return {
      id: alert.id,
      keywords: alert.keywords,
      location: alert.location,
      workType: alert.workType,
      experienceLevel: alert.experienceLevel,
      isActive: alert.isActive,
      lastNotifiedAt: alert.lastNotifiedAt?.toISOString() ?? null,
      createdAt: alert.createdAt instanceof Date ? alert.createdAt.toISOString() : alert.createdAt,
    };
  }
}
