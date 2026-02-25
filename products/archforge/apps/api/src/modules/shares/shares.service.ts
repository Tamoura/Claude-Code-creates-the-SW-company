/**
 * Share Service
 *
 * Business logic for sharing artifacts with users or via links.
 */

import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import type {
  ShareResponse,
  LinkResolveResponse,
} from './shares.types.js';

export class ShareService {
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
          resourceType: 'share',
          action,
          metadata: metadata as Prisma.InputJsonValue,
          ipAddress: ip || null,
          userAgent: userAgent || null,
        },
      });
    } catch (err) {
      logger.error('Failed to write audit log', err);
    }
  }

  private async verifyArtifactAccess(
    userId: string,
    artifactId: string,
  ): Promise<void> {
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
  }

  private formatShare(
    share: Prisma.ShareGetPayload<{
      include: {
        sharedBy: true;
        sharedWith: true;
      };
    }>,
  ): ShareResponse {
    return {
      id: share.id,
      artifactId: share.artifactId,
      permission: share.permission,
      shareType: share.shareType,
      email: share.email,
      linkToken: share.linkToken,
      expiresAt: share.expiresAt?.toISOString() || null,
      sharedBy: {
        id: share.sharedBy.id,
        email: share.sharedBy.email,
        fullName: share.sharedBy.fullName,
      },
      sharedWith: share.sharedWith
        ? {
            id: share.sharedWith.id,
            email: share.sharedWith.email,
            fullName: share.sharedWith.fullName,
          }
        : null,
      createdAt: share.createdAt.toISOString(),
    };
  }

  async shareWithUser(
    userId: string,
    artifactId: string,
    data: { email: string; permission: string },
    ip: string,
    userAgent: string,
  ): Promise<ShareResponse> {
    await this.verifyArtifactAccess(userId, artifactId);

    const targetUser = await this.fastify.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!targetUser) {
      throw new AppError(
        404,
        'not-found',
        'User not found with that email',
      );
    }

    // Check for existing share
    const existing = await this.fastify.prisma.share.findFirst({
      where: {
        artifactId,
        sharedWithId: targetUser.id,
        shareType: 'user',
      },
    });

    if (existing) {
      throw new AppError(
        409,
        'conflict',
        'Artifact already shared with this user',
      );
    }

    const share = await this.fastify.prisma.share.create({
      data: {
        artifactId,
        sharedById: userId,
        sharedWithId: targetUser.id,
        email: data.email,
        permission: data.permission,
        shareType: 'user',
      },
      include: { sharedBy: true, sharedWith: true },
    });

    logger.info('Artifact shared with user', {
      shareId: share.id,
      artifactId,
    });
    await this.audit('share.user', userId, share.id, ip, userAgent, {
      targetEmail: data.email,
      permission: data.permission,
    });

    return this.formatShare(share);
  }

  async createLink(
    userId: string,
    artifactId: string,
    data: { permission: string; expiresInHours?: number },
    ip: string,
    userAgent: string,
  ): Promise<ShareResponse> {
    await this.verifyArtifactAccess(userId, artifactId);

    const linkToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = data.expiresInHours
      ? new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000)
      : null;

    const share = await this.fastify.prisma.share.create({
      data: {
        artifactId,
        sharedById: userId,
        permission: data.permission,
        shareType: 'link',
        linkToken,
        expiresAt,
      },
      include: { sharedBy: true, sharedWith: true },
    });

    logger.info('Share link created', {
      shareId: share.id,
      artifactId,
    });
    await this.audit('share.link', userId, share.id, ip, userAgent, {
      permission: data.permission,
      expiresInHours: data.expiresInHours,
    });

    return this.formatShare(share);
  }

  async list(
    userId: string,
    artifactId: string,
  ): Promise<{ data: ShareResponse[] }> {
    await this.verifyArtifactAccess(userId, artifactId);

    const shares = await this.fastify.prisma.share.findMany({
      where: { artifactId },
      include: { sharedBy: true, sharedWith: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: shares.map((s) => this.formatShare(s)),
    };
  }

  async revoke(
    userId: string,
    shareId: string,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    const share = await this.fastify.prisma.share.findUnique({
      where: { id: shareId },
    });

    if (!share) {
      throw new AppError(404, 'not-found', 'Share not found');
    }

    if (share.sharedById !== userId) {
      throw new AppError(
        403,
        'forbidden',
        'Only the sharer can revoke this share',
      );
    }

    await this.fastify.prisma.share.delete({
      where: { id: shareId },
    });

    logger.info('Share revoked', { shareId, userId });
    await this.audit('share.revoke', userId, shareId, ip, userAgent, {});
  }

  async resolveLink(linkToken: string): Promise<LinkResolveResponse> {
    const share = await this.fastify.prisma.share.findUnique({
      where: { linkToken },
    });

    if (!share) {
      throw new AppError(404, 'not-found', 'Share link not found');
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new AppError(410, 'gone', 'Share link has expired');
    }

    return {
      artifactId: share.artifactId,
      permission: share.permission,
      expiresAt: share.expiresAt?.toISOString() || null,
    };
  }
}
