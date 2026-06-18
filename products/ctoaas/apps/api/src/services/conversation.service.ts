import { PrismaClient, Conversation, Message } from '@prisma/client';
import { AppError } from '../lib/errors';

// ---------- Types ----------

interface ConversationListItem {
  id: string;
  title: string | null;
  messageCount: number;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ConversationWithMessages {
  id: string;
  title: string | null;
  summary: string | null;
  longTermMemory: string | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    citations: unknown;
    confidence: string | null;
    feedback: string | null;
    createdAt: Date;
  }>;
}

interface PaginatedConversations {
  conversations: ConversationListItem[];
  total: number;
  page: number;
  limit: number;
}

// ---------- Service ----------

export class ConversationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new conversation for a user.
   */
  async create(
    userId: string,
    title?: string
  ): Promise<Conversation> {
    return this.prisma.conversation.create({
      data: {
        userId,
        title: title || null,
        messageCount: 0,
      },
    });
  }

  /**
   * List conversations for a user, paginated and ordered by
   * updatedAt DESC.
   */
  async list(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedConversations> {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          messageCount: true,
          summary: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.conversation.count({ where: { userId } }),
    ]);

    return { conversations, total, page, limit };
  }

  /**
   * Get a single conversation with all its messages, scoped to the
   * requesting user.
   */
  async getWithMessages(
    id: string,
    userId: string
  ): Promise<ConversationWithMessages> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            citations: true,
            confidence: true,
            feedback: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    return conversation;
  }

  /**
   * Add a message to a conversation and increment the message count.
   */
  async addMessage(
    conversationId: string,
    userId: string,
    role: 'USER' | 'ASSISTANT',
    content: string,
    citations?: unknown,
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  ): Promise<Message> {
    // Verify ownership
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          role,
          content,
          citations: citations ?? undefined,
          confidence: confidence ?? undefined,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { messageCount: { increment: 1 } },
      }),
    ]);

    return message;
  }

  /**
   * Generate a title from the first user message in the conversation.
   * Simple heuristic: truncate the first user message to extract
   * a concise topic.
   */
  async generateTitle(
    conversationId: string,
    userId: string
  ): Promise<string> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    const firstMessages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });

    if (firstMessages.length === 0) {
      return 'New Conversation';
    }

    // Use the first user message to derive a title
    const firstUserMsg = firstMessages.find((m) => m.role === 'USER');
    const sourceText = firstUserMsg
      ? firstUserMsg.content
      : firstMessages[0].content;

    // Extract a concise title: take the first sentence or first
    // 80 characters, whichever is shorter
    const title = this.extractTitle(sourceText);

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });

    return title;
  }

  /**
   * Update conversation title.
   */
  async updateTitle(
    id: string,
    userId: string,
    title: string
  ): Promise<Conversation> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId },
    });
    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    return this.prisma.conversation.update({
      where: { id },
      data: { title },
    });
  }

  /**
   * Delete a conversation and its messages (cascade).
   */
  async delete(id: string, userId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId },
    });
    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    await this.prisma.conversation.delete({ where: { id } });
  }

  // ---------- Private helpers ----------

  private extractTitle(text: string): string {
    // Remove leading question words for cleaner titles
    let cleaned = text.trim();

    // Take first sentence (up to period, question mark, or newline)
    const sentenceEnd = cleaned.search(/[.?!\n]/);
    if (sentenceEnd > 0 && sentenceEnd <= 100) {
      cleaned = cleaned.substring(0, sentenceEnd);
    }

    // Truncate to 80 chars max
    if (cleaned.length > 80) {
      cleaned = cleaned.substring(0, 77) + '...';
    }

    return cleaned;
  }
}
