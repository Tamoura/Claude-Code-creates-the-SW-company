/**
 * RAG Search Tool Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-005 (RAG Search)
 *   FR-006 (Source Citations)
 *   FR-007 (Grounding Indicators)
 *
 * Tests the RAG search tool node that wraps the RAGQueryService.
 * Uses the real RAGQueryService with injected test search results
 * (no external embedding API calls).
 *
 * [IMPL-029]
 */

import { RAGQueryService, SearchResult } from '../../src/services/rag-query.service';

// RAG search tool — will be created during Green phase
let ragSearchTool: typeof import('../../src/agent/tools/rag-search');

beforeAll(async () => {
  try {
    ragSearchTool = await import('../../src/agent/tools/rag-search');
  } catch {
    // Expected to fail in Red phase
  }
});

// ---------- helpers ----------

function makeSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'chunk-1',
    content: 'Microservices enable independent deployment and horizontal scaling.',
    score: 0.85,
    documentId: 'doc-1',
    chunkIndex: 0,
    document: {
      title: 'Architecture Patterns Guide',
      author: 'Martin Fowler',
      publishedDate: new Date('2023-06-15'),
      source: 'internal-kb',
    },
    ...overrides,
  };
}

// ---------- suite ----------

describe('RAGSearchTool', () => {
  test('[FR-005][AC-1] queries RAG service with user message', async () => {
    expect(ragSearchTool).toBeDefined();

    const { createRAGSearchTool } = ragSearchTool;

    const testResults: SearchResult[] = [
      makeSearchResult(),
      makeSearchResult({
        id: 'chunk-2',
        content: 'Event-driven architecture decouples producers and consumers.',
        score: 0.78,
        documentId: 'doc-2',
        chunkIndex: 1,
        document: {
          title: 'Event Sourcing Handbook',
          author: 'Greg Young',
          publishedDate: new Date('2022-03-10'),
          source: 'internal-kb',
        },
      }),
    ];

    const ragService = new RAGQueryService();
    const tool = createRAGSearchTool(ragService);

    const result = await tool.execute(
      'What architecture pattern should I use?',
      { _testSearchResults: testResults }
    );

    // Should return structured results
    expect(result).toHaveProperty('chunks');
    expect(result).toHaveProperty('citations');
    expect(result.chunks).toHaveLength(2);
    expect(result.citations).toHaveLength(2);
  });

  test('[FR-006][AC-1] returns structured citations with source metadata', async () => {
    expect(ragSearchTool).toBeDefined();

    const { createRAGSearchTool } = ragSearchTool;

    const testResults: SearchResult[] = [
      makeSearchResult({
        document: {
          title: 'Cloud Migration Guide',
          author: 'AWS Team',
          publishedDate: new Date('2024-01-20'),
          source: 'internal-kb',
        },
      }),
    ];

    const ragService = new RAGQueryService();
    const tool = createRAGSearchTool(ragService);

    const result = await tool.execute(
      'How do I migrate to the cloud?',
      { _testSearchResults: testResults }
    );

    expect(result.citations).toHaveLength(1);
    const citation = result.citations[0];

    // Citation must have all metadata fields
    expect(citation).toHaveProperty('marker');
    expect(citation).toHaveProperty('chunkContent');
    expect(citation).toHaveProperty('sourceTitle');
    expect(citation).toHaveProperty('author');
    expect(citation).toHaveProperty('publishedDate');
    expect(citation).toHaveProperty('relevanceScore');

    expect(citation.sourceTitle).toBe('Cloud Migration Guide');
    expect(citation.author).toBe('AWS Team');
    expect(citation.marker).toBe('[1]');
  });

  test('[FR-007][AC-1] labels results with grounding indicator', async () => {
    expect(ragSearchTool).toBeDefined();

    const { createRAGSearchTool } = ragSearchTool;

    // High-score results (above 0.7 threshold) => grounded
    const groundedResults: SearchResult[] = [
      makeSearchResult({ score: 0.85 }),
      makeSearchResult({ id: 'chunk-2', score: 0.9 }),
    ];

    const ragService = new RAGQueryService();
    const tool = createRAGSearchTool(ragService);

    const groundedResult = await tool.execute(
      'Best practices for caching',
      { _testSearchResults: groundedResults }
    );

    expect(groundedResult.groundingLabel).toBe('grounded');

    // Low-score results (below 0.7 threshold) => general
    const generalResults: SearchResult[] = [
      makeSearchResult({ score: 0.3 }),
      makeSearchResult({ id: 'chunk-2', score: 0.4 }),
    ];

    const generalResult = await tool.execute(
      'Obscure niche topic',
      { _testSearchResults: generalResults }
    );

    expect(generalResult.groundingLabel).toBe('general');
  });

  test('[FR-005] handles no results gracefully', async () => {
    expect(ragSearchTool).toBeDefined();

    const { createRAGSearchTool } = ragSearchTool;

    const ragService = new RAGQueryService();
    const tool = createRAGSearchTool(ragService);

    // No test results injected => empty results
    const result = await tool.execute(
      'Something with no knowledge base matches',
      { _testSearchResults: [] }
    );

    expect(result.chunks).toHaveLength(0);
    expect(result.citations).toHaveLength(0);
    expect(result.groundingLabel).toBe('general');
    expect(result.confidenceScore).toBe(0);
  });
});
