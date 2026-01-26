import { PrismaClient, ServiceRequest, RequestStatus, ServiceCatalogItem, AuditAction } from '@prisma/client';
import { generateDisplayId } from './id-generator.service.js';
import { logAudit } from './audit.service.js';
import type {
  CreateServiceRequestInput,
  UpdateServiceRequestInput,
  ApproveRequestInput,
  RejectRequestInput,
  FulfillRequestInput,
  CreateCatalogItemInput,
  UpdateCatalogItemInput,
} from '../schemas/service-request.schema.js';

// Service Request Functions

export async function createServiceRequest(
  prisma: PrismaClient,
  data: CreateServiceRequestInput
): Promise<ServiceRequest> {
  const displayId = await generateDisplayId(prisma, 'REQ');

  const catalogItem = await prisma.serviceCatalogItem.findUnique({
    where: { id: data.catalogItemId },
  });

  if (!catalogItem || !catalogItem.isActive) {
    throw new Error('Catalog item not found or inactive');
  }

  const request = await prisma.serviceRequest.create({
    data: {
      displayId,
      catalogItemId: data.catalogItemId,
      requesterId: data.requesterId,
      priority: data.priority,
      formData: data.formData,
      notes: data.notes,
      status: RequestStatus.SUBMITTED,
    },
    include: {
      catalogItem: {
        include: {
          category: true,
        },
      },
      requester: true,
      fulfiller: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'SERVICE_REQUEST',
    entityId: request.id,
    action: AuditAction.CREATE,
    userId: data.requesterId,
    newValues: {
      displayId: request.displayId,
      catalogItem: catalogItem.name,
      status: request.status,
    },
  });

  return request;
}

export async function getServiceRequest(
  prisma: PrismaClient,
  id: string
): Promise<ServiceRequest | null> {
  return await prisma.serviceRequest.findUnique({
    where: { id, deletedAt: null },
    include: {
      catalogItem: {
        include: {
          category: true,
        },
      },
      requester: true,
      fulfiller: true,
      approvals: {
        include: {
          approver: true,
        },
      },
    },
  });
}

export async function listServiceRequests(
  prisma: PrismaClient,
  filters: {
    page: number;
    limit: number;
    status?: RequestStatus;
    priority?: string;
    requesterId?: string;
    fulfillerId?: string;
    catalogItemId?: string;
  }
) {
  const where: any = {
    deletedAt: null,
  };

  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.requesterId) where.requesterId = filters.requesterId;
  if (filters.fulfillerId) where.fulfillerId = filters.fulfillerId;
  if (filters.catalogItemId) where.catalogItemId = filters.catalogItemId;

  const [data, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      include: {
        catalogItem: {
          include: {
            category: true,
          },
        },
        requester: true,
        fulfiller: true,
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
    prisma.serviceRequest.count({ where }),
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

export async function updateServiceRequest(
  prisma: PrismaClient,
  id: string,
  data: UpdateServiceRequestInput,
  userId: string
): Promise<ServiceRequest> {
  const existing = await prisma.serviceRequest.findUnique({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new Error('Service request not found');
  }

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data: {
      status: data.status,
      priority: data.priority,
      fulfillerId: data.fulfillerId,
      formData: data.formData,
      notes: data.notes,
    },
    include: {
      catalogItem: {
        include: {
          category: true,
        },
      },
      requester: true,
      fulfiller: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'SERVICE_REQUEST',
    entityId: id,
    action: AuditAction.UPDATE,
    userId,
    oldValues: { status: existing.status },
    newValues: { status: updated.status },
  });

  return updated;
}

export async function deleteServiceRequest(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  const existing = await prisma.serviceRequest.findUnique({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new Error('Service request not found');
  }

  await prisma.serviceRequest.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logAudit(prisma, {
    entityType: 'SERVICE_REQUEST',
    entityId: id,
    action: AuditAction.DELETE,
    userId,
    oldValues: { displayId: existing.displayId },
  });
}

export async function approveServiceRequest(
  prisma: PrismaClient,
  id: string,
  data: ApproveRequestInput
): Promise<ServiceRequest> {
  const request = await prisma.serviceRequest.findUnique({
    where: { id, deletedAt: null },
  });

  if (!request) {
    throw new Error('Service request not found');
  }

  if (request.status !== RequestStatus.PENDING_APPROVAL) {
    throw new Error('Request is not pending approval');
  }

  await prisma.requestApproval.create({
    data: {
      requestId: id,
      approverId: data.approverId,
      approved: true,
      notes: data.notes,
    },
  });

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data: { status: RequestStatus.APPROVED },
    include: {
      catalogItem: {
        include: {
          category: true,
        },
      },
      requester: true,
      fulfiller: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'SERVICE_REQUEST',
    entityId: id,
    action: AuditAction.UPDATE,
    userId: data.approverId,
    oldValues: { status: RequestStatus.PENDING_APPROVAL },
    newValues: { status: RequestStatus.APPROVED },
  });

  return updated;
}

export async function rejectServiceRequest(
  prisma: PrismaClient,
  id: string,
  data: RejectRequestInput
): Promise<ServiceRequest> {
  const request = await prisma.serviceRequest.findUnique({
    where: { id, deletedAt: null },
  });

  if (!request) {
    throw new Error('Service request not found');
  }

  if (request.status !== RequestStatus.PENDING_APPROVAL) {
    throw new Error('Request is not pending approval');
  }

  await prisma.requestApproval.create({
    data: {
      requestId: id,
      approverId: data.rejectedById,
      approved: false,
      notes: data.reason,
    },
  });

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data: { status: RequestStatus.REJECTED },
    include: {
      catalogItem: {
        include: {
          category: true,
        },
      },
      requester: true,
      fulfiller: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'SERVICE_REQUEST',
    entityId: id,
    action: AuditAction.UPDATE,
    userId: data.rejectedById,
    oldValues: { status: RequestStatus.PENDING_APPROVAL },
    newValues: { status: RequestStatus.REJECTED, reason: data.reason },
  });

  return updated;
}

export async function fulfillServiceRequest(
  prisma: PrismaClient,
  id: string,
  data: FulfillRequestInput
): Promise<ServiceRequest> {
  const request = await prisma.serviceRequest.findUnique({
    where: { id, deletedAt: null },
  });

  if (!request) {
    throw new Error('Service request not found');
  }

  if (request.status === RequestStatus.SUBMITTED) {
    // Auto-approve if no approval required
    await prisma.serviceRequest.update({
      where: { id },
      data: { status: RequestStatus.APPROVED },
    });
  }

  if (request.status !== RequestStatus.APPROVED && request.status !== RequestStatus.FULFILLING) {
    throw new Error('Request must be approved before fulfillment');
  }

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data: {
      status: RequestStatus.FULFILLING,
      fulfillerId: data.fulfillerId,
      notes: data.notes,
    },
    include: {
      catalogItem: {
        include: {
          category: true,
        },
      },
      requester: true,
      fulfiller: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'SERVICE_REQUEST',
    entityId: id,
    action: AuditAction.UPDATE,
    userId: data.fulfillerId,
    oldValues: { status: request.status },
    newValues: { status: RequestStatus.FULFILLING },
  });

  return updated;
}

export async function completeServiceRequest(
  prisma: PrismaClient,
  id: string,
  userId: string,
  notes?: string
): Promise<ServiceRequest> {
  const request = await prisma.serviceRequest.findUnique({
    where: { id, deletedAt: null },
  });

  if (!request) {
    throw new Error('Service request not found');
  }

  if (request.status !== RequestStatus.FULFILLING) {
    throw new Error('Request must be fulfilling before completion');
  }

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data: {
      status: RequestStatus.COMPLETED,
      fulfilledAt: new Date(),
      notes: notes || request.notes,
    },
    include: {
      catalogItem: {
        include: {
          category: true,
        },
      },
      requester: true,
      fulfiller: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'SERVICE_REQUEST',
    entityId: id,
    action: AuditAction.UPDATE,
    userId,
    oldValues: { status: RequestStatus.FULFILLING },
    newValues: { status: RequestStatus.COMPLETED },
  });

  return updated;
}

// Service Catalog Functions

export async function createCatalogItem(
  prisma: PrismaClient,
  data: CreateCatalogItemInput
): Promise<ServiceCatalogItem> {
  const item = await prisma.serviceCatalogItem.create({
    data: {
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      fulfillmentTime: data.fulfillmentTime,
      requiresApproval: data.requiresApproval,
      formSchema: data.formSchema,
      isActive: data.isActive,
    },
    include: {
      category: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'CATALOG_ITEM',
    entityId: item.id,
    action: AuditAction.CREATE,
    userId: 'system',
    newValues: { name: item.name },
  });

  return item;
}

export async function getCatalogItem(
  prisma: PrismaClient,
  id: string
): Promise<ServiceCatalogItem | null> {
  return await prisma.serviceCatalogItem.findUnique({
    where: { id },
    include: {
      category: true,
      _count: {
        select: {
          requests: true,
        },
      },
    },
  });
}

export async function listCatalogItems(
  prisma: PrismaClient,
  filters: {
    page: number;
    limit: number;
    categoryId?: string;
    isActive?: boolean;
  }
) {
  const where: any = {};

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;

  const [data, total] = await Promise.all([
    prisma.serviceCatalogItem.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: {
            requests: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.serviceCatalogItem.count({ where }),
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

export async function updateCatalogItem(
  prisma: PrismaClient,
  id: string,
  data: UpdateCatalogItemInput
): Promise<ServiceCatalogItem> {
  const existing = await prisma.serviceCatalogItem.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Catalog item not found');
  }

  const updated = await prisma.serviceCatalogItem.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      fulfillmentTime: data.fulfillmentTime,
      requiresApproval: data.requiresApproval,
      formSchema: data.formSchema,
      isActive: data.isActive,
    },
    include: {
      category: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'CATALOG_ITEM',
    entityId: id,
    action: AuditAction.UPDATE,
    userId: 'system',
    oldValues: { isActive: existing.isActive },
    newValues: { isActive: updated.isActive },
  });

  return updated;
}
