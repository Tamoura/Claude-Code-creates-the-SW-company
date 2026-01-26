import { PrismaClient, Problem, ProblemStatus, AuditAction, ProblemIncident, KnownError } from '@prisma/client';
import { generateDisplayId } from './id-generator.service.js';
import { logAudit } from './audit.service.js';
import { CreateProblemInput, UpdateProblemInput, CreateKnownErrorInput } from '../schemas/problem.schema.js';
import { createPaginatedResponse, PaginatedResponse } from '../utils/response.js';
import { calculateSkip } from '../utils/pagination.js';

export async function createProblem(
  prisma: PrismaClient,
  data: CreateProblemInput
): Promise<Problem> {
  // Generate display ID
  const displayId = await generateDisplayId(prisma, 'PRB');

  // Create problem
  const problem = await prisma.problem.create({
    data: {
      displayId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      categoryId: data.categoryId,
      createdById: data.createdById,
      assigneeId: data.assigneeId,
      rootCause: data.rootCause,
      workaround: data.workaround,
      permanentFix: data.permanentFix,
      status: ProblemStatus.NEW,
    },
    include: {
      category: true,
      createdBy: true,
      assignee: true,
    },
  });

  // Log audit trail
  await logAudit(prisma, {
    entityType: 'PROBLEM',
    entityId: problem.id,
    action: AuditAction.CREATE,
    userId: data.createdById,
    newValues: {
      displayId: problem.displayId,
      title: problem.title,
      status: problem.status,
      priority: problem.priority,
    },
  });

  return problem;
}

export async function getProblem(
  prisma: PrismaClient,
  id: string
): Promise<Problem | null> {
  return prisma.problem.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      category: true,
      createdBy: true,
      assignee: true,
      problemIncidents: {
        include: {
          incident: {
            include: {
              category: true,
              reportedBy: true,
            },
          },
        },
      },
      knownError: true,
    },
  });
}

export interface ListProblemsFilters {
  page: number;
  limit: number;
  status?: ProblemStatus;
  priority?: string;
  assigneeId?: string;
}

export async function listProblems(
  prisma: PrismaClient,
  filters: ListProblemsFilters
): Promise<PaginatedResponse<Problem>> {
  const { page, limit, status, priority, assigneeId } = filters;
  const skip = calculateSkip(page, limit);

  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assigneeId && { assigneeId }),
  };

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        createdBy: {
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
        _count: {
          select: {
            problemIncidents: true,
          },
        },
      },
    }),
    prisma.problem.count({ where }),
  ]);

  return createPaginatedResponse(problems, page, limit, total);
}

export async function updateProblem(
  prisma: PrismaClient,
  id: string,
  data: UpdateProblemInput,
  userId: string
): Promise<Problem> {
  // Get current problem for audit log
  const current = await prisma.problem.findUniqueOrThrow({
    where: { id },
  });

  // Prepare old values for audit
  const oldValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  Object.keys(data).forEach((key) => {
    const typedKey = key as keyof UpdateProblemInput;
    if (data[typedKey] !== undefined) {
      oldValues[key] = current[key as keyof Problem];
      newValues[key] = data[typedKey];
    }
  });

  // Update problem
  const problem = await prisma.problem.update({
    where: { id },
    data: {
      ...data,
      ...(data.status === ProblemStatus.RESOLVED && {
        resolvedAt: new Date(),
      }),
      ...(data.status === ProblemStatus.CLOSED && {
        closedAt: new Date(),
      }),
    },
    include: {
      category: true,
      createdBy: true,
      assignee: true,
    },
  });

  // Log audit trail
  await logAudit(prisma, {
    entityType: 'PROBLEM',
    entityId: problem.id,
    action: AuditAction.UPDATE,
    userId,
    oldValues,
    newValues,
  });

  return problem;
}

export async function deleteProblem(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  // Get problem for audit log
  const problem = await prisma.problem.findUniqueOrThrow({
    where: { id },
  });

  // Soft delete
  await prisma.problem.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Log audit trail
  await logAudit(prisma, {
    entityType: 'PROBLEM',
    entityId: problem.id,
    action: AuditAction.DELETE,
    userId,
    oldValues: {
      displayId: problem.displayId,
      title: problem.title,
      status: problem.status,
    },
  });
}

export async function linkIncidentToProblem(
  prisma: PrismaClient,
  problemId: string,
  incidentId: string,
  linkedById: string
): Promise<ProblemIncident> {
  return prisma.problemIncident.create({
    data: {
      problemId,
      incidentId,
      linkedById,
    },
  });
}

export async function createKnownError(
  prisma: PrismaClient,
  problemId: string,
  data: CreateKnownErrorInput
): Promise<KnownError> {
  const knownError = await prisma.knownError.create({
    data: {
      problemId,
      title: data.title,
      description: data.description,
      workaround: data.workaround,
      affectedSystems: data.affectedSystems,
      isActive: true,
    },
  });

  // Update problem status to KNOWN_ERROR
  await prisma.problem.update({
    where: { id: problemId },
    data: { status: ProblemStatus.KNOWN_ERROR },
  });

  return knownError;
}
