/**
 * Ingestion Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-005 (Knowledge Base / RAG Pipeline — ingestion orchestration)
 *
 * The IngestionService connects:
 *   KnowledgeService (CRUD) → RAGService (chunk) → EmbeddingService (store)
 *
 * [IMPL-040]
 */

let IngestionService: typeof import('../../src/services/ingestion.service').IngestionService;

beforeAll(async () => {
  try {
    const mod = await import('../../src/services/ingestion.service');
    IngestionService = mod.IngestionService;
  } catch {
    // Expected to fail in Red phase
  }
});

// ---------- helpers ----------

function makeFakePrisma() {
  const docs: Record<string, unknown> = {};
  return {
    knowledgeDocument: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `doc-${Date.now()}`;
        const doc = { id, ...data, ingestedAt: new Date(), updatedAt: new Date(), _count: { chunks: 0 } };
        docs[id] = doc;
        return doc;
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        return docs[where.id] || null;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const doc = docs[where.id];
        if (doc) Object.assign(doc, data);
        return doc;
      }),
    },
    $executeRawUnsafe: jest.fn(async () => 1),
  };
}

function sampleMarkdownContent(): string {
  const lines: string[] = [];
  for (let i = 0; i < 80; i++) {
    lines.push(
      `Sentence ${i + 1}: This is a detailed paragraph about system architecture and design patterns that CTOs need to understand for making informed decisions.`
    );
  }
  return lines.join(' ');
}

// ---------- suite ----------

describe('IngestionService', () => {
  test('[FR-005] service class exists and can be instantiated', () => {
    expect(IngestionService).toBeDefined();
    const prisma = makeFakePrisma();
    const service = new IngestionService(prisma as never);
    expect(service).toBeDefined();
  });

  describe('ingestDocument', () => {
    test('[FR-005] ingests a markdown document end-to-end: create → chunk → embed → store', async () => {
      expect(IngestionService).toBeDefined();
      const prisma = makeFakePrisma();
      const service = new IngestionService(prisma as never);

      const result = await service.ingestDocument({
        title: 'Microservices vs Monolith',
        category: 'architecture',
        content: sampleMarkdownContent(),
        source: 'engineering-blog',
        author: 'Netflix Engineering',
      });

      expect(result).toBeDefined();
      expect(result.documentId).toBeDefined();
      expect(typeof result.documentId).toBe('string');
      expect(result.chunkCount).toBeGreaterThan(0);
      expect(result.status).toBe('indexed');
    });

    test('[FR-005] creates the document record in the database', async () => {
      expect(IngestionService).toBeDefined();
      const prisma = makeFakePrisma();
      const service = new IngestionService(prisma as never);

      await service.ingestDocument({
        title: 'Caching Patterns',
        category: 'scaling',
        content: 'Short content about caching strategies for distributed systems.',
        source: 'engineering-blog',
      });

      expect(prisma.knowledgeDocument.create).toHaveBeenCalledTimes(1);
      const createCall = prisma.knowledgeDocument.create.mock.calls[0][0];
      expect(createCall.data.title).toBe('Caching Patterns');
      expect(createCall.data.category).toBe('scaling');
      expect(createCall.data.source).toBe('engineering-blog');
    });

    test('[FR-005] stores chunk embeddings via raw SQL', async () => {
      expect(IngestionService).toBeDefined();
      const prisma = makeFakePrisma();
      const service = new IngestionService(prisma as never);

      const result = await service.ingestDocument({
        title: 'Database Sharding',
        category: 'data-storage',
        content: sampleMarkdownContent(),
        source: 'engineering-blog',
      });

      // Should have called $executeRawUnsafe for each chunk
      expect(prisma.$executeRawUnsafe).toHaveBeenCalled();
      expect(prisma.$executeRawUnsafe.mock.calls.length).toBe(result.chunkCount);

      // Each call should be an INSERT into knowledge_chunks
      for (const call of prisma.$executeRawUnsafe.mock.calls) {
        expect(call[0]).toContain('INSERT INTO knowledge_chunks');
        expect(call[0]).toContain('vector');
      }
    });

    test('[FR-005] returns correct chunk count matching actual chunks created', async () => {
      expect(IngestionService).toBeDefined();
      const prisma = makeFakePrisma();
      const service = new IngestionService(prisma as never);

      const result = await service.ingestDocument({
        title: 'Load Balancing',
        category: 'scaling',
        content: sampleMarkdownContent(),
        source: 'engineering-blog',
      });

      // Chunk count should match the number of SQL inserts
      expect(result.chunkCount).toBe(prisma.$executeRawUnsafe.mock.calls.length);
    });

    test('[FR-005] handles optional fields (author, url)', async () => {
      expect(IngestionService).toBeDefined();
      const prisma = makeFakePrisma();
      const service = new IngestionService(prisma as never);

      const result = await service.ingestDocument({
        title: 'API Security',
        category: 'security',
        content: 'API security best practices for CTOs.',
        source: 'curated',
        author: 'OWASP',
        url: 'https://owasp.org/api-security',
      });

      expect(result).toBeDefined();
      const createCall = prisma.knowledgeDocument.create.mock.calls[0][0];
      expect(createCall.data.author).toBe('OWASP');
      expect(createCall.data.url).toBe('https://owasp.org/api-security');
    });
  });

  describe('ingestBatch', () => {
    test('[FR-005] ingests multiple documents and returns summary', async () => {
      expect(IngestionService).toBeDefined();
      const prisma = makeFakePrisma();
      const service = new IngestionService(prisma as never);

      const documents = [
        { title: 'Topic A', category: 'architecture', content: 'Content about topic A.', source: 'curated' },
        { title: 'Topic B', category: 'scaling', content: 'Content about topic B.', source: 'curated' },
        { title: 'Topic C', category: 'security', content: 'Content about topic C.', source: 'curated' },
      ];

      const results = await service.ingestBatch(documents);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);

      for (const result of results) {
        expect(result.documentId).toBeDefined();
        expect(result.status).toBe('indexed');
        expect(result.chunkCount).toBeGreaterThan(0);
      }
    });

    test('[FR-005] continues ingesting if one document fails', async () => {
      expect(IngestionService).toBeDefined();
      const prisma = makeFakePrisma();
      const service = new IngestionService(prisma as never);

      // Make the second create call throw
      let callCount = 0;
      prisma.knowledgeDocument.create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        callCount++;
        if (callCount === 2) throw new Error('DB error');
        const id = `doc-${callCount}`;
        return { id, ...data, ingestedAt: new Date(), updatedAt: new Date() };
      });

      const documents = [
        { title: 'OK-1', category: 'architecture', content: 'Content 1.', source: 'curated' },
        { title: 'FAIL', category: 'scaling', content: 'Content 2.', source: 'curated' },
        { title: 'OK-2', category: 'security', content: 'Content 3.', source: 'curated' },
      ];

      const results = await service.ingestBatch(documents);

      expect(results.length).toBe(3);
      expect(results[0].status).toBe('indexed');
      expect(results[1].status).toBe('failed');
      expect(results[2].status).toBe('indexed');
    });
  });
});
