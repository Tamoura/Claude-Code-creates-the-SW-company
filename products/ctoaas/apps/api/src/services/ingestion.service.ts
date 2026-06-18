/**
 * Ingestion Service — Orchestrates document ingestion pipeline
 *
 * Connects: KnowledgeDocument (create) → RAGService (chunk) → EmbeddingService (store)
 *
 * Implements FR-005 (Knowledge Base / RAG Pipeline)
 * Traces to: US-03, US-04, IMPL-040
 */

import { PrismaClient } from '@prisma/client';
import { RAGService } from './rag.service';

// --------------- types ---------------

export interface IngestInput {
  title: string;
  category: string;
  content: string;
  source: string;
  author?: string;
  url?: string;
}

export interface IngestResult {
  documentId: string;
  title: string;
  chunkCount: number;
  status: 'indexed' | 'failed';
  error?: string;
}

// --------------- service ---------------

export class IngestionService {
  private prisma: PrismaClient;
  private ragService: RAGService;

  constructor(prisma: PrismaClient, ragService?: RAGService) {
    this.prisma = prisma;
    this.ragService = ragService ?? new RAGService();
  }

  /**
   * Ingest a single document: create record → chunk text → embed → store vectors.
   */
  async ingestDocument(input: IngestInput): Promise<IngestResult> {
    // 1. Create the document record
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        title: input.title,
        category: input.category,
        content: input.content,
        source: input.source,
        author: input.author ?? null,
        url: input.url ?? null,
        status: 'ACTIVE',
      },
    });

    // 2. Chunk the text
    const chunks = this.ragService.chunkDocument(input.content);

    // 3. Generate embeddings
    const embeddings = await this.ragService.generateEmbeddings(chunks);

    // 4. Store chunks with embeddings via raw SQL (pgvector)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      const vectorStr = `[${embedding.join(',')}]`;

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO knowledge_chunks (id, document_id, content, embedding, token_count, chunk_index)
         VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, $5)`,
        doc.id,
        chunk.content,
        vectorStr,
        chunk.tokenCount,
        chunk.chunkIndex
      );
    }

    return {
      documentId: doc.id,
      title: input.title,
      chunkCount: chunks.length,
      status: 'indexed',
    };
  }

  /**
   * Ingest multiple documents. Continues on failure — failed docs get status 'failed'.
   */
  async ingestBatch(documents: IngestInput[]): Promise<IngestResult[]> {
    const results: IngestResult[] = [];

    for (const doc of documents) {
      try {
        const result = await this.ingestDocument(doc);
        results.push(result);
      } catch (err) {
        results.push({
          documentId: '',
          title: doc.title,
          chunkCount: 0,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }
}
