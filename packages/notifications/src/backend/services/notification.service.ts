/**
 * In-App Notification Service
 *
 * Manages in-app notifications with CRUD, read tracking,
 * and unread counts. Generic across all products.
 */

import { logger } from '@connectsw/shared';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface NotificationListOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

/** Minimal Prisma client interface for notifications */
interface PrismaNotificationClient {
  notification: {
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown> & { id: string }>;
    findMany(args: Record<string, unknown>): Promise<Record<string, unknown>[]>;
    findUnique(args: { where: { id: string } }): Promise<{ id: string; userId: string; read: boolean } | null>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
    delete(args: { where: { id: string } }): Promise<Record<string, unknown>>;
  };
}

export class NotificationService {
  constructor(private prisma: PrismaNotificationClient) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data ?? undefined,
      },
    });

    logger.info('Notification created', { userId: input.userId, type: input.type, notificationId: notification.id });
    return notification;
  }

  async list(userId: string, opts: NotificationListOptions = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = opts;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (unreadOnly) where.read = false;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) return null;

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return result.count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, read: false },
    });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) return false;
    await this.prisma.notification.delete({ where: { id } });
    return true;
  }
}
