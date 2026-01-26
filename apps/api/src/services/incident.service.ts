import { PrismaClient, Incident, AuditAction, IncidentStatus } from '@prisma/client';
import { generateDisplayId } from './id-generator.service.js';
import { logAudit } from './audit.service.js';
import { calculateSLADeadlines } from './sla.service.js';
import { CreateIncidentInput, UpdateIncidentInput } from '../schemas/incident.schema.js';
import { createPaginatedResponse, PaginatedResponse } from '../utils/response.js';
import { calculateSkip } from '../utils/pagination.js';

export async function createIncident(
  prisma: PrismaClient,
  data: CreateIncidentInput
): Promise<Incident> {
  // Generate display ID
  const displayId = await generateDisplayId(prisma, 'INC');

  // Get default SLA config
  const slaConfig = await prisma.sLAConfig.findFirst();

  // Calculate SLA deadlines
  const createdAt = new Date();
  const slaDeadlines = slaConfig
    ? calculateSLADeadlines(data.priority, createdAt, slaConfig)
    : { responseSlaDue: null, resolutionSlaDue: null };

  // Create incident
  const incident = await prisma.incident.create({
    data: {
      displayId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      impact: data.impact,
      urgency: data.urgency,
      categoryId: data.categoryId,
      reportedById: data.reportedById,
      affectedUserId: data.affectedUserId,
      assigneeId: data.assigneeId,
      slaConfigId: slaConfig?.id,
      responseSlaDue: slaDeadlines.responseSlaDue,
      resolutionSlaDue: slaDeadlines.resolutionSlaDue,
      status: IncidentStatus.NEW,
    },
    include: {
      category: true,
      reportedBy: true,
      assignee: true,
      affectedUser: true,
    },
  });

  // Log audit trail
  await logAudit(prisma, {
    entityType: 'INCIDENT',
    entityId: incident.id,
    action: AuditAction.CREATE,
    userId: data.reportedById,
    newValues: {
      displayId: incident.displayId,
      title: incident.title,
      status: incident.status,
      priority: incident.priority,
    },
  });

  return incident;
}

export async function getIncident(
  prisma: PrismaClient,
  id: string
): Promise<Incident | null> {
  return prisma.incident.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      category: true,
      reportedBy: true,
      assignee: true,
      affectedUser: true,
      slaConfig: true,
    },
  });
}

export interface ListIncidentsFilters {
  page: number;
  limit: number;
  status?: IncidentStatus;
  priority?: string;
  assigneeId?: string;
}

export async function listIncidents(
  prisma: PrismaClient,
  filters: ListIncidentsFilters
): Promise<PaginatedResponse<Incident>> {
  const { page, limit, status, priority, assigneeId } = filters;
  const skip = calculateSkip(page, limit);

  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assigneeId && { assigneeId }),
  };

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        reportedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    prisma.incident.count({ where }),
  ]);

  return createPaginatedResponse(incidents, page, limit, total);
}

export async function updateIncident(
  prisma: PrismaClient,
  id: string,
  data: UpdateIncidentInput,
  userId: string
): Promise<Incident> {
  // Get current incident for audit log
  const current = await prisma.incident.findUniqueOrThrow({
    where: { id },
  });

  // Prepare old values for audit
  const oldValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  Object.keys(data).forEach((key) => {
    const typedKey = key as keyof UpdateIncidentInput;
    if (data[typedKey] !== undefined) {
      oldValues[key] = current[key as keyof Incident];
      newValues[key] = data[typedKey];
    }
  });

  // Update incident
  const incident = await prisma.incident.update({
    where: { id },
    data: {
      ...data,
      ...(data.status === IncidentStatus.RESOLVED && {
        resolvedAt: new Date(),
      }),
      ...(data.status === IncidentStatus.CLOSED && {
        closedAt: new Date(),
      }),
    },
    include: {
      category: true,
      reportedBy: true,
      assignee: true,
      affectedUser: true,
    },
  });

  // Log audit trail
  await logAudit(prisma, {
    entityType: 'INCIDENT',
    entityId: incident.id,
    action: AuditAction.UPDATE,
    userId,
    oldValues,
    newValues,
  });

  return incident;
}

export async function deleteIncident(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  // Get incident for audit log
  const incident = await prisma.incident.findUniqueOrThrow({
    where: { id },
  });

  // Soft delete
  await prisma.incident.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Log audit trail
  await logAudit(prisma, {
    entityType: 'INCIDENT',
    entityId: incident.id,
    action: AuditAction.DELETE,
    userId,
    oldValues: {
      displayId: incident.displayId,
      title: incident.title,
      status: incident.status,
    },
  });
}
