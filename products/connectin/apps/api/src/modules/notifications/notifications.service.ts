import { PrismaClient, NotificationType } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../lib/errors';
import { encodeCursor, decodeCursor, CursorPaginationMeta } from '../../lib/pagination';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  referenceId?: string;
  referenceType?: string;
}

export class NotificationsService {
  constructor(private readonly prisma: PrismaClient) {}

  async createNotification(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
      },
    });
  }

  async listNotifications(
    userId: string,
    params: { cursor?: string; limit?: string; unreadOnly?: string }
  ) {
    const limit = Math.min(50, parseInt(params.limit || '20', 10) || 20);
    const unreadOnly = params.unreadOnly === 'true';
    const cursorData = params.cursor ? decodeCursor(params.cursor) : null;

    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
        ...(cursorData
          ? {
              OR: [
                { createdAt: { lt: cursorData.createdAt } },
                { createdAt: cursorData.createdAt, id: { lt: cursorData.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, limit) : notifications;

    const lastItem = items[items.length - 1];
    const meta: CursorPaginationMeta = {
      cursor: hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null,
      hasMore,
      count: items.length,
    };

    return { data: items.map((n) => this.formatNotification(n)), meta };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundError('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenError('Not your notification');

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
    return this.formatNotification(updated);
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  async getOrCreatePreferences(userId: string) {
    const existing = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    return this.prisma.notificationPreference.create({
      data: { userId },
    });
  }

  async updatePreferences(
    userId: string,
    data: Partial<{
      connectionRequests: boolean;
      messages: boolean;
      postLikes: boolean;
      postComments: boolean;
      jobRecommendations: boolean;
      emailDigest: 'OFF' | 'DAILY' | 'WEEKLY';
    }>
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  private formatNotification(n: any) {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message || null,
      referenceId: n.referenceId || null,
      referenceType: n.referenceType || null,
      isRead: n.isRead,
      readAt: n.readAt?.toISOString() || null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
