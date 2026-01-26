import { PrismaClient, Change, ChangeStatus, AuditAction } from '@prisma/client';
import { generateDisplayId } from './id-generator.service.js';
import { logAudit } from './audit.service.js';
import type {
  CreateChangeInput,
  UpdateChangeInput,
  ApproveChangeInput,
  RejectChangeInput,
  ScheduleChangeInput,
  ImplementChangeInput,
  CompleteChangeInput,
} from '../schemas/change.schema.js';

export async function createChange(
  prisma: PrismaClient,
  data: CreateChangeInput
): Promise<Change> {
  const displayId = await generateDisplayId(prisma, 'CHG');

  const change = await prisma.change.create({
    data: {
      displayId,
      title: data.title,
      description: data.description,
      type: data.type,
      priority: data.priority,
      risk: data.risk,
      impact: data.impact,
      categoryId: data.categoryId,
      requesterId: data.requesterId,
      assigneeId: data.assigneeId,
      implementationPlan: data.implementationPlan,
      rollbackPlan: data.rollbackPlan,
      testPlan: data.testPlan,
      scheduledStartAt: data.scheduledStartAt ? new Date(data.scheduledStartAt) : null,
      scheduledEndAt: data.scheduledEndAt ? new Date(data.scheduledEndAt) : null,
      linkedProblemId: data.linkedProblemId,
      status: ChangeStatus.DRAFT,
    },
    include: {
      category: true,
      requester: true,
      assignee: true,
      linkedProblem: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'CHANGE',
    entityId: change.id,
    action: AuditAction.CREATE,
    userId: data.requesterId,
    newValues: {
      displayId: change.displayId,
      title: change.title,
      status: change.status,
    },
  });

  return change;
}

export async function getChange(
  prisma: PrismaClient,
  id: string
): Promise<Change | null> {
  return await prisma.change.findUnique({
    where: { id, deletedAt: null },
    include: {
      category: true,
      requester: true,
      assignee: true,
      linkedProblem: true,
      approvals: {
        include: {
          approver: true,
        },
      },
    },
  });
}

export async function listChanges(
  prisma: PrismaClient,
  filters: {
    page: number;
    limit: number;
    status?: ChangeStatus;
    type?: string;
    priority?: string;
    requesterId?: string;
    assigneeId?: string;
  }
) {
  const where: any = {
    deletedAt: null,
  };

  if (filters.status) where.status = filters.status;
  if (filters.type) where.type = filters.type;
  if (filters.priority) where.priority = filters.priority;
  if (filters.requesterId) where.requesterId = filters.requesterId;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;

  const [data, total] = await Promise.all([
    prisma.change.findMany({
      where,
      include: {
        category: true,
        requester: true,
        assignee: true,
        linkedProblem: true,
        _count: {
          select: {
            approvals: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.change.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function updateChange(
  prisma: PrismaClient,
  id: string,
  data: UpdateChangeInput,
  userId: string
): Promise<Change> {
  const existing = await prisma.change.findUnique({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new Error('Change not found');
  }

  const updated = await prisma.change.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      status: data.status,
      type: data.type,
      priority: data.priority,
      risk: data.risk,
      impact: data.impact,
      categoryId: data.categoryId,
      assigneeId: data.assigneeId,
      implementationPlan: data.implementationPlan,
      rollbackPlan: data.rollbackPlan,
      testPlan: data.testPlan,
      scheduledStartAt: data.scheduledStartAt ? new Date(data.scheduledStartAt) : undefined,
      scheduledEndAt: data.scheduledEndAt ? new Date(data.scheduledEndAt) : undefined,
      reviewNotes: data.reviewNotes,
      linkedProblemId: data.linkedProblemId,
    },
    include: {
      category: true,
      requester: true,
      assignee: true,
      linkedProblem: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'CHANGE',
    entityId: id,
    action: AuditAction.UPDATE,
    userId,
    oldValues: { status: existing.status },
    newValues: { status: updated.status },
  });

  return updated;
}

export async function deleteChange(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  const existing = await prisma.change.findUnique({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new Error('Change not found');
  }

  await prisma.change.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logAudit(prisma, {
    entityType: 'CHANGE',
    entityId: id,
    action: AuditAction.DELETE,
    userId,
    oldValues: { displayId: existing.displayId },
  });
}

export async function approveChange(
  prisma: PrismaClient,
  id: string,
  data: ApproveChangeInput
): Promise<Change> {
  const change = await prisma.change.findUnique({
    where: { id, deletedAt: null },
  });

  if (!change) {
    throw new Error('Change not found');
  }

  if (change.status !== ChangeStatus.PENDING_APPROVAL) {
    throw new Error('Change is not pending approval');
  }

  await prisma.changeApproval.create({
    data: {
      changeId: id,
      approverId: data.approverId,
      approved: true,
      notes: data.notes,
    },
  });

  const updated = await prisma.change.update({
    where: { id },
    data: { status: ChangeStatus.APPROVED },
    include: {
      category: true,
      requester: true,
      assignee: true,
      linkedProblem: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'CHANGE',
    entityId: id,
    action: AuditAction.UPDATE,
    userId: data.approverId,
    oldValues: { status: ChangeStatus.PENDING_APPROVAL },
    newValues: { status: ChangeStatus.APPROVED },
  });

  return updated;
}

export async function rejectChange(
  prisma: PrismaClient,
  id: string,
  data: RejectChangeInput
): Promise<Change> {
  const change = await prisma.change.findUnique({
    where: { id, deletedAt: null },
  });

  if (!change) {
    throw new Error('Change not found');
  }

  if (change.status !== ChangeStatus.PENDING_APPROVAL) {
    throw new Error('Change is not pending approval');
  }

  await prisma.changeApproval.create({
    data: {
      changeId: id,
      approverId: data.rejectedById,
      approved: false,
      notes: data.reason,
    },
  });

  const updated = await prisma.change.update({
    where: { id },
    data: { status: ChangeStatus.REJECTED },
    include: {
      category: true,
      requester: true,
      assignee: true,
      linkedProblem: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'CHANGE',
    entityId: id,
    action: AuditAction.UPDATE,
    userId: data.rejectedById,
    oldValues: { status: ChangeStatus.PENDING_APPROVAL },
    newValues: { status: ChangeStatus.REJECTED, reason: data.reason },
  });

  return updated;
}

export async function submitChange(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<Change> {
  const change = await prisma.change.findUnique({
    where: { id, deletedAt: null },
  });

  if (!change) {
    throw new Error('Change not found');
  }

  if (change.status !== ChangeStatus.DRAFT) {
    throw new Error('Only draft changes can be submitted');
  }

  const updated = await prisma.change.update({
    where: { id },
    data: { status: ChangeStatus.SUBMITTED },
    include: {
      category: true,
      requester: true,
      assignee: true,
      linkedProblem: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'CHANGE',
    entityId: id,
    action: AuditAction.UPDATE,
    userId,
    oldValues: { status: ChangeStatus.DRAFT },
    newValues: { status: ChangeStatus.SUBMITTED },
  });

  return updated;
}

export async function scheduleChange(
  prisma: PrismaClient,
  id: string,
  data: ScheduleChangeInput,
  userId: string
): Promise<Change> {
  const change = await prisma.change.findUnique({
    where: { id, deletedAt: null },
  });

  if (!change) {
    throw new Error('Change not found');
  }

  if (change.status !== ChangeStatus.APPROVED) {
    throw new Error('Only approved changes can be scheduled');
  }

  const updated = await prisma.change.update({
    where: { id },
    data: {
      scheduledStartAt: new Date(data.scheduledStartAt),
      scheduledEndAt: new Date(data.scheduledEndAt),
      status: ChangeStatus.SCHEDULED,
    },
    include: {
      category: true,
      requester: true,
      assignee: true,
      linkedProblem: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'CHANGE',
    entityId: id,
    action: AuditAction.UPDATE,
    userId,
    oldValues: { status: ChangeStatus.APPROVED },
    newValues: {
      status: ChangeStatus.SCHEDULED,
      scheduledStartAt: data.scheduledStartAt,
      scheduledEndAt: data.scheduledEndAt,
    },
  });

  return updated;
}

export async function implementChange(
  prisma: PrismaClient,
  id: string,
  data: ImplementChangeInput,
  userId: string
): Promise<Change> {
  const change = await prisma.change.findUnique({
    where: { id, deletedAt: null },
  });

  if (!change) {
    throw new Error('Change not found');
  }

  if (change.status !== ChangeStatus.SCHEDULED) {
    throw new Error('Only scheduled changes can be implemented');
  }

  const updated = await prisma.change.update({
    where: { id },
    data: {
      actualStartAt: data.actualStartAt ? new Date(data.actualStartAt) : new Date(),
      status: ChangeStatus.IMPLEMENTING,
    },
    include: {
      category: true,
      requester: true,
      assignee: true,
      linkedProblem: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'CHANGE',
    entityId: id,
    action: AuditAction.UPDATE,
    userId,
    oldValues: { status: ChangeStatus.SCHEDULED },
    newValues: { status: ChangeStatus.IMPLEMENTING },
  });

  return updated;
}

export async function completeChange(
  prisma: PrismaClient,
  id: string,
  data: CompleteChangeInput,
  userId: string
): Promise<Change> {
  const change = await prisma.change.findUnique({
    where: { id, deletedAt: null },
  });

  if (!change) {
    throw new Error('Change not found');
  }

  if (change.status !== ChangeStatus.IMPLEMENTING) {
    throw new Error('Only implementing changes can be completed');
  }

  const updated = await prisma.change.update({
    where: { id },
    data: {
      actualEndAt: data.actualEndAt ? new Date(data.actualEndAt) : new Date(),
      reviewNotes: data.reviewNotes,
      status: ChangeStatus.COMPLETED,
    },
    include: {
      category: true,
      requester: true,
      assignee: true,
      linkedProblem: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'CHANGE',
    entityId: id,
    action: AuditAction.UPDATE,
    userId,
    oldValues: { status: ChangeStatus.IMPLEMENTING },
    newValues: { status: ChangeStatus.COMPLETED },
  });

  return updated;
}
