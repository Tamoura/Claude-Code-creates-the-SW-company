import { PrismaClient } from '@prisma/client';

// ---------- Types ----------

interface SearchResult {
  conversationId: string;
  conversationTitle: string | null;
  matchingContent: string;
  messageRole: string;
  messageCreatedAt: Date;
}

// ---------- Service ----------

export class SearchService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Search conversations for a user using ILIKE text matching.
   * The pg_trgm index on messages.content makes this performant.
   *
   * Returns matching conversations with message excerpts.
   */
  async searchConversations(
    userId: string,
    query: string
  ): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const sanitizedQuery = query.trim();

    // Find messages matching the query that belong to this user's
    // conversations
    const matches = await this.prisma.message.findMany({
      where: {
        content: {
          contains: sanitizedQuery,
          mode: 'insensitive',
        },
        conversation: {
          userId,
        },
      },
      select: {
        content: true,
        role: true,
        createdAt: true,
        conversation: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit results for performance
    });

    if (matches.length === 0) {
      return [];
    }

    // Deduplicate by conversation — keep the first (most recent)
    // match per conversation
    const seen = new Set<string>();
    const results: SearchResult[] = [];

    for (const match of matches) {
      const convId = match.conversation.id;
      if (seen.has(convId)) continue;
      seen.add(convId);

      results.push({
        conversationId: convId,
        conversationTitle: match.conversation.title,
        matchingContent: this.extractExcerpt(
          match.content,
          sanitizedQuery
        ),
        messageRole: match.role,
        messageCreatedAt: match.createdAt,
      });
    }

    return results;
  }

  // ---------- Private helpers ----------

  /**
   * Extract a relevant excerpt around the matching query term.
   */
  private extractExcerpt(
    content: string,
    query: string
  ): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerContent.indexOf(lowerQuery);

    if (idx === -1) {
      // Fallback: return first 200 chars
      return content.length > 200
        ? content.substring(0, 197) + '...'
        : content;
    }

    const start = Math.max(0, idx - 50);
    const end = Math.min(content.length, idx + query.length + 50);
    let excerpt = content.substring(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < content.length) excerpt = excerpt + '...';

    return excerpt;
  }
}
