/**
 * Project Service
 *
 * Business logic for project CRUD, archive/restore, and search.
 */

import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import type { ProjectResponse, ProjectListResponse } from './projects.types.js';

export class ProjectService {
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
          resourceType: 'project',
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
    const membership = await this.fastify.prisma.workspaceMember.findFirst({
      where: { userId, role: 'owner' },
      select: { workspaceId: true },
    });

    if (!membership) {
      throw new AppError(403, 'forbidden', 'User has no workspace');
    }

    return membership.workspaceId;
  }

  private formatProject(
    project: Prisma.ProjectGetPayload<{
      include: { creator: true; _count: { select: { artifacts: true } } };
    }>,
  ): ProjectResponse {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      frameworkPreference: project.frameworkPreference,
      status: project.status,
      artifactCount: project._count.artifacts,
      memberCount: 0, // computed separately when needed
      createdBy: {
        id: project.creator.id,
        email: project.creator.email,
        fullName: project.creator.fullName,
      },
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      archivedAt: project.archivedAt?.toISOString() || null,
      thumbnailUrl: null, // computed from most recent artifact (future)
    };
  }

  async create(
    userId: string,
    data: { name: string; description?: string | null; frameworkPreference?: string },
    ip: string,
    userAgent: string,
  ): Promise<ProjectResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const project = await this.fastify.prisma.project.create({
      data: {
        workspaceId,
        createdBy: userId,
        name: data.name,
        description: data.description || null,
        frameworkPreference: data.frameworkPreference || 'auto',
        status: 'active',
      },
      include: {
        creator: true,
        _count: { select: { artifacts: true } },
      },
    });

    logger.info('Project created', { projectId: project.id, userId });
    await this.audit('project.create', userId, project.id, ip, userAgent, {
      name: data.name,
    });

    return this.formatProject(project);
  }

  async list(
    userId: string,
    query: { status: string; search?: string; cursor?: string; pageSize: number },
  ): Promise<ProjectListResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const where: Prisma.ProjectWhereInput = {
      workspaceId,
    };

    if (query.status !== 'all') {
      where.status = query.status;
    }

    if (query.search) {
      where.name = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    const total = await this.fastify.prisma.project.count({ where });

    const findArgs: Prisma.ProjectFindManyArgs = {
      where,
      include: {
        creator: true,
        _count: { select: { artifacts: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: query.pageSize + 1,
    };

    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const projects = await this.fastify.prisma.project.findMany(findArgs);

    const hasMore = projects.length > query.pageSize;
    const data = projects.slice(0, query.pageSize);
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return {
      data: data.map((p) => this.formatProject(p as Parameters<typeof this.formatProject>[0])),
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
    projectId: string,
  ): Promise<ProjectResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const project = await this.fastify.prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId,
      },
      include: {
        creator: true,
        _count: { select: { artifacts: true } },
      },
    });

    if (!project) {
      throw new AppError(404, 'not-found', 'Project not found');
    }

    return this.formatProject(project);
  }

  async update(
    userId: string,
    projectId: string,
    data: { name?: string; description?: string | null; frameworkPreference?: string; status?: string },
    ip: string,
    userAgent: string,
  ): Promise<ProjectResponse> {
    const workspaceId = await this.getWorkspaceId(userId);

    const existing = await this.fastify.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });

    if (!existing) {
      throw new AppError(404, 'not-found', 'Project not found');
    }

    if (existing.createdBy !== userId) {
      throw new AppError(403, 'forbidden', 'Only the project owner can update this project');
    }

    const updateData: Prisma.ProjectUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.frameworkPreference !== undefined) updateData.frameworkPreference = data.frameworkPreference;

    if (data.status === 'archived' && existing.status !== 'archived') {
      updateData.status = 'archived';
      updateData.archivedAt = new Date();
    } else if (data.status === 'active' && existing.status === 'archived') {
      updateData.status = 'active';
      updateData.archivedAt = null;
    }

    const project = await this.fastify.prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        creator: true,
        _count: { select: { artifacts: true } },
      },
    });

    const action = data.status === 'archived' ? 'project.archive' : data.status === 'active' ? 'project.restore' : 'project.update';
    logger.info(`Project ${action}`, { projectId, userId });
    await this.audit(action, userId, projectId, ip, userAgent, {
      changes: Object.keys(data),
    });

    return this.formatProject(project);
  }

  async delete(
    userId: string,
    projectId: string,
    confirmName: string,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    const workspaceId = await this.getWorkspaceId(userId);

    const existing = await this.fastify.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });

    if (!existing) {
      throw new AppError(404, 'not-found', 'Project not found');
    }

    if (existing.createdBy !== userId) {
      throw new AppError(403, 'forbidden', 'Only the project owner can delete this project');
    }

    if (existing.name !== confirmName) {
      throw new AppError(400, 'bad-request', 'Project name confirmation does not match');
    }

    await this.fastify.prisma.project.delete({
      where: { id: projectId },
    });

    logger.info('Project deleted', { projectId, userId });
    await this.audit('project.delete', userId, projectId, ip, userAgent, {
      name: existing.name,
    });
  }
}
