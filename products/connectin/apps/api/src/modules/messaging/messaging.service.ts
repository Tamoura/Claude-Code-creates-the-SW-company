import { PrismaClient } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors';
import { encodeCursor, decodeCursor, CursorPaginationMeta } from '../../lib/pagination';

function stripHtml(str: string): string {
  return sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} });
}

export class MessagingService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Get or create a 1:1 conversation between two users */
  async getOrCreateConversation(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestError('Cannot message yourself');
    }

    // Verify other user exists
    const otherUser = await this.prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, displayName: true },
    });
    if (!otherUser) throw new NotFoundError('User not found');

    // Verify they are connected
    const connection = await this.prisma.connection.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId, status: 'ACCEPTED' },
          { senderId: otherUserId, receiverId: userId, status: 'ACCEPTED' },
        ],
      },
    });
    if (!connection) throw new ForbiddenError('You must be connected to message this user');

    // Find existing conversation
    const existing = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: otherUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                profile: { select: { avatarUrl: true, headlineEn: true } },
              },
            },
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      return this.formatConversation(existing, userId);
    }

    // Create new conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        members: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                profile: { select: { avatarUrl: true, headlineEn: true } },
              },
            },
          },
        },
        messages: true,
      },
    });

    return this.formatConversation(conversation, userId);
  }

  /** List all conversations for a user */
  async listConversations(userId: string, params: { cursor?: string; limit?: string }) {
    const limit = Math.min(50, parseInt(params.limit || '20', 10) || 20);
    const cursorData = params.cursor ? decodeCursor(params.cursor) : null;

    const conversations = await this.prisma.conversation.findMany({
      where: {
        members: { some: { userId } },
        lastMessageAt: { not: null },
        ...(cursorData
          ? {
              OR: [
                { lastMessageAt: { lt: cursorData.createdAt } },
                { lastMessageAt: cursorData.createdAt, id: { lt: cursorData.id } },
              ],
            }
          : {}),
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                profile: { select: { avatarUrl: true, headlineEn: true } },
              },
            },
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = conversations.length > limit;
    const items = hasMore ? conversations.slice(0, limit) : conversations;
    const formatted = items.map((c) => this.formatConversation(c, userId));

    const lastItem = items[items.length - 1];
    const meta: CursorPaginationMeta = {
      cursor:
        hasMore && lastItem && lastItem.lastMessageAt
          ? encodeCursor(lastItem.lastMessageAt as Date, lastItem.id)
          : null,
      hasMore,
      count: items.length,
    };

    return { data: formatted, meta };
  }

  /** Get messages in a conversation */
  async getMessages(
    conversationId: string,
    userId: string,
    params: { cursor?: string; limit?: string }
  ) {
    // Verify membership
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new ForbiddenError('Not a member of this conversation');

    const limit = Math.min(50, parseInt(params.limit || '30', 10) || 30);
    const cursorData = params.cursor ? decodeCursor(params.cursor) : null;

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false,
        ...(cursorData
          ? {
              OR: [
                { createdAt: { lt: cursorData.createdAt } },
                { createdAt: cursorData.createdAt, id: { lt: cursorData.id } },
              ],
            }
          : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        media: {
          select: {
            id: true,
            type: true,
            originalName: true,
            mimeType: true,
            size: true,
            url: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    // Update lastReadAt for this member
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    // Return in chronological order for the UI
    const sorted = [...items].reverse();

    const lastItem = items[items.length - 1];
    const meta: CursorPaginationMeta = {
      cursor: hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null,
      hasMore,
      count: items.length,
    };

    return { data: sorted.map((m) => this.formatMessage(m)), meta };
  }

  /** Send a message */
  async sendMessage(senderId: string, input: { conversationId: string; content: string; mediaId?: string }) {
    const sanitized = stripHtml(input.content).trim();
    if (!sanitized) throw new BadRequestError('Message cannot be empty');
    if (sanitized.length > 5000) throw new BadRequestError('Message too long (max 5000 chars)');

    // Verify membership
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: input.conversationId, userId: senderId } },
    });
    if (!member) throw new ForbiddenError('Not a member of this conversation');

    // Validate media attachment if provided
    if (input.mediaId) {
      const media = await this.prisma.media.findUnique({ where: { id: input.mediaId } });
      if (!media) throw new NotFoundError('Media not found');
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId: input.conversationId,
          senderId,
          content: sanitized,
          mediaId: input.mediaId || null,
        },
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              profile: { select: { avatarUrl: true } },
            },
          },
          media: input.mediaId ? {
            select: {
              id: true,
              type: true,
              originalName: true,
              mimeType: true,
              size: true,
              url: true,
              thumbnailUrl: true,
            },
          } : false,
        },
      });

      await tx.conversation.update({
        where: { id: input.conversationId },
        data: { lastMessageAt: msg.createdAt },
      });

      return msg;
    });

    return this.formatMessage(message);
  }

  /** Mark a message as read */
  async markMessageRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: { include: { members: true } },
        sender: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
    });
    if (!message) throw new NotFoundError('Message not found');

    const isMember = message.conversation.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenError('Not a member of this conversation');

    if (message.readAt) {
      return this.formatMessage(message);
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
    });

    return this.formatMessage(updated);
  }

  private formatConversation(conv: any, currentUserId: string) {
    const otherMember = conv.members.find((m: any) => m.userId !== currentUserId);
    const lastMsg = conv.messages?.[0];

    return {
      id: conv.id,
      contact: {
        userId: otherMember?.user.id,
        displayName: otherMember?.user.displayName || 'Unknown',
        avatarUrl: otherMember?.user.profile?.avatarUrl || null,
        headline: otherMember?.user.profile?.headlineEn || null,
      },
      lastMessage: lastMsg
        ? {
            content: lastMsg.content,
            createdAt: lastMsg.createdAt.toISOString(),
            isRead: lastMsg.readAt !== null,
            senderId: lastMsg.senderId,
          }
        : null,
      unreadCount: 0,
      lastMessageAt: conv.lastMessageAt?.toISOString() || null,
    };
  }

  private formatMessage(msg: any) {
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      sender: msg.sender
        ? {
            userId: msg.sender.id,
            displayName: msg.sender.displayName,
            avatarUrl: msg.sender.profile?.avatarUrl || null,
          }
        : undefined,
      content: msg.content,
      ...(msg.media ? {
        media: {
          id: msg.media.id,
          type: msg.media.type,
          originalName: msg.media.originalName,
          mimeType: msg.media.mimeType,
          size: msg.media.size,
          url: msg.media.url,
          thumbnailUrl: msg.media.thumbnailUrl || null,
        },
      } : {}),
      createdAt: msg.createdAt.toISOString(),
      readAt: msg.readAt?.toISOString() || null,
    };
  }
}
