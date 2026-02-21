import { PrismaClient } from '@prisma/client';
import {
  ConflictError,
  ForbiddenError,
  BadRequestError,
  NotFoundError,
} from '../../lib/errors';
import { SendRequestInput } from './connection.schemas';
import { parsePagination, offsetMeta } from '../../lib/pagination';

const MAX_PENDING_OUTGOING = 100;
const COOLDOWN_DAYS = 30;
const EXPIRY_DAYS = 90;

export class ConnectionService {
  constructor(private readonly prisma: PrismaClient) {}

  async sendRequest(
    senderId: string,
    input: SendRequestInput
  ) {
    if (senderId === input.receiverId) {
      throw new BadRequestError(
        'Cannot send connection request to yourself'
      );
    }

    // Check receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: input.receiverId },
    });
    if (!receiver) {
      throw new NotFoundError('User not found');
    }

    // Check for existing connection in either direction
    const existing = await this.prisma.connection.findFirst({
      where: {
        OR: [
          {
            senderId,
            receiverId: input.receiverId,
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
          {
            senderId: input.receiverId,
            receiverId: senderId,
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
        ],
      },
    });

    if (existing) {
      throw new ConflictError(
        existing.status === 'ACCEPTED'
          ? 'Already connected'
          : 'Connection request already pending'
      );
    }

    // Check cooldown from previous rejection
    const recentRejection =
      await this.prisma.connection.findFirst({
        where: {
          senderId,
          receiverId: input.receiverId,
          status: 'REJECTED',
          cooldownUntil: { gt: new Date() },
        },
      });

    if (recentRejection) {
      throw new ForbiddenError(
        'Connection request in cooldown period'
      );
    }

    // Check pending outgoing limit
    const pendingCount = await this.prisma.connection.count({
      where: { senderId, status: 'PENDING' },
    });

    if (pendingCount >= MAX_PENDING_OUTGOING) {
      throw new BadRequestError(
        'Maximum pending connection requests reached'
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);

    const connection = await this.prisma.connection.create({
      data: {
        senderId,
        receiverId: input.receiverId,
        message: input.message,
        expiresAt,
      },
    });

    return {
      connectionId: connection.id,
      status: connection.status,
      createdAt: connection.createdAt,
      expiresAt: connection.expiresAt,
    };
  }

  async acceptRequest(
    connectionId: string,
    userId: string
  ) {
    const connection =
      await this.prisma.connection.findUnique({
        where: { id: connectionId },
      });

    if (!connection) {
      throw new NotFoundError('Connection request not found');
    }

    if (connection.receiverId !== userId) {
      throw new ForbiddenError(
        'Only the recipient can accept this request'
      );
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestError(
        'Connection request is no longer pending'
      );
    }

    const updated = await this.prisma.connection.update({
      where: { id: connectionId },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
    });

    return {
      connectionId: updated.id,
      status: updated.status,
      respondedAt: updated.respondedAt,
    };
  }

  async rejectRequest(
    connectionId: string,
    userId: string
  ) {
    const connection =
      await this.prisma.connection.findUnique({
        where: { id: connectionId },
      });

    if (!connection) {
      throw new NotFoundError('Connection request not found');
    }

    if (connection.receiverId !== userId) {
      throw new ForbiddenError(
        'Only the recipient can reject this request'
      );
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestError(
        'Connection request is no longer pending'
      );
    }

    const cooldownUntil = new Date();
    cooldownUntil.setDate(
      cooldownUntil.getDate() + COOLDOWN_DAYS
    );

    const updated = await this.prisma.connection.update({
      where: { id: connectionId },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
        cooldownUntil,
      },
    });

    return {
      connectionId: updated.id,
      status: updated.status,
      cooldownUntil: updated.cooldownUntil,
    };
  }

  async listConnections(
    userId: string,
    query: { page?: string; limit?: string }
  ) {
    const params = parsePagination(query);
    const skip = (params.page - 1) * params.limit;

    const where = {
      OR: [
        { senderId: userId, status: 'ACCEPTED' as const },
        { receiverId: userId, status: 'ACCEPTED' as const },
      ],
    };

    const [connections, total] = await Promise.all([
      this.prisma.connection.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { respondedAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              profile: {
                select: {
                  avatarUrl: true,
                  headlineEn: true,
                },
              },
            },
          },
          receiver: {
            select: {
              id: true,
              displayName: true,
              profile: {
                select: {
                  avatarUrl: true,
                  headlineEn: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.connection.count({ where }),
    ]);

    const data = connections.map((c) => {
      const otherUser =
        c.senderId === userId ? c.receiver : c.sender;
      return {
        connectionId: c.id,
        user: {
          id: otherUser.id,
          displayName: otherUser.displayName,
          avatarUrl: otherUser.profile?.avatarUrl ?? null,
          headlineEn:
            otherUser.profile?.headlineEn ?? null,
        },
        connectedSince: c.respondedAt ?? c.createdAt,
      };
    });

    return { data, meta: offsetMeta(total, params) };
  }

  async listPending(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.connection.findMany({
        where: { receiverId: userId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              profile: {
                select: {
                  avatarUrl: true,
                  headlineEn: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.connection.findMany({
        where: { senderId: userId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
          receiver: {
            select: {
              id: true,
              displayName: true,
              profile: {
                select: {
                  avatarUrl: true,
                  headlineEn: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      incoming: incoming.map((c) => ({
        connectionId: c.id,
        user: {
          id: c.sender.id,
          displayName: c.sender.displayName,
          avatarUrl: c.sender.profile?.avatarUrl ?? null,
          headlineEn:
            c.sender.profile?.headlineEn ?? null,
        },
        message: c.message,
        createdAt: c.createdAt,
      })),
      outgoing: outgoing.map((c) => ({
        connectionId: c.id,
        user: {
          id: c.receiver.id,
          displayName: c.receiver.displayName,
          avatarUrl:
            c.receiver.profile?.avatarUrl ?? null,
          headlineEn:
            c.receiver.profile?.headlineEn ?? null,
        },
        message: c.message,
        createdAt: c.createdAt,
      })),
    };
  }
}
