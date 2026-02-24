import { PrismaClient } from '@prisma/client';

const MENTION_REGEX = /@([a-zA-Z0-9_\u0600-\u06FF]+)/g;

export interface ExtractedMention {
  text: string;
  offsetStart: number;
  offsetEnd: number;
}

export class MentionService {
  constructor(private readonly prisma: PrismaClient) {}

  extractMentions(content: string): ExtractedMention[] {
    const mentions: ExtractedMention[] = [];
    let match;
    const regex = new RegExp(MENTION_REGEX.source, 'g');
    while ((match = regex.exec(content)) !== null) {
      mentions.push({
        text: match[1],
        offsetStart: match.index,
        offsetEnd: match.index + match[0].length,
      });
    }
    return mentions;
  }

  async resolveAndCreateMentions(
    content: string,
    authorId: string,
    postId?: string,
    commentId?: string
  ) {
    const extracted = this.extractMentions(content);
    if (extracted.length === 0) return [];

    const resolved: Array<{
      userId: string;
      displayName: string;
      offsetStart: number;
      offsetEnd: number;
    }> = [];

    for (const mention of extracted) {
      const user = await this.prisma.user.findFirst({
        where: {
          displayName: {
            equals: mention.text,
            mode: 'insensitive',
          },
        },
        select: { id: true, displayName: true },
      });

      if (!user) continue;

      await this.prisma.mention.create({
        data: {
          postId: postId ?? null,
          commentId: commentId ?? null,
          mentionedUserId: user.id,
          offsetStart: mention.offsetStart,
          offsetEnd: mention.offsetEnd,
        },
      });

      resolved.push({
        userId: user.id,
        displayName: user.displayName,
        offsetStart: mention.offsetStart,
        offsetEnd: mention.offsetEnd,
      });

      // Create notification (skip self-mention)
      if (user.id !== authorId) {
        const author = await this.prisma.user.findUnique(
          {
            where: { id: authorId },
            select: { displayName: true },
          }
        );

        await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: 'MENTION',
            title: `${author?.displayName ?? 'Someone'} mentioned you`,
            message: postId
              ? 'You were mentioned in a post'
              : 'You were mentioned in a comment',
            referenceId: postId ?? commentId ?? null,
            referenceType: postId ? 'post' : 'comment',
          },
        });
      }
    }

    return resolved;
  }
}
