import { PrismaClient, Message } from '@prisma/client';

// ---------- Types ----------

interface SummarizeResult {
  summarized: boolean;
}

interface ConversationContext {
  summary: string | null;
  facts: string | null;
  recentMessages: Array<{
    role: string;
    content: string;
    createdAt: Date;
  }>;
}

// Decision keywords used for fact extraction
const DECISION_KEYWORDS = [
  'decided',
  'chose',
  'will use',
  'agreed',
  'selected',
  'going with',
  'plan to',
  'committed to',
  'switched to',
  'adopted',
  'migrating to',
  'approved',
  'rejected',
  'ruling out',
];

// ---------- Service ----------

export class MemoryService {
  private static readonly SUMMARIZE_THRESHOLD = 10;
  private static readonly RECENT_MESSAGES_KEEP = 10;

  constructor(private prisma: PrismaClient) {}

  /**
   * Check if a conversation needs summarization and perform it
   * if the message count exceeds the threshold.
   */
  async checkAndSummarize(
    conversationId: string
  ): Promise<SummarizeResult> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    if (messages.length <= MemoryService.SUMMARIZE_THRESHOLD) {
      return { summarized: false };
    }

    // Messages to summarize: everything before the last 10
    const cutoff =
      messages.length - MemoryService.RECENT_MESSAGES_KEEP;
    const olderMessages = messages.slice(0, cutoff);

    // Generate summary from older messages
    const summary = this.summarizeMessages(olderMessages);

    // Extract key facts/decisions
    const facts = this.extractFacts(messages);

    // Store summary and facts in the conversation record
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        summary,
        longTermMemory: facts || null,
      },
    });

    return { summarized: true };
  }

  /**
   * Generate a text summary from a list of messages.
   * Simple heuristic: extract the first sentence of each message
   * and concatenate them.
   */
  summarizeMessages(messages: Message[]): string {
    const points: string[] = [];

    for (const msg of messages) {
      const firstSentence = this.extractFirstSentence(msg.content);
      const prefix = msg.role === 'USER' ? 'User asked' : 'Advisor';
      points.push(`${prefix}: ${firstSentence}`);
    }

    return points.join(' | ');
  }

  /**
   * Extract key facts and decisions from messages.
   * Looks for sentences containing decision keywords.
   */
  extractFacts(messages: Message[]): string {
    const facts: string[] = [];

    for (const msg of messages) {
      const sentences = msg.content.split(/[.!?]+/).filter(
        (s) => s.trim().length > 0
      );

      for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        const hasKeyword = DECISION_KEYWORDS.some((kw) =>
          lower.includes(kw)
        );
        if (hasKeyword) {
          facts.push(sentence.trim());
        }
      }
    }

    if (facts.length === 0) {
      return '';
    }

    return `Key decisions: ${facts.join('; ')}`;
  }

  /**
   * Get the conversation context for LLM injection.
   * Returns the summary, extracted facts, and the most recent
   * messages.
   */
  async getConversationContext(
    conversationId: string
  ): Promise<ConversationContext> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    const recentMessages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: MemoryService.RECENT_MESSAGES_KEEP,
      select: {
        role: true,
        content: true,
        createdAt: true,
      },
    });

    // Reverse so oldest-first for LLM context
    recentMessages.reverse();

    return {
      summary: conversation?.summary || null,
      facts: conversation?.longTermMemory || null,
      recentMessages,
    };
  }

  // ---------- Private helpers ----------

  private extractFirstSentence(text: string): string {
    const trimmed = text.trim();
    const end = trimmed.search(/[.?!\n]/);
    if (end > 0 && end <= 150) {
      return trimmed.substring(0, end + 1);
    }
    if (trimmed.length > 150) {
      return trimmed.substring(0, 147) + '...';
    }
    return trimmed;
  }
}
