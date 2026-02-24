/**
 * Version Service
 *
 * Business logic for artifact version history, diff, and restore.
 */

import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import type {
  VersionResponse,
  VersionListResponse,
  VersionDiffResponse,
} from './versions.types.js';

export class VersionService {
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
          resourceType: 'artifact_version',
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

  private formatVersion(
    version: Prisma.ArtifactVersionGetPayload<{
      include: { creator: true };
    }>,
  ): VersionResponse {
    return {
      id: version.id,
      artifactId: version.artifactId,
      versionNumber: version.versionNumber,
      canvasData: version.canvasData,
      svgContent: version.svgContent,
      changeSummary: version.changeSummary,
      changeType: version.changeType,
      createdBy: {
        id: version.creator.id,
        email: version.creator.email,
        fullName: version.creator.fullName,
      },
      createdAt: version.createdAt.toISOString(),
    };
  }

  async list(
    userId: string,
    artifactId: string,
    query: { cursor?: string; pageSize: number },
  ): Promise<VersionListResponse> {
    const artifact = await this.fastify.prisma.artifact.findUnique({
      where: { id: artifactId },
    });

    if (!artifact) {
      throw new AppError(404, 'not-found', 'Artifact not found');
    }

    // Verify user has access to the project
    const member = await this.fastify.prisma.projectMember.findFirst({
      where: { projectId: artifact.projectId, userId },
    });
    if (!member) {
      throw new AppError(403, 'forbidden', 'Not a member of this project');
    }

    const where: Prisma.ArtifactVersionWhereInput = { artifactId };

    const total = await this.fastify.prisma.artifactVersion.count({
      where,
    });

    const findArgs: Prisma.ArtifactVersionFindManyArgs = {
      where,
      include: { creator: true },
      orderBy: { versionNumber: 'desc' },
      take: query.pageSize + 1,
    };

    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const versions =
      await this.fastify.prisma.artifactVersion.findMany(findArgs);

    const hasMore = versions.length > query.pageSize;
    const data = versions.slice(0, query.pageSize);
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return {
      data: data.map((v) =>
        this.formatVersion(
          v as Parameters<typeof this.formatVersion>[0],
        ),
      ),
      meta: { total, pageSize: query.pageSize, hasMore, nextCursor },
    };
  }

  async getById(
    userId: string,
    artifactId: string,
    versionId: string,
  ): Promise<VersionResponse> {
    const version = await this.fastify.prisma.artifactVersion.findFirst({
      where: { id: versionId, artifactId },
      include: { creator: true },
    });

    if (!version) {
      throw new AppError(404, 'not-found', 'Version not found');
    }

    // Verify access
    const artifact = await this.fastify.prisma.artifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) {
      throw new AppError(404, 'not-found', 'Artifact not found');
    }

    const member = await this.fastify.prisma.projectMember.findFirst({
      where: { projectId: artifact.projectId, userId },
    });
    if (!member) {
      throw new AppError(403, 'forbidden', 'Not a member of this project');
    }

    return this.formatVersion(version);
  }

  async diff(
    userId: string,
    artifactId: string,
    fromVersionId: string,
    toVersionId: string,
  ): Promise<VersionDiffResponse> {
    const artifact = await this.fastify.prisma.artifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) {
      throw new AppError(404, 'not-found', 'Artifact not found');
    }

    const member = await this.fastify.prisma.projectMember.findFirst({
      where: { projectId: artifact.projectId, userId },
    });
    if (!member) {
      throw new AppError(403, 'forbidden', 'Not a member of this project');
    }

    const fromVersion =
      await this.fastify.prisma.artifactVersion.findFirst({
        where: { id: fromVersionId, artifactId },
      });
    const toVersion =
      await this.fastify.prisma.artifactVersion.findFirst({
        where: { id: toVersionId, artifactId },
      });

    if (!fromVersion || !toVersion) {
      throw new AppError(404, 'not-found', 'Version not found');
    }

    // Compute element-level diff from canvasData JSON
    const fromData = fromVersion.canvasData as Record<string, unknown>;
    const toData = toVersion.canvasData as Record<string, unknown>;

    const fromElements = Array.isArray(
      (fromData as { elements?: unknown[] }).elements,
    )
      ? ((fromData as { elements: unknown[] }).elements as Array<{
          id?: string;
          [key: string]: unknown;
        }>)
      : [];
    const toElements = Array.isArray(
      (toData as { elements?: unknown[] }).elements,
    )
      ? ((toData as { elements: unknown[] }).elements as Array<{
          id?: string;
          [key: string]: unknown;
        }>)
      : [];

    const fromIds = new Set(fromElements.map((e) => e.id));
    const toIds = new Set(toElements.map((e) => e.id));

    const added = toElements.filter((e) => !fromIds.has(e.id));
    const removed = fromElements.filter((e) => !toIds.has(e.id));
    const modified = toElements.filter((e) => {
      if (!fromIds.has(e.id)) return false;
      const fromEl = fromElements.find((f) => f.id === e.id);
      return JSON.stringify(fromEl) !== JSON.stringify(e);
    });

    return {
      fromVersion: fromVersion.versionNumber,
      toVersion: toVersion.versionNumber,
      changes: { added, removed, modified },
    };
  }

  async restore(
    userId: string,
    artifactId: string,
    versionId: string,
    changeSummary: string | undefined,
    ip: string,
    userAgent: string,
  ): Promise<VersionResponse> {
    const artifact = await this.fastify.prisma.artifact.findUnique({
      where: { id: artifactId },
    });
    if (!artifact) {
      throw new AppError(404, 'not-found', 'Artifact not found');
    }

    const member = await this.fastify.prisma.projectMember.findFirst({
      where: { projectId: artifact.projectId, userId },
    });
    if (!member) {
      throw new AppError(403, 'forbidden', 'Not a member of this project');
    }

    const sourceVersion =
      await this.fastify.prisma.artifactVersion.findFirst({
        where: { id: versionId, artifactId },
      });

    if (!sourceVersion) {
      throw new AppError(404, 'not-found', 'Version not found');
    }

    const newVersionNumber = artifact.currentVersion + 1;

    const newVersion = await this.fastify.prisma.$transaction(
      async (tx) => {
        const v = await tx.artifactVersion.create({
          data: {
            artifactId,
            createdBy: userId,
            versionNumber: newVersionNumber,
            canvasData:
              sourceVersion.canvasData as Prisma.InputJsonValue,
            changeSummary:
              changeSummary ||
              `Restored from version ${sourceVersion.versionNumber}`,
            changeType: 'restore',
          },
          include: { creator: true },
        });

        await tx.artifact.update({
          where: { id: artifactId },
          data: {
            canvasData:
              sourceVersion.canvasData as Prisma.InputJsonValue,
            currentVersion: newVersionNumber,
          },
        });

        return v;
      },
    );

    logger.info('Version restored', {
      artifactId,
      fromVersion: sourceVersion.versionNumber,
      toVersion: newVersionNumber,
    });
    await this.audit(
      'version.restore',
      userId,
      artifactId,
      ip,
      userAgent,
      {
        fromVersion: sourceVersion.versionNumber,
        newVersion: newVersionNumber,
      },
    );

    return this.formatVersion(newVersion);
  }
}
