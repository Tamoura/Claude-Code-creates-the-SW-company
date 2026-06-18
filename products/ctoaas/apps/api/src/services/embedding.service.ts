/**
 * Embedding Service — Vector storage and similarity search
 *
 * Implements FR-005 (Knowledge Base / RAG Pipeline), NFR-004 (Vector Search)
 * Traces to: US-03, US-04, IMPL-024
 *
 * Uses raw SQL for pgvector operations since Prisma does not
 * natively support the Unsupported("vector(1536)") column type.
 */

import { PrismaClient } from '@prisma/client';

// --------------- types ---------------

export interface ChunkData {
  content: string;
  tokenCount: number;
  chunkIndex: number;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  documentId: string;
  chunkIndex: number;
  tokenCount: number | null;
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
}

// --------------- service ---------------

export class EmbeddingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Store chunks with their embedding vectors in knowledge_chunks.
   * Uses raw SQL because Prisma cannot write to Unsupported columns.
   */
  async storeEmbeddings(
    documentId: string,
    chunks: ChunkData[],
    embeddings: number[][]
  ): Promise<void> {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      const vectorStr = `[${embedding.join(',')}]`;

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO knowledge_chunks (id, document_id, content, embedding, token_count, chunk_index)
         VALUES (gen_random_uuid(), $1, $2, $3::vector, $4, $5)`,
        documentId,
        chunk.content,
        vectorStr,
        chunk.tokenCount,
        chunk.chunkIndex
      );
    }
  }

  /**
   * Search for chunks similar to the query embedding using cosine
   * similarity.  Returns top-N results above the threshold.
   */
  async searchSimilar(
    queryEmbedding: number[],
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const limit = options?.limit ?? 5;
    const threshold = options?.threshold ?? 0.7;
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        content: string;
        score: number;
        document_id: string;
        chunk_index: number;
        token_count: number | null;
      }>
    >(
      `SELECT
         id,
         content,
         1 - (embedding <=> $1::vector) AS score,
         document_id,
         chunk_index,
         token_count
       FROM knowledge_chunks
       WHERE embedding IS NOT NULL
         AND 1 - (embedding <=> $1::vector) >= $2
       ORDER BY embedding <=> $1::vector ASC
       LIMIT $3`,
      vectorStr,
      threshold,
      limit
    );

    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      score: Number(row.score),
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      tokenCount: row.token_count,
    }));
  }
}
