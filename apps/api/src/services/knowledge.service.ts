import { PrismaClient, KnowledgeArticle, KBStatus, AuditAction } from '@prisma/client';
import { generateDisplayId } from './id-generator.service.js';
import { logAudit } from './audit.service.js';
import type {
  CreateKnowledgeArticleInput,
  UpdateKnowledgeArticleInput,
  PublishArticleInput,
  RateArticleInput,
} from '../schemas/knowledge.schema.js';

export async function createKnowledgeArticle(
  prisma: PrismaClient,
  data: CreateKnowledgeArticleInput
): Promise<KnowledgeArticle> {
  const displayId = await generateDisplayId(prisma, 'KB');

  const article = await prisma.knowledgeArticle.create({
    data: {
      displayId,
      title: data.title,
      content: data.content,
      summary: data.summary,
      categoryId: data.categoryId,
      authorId: data.authorId,
      keywords: data.keywords,
      status: KBStatus.DRAFT,
      version: 1,
    },
    include: {
      category: true,
      author: true,
    },
  });

  // Create initial version
  await prisma.articleVersion.create({
    data: {
      articleId: article.id,
      versionNumber: 1,
      title: article.title,
      content: article.content,
      createdById: data.authorId,
    },
  });

  await logAudit(prisma, {
    entityType: 'KNOWLEDGE_ARTICLE',
    entityId: article.id,
    action: AuditAction.CREATE,
    userId: data.authorId,
    newValues: {
      displayId: article.displayId,
      title: article.title,
      status: article.status,
    },
  });

  return article;
}

export async function getKnowledgeArticle(
  prisma: PrismaClient,
  id: string
): Promise<KnowledgeArticle | null> {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id, deletedAt: null },
    include: {
      category: true,
      author: true,
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 5,
      },
      ratings: {
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          ratings: true,
        },
      },
    },
  });

  // Increment view count
  if (article) {
    await prisma.knowledgeArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  return article;
}

export async function listKnowledgeArticles(
  prisma: PrismaClient,
  filters: {
    page: number;
    limit: number;
    status?: KBStatus;
    categoryId?: string;
    authorId?: string;
    keyword?: string;
    search?: string;
  }
) {
  const where: any = {
    deletedAt: null,
  };

  if (filters.status) where.status = filters.status;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.authorId) where.authorId = filters.authorId;
  if (filters.keyword) where.keywords = { has: filters.keyword };

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { content: { contains: filters.search, mode: 'insensitive' } },
      { summary: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.knowledgeArticle.findMany({
      where,
      include: {
        category: true,
        author: true,
        _count: {
          select: {
            ratings: true,
            versions: true,
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    prisma.knowledgeArticle.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function updateKnowledgeArticle(
  prisma: PrismaClient,
  id: string,
  data: UpdateKnowledgeArticleInput,
  userId: string
): Promise<KnowledgeArticle> {
  const existing = await prisma.knowledgeArticle.findUnique({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new Error('Knowledge article not found');
  }

  // If content or title changed, create new version
  const contentChanged = data.title !== existing.title || data.content !== existing.content;
  let newVersion = existing.version;

  if (contentChanged) {
    newVersion = existing.version + 1;

    await prisma.articleVersion.create({
      data: {
        articleId: id,
        versionNumber: newVersion,
        title: data.title || existing.title,
        content: data.content || existing.content,
        changeNotes: data.changeNotes,
        createdById: userId,
      },
    });
  }

  const updated = await prisma.knowledgeArticle.update({
    where: { id },
    data: {
      title: data.title,
      content: data.content,
      summary: data.summary,
      status: data.status,
      categoryId: data.categoryId,
      keywords: data.keywords,
      version: contentChanged ? newVersion : undefined,
    },
    include: {
      category: true,
      author: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'KNOWLEDGE_ARTICLE',
    entityId: id,
    action: AuditAction.UPDATE,
    userId,
    oldValues: { status: existing.status, version: existing.version },
    newValues: { status: updated.status, version: updated.version },
  });

  return updated;
}

export async function deleteKnowledgeArticle(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<void> {
  const existing = await prisma.knowledgeArticle.findUnique({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    throw new Error('Knowledge article not found');
  }

  await prisma.knowledgeArticle.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logAudit(prisma, {
    entityType: 'KNOWLEDGE_ARTICLE',
    entityId: id,
    action: AuditAction.DELETE,
    userId,
    oldValues: { displayId: existing.displayId },
  });
}

export async function publishKnowledgeArticle(
  prisma: PrismaClient,
  id: string,
  data: PublishArticleInput
): Promise<KnowledgeArticle> {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id, deletedAt: null },
  });

  if (!article) {
    throw new Error('Knowledge article not found');
  }

  if (article.status === KBStatus.PUBLISHED) {
    throw new Error('Article is already published');
  }

  const updated = await prisma.knowledgeArticle.update({
    where: { id },
    data: {
      status: KBStatus.PUBLISHED,
      publishedAt: new Date(),
    },
    include: {
      category: true,
      author: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'KNOWLEDGE_ARTICLE',
    entityId: id,
    action: AuditAction.UPDATE,
    userId: data.publisherId,
    oldValues: { status: article.status },
    newValues: { status: KBStatus.PUBLISHED },
  });

  return updated;
}

export async function archiveKnowledgeArticle(
  prisma: PrismaClient,
  id: string,
  userId: string
): Promise<KnowledgeArticle> {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id, deletedAt: null },
  });

  if (!article) {
    throw new Error('Knowledge article not found');
  }

  const updated = await prisma.knowledgeArticle.update({
    where: { id },
    data: { status: KBStatus.ARCHIVED },
    include: {
      category: true,
      author: true,
    },
  });

  await logAudit(prisma, {
    entityType: 'KNOWLEDGE_ARTICLE',
    entityId: id,
    action: AuditAction.UPDATE,
    userId,
    oldValues: { status: article.status },
    newValues: { status: KBStatus.ARCHIVED },
  });

  return updated;
}

export async function rateKnowledgeArticle(
  prisma: PrismaClient,
  id: string,
  data: RateArticleInput
): Promise<void> {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id, deletedAt: null },
  });

  if (!article) {
    throw new Error('Knowledge article not found');
  }

  // Upsert rating (user can change their rating)
  await prisma.articleRating.upsert({
    where: {
      articleId_userId: {
        articleId: id,
        userId: data.userId,
      },
    },
    update: {
      rating: data.rating,
      comment: data.comment,
    },
    create: {
      articleId: id,
      userId: data.userId,
      rating: data.rating,
      comment: data.comment,
    },
  });
}
