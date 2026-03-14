/**
 * RAG Query Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-005 (Knowledge Base / RAG Pipeline)
 *   FR-006 (Source Citations)
 *   FR-007 (Grounding Confidence)
 *
 * These tests define expected behavior for RAGQueryService:
 *   - Query embedding and vector store search
 *   - Source citations with [1], [2] markers
 *   - Grounded vs general labeling based on threshold
 *   - Result reranking by relevance
 *
 * They WILL FAIL because RAGQueryService does not exist yet.
 *
 * [IMPL-021]
 */

// RAGQueryService will be created during Green phase
let RAGQueryService: typeof import('../../src/services/rag-query.service').RAGQueryService;

beforeAll(async () => {
  try {
    const mod = await import('../../src/services/rag-query.service');
    RAGQueryService = mod.RAGQueryService;
  } catch {
    // Expected to fail in Red phase - service does not exist yet
  }
});

// ---------- helpers ----------

interface MockSearchResult {
  id: string;
  content: string;
  score: number;
  documentId: string;
  chunkIndex: number;
  document?: {
    title: string;
    author: string | null;
    publishedDate: Date | null;
    source: string;
  };
}

function highRelevanceResults(): MockSearchResult[] {
  return [
    {
      id: 'chunk-1',
      content:
        'PostgreSQL 15 introduced MERGE statement support and improved JSON capabilities.',
      score: 0.92,
      documentId: 'doc-1',
      chunkIndex: 0,
      document: {
        title: 'PostgreSQL 15 Release Notes',
        author: 'PostgreSQL Global Development Group',
        publishedDate: new Date('2022-10-13'),
        source: 'upload',
      },
    },
    {
      id: 'chunk-2',
      content:
        'PostgreSQL uses MVCC for concurrent access and supports table partitioning for large datasets.',
      score: 0.87,
      documentId: 'doc-2',
      chunkIndex: 3,
      document: {
        title: 'Database Architecture Best Practices',
        author: 'Jane Smith',
        publishedDate: new Date('2023-06-15'),
        source: 'upload',
      },
    },
    {
      id: 'chunk-3',
      content:
        'When choosing a database, consider write throughput, read latency, and consistency requirements.',
      score: 0.78,
      documentId: 'doc-3',
      chunkIndex: 1,
      document: {
        title: 'CTO Decision Framework',
        author: null,
        publishedDate: null,
        source: 'upload',
      },
    },
  ];
}

function lowRelevanceResults(): MockSearchResult[] {
  return [
    {
      id: 'chunk-10',
      content: 'Team building exercises can improve morale.',
      score: 0.45,
      documentId: 'doc-10',
      chunkIndex: 0,
      document: {
        title: 'HR Handbook',
        author: 'HR Team',
        publishedDate: new Date('2024-01-01'),
        source: 'upload',
      },
    },
  ];
}

function mixedRelevanceResults(): MockSearchResult[] {
  return [
    {
      id: 'chunk-20',
      content: 'Kubernetes provides container orchestration.',
      score: 0.85,
      documentId: 'doc-20',
      chunkIndex: 0,
      document: {
        title: 'Cloud Infrastructure Guide',
        author: 'DevOps Lead',
        publishedDate: new Date('2024-03-01'),
        source: 'upload',
      },
    },
    {
      id: 'chunk-21',
      content: 'Office plants improve air quality.',
      score: 0.35,
      documentId: 'doc-21',
      chunkIndex: 0,
      document: {
        title: 'Office Management Tips',
        author: null,
        publishedDate: null,
        source: 'upload',
      },
    },
  ];
}

// ---------- suite ----------

describe('RAGQueryService', () => {
  describe('query', () => {
    test('[FR-005][AC-8] embeds query and searches vector store', async () => {
      expect(RAGQueryService).toBeDefined();
      const service = new RAGQueryService();

      const result = await service.query('What database should I use?');

      expect(result).toBeDefined();
      // Should return chunks from the vector store
      expect(result.chunks).toBeDefined();
      expect(Array.isArray(result.chunks)).toBe(true);
      // Query should be embedded (1536-dim) before search
      expect(result.queryEmbedding).toBeDefined();
      expect(Array.isArray(result.queryEmbedding)).toBe(true);
      expect(result.queryEmbedding.length).toBe(1536);
    });

    test('[FR-006][AC-1] returns chunks with source citations', async () => {
      expect(RAGQueryService).toBeDefined();
      const service = new RAGQueryService();

      // Inject mock search results for deterministic testing
      const mockResults = highRelevanceResults();
      const result = await service.query(
        'Tell me about PostgreSQL features',
        { _testSearchResults: mockResults }
      );

      expect(result).toBeDefined();
      expect(result.citations).toBeDefined();
      expect(Array.isArray(result.citations)).toBe(true);
      expect(result.citations.length).toBeGreaterThan(0);

      // Each citation should reference its source document
      for (const citation of result.citations) {
        expect(citation.sourceTitle).toBeDefined();
        expect(typeof citation.sourceTitle).toBe('string');
        expect(citation.chunkContent).toBeDefined();
      }
    });

    test('[FR-006][AC-2] citation format includes [1], [2] markers', async () => {
      expect(RAGQueryService).toBeDefined();
      const service = new RAGQueryService();

      const mockResults = highRelevanceResults();
      const result = await service.query(
        'PostgreSQL architecture',
        { _testSearchResults: mockResults }
      );

      expect(result.citations).toBeDefined();
      expect(result.citations.length).toBeGreaterThanOrEqual(2);

      // Citations should have numeric markers starting from [1]
      result.citations.forEach((citation, index) => {
        expect(citation.marker).toBe(`[${index + 1}]`);
      });
    });

    test('[FR-006][AC-3] includes source metadata (title, author, date)', async () => {
      expect(RAGQueryService).toBeDefined();
      const service = new RAGQueryService();

      const mockResults = highRelevanceResults();
      const result = await service.query(
        'Database best practices',
        { _testSearchResults: mockResults }
      );

      expect(result.citations).toBeDefined();
      expect(result.citations.length).toBeGreaterThan(0);

      // First citation should have full metadata
      const first = result.citations[0];
      expect(first.sourceTitle).toBeDefined();
      expect(typeof first.sourceTitle).toBe('string');
      expect(first.sourceTitle.length).toBeGreaterThan(0);

      // Author and date may be null but should be present as fields
      expect('author' in first).toBe(true);
      expect('publishedDate' in first).toBe(true);

      // When author exists, it should be a string
      const withAuthor = result.citations.find((c) => c.author !== null);
      if (withAuthor) {
        expect(typeof withAuthor.author).toBe('string');
      }
    });

    test('[FR-007][AC-1] labels results as "grounded" when above threshold', async () => {
      expect(RAGQueryService).toBeDefined();
      const service = new RAGQueryService();

      const mockResults = highRelevanceResults();
      const result = await service.query(
        'PostgreSQL concurrent access',
        { _testSearchResults: mockResults }
      );

      // All high-relevance results should be labeled "grounded"
      expect(result.groundingLabel).toBe('grounded');
      // The confidence score should be above threshold (0.7)
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
    });

    test('[FR-007][AC-2] labels results as "general" when below threshold', async () => {
      expect(RAGQueryService).toBeDefined();
      const service = new RAGQueryService();

      const mockResults = lowRelevanceResults();
      const result = await service.query(
        'What is the meaning of life?',
        { _testSearchResults: mockResults }
      );

      // Low-relevance results should be labeled "general"
      expect(result.groundingLabel).toBe('general');
      // The confidence score should be below threshold
      expect(result.confidenceScore).toBeLessThan(0.7);
    });
  });

  describe('rerank', () => {
    test('[FR-005] reranks results by relevance to query', async () => {
      expect(RAGQueryService).toBeDefined();
      const service = new RAGQueryService();

      // Provide results in non-optimal order
      const results = [
        {
          id: 'chunk-a',
          content: 'General information about technology.',
          score: 0.75,
          documentId: 'doc-a',
          chunkIndex: 0,
        },
        {
          id: 'chunk-b',
          content: 'Kubernetes autoscaling with HPA and VPA policies.',
          score: 0.80,
          documentId: 'doc-b',
          chunkIndex: 0,
        },
        {
          id: 'chunk-c',
          content: 'Container orchestration with Kubernetes handles failover.',
          score: 0.78,
          documentId: 'doc-c',
          chunkIndex: 0,
        },
      ];

      const reranked = await service.rerank(
        'How does Kubernetes handle autoscaling?',
        results
      );

      expect(reranked).toBeDefined();
      expect(Array.isArray(reranked)).toBe(true);
      expect(reranked.length).toBe(results.length);

      // The chunk about Kubernetes autoscaling should rank first
      expect(reranked[0].content).toContain('autoscaling');

      // Scores should be in descending order after reranking
      for (let i = 0; i < reranked.length - 1; i++) {
        expect(reranked[i].score).toBeGreaterThanOrEqual(reranked[i + 1].score);
      }
    });
  });
});
