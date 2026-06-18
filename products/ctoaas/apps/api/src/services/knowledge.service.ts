/**
 * Knowledge Service — Document CRUD and ingestion management
 *
 * Implements FR-005 (Knowledge Base / RAG Pipeline)
 * Traces to: US-03, US-04, IMPL-026
 */

import { PrismaClient } from '@prisma/client';
import { AppError } from '../lib/errors';

// --------------- types ---------------

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'text/markdown',
  'text/plain',
]);

export interface UploadInput {
  title: string;
  category: string;
  content: string;
  mimeType: string;
  author?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  documents: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// --------------- service ---------------

export class KnowledgeService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Upload a new document and set ingestion status to pending.
   */
  async uploadDocument(input: UploadInput) {
    if (!SUPPORTED_MIME_TYPES.has(input.mimeType)) {
      throw AppError.badRequest(
        `Unsupported file type: ${input.mimeType}`
      );
    }

    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        title: input.title,
        source: 'upload',
        category: input.category,
        content: input.content,
        author: input.author ?? null,
        status: 'ACTIVE',
      },
    });

    return {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      author: doc.author,
      ingestionStatus: 'pending' as const,
      createdAt: doc.ingestedAt,
    };
  }

  /**
   * List documents with pagination.
   */
  async listDocuments(
    pagination: PaginationParams
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        skip,
        take: limit,
        orderBy: { ingestedAt: 'desc' },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          author: true,
          ingestedAt: true,
        },
      }),
      this.prisma.knowledgeDocument.count(),
    ]);

    return {
      documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single document with its chunk count.
   */
  async getDocument(id: string) {
    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    if (!doc) {
      throw AppError.notFound('Document not found');
    }

    return {
      id: doc.id,
      title: doc.title,
      category: doc.category,
      status: doc.status,
      author: doc.author,
      content: doc.content,
      chunkCount: doc._count.chunks,
      createdAt: doc.ingestedAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * Get ingestion status for a document.
   */
  async getDocumentStatus(id: string) {
    const doc = await this.prisma.knowledgeDocument.findUnique({
      where: { id },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    if (!doc) {
      throw AppError.notFound('Document not found');
    }

    // Determine ingestion status based on chunk presence
    const chunkCount = doc._count.chunks;
    let ingestionStatus: 'pending' | 'processing' | 'indexed' | 'failed';

    if (chunkCount > 0) {
      ingestionStatus = 'indexed';
    } else {
      ingestionStatus = 'pending';
    }

    return {
      documentId: doc.id,
      ingestionStatus,
      chunkCount,
    };
  }
}
