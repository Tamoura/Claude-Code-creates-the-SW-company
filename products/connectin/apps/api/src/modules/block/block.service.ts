import { PrismaClient } from '@prisma/client';
import { ValidationError } from '../../lib/errors';
import { CreateReportInput } from './block.schemas';

export class BlockService {
  constructor(private readonly prisma: PrismaClient) {}

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new ValidationError('Cannot block yourself', [
        { field: 'userId', message: 'Cannot block yourself' },
      ]);
    }

    // Upsert block record (idempotent)
    const block = await this.prisma.block.upsert({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
      create: { blockerId, blockedId },
      update: {},
    });

    // Remove existing connections between users
    await this.prisma.connection.deleteMany({
      where: {
        OR: [
          { senderId: blockerId, receiverId: blockedId },
          { senderId: blockedId, receiverId: blockerId },
        ],
      },
    });

    return block;
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.block.deleteMany({
      where: { blockerId, blockedId },
    });

    return { success: true };
  }

  async getBlockedUsers(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            displayName: true,
            profile: {
              select: { avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return blocks.map((b) => ({
      id: b.id,
      blockedId: b.blockedId,
      user: {
        id: b.blocked.id,
        displayName: b.blocked.displayName,
        avatarUrl: b.blocked.profile?.avatarUrl ?? null,
      },
      createdAt: b.createdAt,
    }));
  }

  async isBlocked(
    userId1: string,
    userId2: string
  ): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userId1, blockedId: userId2 },
          { blockerId: userId2, blockedId: userId1 },
        ],
      },
    });

    return !!block;
  }

  async createReport(
    reporterId: string,
    input: CreateReportInput
  ) {
    if (
      input.targetType === 'USER' &&
      reporterId === input.targetId
    ) {
      throw new ValidationError(
        'Cannot report yourself',
        [
          {
            field: 'targetId',
            message: 'Cannot report yourself',
          },
        ]
      );
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        description: input.description,
      },
    });

    return report;
  }
}
