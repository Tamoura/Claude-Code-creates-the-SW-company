/**
 * Embedding Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-005 (Knowledge Base / RAG Pipeline)
 *   NFR-004 (Vector Search Performance)
 *
 * These tests define expected behavior for EmbeddingService:
 *   - Store chunk + embedding in knowledge_chunks table
 *   - Search similar chunks by cosine similarity
 *   - Top-5 default, 0.7 threshold, relevance scores
 *
 * They WILL FAIL because EmbeddingService does not exist yet.
 *
 * [IMPL-020]
 */

import { PrismaClient } from '@prisma/client';

// EmbeddingService will be created during Green phase
let EmbeddingService: typeof import('../../src/services/embedding.service').EmbeddingService;

beforeAll(async () => {
  try {
    const mod = await import('../../src/services/embedding.service');
    EmbeddingService = mod.EmbeddingService;
  } catch {
    // Expected to fail in Red phase - service does not exist yet
  }
});

// ---------- helpers ----------

/**
 * Generate a deterministic fake 1536-dim embedding vector.
 * Uses a seed to produce distinct but reproducible vectors.
 */
function fakeEmbedding(seed: number): number[] {
  const vec: number[] = [];
  for (let i = 0; i < 1536; i++) {
    // Simple deterministic float based on seed and index
    vec.push(Math.sin(seed * 1000 + i) * 0.5);
  }
  return vec;
}

/**
 * Generate an embedding vector close to the given vector
 * (high cosine similarity) by adding small perturbations.
 */
function similarEmbedding(base: number[], noise: number = 0.01): number[] {
  return base.map((val) => val + (Math.random() - 0.5) * noise);
}

/**
 * Generate a random embedding vector (low similarity to any seeded vector).
 */
function randomEmbedding(): number[] {
  const vec: number[] = [];
  for (let i = 0; i < 1536; i++) {
    vec.push((Math.random() - 0.5) * 2);
  }
  return vec;
}

// ---------- suite ----------

describe('EmbeddingService', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up test data in FK-safe order
    await prisma.knowledgeChunk.deleteMany();
    await prisma.knowledgeDocument.deleteMany();
  });

  describe('storeEmbeddings', () => {
    test('[FR-005][AC-7] stores chunk + embedding in knowledge_chunks table', async () => {
      expect(EmbeddingService).toBeDefined();
      const service = new EmbeddingService(prisma);

      // First, create a parent document
      const doc = await prisma.knowledgeDocument.create({
        data: {
          title: 'Architecture Guide',
          source: 'upload',
          category: 'architecture',
          status: 'ACTIVE',
        },
      });

      const chunks = [
        {
          content: 'PostgreSQL is a relational database.',
          tokenCount: 7,
          chunkIndex: 0,
        },
        {
          content: 'Redis provides in-memory caching.',
          tokenCount: 6,
          chunkIndex: 1,
        },
      ];

      const embeddings = [fakeEmbedding(1), fakeEmbedding(2)];

      await service.storeEmbeddings(doc.id, chunks, embeddings);

      // Verify chunks are stored in the database
      const stored = await prisma.knowledgeChunk.findMany({
        where: { documentId: doc.id },
        orderBy: { chunkIndex: 'asc' },
      });

      expect(stored.length).toBe(2);
      expect(stored[0].content).toBe(chunks[0].content);
      expect(stored[1].content).toBe(chunks[1].content);
    });

    test('[FR-005] stores metadata (document_id, chunk_index, token_count)', async () => {
      expect(EmbeddingService).toBeDefined();
      const service = new EmbeddingService(prisma);

      const doc = await prisma.knowledgeDocument.create({
        data: {
          title: 'Tech Debt Report',
          source: 'upload',
          category: 'tech-debt',
          status: 'ACTIVE',
        },
      });

      const chunks = [
        {
          content: 'The authentication module is outdated.',
          tokenCount: 7,
          chunkIndex: 0,
        },
      ];

      const embeddings = [fakeEmbedding(10)];

      await service.storeEmbeddings(doc.id, chunks, embeddings);

      const stored = await prisma.knowledgeChunk.findFirst({
        where: { documentId: doc.id },
      });

      expect(stored).not.toBeNull();
      expect(stored!.documentId).toBe(doc.id);
      expect(stored!.chunkIndex).toBe(0);
      expect(stored!.tokenCount).toBe(7);
    });
  });

  describe('searchSimilar', () => {
    test('[NFR-004][AC-1] finds similar chunks by cosine similarity', async () => {
      expect(EmbeddingService).toBeDefined();
      const service = new EmbeddingService(prisma);

      // Seed a document with known embeddings
      const doc = await prisma.knowledgeDocument.create({
        data: {
          title: 'Database Guide',
          source: 'upload',
          category: 'databases',
          status: 'ACTIVE',
        },
      });

      const baseEmbedding = fakeEmbedding(42);
      const chunks = [
        { content: 'PostgreSQL handles OLTP well.', tokenCount: 6, chunkIndex: 0 },
        { content: 'MongoDB is a document database.', tokenCount: 6, chunkIndex: 1 },
        { content: 'Redis is used for caching.', tokenCount: 6, chunkIndex: 2 },
      ];

      const embeddings = [
        similarEmbedding(baseEmbedding, 0.001), // Very similar to query
        fakeEmbedding(99),                       // Different
        fakeEmbedding(200),                      // Different
      ];

      await service.storeEmbeddings(doc.id, chunks, embeddings);

      // Search with a vector similar to the first chunk
      const results = await service.searchSimilar(baseEmbedding);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // The most similar chunk should be first
      expect(results[0].content).toContain('PostgreSQL');
    });

    test('[NFR-004][AC-2] returns top-5 results by default', async () => {
      expect(EmbeddingService).toBeDefined();
      const service = new EmbeddingService(prisma);

      const doc = await prisma.knowledgeDocument.create({
        data: {
          title: 'Large Knowledge Base',
          source: 'upload',
          category: 'general',
          status: 'ACTIVE',
        },
      });

      // Create 10 chunks with embeddings
      const chunks = Array.from({ length: 10 }, (_, i) => ({
        content: `Knowledge chunk number ${i + 1} about software engineering.`,
        tokenCount: 8,
        chunkIndex: i,
      }));
      const embeddings = chunks.map((_, i) => fakeEmbedding(i + 300));

      await service.storeEmbeddings(doc.id, chunks, embeddings);

      const queryEmbedding = fakeEmbedding(300); // Similar to first chunk
      const results = await service.searchSimilar(queryEmbedding);

      // Default limit should be 5
      expect(results.length).toBeLessThanOrEqual(5);
    });

    test('[NFR-004][AC-3] filters by similarity threshold (0.7)', async () => {
      expect(EmbeddingService).toBeDefined();
      const service = new EmbeddingService(prisma);

      const doc = await prisma.knowledgeDocument.create({
        data: {
          title: 'Threshold Test',
          source: 'upload',
          category: 'testing',
          status: 'ACTIVE',
        },
      });

      const baseEmbedding = fakeEmbedding(500);
      const chunks = [
        { content: 'Highly relevant chunk.', tokenCount: 4, chunkIndex: 0 },
        { content: 'Completely unrelated noise.', tokenCount: 4, chunkIndex: 1 },
      ];

      const embeddings = [
        similarEmbedding(baseEmbedding, 0.0001), // Very close -> high similarity
        randomEmbedding(),                         // Random -> low similarity
      ];

      await service.storeEmbeddings(doc.id, chunks, embeddings);

      const results = await service.searchSimilar(baseEmbedding);

      // All returned results should have similarity >= 0.7
      for (const result of results) {
        expect(result.score).toBeGreaterThanOrEqual(0.7);
      }
    });

    test('[NFR-004] returns results with relevance scores', async () => {
      expect(EmbeddingService).toBeDefined();
      const service = new EmbeddingService(prisma);

      const doc = await prisma.knowledgeDocument.create({
        data: {
          title: 'Score Test',
          source: 'upload',
          category: 'testing',
          status: 'ACTIVE',
        },
      });

      const chunks = [
        { content: 'Relevant content about databases.', tokenCount: 5, chunkIndex: 0 },
      ];
      const embeddings = [fakeEmbedding(600)];

      await service.storeEmbeddings(doc.id, chunks, embeddings);

      const results = await service.searchSimilar(fakeEmbedding(600));

      expect(results.length).toBeGreaterThan(0);

      for (const result of results) {
        // Each result should have content and a numeric score
        expect(typeof result.content).toBe('string');
        expect(typeof result.score).toBe('number');
        // Score should be between 0 and 1 (cosine similarity)
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        // Should include chunk ID for reference
        expect(result.id).toBeDefined();
      }
    });
  });
});
