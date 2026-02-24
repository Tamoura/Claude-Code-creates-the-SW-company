import { PrismaClient, ArticleStatus } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../../lib/errors';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 300);
}

export class ArticleService {
  constructor(private readonly prisma: PrismaClient) {}

  async createArticle(
    userId: string,
    input: { title: string; content: string; coverImageUrl?: string }
  ) {
    const baseSlug = slugify(input.title);
    const uniqueSuffix = Date.now().toString(36);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    const article = await this.prisma.article.create({
      data: {
        authorId: userId,
        title: input.title,
        slug,
        content: input.content,
        coverImageUrl: input.coverImageUrl ?? null,
        status: ArticleStatus.DRAFT,
      },
    });

    return article;
  }

  async getArticle(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, displayName: true },
        },
      },
    });

    if (!article) {
      throw new NotFoundError('Article not found');
    }

    return article;
  }

  async listPublishedArticles(limit: number, offset: number) {
    return this.prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      include: {
        author: {
          select: { id: true, displayName: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async listUserArticles(userId: string, requesterId: string) {
    // If viewing own articles, show all; otherwise only published
    const where =
      userId === requesterId
        ? { authorId: userId }
        : { authorId: userId, status: ArticleStatus.PUBLISHED as ArticleStatus };

    return this.prisma.article.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateArticle(
    articleId: string,
    userId: string,
    input: { title?: string; content?: string; status?: string; coverImageUrl?: string }
  ) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError('Article not found');
    }

    if (article.authorId !== userId) {
      throw new ForbiddenError('Only the author can update this article');
    }

    const data: any = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.content !== undefined) data.content = input.content;
    if (input.coverImageUrl !== undefined) data.coverImageUrl = input.coverImageUrl;
    if (input.status !== undefined) {
      data.status = input.status as ArticleStatus;
      if (input.status === 'PUBLISHED' && !article.publishedAt) {
        data.publishedAt = new Date();
      }
    }

    return this.prisma.article.update({
      where: { id: articleId },
      data,
    });
  }

  async deleteArticle(articleId: string, userId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError('Article not found');
    }

    if (article.authorId !== userId) {
      throw new ForbiddenError('Only the author can delete this article');
    }

    await this.prisma.article.delete({ where: { id: articleId } });
    return { deleted: true };
  }
}
