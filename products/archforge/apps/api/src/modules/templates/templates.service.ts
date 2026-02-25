/**
 * Template Service
 *
 * Business logic for template CRUD and instantiation.
 */

import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import type {
  TemplateResponse,
  TemplateListResponse,
} from './templates.types.js';

export class TemplateService {
  constructor(private fastify: FastifyInstance) {}

  private async audit(
    action: string,
    userId: string,
    resourceId: string | null,
    ip: string,
    userAgent: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.fastify.prisma.auditLog.create({
        data: {
          userId,
          resourceId,
          resourceType: 'template',
          action,
          metadata,
          ipAddress: ip || null,
          userAgent: userAgent || null,
        },
      });
    } catch (err) {
      logger.error('Failed to write audit log', err);
    }
  }

  private async getWorkspaceId(userId: string): Promise<string> {
    const membership =
      await this.fastify.prisma.workspaceMember.findFirst({
        where: { userId, role: 'owner' },
        select: { workspaceId: true },
      });

    if (!membership) {
      throw new AppError(403, 'forbidden', 'User has no workspace');
    }

    return membership.workspaceId;
  }

  private formatTemplate(
    template: Prisma.TemplateGetPayload<{
      include: { creator: true };
    }>,
  ): TemplateResponse {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      subcategory: template.subcategory,
      framework: template.framework,
      isPublic: template.isPublic,
      usageCount: template.usageCount,
      createdBy: {
        id: template.creator.id,
        email: template.creator.email,
        fullName: template.creator.fullName,
      },
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  async list(
    userId: string,
    query: {
      category?: string;
      framework?: string;
      search?: string;
      cursor?: string;
      pageSize: number;
    },
  ): Promise<TemplateListResponse> {
    const where: Prisma.TemplateWhereInput = {
      OR: [{ isPublic: true }, { createdBy: userId }],
    };

    if (query.category) {
      where.category = query.category;
    }
    if (query.framework) {
      where.framework = query.framework;
    }
    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const total = await this.fastify.prisma.template.count({
      where,
    });

    const findArgs: Prisma.TemplateFindManyArgs = {
      where,
      include: { creator: true },
      orderBy: { usageCount: 'desc' },
      take: query.pageSize + 1,
    };

    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const templates =
      await this.fastify.prisma.template.findMany(findArgs);

    const hasMore = templates.length > query.pageSize;
    const items = templates.slice(0, query.pageSize);
    const nextCursor = hasMore
      ? items[items.length - 1].id
      : null;

    type TemplateWithCreator = Prisma.TemplateGetPayload<{
      include: { creator: true };
    }>;

    return {
      data: (items as TemplateWithCreator[]).map((t) =>
        this.formatTemplate(t),
      ),
      meta: {
        total,
        pageSize: query.pageSize,
        hasMore,
        nextCursor,
      },
    };
  }

  async getById(
    userId: string,
    templateId: string,
  ): Promise<TemplateResponse> {
    const template =
      await this.fastify.prisma.template.findFirst({
        where: {
          id: templateId,
          OR: [{ isPublic: true }, { createdBy: userId }],
        },
        include: { creator: true },
      });

    if (!template) {
      throw new AppError(404, 'not-found', 'Template not found');
    }

    return this.formatTemplate(template);
  }

  async create(
    userId: string,
    data: {
      name: string;
      description?: string | null;
      category: string;
      subcategory?: string | null;
      framework: string;
      canvasData: Record<string, unknown>;
      isPublic?: boolean;
      artifactId?: string;
    },
    ip: string,
    userAgent: string,
  ): Promise<TemplateResponse> {
    let canvasData = data.canvasData;

    // If created from an existing artifact, copy its canvas data
    if (data.artifactId) {
      const artifact =
        await this.fastify.prisma.artifact.findUnique({
          where: { id: data.artifactId },
        });

      if (!artifact) {
        throw new AppError(
          404,
          'not-found',
          'Source artifact not found',
        );
      }

      canvasData = artifact.canvasData as Record<string, unknown>;
    }

    const template = await this.fastify.prisma.template.create({
      data: {
        createdBy: userId,
        name: data.name,
        description: data.description || null,
        category: data.category,
        subcategory: data.subcategory || null,
        framework: data.framework,
        canvasData: canvasData as Prisma.InputJsonValue,
        isPublic: data.isPublic ?? false,
      },
      include: { creator: true },
    });

    logger.info('Template created', {
      templateId: template.id,
      userId,
    });
    await this.audit(
      'template.create',
      userId,
      template.id,
      ip,
      userAgent,
      { name: data.name },
    );

    return this.formatTemplate(template);
  }

  async instantiate(
    userId: string,
    templateId: string,
    data: { projectId: string; name?: string },
    ip: string,
    userAgent: string,
  ): Promise<{
    id: string;
    name: string;
    projectId: string;
    framework: string;
    type: string;
  }> {
    const workspaceId = await this.getWorkspaceId(userId);

    // Verify project access
    const project = await this.fastify.prisma.project.findFirst({
      where: { id: data.projectId, workspaceId },
    });

    if (!project) {
      throw new AppError(404, 'not-found', 'Project not found');
    }

    // Get template
    const template =
      await this.fastify.prisma.template.findFirst({
        where: {
          id: templateId,
          OR: [{ isPublic: true }, { createdBy: userId }],
        },
      });

    if (!template) {
      throw new AppError(404, 'not-found', 'Template not found');
    }

    // Determine artifact type from framework
    const typeMap: Record<string, string> = {
      c4: 'c4_context',
      archimate: 'archimate_layered',
      togaf: 'togaf_adm',
      bpmn: 'bpmn_process',
    };

    const artifact = await this.fastify.prisma.$transaction(
      async (tx) => {
        const art = await tx.artifact.create({
          data: {
            projectId: data.projectId,
            createdBy: userId,
            name: data.name || `From template: ${template.name}`,
            type: typeMap[template.framework] || 'c4_context',
            framework: template.framework,
            status: 'draft',
            canvasData:
              template.canvasData as Prisma.InputJsonValue,
            currentVersion: 1,
          },
        });

        await tx.artifactVersion.create({
          data: {
            artifactId: art.id,
            createdBy: userId,
            versionNumber: 1,
            canvasData:
              template.canvasData as Prisma.InputJsonValue,
            changeSummary: `Created from template: ${template.name}`,
            changeType: 'template_instantiation',
          },
        });

        // Increment usage count
        await tx.template.update({
          where: { id: templateId },
          data: { usageCount: { increment: 1 } },
        });

        return art;
      },
    );

    logger.info('Template instantiated', {
      templateId,
      artifactId: artifact.id,
      userId,
    });
    await this.audit(
      'template.instantiate',
      userId,
      templateId,
      ip,
      userAgent,
      {
        artifactId: artifact.id,
        projectId: data.projectId,
      },
    );

    return {
      id: artifact.id,
      name: artifact.name,
      projectId: artifact.projectId,
      framework: artifact.framework,
      type: artifact.type,
    };
  }
}
