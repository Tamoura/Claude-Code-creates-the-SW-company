/**
 * Comment Service
 *
 * Business logic for artifact comments with threading,
 * element anchoring, and resolution.
 */

import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import type { CommentResponse } from './comments.types.js';

export class CommentService {
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
          resourceType: 'comment',
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

  private formatComment(
    comment: Prisma.CommentGetPayload<{
      include: { author: true };
    }>,
  ): CommentResponse {
    return {
      id: comment.id,
      artifactId: comment.artifactId,
      body: comment.body,
      status: comment.status,
      elementId: comment.elementId,
      parentCommentId: comment.parentCommentId,
      author: {
        id: comment.author.id,
        email: comment.author.email,
        fullName: comment.author.fullName,
      },
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      resolvedAt: comment.resolvedAt?.toISOString() || null,
    };
  }

  async create(
    userId: string,
    artifactId: string,
    data: {
      body: string;
      parentCommentId?: string | null;
      elementId?: string | null;
    },
    ip: string,
    userAgent: string,
  ): Promise<CommentResponse> {
    await this.verifyArtifactAccess(userId, artifactId);

    if (data.parentCommentId) {
      const parent = await this.fastify.prisma.comment.findFirst({
        where: { id: data.parentCommentId, artifactId },
      });
      if (!parent) {
        throw new AppError(404, 'not-found', 'Parent comment not found');
      }
    }

    const comment = await this.fastify.prisma.comment.create({
      data: {
        artifactId,
        authorId: userId,
        body: data.body,
        parentCommentId: data.parentCommentId || null,
        elementId: data.elementId || null,
      },
      include: { author: true },
    });

    logger.info('Comment created', { commentId: comment.id, userId });
    await this.audit('comment.create', userId, comment.id, ip, userAgent, {
      artifactId,
    });

    return this.formatComment(comment);
  }

  async list(
    userId: string,
    artifactId: string,
    query: { status: string; elementId?: string },
  ): Promise<{ data: CommentResponse[] }> {
    await this.verifyArtifactAccess(userId, artifactId);

    const where: Prisma.CommentWhereInput = { artifactId };

    if (query.status !== 'all') {
      where.status = query.status;
    }

    if (query.elementId) {
      where.elementId = query.elementId;
    }

    const comments = await this.fastify.prisma.comment.findMany({
      where,
      include: { author: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: comments.map((c) => this.formatComment(c)),
    };
  }

  async update(
    userId: string,
    commentId: string,
    data: { body: string },
    ip: string,
    userAgent: string,
  ): Promise<CommentResponse> {
    const comment = await this.fastify.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new AppError(404, 'not-found', 'Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new AppError(
        403,
        'forbidden',
        'Only the author can edit this comment',
      );
    }

    const updated = await this.fastify.prisma.comment.update({
      where: { id: commentId },
      data: { body: data.body },
      include: { author: true },
    });

    logger.info('Comment updated', { commentId, userId });
    await this.audit(
      'comment.update',
      userId,
      commentId,
      ip,
      userAgent,
      {},
    );

    return this.formatComment(updated);
  }

  async delete(
    userId: string,
    commentId: string,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    const comment = await this.fastify.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new AppError(404, 'not-found', 'Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new AppError(
        403,
        'forbidden',
        'Only the author can delete this comment',
      );
    }

    await this.fastify.prisma.comment.delete({
      where: { id: commentId },
    });

    logger.info('Comment deleted', { commentId, userId });
    await this.audit(
      'comment.delete',
      userId,
      commentId,
      ip,
      userAgent,
      {},
    );
  }

  async resolve(
    userId: string,
    commentId: string,
    ip: string,
    userAgent: string,
  ): Promise<CommentResponse> {
    await this.verifyCommentAccess(userId, commentId);

    const comment = await this.fastify.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new AppError(404, 'not-found', 'Comment not found');
    }

    const updated = await this.fastify.prisma.comment.update({
      where: { id: commentId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
      include: { author: true },
    });

    logger.info('Comment resolved', { commentId, userId });
    await this.audit(
      'comment.resolve',
      userId,
      commentId,
      ip,
      userAgent,
      {},
    );

    return this.formatComment(updated);
  }

  private async verifyCommentAccess(
    userId: string,
    commentId: string,
  ): Promise<void> {
    const comment = await this.fastify.prisma.comment.findUnique({
      where: { id: commentId },
      include: { artifact: true },
    });
    if (!comment) {
      throw new AppError(404, 'not-found', 'Comment not found');
    }
    const member = await this.fastify.prisma.projectMember.findFirst({
      where: { projectId: comment.artifact.projectId, userId },
    });
    if (!member) {
      throw new AppError(403, 'forbidden', 'Not a member of this project');
    }
  }
}
